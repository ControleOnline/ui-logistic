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
