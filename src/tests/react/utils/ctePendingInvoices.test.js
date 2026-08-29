const {
  buildRouteSummary,
  CTE_SMOKE_META,
  groupInvoicesByCompanyAddress,
  unwrapInvoiceCollection,
} = require('../../../shared/ctePendingInvoices');

const {describe, expect, it} = global;

describe('ctePendingInvoices', () => {
  const invoices = [
    {
      id: 1,
      invoiceNumber: 100,
      invoiceTotal: 10,
      companyId: 3,
      companyName: 'Alpha',
      addressId: 9,
      addressLabel: 'Rua A, 10',
    },
    {
      id: 2,
      invoiceNumber: 101,
      invoiceTotal: 15.5,
      companyId: 3,
      companyName: 'Alpha',
      addressId: 9,
      addressLabel: 'Rua A, 10',
    },
    {
      id: 3,
      invoiceNumber: 200,
      invoiceTotal: 7,
      companyId: 8,
      companyName: 'Beta',
      addressId: 4,
      addressLabel: 'Rua B, 20',
    },
  ];

  it('declares the logistics delivery smoke manifesto', () => {
    expect(CTE_SMOKE_META.fluxo).toBe('logistica-entrega');
    expect(CTE_SMOKE_META.steps).toEqual([
      'listar-nfs-sem-cte',
      'agrupar-empresa-endereco',
      'resumo-rota',
    ]);
  });

  it('groups invoices by company and address and totals each group', () => {
    const groups = groupInvoicesByCompanyAddress(invoices);
    expect(groups).toHaveLength(2);
    expect(groups[0].invoiceCount).toBe(2);
    expect(groups[0].totalValue).toBe(25.5);
    expect(groups[1].companyName).toBe('Beta');
  });

  it('builds a route summary from the current selection', () => {
    const groups = groupInvoicesByCompanyAddress(invoices);
    const summary = buildRouteSummary(groups, [1, 3]);
    expect(summary.groupCount).toBe(2);
    expect(summary.invoiceCount).toBe(2);
    expect(summary.totalValue).toBe(17);
  });

  it('unwraps the without-cte collection without going through orders', () => {
    const collection = unwrapInvoiceCollection({
      member: invoices,
      totalItems: 3,
      totalValue: 32.5,
    });
    expect(collection.groups).toHaveLength(2);
    expect(collection.totalItems).toBe(3);
  });
});
