<div align="center">

[English](README.md) | [Español](README.es-ES.md) | [简体中文](README.zh-CN.md) | [Português](README.pt-BR.md) | [العربية](README.ar.md) | [Français](README.fr.md) | **Русский**

<img src="assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**Аудируемая платформа управления финансовыми агентами для малого и среднего бизнеса.**<br/>
Агенты могут предлагать выполнение финансовых операций, но решение о том, что разрешено запускать, принимают детерминированные политики, границы арендаторов, шлюзы согласования и журналы доказательств.

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/release-v2.0.1-16a34a?style=flat-square)](RELEASE_NOTES.md)
[![CI](https://img.shields.io/badge/CI-backend%20%7C%20dashboard%20%7C%20audit%20%7C%20docker%20%7C%20FDE-16a34a?style=flat-square)](.github/workflows/ci.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Proof](https://img.shields.io/badge/proof-v2.0%20bundle-16a34a?style=flat-square)](docs/proof/v2.0/README.md)

[Архитектура](#agent-architecture) · [Возможности](#what-clawkeeper-does) · [Ограничения](#what-clawkeeper-deliberately-does-not-do) · [Установка](#install) · [Примеры использования](#usage-examples) · [Безопасность](#security-posture) · [Документация](#documentation)

---

<img src="assets/cover.png" alt="ClawKeeper agent control surface" width="100%" />

</div>

<br/>

## Отправная точка исследования

В сравнительных испытаниях с базовыми решениями с открытым исходным кодом ([arXiv:2603.24414](https://arxiv.org/abs/2603.24414)) архитектура ClawKeeper продемонстрировала более эффективное противодействие угрозам со стороны автономных LLM-агентов в контексте исполнения финансовых операций. Модель угроз охватывает инъекции в промпты, межарендаторскую утечку данных и несанкционированное перемещение денежных средств — классы отказов, которые по-прежнему активно исследуются и не считаются устранёнными.

Безопасность агентов — непрерывный процесс, а не абсолютная гарантия. Результаты испытаний относятся к конкретному тестовому стенду, конкретному набору базовых решений и определённому моменту времени. Новые векторы атак на автономных финансовых агентов появляются регулярно. Архитектура предназначена для ограничения последствий некорректного поведения агентов, а не для полного его исключения.

## Статус доказательной базы v2.0

ClawKeeper v2.0 построен вокруг доступного для проверки набора доказательств:

- Контроль качества бэкенда: `npm run quality`
- Производственная сборка панели управления: `cd dashboard && npm run build`
- Аудит зависимостей: `npm audit --audit-level=moderate`
- Бенчмарк FDE: `npm run fde:benchmark`
- Проверка набора доказательств: `npm run proof:v2:validate`
- Проверка сборки Docker: `.github/workflows/ci.yml`

Набор доказательств v2 и команды проверки приведены в [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md). Этот набор детерминирован, работает автономно, использует синтетические данные и не содержит конфиденциальной информации.

<br/>

<a id="agent-architecture"></a>

## Архитектура агентов

ClawKeeper моделирует финансовый отдел как трёхуровневую иерархию агентов: один CEO-оркестратор, девять руководителей направлений и 100 специализированных исполнителей. Каждый агент наследуется от `BaseAgent`, который перед выполнением задачи обращается к движку политик OpenClaw. Ни один агент не получает доступ к финансовому процессу высокого риска без детерминированных проверок политик в коде — не в промптах.

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

### Логика шлюза согласования

Уровень политик намеренно сделан детерминированным. Он не спрашивает LLM, безопасен ли платёж, обратная запись или межарендаторская операция.

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

Реализация политик: [`src/openclaw/policy.ts`](src/openclaw/policy.ts) · Адаптер среды выполнения: [`src/openclaw/runtime.ts`](src/openclaw/runtime.ts) · Применение правил базовым агентом: [`src/agents/base.ts`](src/agents/base.ts)

<br/>

<a id="what-clawkeeper-does"></a>

## Что делает ClawKeeper

| Направление | Агенты | Задачи |
|--------|-------:|-----------------|
| **Кредиторская задолженность** | 15 | Разбор счетов, проверка OCR, трёхстороннее сопоставление (заказ на закупку — счёт — приёмка), обнаружение дубликатов, маршрутизация согласований, планирование платежей, управление поставщиками |
| **Дебиторская задолженность** | 15 | Выставление счетов клиентам, сопоставление платежей, работа с задолженностью, урегулирование споров, признание выручки, анализ сроков задолженности, формирование выписок |
| **Сверка** | 12 | Импорт банковских транзакций через Plaid, нечёткое сопоставление по дате, сумме и получателю, расследование расхождений, корректирующие проводки, обработка исключений |
| **Отчётность** | 12 | P&L, бухгалтерский баланс, отчёты о движении денежных средств, создание пользовательских отчётов, финансовые коэффициенты, построение диаграмм, доставка отчётов по расписанию |
| **Интеграции** | 12 | Банковские каналы Plaid, платежи Stripe, синхронизация с QuickBooks и Xero, управление потоками OAuth, обработка вебхуков, автоматические выключатели |
| **Комплаенс** | 10 | Проверки налогового соответствия, подготовка к аудиту, проверка разделения обязанностей, выявление мошенничества, хранение документов, регуляторная отчётность |
| **Данные / ETL** | 10 | Импорт CSV/Excel/JSON, сопоставление схем, проверка данных, дедупликация, обогащение, пакетная обработка, поддержка миграции |
| **CFO / Стратегия** | 8 | Прогнозирование денежных потоков, управление бюджетом, финансовое моделирование, отслеживание KPI, анализ отклонений, оценка рисков |
| **Поддержка** | 6 | Служба поддержки, диагностика ошибок, восстановление, управление эскалациями, адаптация новых пользователей |

**Всего: 110 агентов** (1 CEO-оркестратор + 9 руководителей направлений + 100 специализированных исполнителей).

<br/>

<a id="what-clawkeeper-deliberately-does-not-do"></a>

## Чего ClawKeeper намеренно НЕ делает

Чётко обозначить режимы отказа важнее, чем перечислить функции.

| Ограничение | Зачем оно нужно |
|----------|--------------|
| **Не выполняет финансовые операции автономно без одобрения человека** | Обработка платежей, запись в бухгалтерские системы, подача налоговой отчётности и операции высокого риска требуют явных метаданных согласования. При их отсутствии движок политик отклонит выполнение, даже если у агента есть техническая возможность. Это важнейшее архитектурное ограничение. |
| **Не допускает обмена данными между арендаторами** | Область действия агентов ограничена арендатором. Движок политик отклоняет любой запрос, если контекст арендатора агента не соответствует целевому ресурсу. Применение RLS в PostgreSQL создаёт второй уровень защиты на уровне данных. |
| **Не поручает LLM принимать решения о безопасности** | Движок политик — это детерминированный код TypeScript, а не промпт. Обнаружение инъекций в промпты, проверки возможностей и шлюзы согласования выполняются в `src/openclaw/policy.ts` до обращения к какой-либо LLM. Это не делает систему неуязвимой для инъекций, но сокращает поверхность атаки, исключая LLM из процесса принятия решений о безопасности. |
| **Не ведёт журналы аудита без редактирования конфиденциальных данных** | PII и секреты удаляются из событий аудита до сохранения в базе данных. Для записей аудита используются триггеры PostgreSQL, допускающие только добавление: после записи их нельзя изменить или удалить через уровень приложения. |
| **Не допускает неограниченных расходов на LLM** | Настройки клиента LLM с учётом стоимости и задержка повторных запросов при ограничении частоты предотвращают неконтролируемые расходы на API при одновременной работе множества агентов. В сценариях с высокой нагрузкой это снижает, но не устраняет риск затрат. |

<br/>

<a id="install"></a>

## Установка

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### Минимальный набор переменных среды

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

### Запуск сервисов

```bash
bun run setup:full          # schema, RLS, RBAC, seed data
bun run dev                 # Hono API server + agent control plane
bun run dashboard:dev       # React command center
```

### Проверка

```bash
npm run quality             # typecheck + lint + test suite
```

## Локальная проверка v2

Для проверки без базы данных используйте автономный набор доказательств:

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

Если доступен Docker, используйте демонстрационный сценарий с базой данных:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

Демонстрационные данные являются синтетическими. В сценарии проверки v2 не выполняются обращения к Plaid, Stripe, QuickBooks, Xero или реальным платёжным системам.

<br/>

<a id="usage-examples"></a>

## Примеры использования

### Оценка решения политики (пробный запуск)

Проверьте, будет ли предлагаемое действие агента разрешено, направлено на согласование или отклонено, не выполняя само действие.

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

### Просмотр манифеста OpenClaw

```bash
curl http://localhost:4004/api/agents/openclaw/manifest \
  -H "Authorization: Bearer $TOKEN"

# Returns: full agent registry, capabilities, risk tiers, approval rules
```

### Загрузка и обработка счёта

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

## Модель безопасности

Безопасность агентов — непрерывная практика, а не готовая функция продукта. Модель угроз ClawKeeper сосредоточена на поверхностях атаки, характерных для автономных финансовых агентов: инъекциях в промпты, межарендаторских утечках, несанкционированном перемещении денежных средств и подделке аудита.

| Защитный механизм | Реализация | Известное ограничение |
|-----------|---------------|-----------------|
| **Изоляция арендаторов** | Движок политик + PostgreSQL RLS | Обход RLS возможен, если прямой доступ к SQL предоставлен за пределами уровня приложения |
| **Шлюзы согласования** | Детерминированные проверки политик в `src/openclaw/policy.ts` | После предоставления метаданные согласования считаются доверенными; интерфейс процесса согласования запланирован в дорожной карте v1.6 |
| **Блокировка инъекций в промпты** | Защитные правила на основе сопоставления с шаблонами, применяемые до обращения к LLM | Обнаружение по шаблонам не выявляет новые техники инъекций; эта область активно исследуется |
| **Неизменяемость аудита** | Триггеры PostgreSQL, допускающие только добавление; удаление PII и секретов перед записью | Обход на уровне базы данных (прямой SQL) может обойти триггеры; риск снижается средствами контроля сетевого доступа |
| **Проверка OCR** | Программное сопоставление суммы позиций с заявленной итоговой суммой | Известным пробелом остаются состязательные счета, составленные так, чтобы пройти проверку суммы при неверных отдельных позициях |
| **Устойчивость к ограничению частоты** | Экспоненциальная задержка повторных запросов при ошибках 429 и временных сбоях | Задержка ограничена сверху, однако длительное ограничение частоты при пиковой параллельной нагрузке может снизить пропускную способность агентов |

Контекст исследования: [arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · Модель безопасности: [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) · Сообщения об уязвимостях: [`SECURITY.md`](SECURITY.md)

<br/>

## Интерфейс API

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

## Тестирование и проверки качества

Набор тестов проверяет наиболее значимые для выпуска системы финансовых агентов компоненты: корректность манифеста, решения политик, требования к согласованию, изоляцию арендаторов, блокировку инъекций в промпты и редактирование данных аудита. Тесты поведения панели управления вторичны.

```bash
npm run typecheck          # TypeScript strict mode
npm run lint               # ESLint
npm test                   # OpenClaw manifest + policy tests
npm run quality            # all three, sequential
npm run fde:benchmark      # deterministic finance-agent benchmark
npm run proof:v2:validate  # proof bundle validation
```

| Файл теста | Что он проверяет |
|-----------|------------------|
| `test/openclaw.manifest.test.ts` | Идентификатор приложения, регистрацию агентов, политику возможностей высокого риска, работоспособность адаптера среды выполнения |
| `test/openclaw.policy.test.ts` | Автономную отчётность, платёжные процессы с обязательным согласованием, отклонение при нарушении изоляции арендаторов, отклонение при отсутствии возможности, блокировку инъекций в промпты, редактирование данных аудита |

<br/>

<a id="documentation"></a>

## Структура репозитория

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

## Документация

| Документ | Назначение |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Архитектура системы и иерархия агентов |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Граница агента OpenClaw, шлюзы согласования, защитные механизмы для финансовых операций |
| [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) | Набор доказательств v2 и команды проверки |
| [`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md) | Исторические примечания к выпуску и свидетельства проверки |
| [`docs/API.md`](docs/API.md) | Справочник API |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Руководство по развёртыванию |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) | Изоляция арендаторов и модель RBAC |
| [`AGENTS.md`](AGENTS.md) | Полный индекс 110 агентов с иерархией |
| [`SECURITY.md`](SECURITY.md) | Политика сообщения об уязвимостях |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Порядок внесения изменений |
| [`CONTRIBUTORS.md`](CONTRIBUTORS.md) | Благодарности участникам проекта |

<br/>

## Дорожная карта

| Версия | Направление | Открытый риск |
|---------|-----------|-----------|
| **v2.1** | Рабочее место согласований — очередь одобрения человеком, комментарии проверяющих, неизменяемые свидетельства согласования на панели управления | Задержки в интерфейсе согласования при большом объёме операций с кредиторской задолженностью |
| **v2.2** | Усиление интеграций — контрактные тесты адаптеров Plaid, Stripe, QuickBooks и Xero | Расхождение схем сторонних API между тестовой и производственной средами |
| **v2.3** | Расширение среды выполнения — распределённое планирование агентов, изоляция инструментов, воспроизведение выполнения | Точность воспроизведения после изменения состояния внешней системы |
| **v3.0** | Финансовый автопилот — сквозные процессы, объединяющие согласования, сверку, отчётность и обратную запись | Накопление ошибок в многоэтапных цепочках агентов |

<br/>

## Лицензия

MIT. См. [`LICENSE`](LICENSE).

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · Колумбус, Огайо

По вопросам промышленного развёртывания, аудита безопасности или поддержки интеграций: [techtideai.io](https://techtideai.io/)

</div>
