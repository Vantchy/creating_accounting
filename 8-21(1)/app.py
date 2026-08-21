from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from pydantic import ValidationError

load_dotenv()

from ai_service import parse_notice
from models import EventDraft
from storage import append_event, delete_event, load_events, set_event_completed, update_event
from timeline import build_timeline


BASE_DIR = Path(__file__).resolve().parent


def create_app(data_path: Path | None = None) -> Flask:
    app = Flask(__name__)
    app.config["DATA_PATH"] = data_path or BASE_DIR / "data" / "events.json"

    @app.get("/")
    def index():
        return render_template("index.html", edition="manual")

    @app.get("/events")
    def list_events_route():
        try:
            events = load_events(Path(app.config["DATA_PATH"]))
        except RuntimeError:
            return error_response("storage_error", "事件记录暂时无法读取。", 500)
        return jsonify({"ok": True, "events": events, "timeline": build_timeline(events)})

    @app.post("/events")
    def create_event_route():
        try:
            event = EventDraft.model_validate(request.get_json(silent=True) or {})
            record = append_event(event, Path(app.config["DATA_PATH"]))
        except ValidationError as exc:
            return error_response("validation_error", readable_validation_error(exc), 422)
        except RuntimeError:
            return error_response("storage_error", "事件暂时无法保存。", 500)
        return jsonify({"ok": True, "event": record}), 201

    @app.put("/events/<event_id>")
    def update_event_route(event_id: str):
        try:
            event = EventDraft.model_validate(request.get_json(silent=True) or {})
            record = update_event(event_id, event, Path(app.config["DATA_PATH"]))
        except ValidationError as exc:
            return error_response("validation_error", readable_validation_error(exc), 422)
        except KeyError:
            return error_response("not_found", "没有找到这个事项。", 404)
        except RuntimeError:
            return error_response("storage_error", "事件暂时无法更新。", 500)
        return jsonify({"ok": True, "event": record})

    @app.post("/events/<event_id>/completion")
    def complete_event_route(event_id: str):
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload.get("completed"), bool):
            return error_response("invalid_completion", "completed 必须是布尔值。", 400)
        try:
            record = set_event_completed(event_id, payload["completed"], Path(app.config["DATA_PATH"]))
        except KeyError:
            return error_response("not_found", "没有找到这个事项。", 404)
        except RuntimeError:
            return error_response("storage_error", "事项状态暂时无法更新。", 500)
        return jsonify({"ok": True, "event": record})

    @app.delete("/events/<event_id>")
    def delete_event_route(event_id: str):
        try:
            deleted = delete_event(event_id, Path(app.config["DATA_PATH"]))
        except KeyError:
            return error_response("not_found", "没有找到这个事项。", 404)
        except RuntimeError:
            return error_response("storage_error", "事项暂时无法删除。", 500)
        return jsonify({"ok": True, "event": deleted})

    @app.get("/health")
    def health_route():
        return jsonify({"ok": True, "edition": "manual"})

    @app.post("/ai/parse")
    def ai_parse_route():
        payload = request.get_json(silent=True) or {}
        notice = (payload.get("notice") or "").strip()
        if not notice:
            return error_response("missing_notice", "请提供通知内容。", 400)
        if len(notice) > 2000:
            return error_response("notice_too_long", "通知内容过长，请限制在 2000 字以内。", 400)
        result = parse_notice(notice)
        if not result.get("ok"):
            code = result.get("error", {}).get("code", "ai_error")
            message = result.get("error", {}).get("message", "AI 解析失败。")
            return error_response(code, message, 422)
        return jsonify(result), 200

    return app


def readable_validation_error(exc: ValidationError) -> str:
    field_names = {
        "title": "标题",
        "start_time": "开始时间",
        "end_time": "结束时间",
        "location": "地点",
        "description": "备注",
        "priority": "优先级",
    }
    messages = []
    for error in exc.errors(include_url=False):
        location = error.get("loc", [])
        field = field_names.get(str(location[-1]), "事项") if location else "事项"
        messages.append(f"{field}：{error.get('msg', '格式不正确')}")
    return "；".join(messages[:3]) or "事项格式不正确。"


def error_response(code: str, message: str, status_code: int):
    return jsonify({"ok": False, "error": {"code": code, "message": message}}), status_code


app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "true").lower() == "true",
    )
