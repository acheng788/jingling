from typing import Literal

from pydantic import BaseModel, Field


class KnowledgeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=20000)
    source: str = Field(default="manual", min_length=1, max_length=100)


class KnowledgeItem(BaseModel):
    id: int
    title: str
    content: str
    source: str
    created_at: str


class DecisionCreate(BaseModel):
    question: str = Field(min_length=5, max_length=5000)


class DecisionRecord(BaseModel):
    id: int
    question: str
    recommendation: str
    rationale: str
    provider: str
    status: Literal["proposed", "accepted", "rejected", "completed"]
    feedback: str | None = None
    outcome: str | None = None
    created_at: str
    updated_at: str


class DecisionFeedback(BaseModel):
    status: Literal["accepted", "rejected", "completed"]
    feedback: str = Field(default="", max_length=5000)
    outcome: str | None = Field(default=None, max_length=5000)


class ModelStatus(BaseModel):
    provider: str
    configured: bool
    model: str | None = None
    mode: str
