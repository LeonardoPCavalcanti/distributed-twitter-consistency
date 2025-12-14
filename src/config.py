PROCESSES = [
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
]

NUM_PROCESSES = len(PROCESSES)

def base_url(pid: int) -> str:
    return PROCESSES[pid]

def port_of(pid: int) -> int:
    return int(PROCESSES[pid].split(":")[-1])
