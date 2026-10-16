# Jingling — 企业智能决策平台

企业智能决策平台 MVP：连接企业知识、模型分析、决策记录与结果反馈，形成可追溯闭环。

## 技术栈

- API：Python 3.11+、FastAPI、Pydantic Settings、SQLite
- Web：React、TypeScript、Vite
- 模型：OpenAI-compatible Chat Completions API，支持云端 / 本地 Provider
- 测试：pytest、FastAPI TestClient

## 功能范围

- 健康检查、模型配置状态
- 企业知识条目新增与列表查询
- 决策建议生成、历史查询、结果反馈
- 明确的 demo 模式；真实模型调用失败时返回错误，不伪造成功
- Web 管理后台总览、知识管理、决策中心、模型接入说明

## 快速启动

后端（Python 3.11+）：

```bash
cd apps/api
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

前端（Node.js 20+）：

```bash
cd apps/web
npm install
npm run dev
```

API 文档： http://127.0.0.1:8000/docs

## 验证

分别在仓库根目录运行：

```bash
cd apps/api
pytest -q
```

另开终端或返回仓库根目录运行：

```bash
cd apps/web
npm install
npm run typecheck
npm run build
```

## 模型配置

复制仓库根目录 `.env.example` 为 `.env`。默认 `MODEL_PROVIDER=demo`，只返回明确标注的演示建议。切换真实模型时设置 `MODEL_PROVIDER=cloud` 或 `local`，并配置 `MODEL_BASE_URL`、`MODEL_NAME`；服务需要鉴权时再设置 `MODEL_API_KEY`。本地 endpoint 可使用兼容 OpenAI API 的本地推理服务。不要提交密钥或企业真实数据。

## MVP 边界

当前不包含生产级身份认证、细粒度多租户隔离、SSO、向量数据库、完整知识图谱、高可用部署或自动执行高风险业务操作。进入真实企业环境前必须补齐认证授权、审计、密钥管理、限流、备份和数据治理。

**测试与构建结果以实际执行记录为准；代码写入仓库不代表测试已经运行或通过。**
