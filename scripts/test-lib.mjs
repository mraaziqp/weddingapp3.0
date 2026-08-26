#!/usr/bin/env node
/**
 * Unit tests for the pure helpers — no server, no network.
 *
 *   npm run test:lib
 *
 * Node strips the TypeScript types natively, so these import the real source
 * files rather than a build artefact.
 */

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const load = p => import(pathToFileURL(resolve(p)).href);
const { csvField, toCsv } = await load('src/lib/csv.ts');
const { rateLimit } = await load('src/lib/rate-limit.ts');

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`);
}

section('csv escaping');
check('plain text passes through', csvField('Sakina Parker'), 'Sakina Parker');
check('comma forces quoting', csvField('Parker, Sakina'), '"Parker, Sakina"');
check('embedded quotes are doubled', csvField('Bob "Bobby" Smith'), '"Bob ""Bobby"" Smith"');
check('newline forces quoting', csvField('line1\nline2'), '"line1\nline2"');
check('null becomes empty', csvField(null), '');
check('undefined becomes empty', csvField(undefined), '');

section('csv formula injection (CWE-1236)');
check('= is neutralised', csvField('=SUM(A1)'), "'=SUM(A1)");
check('+ is neutralised', csvField('+1234'), "'+1234");
check('- is neutralised', csvField('-1+1'), "'-1+1");
check('@ is neutralised', csvField('@SUM(A1)'), "'@SUM(A1)");
// A tab needs the formula prefix but not quoting — RFC 4180 only requires
// quoting for the quote character, comma, CR and LF.
check('tab is neutralised without quoting', csvField('\tx'), "'\tx");
check(
  'formula with quotes is both neutralised and escaped',
  csvField('=HYPERLINK("http://evil")'),
  '"\'=HYPERLINK(""http://evil"")"'
);

section('csv numbers stay numeric');
// The budget export has a variance column that is legitimately negative;
// apostrophe-prefixing those would make Excel treat them as text and refuse
// to sum the column.
check('positive number', csvField(42), '42');
check('negative number keeps its sign', csvField(-5), '-5');
check('zero', csvField(0), '0');
check('numeric-looking string is still neutralised', csvField('-5'), "'-5");

section('csv document');
check('rows joined with CRLF', toCsv([['a', 'b'], ['c', 'd']]), 'a,b\r\nc,d');
check('mixed row', toCsv([['=evil', 'x,y']]), '\'=evil,"x,y"');

section('rate limiter');
const key = `test-${Math.random()}`;
const first = rateLimit(key, 3, 60_000);
check('first request allowed', first.allowed, true);
check('remaining decrements', first.remaining, 2);
rateLimit(key, 3, 60_000);
rateLimit(key, 3, 60_000);
const fourth = rateLimit(key, 3, 60_000);
check('fourth request blocked once limit exceeded', fourth.allowed, false);
check('blocked response carries a retry-after', fourth.retryAfter > 0, true);

const otherKey = `test-other-${Math.random()}`;
check('a different key has its own budget', rateLimit(otherKey, 3, 60_000).allowed, true);

// A window that has already elapsed must reset rather than stay blocked.
const shortKey = `test-short-${Math.random()}`;
rateLimit(shortKey, 1, 1);
await new Promise(r => setTimeout(r, 20));
check('expired window resets', rateLimit(shortKey, 1, 1).allowed, true);

console.log(`\n${'═'.repeat(60)}`);
if (failures.length) {
  console.log(`${passed} passed, ${failures.length} FAILED:`);
  failures.forEach(f => console.log(`   - ${f}`));
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
