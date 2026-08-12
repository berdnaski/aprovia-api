import {
  AllowedMimeType,
  detectMimeType,
  isAllowedMimeType,
} from './file-signature';

const withSignature = (bytes: number[], padding = 32): Buffer =>
  Buffer.concat([Buffer.from(bytes), Buffer.alloc(padding)]);

describe('file-signature', () => {
  it('detecta PDF', () => {
    expect(detectMimeType(withSignature([0x25, 0x50, 0x44, 0x46]))).toBe(
      AllowedMimeType.PDF,
    );
  });

  it('detecta PNG', () => {
    expect(
      detectMimeType(
        withSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(AllowedMimeType.PNG);
  });

  it('detecta JPEG', () => {
    expect(detectMimeType(withSignature([0xff, 0xd8, 0xff]))).toBe(
      AllowedMimeType.JPEG,
    );
  });

  it('detecta WEBP exigindo o marcador na posição 8', () => {
    const webp = Buffer.concat([
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
      Buffer.alloc(4),
      Buffer.from([0x57, 0x45, 0x42, 0x50]),
    ]);

    expect(detectMimeType(webp)).toBe(AllowedMimeType.WEBP);
  });

  it('rejeita RIFF que não é WEBP', () => {
    const wav = Buffer.concat([
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
      Buffer.alloc(4),
      Buffer.from([0x57, 0x41, 0x56, 0x45]),
    ]);

    expect(detectMimeType(wav)).toBeNull();
  });

  it('extensão trocada não engana: executável renomeado para .pdf é rejeitado', () => {
    const elf = withSignature([0x7f, 0x45, 0x4c, 0x46]);

    expect(detectMimeType(elf)).toBeNull();
  });

  it('rejeita buffer menor que a assinatura', () => {
    expect(detectMimeType(Buffer.from([0x25, 0x50]))).toBeNull();
  });

  it('rejeita buffer vazio', () => {
    expect(detectMimeType(Buffer.alloc(0))).toBeNull();
  });

  it('reconhece apenas os mime types permitidos', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(true);
    expect(isAllowedMimeType('application/x-msdownload')).toBe(false);
  });
});
