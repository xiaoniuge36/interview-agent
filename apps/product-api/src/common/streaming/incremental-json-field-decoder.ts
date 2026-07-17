const ESCAPE_CHARACTERS: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};
const UNICODE_ESCAPE_LENGTH = 5;

export class IncrementalJsonFieldDecoder {
  private readonly fieldPattern: RegExp;
  private source = '';
  private valueOffset = 0;
  private started = false;
  private completed = false;
  private escaped = false;
  private unicode = '';

  constructor(field: string) {
    this.fieldPattern = new RegExp(`"${escapeRegExp(field)}"\\s*:\\s*"`, 'u');
  }

  push(chunk: string): string {
    if (this.completed || !chunk) return '';
    this.source += chunk;
    if (!this.locateValue()) return '';
    return this.readVisibleText();
  }

  private locateValue(): boolean {
    if (this.started) return true;
    const match = this.fieldPattern.exec(this.source);
    if (!match || match.index === undefined) return false;
    this.started = true;
    this.valueOffset = match.index + match[0].length;
    return true;
  }

  private readVisibleText(): string {
    let output = '';
    while (this.valueOffset < this.source.length && !this.completed) {
      const character = this.source.charAt(this.valueOffset++);
      output += this.consume(character);
    }
    return output;
  }

  private consume(character: string): string {
    if (this.unicode) return this.consumeUnicode(character);
    if (this.escaped) return this.consumeEscape(character);
    if (character === '\\') {
      this.escaped = true;
      return '';
    }
    if (character === '"') {
      this.completed = true;
      return '';
    }
    return character;
  }

  private consumeEscape(character: string): string {
    this.escaped = false;
    if (character === 'u') {
      this.unicode = 'u';
      return '';
    }
    return ESCAPE_CHARACTERS[character] ?? character;
  }

  private consumeUnicode(character: string): string {
    this.unicode += character;
    if (this.unicode.length < UNICODE_ESCAPE_LENGTH) return '';
    const value = this.unicode.slice(1);
    this.unicode = '';
    return /^[0-9a-f]{4}$/iu.test(value) ? String.fromCharCode(Number.parseInt(value, 16)) : '';
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
