// file: tests/dependency-compatibility.test.ts
// description: Preserve stored credentials and finance identifiers across dependency migrations
// reference: src/api/routes/auth.ts, src/core/types.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { TenantId } from '../src/core/types';

test('bcrypt accepts existing 2.4.3 password hashes and rejects incorrect credentials', async () => {
  const legacy_hash = '$2a$04$ZiVvpiTIHT0KgM1eniUsAe8f1NUMV5O/nWRIVqaqniT7tlxazcMDu';
  assert.equal(await bcrypt.compare('compatibility-only-password', legacy_hash), true);
  assert.equal(await bcrypt.compare('incorrect-password', legacy_hash), false);
  const updated_hash = await bcrypt.hash('compatibility-only-password', 4);
  assert.equal(await bcrypt.compare('compatibility-only-password', updated_hash), true);
  assert.equal(await bcrypt.compare('incorrect-password', updated_hash), false);
});

test('generated identifiers preserve the finance tenant schema', () => {
  const identifiers = Array.from({ length: 128 }, () => uuid());
  assert.equal(new Set(identifiers).size, identifiers.length);
  for (const identifier of identifiers) {
    assert.equal(TenantId.parse(identifier), identifier);
    assert.match(identifier, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
});
