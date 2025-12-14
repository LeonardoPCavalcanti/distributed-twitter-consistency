import sys
import uvicorn
from fastapi import FastAPI
from typing import List
from .models import Event
from .config import NUM_PROCESSES, base_url, port_of
from .net import async_send
from .storage import FeedState

app = FastAPI()

pid = 0
state = FeedState()

vc_local: List[int] = [0] * NUM_PROCESSES
buffer: List[Event] = []

def is_causally_ready(e: Event) -> bool:
    # Regras clássicas:
    # 1) vc_e[pid] == vc_local[pid] + 1 (do emissor)
    # 2) para todo j != emissor: vc_e[j] <= vc_local[j]
    if e.vectorClock is None:
        return True

    sender = e.processId
    vc_e = e.vectorClock

    if vc_e[sender] != vc_local[sender] + 1:
        return False

    for j in range(NUM_PROCESSES):
        if j != sender and vc_e[j] > vc_local[j]:
            return False

    return True

def merge_vector_clock(vc_e: List[int]):
    global vc_local
    for i in range(NUM_PROCESSES):
        vc_local[i] = max(vc_local[i], vc_e[i])

def show_feed_cc():
    print(f"\n--- FEED (CC) | P{pid} | VC={vc_local} | buffer={len(buffer)} ---")
    for post_id, post in state.posts.items():
        print(f"POST {post_id}: ({post.author}) {post.text} vc={post.vectorClock}")
        for r in state.replies_by_parent.get(post_id, []):
            print(f"  -> REPLY {r.evtId}: ({r.author}) {r.text} vc={r.vectorClock}")

@app.get("/health")
def health():
    return {"ok": True, "mode": "CC", "pid": pid, "vc": vc_local, "buffer": len(buffer)}

def deliver(e: Event):
    # merge VC (se veio)
    if e.vectorClock is not None:
        merge_vector_clock(e.vectorClock)

    state.apply_event(e)
    print(f"\n[CC] ENTREGUE em P{pid}: evt={e.evtId} parent={e.parentEvtId} author={e.author} vc={vc_local}")
    show_feed_cc()

def try_drain_buffer():
    global buffer
    changed = True
    while changed:
        changed = False
        remaining: List[Event] = []
        for e in buffer:
            if is_causally_ready(e):
                deliver(e)
                changed = True
            else:
                remaining.append(e)
        buffer = remaining

def process_incoming(e: Event):
    if is_causally_ready(e):
        deliver(e)
        try_drain_buffer()
    else:
        print(f"\n[CC] ADIADO em P{pid}: evt={e.evtId} parent={e.parentEvtId} vc_msg={e.vectorClock} vc_local={vc_local}")
        buffer.append(e)

@app.post("/post")
def post(e: Event):
    # evento local: incrementa VC local e embute no evento
    vc_local[pid] += 1
    e.vectorClock = vc_local[:]  # copia

    # aplica localmente
    deliver(e)
    try_drain_buffer()

    # propaga
    payload = e.model_dump()
    for other in range(NUM_PROCESSES):
        if other != pid:
            delay = 0
            # atraso seletivo: post pai de P0 para P2
            if pid == 0 and other == 2 and e.parentEvtId is None:
                delay = 30
            async_send(base_url(other) + "/share", payload, delay_s=delay)

    return {"status": "ok", "mode": "CC", "evtId": e.evtId, "vc": vc_local}

@app.post("/share")
def share(e: Event):
    process_incoming(e)
    return {"status": "ok", "mode": "CC", "evtId": e.evtId}

def main():
    global pid
    if len(sys.argv) < 2:
        print("Uso: python -m src.twitter_causal <pid 0|1|2>")
        sys.exit(1)

    pid = int(sys.argv[1])
    port = port_of(pid)
    print(f"[CC] Subindo P{pid} em 127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    main()
