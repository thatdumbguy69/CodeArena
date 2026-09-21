const { executeLocally } = require('./src/services/judge0Service');

const testCases = [
  {
    lang: 'javascript',
    code: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(input + ' World');`,
    stdin: 'Hello'
  },
  {
    lang: 'python',
    code: `import sys\nprint(sys.stdin.read().strip() + ' World')`,
    stdin: 'Hello'
  },
  {
    lang: 'c',
    code: `#include <stdio.h>\nint main() { char str[100]; scanf("%s", str); printf("%s World", str); return 0; }`,
    stdin: 'Hello'
  },
  {
    lang: 'cpp',
    code: `#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string s; cin >> s; cout << s << " World"; return 0; }`,
    stdin: 'Hello'
  },
  {
    lang: 'java',
    code: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print(sc.next() + " World");\n    }\n}`,
    stdin: 'Hello'
  }
];

async function runTests() {
  for (let tc of testCases) {
    console.log(`\nTesting ${tc.lang}...`);
    try {
      const result = await executeLocally(tc.lang, tc.code, tc.stdin);
      console.log(`Status: ${result.status}`);
      console.log(`Stdout: ${result.stdout}`);
      console.log(`Stderr: ${result.stderr}`);
    } catch (e) {
      console.error(`Error:`, e.message);
    }
  }
}

runTests();
