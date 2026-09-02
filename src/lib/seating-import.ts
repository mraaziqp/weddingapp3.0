/**
 * Turns a seating-chart PDF's text into table assignments.
 *
 * The couple builds the chart in whatever tool they like and exports a PDF, so
 * this has to cope with the two shapes those exports actually take rather than
 * one blessed format:
 *
 *   grouped        Table 1              per-line   John Smith ..... Table 1
 *                    John Smith                    Jane Smith ..... 1
 *                    Jane Smith
 *
 * Nothing here touches the database. Parsing is deliberately separate from
 * matching and from saving, so the admin screen can show exactly what was read
 * out of the file and let the couple correct it *before* anything is written —
 * a seating chart that silently mis-assigns a family is worse than no chart.
 */

export type ParsedTable = { name: string; guests: string[] };

export type ParsedSeating = {
  tables: ParsedTable[];
  layout: 'grouped' | 'per-line' | 'none';
  /** Human-readable notes for the admin preview — never thrown as errors. */
  warnings: string[];
};

/** Words a line can be entirely made of and still not be a guest. */
const COLUMN_HEADINGS = new Set([
  'name', 'names', 'guest', 'guests', 'table', 'tables', 'seat', 'seating',
  'seating chart', 'guest name', 'table no', 'table number', 'no', '#',
]);

/** Honorifics stripped before matching, so "Mr John Smith" finds "John Smith". */
const TITLES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'mstr', 'master', 'dr', 'prof', 'sir', 'madam',
  'hajji', 'hajjie', 'haji', 'sheikh', 'shaykh', 'moulana', 'maulana', 'imam',
  'aunty', 'auntie', 'uncle',
]);

/**
 * A table heading: "Table 1", "TABLE 12 — Family", "Top Table", "Table Two".
 * The trailing label is kept, because "Table 3 (Groom's Work)" is how a guest
 * will recognise their table on the night.
 */
