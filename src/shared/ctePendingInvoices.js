export const CTE_PENDING_ENDPOINT = '/invoice_taxes/without-cte';
export const CTE_PAGE_PATH = 'cte';
export const CTE_SMOKE_META = {
  fluxo: 'logistica-entrega',
  steps: ['listar-nfs-sem-cte', 'agrupar-empresa-endereco', 'resumo-rota'],
};

export const CTE_PENDING_COLUMNS = [
  {
    name: 'companyName',
    label: 'Empresa',
    grouping: true,
    editable: false,
  },
  {
    name: 'addressLabel',
    label: 'Endereço',
    grouping: true,
    editable: false,
  },
  {
    name: 'clientName',
    label: 'Destinatário',
    editable: false,
  },
  {
    name: 'invoiceNumber',
    label: 'NF',
    isIdentity: true,
    editable: false,
  },
  {
    name: 'invoiceModel',
    label: 'Modelo',
    editable: false,
  },
  {
    name: 'invoiceKey',
    label: 'Chave',
    editable: false,
  },
  {
    name: 'invoiceTotal',
    label: 'Total',
    type: 'money',
    summary: 'sum',
    editable: false,
    align: 'right',
  },
];

export const normalizeText = value => String(value ?? '').trim();

export const normalizeEntityId = value => {
  if (value && typeof value === 'object') {
    return normalizeEntityId(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value).replace(/\D+/g, '');
};

export const toMoneyNumber = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export const formatMoney = value =>
  toMoneyNumber(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const unwrapInvoiceCollection = response => {
  if (Array.isArray(response?.groups) && response.groups.length > 0) {
    return {
      invoices: Array.isArray(response?.member)
        ? response.member
        : Array.isArray(response?.['hydra:member'])
          ? response['hydra:member']
          : response.groups.flatMap(group => group.invoices || []),
      groups: response.groups,
      totalItems: Number(response.totalItems || 0),
      totalValue: toMoneyNumber(response.totalValue),
    };
  }

  const invoices = Array.isArray(response?.member)
    ? response.member
    : Array.isArray(response?.['hydra:member'])
      ? response['hydra:member']
      : Array.isArray(response)
        ? response
        : [];

  return {
    invoices,
    groups: groupInvoicesByCompanyAddress(invoices),
    totalItems: invoices.length,
    totalValue: invoices.reduce((sum, invoice) => sum + toMoneyNumber(invoice?.invoiceTotal), 0),
  };
};

export const buildGroupKey = invoice =>
  `${normalizeEntityId(invoice?.companyId) || 'none'}:${normalizeEntityId(invoice?.addressId) || 'none'}`;

export const groupInvoicesByCompanyAddress = invoices => {
  const groups = new Map();

  (Array.isArray(invoices) ? invoices : []).forEach(invoice => {
    const key = buildGroupKey(invoice);
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        companyId: normalizeEntityId(invoice?.companyId) || null,
        companyName: normalizeText(invoice?.companyName) || 'Empresa não informada',
        addressId: normalizeEntityId(invoice?.addressId) || null,
        addressLabel: normalizeText(invoice?.addressLabel) || 'Endereço não informado',
        invoices: [],
        invoiceCount: 0,
        totalValue: 0,
      });
    }

    const group = groups.get(key);
    group.invoices.push(invoice);
    group.invoiceCount += 1;
    group.totalValue = Number((group.totalValue + toMoneyNumber(invoice?.invoiceTotal)).toFixed(2));
  });

  return Array.from(groups.values());
};

export const buildRouteSummary = (groups, selectedIds) => {
  const selected = new Set((selectedIds || []).map(id => String(id)));
  const selectedGroups = (Array.isArray(groups) ? groups : []).filter(group =>
    (group.invoices || []).some(invoice => selected.has(String(invoice.id))),
  );

  const selectedInvoices = selectedGroups.flatMap(group =>
    (group.invoices || []).filter(invoice => selected.has(String(invoice.id))),
  );

  return {
    groupCount: selectedGroups.length,
    invoiceCount: selectedInvoices.length,
    totalValue: Number(
      selectedInvoices.reduce((sum, invoice) => sum + toMoneyNumber(invoice?.invoiceTotal), 0).toFixed(2),
    ),
    companies: selectedGroups.map(group => group.companyName),
    addresses: selectedGroups.map(group => group.addressLabel),
  };
};

export const buildTableSummary = routeSummary => ({
  count: {
    invoices: routeSummary.invoiceCount,
    groups: routeSummary.groupCount,
  },
  sum: {
    invoiceTotal: routeSummary.totalValue,
  },
});
