import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { SpreadsheetCell, SpreadsheetColumn } from '../domain/spreadsheet';

const MONEY_FORMAT = '#,##0.00';

@Injectable()
export class XlsxWriter {
  async write(
    columns: SpreadsheetColumn[],
    rows: SpreadsheetCell[][],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Requisições');

    sheet.columns = columns.map((column) => ({
      header: column.header,
      width: column.width,
    }));

    sheet.getRow(1).font = { bold: true };

    for (const row of rows) {
      sheet.addRow(
        row.map((cell) =>
          cell.amount === undefined ? cell.text : cell.amount,
        ),
      );
    }

    columns.forEach((column, index) => {
      if (column.money) {
        sheet.getColumn(index + 1).numFmt = MONEY_FORMAT;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
  }
}
