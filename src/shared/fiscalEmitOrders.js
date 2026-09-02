const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');
const selectedOrdersCache = new Map();

export const selectFiscalOrders = (items, ids) => {
  const selectedIds = new Set((Array.isArray(ids) ? ids : []).map(String));
  return (Array.isArray(items) ? items : []).filter(row => selectedIds.has(rowId(row)));
};

export const fetchSelectedFiscalOrders = ({ids, provider, fetcher}) => {
  const selectedIds = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean))];
  const key = `${String(provider || '').trim()}|${selectedIds.join(',')}`;
  const cached = selectedOrdersCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = Promise.resolve(fetcher('orders', {
    params: {id: selectedIds, provider, itemsPerPage: selectedIds.length, page: 1},
  })).then(response => response?.member || response?.['hydra:member'] || []).catch(error => {
    selectedOrdersCache.delete(key);
    throw error;
  });
  selectedOrdersCache.set(key, {promise, expiresAt: Date.now() + 30000});
  return promise;
};

export const clearSelectedFiscalOrdersCache = () => selectedOrdersCache.clear();
