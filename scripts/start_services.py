import sys
import time
import subprocess
from pathlib import Path

def start_daemon_services():
    root = Path(__file__).resolve().parent.parent
    python_exe = sys.executable

    # 1. Start FastAPI backend detached
    api_cmd = [python_exe, "-m", "uvicorn", "src.api:app", "--host", "127.0.0.1", "--port", "8000"]
    print("Starting FastAPI backend detached on port 8000...")
    DETACHED_FLAGS = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
    
    api_proc = subprocess.Popen(
        api_cmd,
        cwd=str(root),
        stdin=subprocess.DEVNULL,
        stdout=open(root / "outputs" / "fastapi_server.log", "w", encoding="utf-8"),
        stderr=subprocess.STDOUT,
        creationflags=DETACHED_FLAGS
    )
    print(f"FastAPI started with PID {api_proc.pid}")

    time.sleep(2)
    print("Daemon services started successfully!")

if __name__ == "__main__":
    start_daemon_services()
