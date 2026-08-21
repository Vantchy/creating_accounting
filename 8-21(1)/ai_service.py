from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from openai import OpenAI

from models import EventDraft


def _build_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key.startswith("sk-") is False:
        return None
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    return OpenAI(api_key=api_key, base_url=base_url)


def _build_system_prompt() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"""你是一个校园日程助手。请从用户提供的通知文本中提取校园事项信息，并以 JSON 格式返回。

今天的日期是 {today}。如果通知中使用了"今天"、"明天"、"后天"、"下周一"等相对日期，请基于今天计算具体日期。

字段说明：
- title（必填）：事项标题，简洁明了
- start_time（可选）：开始时间，ISO 8601 格式（如 2026-09-03T14:00:00Z）
- end_time（可选）：结束时间，ISO 8601 格式
- location（可选）：地点
- description（可选）：备注说明，可保留原文中的补充信息
- priority（可选）：优先级，只能为 "high"、"medium" 或 "low"
- all_day（可选）：是否为全天事项，布尔值

要求：
1. 标题必须精简，不超过 30 个字
2. 如果通知中提到了具体时间，务必准确提取
3. 如果没有明确时间，start_time 和 end_time 返回 null
4. 只返回 JSON 对象，不要包含其他文字说明
5. 如果无法提取任何有效信息，返回 {{"title": null}}"""


def parse_notice(notice_text: str) -> dict:
    """调用 AI 解析通知文本，返回结构化事项数据。"""
    client = _build_client()
    if client is None:
        return {
            "ok": False,
            "error": {"code": "ai_not_configured", "message": "AI 服务未配置，请在 .env 文件中填写 OPENAI_API_KEY。"},
        }

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _build_system_prompt()},
                {"role": "user", "content": notice_text},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=500,
        )
    except Exception as exc:
        return {
            "ok": False,
            "error": {"code": "ai_request_failed", "message": f"AI 服务请求失败：{exc}"},
        }

    raw = response.choices[0].message.content
    if not raw:
        return {
            "ok": False,
            "error": {"code": "ai_empty_response", "message": "AI 返回了空结果，请稍后重试。"},
        }

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "ok": False,
            "error": {"code": "ai_invalid_json", "message": "AI 返回了无法解析的数据，请稍后重试。"},
        }

    if not data.get("title"):
        return {
            "ok": False,
            "error": {"code": "ai_no_title", "message": "AI 未能从通知中提取出有效事项，请检查通知内容。"},
        }

    # 用 EventDraft 验证 AI 返回的数据
    try:
        EventDraft.model_validate(data)
    except Exception as exc:
        return {
            "ok": False,
            "error": {"code": "ai_validation_error", "message": f"AI 提取的数据格式有误：{exc}"},
        }

    return {"ok": True, "event": data}