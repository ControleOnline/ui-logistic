import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync(new URL('../../../react/pages/fiscal/FiscalDocumentsPage.js', import.meta.url), 'utf8');
const actions = fs.readFileSync(new URL('../../../react/pages/fiscal/FiscalDocumentActions.js', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../../../react/router/routes.js', import.meta.url), 'utf8');

test('all fiscal document lists expose the same emitted actions and detail route', () => {
  assert.match(page, /NfceDocumentActions/);
  assert.match(page, /NfeDocumentActions/);
  assert.match(page, /NfseDocumentActions/);
  assert.match(page, /CteIntegrationActions/);
  assert.match(page, /showRowActions=\{Boolean\(rowActionsComponent\)\}/);
  assert.match(actions, /download-nf/);
  assert.match(actions, /FiscalDocumentDetailPage/);
  assert.match(routes, /name: 'FiscalDocumentDetailPage'/);
});
