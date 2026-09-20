const axios = require('axios');
const { exec, execFile, spawn } = require('child_process');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Ensure Windows MinGW / WinLibs paths are included in process.env.PATH if present
if (process.platform === 'win32') {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const possiblePaths = [
    path.join(localAppData, 'Microsoft', 'WinGet', 'Links'),
    path.join(localAppData, 'Microsoft', 'WinGet', 'Packages', 'BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe', 'mingw64', 'bin'),
    'C:\\MinGW\\bin',
    'C:\\msys64\\ucrt64\\bin',
    'C:\\msys64\\mingw64\\bin'
  ];
  possiblePaths.forEach(p => {
    if (p && fs.existsSync(p) && !process.env.PATH.includes(p)) {
      process.env.PATH = `${p};${process.env.PATH}`;
    }
  });
}

const LANGUAGE_MAP = {
  c: 50,
  cpp: 54,
  java: 62,
  python: 71,
  javascript: 63
};

// Normalize output: trim trailing space, handle windows line breaks (\r\n vs \n)
const normalizeOutput = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
};

/**
 * Compilation cache for compiled languages (C, C++, Java)
 * Deduplicates compilation so batch test cases compile once and execute instantly.
 */
const buildCache = new Map();

const getCodeHash = (language, code) => {
  return crypto.createHash('sha256').update(`${language}___${code}`).digest('hex');
};

const scheduleCacheEviction = (hash, delayMs = 120000) => {
  const entry = buildCache.get(hash);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    if (entry.tmpDir) {
      try { fs.rmSync(entry.tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
    buildCache.delete(hash);
  }, delayMs);
};

/**
 * Kill process and any child process tree (Cross-Platform)
 */
const killProcessTree = (pid) => {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, () => {});
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch (e) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch (e2) {}
      }
    }
  } catch (err) {
    // Ignore cleanup kill errors
  }
};

/**
 * In-Flight Execution Promise Coalescing (Singleflight)
 * Eliminates duplicate execution when multiple concurrent requests submit identical code/input
 */
const inFlightExecutions = new Map();

// Short-lived execution cache for deduplicating high-frequency identical submissions / dry runs
const executionResultCache = new Map();
const EXECUTION_CACHE_TTL = 30000; // 30 seconds cache for identical (lang, code, stdin)

/**
 * In-Memory Concurrency Queue Semaphore
 * Prevents OS CPU/RAM starvation under high concurrent submissions
 */
class ExecutionQueue {
  constructor(concurrency = 30) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  run(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.next();
    });
  }

  next() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;
    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    item.fn()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        this.running--;
        this.next();
      });
  }
}

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '100', 10);
const localQueue = new ExecutionQueue(MAX_CONCURRENT);

/**
 * Executes code using Judge0 API if configured, otherwise falls back to Local Execution Engine.
 */
