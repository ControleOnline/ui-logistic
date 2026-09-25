// fluxo: outros | etapa: nfce-emitted-actions | https://github.com/ControleOnline/ui-logistic/wiki/NFC-e-Detalhe-e-PDF
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const actions = fs.readFileSync(new URL('../../../react/pages/fiscal/NfceEmittedActions.js', import.meta.url), 'utf8');
const detail = fs.readFileSync(new URL('../../../react/pages/fiscal/NfceDetailPage.js', import.meta.url), 'utf8');
const list = fs.readFileSync(new URL('../../../react/pages/fiscal/FiscalDocumentsPage.js', import.meta.url), 'utf8');

test('NFC-e emitted journey exposes detail, PDF and invalid-document safeguards', () => {
  assert.match(actions, /testID="nfce-row-detail"/);
  assert.match(actions, /testID="nfce-row-pdf"/);
  assert.match(actions, /NfceDetailPage/);
  assert.match(actions, /invoice_taxes\/\$\{id\}\/download-nf/);
  assert.match(actions, /testID="nfce-pdf-error"/);
  assert.match(actions, /disabled=\{!valid\}/);
  assert.match(detail, /testID="nfce-detail-pdf"/);
  assert.match(detail, /testID="nfce-detail-pdf-error"/);
  assert.match(detail, /resolveNfceProtocol/);
  assert.match(list, /NfceDocumentActions/);
});
