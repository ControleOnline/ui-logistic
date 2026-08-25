const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';
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
const collection = member => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

test.describe('delivery rates manager inbox smoke', () => {
  test('renders manager rates inbox with DefaultTable search', async ({page}) => {
    const groups = [
      {
        id: 10,
        code: 'TX-10',
        versionNumber: 2,
        vehicleType: 'moto',
        taxesCount: 3,
        companiesCount: 1,
      },
    ];

    await page.route('**/*', async route => {
      const method = route.request().method().toUpperCase();
      const url = new URL(route.request().url());
      const pathname = url.pathname.replace(/^\/+/, '');
      const isLocalWebServer = ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '4173';
      const isMockedApiPath = /^(people\/|companies|delivery_tax_groups|configs\/|devices|device_configs|runtime\/ip|themes-colors\.css)/.test(pathname);
      if (isLocalWebServer && !isMockedApiPath) {
        return route.continue();
      }
      if (
        !isMockedApiPath &&
        !url.href.startsWith(API_ORIGIN) &&
        !['localhost', '127.0.0.1'].includes(url.hostname)
      ) {
        return route.continue();
      }
      if (method === 'OPTIONS') {
        return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
      }
      if (pathname === 'delivery_tax_groups' || pathname.startsWith('delivery_tax_groups')) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(collection(groups)),
        });
      }
      if (pathname === 'people/companies/my' || pathname === 'companies/my') {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(
            collection([
              {
                id: 3,
                name: 'Empresa Teste',
                alias: 'TESTE',
                panel_enabled: true,
                enabled: true,
              },
            ]),
          ),
        });
      }
      if (pathname === 'people/company/default') {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify({
            id: 3,
            name: 'Empresa Teste',
            alias: 'TESTE',
            panel_enabled: true,
            enabled: true,
          }),
        });
      }
      if (pathname === 'companies' || pathname.startsWith('people/')) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify({
            id: 3,
            name: 'Empresa Teste',
            alias: 'TESTE',
            panel_enabled: true,
            enabled: true,
          }),
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
          } catch {}
        };
        set(
          'session',
          JSON.stringify({
            id: 7,
            people: '/people/7',
            api_key: 'test',
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
      {appVersion: APP_VERSION},
    );

    await page.goto('/delivery/manager/rates');
    await expect(page.getByText(/Tabelas de entrega/i).first()).toBeVisible({timeout: 15000});
    await expect(page.getByText('TX-10', {exact: true})).toBeVisible();
    await expect(page.getByText('1 Items', {exact: true})).toBeVisible();
  });
});
