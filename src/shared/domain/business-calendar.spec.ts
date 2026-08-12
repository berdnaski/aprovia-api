import {
  addBusinessHours,
  isBusinessDay,
  nationalHolidays,
} from './business-calendar';

function brt(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

function toBrt(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

describe('isBusinessDay', () => {
  const cases: [string, string, boolean][] = [
    ['segunda comum', '2026-08-10T10:00:00', true],
    ['sexta comum', '2026-08-14T10:00:00', true],
    ['sábado', '2026-08-15T10:00:00', false],
    ['domingo', '2026-08-16T10:00:00', false],
    ['Natal', '2026-12-25T10:00:00', false],
    ['Independência', '2026-09-07T10:00:00', false],
  ];

  it.each(cases)('%s', (_label, iso, expected) => {
    expect(isBusinessDay(brt(iso))).toBe(expected);
  });

  it('reconhece os feriados móveis de 2026 (Páscoa em 05/04)', () => {
    const holidays = nationalHolidays(2026);

    expect(holidays.has('2026-02-16')).toBe(true);
    expect(holidays.has('2026-02-17')).toBe(true);
    expect(holidays.has('2026-04-03')).toBe(true);
    expect(holidays.has('2026-06-04')).toBe(true);
  });

  it('acompanha a Páscoa em outro ano (2027, Páscoa em 28/03)', () => {
    expect(nationalHolidays(2027).has('2027-03-26')).toBe(true);
  });
});

describe('addBusinessHours', () => {
  it('não escalona no domingo: sexta 17h + 72h úteis cai na quarta', () => {
    const due = addBusinessHours(brt('2026-08-14T17:00:00'), 72);

    expect(toBrt(due)).toContain('19/08/2026');
    expect(isBusinessDay(due)).toBe(true);
  });

  it('sexta 17h + 24h úteis cai na segunda, não no sábado', () => {
    const due = addBusinessHours(brt('2026-08-14T17:00:00'), 24);

    expect(toBrt(due)).toContain('17/08/2026');
  });

  it('atravessa feriado emendado: quinta antes da Sexta-Feira Santa', () => {
    const due = addBusinessHours(brt('2026-04-02T12:00:00'), 24);

    expect(toBrt(due)).toContain('06/04/2026');
  });

  it('dentro do mesmo dia útil soma direto', () => {
    const due = addBusinessHours(brt('2026-08-10T09:00:00'), 5);

    expect(toBrt(due)).toContain('10/08/2026');
    expect(toBrt(due)).toContain('14:00');
  });

  it('partindo de um sábado, o prazo só começa na segunda', () => {
    const due = addBusinessHours(brt('2026-08-15T10:00:00'), 8);

    expect(toBrt(due)).toContain('17/08/2026');
    expect(toBrt(due)).toContain('08:00');
  });

  it('prazo zero devolve o próprio instante', () => {
    const from = brt('2026-08-10T09:00:00');

    expect(addBusinessHours(from, 0)).toBe(from);
  });
});
