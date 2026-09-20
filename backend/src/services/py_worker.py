import sys
import io
import json
import traceback

def run_worker():
    # Save original streams permanently
    real_stdin = sys.stdin
    real_stdout = sys.stdout
    real_stderr = sys.stderr

    while True:
        try:
            line = real_stdin.readline()
            if not line:
                break
            line_str = line.strip()
            if not line_str:
                continue

            req_id = None
            try:
                req = json.loads(line_str)
                req_id = req.get("id")
                code = req.get("code", "")
                input_data = req.get("stdin", "")

                captured_stdout = io.StringIO()
                captured_stderr = io.StringIO()

                sys.stdin = io.StringIO(input_data)
                sys.stdout = captured_stdout
                sys.stderr = captured_stderr

                status = "Accepted"
                try:
                    clean_globals = {"__name__": "__main__", "__doc__": None, "__package__": None}
                    exec(code, clean_globals)
                except BaseException:
                    status = "Runtime Error"
                    captured_stderr.write(traceback.format_exc())

                out = captured_stdout.getvalue()
                err = captured_stderr.getvalue()

                res = {
                    "id": req_id,
                    "stdout": out[:50000],
                    "stderr": err[:50000],
                    "status": status
                }

            except BaseException as req_err:
                res = {
                    "id": req_id,
                    "stdout": "",
                    "stderr": str(req_err),
                    "status": "Runtime Error"
                }

            finally:
                # ALWAYS restore original stdio streams
                sys.stdin = real_stdin
                sys.stdout = real_stdout
                sys.stderr = real_stderr

            real_stdout.write(json.dumps(res) + "\n")
            real_stdout.flush()

        except BaseException as fatal:
            sys.stdin = real_stdin
            sys.stdout = real_stdout
            sys.stderr = real_stderr
            try:
                real_stdout.write(json.dumps({
                    "id": None,
                    "stdout": "",
                    "stderr": str(fatal),
                    "status": "Runtime Error"
                }) + "\n")
                real_stdout.flush()
            except Exception:
                pass

if __name__ == "__main__":
    run_worker()
