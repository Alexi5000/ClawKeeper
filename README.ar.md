<div align="center">

[English](README.md) | [Español](README.es-ES.md) | [简体中文](README.zh-CN.md) | [Português](README.pt-BR.md) | **العربية** | [Français](README.fr.md) | [Русский](README.ru.md)

<img src="assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**منصة تحكّم قابلة للتدقيق في الوكلاء الماليين للشركات الصغيرة والمتوسطة.**<br/>
يمكن للوكلاء اقتراح مهام مالية؛ بينما تحدد السياسات الحتمية وحدود المستأجرين وبوابات الموافقة وسجلات الأدلة ما يجوز تنفيذه.

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/release-v2.0.1-16a34a?style=flat-square)](RELEASE_NOTES.md)
[![CI](https://img.shields.io/badge/CI-backend%20%7C%20dashboard%20%7C%20audit%20%7C%20docker%20%7C%20FDE-16a34a?style=flat-square)](.github/workflows/ci.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Proof](https://img.shields.io/badge/proof-v2.0%20bundle-16a34a?style=flat-square)](docs/proof/v2.0/README.md)

[بنية الوكلاء](#agent-architecture) · [ما الذي يفعله ClawKeeper](#what-clawkeeper-does) · [ما الذي يتعمّد ClawKeeper عدم فعله](#what-clawkeeper-deliberately-does-not-do) · [التثبيت](#install) · [أمثلة الاستخدام](#usage-examples) · [الوضع الأمني](#security-posture) · [الوثائق](#documentation)

---

<img src="assets/cover.png" alt="ClawKeeper agent control surface" width="100%" />

</div>

<br/>

## مرتكز البحث

في اختبارات قياس الأداء مقارنةً بخطوط أساس مفتوحة المصدر ([arXiv:2603.24414](https://arxiv.org/abs/2603.24414))، أظهرت بنية ClawKeeper قدرةً متفوقة على الحد من تهديدات وكلاء LLM المستقلين في سياقات التنفيذ المالي. يستهدف نموذج التهديد حقن المطالبات، وتسرب البيانات بين المستأجرين، وتحريك الأموال من دون تصريح -- وهي أنماط إخفاق لا تزال موضع بحث نشط ولا تُعدّ مشكلات محلولة.

أمن الوكلاء ممارسة مستمرة، لا ضمان مطلق. تعكس نتائج القياس بيئة اختبار محددة ومجموعة محددة من خطوط الأساس في نقطة زمنية بعينها. وتظهر بانتظام أساليب هجوم جديدة على الوكلاء الماليين المستقلين. صُممت هذه البنية لتقليص نطاق الأضرار الناجمة عن سوء سلوك الوكيل، لا لإلغائها تمامًا.

## حالة إثبات v2.0

تتمحور حزمة ClawKeeper v2.0 حول سلسلة أدلة قابلة للفحص:

- بوابة جودة الواجهة الخلفية: `npm run quality`
- بناء لوحة المعلومات للإنتاج: `cd dashboard && npm run build`
- تدقيق الاعتماديات: `npm audit --audit-level=moderate`
- اختبار FDE المعياري: `npm run fde:benchmark`
- التحقق من صحة حزمة الإثبات: `npm run proof:v2:validate`
- بوابة بناء Docker: `.github/workflows/ci.yml`

راجع [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) للاطلاع على حزمة إثبات v2 وأوامر التحقق. حزمة الإثبات حتمية، وغير متصلة بالشبكة، واصطناعية، ومنقّحة.

<br/>

<a id="agent-architecture"></a>

## بنية الوكلاء

تمثّل ClawKeeper قسمًا ماليًا بهيكل هرمي من ثلاث طبقات للوكلاء: منسّق واحد بدور الرئيس التنفيذي، وتسعة قادة مجالات، و100 عامل متخصص. يرث كل وكيل من `BaseAgent`، الذي يقيّم محرك سياسات OpenClaw قبل تنفيذ المهمة. ولا يصل أي وكيل إلى سير عمل مالي عالي المخاطر من دون اجتياز فحوصات سياسات حتمية في الشيفرة -- لا في المطالبات.

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

### منطق بوابة الموافقة

طبقة السياسات حتمية عن قصد. فهي لا تسأل LLM عما إذا كانت عملية دفع أو إعادة كتابة أو إجراء عابر للمستأجرين آمنًا.

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

تنفيذ السياسة: [`src/openclaw/policy.ts`](src/openclaw/policy.ts) · محول وقت التشغيل: [`src/openclaw/runtime.ts`](src/openclaw/runtime.ts) · إنفاذ الوكيل الأساسي: [`src/agents/base.ts`](src/agents/base.ts)

<br/>

<a id="what-clawkeeper-does"></a>

## ما الذي يفعله ClawKeeper

| المجال | الوكلاء | ما يتولونه |
|--------|-------:|-----------------|
| **الحسابات الدائنة** | 15 | تحليل الفواتير، والتحقق من OCR، والمطابقة الثلاثية (أمر الشراء-الفاتورة-إيصال الاستلام)، وكشف التكرار، وتوجيه الموافقات، وجدولة المدفوعات، وإدارة الموردين |
| **الحسابات المدينة** | 15 | إصدار فواتير العملاء، ومطابقة المدفوعات، ومتابعة التحصيل، ومعالجة النزاعات، وإثبات الإيرادات، وتحليل أعمار الديون، وإصدار كشوف الحسابات |
| **التسوية** | 12 | استيراد المعاملات المصرفية عبر Plaid، والمطابقة التقريبية بحسب التاريخ/المبلغ/المستفيد، والتحقيق في الفروقات، وقيود التسوية، ومعالجة الاستثناءات |
| **التقارير** | 12 | الأرباح والخسائر، والميزانية العمومية، وقوائم التدفقات النقدية، وإنشاء التقارير المخصصة، والنسب المالية، وإنشاء المخططات، وتسليم التقارير المجدولة |
| **التكامل** | 12 | موجزات Plaid المصرفية، ومدفوعات Stripe، ومزامنة QuickBooks وXero، وإدارة تدفقات OAuth، ومعالجة webhooks، وقواطع الدارات |
| **الامتثال** | 10 | فحوصات الامتثال الضريبي، والتحضير للتدقيق، والتحقق من فصل المهام، وكشف الاحتيال، والاحتفاظ بالمستندات، والتقارير التنظيمية |
| **البيانات / ETL** | 10 | استيراد CSV/Excel/JSON، وربط المخططات، والتحقق من البيانات، وإزالة التكرار، والإثراء، والمعالجة المجمّعة، ودعم الترحيل |
| **CFO / الاستراتيجية** | 8 | توقّع التدفقات النقدية، وإدارة الميزانية، والنمذجة المالية، وتتبع KPI، وتحليل الانحرافات، وتقييم المخاطر |
| **الدعم** | 6 | مكتب المساعدة، وتشخيص الأخطاء، والاسترداد، وإدارة التصعيد، وتهيئة المستخدمين |

**الإجمالي: 110 وكلاء** (منسّق واحد بدور الرئيس التنفيذي + 9 قادة مجالات + 100 عامل متخصص).

<br/>

<a id="what-clawkeeper-deliberately-does-not-do"></a>

## ما الذي يتعمّد ClawKeeper عدم فعله

تسمية أنماط الإخفاق أهم من تسمية الميزات.

| الحد | سبب وجوده |
|----------|--------------|
| **لا تنفيذ ماليًا مستقلًا من دون موافقة بشرية** | تتطلب معالجة المدفوعات، والكتابة في أنظمة المحاسبة، والإقرارات الضريبية، والعمليات عالية المخاطر بيانات وصفية صريحة للموافقة. يرفض محرك السياسات التنفيذ عند غياب الموافقة -- حتى إن امتلك الوكيل القدرة التقنية. وهذا أهم قيد معماري. |
| **لا مشاركة للبيانات بين المستأجرين** | يقتصر كل وكيل على مستأجر بعينه. يرفض محرك السياسات أي طلب لا يتطابق فيه سياق مستأجر الوكيل مع المورد المستهدف. ويوفر تطبيق RLS في PostgreSQL حدًا ثانيًا على طبقة البيانات. |
| **لا قرارات أمنية مستندة إلى LLM** | محرك السياسات شيفرة TypeScript حتمية، لا مطالبة. ويجري تقييم كشف حقن المطالبات، وفحوصات القدرات، وبوابات الموافقة في `src/openclaw/policy.ts` قبل استدعاء أي LLM. لا يجعل هذا النظام محصّنًا من الحقن -- لكنه يقلل سطح الهجوم بإبعاد LLM عن مسار القرار الأمني. |
| **لا تسجيل تدقيق من دون تنقيح** | تُنقّح PII والأسرار من أحداث التدقيق قبل حفظها في قاعدة البيانات. تستخدم سجلات التدقيق مشغّلات إلحاق فقط في PostgreSQL -- فلا يمكن بعد كتابتها تعديلها أو حذفها عبر طبقة التطبيق. |
| **لا إنفاق غير محدود على LLM** | يمنع إعداد عميل LLM المراعي للتكلفة والتراجع عند بلوغ حدود المعدل انفلات تكاليف API خلال عمليات التشغيل المتزامنة متعددة الوكلاء. يحدّ ذلك من مخاطر التكلفة، لكنه لا يلغيها في سيناريوهات الأحجام الكبيرة. |

<br/>

<a id="install"></a>

## التثبيت

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### الحد الأدنى لمتغيرات البيئة

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

### تشغيل الخدمات

```bash
bun run setup:full          # schema, RLS, RBAC, seed data
bun run dev                 # Hono API server + agent control plane
bun run dashboard:dev       # React command center
```

### التحقق

```bash
npm run quality             # typecheck + lint + test suite
```

## التحقق من v2 محليًا

استخدم مسار الإثبات غير المتصل عندما تريد إجراء تحقق لا يعتمد على قاعدة بيانات:

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

استخدم مسار العرض التوضيحي المعتمد على قاعدة البيانات عند توفر Docker:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

بيانات العرض التوضيحي اصطناعية. لا يستدعي مسار إثبات v2 خدمات Plaid أو Stripe أو QuickBooks أو Xero، ولا مسارات الدفع الحية.

<br/>

<a id="usage-examples"></a>

## أمثلة الاستخدام

### تقييم قرار سياسة (تشغيل تجريبي)

تحقق مما إذا كان إجراء الوكيل المقترح سيُسمح به، أو سيخضع لبوابة موافقة، أو سيُرفض -- من دون تنفيذ أي شيء.

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

### فحص ملف OpenClaw التعريفي

```bash
curl http://localhost:4004/api/agents/openclaw/manifest \
  -H "Authorization: Bearer $TOKEN"

# Returns: full agent registry, capabilities, risk tiers, approval rules
```

### رفع فاتورة ومعالجتها

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

## الوضع الأمني

أمن الوكلاء ممارسة مستمرة، لا ميزة تُشحن مرة واحدة. يركّز نموذج تهديد ClawKeeper على أسطح الهجوم الخاصة بالوكلاء الماليين المستقلين: حقن المطالبات، والتسرب بين المستأجرين، وتحريك الأموال من دون تصريح، والتلاعب بسجلات التدقيق.

| وسيلة الحماية | التنفيذ | القيد المعروف |
|-----------|---------------|-----------------|
| **عزل المستأجرين** | محرك السياسات + PostgreSQL RLS | يمكن تجاوز RLS إذا مُنح وصول مباشر إلى SQL خارج طبقة التطبيق |
| **بوابات الموافقة** | فحوصات سياسات حتمية في `src/openclaw/policy.ts` | تُعدّ بيانات الموافقة موثوقة بعد تقديمها -- واجهة مستخدم سير عمل الموافقة مدرجة في خارطة طريق v1.6 |
| **رفض حقن المطالبات** | وسائل حماية بمطابقة الأنماط تُقيّم قبل استدعاء LLM | لا يكشف الرصد القائم على الأنماط أساليب الحقن الجديدة؛ وهذا مجال بحث نشط |
| **ثبات سجلات التدقيق** | مشغّلات إلحاق فقط في PostgreSQL؛ تنقيح PII والأسرار قبل الكتابة | يمكن للتجاوز على مستوى قاعدة البيانات (SQL مباشر) تخطي المشغّلات؛ ويُحدّ من ذلك بضوابط الوصول إلى الشبكة |
| **التحقق من OCR** | مطابقة برمجية لمجموع البنود مع الإجماليات المعلنة | تمثّل الفواتير الخبيثة المصممة لاجتياز فحوصات المجموع مع احتوائها على بنود فردية غير صحيحة ثغرة معروفة |
| **المرونة أمام حدود المعدل** | إعادة المحاولة بتراجع أُسّي عند أخطاء 429/الأخطاء العابرة | توجد حدود قصوى للتراجع، لكن استمرار تقييد المعدل في ذروة التزامن قد يخفض إنتاجية الوكلاء |

سياق البحث: [arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · نموذج الأمان: [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) · تقارير الثغرات الأمنية: [`SECURITY.md`](SECURITY.md)

<br/>

## سطح API

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

## بوابات الاختبار والجودة

تتحقق مجموعة الاختبار من صحة أجزاء النظام التي تهم إصدار الوكيل المالي: الصحة الواضحة، وقرارات السياسة، ومتطلبات الموافقة، وعزل المستأجر، ورفض الحقن الفوري، وتنقيح التدقيق. تعتبر اختبارات سلوك لوحة المعلومات ثانوية.

```bash
npm run typecheck          # TypeScript strict mode
npm run lint               # ESLint
npm test                   # OpenClaw manifest + policy tests
npm run quality            # all three, sequential
npm run fde:benchmark      # deterministic finance-agent benchmark
npm run proof:v2:validate  # proof bundle validation
```

|ملف الاختبار|ما يثبت صحته|
|-----------|------------------|
|`test/openclaw.manifest.test.ts`|هوية التطبيق، وتسجيل الوكيل، وسياسة القدرات عالية المخاطر، وصحة محول وقت التشغيل|
|`test/openclaw.policy.test.ts`|التقارير الذاتية، تدفقات الدفع المطلوبة للموافقة، رفض عزل المستأجر، رفض القدرة المفقودة، رفض الحقن الفوري، تنقيح التدقيق|

<br/>

<a id="documentation"></a>

## هيكل المستودع

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

## التوثيق

|وثيقة|غاية|
|----------|---------|
|[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)|بنية النظام والتسلسل الهرمي للوكيل|
|[`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md)|OpenClaw حدود الوكيل، بوابات الموافقة، حواجز الحماية المالية|
|[`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md)|حزمة إثبات v2 وأوامر التحقق|
|[`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md)|ملاحظات الإصدار التاريخية وأدلة التحقق من الصحة|
|[`docs/API.md`](docs/API.md)|مرجع API|
|[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)|توجيه النشر|
|[`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md)|عزل المستأجر ونموذج RBAC|
|[`AGENTS.md`](AGENTS.md)|فهرس وكيل 110 كامل مع التسلسل الهرمي|
|[`SECURITY.md`](SECURITY.md)|سياسة الإبلاغ عن نقاط الضعف|
|[`CONTRIBUTING.md`](CONTRIBUTING.md)|سير عمل المساهمة|
|[`CONTRIBUTORS.md`](CONTRIBUTORS.md)|شكر وتقدير للمساهمين|

<br/>

## خارطة الطريق

|إصدار|اتجاه|خطر مفتوح|
|---------|-----------|-----------|
|**v2.1**|منضدة الموافقة - قائمة انتظار الموافقة البشرية، وتعليقات المراجعين، وأدلة الموافقة غير القابلة للتغيير في لوحة المعلومات|الموافقة على زمن استجابة UX لعمليات AP كبيرة الحجم|
|**v2.2**|تقوية التكامل - اختبارات العقد لمحولات Plaid، Stripe، QuickBooks، Xero|ينجرف مخطط API التابع لجهة خارجية بين الاختبار والإنتاج|
|**v2.3**|توسيع وقت التشغيل - جدولة الوكيل الموزع، وضع الحماية للأداة، إعادة التنفيذ|إعادة تشغيل الدقة عندما تتغير حالة النظام الخارجي|
|**v3.0**|الطيار الآلي المالي - سير العمل الشامل الذي يجمع بين الموافقات والتسوية وإعداد التقارير وإعادة الكتابة|مضاعفة معدلات الخطأ عبر سلاسل الوكلاء متعددة الخطوات|

<br/>

## رخصة

MIT. انظر [`LICENSE`](LICENSE).

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · Columbus, Ohio

لنشر الإنتاج أو مراجعة الأمان أو دعم التكامل: [techtideai.io](https://techtideai.io/)

</div>
