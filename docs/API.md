# ClawKeeper API Reference

## Base URL

- Dev: `http://localhost:4004`
- Production: Configure via environment

## Authentication

All endpoints (except `/health` and `/api/auth/login`) require authentication.

**Authorization Header**:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### POST /api/auth/login

Authenticate user and receive JWT token.

**Request**:
```json
{
  "email": "admin@demo.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "admin@demo.com",
    "name": "Demo Admin",
    "role": "tenant_admin"
  },
  "token": "eyJhbGci..."
}
```

#### GET /api/auth/me

Get current authenticated user.

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "admin@demo.com",
    "name": "Demo Admin",
    "role": "tenant_admin"
  }
}
```

### Invoices

#### GET /api/invoices

List invoices for current tenant.

**Query Parameters**:
- `status` (optional): Filter by status
- `limit` (optional): Limit results (default: 50)

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "vendor_name": "Office Depot",
      "invoice_number": "INV-2024-001",
      "amount": 25000,
      "currency": "USD",
      "status": "pending_approval",
      "due_date": "2026-02-15T00:00:00Z",
      ...
    }
  ]
}
```

#### POST /api/invoices/upload

Upload invoice for processing.

**Request**: `multipart/form-data` with file

**Response**:
```json
{
  "message": "Invoice uploaded and processing started",
  "task_id": "uuid"
}
```

#### POST /api/invoices/:id/approve

Approve invoice for payment.

**Permissions**: tenant_admin, super_admin

**Response**:
```json
{
  "message": "Invoice approved",
  "invoice": { ... }
}
```

#### POST /api/invoices/:id/pay

Process payment for approved invoice.

**Permissions**: tenant_admin, super_admin

**Request**:
```json
{
  "payment_method": "stripe"
}
```

**Response**:
```json
{
  "message": "Payment processed",
  "invoice": { ... },
  "payment_method": "stripe"
}
```

### Reports

#### POST /api/reports/:type

Generate financial report.

**Path Parameters**:
- `type`: `profit_loss`, `balance_sheet`, `cash_flow`, `ap_aging`, `ar_aging`

**Request**:
```json
{
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-31T23:59:59Z"
}
```

**Response**:
```json
{
  "report": {
    "id": "uuid",
    "type": "profit_loss",
    "period": {
      "start_date": "2026-01-01",
      "end_date": "2026-01-31"
    },
    "data": {
      "revenue": 500000,
      "expenses": [...],
      "net_income": 340000
    },
    "generated_at": "2026-02-01T10:30:00Z"
  }
}
```

#### GET /api/reports

List recent reports.

**Query Parameters**:
- `limit` (optional): Limit results (default: 20)

### Reconciliation

#### POST /api/reconciliation/start

Start bank reconciliation task.

**Request**:
```json
{
  "account_id": "uuid",
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-31T23:59:59Z"
}
```

**Response**:
```json
{
  "message": "Reconciliation task created",
  "task_id": "uuid",
  "status": "pending"
}
```

#### GET /api/reconciliation/:id/status

Get reconciliation task status.

**Response**:
```json
{
  "task": {
    "id": "uuid",
    "account_id": "uuid",
    "period": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    },
    "status": "completed",
    "matched_count": 45,
    "unmatched_count": 2,
    "discrepancies": [...],
    "completed_at": "2026-02-01T11:00:00Z"
  }
}
```

### Accounts

#### GET /api/accounts

List all accounts for current tenant.

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Business Checking",
      "type": "checking",
      "institution": "Chase Bank",
      "balance": 5000000,
      "currency": "USD"
    }
  ]
}
```

#### GET /api/accounts/:id

Get single account details.

### Agents

#### GET /api/agents/status

Get all agent statuses.

**Response**:
```json
{
  "agents": [
    {
      "id": "clawkeeper",
      "name": "ClawKeeper",
      "status": "idle",
      "current_task": null
    }
  ],
  "total": 10,
  "active": 0,
  "idle": 10
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [...]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 30
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limits

- **Per Tenant**: 30 requests/minute, 500/hour
- **Global**: 60 requests/minute, 1000/hour
- **Burst**: 100 requests (then throttled)

## WebSocket

### WS /ws

Real-time updates (to be implemented).

**Events**:
- `invoice:created`
- `invoice:approved`
- `invoice:paid`
- `reconciliation:started`
- `reconciliation:completed`
- `report:generated`

---

For examples and integration guides, see the dashboard source code.
