#!/usr/bin/env python3
"""Runs each benchmark 3x and reports median wall time + peak RSS.
Peak RSS = VmHWM from /proc/<pid>/status, polled every ~1 ms while the program runs
(VmHWM is reset at exec, so it does not include the runner's own memory, unlike wait4's ru_maxrss).
Usage: python3 bench/run.py   (from the repo root; needs rustc + python3)"""
import json, os, platform, statistics, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

def build(name):
    exe = os.path.join(OUT, name)
    subprocess.run(["rustc", "-C", "opt-level=3", "--edition", "2021", "-o", exe, os.path.join(HERE, name + ".rs")], check=True)
    return exe

def hwm_kib(pid):
    try:
        with open(f"/proc/{pid}/status") as f:
            for line in f:
                if line.startswith("VmHWM:"):
                    return int(line.split()[1])
    except (FileNotFoundError, ProcessLookupError, ValueError):
        pass
    return 0

def measure(cmd):
    t0 = time.perf_counter()
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    peak = 0
    while True:
        # WNOWAIT keeps the zombie so /proc/<pid>/status stays readable for a final read
        r = os.waitid(os.P_PID, p.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        peak = max(peak, hwm_kib(p.pid))
        if r is not None:
            break
        time.sleep(0.001)
    dt = time.perf_counter() - t0
    out = p.stdout.read().decode().strip()
    assert p.wait() == 0, cmd
    return dt, peak / 1024.0, out

def bench(label, cmd, shown, runs=3):
    res = [measure(cmd) for _ in range(runs)]
    return {"label": label, "cmd": shown,
            "median_s": round(statistics.median(r[0] for r in res), 3),
            "peak_rss_mib": round(max(r[1] for r in res), 1), "output": res[0][2]}

results = []
for name, arg in [("sieve", "10000000"), ("collatz", "1000000")]:
    exe = build(name)
    results.append(bench(f"{name} Python", [sys.executable, os.path.join(HERE, name + ".py"), arg], f"python3 bench/{name}.py {arg}"))
    results.append(bench(f"{name} Rust", [exe, arg], f"rustc -C opt-level=3 --edition 2021 -o bench/out/{name} bench/{name}.rs && bench/out/{name} {arg}"))

meta = {"python": platform.python_version(),
        "rustc": subprocess.run(["rustc", "--version"], capture_output=True, text=True).stdout.strip(),
        "cpu": next((l.split(":", 1)[1].strip() for l in open("/proc/cpuinfo") if l.startswith("model name")), "?"),
        "date": time.strftime("%Y-%m-%d"), "runs": 3, "method": "median wall time of 3 runs; peak RSS = max VmHWM from /proc/<pid>/status", "results": results}
with open(os.path.join(HERE, "results.json"), "w") as f:
    json.dump(meta, f, indent=2)
for r in results:
    print(f"{r['label']:<16} {r['median_s']:>8.3f} s  {r['peak_rss_mib']:>8.1f} MiB  -> {r['output']}")
print(meta["python"], "|", meta["rustc"], "|", meta["cpu"])
