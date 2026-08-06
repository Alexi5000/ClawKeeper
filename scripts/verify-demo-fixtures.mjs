import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const fixtureDirectories = [
  'src/demo/data/generated',
  'src/demo/transform/normalized',
];

function fixtureHash() {
  const hash = createHash('sha256');
  for (const directory of fixtureDirectories) {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (!statSync(path).isFile()) continue;
      hash.update(path);
      hash.update(readFileSync(path));
    }
  }
  return hash.digest('hex');
}

function generateFixtures() {
  const result = spawnSync('npm', ['run', 'demo:fixtures'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const committedHash = fixtureHash();
generateFixtures();
const firstHash = fixtureHash();
generateFixtures();
const secondHash = fixtureHash();

if (committedHash !== firstHash || firstHash !== secondHash) {
  console.error('Demo fixtures are not deterministic.');
  console.error({ committedHash, firstHash, secondHash });
  process.exit(1);
}

console.log(`Demo fixtures are deterministic: ${secondHash}`);
