import { useEffect, useState, type FormEvent } from 'react'

type Knowledge = { id: number; title: string; content: string; source: string; created_at: string }
type Decision = { id: number; question: string; recommendation: string; rationale: string; provider: string; status: string; outcome: string | null; created_at: string }
type ModelStatus = { provider: string; configured: boolean; model: string | null; mode: string }
type Tab = 'overview' | 'knowledge' | 'decisions' | 'models'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail ?? `请求失败（HTTP ${response.status}）`)
  }
  return response.json() as Promise<T>
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: '运营总览', icon: '◫' }, { id: 'knowledge', label: '企业知识', icon: '▤' },
  { id: 'decisions', label: '决策中心', icon: '✳' }, { id: 'models', label: '模型接入', icon: '⌘' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [knowledge, setKnowledge] = useState<Knowledge[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [model, setModel] = useState<ModelStatus | null>(null)
  const [question, setQuestion] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const [k, d, m] = await Promise.all([api<Knowledge[]>('/api/knowledge'), api<Decision[]>('/api/decisions'), api<ModelStatus>('/api/models/status')])
      setKnowledge(k); setDecisions(d); setModel(m); setError('')
    } catch (err) { setError(err instanceof Error ? err.message : '无法连接 API，请确认后端已启动。') }
  }
  useEffect(() => { void refresh() }, [])

  async function submitKnowledge(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice('')
    try {
      await api('/api/knowledge', { method: 'POST', body: JSON.stringify({ title, content, source: 'manual' }) })
      setTitle(''); setContent(''); setNotice('知识条目已保存。'); await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : '保存失败。') } finally { setBusy(false) }
  }
  async function submitDecision(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setNotice('')
    try {
      await api('/api/decisions', { method: 'POST', body: JSON.stringify({ question }) })
      setQuestion(''); setNotice('决策建议已生成并保存。'); await refresh(); setTab('decisions')
    } catch (err) { setError(err instanceof Error ? err.message : '决策生成失败。') } finally { setBusy(false) }
  }
  async function feedback(item: Decision, status: 'accepted' | 'rejected' | 'completed') {
    try {
      await api(`/api/decisions/${item.id}/feedback`, { method: 'POST', body: JSON.stringify({ status, feedback: status === 'accepted' ? '操作人员已采纳' : status === 'rejected' ? '操作人员未采纳' : '操作人员标记完成' }) })
      setNotice('决策反馈已记录。'); await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : '反馈保存失败。') }
  }
  const completed = decisions.filter((d) => d.status === 'completed').length

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">J</span><div><b>jingling</b><small>INTELLIGENCE OS</small></div></div>
      <p className="section-label">WORKSPACE</p>
      <nav>{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'nav active' : 'nav'} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}<i>›</i></button>)}</nav>
      <div className="side-foot"><span className="dot" />系统工作空间<small>MVP · 0.1</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><span>工作空间　/　<b>{tabs.find((t) => t.id === tab)?.label}</b></span><span className="env">开发环境</span></header>
      <div className="content">
        <div className="welcome"><div><small>ENTERPRISE INTELLIGENCE PLATFORM</small><h1>{tab === 'overview' ? '让决策更有依据。' : tabs.find((t) => t.id === tab)?.label}</h1><p>连接企业知识、智能分析与业务反馈，构建可追溯的决策闭环。</p></div><span className="running">● 平台运行状态</span></div>
        {error && <div className="alert error">{error}<button onClick={() => void refresh()}>重试</button></div>}
        {notice && <div className="alert">{notice}<button onClick={() => setNotice('')}>关闭</button></div>}
        {tab === 'overview' && <>
          <div className="metrics"><Metric label="知识条目" value={knowledge.length} color="blue"/><Metric label="决策记录" value={decisions.length} color="violet"/><Metric label="完成闭环" value={completed} color="green"/><Metric label="模型模式" value={model?.mode === 'live' ? 'LIVE' : model?.mode === 'demo' ? 'DEMO' : '待配置'} color="amber"/></div>
          <div className="columns">
            <section className="panel"><small className="kicker">DECISION ENGINE</small><h2>发起一次决策分析</h2><p className="muted">输入业务问题，结合已录入知识生成建议并保存记录。</p><form onSubmit={submitDecision}><label htmlFor="question">业务问题</label><textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={5} maxLength={5000} rows={4} placeholder="例如：如何降低新产品上线过程中的交付风险？"/><button className="primary" disabled={busy}>{busy ? '处理中…' : '生成决策建议 →'}</button></form><div className="steps"><span>01 知识检索</span> → <span>02 智能分析</span> → <span>03 反馈沉淀</span></div></section>
            <section className="panel"><small className="kicker">MODEL PROVIDER</small><h2>模型接入状态</h2><div className="provider"><span className="provider-mark">{model?.provider === 'local' ? 'L' : model?.provider === 'cloud' ? 'C' : 'D'}</span><div><b>{model?.provider === 'local' ? '本地模型' : model?.provider === 'cloud' ? '云端模型' : '演示 Provider'}</b><small>{model?.model ?? '尚未配置模型名称'}</small></div><span className="tag">{model?.mode ?? '读取中'}</span></div><p className="muted">演示模式不会调用真实模型。真实模型凭据只从后端环境变量读取。</p><button className="secondary" onClick={() => setTab('models')}>管理模型配置 →</button></section>
          </div>
          <section className="panel"><div className="panel-title"><h2>最近决策记录</h2><button className="link" onClick={() => setTab('decisions')}>查看全部 →</button></div>{decisions.length ? <DecisionList items={decisions.slice(0, 3)} onFeedback={feedback}/> : <Empty title="还没有决策记录" text="在上方输入业务问题，创建第一条分析。"/>}</section>
        </>}
        {tab === 'knowledge' && <div className="columns">
          <section className="panel"><small className="kicker">KNOWLEDGE BASE</small><h2>新增知识条目</h2><form onSubmit={submitKnowledge}><label htmlFor="title">标题</label><input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="输入知识标题"/><label htmlFor="body">内容</label><textarea id="body" value={content} onChange={(e) => setContent(e.target.value)} required maxLength={20000} rows={6} placeholder="业务规则、经验总结或制度内容"/><button className="primary" disabled={busy}>{busy ? '保存中…' : '保存知识条目 →'}</button></form></section>
          <section className="panel"><h2>知识库 <span className="count">{knowledge.length}</span></h2>{knowledge.length ? knowledge.map((item) => <article className="knowledge" key={item.id}><b>{item.title}</b><p>{item.content}</p><small>{item.source} · {new Date(item.created_at).toLocaleString()}</small></article>) : <Empty title="知识库为空" text="新增知识后，决策分析将参考最近的条目。"/>}</section>
        </div>}
        {tab === 'decisions' && <section className="panel"><div className="panel-title"><h2>决策历史 <span className="count">{decisions.length}</span></h2><button className="primary" onClick={() => setTab('overview')}>+ 新建分析</button></div>{decisions.length ? <DecisionList items={decisions} onFeedback={feedback}/> : <Empty title="还没有决策记录" text="创建一条决策分析后，记录会显示在这里。"/>}</section>}
        {tab === 'models' && <section className="panel settings"><small className="kicker">MODEL CONFIGURATION</small><h2>模型接入</h2><p className="muted">模型凭据仅从服务端环境变量读取，界面不会回显 API Key。</p><div className="setting"><span>当前 Provider<small>模型适配层</small></span><b>{model?.provider ?? '读取中'}</b></div><div className="setting"><span>当前模型<small>MODEL_NAME</small></span><b>{model?.model ?? '未配置'}</b></div><div className="setting"><span>运行模式<small>演示输出与真实模型输出明确区分</small></span><b>{model?.mode ?? '读取中'}</b></div><div className="guide"><b>如何切换模型</b><ol><li>复制根目录 <code>.env.example</code> 为 <code>.env</code>。</li><li>设置 <code>MODEL_PROVIDER=cloud</code> 或 <code>local</code>。</li><li>设置 <code>MODEL_BASE_URL</code>、<code>MODEL_NAME</code>，必要时设置 <code>MODEL_API_KEY</code>。</li><li>重启后端并检查本页状态；不要把密钥提交到 Git。</li></ol></div></section>}
        <footer>JINGLING INTELLIGENCE OS <span>企业知识 · 智能决策 · 经验闭环</span></footer>
      </div>
    </main>
  </div>
}

