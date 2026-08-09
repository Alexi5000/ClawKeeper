<div align="center">

[English](../../README.md) | [Español](README.es-ES.md) | **简体中文** | [Português](README.pt-BR.md) | [العربية](README.ar.md) | [Français](README.fr.md) | [Русский](README.ru.md)

<img src="../../assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**可审计的中小企业财务智能体控制平面。**<br/>
智能体可以提出财务工作建议；确定性的策略、租户边界、审批关卡和证据日志将决定哪些工作可以执行。

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](../../LICENSE)
[![Version](https://img.shields.io/badge/release-v2.0.2-16a34a?style=flat-square)](../../RELEASE_NOTES.md)
[![CI](https://img.shields.io/badge/CI-backend%20%7C%20dashboard%20%7C%20audit%20%7C%20docker%20%7C%20FDE-16a34a?style=flat-square)](../../.github/workflows/ci.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Proof](https://img.shields.io/badge/proof-v2.0%20bundle-16a34a?style=flat-square)](../proof/v2.0/README.md)

[智能体架构](#agent-architecture) · [ClawKeeper 的功能](#what-clawkeeper-does) · [ClawKeeper 明确不做的事](#what-clawkeeper-deliberately-does-not-do) · [安装](#install) · [使用示例](#usage-examples) · [安全态势](#security-posture) · [文档](#documentation)

---

<img src="../../assets/cover.png" alt="ClawKeeper 智能体控制界面" width="100%" />

</div>

<br/>

## 研究基准

在与开源基线的基准测试中（[arXiv:2603.24414](https://arxiv.org/abs/2603.24414)），ClawKeeper 架构在降低财务执行场景中自主 LLM 智能体威胁方面表现更优。其威胁模型针对提示词注入、跨租户数据泄露和未经授权的资金流动——这些失效模式仍是活跃的研究课题，尚不能视为已经解决。

智能体安全是持续性的，而非绝对的。基准测试结果反映的是特定时间点、特定测试工具针对特定基线所得的结果。针对自主财务智能体的新攻击途径会不断涌现。该架构旨在缩小智能体不当行为的影响范围，而不是彻底杜绝此类行为。

## v2.0 证明状态

ClawKeeper v2.0 围绕一套可检查的核心证明链进行打包：

- 后端质量关卡：`npm run quality`
- Dashboard 生产构建：`cd dashboard && npm run build`
- 依赖项审计：`npm audit --audit-level=moderate`
- FDE 基准测试：`npm run fde:benchmark`
- 证明包验证：`npm run proof:v2:validate`
- Docker 构建关卡：`.github/workflows/ci.yml`

有关 v2 证明包和验证命令，请参阅 [`docs/proof/v2.0/README.md`](../proof/v2.0/README.md)。该证明包具有确定性、可离线运行，使用合成数据并经过脱敏处理。

<br/>

<a id="agent-architecture"></a>

## 智能体架构

ClawKeeper 将财务部门建模为三层智能体层级：一名 CEO 编排器、九名领域负责人和 100 名专业工作智能体。每个智能体都继承自 `BaseAgent`，后者会在任务执行前评估 OpenClaw 策略引擎。任何智能体要接触高风险财务工作流，都必须先通过代码中的确定性策略检查——而不是依靠提示词。

```text
                          ClawKeeper CEO
                     (top-level orchestrator)
                               |
            ┌──────────────────┼──────────────────┐
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     |   CFO Lead  |    |  AP Lead  |    |   AR Lead     |
     |  (8 workers)|    |(15 workers)|   | (15 workers)  |
     └─────────────┘    └───────────┘    └───────────────┘
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     | Recon Lead  |    |Compliance |    | Reporting     |
     |(12 workers) |    |   Lead    |    |    Lead       |
     |             |    |(10 workers)|   | (12 workers)  |
     └─────────────┘    └───────────┘    └───────────────┘
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     |Integration  |    | Data/ETL  |    |  Support      |
     |   Lead      |    |   Lead    |    |    Lead       |
     |(12 workers) |    |(10 workers)|   |  (6 workers)  |
     └─────────────┘    └───────────┘    └───────────────┘

                    ── APPROVAL GATE ──
     Every high-risk action (payment, writeback, tax filing,
     cross-tenant operation) requires approval metadata before
     the policy engine permits execution. The gate is
     deterministic code in src/openclaw/policy.ts, not an
     LLM judgment call.
```

### 审批关卡逻辑

策略层刻意采用确定性设计。它不会询问 LLM 某项付款、回写或跨租户操作是否安全。

```text
Agent requests task execution
        │
        ▼
┌─────────────────────┐     ┌─────────────────┐
│ Tenant isolation    │──X──│ DENY: wrong     │
│ check               │     │ tenant context   │
└────────┬────────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────────┐     ┌─────────────────┐
│ Capability check    │──X──│ DENY: missing   │
│ (role + permissions)│     │ capability       │
└────────┬────────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────────┐     ┌─────────────────┐
│ Prompt-safety scan  │──X──│ DENY: injection │
│ (injection, bypass) │     │ attempt detected │
└────────┬────────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────────┐     ┌──────────────────┐
│ Risk tier + amount  │──?──│ GATE: approval   │
│ threshold check     │     │ metadata required │
└────────┬────────────┘     └──────────────────┘
         │ approved or low-risk
         ▼
┌─────────────────────┐
│ EXECUTE + emit      │
│ redacted audit event│
└─────────────────────┘
```

策略实现：[`src/openclaw/policy.ts`](../../src/openclaw/policy.ts) · 运行时适配器：[`src/openclaw/runtime.ts`](../../src/openclaw/runtime.ts) · 基础智能体强制执行：[`src/agents/base.ts`](../../src/agents/base.ts)

<br/>

<a id="what-clawkeeper-does"></a>

## ClawKeeper 的功能

| 领域 | 智能体数量 | 处理内容 |
|--------|-------:|-----------------|
| **应付账款** | 15 | 发票解析、OCR 验证、三单匹配（采购订单—发票—收货凭证）、重复检测、审批路由、付款安排、供应商管理 |
| **应收账款** | 15 | 客户开票、付款匹配、催收跟进、争议处理、收入确认、账龄分析、对账单生成 |
| **对账** | 12 | 通过 Plaid 导入银行交易、按日期/金额/收款方进行模糊匹配、差异调查、调整分录、异常处理 |
| **报告** | 12 | 损益表、资产负债表、现金流量表、自定义报告构建、财务比率、图表生成、定期报告交付 |
| **集成** | 12 | Plaid 银行数据源、Stripe 支付、QuickBooks 同步、Xero 同步、OAuth 流程管理、webhook 处理、熔断器 |
| **合规** | 10 | 税务合规检查、审计准备、职责分离验证、欺诈检测、文档留存、监管报告 |
| **数据 / ETL** | 10 | CSV/Excel/JSON 导入、schema 映射、数据验证、去重、数据扩充、批量处理、迁移支持 |
| **CFO / 战略** | 8 | 现金流预测、预算管理、财务建模、KPI 跟踪、差异分析、风险评估 |
| **支持** | 6 | 服务台、错误诊断、恢复、升级管理、用户引导 |

**总计：110 个智能体**（1 个 CEO 编排器 + 9 名领域负责人 + 100 个专业工作智能体）。

<br/>

<a id="what-clawkeeper-deliberately-does-not-do"></a>

## ClawKeeper 明确不做的事

明确指出失效模式，比列举功能更重要。

| 边界 | 存在的原因 |
|----------|--------------|
| **未经人工审批，不进行自主财务执行** | 付款处理、会计系统写入、税务申报和高风险操作均需要明确的审批元数据。如果缺少审批，策略引擎将拒绝执行——即使智能体具备相应的技术能力。这是最重要的架构约束。 |
| **不共享跨租户数据** | 智能体受租户范围限制。当智能体的租户上下文与目标资源不匹配时，策略引擎会拒绝任何请求。PostgreSQL 中的 RLS 强制执行在数据层提供第二重边界。 |
| **不由 LLM 做出安全决策** | 策略引擎是确定性的 TypeScript 代码，而不是提示词。在调用任何 LLM 之前，`src/openclaw/policy.ts` 会评估提示词注入检测、能力检查和审批关卡。这并不能使系统完全免疫注入攻击——但通过将 LLM 排除在安全决策路径之外，能够缩小攻击面。 |
| **不记录未经脱敏的审计日志** | 审计事件持久化到数据库之前，会对 PII 和机密信息进行脱敏。审计记录使用 PostgreSQL 仅追加触发器——一旦写入，就无法通过应用层修改或删除。 |
| **不允许 LLM 支出无限增长** | 注重成本的 LLM 客户端配置和速率限制退避机制，可防止并发多智能体运行时 API 成本失控。这可以降低高流量场景中的成本风险，但无法将其完全消除。 |

<br/>

<a id="install"></a>

## 安装

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### 最低环境变量要求

```bash
# Required
DATABASE_URL=postgresql://clawkeeper:password@localhost:5432/clawkeeper
JWT_SECRET=<random-string-minimum-32-chars>
OPENAI_API_KEY=<your-key>        # or ANTHROPIC_API_KEY

# Optional integrations
PLAID_CLIENT_ID=                 # bank feeds
STRIPE_API_KEY=                  # payment processing
QUICKBOOKS_CLIENT_ID=            # accounting sync
XERO_CLIENT_ID=                  # accounting sync
```

### 启动服务

```bash
bun run setup:full          # schema, RLS, RBAC, seed data
bun run dev                 # Hono API server + agent control plane
bun run dashboard:dev       # React command center
```

### 验证

```bash
npm run quality             # typecheck + lint + test suite
```

## 在本地验证 v2

如需在不使用数据库的情况下运行验证，请使用离线证明路径：

```bash
npm ci
npm run quality
cd dashboard && npm install && npm run build
cd ..
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
npm run demo:offline
```

如果 Docker 可用，请使用数据库支持的演示路径：

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

演示数据为合成数据。v2 证明路径不会调用 Plaid、Stripe、QuickBooks、Xero 或真实支付通道。

<br/>

<a id="usage-examples"></a>

## 使用示例

### 评估策略决策（试运行）

检查拟议的智能体操作是会获准、需要审批，还是被拒绝——全程不执行任何操作。

```bash
curl -X POST http://localhost:4004/api/agents/openclaw/policy/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "agentId": "payment-processor",
    "capability": "process_payment",
    "tenantId": "tenant_001",
    "amount": 15000,
    "approvalMetadata": null
  }'

# Response: { "decision": "approval_required", "reason": "amount exceeds threshold", ... }
```

### 检查 OpenClaw manifest

```bash
curl http://localhost:4004/api/agents/openclaw/manifest \
  -H "Authorization: Bearer $TOKEN"

# Returns: full agent registry, capabilities, risk tiers, approval rules
```

### 上传并处理发票

```bash
curl -X POST http://localhost:4004/api/invoices/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@invoice.pdf"

# Triggers: OCR extraction → line-item validation → duplicate check
#           → expense categorization → approval routing
# Failure mode: OCR sum-matching guardrail will reject the invoice
# if line-item totals do not match the stated total.
```

<br/>

<a id="security-posture"></a>

## 安全态势

智能体安全是一项持续性的实践，而不是一项交付即完成的功能。ClawKeeper 威胁模型重点关注自主财务智能体特有的攻击面：提示词注入、跨租户泄露、未经授权的资金流动和审计篡改。

| 防护措施 | 实现方式 | 已知局限 |
|-----------|---------------|-----------------|
| **租户隔离** | 策略引擎 + PostgreSQL RLS | 如果在应用层之外授予原始 SQL 访问权限，则可能绕过 RLS |
| **审批关卡** | `src/openclaw/policy.ts` 中的确定性策略检查 | 审批元数据一经提供即受信任——审批工作流 UI 已列入 v1.6 路线图 |
| **拒绝提示词注入** | 在调用 LLM 前评估的模式匹配防护措施 | 基于模式的检测无法捕获新型注入技术；这是一个活跃的研究领域 |
| **审计不可变性** | PostgreSQL 仅追加触发器；写入前对 PII/机密信息进行脱敏 | 数据库层绕过（直接执行 SQL）可规避触发器；通过网络访问控制降低此风险 |
| **OCR 验证** | 通过程序匹配各行项目之和与所述总额 | 专门设计成可通过总和检查、但个别行项目有误的对抗性发票，是一个已知缺口 |
| **速率限制韧性** | 遇到 429/瞬态错误时采用指数退避重试 | 退避设有上限，但峰值并发期间持续遭遇速率限制会降低智能体吞吐量 |

研究背景：[arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · 安全模型：[`docs/SECURITY_MODEL.md`](../SECURITY_MODEL.md) · 漏洞报告：[`SECURITY.md`](../../SECURITY.md)

<br/>

## API 接口

```text
GET  /health                                 # liveness
POST /api/auth/login                         # JWT authentication
POST /api/auth/register                      # tenant registration
GET  /api/agents                             # agent registry
GET  /api/agents/openclaw/manifest           # OpenClaw manifest inspection
POST /api/agents/openclaw/policy/evaluate    # dry-run policy evaluation
GET  /api/invoices                           # invoice list
POST /api/invoices/upload                    # OCR invoice processing
POST /api/reconciliation/start              # bank reconciliation
GET  /api/reports/:type                      # financial reports
WS   /ws                                     # real-time agent events
```

<br/>

## 测试与质量关卡

测试套件验证了财务智能体版本中至关重要的系统部分：manifest 正确性、策略决策、审批要求、租户隔离、提示词注入拒绝和审计脱敏。Dashboard 行为测试处于次要地位。

```bash
npm run typecheck          # TypeScript strict mode
npm run lint               # ESLint
npm test                   # OpenClaw manifest + policy tests
npm run quality            # all three, sequential
npm run fde:benchmark      # deterministic finance-agent benchmark
npm run proof:v2:validate  # proof bundle validation
```

| 测试文件 | 验证内容 |
|-----------|------------------|
| `test/openclaw.manifest.test.ts` | 应用身份、智能体注册、高风险能力策略、运行时适配器健康状况 |
| `test/openclaw.policy.test.ts` | 自主报告、需要审批的付款流程、租户隔离拒绝、缺少能力拒绝、提示词注入拒绝、审计脱敏 |

<br/>

<a id="documentation"></a>

## 仓库结构

```text
ClawKeeper/
├── src/
│   ├── agents/          # CEO, orchestrator, worker, BaseAgent execution
│   ├── api/             # Hono server, finance + control-plane routes
│   ├── core/            # Types, LLM client, observability, scheduling
│   ├── guardrails/      # Validation, PII detection, injection checks
│   ├── integrations/    # Plaid, Stripe, QuickBooks, Xero, Document AI
│   ├── memory/          # Agent memory and context primitives
│   └── openclaw/        # Manifest, policy engine, runtime adapter
├── agents/              # 110 AGENT.md definitions (CEO + leads + workers)
├── test/                # OpenClaw manifest + policy tests
├── dashboard/           # React/Vite/Tailwind command center
├── db/                  # PostgreSQL schema, RLS, RBAC, seed data
├── docs/                # Architecture, security model, API, deployment
└── skills/              # Finance skill definitions
```

<br/>

## 文档

| 文档 | 用途 |
|----------|---------|
| [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | 系统架构和智能体层级 |
| [`docs/SECURITY_MODEL.md`](../SECURITY_MODEL.md) | OpenClaw 智能体边界、审批关卡、财务防护措施 |
| [`docs/proof/v2.0/README.md`](../proof/v2.0/README.md) | v2 证明包和验证命令 |
| [`docs/API.md`](../API.md) | API 参考 |
| [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) | 部署指南 |
| [`docs/MULTI-TENANCY.md`](../MULTI-TENANCY.md) | 租户隔离和 RBAC 模型 |
| [`AGENTS.md`](../../AGENTS.md) | 包含层级结构的完整 110 智能体索引 |
| [`SECURITY.md`](../../SECURITY.md) | 漏洞报告政策 |
| [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | 贡献工作流 |
| [`CONTRIBUTORS.md`](../../CONTRIBUTORS.md) | 贡献者致谢 |

<br/>

## 路线图

| 版本 | 方向 | 待解决风险 |
|---------|-----------|-----------|
| **v2.1** | 审批工作台——人工审批队列、审核者评论、Dashboard 中不可变的审批证据 | 高流量 AP 操作的审批 UX 延迟 |
| **v2.2** | 集成加固——针对 Plaid、Stripe、QuickBooks、Xero 适配器的契约测试 | 测试环境与生产环境之间的第三方 API schema 漂移 |
| **v2.3** | 运行时扩展——分布式智能体调度、工具沙箱、执行重放 | 外部系统状态发生变化时的重放保真度 |
| **v3.0** | 财务自动驾驶——结合审批、对账、报告和回写的端到端工作流 | 多步骤智能体链中的错误率累积 |

<br/>

## 许可证

MIT。参见 [`LICENSE`](../../LICENSE)。

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · 美国俄亥俄州哥伦布市

如需生产部署、安全审查或集成支持，请访问：[techtideai.io](https://techtideai.io/)

</div>
