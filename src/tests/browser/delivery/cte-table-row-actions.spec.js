/**
 * fluxo: outros
 * flowchartIds: [1]
 * https://admin.controleonline.com/admin/flowcharts/1
 *
 * ui-default#25 — aba CTE em modo tabela mostra coluna Ações (PDF + Detalhe).
 * Cards permanece com as mesmas ações; sem rowActions não cria coluna fantasma.
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
    title: 'CTE tab table mode: row actions PDF + Detalhe',
    issue: 'ControleOnline/ui-default#25',
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

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
});

const CTE = {
  '@id': '/invoice_taxes/7',
  id: 7,
  invoiceNumber: 57662166,
  invoiceModel: 57,
  invoiceTotal: 250,
  company: {name: 'Emitente Smoke'},
  client: {name: 'Destinatario Smoke'},
  status: {status: 'Autorizado', color: '#166534'},
};

const mockCteApi = async page => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    if (pathname === 'people/3' || pathname === 'people/7') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({id: 3, name: 'Empresa Smoke', '@id': '/people/3'}),
      });
    }

    const cteCollection =
      pathname === 'invoice_taxes' ||
      pathname === 'invoice_tasks' ||
      pathname === 'invoice_tasks_processing';
    if (cteCollection) {
      const model = url.searchParams.get('invoiceModel');
      const members = model === '57' || pathname !== 'invoice_taxes' ? [CTE] : [];
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(members)),
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

const forceTableView = async page => {
  const toggle = page.getByTestId('default-table-view-toggle');
  if ((await toggle.count()) === 0) return;
  const header = page.getByTestId('default-table-row-actions-header');
  if ((await header.count()) === 0) {
    await toggle.first().click();
  }
};

test.describe('cte table row actions browser smoke (#25)', () => {
  test('table mode shows PDF and Detalhe; cards keep the same actions', async ({page}) => {
    const outputDir = path.join(process.cwd(), 'test-results', 'cte-table-row-actions');
    evidenceSteps.length = 0;
    const api = await mockCteApi(page);

    await page.goto('/cte');
    await expect(page.getByText(/^CT-e$/i).first()).toBeVisible({timeout: 20000});
    await writeEvidence(page, outputDir, '01-cte-pending', 'Lista CT-e aba pendentes');

    await page.getByText(/^CTE$/).first().click();
    await expect(page.getByText('57662166').first()).toBeVisible({timeout: 15000});
    await writeEvidence(page, outputDir, '02-cte-tab', 'Aba CTE após selecionar');

    await forceTableView(page);
    await expect(page.getByTestId('default-table-row-actions-header').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId('cte-row-pdf').first()).toBeVisible();
    await expect(page.getByTestId('cte-row-detail').first()).toBeVisible();
    await writeEvidence(page, outputDir, '03-cte-table-actions', 'Modo tabela com coluna Ações');

    await page.getByTestId('default-table-view-toggle').first().click();
    await expect(page.getByTestId('cte-row-pdf').first()).toBeVisible({timeout: 10000});
    await expect(page.getByTestId('cte-row-detail').first()).toBeVisible();
    await writeEvidence(page, outputDir, '04-cte-cards-actions', 'Modo cards mantém PDF e Detalhe');

    await page.getByTestId('default-table-view-toggle').first().click();
    await expect(page.getByTestId('default-table-row-actions-header').first()).toBeVisible({
      timeout: 10000,
    });
    await writeEvidence(page, outputDir, '05-cte-table-again', 'Volta ao modo tabela com Ações');

    const relevantErrors = api
      .getPageErrors()
      .filter(msg => /maximum update depth|is not defined|cannot read/i.test(msg));
    expect(relevantErrors).toEqual([]);

    const manifest = writeManifest(outputDir);
    expect(manifest.fluxo).toBe(FLOW_ID);
    expect(manifest.flowchartIds).toEqual(FLOWCHART_IDS);
    expect(manifest.steps.length).toBeGreaterThanOrEqual(5);
    for (const step of manifest.steps) {
      expect(fs.existsSync(path.join(outputDir, step.screenshot))).toBe(true);
    }
  });
});
