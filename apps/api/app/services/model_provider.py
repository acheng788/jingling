import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import get_settings


class ModelProviderError(RuntimeError):
    pass


def model_status() -> dict[str, object]:
    settings = get_settings()
    configured = bool(settings.model_base_url.strip() and settings.model_name.strip())
    if settings.model_provider == "demo":
        return {"provider": "demo", "configured": True, "model": "demo-rules-v1", "mode": "demo"}
    return {
        "provider": settings.model_provider,
        "configured": configured,
        "model": settings.model_name or None,
        "mode": "live" if configured else "not_configured",
    }


def generate_recommendation(question: str, knowledge: list[dict[str, str]]) -> tuple[str, str, str]:
    settings = get_settings()
    status = model_status()
    context = "\n\n".join(
        f"- {item['title']}: {item['content'][:1200]}" for item in knowledge
    ) or "暂无相关企业知识条目。"

    if settings.model_provider == "demo":
        return (
            "建议先验证关键假设，再选择可逆、低风险的试点方案；明确负责人、衡量指标与复盘时间后再扩大执行范围。",
            f"当前为演示模式，未调用真实大模型。请人工评审建议。\n\n问题：{question}\n\n可参考知识：\n{context}",
            "demo",
        )
    if not status["configured"]:
        raise ModelProviderError("模型 Provider 未配置完整：请设置 MODEL_BASE_URL 和 MODEL_NAME。")

    base = settings.model_base_url.rstrip("/")
    endpoint = base if base.endswith("/chat/completions") else f"{base}/chat/completions"
    payload = {
        "model": settings.model_name,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": "你是企业决策分析助手。仅提供可审查建议，不声称执行了业务操作。明确区分事实、假设、风险和建议。使用中文。"},
            {"role": "user", "content": f"业务问题：\n{question}\n\n企业知识上下文：\n{context}\n\n请输出建议及理由与风险。"},
        ],
    }
    headers = {"Content-Type": "application/json"}
    if settings.model_api_key:
        headers["Authorization"] = f"Bearer {settings.model_api_key}"
    request = Request(endpoint, data=json.dumps(payload, ensure_ascii=False).encode(), headers=headers, method="POST")
    try:
        with urlopen(request, timeout=settings.request_timeout_seconds) as response:
            body = json.loads(response.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]
        if not isinstance(content, str) or not content.strip():
            raise ModelProviderError("模型返回内容为空。")
        sections = content.split("理由与风险", 1)
        recommendation = sections[0].replace("建议", "", 1).strip("：:\n ")
        rationale = sections[1].strip("：:\n ") if len(sections) > 1 else content
        return recommendation or content, rationale, settings.model_provider
    except HTTPError as exc:
        raise ModelProviderError(f"模型服务返回 HTTP {exc.code}。") from exc
    except (URLError, TimeoutError) as exc:
        raise ModelProviderError("无法连接模型服务，请检查地址、网络和超时配置。") from exc
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise ModelProviderError("模型服务返回了无法识别的响应格式。") from exc
