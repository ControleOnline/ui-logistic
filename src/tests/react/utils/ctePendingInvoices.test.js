const {
  buildRouteSummary,
  CTE_SMOKE_META,
  CTE_FISCAL_COLUMNS,
  groupInvoicesByCompanyAddress,
  mergeCteDefaults,
  missingCteFields,
  unwrapInvoiceCollection,
} = require('../../../shared/ctePendingInvoices');
const fs = require('node:fs');
const path = require('node:path');

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

  it('separates invoices that cannot share the same CTe', () => {
    const groups = groupInvoicesByCompanyAddress([
      {...invoices[0], clientId: 10, cteDefaults: {cfop: '5932', tomador: '0'}},
      {...invoices[1], clientId: 11, cteDefaults: {cfop: '5932', tomador: '0'}},
      {...invoices[2], companyId: 3, addressId: 9, clientId: 10, cteDefaults: {cfop: '6932', tomador: '0'}},
    ]);

    expect(groups).toHaveLength(3);
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

  it('marks inferred CTe values as readonly when all NFs agree', () => {
    const result = mergeCteDefaults([
      {cteDefaults: {cfop: '6932', tomador: '0'}},
      {cteDefaults: {cfop: '6932', tomador: '0'}},
    ]);

    expect(result.defaults.cfop).toBe('6932');
    expect(result.defaults.tomador).toBe('0');
    expect(result.readonlyFields).toEqual(expect.arrayContaining(['cfop', 'tomador']));
  });

  it('keeps missing or divergent CTe values editable and required', () => {
    const result = mergeCteDefaults([
      {cteDefaults: {cfop: '5932'}},
      {cteDefaults: {cfop: '6932'}},
    ]);

    expect(result.defaults.cfop).toBeUndefined();
    expect(result.readonlyFields).not.toContain('cfop');
    expect(missingCteFields({...result.defaults, valorFrete: '', valorReceber: ''})).toEqual(
      expect.arrayContaining(['cfop', 'tomador', 'valorFrete', 'valorReceber']),
    );
  });

  it('declares filterable fiscal CTe columns for emitted and processing lists', () => {
    const columns = CTE_FISCAL_COLUMNS.map(column => column.name);
    expect(columns).toEqual(['fiscalSeries', 'fiscalNumber', 'invoiceKey', 'fiscalProtocol']);
    expect(CTE_FISCAL_COLUMNS.find(column => column.name === 'fiscalNumber')?.label).toBe('CT-e');
    expect(CTE_FISCAL_COLUMNS.every(column => column.externalFilter === true)).toBe(true);
  });

  it('opens CTe fiscal settings through ui-accounting ownership', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '../../../react/pages/cte/CtePendingInvoicesPage.js'),
      'utf8',
    );
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8'),
    );

    expect(page).toMatch(/cte-fiscal-config-button/);
    expect(page).toMatch(/@controleonline\/ui-accounting\/src\/react\/components\/fiscal\/CteFiscalConfig/);
    expect(page).not.toMatch(/IntegrationConfigPage/);
    expect(manifest.dependencies['@controleonline/ui-accounting']).toBe('*');
    expect(page).toMatch(/queueName: 'CteEmission'/);
  });

  it('registers dedicated NF-e, NFC-e and NFSe routes', () => {
    const routes = fs.readFileSync(
      path.resolve(__dirname, '../../../react/router/routes.js'),
      'utf8',
    );

    expect(routes).toMatch(/path: 'nfce'/);
    expect(routes).toMatch(/path: 'nfce\/detail'/);
    expect(routes).toMatch(/path: 'nfe'/);
    expect(routes).toMatch(/path: 'nfse'/);
    expect(routes).toMatch(/FiscalDocumentsPage/);
    expect(routes).toMatch(/NfceDetailPage/);
  });

  it('exposes a configuration action for each fiscal document screen', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '../../../react/pages/fiscal/FiscalDocumentsPage.js'),
      'utf8',
    );

    expect(page).toMatch(/\$\{config\.key\}-fiscal-config-button/);
    expect(page).toMatch(/NfceFiscalConfig/);
    expect(page).toMatch(/NfeFiscalConfig/);
    expect(page).toMatch(/NfseFiscalConfig/);
    expect(page).toMatch(/NfceEmittedActions/);
  });
});
