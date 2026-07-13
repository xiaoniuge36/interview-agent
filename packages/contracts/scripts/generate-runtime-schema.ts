import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodTypeAny } from 'zod';
import {
  AgentRuntimeContractVersionSchema,
  AgentRuntimeNextRequestSchema,
  AgentRuntimeNextResponseSchema,
  AgentRuntimeSessionContextSchema,
  AgentRuntimeTurnContextSchema,
  InterviewSessionStatusSchema,
  InterviewStageSchema,
  InterviewTurnRoleSchema,
} from '../src/schemas/interview';

const GENERATED_HEADER = '# Generated from packages/contracts Zod schemas. Do not edit by hand.';
const CHECK_ARGUMENT = '--check';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../../../apps/agent-runtime/app/schemas/interview.py');

const PYTHON_TEMPLATE = `{{HEADER}}
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

InterviewStage = {{INTERVIEW_STAGE}}
InterviewStatus = {{INTERVIEW_STATUS}}
InterviewTurnRole = {{TURN_ROLE}}
ContractVersion = Literal[{{CONTRACT_VERSION}}]


class ContractModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
        serialize_by_alias=True,
        str_strip_whitespace=True,
    )


class RuntimeTurnContext(ContractModel):
    role: InterviewTurnRole
    stage: InterviewStage
    content: str = {{TURN_CONTENT}}


class RuntimeSessionContext(ContractModel):
    id: str = Field(min_length=1)
    tenant_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    status: InterviewStatus
    stage: InterviewStage
    version: int = Field(ge=0)
    title: str = {{TITLE}}
    candidate_turn_count: int = Field(ge=0)
    recent_turns: list[RuntimeTurnContext] = Field(max_length={{RECENT_TURNS_MAXIMUM}})


class NextInterviewRequest(ContractModel):
    contract_version: ContractVersion
    session: RuntimeSessionContext
    command_id: str = {{COMMAND_ID}}
    trace_id: str = {{TRACE_ID}}
    answer: str | None = {{ANSWER}}


class NextInterviewResponse(ContractModel):
    contract_version: ContractVersion = {{CONTRACT_VERSION}}
    stage: InterviewStage
    content: str = {{RESPONSE_CONTENT}}
    should_finish: bool
`;

type Bounds = { min?: number; max?: number };
type InternalDefinition = {
  checks?: Array<{ kind: string; value?: number }>;
  innerType?: ZodTypeAny;
  maxLength?: { value: number } | null;
};
type RuntimeMetadata = Record<string, string>;

function definition(schema: ZodTypeAny): InternalDefinition {
  return (schema as ZodTypeAny & { _def: InternalDefinition })._def;
}

function unwrap(schema: ZodTypeAny): ZodTypeAny {
  return definition(schema).innerType ? unwrap(definition(schema).innerType!) : schema;
}

function stringBounds(schema: ZodTypeAny): Bounds {
  const checks = definition(unwrap(schema)).checks ?? [];
  const bounds: Bounds = {};
  for (const check of checks) {
    if (check.kind === 'min') bounds.min = check.value;
    if (check.kind === 'max') bounds.max = check.value;
  }
  return bounds;
}

function arrayMaximum(schema: ZodTypeAny): number {
  const value = definition(unwrap(schema)).maxLength?.value;
  if (value === undefined) throw new Error('Expected a bounded Zod array.');
  return value;
}

function pythonLiteral(values: readonly string[]): string {
  const lines = values.map((value) => `    ${JSON.stringify(value)},`).join('\n');
  return `Literal[\n${lines}\n]`;
}

function fieldOptions(bounds: Bounds): string {
  const options = [
    bounds.min === undefined ? undefined : `min_length=${bounds.min}`,
    bounds.max === undefined ? undefined : `max_length=${bounds.max}`,
  ].filter(Boolean);
  return options.length === 0 ? '' : `Field(${options.join(', ')})`;
}

function optionalField(bounds: Bounds): string {
  const options = ['default=None'];
  if (bounds.min !== undefined) options.push(`min_length=${bounds.min}`);
  if (bounds.max !== undefined) options.push(`max_length=${bounds.max}`);
  return `Field(${options.join(', ')})`;
}

function assertShape(name: string, actual: string[], expected: string[]): void {
  if (actual.join('|') !== expected.join('|')) {
    throw new Error(`${name} shape changed; update the runtime generator intentionally.`);
  }
}

function validateShapes(): void {
  assertShape('turn', Object.keys(AgentRuntimeTurnContextSchema.shape), [
    'role',
    'stage',
    'content',
  ]);
  assertShape('session', Object.keys(AgentRuntimeSessionContextSchema.shape), [
    'id',
    'tenantId',
    'userId',
    'status',
    'stage',
    'version',
    'title',
    'candidateTurnCount',
    'recentTurns',
  ]);
  assertShape('request', Object.keys(AgentRuntimeNextRequestSchema.shape), [
    'contractVersion',
    'session',
    'commandId',
    'traceId',
    'answer',
  ]);
  assertShape('response', Object.keys(AgentRuntimeNextResponseSchema.shape), [
    'contractVersion',
    'stage',
    'content',
    'shouldFinish',
  ]);
}

function runtimeMetadata(): RuntimeMetadata {
  const turnShape = AgentRuntimeTurnContextSchema.shape;
  const sessionShape = AgentRuntimeSessionContextSchema.shape;
  const requestShape = AgentRuntimeNextRequestSchema.shape;
  const responseShape = AgentRuntimeNextResponseSchema.shape;
  const version = JSON.stringify(AgentRuntimeContractVersionSchema.value);
  return {
    HEADER: GENERATED_HEADER,
    INTERVIEW_STAGE: pythonLiteral(InterviewStageSchema.options),
    INTERVIEW_STATUS: pythonLiteral(InterviewSessionStatusSchema.options),
    TURN_ROLE: pythonLiteral(InterviewTurnRoleSchema.options),
    CONTRACT_VERSION: version,
    TURN_CONTENT: fieldOptions(stringBounds(turnShape.content)),
    TITLE: fieldOptions(stringBounds(sessionShape.title)),
    RECENT_TURNS_MAXIMUM: String(arrayMaximum(sessionShape.recentTurns)),
    COMMAND_ID: fieldOptions(stringBounds(requestShape.commandId)),
    TRACE_ID: fieldOptions(stringBounds(requestShape.traceId)),
    ANSWER: optionalField(stringBounds(requestShape.answer)),
    RESPONSE_CONTENT: fieldOptions(stringBounds(responseShape.content)),
  };
}

function generatePython(): string {
  validateShapes();
  return Object.entries(runtimeMetadata()).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value),
    PYTHON_TEMPLATE,
  );
}

function main(): void {
  const generated = generatePython();
  if (process.argv.includes(CHECK_ARGUMENT)) {
    const current = readFileSync(outputPath, 'utf8');
    if (current !== generated) throw new Error(`Runtime schema drift detected: ${outputPath}`);
    return;
  }
  writeFileSync(outputPath, generated, 'utf8');
}

main();
