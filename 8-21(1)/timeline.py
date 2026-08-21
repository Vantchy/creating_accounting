from __future__ import annotations

from datetime import datetime, timezone


def build_timeline(events: list[dict], now: datetime | None = None) -> dict[str, list[dict]]:
    """按真实时间和手动完成状态组织事项。"""
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    current_time = current_time.astimezone(timezone.utc)

    upcoming: list[tuple[datetime, dict]] = []
    ongoing: list[tuple[datetime, dict]] = []
    ended: list[tuple[datetime, dict]] = []
    incomplete: list[tuple[datetime | None, int, dict]] = []

    for index, event in enumerate(events):
        start_time = _parse_datetime(event.get("start_time"))
        end_time = _parse_datetime(event.get("end_time"))
        completed_at = _parse_datetime(event.get("completed_at"))

        if completed_at is not None:
            ended.append((completed_at, event))
        elif start_time is not None and end_time is not None:
            if end_time < start_time:
                incomplete.append((start_time, index, event))
            elif start_time > current_time:
                upcoming.append((start_time, event))
            elif current_time < end_time:
                ongoing.append((start_time, event))
            else:
                ended.append((end_time, event))
        elif start_time is not None and start_time > current_time:
            upcoming.append((start_time, event))
        elif end_time is not None and end_time <= current_time:
            ended.append((end_time, event))
        else:
            incomplete.append((start_time or end_time, index, event))

    return {
        "upcoming": [event for _, event in sorted(upcoming, key=lambda item: item[0])],
        "ongoing": [event for _, event in sorted(ongoing, key=lambda item: item[0], reverse=True)],
        "ended": [event for _, event in sorted(ended, key=lambda item: item[0], reverse=True)],
        "incomplete": [
            event
            for _, _, event in sorted(
                incomplete,
                key=lambda item: (item[0] is None, item[0] or current_time, item[1]),
            )
        ],
    }


def _parse_datetime(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
