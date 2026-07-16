import { renderCsv } from './admin-csv';

describe('renderCsv', () => {
  it('renders a BOM-prefixed CSV with a header and CRLF record separators', () => {
    const result = renderCsv(
      [
        { header: '姓名', value: (row: { name: string }) => row.name },
        { header: '数量', value: (row: { count: number }) => row.count },
      ],
      [{ name: 'Ada', count: 2 }],
    );

    expect(result).toBe('\uFEFF姓名,数量\r\nAda,2');
  });

  it('quotes fields containing CSV delimiters, quotes, or line breaks', () => {
    const result = renderCsv(
      [{ header: '说明', value: (row: { note: string }) => row.note }],
      [{ note: 'north, "quoted"\r\nsouth' }],
    );

    expect(result).toBe('\uFEFF说明\r\n"north, ""quoted""\r\nsouth"');
  });

  it('prefixes spreadsheet formulas when their first non-whitespace character is unsafe', () => {
    const result = renderCsv(
      [{ header: '值', value: (row: { value: string }) => row.value }],
      [
        { value: '=1+1' },
        { value: '  +SUM(A1:A2)' },
        { value: '-42' },
        { value: '\t@command' },
        { value: 'safe text' },
      ],
    );

    expect(result).toBe("\uFEFF值\r\n'=1+1\r\n'  +SUM(A1:A2)\r\n'-42\r\n'\t@command\r\nsafe text");
  });

  it('renders null and undefined values as empty fields', () => {
    const result = renderCsv(
      [{ header: '可选值', value: (row: { value: boolean | null | undefined }) => row.value }],
      [{ value: true }, { value: false }, { value: null }, { value: undefined }],
    );

    expect(result).toBe('\uFEFF可选值\r\ntrue\r\nfalse\r\n\r\n');
  });
});
