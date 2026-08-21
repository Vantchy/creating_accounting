from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from models import EventDraft


_FILE_LOCK = Lock()


def load_events(data_path: Path) -> list[dict]:
    if not data_path.exists():
        return []
    try:
        data = json.loads(data_path.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, OSError) as exc:
        raise RuntimeError("事件数据文件无法读取。") from exc
    if not isinstance(data, list):
        raise RuntimeError("事件数据文件格式不正确。")
    return data


def append_event(event: EventDraft, data_path: Path) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": uuid4().hex[:12],
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
        **event.model_dump(mode="json"),
    }
    with _FILE_LOCK:
        events = load_events(data_path)
        events.append(record)
        _atomic_write(data_path, events)
    return record


def update_event(event_id: str, event: EventDraft, data_path: Path) -> dict:
    with _FILE_LOCK:
        events = load_events(data_path)
        record = _find_event(events, event_id)
        record.update(event.model_dump(mode="json"))
        record["updated_at"] = datetime.now(timezone.utc).isoformat()
        _atomic_write(data_path, events)
    return record


def set_event_completed(event_id: str, completed: bool, data_path: Path) -> dict:
    with _FILE_LOCK:
        events = load_events(data_path)
        record = _find_event(events, event_id)
        record["completed_at"] = datetime.now(timezone.utc).isoformat() if completed else None
        record["updated_at"] = datetime.now(timezone.utc).isoformat()
        _atomic_write(data_path, events)
    return record


def delete_event(event_id: str, data_path: Path) -> dict:
    with _FILE_LOCK:
        events = load_events(data_path)
        for index, record in enumerate(events):
            if record.get("id") == event_id:
                deleted = events.pop(index)
                _atomic_write(data_path, events)
                return deleted
    raise KeyError(event_id)


def _find_event(events: list[dict], event_id: str) -> dict:
    for record in events:
        if record.get("id") == event_id:
            return record
    raise KeyError(event_id)


def _atomic_write(data_path: Path, events: list[dict]) -> None:
    data_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = data_path.with_suffix(data_path.suffix + ".tmp")
    temporary_path.write_text(json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary_path.replace(data_path)
