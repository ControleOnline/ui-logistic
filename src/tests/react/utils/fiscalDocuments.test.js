import {
  buildFiscalDocumentRequestParams,
  buildFiscalPdfFilename,
  isValidFiscalDocument,
  resolveFiscalDocumentConfig,
  resolveInvoiceTaxId,
} from '../../../shared/fiscalDocuments';

describe('fiscalDocuments NF-e / NFSe', () => {
  it('maps NF-e to model 55 and NFSe to fiscalType NFSE', () => {
    const nfe = resolveFiscalDocumentConfig('nfe');
    const nfse = resolveFiscalDocumentConfig('nfse');
    expect(nfe.invoiceModel).toBe(55);
    expect(buildFiscalDocumentRequestParams(nfe, 'emitted')).toEqual({invoiceModel: 55});
    expect(buildFiscalDocumentRequestParams(nfse, 'emitted')).toEqual({fiscalType: 'NFSE'});
    expect(buildFiscalDocumentRequestParams(nfe, 'pending')).toEqual({documentType: 'nfe'});
  });

  it('builds PDF names from stored series and number', () => {
    const row = {id: 91, fiscalDocument: {series: '1', number: '440', protocol: 'P1'}};
    expect(buildFiscalPdfFilename(row, 'nfe')).toBe('NFE-1-440.pdf');
    expect(buildFiscalPdfFilename(row, 'nfse')).toBe('NFSE-1-440.pdf');
    expect(isValidFiscalDocument(row)).toBe(true);
    expect(resolveInvoiceTaxId(row)).toBe('91');
  });

  it('disables actions when the document is incomplete', () => {
    expect(isValidFiscalDocument({id: 7})).toBe(false);
    expect(buildFiscalPdfFilename({}, 'nfe')).toBe('NFE-SEM-SERIE-SEM-NUMERO.pdf');
  });
});
