from typing import Any, Annotated
from bson import ObjectId
from datetime import datetime
from pydantic import BeforeValidator

# --- PyObjectId ---
def validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError(f"Invalid ObjectId: {v}")

PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]


# --- Doc Cleaner ---
def clean_doc(doc: dict) -> dict:
    """Convert a Mongo document to JSON-safe dict. Handles ObjectId, datetime,
    and other non-serializable types defensively so a single bad legacy record
    cannot break the whole endpoint."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
            continue
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, (list, tuple)):
            out[k] = [
                (str(x) if isinstance(x, ObjectId)
                 else x.isoformat() if isinstance(x, datetime)
                 else x)
                for x in v
            ]
        elif isinstance(v, dict):
            # shallow clean nested dicts
            out[k] = {
                kk: (str(vv) if isinstance(vv, ObjectId)
                     else vv.isoformat() if isinstance(vv, datetime)
                     else vv)
                for kk, vv in v.items()
            }
        else:
            out[k] = v
    return out

