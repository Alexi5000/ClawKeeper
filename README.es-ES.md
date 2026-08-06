<div align="center">

[English](README.md) | **Español** | [简体中文](README.zh-CN.md) | [Português](README.pt-BR.md) | [العربية](README.ar.md) | [Français](README.fr.md) | [Русский](README.ru.md)

<img src="assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**Plano de control auditable de agentes financieros para pymes.**<br/>
Los agentes pueden proponer tareas financieras; las políticas deterministas, los límites entre inquilinos, las puertas de aprobación y los registros de evidencias deciden qué puede ejecutarse.

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/release-v2.0.1-16a34a?style=flat-square)](RELEASE_NOTES.md)
[![CI](https://img.shields.io/badge/CI-backend%20%7C%20dashboard%20%7C%20audit%20%7C%20docker%20%7C%20FDE-16a34a?style=flat-square)](.github/workflows/ci.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Proof](https://img.shields.io/badge/proof-v2.0%20bundle-16a34a?style=flat-square)](docs/proof/v2.0/README.md)

[Arquitectura](#agent-architecture) · [Qué hace](#what-clawkeeper-does) · [Qué no hace](#what-clawkeeper-deliberately-does-not-do) · [Instalación](#install) · [Uso](#usage-examples) · [Seguridad](#security-posture) · [Documentación](#documentation)

---

<img src="assets/cover.png" alt="Superficie de control de agentes de ClawKeeper" width="100%" />

</div>

<br/>

## Referencia de investigación

En pruebas comparativas frente a soluciones de referencia de código abierto ([arXiv:2603.24414](https://arxiv.org/abs/2603.24414)), la arquitectura de ClawKeeper demostró una mitigación superior de las amenazas de agentes LLM autónomos en contextos de ejecución financiera. El modelo de amenazas se centra en la inyección de instrucciones, la filtración de datos entre inquilinos y el movimiento de dinero no autorizado, modos de fallo que siguen siendo objeto de investigación activa y no se consideran resueltos.

La seguridad de los agentes es continua, no absoluta. Los resultados de las pruebas comparativas reflejan un conjunto de pruebas específico frente a un conjunto concreto de soluciones de referencia en un momento determinado. Surgen con regularidad nuevos vectores de ataque contra agentes financieros autónomos. La arquitectura está diseñada para reducir el radio de impacto del comportamiento indebido de los agentes, no para eliminarlo.

## Estado de las pruebas de v2.0

ClawKeeper v2.0 se distribuye en torno a una estructura de pruebas inspeccionable:

- Control de calidad del backend: `npm run quality`
- Compilación de producción del panel: `cd dashboard && npm run build`
- Auditoría de dependencias: `npm audit --audit-level=moderate`
- Prueba comparativa FDE: `npm run fde:benchmark`
- Validación del paquete de pruebas: `npm run proof:v2:validate`
- Control de compilación de Docker: `.github/workflows/ci.yml`

Consulte [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) para ver el paquete de pruebas de v2 y los comandos de verificación. El paquete de pruebas es determinista, funciona sin conexión, es sintético y está censurado.

<br/>

<a id="agent-architecture"></a>

## Arquitectura de agentes

ClawKeeper modela un departamento financiero como una jerarquía de agentes de tres niveles: un orquestador CEO, nueve responsables de dominio y 100 trabajadores especializados. Todos los agentes heredan de `BaseAgent`, que evalúa el motor de políticas OpenClaw antes de ejecutar una tarea. Ningún agente interviene en un flujo de trabajo financiero de alto riesgo sin superar comprobaciones deterministas de políticas en el código, no en las instrucciones.

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

### Lógica de la puerta de aprobación

La capa de políticas es deliberadamente determinista. No pregunta a un LLM si un pago, una escritura o una acción que atraviesa inquilinos es segura.

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

Implementación de políticas: [`src/openclaw/policy.ts`](src/openclaw/policy.ts) · Adaptador de ejecución: [`src/openclaw/runtime.ts`](src/openclaw/runtime.ts) · Aplicación en el agente base: [`src/agents/base.ts`](src/agents/base.ts)

<br/>

<a id="what-clawkeeper-does"></a>

## Qué hace ClawKeeper

| Dominio | Agentes | De qué se ocupan |
|--------|-------:|-----------------|
| **Cuentas a pagar** | 15 | Análisis de facturas, validación OCR, conciliación a tres bandas (pedido-factura-recepción), detección de duplicados, enrutamiento de aprobaciones, programación de pagos, gestión de proveedores |
| **Cuentas a cobrar** | 15 | Facturación a clientes, conciliación de pagos, seguimiento de cobros, gestión de disputas, reconocimiento de ingresos, análisis de antigüedad, generación de extractos |
| **Conciliación** | 12 | Importación de transacciones bancarias mediante Plaid, conciliación aproximada por fecha/importe/beneficiario, investigación de discrepancias, asientos de ajuste, gestión de excepciones |
| **Informes** | 12 | Pérdidas y ganancias, balance, estados de flujos de efectivo, creación de informes personalizados, ratios financieros, generación de gráficos, entrega programada de informes |
| **Integración** | 12 | Fuentes bancarias de Plaid, pagos de Stripe, sincronización con QuickBooks, sincronización con Xero, gestión de flujos OAuth, procesamiento de webhooks, disyuntores |
| **Cumplimiento** | 10 | Comprobaciones de cumplimiento fiscal, preparación de auditorías, verificación de la segregación de funciones, detección de fraude, conservación de documentos, informes normativos |
| **Datos / ETL** | 10 | Importación de CSV/Excel/JSON, asignación de esquemas, validación de datos, deduplicación, enriquecimiento, procesamiento masivo, asistencia para migraciones |
| **CFO / Estrategia** | 8 | Previsión de flujos de efectivo, gestión presupuestaria, modelización financiera, seguimiento de KPI, análisis de desviaciones, evaluación de riesgos |
| **Soporte** | 6 | Servicio de asistencia, diagnóstico de errores, recuperación, gestión de escalados, incorporación |

**Total: 110 agentes** (1 orquestador CEO + 9 responsables de dominio + 100 trabajadores especializados).

<br/>

<a id="what-clawkeeper-deliberately-does-not-do"></a>

## Qué NO hace ClawKeeper deliberadamente

Nombrar los modos de fallo importa más que nombrar las funciones.

| Límite | Por qué existe |
|----------|--------------|
| **No ejecuta operaciones financieras autónomas sin aprobación humana** | El procesamiento de pagos, las escrituras en sistemas contables, las declaraciones fiscales y las operaciones de alto riesgo requieren metadatos de aprobación explícitos. El motor de políticas denegará la ejecución si falta la aprobación, incluso si el agente dispone de la capacidad técnica. Esta es la restricción arquitectónica más importante. |
| **No comparte datos entre inquilinos** | Los agentes están restringidos a un inquilino. El motor de políticas deniega cualquier solicitud en la que el contexto de inquilino del agente no coincida con el recurso de destino. La aplicación de RLS en PostgreSQL proporciona un segundo límite en la capa de datos. |
| **No toma decisiones de seguridad basadas en LLM** | El motor de políticas es código TypeScript determinista, no una instrucción. La detección de inyección de instrucciones, las comprobaciones de capacidades y las puertas de aprobación se evalúan en `src/openclaw/policy.ts` antes de invocar cualquier LLM. Esto no hace que el sistema sea inmune a las inyecciones: reduce la superficie de ataque al retirar el LLM de la ruta de decisión de seguridad. |
| **No registra auditorías sin censurar** | Los datos personales y los secretos se censuran en los eventos de auditoría antes de almacenarlos en la base de datos. Los registros de auditoría utilizan desencadenadores de solo adición de PostgreSQL: una vez escritos, no pueden modificarse ni eliminarse desde la capa de aplicación. |
| **No permite un gasto ilimitado en LLM** | La configuración del cliente LLM sensible a los costes y el retroceso ante límites de frecuencia evitan costes descontrolados de API durante ejecuciones multiagente concurrentes. Esto mitiga el riesgo de costes en escenarios de gran volumen, pero no lo elimina. |

<br/>

<a id="install"></a>

## Instalación

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### Variables de entorno mínimas

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

### Iniciar los servicios

```bash
bun run setup:full          # schema, RLS, RBAC, seed data
bun run dev                 # Hono API server + agent control plane
bun run dashboard:dev       # React command center
```

### Validar

```bash
npm run quality             # typecheck + lint + test suite
```

## Verificar v2 localmente

Utilice la ruta de pruebas sin conexión cuando quiera realizar una verificación sin base de datos:

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

Utilice la ruta de demostración respaldada por base de datos cuando Docker esté disponible:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

Los datos de demostración son sintéticos. La ruta de pruebas de v2 no llama a Plaid, Stripe, QuickBooks, Xero ni a redes de pago reales.

<br/>

<a id="usage-examples"></a>

## Ejemplos de uso

### Evaluar una decisión de política (simulación)

Compruebe si una acción propuesta por un agente estaría permitida, sujeta a aprobación o denegada, sin ejecutar nada.

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

### Inspeccionar el manifiesto de OpenClaw

```bash
curl http://localhost:4004/api/agents/openclaw/manifest \
  -H "Authorization: Bearer $TOKEN"

# Returns: full agent registry, capabilities, risk tiers, approval rules
```

### Cargar y procesar una factura

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

## Postura de seguridad

La seguridad de los agentes es una práctica continua, no una función terminada. El modelo de amenazas de ClawKeeper se centra en las superficies de ataque específicas de los agentes financieros autónomos: inyección de instrucciones, filtraciones entre inquilinos, movimientos de dinero no autorizados y manipulación de auditorías.

| Mecanismo de protección | Implementación | Limitación conocida |
|-----------|---------------|-----------------|
| **Aislamiento de inquilinos** | Motor de políticas + RLS de PostgreSQL | Es posible eludir RLS si se concede acceso SQL sin procesar fuera de la capa de aplicación |
| **Puertas de aprobación** | Comprobaciones deterministas de políticas en `src/openclaw/policy.ts` | Los metadatos de aprobación se consideran fiables una vez proporcionados; la interfaz de usuario del flujo de aprobación está prevista para v1.6 |
| **Denegación de inyección de instrucciones** | Mecanismos de protección por coincidencia de patrones evaluados antes de invocar el LLM | La detección basada en patrones no identifica técnicas de inyección nuevas; se trata de un área de investigación activa |
| **Inmutabilidad de auditoría** | Desencadenadores de solo adición de PostgreSQL; censura de datos personales/secretos antes de escribir | Una elusión en el nivel de base de datos (SQL directo) puede sortear los desencadenadores; se mitiga mediante controles de acceso a la red |
| **Validación OCR** | Comprobación programática de la suma de las partidas frente a los totales declarados | Las facturas maliciosas diseñadas para superar las comprobaciones de suma pero que contienen partidas individuales incorrectas constituyen una deficiencia conocida |
| **Resiliencia ante límites de frecuencia** | Reintentos con retroceso exponencial ante errores 429/transitorios | Existen límites de retroceso, pero una limitación de frecuencia sostenida durante picos de concurrencia puede reducir el rendimiento de los agentes |

Contexto de investigación: [arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · Modelo de seguridad: [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) · Informes de vulnerabilidades: [`SECURITY.md`](SECURITY.md)

<br/>

## Superficie de la API

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

## Pruebas y controles de calidad

El conjunto de pruebas valida las partes del sistema que importan para una versión de agentes financieros: la corrección del manifiesto, las decisiones de políticas, los requisitos de aprobación, el aislamiento de inquilinos, la denegación de inyecciones de instrucciones y la censura de auditorías. Las pruebas de comportamiento del panel son secundarias.

```bash
npm run typecheck          # TypeScript strict mode
npm run lint               # ESLint
npm test                   # OpenClaw manifest + policy tests
npm run quality            # all three, sequential
npm run fde:benchmark      # deterministic finance-agent benchmark
npm run proof:v2:validate  # proof bundle validation
```

| Archivo de prueba | Qué valida |
|-----------|------------------|
| `test/openclaw.manifest.test.ts` | Identidad de la aplicación, registro de agentes, política de capacidades de alto riesgo, estado del adaptador de ejecución |
| `test/openclaw.policy.test.ts` | Informes autónomos, flujos de pagos sujetos a aprobación, denegación por aislamiento de inquilinos, denegación por falta de capacidad, denegación de inyección de instrucciones, censura de auditorías |

<br/>

<a id="documentation"></a>

## Estructura del repositorio

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

## Documentación

| Documento | Finalidad |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura del sistema y jerarquía de agentes |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Límite de agentes de OpenClaw, puertas de aprobación, mecanismos de protección financieros |
| [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) | Paquete de pruebas de v2 y comandos de verificación |
| [`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md) | Notas históricas de la versión y evidencias de validación |
| [`docs/API.md`](docs/API.md) | Referencia de la API |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Orientación para el despliegue |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) | Modelo de aislamiento de inquilinos y RBAC |
| [`AGENTS.md`](AGENTS.md) | Índice completo de los 110 agentes con su jerarquía |
| [`SECURITY.md`](SECURITY.md) | Política de notificación de vulnerabilidades |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Flujo de trabajo para contribuciones |
| [`CONTRIBUTORS.md`](CONTRIBUTORS.md) | Reconocimientos a las personas colaboradoras |

<br/>

## Hoja de ruta

| Versión | Dirección | Riesgo pendiente |
|---------|-----------|-----------|
| **v2.1** | Banco de trabajo de aprobaciones: cola de aprobación humana, comentarios de revisores, evidencias de aprobación inmutables en el panel | Latencia de la experiencia de aprobación para operaciones de cuentas a pagar de gran volumen |
| **v2.2** | Refuerzo de integraciones: pruebas de contrato para los adaptadores de Plaid, Stripe, QuickBooks y Xero | Deriva de los esquemas de API de terceros entre las pruebas y la producción |
| **v2.3** | Ampliación de la ejecución: programación distribuida de agentes, aislamiento de herramientas, reproducción de ejecuciones | Fidelidad de la reproducción cuando ha cambiado el estado del sistema externo |
| **v3.0** | Piloto automático financiero: flujos de trabajo integrales que combinan aprobaciones, conciliación, informes y escritura | Tasas de error acumuladas en cadenas de agentes de varios pasos |

<br/>

## Licencia

MIT. Consulte [`LICENSE`](LICENSE).

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · Columbus, Ohio

Para despliegues en producción, revisiones de seguridad o asistencia con integraciones: [techtideai.io](https://techtideai.io/)

</div>
