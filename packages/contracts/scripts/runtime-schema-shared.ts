import type { ZodTypeAny } from 'zod';

export const GENERATED_HEADER =
  '# Generated from packages/contracts Zod schemas. Do not edit by hand.';

export type Bounds = { min?: number; max?: number };
export type RuntimeMetadata = Record<string, string>;
export type ShapeExpectation = { name: string; actual: () => string[]; expected: string[] };

type InternalDefinition = {
  checks?: Array<{ kind: string; value?: number }>;
  innerType?: ZodTypeAny;
  minLength?: { value: number } | null;
  maxLength?: { value: number } | null;
};

function definition(schema: ZodTypeAny): InternalDefinition {
  return (schema as ZodTypeAny & { _def: InternalDefinition })._def;
}

function unwrap(schema: ZodTypeAny): ZodTypeAny {
  return definition(schema).innerType ? unwrap(definition(schema).innerType!) : schema;
}

/** 读取 min/max 检查（ZodString 与 ZodNumber 的 _def.checks 结构一致）。 */
export function stringBounds(schema: ZodTypeAny): Bounds {
  const checks = definition(unwrap(schema)).checks ?? [];
  const bounds: Bounds = {};
  for (const check of checks) {
    if (check.kind === 'min') bounds.min = check.value;
    if (check.kind === 'max') bounds.max = check.value;
  }
  return bounds;
}

export function arrayBounds(schema: ZodTypeAny): Bounds {
  const def = definition(unwrap(schema));
  const bounds: Bounds = {};
  if (def.minLength?.value !== undefined) bounds.min = def.minLength.value;
  if (def.maxLength?.value !== undefined) bounds.max = def.maxLength.value;
  return bounds;
}

export function arrayMaximum(schema: ZodTypeAny): number {
  const value = definition(unwrap(schema)).maxLength?.value;
  if (value === undefined) throw new Error('Expected a bounded Zod array.');
  return value;
}

export function pythonLiteral(values: readonly string[]): string {
  const lines = values.map((value) => `    ${JSON.stringify(value)},`).join('\n');
  return `Literal[\n${lines}\n]`;
}

export function fieldOptions(bounds: Bounds): string {
  const options = [
    bounds.min === undefined ? undefined : `min_length=${bounds.min}`,
    bounds.max === undefined ? undefined : `max_length=${bounds.max}`,
  ].filter(Boolean);
  return options.length === 0 ? '' : `Field(${options.join(', ')})`;
}

export function optionalField(bounds: Bounds): string {
  const options = ['default=None'];
  if (bounds.min !== undefined) options.push(`min_length=${bounds.min}`);
  if (bounds.max !== undefined) options.push(`max_length=${bounds.max}`);
  return `Field(${options.join(', ')})`;
}

export function numberField(bounds: Bounds): string {
  const options = [
    bounds.min === undefined ? undefined : `ge=${bounds.min}`,
    bounds.max === undefined ? undefined : `le=${bounds.max}`,
  ].filter(Boolean);
  if (options.length === 0) throw new Error('Expected a bounded Zod number.');
  return `Field(${options.join(', ')})`;
}

export function assertShapes(expectations: ShapeExpectation[]): void {
  for (const expectation of expectations) {
    if (expectation.actual().join('|') !== expectation.expected.join('|')) {
      throw new Error(
        `${expectation.name} shape changed; update the runtime generator intentionally.`,
      );
    }
  }
}

export function render(template: string, metadata: RuntimeMetadata): string {
  return Object.entries(metadata).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value),
    template,
  );
}
