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
const textHeaders = () => ({...CORS_HEADERS, 'content-type': 'text/css; charset=utf-8'});
const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
});

test.describe('cte pending invoices smoke', () => {
  test('lists NFs without CT-e grouped by company and address', async ({page}) => {
    const payload = {
      member: [
        {
          id: 11,
          invoiceNumber: 501,
          invoiceModel: 55,
          invoiceTotal: 120,
          companyId: 3,
          companyName: 'Empresa Teste',
          addressId: 9,
          addressLabel: 'Rua das NFs, 100',
        },
      ],
      groups: [
        {
          id: '3:9',
          companyId: 3,
          companyName: 'Empresa Teste',
          addressId: 9,
          addressLabel: 'Rua das NFs, 100',
          invoiceCount: 1,
          totalValue: 120,
          invoices: [
            {
              id: 11,
              invoiceNumber: 501,
              invoiceModel: 55,
              invoiceTotal: 120,
              companyId: 3,
              companyName: 'Empresa Teste',
              addressId: 9,
              addressLabel: 'Rua das NFs, 100',
            },
          ],
        },
      ],
      totalItems: 1,
      totalValue: 120,
    };

    await page.route(`${API_ORIGIN}/**`, async route => {
      const method = route.request().method().toUpperCase();
      const pathname = new URL(route.request().url()).pathname.replace(/^\/+/, '');
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
        return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify(collection([{id: 3, name: 'Empresa Teste', alias: 'Empresa Teste'}]))});
      }
      if (pathname === 'devices' && method === 'GET') {
        return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify(collection([{id: 1, device: 'web', type: 'WEB'}]))});
      }
      if (pathname === 'people/company/default') {
        return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify({id: 3, name: 'Empresa Teste', alias: 'Empresa Teste', theme: {colors: {primary: '#0ea5e9'}}})});
      }
      if (pathname === 'people/7') {
        return route.fulfill({status: 200, headers: jsonHeaders(), body: JSON.stringify({id: 7, name: 'Motoboy Teste', alias: 'Motoboy Teste'})});
      }
      if (pathname === 'invoice_taxes/without-cte' || pathname.startsWith('invoice_taxes/without-cte')) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(payload),
        });
      }
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({member: [], 'hydra:member': []}),
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

    await page.goto('/cte');
    await expect(page.getByText(/CTEs à emitir/i).first()).toBeVisible({timeout: 15000});
    await expect(page.getByText(/Empresa Teste/i).first()).toBeVisible();
    await expect(page.getByText(/Rua das NFs, 100/i).first()).toBeVisible();
  });
});