const TABLE_HEADING =
  /^\s*(?:table|tafel)\s*(?:no\.?|number|#)?\s*([0-9]{1,3}|[a-z]{1,12})\b\s*(?:[-–—:•|]\s*(.+))?$/i;

/** Named tables that carry no number at all — common for the wedding party. */
const NAMED_TABLE =
  /^\s*((?:top|head|main|bridal|bride|groom|family|kids?|children'?s?|elders?)\s+table)\s*(?:[-–—:•|]\s*(.+))?$/i;

/**
 * "John Smith .......... 4", "John Smith - Table 4", "John Smith\t4".
 * The separator run must be non-empty so a plain two-word name like
 * "Zainab 12" is not mistaken for a heading-less row when it is really a name.
 */
const NAME_THEN_TABLE =
  /^(.*?[a-z].*?)[\s.·•_…]*[-–—:|\t]?[\s.·•_…]*(?:table\s*(?:no\.?|#)?\s*)?([0-9]{1,3}|[a-z]{1,12})\s*$/i;

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20,
};

/** Canonical label for a table, so "table 04" and "Table 4" are one table. */
export function normalizeTableName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const digits = /^([0-9]{1,3})$/.exec(trimmed);
  if (digits) return `Table ${Number(digits[1])}`;

  const word = WORD_NUMBERS[trimmed.toLowerCase()];
  if (word) return `Table ${word}`;

  // "Table Two" — a spelled-out number behind the word.
  const spelled = /^table\s*(?:no\.?|number|#)?\s*([a-z]+)\s*$/i.exec(trimmed);
  if (spelled && WORD_NUMBERS[spelled[1].toLowerCase()]) {
    return `Table ${WORD_NUMBERS[spelled[1].toLowerCase()]}`;
  }

  const withTable = /^table\s*(?:no\.?|number|#)?\s*0*([0-9]{1,3})\b\s*(.*)$/i.exec(trimmed);
  if (withTable) {
    const suffix = withTable[2].trim();
    return suffix ? `Table ${Number(withTable[1])} — ${suffix}` : `Table ${Number(withTable[1])}`;
  }

  // Title-case a named table so "TOP TABLE" and "top table" agree.
  return trimmed.replace(/\b[a-z]/gi, c => c.toUpperCase());
}

/** True when a line is page furniture rather than content. */
function isNoise(line: string): boolean {
  const lower = line.toLowerCase().replace(/[^a-z0-9 #]/g, '').trim();
  if (!lower) return true;
  if (COLUMN_HEADINGS.has(lower)) return true;
  // Bare page numbers and "Page 2 of 5".
  if (/^\d{1,3}$/.test(lower)) return true;
  if (/^page\s*\d+(\s*of\s*\d+)?$/.test(lower)) return true;
  return false;
}

/** Splits a line that lists several guests at once: "A Smith, B Smith". */
function splitGuestLine(line: string): string[] {
  return line
    .split(/\s*[,;]\s*|\s+[&•]\s+/)
    .map(part => part.trim())
    .filter(part => part.length > 1 && /[a-z]/i.test(part));
}

function cleanGuestName(raw: string): string {
  return raw
    // Leading list markers: "1.", "-", "•", "a)".
    .replace(/^\s*(?:[-–—•*]|\(?\d{1,3}[.)]|[a-z][.)])\s+/i, '')
    // Trailing dot leaders left over from a two-column layout.
    .replace(/[\s.·•_…]{2,}$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads the raw text of a seating PDF.
 *
 * Grouped layout is tried first: it is unambiguous when it is present, whereas
 * the per-line pattern will happily match a heading line too.
 */
export function parseSeatingText(text: string): ParsedSeating {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map(l => l.replace(/ /g, ' ').trim())
    .filter(l => l.length > 0);

  const grouped = parseGrouped(lines);
  if (grouped.tables.length >= 1 && grouped.seated > 0) {
    if (grouped.orphans > 0) {
      warnings.push(
        `${grouped.orphans} name${grouped.orphans === 1 ? '' : 's'} appeared before any table heading and ` +
          `${grouped.orphans === 1 ? 'was' : 'were'} skipped.`
      );
    }
    return { tables: grouped.tables, layout: 'grouped', warnings };
  }

  const perLine = parsePerLine(lines);
  if (perLine.length > 0) {
    return { tables: perLine, layout: 'per-line', warnings };
  }

  warnings.push(
    'No table assignments were recognised. The PDF may be a scanned image rather ' +
      'than text, or it may use a layout this importer does not know yet.'
  );
  return { tables: [], layout: 'none', warnings };
}

function parseGrouped(lines: string[]): { tables: ParsedTable[]; seated: number; orphans: number } {
  const byTable = new Map<string, string[]>();
  let current: string | null = null;
  let seated = 0;
  let orphans = 0;

  for (const line of lines) {
    const heading = TABLE_HEADING.exec(line) ?? NAMED_TABLE.exec(line);
    if (heading) {
      // Hand normalizeTableName a plain "Table 3 Family" / "Top Table" and let
      // it own the punctuation; composing the separator here as well produced
      // "Table 3 — — Family".
      const parts = [heading[1], heading[2]].filter(Boolean).join(' ');
      const isNamed = NAMED_TABLE.test(line) && !TABLE_HEADING.test(line);
      current = normalizeTableName(isNamed ? parts : `Table ${parts}`);
      if (!byTable.has(current)) byTable.set(current, []);
      continue;
    }

    if (isNoise(line)) continue;

    if (!current) {
      orphans++;
      continue;
    }

    for (const name of splitGuestLine(line)) {
      const clean = cleanGuestName(name);
      if (!clean || isNoise(clean)) continue;
      byTable.get(current)!.push(clean);
      seated++;
    }
  }

  const tables = [...byTable.entries()]
    .filter(([, guests]) => guests.length > 0)
    .map(([name, guests]) => ({ name, guests }));

  return { tables, seated, orphans };
}

function parsePerLine(lines: string[]): ParsedTable[] {
  const byTable = new Map<string, string[]>();

  for (const line of lines) {
    if (isNoise(line)) continue;
    // A heading in a per-line document is still just a heading.
    if (TABLE_HEADING.test(line) || NAMED_TABLE.test(line)) continue;

    const match = NAME_THEN_TABLE.exec(line);
    if (!match) continue;

    const name = cleanGuestName(match[1]);
    if (!name || isNoise(name)) continue;
    // A trailing word is only a table if it is a number or a number-word;
    // otherwise "John Smith Junior" would seat John at table "Junior".
    const token = match[2].toLowerCase();
    if (!/^[0-9]+$/.test(token) && !WORD_NUMBERS[token]) continue;

    const table = normalizeTableName(match[2]);
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table)!.push(name);
  }

  return [...byTable.entries()].map(([name, guests]) => ({ name, guests }));
}

// ── Matching parsed names to real guests ────────────────────────────────

/** Lowercased, de-accented, title-stripped form used only for comparison. */
export function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word && !TITLES.has(word.replace(/[.']/g, '')))
    .join(' ')
    .trim();
}

export type SeatCandidate = { id: string; firstName: string; lastName: string };

export type SeatAssignment = {
  tableName: string;
  /** The name exactly as it appeared in the PDF. */
  parsedName: string;
  guestId: string | null;
  /** How the name was matched, shown in the preview so the couple can judge it. */
  match: 'exact' | 'initial' | 'first-name' | 'none';
};

export type SeatingMatchResult = {
  assignments: SeatAssignment[];
  /** Guests on the list who the PDF never seats. */
  unseated: SeatCandidate[];
  matched: number;
  unmatched: number;
};

/**
 * Resolves parsed names against the guest list.
 *
 * Every tier consumes the guest it matches, so one guest can never be seated at
 * two tables, and the weaker tiers only ever run against whoever is left. That
 * ordering is what stops a loose first-name match stealing a guest that a later
 * line would have matched exactly.
 */
export function matchGuestsToSeats(
  tables: ParsedTable[],
  guests: SeatCandidate[]
): SeatingMatchResult {
  const remaining = new Map<string, SeatCandidate>();
  for (const g of guests) remaining.set(g.id, g);

  const full = new Map<string, string[]>();
  const byLastAndInitial = new Map<string, string[]>();
  const byFirst = new Map<string, string[]>();

  const index = (map: Map<string, string[]>, key: string, id: string) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(id);
  };

  for (const g of guests) {
    const first = normalizeName(g.firstName ?? '');
    const last = normalizeName(g.lastName ?? '');
    index(full, `${first} ${last}`.trim(), g.id);
    if (first && last) index(byLastAndInitial, `${first[0]} ${last}`, g.id);
    index(byFirst, first, g.id);
  }

  const take = (map: Map<string, string[]>, key: string): string | null => {
    const ids = (map.get(key) ?? []).filter(id => remaining.has(id));
    // An ambiguous key is not a match. Two "Fatima Parker"s must go to the
    // couple to resolve rather than being seated by whichever came first.
    if (ids.length !== 1) return null;
    remaining.delete(ids[0]);
    return ids[0];
  };

  const assignments: SeatAssignment[] = [];
  const pending: { tableName: string; parsedName: string; norm: string }[] = [];

  for (const table of tables) {
    for (const parsedName of table.guests) {
      pending.push({ tableName: table.name, parsedName, norm: normalizeName(parsedName) });
    }
  }

  const resolved = new Map<number, SeatAssignment>();

  pending.forEach((row, i) => {
    const id = take(full, row.norm);
    if (id) resolved.set(i, { tableName: row.tableName, parsedName: row.parsedName, guestId: id, match: 'exact' });
  });

  pending.forEach((row, i) => {
    if (resolved.has(i)) return;
    const parts = row.norm.split(' ');
    if (parts.length < 2) return;
    const key = `${parts[0][0]} ${parts[parts.length - 1]}`;
    const id = take(byLastAndInitial, key);
    if (id) resolved.set(i, { tableName: row.tableName, parsedName: row.parsedName, guestId: id, match: 'initial' });
  });

  pending.forEach((row, i) => {
    if (resolved.has(i)) return;
    if (row.norm.includes(' ')) return; // a single word only — a bare first name
    const id = take(byFirst, row.norm);
    if (id) resolved.set(i, { tableName: row.tableName, parsedName: row.parsedName, guestId: id, match: 'first-name' });
  });

  pending.forEach((row, i) => {
    assignments.push(
      resolved.get(i) ?? {
        tableName: row.tableName,
        parsedName: row.parsedName,
        guestId: null,
        match: 'none',
      }
    );
  });

  const matched = assignments.filter(a => a.guestId).length;
  return {
    assignments,
    unseated: [...remaining.values()],
    matched,
    unmatched: assignments.length - matched,
  };
}
