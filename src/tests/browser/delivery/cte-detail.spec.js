/**
 * fluxo: outros
 * flowchartIds: [1]
 * https://admin.controleonline.com/admin/flowcharts/1
 *
 * ui-logistic#34 — aba CTE → PDF (DACTE) → Detalhe read-only.
 * Justificativa fluxo outros: visualização fiscal de CT-e já emitido
 * não é jornada de venda/produção/POS; flowchartIds [1] ancora admin enabled.
 */
const fs = require('fs');
const path = require('path');
const {expect, test} = require('playwright/test');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');
const {version: appVersion} = require('../../../../../../../package.json');

const FLOW_ID = 'outros';
const FLOWCHART_IDS = [1];
const FLOWCHART_LINKS = FLOWCHART_IDS.map(
  id => `https://admin.controleonline.com/admin/flowcharts/${id}`,
);

const evidenceSteps = [];

const writeEvidence = async (page, outputDir, stepId, title) => {
  fs.mkdirSync(outputDir, {recursive: true});
  const fileName = `${stepId}.png`;
  await page.screenshot({path: path.join(outputDir, fileName), fullPage: true});
  evidenceSteps.push({id: stepId, title, screenshot: fileName, url: page.url()});
};

const writeManifest = outputDir => {
  const manifest = {
    fluxo: FLOW_ID,
    flowchartIds: FLOWCHART_IDS,
    flowchartLinks: FLOWCHART_LINKS,
    title: 'CTE tab: PDF DACTE + read-only detail',
    issue: 'ControleOnline/ui-logistic#34',
    steps: evidenceSteps,
  };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});
const textHeaders = () => ({...CORS_HEADERS, 'content-type': 'text/css; charset=utf-8'});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
});

const MINI_PDF_B64 =
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+ZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMjAwIDIwXS9Db250ZW50cyA0IDAgUj4+ZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj5zdHJlYW0KQlQKL0YxIDEyIFRmCjEwIDEwIFRkCihEQUNURSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIzIDAwMDAwIG4gCjAwMDAwMDAyMDQgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoyOTgKJSVFT0Y=';

const CTE = {
  '@id': '/invoice_taxes/7',
  id: 7,
  invoiceNumber: 57662166,
  invoiceKey: '35260800000000000000570000057662166',
  invoiceModel: 57,
  invoiceTotal: 250,
  weight: 12.5,
  company: {name: 'Emitente Smoke', alias: 'Emitente Smoke'},
  client: {name: 'Destinatario Smoke', alias: 'Destinatario Smoke'},
  provider: {name: 'Remetente Smoke', alias: 'Remetente Smoke'},
  carrier: {name: 'Transportadora Smoke', alias: 'Transportadora Smoke'},
  status: {status: 'Autorizado', realStatus: 'Autorizado', color: '#166534'},
  addressLabel: 'Rua Fiscal, 100',
  providerAddressLabel: 'Rua Origem, 10',
  clientAddressLabel: 'Rua Destino, 20',
  rntrc: '12345678',
};

const LINKED_NF = {
  '@id': '/invoice_taxes/11',
  id: 11,
  invoiceNumber: 501,
  invoiceModel: 55,
  invoiceTotal: 250,
  weight: 12.5,
  cte: 7,
  companyName: 'Emitente Smoke',
  clientName: 'Destinatario Smoke',
  providerName: 'Remetente Smoke',
};

const mockCteApi = async page => {
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(String(error?.message || error));
  });

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }
    if (pathname === 'themes-colors.css') {
      return route.fulfill({status: 200, headers: textHeaders(), body: ':root { --primary: #0ea5e9; }'});
    }
    if (pathname === 'runtime/ip') {
      return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify({ip: '127.0.0.1', member: [{ip: '127.0.0.1'}]})});
    }
    if (pathname === 'people/companies/my') {
      return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify(collection([{id: 3, name: 'Emitente Smoke', alias: 'Emitente Smoke'}]))});
    }
    if (pathname === 'devices' && method === 'GET') {
      return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify(collection([{id: 1, device: 'web', type: 'WEB'}]))});
    }
    if (pathname === 'people/company/default') {
      return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify({id: 3, name: 'Emitente Smoke', alias: 'Emitente Smoke', theme: {colors: {primary: '#0ea5e9'}}})});
    }
    if (pathname === 'people/7') {
      return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify({id: 7, name: 'Motoboy Teste', alias: 'Motoboy Teste'})});
    }

    if (pathname === 'invoice_taxes/7/download-nf' || pathname === 'invoice_taxes/11/download-nf') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          pdf: MINI_PDF_B64,
          filename: pathname.includes('/7/') ? 'dacte-7.pdf' : 'nfe-11.pdf',
        }),
      });
    }

    if (pathname === 'invoice_taxes/7') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(CTE),
      });
    }

    if (pathname === 'invoice_taxes/without-cte' || pathname.startsWith('invoice_taxes/without-cte')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({member: [], groups: [], totalItems: 0, totalValue: 0}),
      });
    }

    if (pathname === 'invoice_taxes') {
      const cteFilter = url.searchParams.get('cte');
      const model = url.searchParams.get('invoiceModel');
      if (cteFilter === '7') {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(collection([CTE, LINKED_NF])),
        });
      }
      if (model === '57') {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(collection([CTE])),
        });
      }
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([])),
      });
    }

    if (pathname === 'invoice_tasks_processing') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([CTE])),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({appVersion}) => {
      const set = (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          // ignore
        }
      };
      set(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_ADMIN'],
        }),
      );
      set('config', JSON.stringify({language: 'pt-br'}));
      set('app-type', 'ERP');
      set(
        'device',
        JSON.stringify({
          id: 'web',
          device: 'web',
          type: 'WEB',
          appVersion,
          buildNumber: appVersion,
        }),
      );
    },
    {appVersion},
  );

  return {getPageErrors: () => pageErrors};
};