const executeCodeWithJudge0 = async (language, code, stdin = '') => {
  const normLang = (language || '').toLowerCase().trim();
  const execCacheKey = `${normLang}___${code}___${stdin || ''}`;

  // 1. Return from completed result cache if available
  const cachedExec = executionResultCache.get(execCacheKey);
  if (cachedExec && (Date.now() - cachedExec.timestamp < EXECUTION_CACHE_TTL)) {
    return { ...cachedExec.result };
  }

  // 2. Coalesce duplicate in-flight executions (Singleflight pattern)
  if (inFlightExecutions.has(execCacheKey)) {
    return inFlightExecutions.get(execCacheKey);
  }

  const executionPromise = (async () => {
    try {
      const judge0Host = process.env.JUDGE0_HOST || 'https://judge0-ce.p.rapidapi.com';
      const apiKey = process.env.RAPIDAPI_KEY;

      const languageId = LANGUAGE_MAP[normLang];
      if (!languageId) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Attempt Judge0 API call if API key or custom endpoint is configured
      if (apiKey || process.env.JUDGE0_HOST) {
        try {
          const headers = {
            'content-type': 'application/json',
            'Content-Type': 'application/json'
          };
          if (apiKey) {
            headers['X-RapidAPI-Key'] = apiKey;
            headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
          }

          const response = await axios.post(
            `${judge0Host}/submissions?wait=true&fields=stdout,stderr,status,time,memory,compile_output`,
            {
              source_code: code,
              language_id: languageId,
              stdin: stdin
            },
            { headers, timeout: 10000 }
          );

          const data = response.data;
          const resData = {
            stdout: data.stdout || '',
            stderr: data.stderr || data.compile_output || '',
            status: data.status ? data.status.description : 'Unknown',
            time: parseFloat(data.time || '0.0'),
            memory: parseInt(data.memory || '0', 10)
          };

          executionResultCache.set(execCacheKey, { result: resData, timestamp: Date.now() });
          return resData;
        } catch (err) {
          console.warn('Judge0 API call failed. Falling back to local execution engine:', err.message);
        }
      }

      // Local Execution Fallback Engine (Queued)
      const localRes = await executeLocally(normLang, code, stdin);
      executionResultCache.set(execCacheKey, { result: localRes, timestamp: Date.now() });
      if (executionResultCache.size > 3000) {
        const oldest = executionResultCache.keys().next().value;
        executionResultCache.delete(oldest);
      }
      return localRes;
    } finally {
      inFlightExecutions.delete(execCacheKey);
    }
  })();

  inFlightExecutions.set(execCacheKey, executionPromise);
  return executionPromise;
};

/**
 * Local Sandbox Runner for fallback environments (Queued through Concurrency Limiter)
 */
const executeLocally = (language, code, stdin) => {
  return localQueue.run(() => executeLocallyInternal(language, code, stdin));
};

const executeLocallyInternal = async (rawLang, code, stdin) => {
  const startTime = Date.now();
  let language = String(rawLang || '').toLowerCase().trim();
  if (language === 'c++') language = 'cpp';
  if (language === 'js') language = 'javascript';
  if (language === 'python3' || language === 'py') language = 'python';

  // Smart Detection: If user selected C++/C dropdown but pasted Java code
  if ((language === 'cpp' || language === 'c') && (code.includes('import java.') || code.includes('public class '))) {
    language = 'java';
  }

  if (language === 'javascript') {
    return runJavaScriptLocally(code, stdin, startTime);
  } else if (language === 'python') {
    return runPythonLocally(code, stdin, startTime);
  } else if (language === 'java') {
    return runJavaLocally(code, stdin, startTime);
  } else if (language === 'c' || language === 'cpp') {
    return runCppOrCLocally(language, code, stdin, startTime);
  } else {
    return {
      stdout: '',
      stderr: 'Unsupported local fallback language',
      status: 'Runtime Error',
      time: 0,
      memory: 0
    };
  }
};

const runJavaScriptLocally = (code, stdin, startTime) => {
  return new Promise((resolve) => {
    let outputLogs = [];
    const customConsole = {
      log: (...args) => outputLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      error: (...args) => outputLogs.push(args.map(a => String(a)).join(' ')),
      warn: (...args) => outputLogs.push(args.map(a => String(a)).join(' '))
    };

    const sandbox = {
      console: customConsole,
      require: (mod) => {
        if (mod === 'fs') {
          return {
            readFileSync: () => stdin
          };
        }
        return {};
      },
      process: {
        env: {},
        argv: [],
        stdin: stdin
      },
      setTimeout,
      clearTimeout,
      parseInt,
      parseFloat,
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean,
      JSON
    };

    try {
      const script = new vm.Script(code);
      const context = vm.createContext(sandbox);
      script.runInContext(context, { timeout: 4000 });
      const duration = (Date.now() - startTime) / 1000;
      resolve({
        stdout: outputLogs.join('\n').slice(0, 50000), // Cap output size
        stderr: '',
        status: 'Accepted',
        time: duration,
        memory: 1024
      });
    } catch (err) {
      const duration = (Date.now() - startTime) / 1000;
      const isTimeout = err.message && err.message.includes('timed out');
      resolve({
        stdout: outputLogs.join('\n').slice(0, 50000),
        stderr: isTimeout ? 'Time Limit Exceeded' : (err.stack || err.message),
        status: isTimeout ? 'Time Limit Exceeded' : 'Runtime Error',
        time: duration,
        memory: 1024
      });
    }
  });
};

