const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');

export const selectFiscalOrders = (items, ids) => {
  const selectedIds = new Set((Array.isArray(ids) ? ids : []).map(String));
  return (Array.isArray(items) ? items : []).filter(row => selectedIds.has(rowId(row)));
};

