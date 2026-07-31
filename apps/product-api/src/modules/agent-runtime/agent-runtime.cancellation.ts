import { unavailableFailure } from './agent-runtime.response';
import type { RuntimeFailure } from './agent-runtime.types';

export function cancelledFailure(): RuntimeFailure {
  return nonRetryableUnavailableFailure('AGENT_RUNTIME_CANCELLED');
}

export function callerCancelled(signal: AbortSignal | undefined) {
  return signal?.aborted ?? false;
}

export function invocationSignal(
  callerSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
) {
  return callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal;
}

export function abortFailure(callerSignal: AbortSignal | undefined, timeoutSignal: AbortSignal) {
  if (callerCancelled(callerSignal)) return cancelledFailure();
  if (timeoutSignal.aborted) return nonRetryableUnavailableFailure('AGENT_RUNTIME_TIMEOUT');
  return unavailableFailure('AGENT_RUNTIME_NETWORK_ERROR');
}

function nonRetryableUnavailableFailure(code: string): RuntimeFailure {
  return {
    kind: 'unavailable',
    code,
    retryable: false,
    schemaValid: null,
  };
}