class PythonWorkerPool {
  constructor(size = Math.max(8, (os.cpus()?.length || 4) * 2)) {
    this.size = size;
    this.workers = [];
    this.queue = [];
    this.seq = 0;
    this.workerScript = path.join(__dirname, 'py_worker.py');
    for (let i = 0; i < this.size; i++) {
      this.spawnWorker();
    }
  }

  spawnWorker() {
    try {
      const proc = spawn('python', ['-u', this.workerScript], { stdio: ['pipe', 'pipe', 'pipe'] });
      const worker = { proc, busy: false, currentTask: null, buffer: '' };

      if (proc.stdin) {
        proc.stdin.on('error', () => {
          this.replaceWorker(worker);
        });
      }

      proc.stdout.on('data', (chunk) => {
        worker.buffer += chunk.toString();
        const lines = worker.buffer.split('\n');
        worker.buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (worker.currentTask && worker.currentTask.id === data.id) {
              const { resolve, timer } = worker.currentTask;
              clearTimeout(timer);
              worker.busy = false;
              worker.currentTask = null;
              resolve(data);
              this.dispatch();
            }
          } catch (e) {}
        }
      });

      proc.on('error', () => this.replaceWorker(worker));
      proc.on('exit', () => this.replaceWorker(worker));

      this.workers.push(worker);
    } catch (err) {
      console.warn('Failed to spawn python worker:', err.message);
    }
  }

  replaceWorker(worker) {
    if (worker.isDead) return;
    worker.isDead = true;

    const idx = this.workers.indexOf(worker);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
    }
    if (worker.currentTask) {
      clearTimeout(worker.currentTask.timer);
      const { resolve } = worker.currentTask;
      worker.currentTask = null;
      resolve({
        stdout: '',
        stderr: 'Worker process terminated',
        status: 'Runtime Error'
      });
    }
    try { killProcessTree(worker.proc?.pid); } catch (e) {}
    this.spawnWorker();
    this.dispatch();
  }

  execute(code, stdin, timeoutMs = 3500) {
    return new Promise((resolve) => {
      const id = ++this.seq;
      this.queue.push({ id, code, stdin, timeoutMs, resolve });
      this.dispatch();
    });
  }

  dispatch() {
    if (this.queue.length === 0) return;
    const idleWorker = this.workers.find(w => !w.busy && w.proc && !w.proc.killed);
    if (!idleWorker) return;

    const task = this.queue.shift();
    if (!task) return;

    idleWorker.busy = true;
    const timer = setTimeout(() => {
      if (idleWorker.currentTask && idleWorker.currentTask.id === task.id) {
        task.resolve({
          stdout: '',
          stderr: 'Time Limit Exceeded',
          status: 'Time Limit Exceeded'
        });
        this.replaceWorker(idleWorker);
      }
    }, task.timeoutMs);

    idleWorker.currentTask = { id: task.id, resolve: task.resolve, timer };
    try {
      idleWorker.proc.stdin.write(JSON.stringify({ id: task.id, code: task.code, stdin: task.stdin }) + '\n');
    } catch (e) {
      this.replaceWorker(idleWorker);
    }
  }
}

const pyPool = new PythonWorkerPool();

const runPythonLocally = async (code, stdin, startTime) => {
  const res = await pyPool.execute(code, stdin, 3500);
  const duration = (Date.now() - startTime) / 1000;
  return {
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    status: res.status || 'Accepted',
    time: duration,
    memory: 2048
  };
};

/**
 * Java Compilation Helper with Caching
 */
