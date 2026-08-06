<div align="center">

[English](README.md) | [Español](README.es-ES.md) | [简体中文](README.zh-CN.md) | **Português** | [العربية](README.ar.md) | [Français](README.fr.md) | [Русский](README.ru.md)

<img src="assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**Plano de controle auditável para agentes financeiros de PMEs.**<br/>
Os agentes podem propor tarefas financeiras; políticas determinísticas, limites entre locatários, portões de aprovação e registros de evidências decidem o que pode ser executado.

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/release-v2.0.1-16a34a?style=flat-square)](RELEASE_NOTES.md)
[![CI](https://img.shields.io/badge/CI-backend%20%7C%20dashboard%20%7C%20audit%20%7C%20docker%20%7C%20FDE-16a34a?style=flat-square)](.github/workflows/ci.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Proof](https://img.shields.io/badge/proof-v2.0%20bundle-16a34a?style=flat-square)](docs/proof/v2.0/README.md)

[Arquitetura](#agent-architecture) · [O que faz](#what-clawkeeper-does) · [O que não faz](#what-clawkeeper-deliberately-does-not-do) · [Instalação](#install) · [Uso](#usage-examples) · [Segurança](#security-posture) · [Documentação](#documentation)

---

<img src="assets/cover.png" alt="ClawKeeper agent control surface" width="100%" />

</div>

<br/>

## Referência da pesquisa

Em testes de benchmark contra referências de código aberto ([arXiv:2603.24414](https://arxiv.org/abs/2603.24414)), a arquitetura do ClawKeeper demonstrou mitigação superior de ameaças de agentes LLM autônomos em contextos de execução financeira. O modelo de ameaças tem como alvo injeção de prompt, vazamento de dados entre locatários e movimentação não autorizada de dinheiro — modos de falha que continuam sob pesquisa ativa e não são considerados resolvidos.

A segurança de agentes é contínua, não absoluta. Os resultados do benchmark refletem um ambiente de testes específico contra um conjunto específico de referências em determinado momento. Novos vetores de ataque contra agentes financeiros autônomos surgem regularmente. A arquitetura foi projetada para reduzir o raio de impacto do mau comportamento de agentes, não para eliminá-lo.

## Status das provas da v2.0

O ClawKeeper v2.0 é estruturado em torno de uma base de provas inspecionável:

- Portão de qualidade do backend: `npm run quality`
- Build de produção do dashboard: `cd dashboard && npm run build`
- Auditoria de dependências: `npm audit --audit-level=moderate`
- Benchmark FDE: `npm run fde:benchmark`
- Validação do pacote de provas: `npm run proof:v2:validate`
- Portão de build do Docker: `.github/workflows/ci.yml`

Consulte [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) para ver o pacote de provas da v2 e os comandos de verificação. O pacote de provas é determinístico, offline, sintético e anonimizado.

<br/>

<a id="agent-architecture"></a>

## Arquitetura dos agentes

O ClawKeeper modela um departamento financeiro como uma hierarquia de agentes em três camadas: um orquestrador CEO, nove líderes de domínio e 100 trabalhadores especializados. Todo agente herda de `BaseAgent`, que avalia o mecanismo de políticas OpenClaw antes da execução da tarefa. Nenhum agente interage com um fluxo de trabalho financeiro de alto risco sem passar por verificações determinísticas de políticas em código — não em prompts.

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

### Lógica do portão de aprovação

A camada de políticas é deliberadamente determinística. Ela não pergunta a um LLM se um pagamento, uma gravação de retorno ou uma ação entre locatários é segura.

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

Implementação da política: [`src/openclaw/policy.ts`](src/openclaw/policy.ts) · Adaptador de runtime: [`src/openclaw/runtime.ts`](src/openclaw/runtime.ts) · Aplicação no agente-base: [`src/agents/base.ts`](src/agents/base.ts)

<br/>

<a id="what-clawkeeper-does"></a>

## O que o ClawKeeper faz

| Domínio | Agentes | O que eles fazem |
|--------|-------:|-----------------|
| **Contas a pagar** | 15 | Análise de faturas, validação por OCR, conciliação de três vias (pedido de compra–fatura–recebimento), detecção de duplicatas, encaminhamento para aprovação, agendamento de pagamentos, gestão de fornecedores |
| **Contas a receber** | 15 | Faturamento de clientes, conciliação de pagamentos, acompanhamento de cobranças, tratamento de contestações, reconhecimento de receita, análise de vencimentos, geração de extratos |
| **Conciliação** | 12 | Importação de transações bancárias via Plaid, correspondência aproximada por data/valor/beneficiário, investigação de divergências, lançamentos de ajuste, tratamento de exceções |
| **Relatórios** | 12 | DRE, balanço patrimonial, demonstrações de fluxo de caixa, criação de relatórios personalizados, índices financeiros, geração de gráficos, entrega programada de relatórios |
| **Integração** | 12 | Feeds bancários do Plaid, pagamentos com Stripe, sincronização com QuickBooks, sincronização com Xero, gestão de fluxos OAuth, processamento de webhooks, circuit breakers |
| **Conformidade** | 10 | Verificações de conformidade tributária, preparação para auditorias, verificação da segregação de funções, detecção de fraudes, retenção de documentos, relatórios regulatórios |
| **Dados / ETL** | 10 | Importação de CSV/Excel/JSON, mapeamento de esquemas, validação de dados, desduplicação, enriquecimento, processamento em massa, suporte a migrações |
| **CFO / Estratégia** | 8 | Previsão de fluxo de caixa, gestão orçamentária, modelagem financeira, acompanhamento de KPIs, análise de variações, avaliação de riscos |
| **Suporte** | 6 | Central de atendimento, diagnóstico de erros, recuperação, gestão de escalonamentos, integração de novos usuários |

**Total: 110 agentes** (1 orquestrador CEO + 9 líderes de domínio + 100 trabalhadores especializados).

<br/>

<a id="what-clawkeeper-deliberately-does-not-do"></a>

## O que o ClawKeeper deliberadamente NÃO faz

Nomear os modos de falha é mais importante do que nomear os recursos.

| Limite | Por que existe |
|----------|--------------|
| **Nenhuma execução financeira autônoma sem aprovação humana** | O processamento de pagamentos, as gravações em sistemas contábeis, as declarações fiscais e as operações de alto risco exigem metadados explícitos de aprovação. O mecanismo de políticas negará a execução se a aprovação estiver ausente — mesmo que o agente tenha a capacidade técnica. Esta é a restrição arquitetural mais importante. |
| **Nenhum compartilhamento de dados entre locatários** | Os agentes têm escopo por locatário. O mecanismo de políticas nega qualquer solicitação em que o contexto de locatário do agente não corresponda ao recurso de destino. A aplicação de RLS no PostgreSQL oferece um segundo limite na camada de dados. |
| **Nenhuma decisão de segurança baseada em LLM** | O mecanismo de políticas é código TypeScript determinístico, não um prompt. A detecção de injeção de prompt, as verificações de capacidade e os portões de aprovação são avaliados em `src/openclaw/policy.ts` antes que qualquer LLM seja invocado. Isso não torna o sistema imune a injeções — reduz a superfície de ataque ao retirar o LLM do caminho das decisões de segurança. |
| **Nenhum registro de auditoria sem anonimização** | Dados pessoais identificáveis e segredos são removidos dos eventos de auditoria antes da persistência no banco de dados. Os registros de auditoria usam triggers somente de acréscimo do PostgreSQL — depois de gravados, não podem ser modificados nem excluídos pela camada da aplicação. |
| **Nenhum gasto ilimitado com LLM** | A configuração do cliente LLM sensível a custos e o recuo por limite de taxa evitam custos descontrolados de API durante execuções simultâneas de vários agentes. Isso mitiga, mas não elimina, o risco de custos em cenários de alto volume. |

<br/>

<a id="install"></a>

## Instalação

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### Variáveis de ambiente mínimas

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

### Iniciar os serviços

```bash
bun run setup:full          # schema, RLS, RBAC, seed data
bun run dev                 # Hono API server + agent control plane
bun run dashboard:dev       # React command center
```

### Validar

```bash
npm run quality             # typecheck + lint + test suite
```

## Verificar a v2 localmente

Use o fluxo de provas offline quando quiser executar uma verificação sem banco de dados:

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

Use o fluxo de demonstração apoiado por banco de dados quando o Docker estiver disponível:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

Os dados de demonstração são sintéticos. O fluxo de provas da v2 não chama Plaid, Stripe, QuickBooks, Xero nem meios de pagamento reais.

<br/>

<a id="usage-examples"></a>

## Exemplos de uso

### Avaliar uma decisão de política (simulação)

Verifique se uma ação proposta por um agente seria permitida, sujeita a aprovação ou negada — sem executar nada.

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

### Inspecionar o manifesto OpenClaw

```bash
curl http://localhost:4004/api/agents/openclaw/manifest \
  -H "Authorization: Bearer $TOKEN"

# Returns: full agent registry, capabilities, risk tiers, approval rules
```

### Enviar e processar uma fatura

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

## Postura de segurança

A segurança de agentes é uma prática contínua, não um recurso entregue. O modelo de ameaças do ClawKeeper concentra-se nas superfícies de ataque específicas de agentes financeiros autônomos: injeção de prompt, vazamento entre locatários, movimentação não autorizada de dinheiro e adulteração de auditorias.

| Proteção | Implementação | Limitação conhecida |
|-----------|---------------|-----------------|
| **Isolamento entre locatários** | Mecanismo de políticas + RLS do PostgreSQL | É possível contornar o RLS se o acesso a SQL bruto for concedido fora da camada da aplicação |
| **Portões de aprovação** | Verificações determinísticas de políticas em `src/openclaw/policy.ts` | Os metadados de aprovação são considerados confiáveis depois de fornecidos — a interface do fluxo de aprovação está no roadmap da v1.6 |
| **Negação de injeção de prompt** | Proteções baseadas em correspondência de padrões avaliadas antes da invocação do LLM | A detecção baseada em padrões não identifica novas técnicas de injeção; esta é uma área de pesquisa ativa |
| **Imutabilidade da auditoria** | Triggers somente de acréscimo do PostgreSQL; anonimização de dados pessoais identificáveis/segredos antes da gravação | O desvio no nível do banco de dados (SQL direto) pode contornar os triggers; mitigado por controles de acesso à rede |
| **Validação por OCR** | Conferência programática da soma dos itens de linha em relação aos totais declarados | Faturas adversariais projetadas para passar nas verificações de soma enquanto contêm itens de linha individuais incorretos são uma lacuna conhecida |
| **Resiliência a limites de taxa** | Novas tentativas com recuo exponencial em erros 429/transitórios | Existem limites de recuo, mas uma limitação de taxa prolongada durante picos de simultaneidade pode reduzir a vazão dos agentes |

Contexto da pesquisa: [arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · Modelo de segurança: [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) · Relatos de vulnerabilidades: [`SECURITY.md`](SECURITY.md)

<br/>

## Superfície da API

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

## Testes e portões de qualidade

A suíte de testes valida as partes do sistema que importam para uma versão de agentes financeiros: correção do manifesto, decisões de política, requisitos de aprovação, isolamento entre locatários, negação de injeção de prompt e anonimização de auditoria. Os testes de comportamento do dashboard são secundários.

```bash
npm run typecheck          # TypeScript strict mode
npm run lint               # ESLint
npm test                   # OpenClaw manifest + policy tests
npm run quality            # all three, sequential
npm run fde:benchmark      # deterministic finance-agent benchmark
npm run proof:v2:validate  # proof bundle validation
```

| Arquivo de teste | O que ele valida |
|-----------|------------------|
| `test/openclaw.manifest.test.ts` | Identidade da aplicação, registro de agentes, política de capacidades de alto risco, integridade do adaptador de runtime |
| `test/openclaw.policy.test.ts` | Relatórios autônomos, fluxos de pagamento com aprovação obrigatória, negação por isolamento entre locatários, negação por capacidade ausente, negação de injeção de prompt, anonimização de auditoria |

<br/>

<a id="documentation"></a>

## Estrutura do repositório

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

## Documentação

| Documento | Finalidade |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura do sistema e hierarquia dos agentes |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Limites dos agentes OpenClaw, portões de aprovação, proteções financeiras |
| [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) | Pacote de provas da v2 e comandos de verificação |
| [`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md) | Notas históricas da versão e evidências de validação |
| [`docs/API.md`](docs/API.md) | Referência da API |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Orientações de implantação |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) | Modelo de isolamento entre locatários e RBAC |
| [`AGENTS.md`](AGENTS.md) | Índice completo dos 110 agentes com hierarquia |
| [`SECURITY.md`](SECURITY.md) | Política de relato de vulnerabilidades |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Fluxo de trabalho para contribuições |
| [`CONTRIBUTORS.md`](CONTRIBUTORS.md) | Agradecimentos aos colaboradores |

<br/>

## Roadmap

| Versão | Direção | Risco em aberto |
|---------|-----------|-----------|
| **v2.1** | Bancada de aprovações — fila de aprovação humana, comentários de revisores, evidências imutáveis de aprovação no dashboard | Latência da experiência de aprovação para operações de contas a pagar em alto volume |
| **v2.2** | Reforço das integrações — testes de contrato para adaptadores do Plaid, Stripe, QuickBooks e Xero | Desvio dos esquemas de APIs de terceiros entre teste e produção |
| **v2.3** | Expansão do runtime — agendamento distribuído de agentes, sandbox de ferramentas, reprodução da execução | Fidelidade da reprodução quando o estado do sistema externo mudou |
| **v3.0** | Piloto automático financeiro — fluxos de trabalho de ponta a ponta que combinam aprovações, conciliação, relatórios e gravação de retorno | Taxas de erro acumuladas em cadeias de agentes com várias etapas |

<br/>

## Licença

MIT. Consulte [`LICENSE`](LICENSE).

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · Columbus, Ohio

Para implantação em produção, revisão de segurança ou suporte a integrações: [techtideai.io](https://techtideai.io/)

</div>
