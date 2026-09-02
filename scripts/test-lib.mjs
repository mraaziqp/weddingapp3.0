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
import { readFileSync } from 'node:fs';

const load = p => import(pathToFileURL(resolve(p)).href);
const { csvField, toCsv } = await load('src/lib/csv.ts');
const { rateLimit } = await load('src/lib/rate-limit.ts');
const { parseSeatingText, normalizeTableName, normalizeName, matchGuestsToSeats } =
  await load('src/lib/seating-import.ts');

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


// ── upload UI contract ────────────────────────────────────────────────────
// These assert on source rather than behaviour, deliberately. The bug they
// guard is a single attribute: `capture` on a file input forces the camera
// app and silently limits the picker to ONE item, which is what stopped
// guests selecting a whole evening's photos. It is trivially reintroduced and
// invisible in review, so it is worth pinning.

section('file pickers accept many files');

const cameraSrc = readFileSync('src/components/disposable-camera-ui.tsx', 'utf8');
const uploaderSrc = readFileSync('src/components/guest-hub/guest-uploader.tsx', 'utf8');

const cameraInput = cameraSrc.slice(
  cameraSrc.indexOf('<input'),
  cameraSrc.indexOf('/>', cameraSrc.indexOf('<input'))
);
check('camera picker allows multiple', /\bmultiple\b/.test(cameraInput), true);
check('camera picker does not force capture', /capture=/.test(cameraInput), false);

const uploaderInput = uploaderSrc.slice(
  uploaderSrc.indexOf('<input'),
  uploaderSrc.indexOf('/>', uploaderSrc.indexOf('<input'))
);
check('guest uploader allows multiple', /\bmultiple\b/.test(uploaderInput), true);
check('guest uploader does not force capture', /capture=/.test(uploaderInput), false);
check('guest uploader accepts video', /image\/\*,video\/\*|ACCEPTED_TYPES/.test(uploaderInput), true);

section('upload ceilings stay under the platform body cap');

const bulkSrc = readFileSync('src/lib/bulk-upload.ts', 'utf8');
const routeSrc = readFileSync('src/app/api/media/upload/route.ts', 'utf8');
/** Evaluates a `4 * 1024 * 1024` style literal into its byte count. */
const readBytes = (src, name) => {
  const expr = new RegExp(`${name} = ([0-9*\\s]+);`).exec(src)?.[1];
  if (!expr) return NaN;
  return expr.split('*').reduce((total, part) => total * Number(part.trim()), 1);
};

const bulkCeiling = readBytes(bulkSrc, 'SERVER_ROUTE_CEILING');
const routeCeiling = readBytes(routeSrc, 'MAX_UPLOAD_BYTES');

// Vercel rejects a request body over ~4.5MB at the edge, before the handler
// runs, and answers in plain text — which the client cannot parse as JSON.
const PLATFORM_CAP_MB = 4.5;
check('ceilings parsed to real byte counts',
  Number.isFinite(bulkCeiling) && bulkCeiling > 1024 * 1024 &&
  Number.isFinite(routeCeiling) && routeCeiling > 1024 * 1024, true);
console.log(`        client fallback ${(bulkCeiling / 1048576).toFixed(1)}MB, ` +
  `server route ${(routeCeiling / 1048576).toFixed(1)}MB`);
check('client fallback ceiling is under the platform cap',
  bulkCeiling / 1048576 < PLATFORM_CAP_MB, true);
check('server route ceiling is under the platform cap',
  routeCeiling / 1048576 < PLATFORM_CAP_MB, true);
check('client never sends more than the route will accept',
  bulkCeiling <= routeCeiling, true);


section('seating PDF — grouped layout');
{
  const parsed = parseSeatingText([
    'Seating Chart',
    'Table 1',
    'Gadija Khan',
    'Nafisa Khan',
    'Table 2',
    'Khaalid Parker',
    'Page 1 of 2',
    'Table 3 \u2014 Groom Work',
    'Rania Parker, Razeen Parker',
  ].join('\n'));
  check('layout detected', parsed.layout, 'grouped');
  check('tables found', parsed.tables.map(t => t.name),
    ['Table 1', 'Table 2', 'Table 3 \u2014 Groom Work']);
  check('names grouped under their table', parsed.tables[0].guests, ['Gadija Khan', 'Nafisa Khan']);
  check('page furniture dropped', parsed.tables[1].guests, ['Khaalid Parker']);
  check('comma-separated names split', parsed.tables[2].guests, ['Rania Parker', 'Razeen Parker']);
}

