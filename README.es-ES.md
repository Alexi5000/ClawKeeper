

<div align="center">

<img src="assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**Plano de control de agentes financieros para PYMEs con auditoría integrada.**<br/>
Los agentes pueden proponer tareas financieras; las políticas deterministas, los límites de inquilino, las puertas de aprobación y los registros de evidencia deciden qué se puede ejecutar.

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/release-v2.0.0-16a34a?style=flat-square)](RELEASE_NOTES.md)
[![CI](https://img.shields.io/badge/CI-backend%20%7C%20dashboard%20%7C%20audit%20%7C%20docker%20%7C%20FDE-16a34a?style=flat-square)](.github/workflows/ci.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Proof](https://img.shields.io/badge/proof-v2.0%20bundle-16a34a?style=flat-square)](docs/proof/v2.0/README.md)

[Arquitectura](#agent-architecture) · [Qué Hace](#what-clawkeeper-does) · [Qué NO Hace](#what-clawkeeper-deliberately-does-not-do) · [Instalación](#install) · [Uso](#usage-examples) · [Seguridad](#security-posture) · [Documentación](#documentation)

---

<img src="assets/cover.png" alt="ClawKeeper agent control surface" width="100%" />

</div>

<br/>

## Referencia de investigación

En pruebas comparativas frente a líneas base de código abierto ([arXiv:2603.24414](https://arxiv.org/abs/2603.24414)), la arquitectura de ClawKeeper demostró una mitigación superior de las amenazas de agentes LLM autónomos en contextos de ejecución financiera. El modelo de amenazas se centra en la inyección de prompts, filtración de datos entre inquilinos y movimiento no autorizado de fondos; modos de fallo que siguen en investigación activa y que no se consideran resueltos.

La seguridad de los agentes es continua, no absoluta. Los resultados de las pruebas comparativas reflejan un entorno de pruebas específico frente a un conjunto determinado de líneas base en un momento dado. Los nuevos vectores de ataque contra agentes financieros autónomos surgen regularmente. La arquitectura está diseñada para reducir el radio de impacto del comportamiento incorrecto de los agentes, no para eliminarlo.

## Estado de la prueba v2.0

ClawKeeper v2.0 se empaqueta alrededor de una columna vertebral de pruebas inspeccionable:

- Control de calidad del backend: `npm run quality`
- Compilación de producción del dashboard: `cd dashboard && npm run build`
- Auditoría de dependencias: `npm audit --audit-level=moderate`
- Benchmark FDE: `npm run fde:benchmark`
- Validación del paquete de pruebas: `npm run proof:v2:validate`
- Control de compilación Docker: `.github/workflows/ci.yml`

Consulte [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) para el paquete de pruebas v2 y los comandos de verificación. El paquete de pruebas es determinista, offline, sintético y con datos anonimizados.

<br/>

## Arquitectura de agentes

ClawKeeper modela un departamento financiero como una jerarquía de agentes de tres capas: un orquestador CEO, nueve líderes de dominio y 100 trabajadores especializados. Cada agente hereda de `BaseAgent`, que evalúa el motor de políticas OpenClaw antes de la ejecución de tareas. Ningún agente toca un flujo de trabajo financiero de alto riesgo sin pasar por comprobaciones de políticas deterministas en el código, no en los prompts.

```text
                          ClawKeeper CEO
                     (orquestador de nivel superior)
                               |
            ┌──────────────────┼──────────────────┐
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     |   Líder CFO |    |  Líder CP |    |   Líder CC    |
     |  (8 trabajadores)|    |(15 trabajadores)|   | (15 trabajadores)  |
     └─────────────┘    └───────────┘    └───────────────┘
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     | Líder Concil.|    |Cumplimiento|    | Informes      |
     |(12 trabajadores)|    |   Líder   |    |    Líder      |
     |             |    |(10 trabajadores)|   | (12 trabajadores)  |
     └─────────────┘    └───────────┘    └───────────────┘
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     |Integración  |    | Datos/ETL |    |  Soporte      |
     |   Líder     |    |   Líder   |    |    Líder      |
     |(12 trabajadores)|    |(10 trabajadores)|   |  (6 trabajadores)  |
     └─────────────┘    └───────────┘    └───────────────┘

                    ── PUERTA DE APROBACIÓN ──
     Cada acción de alto riesgo (pago, asiento contable, declaración fiscal,
     operación entre inquilinos) requiere metadatos de aprobación antes
     de que el motor de políticas permita la ejecución. La puerta es
     código determinista en src/openclaw/policy.ts, no una decisión de LLM.
```

### Lógica de la puerta de aprobación

La capa de políticas es deliberadamente determinista. No le pregunta a un LLM si un pago, un asiento contable o una acción entre inquilinos es segura.

```text
El agente solicita ejecutar una tarea
        │
        ▼
┌─────────────────────┐     ┌─────────────────┐
│ Comprobación de     │──X──│ DENEGADO:       │
│ aislamiento          │     │ contexto de inquilino incorrecto │
└────────┬────────────┘     └─────────────────┘
         │ pasa
         ▼
┌─────────────────────┐     ┌─────────────────┐
│ Comprobación de     │──X──│ DENEGADO:       │
│ capacidad            │     │ capacidad faltante  │
│ (rol + permisos)     │     │                     │
└────────┬────────────┘     └─────────────────┘
         │ pasa
         ▼
┌─────────────────────┐     ┌─────────────────┐
│ Escaneo de seguridad│──X──│ DENEGADO:       │
│ del prompt           │     │ intento de inyección detectado │
│ (inyección, bypass)  │     │                     │
└────────┬────────────┘     └─────────────────┘
         │ pasa
         ▼
┌─────────────────────┐     ┌──────────────────┐
│ Nivel de riesgo +   │──?──│ PUERTA: se       │
│ comprobación de     │     │ requiere metadatos│
│ umbral de monto      │     │ de aprobación     │
└────────┬────────────┘     └──────────────────┘
         │ aprobado o bajo riesgo
         ▼
┌─────────────────────┐
│ EJECUTAR + emitir    │
│ evento de auditoría  │
│ con datos anonimizados│
└─────────────────────┘
```

Implementación de políticas: [`src/openclaw/policy.ts`](src/openclaw/policy.ts) · Adaptador de ejecución: [`src/openclaw/runtime.ts`](src/openclaw/runtime.ts) · Ejecución base del agente: [`src/agents/base.ts`](src/agents/base.ts)

<br/>

## Qué hace ClawKeeper

| Dominio | Agentes | Qué gestionan |
|--------|-------:|-----------------|
| **Cuentas por Pagar** | 15 | Análisis de facturas, validación OCR, conciliación triple (PO-factura-recibo), detección de duplicados, enrutamiento de aprobaciones, programación de pagos, gestión de proveedores |
| **Cuentas por Cobrar** | 15 | Facturación a clientes, conciliación de pagos, seguimiento de cobros, manejo de disputas, reconocimiento de ingresos, análisis de antigüedad, generación de estados |
| **Conciliación** | 12 | Importación de transacciones bancarias vía Plaid, coincidencia difusa por fecha/monto/destinatario, investigación de discrepancias, asientos de ajuste, manejo de excepciones |
| **Informes** | 12 | Estados de resultados, balance general, estados de flujo de caja, construcción de informes personalizados, ratios financieros, generación de gráficos, entrega programada de informes |
| **Integración** | 12 | Flujos bancarios Plaid, pagos Stripe, sincronización QuickBooks, sincronización Xero, gestión de flujo OAuth, procesamiento de webhooks, circuit breakers |
| **Cumplimiento** | 10 | Verificaciones de cumplimiento fiscal, preparación de auditorías, verificación de segregación de funciones, detección de fraudes, retención de documentos, informes regulatorios |
| **Datos / ETL** | 10 | Importación CSV/Excel/JSON, mapeo de esquemas, validación de datos, eliminación de duplicados, enriquecimiento, procesamiento por lotes, soporte para migraciones |
| **CFO / Estrategia** | 8 | Pronóstico de flujo de caja, gestión presupuestaria, modelado financiero, seguimiento de KPIs, análisis de variaciones, evaluación de riesgos |
| **Soporte** | 6 | Mesa de ayuda, diagnóstico de errores, recuperación, gestión de escalaciones, incorporación |

**Total: 110 agentes** (1 orquestador CEO + 9 líderes de dominio + 100 trabajadores especializados).

<br/>

## Qué NO hace ClawKeeper deliberadamente

Nombrar los modos de fallo es más importante que enumerar las características.

| Límite | Por qué existe |
|----------|--------------|
| **Sin ejecución financiera autónoma sin aprobación humana** | El procesamiento de pagos, escrituras en sistemas contables, declaraciones fiscales y operaciones de alto riesgo requieren metadatos de aprobación explícitos. El motor de políticas denegará la ejecución si falta la aprobación, incluso si el agente tiene la capacidad técnica. Esta es la restricción arquitectónica más importante. |
| **Sin intercambio de datos entre inquilinos** | Los agentes tienen alcance a nivel de inquilino. El motor de políticas deniega cualquier solicitud donde el contexto de inquilino del agente no coincida con el recurso objetivo. La ejecución RLS en PostgreSQL proporciona una segunda frontera a nivel de datos. |
| **Sin decisiones de seguridad basadas en LLM** | El motor de políticas es código TypeScript determinista, no un prompt. La detección de inyección de prompts, las comprobaciones de capacidad y las puertas de aprobación se evalúan en `src/openclaw/policy.ts` antes de invocar cualquier LLM. Esto no hace que el sistema sea inmune a inyecciones, sino que reduce la superficie de ataque al eliminar al LLM de la ruta de decisión de seguridad. |
| **Sin registro de auditoría sin anonimizar** | Los datos PII y secretos se anonimizan de los eventos de auditoría antes de la persistencia en la base de datos. Los registros de auditoría usan triggers de solo append en PostgreSQL; una vez escritos, no pueden modificarse ni eliminarse a través de la capa de aplicación. |
| **Sin gasto ilimitado en LLM** | La configuración del cliente LLM sensible a costos y el reintento con límite de tasa previenen costos descontrolados de API durante ejecuciones concurrentes multi-agente. Esto mitiga, pero no elimina, el riesgo de costos en escenarios de alto volumen. |

<br/>

## Instalación

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### Variables de entorno mínimas

```bash
# Requeridas
DATABASE_URL=postgresql://clawkeeper:password@localhost:5432/clawkeeper
JWT_SECRET=<random-string-minimum-32-chars>
OPENAI_API_KEY=<your-key>        # or ANTHROPIC_API_KEY

# Integraciones opcionales
PLAID_CLIENT_ID=                 # bank feeds
STRIPE_API_KEY=                  # payment processing
QUICKBOOKS_CLIENT_ID=            # accounting sync
XERO_CLIENT_ID=                  # accounting sync
```

### Iniciar servicios

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

Use el camino de pruebas offline cuando desee una ejecución de verificación sin base de datos:

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

Use el camino de demostración con base de datos cuando Docker esté disponible:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

Los datos de demostración son sintéticos. El camino de prueba v2 no llama a Plaid, Stripe, QuickBooks, Xero ni a pasarelas de pago en vivo.

<br/>

## Ejemplos de uso

### Evaluar una decisión de política (ejecución en seco)

Compruebe si una acción propuesta por un agente sería permitida, requeriría aprobación o sería denegada, sin ejecutar nada.

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

### Subir y procesar una factura

```bash
curl -X POST http://localhost:4004/api/invoices/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@invoice.pdf"

# Dispara: extracción OCR → validación de partidas → comprobación de duplicados
#           → categorización de gastos → enrutamiento de aprobación
# Modo de fallo: la valla de coincidencia de sumas OCR rechazará la factura
# si los totales de las partidas no coinciden con el total declarado.
```

<br/>

## Postura de seguridad

La seguridad de los agentes es una práctica continua, no una función entregada. El modelo de amenazas de ClawKeeper se centra en las superficies de ataque específicas de los agentes financieros autónomos: inyección de prompts, filtración entre inquilinos, movimiento no autorizado de fondos y manipulación de auditorías.

| Valla | Implementación | Limitación conocida |
|-----------|---------------|-----------------|
| **Aislamiento de inquilino** | Motor de políticas + RLS de PostgreSQL | El bypass de RLS es posible si se concede acceso a SQL crudo fuera de la capa de aplicación |
| **Puertas de aprobación** | Comprobaciones de políticas deterministas en `src/openclaw/policy.ts` | Los metadatos de aprobación se confían una vez proporcionados; la UI del flujo de aprobación está en la hoja de ruta v1.6 |
| **Denegación de inyección de prompt** | Vallas de coincidencia de patrones evaluadas antes de la invocación del LLM | La detección basada en patrones no captura técnicas de inyección novedosas; esto es un área de investigación activa |
| **Inmutabilidad de auditoría** | Triggers de solo append en PostgreSQL; anonimización de PII/secretos antes de escribir | El bypass a nivel de base de datos (SQL directo) puede eludir los triggers; mitigado por controles de acceso a red |
| **Validación OCR** | Coincidencia programática de sumas de partidas frente a totales declarados | Las facturas adversarias diseñadas para pasar las comprobaciones de sumas mientras contienen partidas individuales incorrectas son una brecha conocida |
| **Resiliencia al límite de tasa** | Reintento con backoff exponencial en errores 429/transitorios | Existen límites de backoff, pero la limitación de tasa sostenida durante la concurrencia pico puede degradar el rendimiento de los agentes |

Contexto de investigación: [arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · Modelo de seguridad: [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) · Informes de vulnerabilidades: [`SECURITY.md`](SECURITY.md)

<br/>

## Superficie de la API

```text
GET  /health                                 # estado de actividad
POST /api/auth/login                         # autenticación JWT
POST /api/auth/register                      # registro de inquilino
GET  /api/agents                             # registro de agentes
GET  /api/agents/openclaw/manifest           # inspección del manifiesto OpenClaw
POST /api/agents/openclaw/policy/evaluate    # evaluación de política en seco
GET  /api/invoices                           # lista de facturas
POST /api/invoices/upload                    # procesamiento de facturas OCR
POST /api/reconciliation/start              # conciliación bancaria
GET  /api/reports/:type                      # informes financieros
WS   /ws                                     # eventos de agentes en tiempo real
```

<br/>

## Pruebas y controles de calidad

El conjunto de pruebas valida las partes del sistema que importan para un lanzamiento de agente financiero: corrección del manifiesto, decisiones de política, requisitos de aprobación, aislamiento de inquilino, denegación de inyección de prompts y anonimización de auditoría. Las pruebas de comportamiento del dashboard son secundarias.

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
| `test/openclaw.manifest.test.ts` | Identidad de la app, registro de agentes, política de capacidades de alto riesgo, salud del adaptador de ejecución |
| `test/openclaw.policy.test.ts` | Informes autónomos, flujos de pago que requieren aprobación, denegación de aislamiento de inquilino, denegación de capacidad faltante, denegación de inyección de prompt, anonimización de auditoría |

<br/>

## Estructura del repositorio

```text
ClawKeeper/
├── src/
│   ├── agents/          # CEO, orquestador, trabajador, ejecución BaseAgent
│   ├── api/             # Servidor Hono, rutas de finanzas y plano de control
│   ├── core/            # Tipos, cliente LLM, observabilidad, programación
│   ├── guardrails/      # Validación, detección PII, comprobaciones de inyección
│   ├── integrations/    # Plaid, Stripe, QuickBooks, Xero, Document AI
│   ├── memory/          # Primitivas de memoria y contexto de agente
│   └── openclaw/        # Manifiesto, motor de políticas, adaptador de ejecución
├── agents/              # 110 definiciones AGENT.md (CEO + líderes + trabajadores)
├── test/                # Pruebas de manifiesto y política OpenClaw
├── dashboard/           # Centro de comandos React/Vite/Tailwind
├── db/                  # Esquema PostgreSQL, RLS, RBAC, datos iniciales
├── docs/                # Arquitectura, modelo de seguridad, API, despliegue
└── skills/              # Definiciones de habilidades financieras
```

<br/>

## Documentación

| Documento | Propósito |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura del sistema y jerarquía de agentes |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Límite de agente OpenClaw, puertas de aprobación, vallas financieras |
| [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) | Paquete de pruebas v2 y comandos de verificación |
| [`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md) | Notas de lanzamiento históricas y evidencia de validación |
| [`docs/API.md`](docs/API.md) | Referencia de API |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Guía de despliegue |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) | Aislamiento de inquilinos y modelo RBAC |
| [`AGENTS.md`](AGENTS.md) | Índice completo de 110 agentes con jerarquía |
| [`SECURITY.md`](SECURITY.md) | Política de informes de vulnerabilidades |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Flujo de contribución |

<br/>

## Hoja de ruta

| Versión | Dirección | Riesgo abierto |
|---------|-----------|-----------|
| **v2.1** | Banco de trabajo de aprobaciones: cola de aprobación humana, comentarios de revisores, evidencia de aprobación inmutable en el dashboard | Latencia de UX de aprobación para operaciones de CP de alto volumen |
| **v2.2** | Endurecimiento de integración: pruebas de contrato para adaptadores Plaid, Stripe, QuickBooks, Xero | Deriva de esquemas de API de terceros entre pruebas y producción |
| **v2.3** | Expansión de ejecución: programación distribuida de agentes, sandboxing de herramientas, reproducción de ejecución | Fidelidad de reproducción cuando el estado del sistema externo ha cambiado |
| **v3.0** | Piloto automático financiero: flujos de trabajo de extremo a extremo que combinan aprobaciones, conciliación, informes y asientos | Tasas de error compuestas en cadenas multi-paso de agentes |

<br/>

## Licencia

MIT. Consulte [`LICENSE`](LICENSE).

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · Columbus, Ohio

Para implementación en producción, revisión de seguridad o soporte de integración: [techtideai.io](https://techtideai.io/)

</div>
