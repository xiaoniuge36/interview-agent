import assert from 'node:assert/strict';
import test from 'node:test';
import * as aiUsage from './schemas/ai-usage';

type RuntimeSchema = { parse: (value: unknown) => unknown };

test('AI guardrail contracts expose bounded budget decisions and circuit states', () => {
  const exports = aiUsage as Record<string, unknown>;
  assert.equal(typeof exports.AiBudgetDecisionSchema, 'object');
  assert.equal(typeof exports.AiCircuitStateSchema, 'object');

  const budget = exports.AiBudgetDecisionSchema as RuntimeSchema;
  const circuit = exports.AiCircuitStateSchema as RuntimeSchema;
  assert.deepEqual(budget.parse({ allowed: false, code: 'AI_BUDGET_EXHAUSTED' }), {
    allowed: false,
    code: 'AI_BUDGET_EXHAUSTED',
  });
  assert.equal(circuit.parse('half_open'), 'half_open');
});
