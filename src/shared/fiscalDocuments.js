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

export const extractFiscalDocumentFromXml = (xml, model = 0) => {
  if (typeof xml !== 'string' || !xml.trim() || typeof DOMParser === 'undefined') return {};
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const read = name => document.getElementsByTagNameNS('*', name)[0]?.textContent?.trim() || '';
  const resolvedModel = Number(model) || Number(read('mod')) || 0;
  const isCte = resolvedModel === 57 || /<\s*(?:cteProc|CTe)\b/i.test(xml);
  return {
    model: resolvedModel || null,
    series: read('serie'),
    number: read(isCte ? 'nCT' : 'nNF'),
    key: read(isCte ? 'chCTe' : 'chNFe'),
    issuedAt: read('dhEmi'),
    cfop: read('CFOP'),
    protocol: read('nProt'),
    authorizationStatus: read('cStat'),
    authorizationMessage: read('xMotivo'),
    authorizedAt: read('dhRecbto'),
    total: read(isCte ? 'vTPrest' : 'vNF'),
  };
};

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
