from collections import defaultdict
from typing import Dict, List, Set
from .models import Event

class FeedState:
    def __init__(self):
        self.posts: Dict[str, Event] = {}
        self.replies_by_parent: Dict[str, List[Event]] = defaultdict(list)

    def apply_event(self, e: Event) -> None:
        if e.parentEvtId is None:
            self.posts[e.evtId] = e
        else:
            self.replies_by_parent[e.parentEvtId].append(e)

    def known_post_ids(self) -> Set[str]:
        return set(self.posts.keys())
