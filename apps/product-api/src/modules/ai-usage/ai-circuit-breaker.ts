import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiCircuitState } from '@interview-agent/contracts';
import type { Environment } from '../../common/config/environment';

type CircuitOptions = {
  failureThreshold: number;
  cooldownMs: number;
  maxHalfOpenProbes: number;
};

type CircuitRecord = {
  state: AiCircuitState;
  failures: number;
  openedAt: number;
  halfOpenProbes: number;
};

const DEFAULT_OPTIONS: CircuitOptions = {
  failureThreshold: 3,
  cooldownMs: 30_000,
  maxHalfOpenProbes: 1,
};

@Injectable()
export class AiCircuitBreaker {
  private readonly circuits = new Map<string, CircuitRecord>();
  private readonly options: CircuitOptions;

  constructor(
    @Optional()
    @Inject(ConfigService)
    configuration?: ConfigService<Environment, true> | CircuitOptions,
  ) {
    this.options = circuitOptions(configuration);
  }

  allow(key: string, now = Date.now()): boolean {
    const circuit = this.circuits.get(key);
    if (!circuit || circuit.state === 'closed') return true;
    if (circuit.state === 'open') return this.openProbeAllowed(circuit, now);
    if (circuit.halfOpenProbes >= this.options.maxHalfOpenProbes) return false;
    circuit.halfOpenProbes += 1;
    return true;
  }

  recordFailure(key: string, now = Date.now()): AiCircuitState {
    const circuit = this.circuits.get(key) ?? closedCircuit();
    if (circuit.state === 'half_open') return this.open(key, circuit, now);
    if (circuit.state === 'open') return 'open';
    circuit.failures += 1;
    this.circuits.set(key, circuit);
    return circuit.failures >= this.options.failureThreshold
      ? this.open(key, circuit, now)
      : 'closed';
  }

  recordSuccess(key: string): AiCircuitState {
    this.circuits.delete(key);
    return 'closed';
  }

  state(key: string): AiCircuitState {
    return this.circuits.get(key)?.state ?? 'closed';
  }

  summary() {
    const result = { openCircuits: 0, halfOpenCircuits: 0 };
    for (const circuit of this.circuits.values()) {
      if (circuit.state === 'open') result.openCircuits += 1;
      if (circuit.state === 'half_open') result.halfOpenCircuits += 1;
    }
    return result;
  }

  private openProbeAllowed(circuit: CircuitRecord, now: number) {
    if (now - circuit.openedAt < this.options.cooldownMs) return false;
    circuit.state = 'half_open';
    circuit.halfOpenProbes = 1;
    return true;
  }

  private open(key: string, circuit: CircuitRecord, now: number): AiCircuitState {
    Object.assign(circuit, { state: 'open', openedAt: now, halfOpenProbes: 0 });
    this.circuits.set(key, circuit);
    return 'open';
  }
}

function closedCircuit(): CircuitRecord {
  return { state: 'closed', failures: 0, openedAt: 0, halfOpenProbes: 0 };
}

function circuitOptions(
  configuration: ConfigService<Environment, true> | CircuitOptions | undefined,
): CircuitOptions {
  if (!configuration) return DEFAULT_OPTIONS;
  if (!('get' in configuration)) return configuration;
  return {
    failureThreshold: configuration.get('AI_CIRCUIT_FAILURE_THRESHOLD', { infer: true }),
    cooldownMs: configuration.get('AI_CIRCUIT_COOLDOWN_MS', { infer: true }),
    maxHalfOpenProbes: configuration.get('AI_CIRCUIT_HALF_OPEN_MAX_PROBES', { infer: true }),
  };
}