const compileJavaOnce = (code) => {
  const hash = getCodeHash('java', code);
  if (buildCache.has(hash)) {
    const cached = buildCache.get(hash);
    scheduleCacheEviction(hash);
    return cached.buildPromise;
  }

  const tmpDir = path.join(os.tmpdir(), `codearena_java_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
  try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}

  const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  const className = match ? match[1] : 'Main';
  const javaFile = path.join(tmpDir, `${className}.java`);
  fs.writeFileSync(javaFile, code);

  const buildPromise = new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (data) => {
      if (resolved) return;
      resolved = true;
      resolve(data);
    };

    const compChild = exec(`javac -J-Xms16m -J-Xmx128m "${javaFile}"`, { timeout: 12000, maxBuffer: 1024 * 1024 }, (compileErr, stdoutErr, stderrErr) => {
      if (compileErr) {
        return safeResolve({
          success: false,
          error: stderrErr || compileErr.message,
          tmpDir,
          className
        });
      }
      safeResolve({
        success: true,
        tmpDir,
        className
      });
    });

    if (compChild) {
      compChild.on('error', (err) => {
        safeResolve({ success: false, error: err.message, tmpDir, className });
      });
      if (compChild.stdin) compChild.stdin.on('error', () => {});
    }
  });

  buildCache.set(hash, { buildPromise, tmpDir });
  scheduleCacheEviction(hash);
  return buildPromise;
};

const runJavaLocally = async (code, stdin, startTime) => {
  const build = await compileJavaOnce(code);

  if (!build.success) {
    return {
      stdout: '',
      stderr: build.error,
      status: 'Compile Error',
      time: (Date.now() - startTime) / 1000,
      memory: 0
    };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (data) => {
      if (resolved) return;
      resolved = true;
      resolve(data);
    };

    const child = exec(`java -Xms16m -Xmx128m -Xss512k -XX:+UseSerialGC -cp "${build.tmpDir}" ${build.className}`, { timeout: 5000, maxBuffer: 1024 * 1024 }, (runErr, runStdout, runStderr) => {
      const duration = (Date.now() - startTime) / 1000;
      let cleanStderr = (runStderr || '').split('\n').filter(line => !line.includes('Java HotSpot(TM)') && !line.includes('os::commit_memory')).join('\n').trim();

      if (runErr) {
        killProcessTree(child.pid);
        if (runErr.killed || runErr.signal === 'SIGTERM') {
          return safeResolve({ stdout: runStdout || '', stderr: 'Time Limit Exceeded', status: 'Time Limit Exceeded', time: duration, memory: 4096 });
        }
        return safeResolve({ stdout: runStdout || '', stderr: cleanStderr || runStderr || runErr.message, status: 'Runtime Error', time: duration, memory: 4096 });
      }

      safeResolve({
        stdout: runStdout || '',
        stderr: cleanStderr,
        status: 'Accepted',
        time: duration,
        memory: 4096
      });
    });

    if (child) {
      child.on('error', (err) => {
        safeResolve({ stdout: '', stderr: err.message, status: 'Runtime Error', time: (Date.now() - startTime) / 1000, memory: 0 });
      });

      if (child.stdin) {
        child.stdin.on('error', () => {});
        try {
          if (stdin !== undefined && stdin !== null && child.stdin.writable) {
            child.stdin.write(String(stdin));
          }
          if (child.stdin.writable) {
            child.stdin.end();
          }
        } catch (e) {}
      }
    }
  });
};

/**
 * C / C++ Compilation Helper with Caching
 */
const compileCppOrCOnce = (language, code) => {
  const hash = getCodeHash(language, code);
  if (buildCache.has(hash)) {
    const cached = buildCache.get(hash);
    scheduleCacheEviction(hash);
    return cached.buildPromise;
  }

  const compiler = language === 'cpp' ? 'g++' : 'gcc';
  const tmpDir = path.join(os.tmpdir(), `codearena_${language}_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
  try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}

  const sourceFile = path.join(tmpDir, `program.${language === 'cpp' ? 'cpp' : 'c'}`);
  const exeFile = path.join(tmpDir, process.platform === 'win32' ? 'program.exe' : 'program');
  fs.writeFileSync(sourceFile, code);

  const buildPromise = new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (data) => {
      if (resolved) return;
      resolved = true;
      resolve(data);
    };

    // Check compiler
    const verChild = exec(`${compiler} --version`, (verr) => {
      if (verr) {
        return safeResolve({
          success: false,
          error: `${compiler.toUpperCase()} compiler is not installed on server host. Please configure Judge0 API key in backend .env to run ${compiler.toUpperCase()} online.`,
          tmpDir,
          exeFile
        });
      }

      // Compile binary with memory-safe flags and optimized header macros
      const flags = language === 'cpp'
        ? '-std=c++17 -D_GLIBCXX_BITS_SPECFUN_H=1 -O0 -pipe -s'
        : '-std=c11 -O0 -pipe -s';

      const compChild = exec(`${compiler} ${flags} "${sourceFile}" -o "${exeFile}"`, { timeout: 15000, maxBuffer: 1024 * 1024 }, (compileErr, stdoutErr, stderrErr) => {
        if (compileErr) {
          return safeResolve({
            success: false,
            error: stderrErr || compileErr.message,
            tmpDir,
            exeFile
          });
        }

        safeResolve({
          success: true,
          tmpDir,
          exeFile
        });
      });

      if (compChild) {
        compChild.on('error', (err) => {
          safeResolve({ success: false, error: err.message, tmpDir, exeFile });
        });
        if (compChild.stdin) compChild.stdin.on('error', () => {});
      }
    });

    if (verChild) {
      verChild.on('error', (err) => {
        safeResolve({ success: false, error: err.message, tmpDir, exeFile });
      });
      if (verChild.stdin) verChild.stdin.on('error', () => {});
    }
  });

  buildCache.set(hash, { buildPromise, tmpDir, exeFile });
  scheduleCacheEviction(hash);
  return buildPromise;
};

