import threading
import time
import requests

def async_send(url: str, payload: dict, delay_s: int = 0) -> None:
    def worker():
        try:
            if delay_s > 0:
                time.sleep(delay_s)
            requests.post(url, json=payload, timeout=5)
        except Exception:
            # Não explode o nó por falha de rede
            pass

    threading.Thread(target=worker, daemon=True).start()
