import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  ipAddress: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  context: RequestContext,
  work: () => T,
): T {
  return storage.run(context, work);
}

export function currentIpAddress(): string | null {
  return storage.getStore()?.ipAddress ?? null;
}
