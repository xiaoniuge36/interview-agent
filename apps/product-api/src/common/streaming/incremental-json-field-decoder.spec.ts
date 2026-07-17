import { IncrementalJsonFieldDecoder } from './incremental-json-field-decoder';

describe('IncrementalJsonFieldDecoder', () => {
  it('emits only the requested JSON string field across chunks', () => {
    const decoder = new IncrementalJsonFieldDecoder('feedback');

    expect(decoder.push('{"score":80,"feedback":"第一')).toBe('第一');
    expect(decoder.push('行\\n第\\u4e8c行","reasoning":"隐藏"}')).toBe('行\n第二行');
  });

  it('does not emit fields that are outside the allowlist', () => {
    const decoder = new IncrementalJsonFieldDecoder('content');

    expect(decoder.push('{"reasoning":"不展示","content":"只展示这里"}')).toBe('只展示这里');
  });
});