test.describe('cte detail + PDF browser smoke (#34)', () => {
  test('CTE tab shows PDF and read-only detail without emit/remove', async ({page}) => {
    const outputDir = path.join(process.cwd(), 'test-results', 'cte-detail');
    evidenceSteps.length = 0;
    const api = await mockCteApi(page);

    await page.goto('/cte');
    await expect(page.getByText(/^CT-e$/i).first()).toBeVisible({timeout: 20000});
    await expect(page.getByText(/CTEs à emitir|CTEs a emitir/i).first()).toBeVisible({timeout: 15000});
    await writeEvidence(page, outputDir, '01-cte-pending-tab', 'Lista CT-e aba pendentes');

    await page.getByText(/^CTE$/).first().click();
    await expect(page.getByText('57662166').first()).toBeVisible({timeout: 15000});
    await expect(page.getByTestId('cte-row-pdf').first()).toBeVisible({timeout: 10000});
    await expect(page.getByTestId('cte-row-detail').first()).toBeVisible();
    await writeEvidence(page, outputDir, '02-cte-tab-actions', 'Aba CTE com ações PDF e Detalhe');

    await page.getByTestId('cte-row-pdf').first().click();
    await expect(page.getByText(/CT-e #57662166/i).first()).toBeVisible({timeout: 10000});
    await expect(page.locator('iframe[title*="CT-e #57662166"]').first()).toBeVisible({timeout: 10000});
    await writeEvidence(page, outputDir, '03-cte-pdf-modal', 'Modal PDF/DACTE do CT-e');

    await page.getByText(/^Fechar$/i).first().click();
    await expect(page.getByTestId('cte-row-detail').first()).toBeVisible({timeout: 8000});
    await writeEvidence(page, outputDir, '04-cte-tab-after-pdf', 'Aba CTE após fechar modal');

    await page.getByTestId('cte-row-detail').first().click();
    await expect(page.getByText(/Detalhe do CT-e/i).first()).toBeVisible({timeout: 15000});
    await expect(page.getByText(/somente leitura/i).first()).toBeVisible();
    await expect(page.getByText(/Emitente Smoke/i).last()).toBeVisible();
    await expect(page.getByText(/Destinatario Smoke/i).last()).toBeVisible();
    await expect(page.getByText(/NFs deste CT-e/i).first()).toBeVisible();
    await expect(page.getByText(/Enviar para fila/i)).toHaveCount(0);
    await expect(page.getByText(/somente leitura.*organização de rotas estão desativadas/i)).toBeVisible();
    await expect(page.getByTestId('cte-detail-pdf')).toBeVisible();
    await writeEvidence(page, outputDir, '05-cte-detail-readonly', 'Detalhe read-only sem emitir/remover');

    await page.getByTestId('cte-detail-pdf').click();
    await expect(page.getByText(/CT-e #57662166/i).first()).toBeVisible({timeout: 10000});
    await writeEvidence(page, outputDir, '06-cte-detail-pdf', 'PDF no cabeçalho do detalhe');

    const relevantErrors = api
      .getPageErrors()
      .filter(msg => /maximum update depth|is not defined|cannot read/i.test(msg));
    expect(relevantErrors).toEqual([]);

    const manifest = writeManifest(outputDir);
    expect(manifest.fluxo).toBe(FLOW_ID);
    expect(manifest.flowchartIds).toEqual(FLOWCHART_IDS);
    expect(manifest.steps.length).toBeGreaterThanOrEqual(6);
    for (const step of manifest.steps) {
      expect(fs.existsSync(path.join(outputDir, step.screenshot))).toBe(true);
    }
  });
});
