from fastapi import APIRouter, HTTPException, Query

from app.db.database import connect
from app.schemas import DecisionCreate, DecisionFeedback, DecisionRecord, KnowledgeCreate, KnowledgeItem, ModelStatus
from app.services.model_provider import ModelProviderError, generate_recommendation, model_status

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "jingling-api"}


@router.get("/knowledge", response_model=list[KnowledgeItem])
def list_knowledge(limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    with connect() as db:
        rows = db.execute("SELECT id,title,content,source,created_at FROM knowledge_items ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


@router.post("/knowledge", response_model=KnowledgeItem, status_code=201)
def create_knowledge(payload: KnowledgeCreate) -> dict:
    title, content, source = payload.title.strip(), payload.content.strip(), payload.source.strip()
    if not title or not content or not source:
        raise HTTPException(status_code=422, detail="标题、内容和来源不能仅包含空白字符。")
    with connect() as db:
        cursor = db.execute("INSERT INTO knowledge_items(title,content,source) VALUES (?,?,?)", (title, content, source))
        row = db.execute("SELECT id,title,content,source,created_at FROM knowledge_items WHERE id=?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@router.get("/decisions", response_model=list[DecisionRecord])
def list_decisions(limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    with connect() as db:
        rows = db.execute("SELECT id,question,recommendation,rationale,provider,status,feedback,outcome,created_at,updated_at FROM decisions ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


@router.post("/decisions", response_model=DecisionRecord, status_code=201)
def create_decision(payload: DecisionCreate) -> dict:
    question = payload.question.strip()
    with connect() as db:
        knowledge = [dict(row) for row in db.execute("SELECT title,content FROM knowledge_items ORDER BY id DESC LIMIT 20").fetchall()]
    try:
        recommendation, rationale, provider = generate_recommendation(question, knowledge)
    except ModelProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    with connect() as db:
        cursor = db.execute("INSERT INTO decisions(question,recommendation,rationale,provider) VALUES (?,?,?,?)", (question, recommendation, rationale, provider))
        row = db.execute("SELECT id,question,recommendation,rationale,provider,status,feedback,outcome,created_at,updated_at FROM decisions WHERE id=?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@router.post("/decisions/{decision_id}/feedback", response_model=DecisionRecord)
def update_feedback(decision_id: int, payload: DecisionFeedback) -> dict:
    with connect() as db:
        if db.execute("SELECT id FROM decisions WHERE id=?", (decision_id,)).fetchone() is None:
            raise HTTPException(status_code=404, detail="决策记录不存在。")
        db.execute("UPDATE decisions SET status=?,feedback=?,outcome=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?", (payload.status, payload.feedback, payload.outcome, decision_id))
        row = db.execute("SELECT id,question,recommendation,rationale,provider,status,feedback,outcome,created_at,updated_at FROM decisions WHERE id=?", (decision_id,)).fetchone()
    return dict(row)


@router.get("/models/status", response_model=ModelStatus)
def get_model_status() -> dict[str, object]:
    return model_status()
