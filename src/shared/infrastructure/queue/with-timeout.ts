export const ENQUEUE_TIMEOUT_MS = 2000;

export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`fila não respondeu em ${ms}ms`)),
        ms,
      ).unref(),
    ),
  ]);
}
