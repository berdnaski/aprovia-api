export const AllowedMimeType = {
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
} as const;

export type AllowedMimeType =
  (typeof AllowedMimeType)[keyof typeof AllowedMimeType];

interface Signature {
  mimeType: AllowedMimeType;
  offset: number;
  bytes: readonly number[];
  trailer?: { offset: number; bytes: readonly number[] };
}

const SIGNATURES: readonly Signature[] = [
  { mimeType: AllowedMimeType.PDF, offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  {
    mimeType: AllowedMimeType.PNG,
    offset: 0,
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mimeType: AllowedMimeType.JPEG, offset: 0, bytes: [0xff, 0xd8, 0xff] },
  {
    mimeType: AllowedMimeType.WEBP,
    offset: 0,
    bytes: [0x52, 0x49, 0x46, 0x46],
    trailer: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  },
];

function matches(buffer: Buffer, offset: number, bytes: readonly number[]) {
  if (buffer.length < offset + bytes.length) {
    return false;
  }

  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

export function detectMimeType(buffer: Buffer): AllowedMimeType | null {
  for (const signature of SIGNATURES) {
    if (!matches(buffer, signature.offset, signature.bytes)) {
      continue;
    }

    if (
      signature.trailer &&
      !matches(buffer, signature.trailer.offset, signature.trailer.bytes)
    ) {
      continue;
    }

    return signature.mimeType;
  }

  return null;
}

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return Object.values(AllowedMimeType).includes(value as AllowedMimeType);
}