const runCppOrCLocally = async (language, code, stdin, startTime) => {
  const build = await compileCppOrCOnce(language, code);

  if (!build.success) {
    return {
      stdout: '',
      stderr: build.error,
      status: 'Compile Error',
      time: (Date.now() - startTime) / 1000,
      memory: 0
    };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (data) => {
      if (resolved) return;
      resolved = true;
      resolve(data);
    };

    const child = execFile(build.exeFile, [], { timeout: 4000, maxBuffer: 1024 * 1024 }, (runErr, runStdout, runStderr) => {
      const duration = (Date.now() - startTime) / 1000;

      if (runErr) {
        killProcessTree(child.pid);
        if (runErr.killed || runErr.signal === 'SIGTERM') {
          return safeResolve({ stdout: runStdout || '', stderr: 'Time Limit Exceeded', status: 'Time Limit Exceeded', time: duration, memory: 2048 });
        }
        return safeResolve({ stdout: runStdout || '', stderr: runStderr || runErr.message, status: 'Runtime Error', time: duration, memory: 2048 });
      }

      safeResolve({
        stdout: runStdout || '',
        stderr: '',
        status: 'Accepted',
        time: duration,
        memory: 2048
      });
    });

    if (child) {
      child.on('error', (err) => {
        safeResolve({ stdout: '', stderr: err.message, status: 'Runtime Error', time: (Date.now() - startTime) / 1000, memory: 0 });
      });

      if (child.stdin) {
        child.stdin.on('error', () => {});
        try {
          if (stdin !== undefined && stdin !== null && child.stdin.writable) {
            child.stdin.write(String(stdin));
          }
          if (child.stdin.writable) {
            child.stdin.end();
          }
        } catch (e) {}
      }
    }
  });
};

module.exports = {
  executeCodeWithJudge0,
  normalizeOutput,
  executeLocally
};