function Metric({ label, value, color }: { label: string; value: number | string; color: string }) {
  return <div className="metric"><span className={`metric-icon ${color}`}>✳</span><small>{label}</small><b>{value}</b><span className="metric-line"/></div>
}
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><b>{title}</b><p>{text}</p></div> }
function DecisionList({ items, onFeedback }: { items: Decision[]; onFeedback: (item: Decision, status: 'accepted' | 'rejected' | 'completed') => void }) {
  return <div>{items.map((item) => <article className="decision" key={item.id}><div className="decision-head"><small>D-{String(item.id).padStart(4, '0')}</small><span className="tag">{({proposed:'待评审',accepted:'已采纳',rejected:'未采纳',completed:'已完成'} as Record<string,string>)[item.status] ?? item.status}</span><time>{new Date(item.created_at).toLocaleString()}</time></div><h3>{item.question}</h3><div className="recommendation"><b>建议</b><p>{item.recommendation}</p></div><details><summary>查看分析依据与风险</summary><p>{item.rationale}</p></details><div className="decision-actions"><small>Provider · {item.provider}</small><div><button onClick={() => onFeedback(item,'accepted')}>采纳</button><button onClick={() => onFeedback(item,'rejected')}>不采纳</button><button onClick={() => onFeedback(item,'completed')}>标记完成</button></div></div>{item.outcome && <p>结果：{item.outcome}</p>}</article>)}</div>
}
