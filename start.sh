#!/usr/bin/env python3
"""Start the Le Mans live dashboard stack (ingestor + API + dev frontend)."""
import os
import sys
import time
import subprocess
import signal

HOME = os.path.expanduser("~")
PROJECT = os.path.join(HOME, "Workspace", "lemans-dashboard")
INGESTOR = os.path.join(HOME, ".hermes", "scripts", "start-lemans-ingestor.py")
API_DIR = os.path.join(PROJECT, "api")
APP_DIR = os.path.join(PROJECT, "app")

processes = []

def start(cmd, cwd, name):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    processes.append((p, name))
    print(f"[{name}] PID {p.pid}")
    return p

def cleanup(sig, frame):
    print("\nShutting down...")
    for p, name in reversed(processes):
        print(f"  Stopping {name} (PID {p.pid})...")
        p.terminate()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

print("=== Le Mans Dashboard ===")
print(f"Project: {PROJECT}")

# Start ingestor (if we want live data)
print("\n[1/3] Starting ingestor...")
start([sys.executable, INGESTOR], HOME, "ingestor")
time.sleep(2)

# Start API
print("\n[2/3] Starting API...")
start([sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"], API_DIR, "api")
time.sleep(2)

# Start Vite dev server
print("\n[3/3] Starting frontend...")
dev = start(["pnpm", "dev"], APP_DIR, "frontend")

print("\n=== Ready ===")
print("  Dashboard:  http://localhost:5173")
print("  API:        http://localhost:8001/api/current")
print("  Press Ctrl+C to stop all\n")

# Let frontend run in foreground so Ctrl+C works
try:
    dev.wait()
except KeyboardInterrupt:
    cleanup(None, None)
