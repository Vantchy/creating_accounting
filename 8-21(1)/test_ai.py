from __future__ import annotations

import re
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from ai_service import parse_notice


def _read_notice_from_readme() -> str:
    readme = Path(__file__).resolve().parent / "README.md"
    content = readme.read_text(encoding="utf-8")

    # 提取 ```txt 代码块中的通知内容
    match = re.search(r"```txt\n(.+?)\n```", content, re.DOTALL)
    if not match:
        print("错误：未在 README.md 中找到通知内容。")
        return ""

    return match.group(1).strip()


def _display_result(result: dict) -> None:
    if not result.get("ok"):
        error = result.get("error", {})
        print(f"解析失败：{error.get('message', '未知错误')}")
        return

    event = result["event"]
    print("=" * 48)
    print("  AI 解析结果")
    print("=" * 48)
    print(f"  标题：    {event.get('title', '')}")
    print(f"  开始时间：{event.get('start_time', '未指定')}")
    print(f"  结束时间：{event.get('end_time', '未指定')}")
    print(f"  地点：    {event.get('location', '未指定')}")
    print(f"  备注：    {event.get('description', '未指定')}")
    print(f"  优先级：  {event.get('priority', 'medium')}")
    print("=" * 48)


def main() -> None:
    notice = _read_notice_from_readme()
    if not notice:
        return

    print("通知原文：")
    print("-" * 48)
    print(notice)
    print("-" * 48)
    print()

    result = parse_notice(notice)
    _display_result(result)


if __name__ == "__main__":
    main()