section('seating PDF — per-line layout');
{
  const parsed = parseSeatingText([
    'Name                Table',
    'Gadija Khan ........ 1',
    'Khaalid Parker - Table 2',
    'Rania Parker\t2',
  ].join('\n'));
  check('layout detected', parsed.layout, 'per-line');
  check('column heading ignored', parsed.tables.map(t => t.name), ['Table 1', 'Table 2']);
  check('dot leaders stripped', parsed.tables[0].guests, ['Gadija Khan']);
  check('both table spellings agree', parsed.tables[1].guests, ['Khaalid Parker', 'Rania Parker']);
}

section('seating PDF — table naming');
check('bare number', normalizeTableName('7'), 'Table 7');
check('zero padded', normalizeTableName('Table 04'), 'Table 4');
check('number word', normalizeTableName('three'), 'Table 3');
check('named table title-cased', normalizeTableName('top table'), 'Top Table');
check('label kept', normalizeTableName('Table 3 Family'), 'Table 3 \u2014 Family');

section('seating PDF — unparseable input');
{
  const parsed = parseSeatingText('a scanned image leaves no text behind\n');
  check('no tables invented', parsed.tables, []);
  check('layout reported as none', parsed.layout, 'none');
  check('warns the couple', parsed.warnings.length > 0, true);
}

section('seating PDF — name matching');
{
  const guests = [
    { id: 'g1', firstName: 'Gadija', lastName: 'Khan' },
    { id: 'g2', firstName: 'Nafisa ', lastName: 'Khan' },
    { id: 'g3', firstName: 'Khaalid', lastName: 'Parker' },
    { id: 'g4', firstName: 'Zainab', lastName: 'Adams' },
  ];
  const result = matchGuestsToSeats([
    { name: 'Table 1', guests: ['Gadija Khan', 'Mrs N. Khan', 'Zainab'] },
    { name: 'Table 2', guests: ['Someone Unknown'] },
  ], guests);

  const by = n => result.assignments.find(a => a.parsedName === n);
  check('exact match', [by('Gadija Khan').guestId, by('Gadija Khan').match], ['g1', 'exact']);
  check('title and initial match', [by('Mrs N. Khan').guestId, by('Mrs N. Khan').match], ['g2', 'initial']);
  check('bare first name match', [by('Zainab').guestId, by('Zainab').match], ['g4', 'first-name']);
  check('unknown name left unmatched', by('Someone Unknown').guestId, null);
  check('counts', [result.matched, result.unmatched], [3, 1]);
  check('guest never seated is reported', result.unseated.map(g => g.id), ['g3']);
}

section('seating PDF — matching is never ambiguous');
{
  const twins = [
    { id: 'a', firstName: 'Fatima', lastName: 'Parker' },
    { id: 'b', firstName: 'Fatima', lastName: 'Parker' },
  ];
  const result = matchGuestsToSeats([{ name: 'Table 1', guests: ['Fatima Parker'] }], twins);
  check('duplicate names are not guessed', result.assignments[0].guestId, null);
  check('both stay unseated', result.unseated.length, 2);
}

section('seating PDF — one guest cannot hold two seats');
{
  const guests = [{ id: 'g1', firstName: 'Gadija', lastName: 'Khan' }];
  const result = matchGuestsToSeats([
    { name: 'Table 1', guests: ['Gadija Khan'] },
    { name: 'Table 9', guests: ['Gadija Khan'] },
  ], guests);
  check('only the first seat binds', result.assignments.map(a => a.guestId), ['g1', null]);
}

section('seating PDF — name normalisation');
check('accents folded', normalizeName('Zo\u00eb  M\u00fcller'), 'zoe muller');
check('title stripped', normalizeName('Sheikh Yusuf'), 'yusuf');
check('trailing space tolerated', normalizeName('Nafisa '), 'nafisa');

console.log(`\n${'═'.repeat(60)}`);
if (failures.length) {
  console.log(`${passed} passed, ${failures.length} FAILED:`);
  failures.forEach(f => console.log(`   - ${f}`));
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
