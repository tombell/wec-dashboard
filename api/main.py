"""FastAPI backend for WEC live dashboard - serves API + static frontend."""
import os
from typing import Optional, Any
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient, DESCENDING

MONGO_PORT = 27017
MONGO_URI = os.environ.get(
    "MONGO_CONNECTION_STRING",
    "mongodb://localhost:" + str(MONGO_PORT)
)
DB_NAME = "wec-livetiming"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

app = FastAPI(title="WEC Live Timing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "db": DB_NAME}


@app.get("/api/current")
async def get_current():
    """Return the latest full snapshot (standings + weather + cars)."""
    state = db.current_state.find_one({"_type": "latest"})
    if not state:
        return {"live": False, "params": None, "entries": []}

    params = state.get("params", {})
    entries = state.get("entries", [])

    elapsed_s = params.get("elapsedTime", 0) or 0
    remaining_s = params.get("remaining", 0) or 0
    h, m, s = int(elapsed_s // 3600), int((elapsed_s % 3600) // 60), int(elapsed_s % 60)

    return {
        "live": True,
        "updated_at": state.get("updated_at"),
        "poll": state.get("poll"),
        "session": {
            "event_name": params.get("sessionName", "WEC"),
            "session_id": params.get("sessionId"),
            "elapsed_time": "{:02d}:{:02d}:{:02d}".format(h, m, s),
            "elapsed_seconds": elapsed_s,
            "remaining_seconds": remaining_s,
            "flag_state": params.get("raceState", "green"),
            "safety_car": params.get("safetyCar") not in ("N/A", "", None),
            "start_time": params.get("startTime"),
            "duration": params.get("duration"),
            "weather": {
                "condition": params.get("weather", "unknown"),
                "air_temp": params.get("airTemp"),
                "track_temp": params.get("trackTemp"),
                "humidity": params.get("humidity"),
                "pressure": params.get("pressure"),
                "wind_speed": params.get("windSpeed"),
                "wind_direction": params.get("windDirection"),
            },
        },
        "entries": entries,
    }


@app.get("/api/entries")
async def get_entries(
    category: Optional[str] = Query(None, description="Filter by class"),
    sort_by: str = Query("ranking", description="Field to sort by"),
    limit: int = Query(100, description="Max entries to return"),
):
    query = {"_type": "entry"}
    if category:
        query["category"] = category.upper()
    allowed = ("ranking", "categoryPosition", "lap", "pitstop")
    sort_field = sort_by if sort_by in allowed else "ranking"
    projection = {"_id": 0, "_type": 0, "_last_updated": 0, "_ingested_at": 0}
    entries = list(
        db.entries.find(query, projection).sort(sort_field, 1).limit(limit)
    )
    return {
        "count": len(entries),
        "categories": db.entries.distinct("category"),
        "entries": entries,
    }


@app.get("/api/entries/{entry_id}")
async def get_entry(entry_id: int):
    entry = db.entries.find_one({"id": entry_id}, {"_id": 0, "_type": 0, "drivers": 0})
    if not entry:
        return {"error": "entry not found"}
    return entry


@app.get("/api/sessions")
async def get_sessions():
    sessions = list(
        db.sessions.find({}, {"_id": 0}).sort("last_seen", DESCENDING).limit(20)
    )
    return {"count": len(sessions), "sessions": sessions}


@app.get("/api/history")
async def get_history(
    session_id: Optional[int] = Query(None),
    limit: int = Query(50, description="Max snapshots"),
):
    query = {}
    if session_id is not None:
        query["params.sessionId"] = session_id
    snapshots = list(
        db.snapshots.find(query, {"_id": 0}).sort("poll", DESCENDING).limit(limit)
    )
    return {"count": len(snapshots), "snapshots": snapshots}


# Serve static frontend
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
    print(f"[wec-api] Serving frontend from {STATIC_DIR}")
else:
    print(f"[wec-api] No static frontend at {STATIC_DIR} - API only")
