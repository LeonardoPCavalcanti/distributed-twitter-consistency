import sys
import uvicorn
from fastapi import FastAPI
from .models import Event
from .config import NUM_PROCESSES, base_url, port_of
from .net import async_send
from .storage import FeedState

app = FastAPI()

pid = 0
state = FeedState()

def show_feed_ec():
    known_posts = state.known_post_ids()

    print(f"\n--- FEED (EC) | P{pid} ---")
    # Posts + replies
    for post_id, post in state.posts.items():
        print(f"POST {post_id}: ({post.author}) {post.text}")
        for r in state.replies_by_parent.get(post_id, []):
            print(f"  -> REPLY {r.evtId}: ({r.author}) {r.text}")

    # Órfãs (reply cujo post não chegou)
    orphans_printed = False
    for parent_id, replies in state.replies_by_parent.items():
        if parent_id not in known_posts:
            if not orphans_printed:
                print("\n[EC] REPLIES ÓRFÃS:")
                orphans_printed = True
            for r in replies:
                print(f"  [ÓRFÃ] parent={parent_id} | REPLY {r.evtId}: ({r.author}) {r.text}")

@app.get("/health")
def health():
    return {"ok": True, "mode": "EC", "pid": pid}

def apply_and_show(e: Event):
    state.apply_event(e)
    print(f"\n[EC] ENTREGUE em P{pid}: evt={e.evtId} parent={e.parentEvtId} author={e.author}")
    show_feed_ec()

@app.post("/post")
def post(e: Event):
    # evento local
    apply_and_show(e)

    # propaga para os outros nós
    payload = e.model_dump()
    for other in range(NUM_PROCESSES):
        if other != pid:
            delay = 0
            # Atraso seletivo para forçar órfã em EC (ex: P0 -> P2)
            if pid == 0 and other == 2 and e.parentEvtId is None:
                delay = 30
            async_send(base_url(other) + "/share", payload, delay_s=delay)

    return {"status": "ok", "mode": "EC", "evtId": e.evtId}

@app.post("/share")
def share(e: Event):
    apply_and_show(e)
    return {"status": "ok", "mode": "EC", "evtId": e.evtId}

def main():
    global pid
    if len(sys.argv) < 2:
        print("Uso: python -m src.twitter_eventual <pid 0|1|2>")
        sys.exit(1)

    pid = int(sys.argv[1])
    port = port_of(pid)
    print(f"[EC] Subindo P{pid} em 127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    main()
