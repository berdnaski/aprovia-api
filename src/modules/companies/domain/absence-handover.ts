export abstract class IAbsenceHandover {
  abstract handOver(
    companyId: string,
    fromMemberId: string,
    toMemberId: string,
  ): Promise<number>;
}
