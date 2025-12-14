from pydantic import BaseModel
from typing import Optional, List

class Event(BaseModel):
    processId: int
    evtId: str
    parentEvtId: Optional[str] = None
    author: str
    text: str

    # Só usado no modo causal (CC)
    vectorClock: Optional[List[int]] = None
