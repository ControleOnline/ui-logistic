import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const moduleRoot = path.resolve(new URL('../../../../', import.meta.url).pathname);
const appRoot = path.resolve(moduleRoot, '../../..');
const read = file => fs.readFileSync(path.join(moduleRoot, file), 'utf8');
const readApp = file => fs.readFileSync(path.join(appRoot, file), 'utf8');

test('fiscal auxiliary store contains the CT-e catalogs', () => {
  const source = read('src/store/fiscal_auxiliary.js');
  for (const name of ['modals', 'serviceTypes', 'cteTypes', 'takers', 'fiscalModels']) {
    assert.match(source, new RegExp(`${name}:`));
  }
  assert.match(source, /actions,\s*getters,\s*mutations/);
  assert.match(readApp('src/store/stores.js'), /fiscal_auxiliary/);
});

test('all fiscal emitters consume the shared fiscal model catalog', () => {
  const source = read('src/react/pages/fiscal/FiscalEmitPage.js');
  assert.match(source, /useStore\('fiscal_auxiliary'\)/);
  assert.match(source, /FiscalModelField/);
  for (const [wrapper, type] of [['NfceEmitPage.js', 'nfce'], ['NfeEmitPage.js', 'nfe'], ['NfseEmitPage.js', 'nfse']]) {
    const wrapperSource = read(`src/react/pages/fiscal/${wrapper}`);
    assert.match(wrapperSource, /FiscalEmitPage/);
    assert.match(wrapperSource, new RegExp(`documentType="${type}"`));
  }
});

test('fiscal emitter sends the selected orders in one emission request', () => {
  const source = read('src/react/pages/fiscal/FiscalEmitPage.js');
  assert.match(source, /body:\s*\{orderIds:\s*activeIds\}/);
  assert.match(source, /orders\/\$\{activeIds\[0\]\}\/nfe/);
  assert.doesNotMatch(source, /for \(const id of activeIds\)/);
});

test('CT-e emitter uses selectors for auxiliary codes', () => {
  const source = read('src/react/pages/cte/CteEmitPage.js');
  for (const field of ['Modal', 'Tipo de serviço', 'Tipo do CT-e', 'Tomador']) {
    assert.match(source, new RegExp(`FiscalAuxiliarySelect label="${field}"`));
  }
  assert.doesNotMatch(source, /InputField label="(Modal|Tipo de serviço|Tipo do CT-e|Tomador)"/);
});

test('fiscal details use the CT-e-compatible shared layout', () => {
  const routes = read('src/react/router/routes.js');
  const layout = read('src/react/pages/fiscal/FiscalDocumentDetailLayout.js');
  assert.match(routes, /FiscalDocumentDetailLayout/);
  assert.match(layout, /order_invoice_taxes/);
  assert.doesNotMatch(layout, /\.fetch\('orders'/);
  assert.match(layout, /downloadFiscalXml/);
  assert.match(read('src/react/pages/fiscal/FiscalDocumentActions.js'), /format: 'xml'/);
  assert.match(read('src/react/pages/cte/CteCteActions.js'), /cte-row-xml/);
  assert.match(read('src/react/pages/cte/CteDetailPage.js'), /cte-detail-xml/);
  assert.match(read('src/shared/fiscalDocuments.js'), /extractFiscalDocumentFromXml/);
  assert.match(layout, /extractFiscalDocumentFromXml\(document\?\.invoice/);
  assert.match(layout, /setOrders\(referencedOrders\)/);
  assert.match(layout, /return \{id: idOf\(order\), '@id': order\}/);
  for (const token of [
    'summaryBar',
    'partyGrid',
    'Dados fiscais',
    'FiscalModelField',
    'Modal',
    'iframe',
    'downloadFiscalPdf',
    'Pedidos desta NF',
  ]) {
    assert.match(layout, new RegExp(token));
  }
});

test('integration store is registered from the default store and fiscal tabs guard bootstrap', () => {
  const stores = readApp('src/store/stores.js');
  const page = read('src/react/pages/fiscal/FiscalDocumentsPage.js');
  assert.match(stores, /import integration from '@controleonline\/ui-common\/src\/store\/integration'/);
  assert.match(stores, /\bintegration,\n/);
  assert.doesNotMatch(page, /integrationStore/);
  assert.doesNotMatch(page, /setFilters/);
});

test('fiscal configuration exposes only runtime-backed shared fields', () => {
  const catalog = readApp('modules/controleonline/ui-common/src/react/pages/integrationsCatalog.js');
  assert.match(catalog, /receita-federal-state-registration/);
  assert.match(catalog, /receita-federal-ibge-code/);
  assert.match(catalog, /receita-federal-certificate-password/);
  for (const unusedKey of ['receita-federal-nfce-csc-id', 'receita-federal-nfce-csc', 'receita-federal-prenota-enabled', 'receita-federal-nfce-enabled']) {
    assert.doesNotMatch(catalog, new RegExp(unusedKey));
  }
});
