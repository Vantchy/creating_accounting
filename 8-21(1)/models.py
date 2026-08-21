from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class EventDraft(BaseModel):
    """用户创建或编辑事项时提交的完整数据。"""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=100)
    start_time: datetime | None = None
    end_time: datetime | None = None
    location: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    priority: Literal["high", "medium", "low"] = "medium"
    all_day: bool = False

    @field_validator("location", "description", mode="before")
    @classmethod
    def empty_text_becomes_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def validate_time_range(self) -> "EventDraft":
        if self.start_time is not None and self.end_time is not None and self.end_time < self.start_time:
            raise ValueError("结束时间不能早于开始时间")
        return self
