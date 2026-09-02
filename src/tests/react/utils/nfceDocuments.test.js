const {
  buildNfcePdfFilename,
  isValidNfceDocument,
  resolveInvoiceTaxId,
  resolveNfceNumber,
  resolveNfceProtocol,
  resolveNfceSeries,
  resolveNfceStatus,
} = require('../../../shared/fiscalDocuments');

const {describe, expect, it} = global;

describe('NFC-e document helpers', () => {
  const row = {
    id: '/invoice_taxes/88',
    fiscalSeries: '1',
    fiscalNumber: '204',
    fiscalProtocol: '135260000012345',
    status: {status: 'autorizada', realStatus: 'closed'},
  };

  it('resolves InvoiceTax id and stored series/number/protocol/status', () => {
    expect(resolveInvoiceTaxId(row)).toBe('88');
    expect(resolveNfceSeries(row)).toBe('1');
    expect(resolveNfceNumber(row)).toBe('204');
    expect(resolveNfceProtocol(row)).toBe('135260000012345');
    expect(resolveNfceStatus(row)).toBe('autorizada');
  });

  it('builds NFC-E-SERIE-NUMERO.pdf from stored fields', () => {
    expect(buildNfcePdfFilename(row)).toBe('NFC-E-1-204.pdf');
  });

  it('keeps actions unavailable without a valid document', () => {
    expect(isValidNfceDocument(row)).toBe(true);
    expect(isValidNfceDocument({id: 88})).toBe(false);
    expect(isValidNfceDocument({fiscalSeries: '1', fiscalNumber: '204'})).toBe(false);
  });
});
