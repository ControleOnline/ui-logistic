export const FISCAL_DOCUMENT_CONFIGS = {
  nfce: {
    key: 'nfce',
    title: 'NFC-e',
    pendingLabel: 'Pedidos sem NFC-e',
    emittedLabel: 'NFC-e emitidas',
    documentType: 'nfce',
    invoiceModel: 65,
    integrationQueue: 'NfceEmission',
  },
  nfe: {
    key: 'nfe',
    title: 'NF-e',
    pendingLabel: 'Pedidos sem NF-e',
    emittedLabel: 'NF-e emitidas',
    documentType: 'nfe',
    invoiceModel: 55,
    integrationQueue: 'NfeEmission',
  },
  nfse: {
    key: 'nfse',
    title: 'NFSe',
    pendingLabel: 'Pedidos sem NFSe',
    emittedLabel: 'NFSe emitidas',
    documentType: 'nfse',
    invoiceModel: null,
    fiscalType: 'NFSE',
    integrationQueue: 'NfseEmission',
  },
};

export const FISCAL_DOCUMENT_TYPE_KEYS = Object.keys(FISCAL_DOCUMENT_CONFIGS);

export const resolveFiscalDocumentConfig = value => {
  const key = String(value || '').toLowerCase();
  return FISCAL_DOCUMENT_CONFIGS[key] || null;
};

export const buildFiscalDocumentRequestParams = (config, tab) => {
  if (tab === 'pending') {
    return {documentType: config.documentType};
  }

  if (tab === 'emitted') {
    return config.invoiceModel
      ? {invoiceModel: config.invoiceModel}
      : {fiscalType: config.fiscalType};
  }

  return {queueName: config.integrationQueue};
};

const fiscalDocumentOf = row => (row && typeof row.fiscalDocument === 'object' ? row.fiscalDocument : {}) || {};

export const resolveInvoiceTaxId = value => {
  if (value && typeof value === 'object') {
    return resolveInvoiceTaxId(value.id ?? value.value ?? value['@id'] ?? '');
  }
  return String(value || '').replace(/\D+/g, '');
};

export const resolveFiscalSeries = row =>
  String(fiscalDocumentOf(row).series ?? row?.fiscalSeries ?? row?.serie ?? '').trim();

export const resolveFiscalNumber = row =>
  String(fiscalDocumentOf(row).number ?? row?.fiscalNumber ?? row?.invoiceNumber ?? '').trim();

export const resolveFiscalProtocol = row =>
  String(fiscalDocumentOf(row).protocol ?? row?.fiscalProtocol ?? row?.protocol ?? '').trim();

export const resolveFiscalStatus = row => {
  const status = row?.status;
  if (status && typeof status === 'object') {
    return String(status.status || status.realStatus || status.label || '').trim();
  }
  return String(status || row?.realStatus || '').trim();
};

export const resolveNfceSeries = resolveFiscalSeries;
export const resolveNfceNumber = resolveFiscalNumber;
export const resolveNfceProtocol = resolveFiscalProtocol;
export const resolveNfceStatus = resolveFiscalStatus;

export const isValidFiscalDocument = row =>
  Boolean(resolveInvoiceTaxId(row) && resolveFiscalSeries(row) && resolveFiscalNumber(row));

export const isValidNfceDocument = isValidFiscalDocument;

export const buildFiscalPdfFilename = (row, documentType) => {
  const prefix = {nfce: 'NFC-E', nfe: 'NFE', nfse: 'NFSE'}[String(documentType || '').toLowerCase()] || 'NF';
  const series = resolveFiscalSeries(row) || 'SEM-SERIE';
  const number = resolveFiscalNumber(row) || 'SEM-NUMERO';
  return `${prefix}-${series}-${number}.pdf`;
};

export const buildNfcePdfFilename = row => buildFiscalPdfFilename(row, 'nfce');

export const NFCE_EMITTED_COLUMNS = [
  {name: 'id', label: 'ID', isIdentity: true, editable: false, externalFilter: true},
  {name: 'fiscalSeries', label: 'Série', editable: false, externalFilter: true, format: (_, row) => resolveFiscalSeries(row) || '--'},
  {name: 'fiscalNumber', label: 'Número', editable: false, externalFilter: true, format: (_, row) => resolveFiscalNumber(row) || '--'},
  {name: 'fiscalProtocol', label: 'Protocolo', editable: false, externalFilter: true, format: (_, row) => resolveFiscalProtocol(row) || '--'},
  {name: 'status', label: 'Status', editable: false, externalFilter: true, format: (_, row) => resolveFiscalStatus(row) || '--'},
  {name: 'invoiceTotal', label: 'Total', type: 'money', summary: 'sum', editable: false, align: 'right', externalFilter: true},
];

export const EMIT_PAGE_BY_TYPE = {nfce: 'NfceEmitPage', nfe: 'NfeEmitPage', nfse: 'NfseEmitPage'};
export const DETAIL_PAGE_BY_TYPE = {nfce: 'NfceDetailPage', nfe: 'NfeDetailPage', nfse: 'NfseDetailPage'};
export const LIST_PAGE_BY_TYPE = {nfce: 'NfcePage', nfe: 'NfePage', nfse: 'NfsePage'};
