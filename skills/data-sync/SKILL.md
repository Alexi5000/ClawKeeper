---
name: data-sync
description: "Synchronize data with external accounting systems (QuickBooks, Xero) and bank feeds (Plaid). Use when importing/exporting financial data, syncing to accounting software, or updating from bank feeds. Handles bi-directional sync with conflict resolution."
---

# Data Sync Skill

## Purpose

Synchronizes financial data between ClawKeeper and external systems (QuickBooks, Xero, Plaid) with proper data mapping, conflict resolution, and error handling.

## Triggers

- Scheduled sync (daily, hourly)
- Manual sync requested
- New data available in external system
- Webhook received from external system

## Capabilities

1. **QuickBooks Sync** - Bi-directional sync with QuickBooks
2. **Xero Sync** - Bi-directional sync with Xero
3. **Plaid Bank Sync** - Import bank transactions
4. **Data Mapping** - Map external to internal schemas
5. **Conflict Resolution** - Handle data conflicts
6. **Incremental Sync** - Sync only changes since last run

## Instructions

### QuickBooks Sync

#### Export to QuickBooks

```typescript
// Map ClawKeeper invoice to QuickBooks invoice
function map_to_quickbooks(invoice: Invoice): QBInvoice {
  return {
    CustomerRef: { value: invoice.customer_id },
    TxnDate: invoice.invoice_date,
    DueDate: invoice.due_date,
    Line: invoice.line_items.map(item => ({
      Amount: cents_to_dollars(item.amount),
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: { value: item.product_id },
        Qty: item.quantity,
        UnitPrice: cents_to_dollars(item.unit_price),
      },
    })),
    TotalAmt: cents_to_dollars(invoice.amount),
  };
}

// Send to QuickBooks
const qb_invoice = await quickbooks.createInvoice(qb_data);

// Store mapping
await store_sync_mapping({
  clawkeeper_id: invoice.id,
  external_system: 'quickbooks',
  external_id: qb_invoice.Id,
  entity_type: 'invoice',
});
```

#### Import from QuickBooks

```typescript
// Fetch invoices modified since last sync
const last_sync = await get_last_sync_time('quickbooks');
const qb_invoices = await quickbooks.query({
  where: `MetaData.LastUpdatedTime > '${last_sync}'`,
  type: 'Invoice',
});

// Map to ClawKeeper format
for (const qb_inv of qb_invoices) {
  const invoice = map_from_quickbooks(qb_inv);
  
  // Check if already exists
  const mapping = await get_sync_mapping('quickbooks', qb_inv.Id);
  
  if (mapping) {
    // Update existing
    await update_invoice(mapping.clawkeeper_id, invoice);
  } else {
    // Create new
    const created = await create_invoice(invoice);
    await store_sync_mapping({
      clawkeeper_id: created.id,
      external_system: 'quickbooks',
      external_id: qb_inv.Id,
      entity_type: 'invoice',
    });
  }
}
```

### Xero Sync

Similar pattern to QuickBooks:
1. Authenticate via OAuth2
2. Map data models
3. Sync invoices, transactions, accounts
4. Store mappings for incremental updates

### Plaid Bank Sync

```typescript
// Fetch transactions
const plaid_client = new PlaidApi(config);

const transactions = await plaid_client.transactionsGet({
  access_token: tenant.plaid_access_token,
  start_date: '2026-01-01',
  end_date: '2026-01-31',
});

// Import to ClawKeeper
for (const txn of transactions.transactions) {
  // Check if already imported
  const existing = await find_transaction_by_plaid_id(txn.transaction_id);
  
  if (!existing) {
    await create_transaction({
      tenant_id: tenant.id,
      account_id: account.id,
      date: txn.date,
      amount: dollars_to_cents(txn.amount),
      description: txn.name,
      category: map_plaid_category(txn.category),
      plaid_transaction_id: txn.transaction_id,
    });
  }
}
```

### Conflict Resolution

When same entity modified in both systems:
1. **Last Write Wins** - Use most recent timestamp
2. **Manual Review** - Flag for user decision
3. **Field-Level Merge** - Merge non-conflicting fields

Conflict detection:
```typescript
if (clawkeeper_updated_at > external_updated_at && external_updated_at > last_sync_time) {
  // Conflict! Both systems updated since last sync
  flag_for_manual_review({
    entity: 'invoice',
    clawkeeper_version: ck_invoice,
    external_version: qb_invoice,
    conflict_type: 'concurrent_modification',
  });
}
```

### Incremental Sync

Store last sync timestamp per entity type:
```sql
CREATE TABLE sync_status (
  tenant_id UUID,
  external_system VARCHAR(50),
  entity_type VARCHAR(50),
  last_sync_time TIMESTAMPTZ,
  status VARCHAR(50),
  PRIMARY KEY (tenant_id, external_system, entity_type)
);
```

Only fetch records modified since `last_sync_time`.

## Data Mapping

### Schema Mapping Table

| ClawKeeper Field | QuickBooks Field | Xero Field |
|------------------|------------------|------------|
| vendor_name | Vendor.DisplayName | Contact.Name |
| invoice_date | TxnDate | Date |
| amount | TotalAmt | Total |
| line_items | Line[] | LineItems[] |

Store mappings in configuration per tenant (custom field mappings).

## Error Handling

- **Auth Expired** - Refresh OAuth token, retry
- **Rate Limit** - Wait and retry with backoff
- **Network Error** - Retry up to 3 times
- **Data Validation Error** - Log, skip record, continue sync
- **Mapping Error** - Use default mapping, flag for review

## Integration Points

- **quickbooks-syncer** (Integration worker) - QuickBooks API
- **xero-syncer** (Integration worker) - Xero API
- **plaid-connector** (Integration worker) - Plaid API
- **data-mapper** (Integration worker) - Schema mapping
- **circuit-breaker-manager** (Integration worker) - API protection

## Models

- **Data Mapping**: Deterministic (configuration-based)
- **Conflict Resolution**: Claude Sonnet 4 (when manual review needed)

## Security

- OAuth tokens stored encrypted
- Refresh tokens rotated regularly
- API credentials in secrets vault
- Sync logs include tenant_id, user_id
- Rate limiting per external system

## Performance

- **Incremental Sync**: Sync only changes (not full dataset)
- **Batch Processing**: Sync up to 100 records per API call
- **Parallel Sync**: Sync multiple entity types concurrently
- **Caching**: Cache mappings and config

---

Invoke this skill for scheduled syncs or when user requests manual sync with external systems.
