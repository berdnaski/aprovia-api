const CODE_PATTERN = /^\d+(\.\d+)*$/;

export function normalizeAccountCode(code: string): string {
  return code.trim().replace(/\s+/g, '');
}

export function isValidAccountCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function parentCodeOf(code: string): string | null {
  const separator = code.lastIndexOf('.');
  return separator === -1 ? null : code.slice(0, separator);
}

export function accountDepth(code: string): number {
  return code.split('.').length;
}

export function compareAccountCodes(left: string, right: string): number {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);

  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? -1) - (b[index] ?? -1);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}
