import json
import os
import selectors
import signal
import subprocess
import sys
import tempfile
import time

MAX_CODE_BYTES = 256 * 1024
MAX_INPUT_BYTES = 1024 * 1024
MAX_OUTPUT_BYTES = 1024 * 1024
MAX_TEST_CASES = 20
MAX_TIME_LIMIT_MS = 5000
MAX_MEMORY_LIMIT_MB = 1024
COMPILE_TIMEOUT_SEC = 15
_initial_oom_kills = 0


def read_oom_kills():
    try:
        with open("/sys/fs/cgroup/memory.events", encoding="ascii") as events_file:
            for line in events_file:
                name, value = line.split()
                if name == "oom_kill":
                    return int(value)
    except (FileNotFoundError, PermissionError, ValueError):
        return 0
    return 0


def terminate_process(process):
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.wait()


def run_process(command, input_data, timeout_sec, output_limit=MAX_OUTPUT_BYTES):
    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
        bufsize=0,
    )
    selector = selectors.DefaultSelector()
    stdout = bytearray()
    stderr = bytearray()
    input_offset = 0
    start_time = time.monotonic()
    timed_out = False
    output_limited = False

    selector.register(process.stdout, selectors.EVENT_READ, stdout)
    selector.register(process.stderr, selectors.EVENT_READ, stderr)
    selector.register(process.stdin, selectors.EVENT_WRITE)

    try:
        while selector.get_map() or process.poll() is None:
            remaining = timeout_sec - (time.monotonic() - start_time)
            if remaining <= 0:
                timed_out = True
                terminate_process(process)
                break

            events = selector.select(min(remaining, 0.05))
            for key, _ in events:
                if key.fileobj is process.stdin:
                    if input_offset < len(input_data):
                        try:
                            written = os.write(
                                process.stdin.fileno(),
                                input_data[input_offset:input_offset + 65536],
                            )
                            input_offset += written
                        except BrokenPipeError:
                            selector.unregister(process.stdin)
                            process.stdin.close()
                    else:
                        selector.unregister(process.stdin)
                        process.stdin.close()
                    continue

                chunk = os.read(key.fileobj.fileno(), 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                    key.fileobj.close()
                    continue

                destination = key.data
                destination.extend(chunk)
                if len(stdout) + len(stderr) > output_limit:
                    output_limited = True
                    terminate_process(process)
                    break

            if output_limited:
                break

        if process.poll() is None:
            terminate_process(process)
    finally:
        selector.close()
        for stream in (process.stdin, process.stdout, process.stderr):
            if not stream.closed:
                stream.close()

    return {
        "returncode": process.returncode,
        "stdout": bytes(stdout),
        "stderr": bytes(stderr),
        "timed_out": timed_out,
        "output_limited": output_limited,
        "elapsed_ms": round((time.monotonic() - start_time) * 1000),
    }


def decode(data):
    return data.decode("utf-8", errors="replace")


def main():
    global _initial_oom_kills
    try:
        payload = json.load(sys.stdin)
        language = payload["language"].lower()
        code = payload["code"]
        inputs = payload["inputs"]
        time_limit_ms = payload["timeLimitMs"]
        memory_limit_mb = payload["memoryLimitMb"]
        if (
            language not in {"c", "cpp", "c++", "python", "py", "java"}
            or not isinstance(code, str)
            or len(code.encode("utf-8")) > MAX_CODE_BYTES
            or not isinstance(inputs, list)
            or not 1 <= len(inputs) <= MAX_TEST_CASES
            or any(not isinstance(item, str) or len(item.encode("utf-8")) > MAX_INPUT_BYTES for item in inputs)
            or sum(len(item.encode("utf-8")) for item in inputs) > 4 * 1024 * 1024
            or time_limit_ms not in {1000, 2000, 5000}
            or memory_limit_mb not in {128, 256, 512, 1024}
        ):
            raise ValueError("Invalid execution request")
    except Exception as error:
        print(json.dumps({"status": "invalid_request", "error": str(error)}))
        return 2

    _initial_oom_kills = read_oom_kills()
    with tempfile.TemporaryDirectory(prefix="judge-", dir="/tmp") as workdir:
        if language in {"c", "cpp", "c++"}:
            source = os.path.join(workdir, "main.cpp" if language != "c" else "main.c")
            binary = os.path.join(workdir, "program")
            with open(source, "w", encoding="utf-8") as source_file:
                source_file.write(code)
            compiler = "g++" if language != "c" else "gcc"
            compile_result = run_process(
                [compiler, "-O2", "-pipe", source, "-o", binary],
                b"",
                COMPILE_TIMEOUT_SEC,
            )
            command = [binary]
        elif language in {"python", "py"}:
            source = os.path.join(workdir, "main.py")
            with open(source, "w", encoding="utf-8") as source_file:
                source_file.write(code)
            compile_result = {"returncode": 0, "stdout": b"", "stderr": b"", "timed_out": False}
            command = ["python3", "-I", source]
        else:
            source = os.path.join(workdir, "Main.java")
            with open(source, "w", encoding="utf-8") as source_file:
                source_file.write(code)
            compile_result = run_process(
                ["javac", "-encoding", "UTF-8", source],
                b"",
                COMPILE_TIMEOUT_SEC,
            )
            command = ["java", f"-Xmx{max(64, memory_limit_mb - 64)}m", "-cp", workdir, "Main"]

        if compile_result["timed_out"]:
            print(json.dumps({"status": "compile_error", "error": "Compilation exceeded 15 seconds"}))
            return 0
        if read_oom_kills() > _initial_oom_kills:
            print(json.dumps({"status": "memory_limit_exceeded", "error": "Memory limit exceeded during compilation"}))
            return 0
        if compile_result["returncode"] != 0:
            print(json.dumps({
                "status": "compile_error",
                "error": decode(compile_result["stderr"])[-MAX_OUTPUT_BYTES:],
            }))
            return 0

        results = []
        for input_data in inputs:
            oom_kills_before = read_oom_kills()
            result = run_process(
                command,
                input_data.encode("utf-8"),
                time_limit_ms / 1000,
            )
            status = "accepted"
            if read_oom_kills() > oom_kills_before:
                status = "memory_limit_exceeded"
            elif result["timed_out"]:
                status = "time_limit_exceeded"
            elif result["output_limited"]:
                status = "output_limit_exceeded"
            elif b"OutOfMemoryError" in result["stderr"]:
                status = "memory_limit_exceeded"
            elif result["returncode"] != 0:
                status = "runtime_error"
            results.append({
                "status": status,
                "output": decode(result["stdout"]),
                "error": decode(result["stderr"])[-MAX_OUTPUT_BYTES:],
                "timeMs": result["elapsed_ms"],
            })

        print(json.dumps({"status": "completed", "results": results}))
        return 0


if __name__ == "__main__":
    sys.exit(main())
