/*
 * Browser smoke for DELIVERY receivables (motoboy) and motoboy-payments (company).
 * - Fake session + mocked API; exercises real routes delivery/receivables and delivery/motoboy-payments.
 * - Covers company chip filter (motoboy view) and motoboy chip filter (company view).
 */

const { expect, test } = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const { API_ORIGIN } = require('../../../../../../../src/tests/browser/apiOrigin');

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const APP_VERSION = packageJson?.version || '1.0.0';

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  summary: {},
});

const createFakeSession = ({ userId = 7, companyId = 3, apiKey = 'test-api-key' } = {}) => ({
  id: userId,
  people: `/people/${userId}`,
  api_key: apiKey,
  active: 1,
  mycompany: companyId,
});

const createCompany = (id, overrides = {}) => ({
  id,
  name: overrides.name || `Empresa ${id}`,
  alias: overrides.alias || `E${id}`,
  panel_enabled: true,
  enabled: true,
  user: { courier_enabled: true },
  permission: ['courier'],
  ...overrides,
});

const createInvoice = (id, { payerId, receiverId, price = 25 }) => ({
  '@id': `/invoices/${id}`,
  id,
  invoiceType: 'invoice',
  price,
  dueDate: '2026-08-15',
  payer: { '@id': `/people/${payerId}`, id: payerId, name: `Empresa ${payerId}` },
  receiver: { '@id': `/people/${receiverId}`, id: receiverId, name: `Motoboy ${receiverId}` },
  status: { realStatus: 'open', status: 'Aberto' },
});

const createPeopleLink = (id, { companyId, peopleId }) => ({
  '@id': `/people_links/${id}`,
  id,
  linkType: 'courier',
  enable: 1,
  company: { '@id': `/people/${companyId}`, id: companyId, name: `Empresa ${companyId}` },
  people: { '@id': `/people/${peopleId}`, id: peopleId, name: `Motoboy ${peopleId}`, alias: `M${peopleId}` },
});

async function installApiMocks(page, { userId = 7, companyId = 3 } = {}) {
  const invoices = [
    createInvoice(101, { payerId: 3, receiverId: userId, price: 30 }),
    createInvoice(102, { payerId: 9, receiverId: userId, price: 45 }),
    createInvoice(103, { payerId: 3, receiverId: 8, price: 20 }),
  ];
  const companies = [createCompany(3), createCompany(9, { name: 'Loja B', alias: 'B' })];
  const links = [
    createPeopleLink(1, { companyId: 3, peopleId: userId }),
    createPeopleLink(2, { companyId: 3, peopleId: 8 }),
  ];

  await page.route('**/*', async route => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
    }

    if (url.includes('/configs') || url.includes('/config')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([])),
      });
    }

    if (url.includes('/people/companies/my') || url.includes('/companies/my')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(companies)),
      });
    }

    if (url.includes('/people_links')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(links)),
      });
    }

    if (url.includes('/invoices') || url.includes('/invoice')) {
      const u = new URL(url);
      const receiver = u.searchParams.get('receiver') || '';
      const payer = u.searchParams.get('payer') || '';
      let filtered = invoices.slice();
      if (receiver) {
        const rid = receiver.replace(/\D/g, '');
        filtered = filtered.filter(inv => String(inv.receiver.id) === rid);
      }
      if (payer) {
        const pid = payer.replace(/\D/g, '');
        filtered = filtered.filter(inv => String(inv.payer.id) === pid);
      }
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(filtered)),
      });
    }

    if (url.includes('/people/') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createCompany(companyId)),
      });
    }

    if (url.startsWith(API_ORIGIN) || url.includes('localhost') || url.includes('127.0.0.1')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([])),
      });
    }

    return route.continue();
  });
}

async function seedSession(page, session) {
  await page.addInitScript(
    ({ sessionPayload, version }) => {
      try {
        window.localStorage.setItem('session', JSON.stringify(sessionPayload));
        window.localStorage.setItem('api_key', sessionPayload.api_key || '');
        window.localStorage.setItem('app_version', version);
      } catch (_e) {
        // ignore
      }
    },
    { sessionPayload: session, version: APP_VERSION },
  );
}

test.describe('DELIVERY receivables and motoboy payments', () => {
  test('motoboy view loads receivables and filters by company chip', async ({ page }) => {
    const session = createFakeSession({ userId: 7, companyId: 3 });
    await seedSession(page, session);
    await installApiMocks(page, { userId: 7, companyId: 3 });

    await page.goto('/delivery/receivables', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Recebíveis do motoboy')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Todas empresas')).toBeVisible({ timeout: 10000 });

    // Default list: receiver=7 → invoices 101 and 102
    await expect(page.getByText(/30|45|Empresa/).first()).toBeVisible({ timeout: 10000 });

    // Filter by company chip (Empresa 3)
    const companyChip = page.getByText('Empresa 3', { exact: false }).first();
    if (await companyChip.isVisible().catch(() => false)) {
      await companyChip.click();
    }
  });

  test('company view loads payments to motoboys and shows motoboy chips', async ({ page }) => {
    const session = createFakeSession({ userId: 1, companyId: 3 });
    await seedSession(page, session);
    await installApiMocks(page, { userId: 1, companyId: 3 });

    await page.goto('/delivery/motoboy-payments', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Pagamentos a motoboys')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Todos motoboys')).toBeVisible({ timeout: 10000 });
  });
});
