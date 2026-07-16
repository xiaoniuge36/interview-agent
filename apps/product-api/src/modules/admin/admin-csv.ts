export type CsvValue = string | number | boolean | null | undefined;

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => CsvValue;
};

const UTF8_BOM = '\uFEFF';
const CSV_SPECIAL_CHARACTER = /[",\r\n]/;
const FORMULA_PREFIX = /^\s*[=+\-@]/;

function encodeField(value: CsvValue): string {
  const text = value == null ? '' : String(value);
  const safeText = FORMULA_PREFIX.test(text) ? `'${text}` : text;

  if (!CSV_SPECIAL_CHARACTER.test(safeText)) {
    return safeText;
  }

  return `"${safeText.replaceAll('"', '""')}"`;
}

export function renderCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  const header = columns.map((column) => encodeField(column.header)).join(',');
  const records = rows.map((row) =>
    columns.map((column) => encodeField(column.value(row))).join(','),
  );

  return `${UTF8_BOM}${[header, ...records].join('\r\n')}`;
}
