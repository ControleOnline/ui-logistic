const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');
const {filterOwnDeliveryQueue} = require('../../../react/utils/ownDeliveryHandoff');
const {
  createCompany,
  createCourier,
  createOwnDeliveryLogistics,
} = require('./own-delivery-charge.fixtures');

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

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const createFakeSession = () => ({
  id: 7,
  people: '/people/7',
  api_key: 'test-api-key',
  active: 1,
  mycompany: 3,
});

const createDeliveryHomeMenus = () => ({
  modules: {
    delivery: {
      id: 'delivery-home',
      label: 'Operacao',
      icon: 'truck',
      menus: [
        {
          id: 'delivery-orders',
          label: 'Pedidos de entrega',
          route: 'DeliveryOrdersPage',
          icon: 'shopping-bag',
        },
        {
          id: 'delivery-receivables',
          label: 'Recebiveis',
          route: 'DeliveryReceivablesPage',
          icon: 'dollar-sign',
        },
      ],
    },
  },
});

const bindBrowserDiagnostics = page => {
  page.on('console', message => {
    if (message.type() === 'error') {
      console.log('[browser console error]', message.text());
    }
  });
  page.on('pageerror', error => {
    console.log('[browser pageerror]', error?.stack || error?.message || String(error));
  });
};

const createOwnDeliveryChargeMock = async (page, initialState = {}) => {
  const courier = initialState.courier || createCourier();
  const company = initialState.company || createCompany();
  const state = {
    courier,
    company,
    saleOrdersById: initialState.saleOrdersById || {},
    orders: Array.isArray(initialState.orders) ? [...initialState.orders] : [],
    invoices: Array.isArray(initialState.invoices) ? [...initialState.invoices] : [],
    logisticsOrders: initialState.logisticsOrders || {},
    deviceId: 'web-7',
  };

  const fulfillJson = (route, body, status = 200) =>
    route.fulfill({
      status,
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });

  const findOrder = id =>
    state.orders.find(order => String(order.id) === String(id)) ||
    state.saleOrdersById[String(id)] ||
    null;

  await page.route(`${API_ORIGIN}/**`, async route => {
    const method = route.request().method().toUpperCase();
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/^\/+/, '');

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    let postBody = {};
    try {
      postBody = route.request().postDataJSON() || {};
    } catch {
      postBody = {};
    }

    if (pathname === 'devices' && method === 'POST') {
      return fulfillJson(route, {id: 1, device: state.deviceId, type: 'WEB'});
    }

    if (pathname === 'device_configs' && method === 'GET') {
      return fulfillJson(
        route,
        collection([
          {
            id: 1,
            device: {id: 1, device: state.deviceId},
            people: {id: 7},
            type: 'DELIVERY',
            configs: '{}',
          },
        ]),
      );
    }

    if (pathname === 'people/7' || pathname === 'people/3') {
      return fulfillJson(route, pathname === 'people/7' ? courier : company);
    }

    if (pathname === 'companies' || pathname.startsWith('people/')) {
      return fulfillJson(route, company);
    }

    if (pathname === 'menus-people' || pathname === 'menus') {
      return fulfillJson(route, createDeliveryHomeMenus());
    }

    if (pathname === 'orders' && method === 'GET') {
      const orderType = String(url.searchParams.get('orderType') || '')
        .trim()
        .toLowerCase();
      const items = filterOwnDeliveryQueue(state.orders, {
        saleOrdersById: state.saleOrdersById,
      }).filter(order => {
        if (!orderType) {
          return true;
        }
        return String(order.orderType || '').toLowerCase() === orderType;
      });
      return fulfillJson(route, collection(items));
    }

    const orderItemMatch = pathname.match(/^orders\/(\d+)$/);
    if (orderItemMatch && method === 'GET') {
      return fulfillJson(route, findOrder(orderItemMatch[1]));
    }

    const deliveredMatch = pathname.match(/^orders\/(\d+)\/delivered$/);
    if (deliveredMatch && method === 'POST') {
      const current = findOrder(deliveredMatch[1]);
      if (current) {
        current.status = {
          '@id': '/statuses/delivery-closed',
          status: 'closed',
          realStatus: 'closed',
        };
      }
      return fulfillJson(route, current);
    }

    if (pathname === 'invoices' && method === 'GET') {
      return fulfillJson(route, collection(state.invoices));
    }

    const invoiceMatch = pathname.match(/^invoices\/(\d+)$/);
    if (invoiceMatch && ['GET', 'PUT', 'PATCH', 'POST'].includes(method)) {
      const invoice = state.invoices.find(
        row => String(row.id) === String(invoiceMatch[1]),
      );
      if (invoice && method !== 'GET') {
        invoice.paid = true;
        invoice.status = {status: 'paid', realStatus: 'paid'};
      }
      return fulfillJson(route, invoice || null);
    }

    const logisticsMatch = pathname.match(
      /^(?:orders\/(\d+)\/logistics|marketplace\/logistics\/orders\/(\d+))$/,
    );
    if (logisticsMatch && method === 'GET') {
      const orderId = logisticsMatch[1] || logisticsMatch[2];
      const order = findOrder(orderId);
      const payload =
        state.logisticsOrders[orderId] ||
        (order ? createOwnDeliveryLogistics(order) : null);
      return fulfillJson(route, payload ? collection([payload]) : collection([]));
    }

    if (pathname === 'statuses') {
      return fulfillJson(route, collection([]));
    }

    return fulfillJson(route, collection([]));
  });

  await page.addInitScript(
    ({session, device, appType, version}) => {
      const setItem = (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // ignore
        }
      };
      setItem('session', JSON.stringify(session));
      setItem('config', JSON.stringify({language: 'pt-br'}));
      setItem('device', JSON.stringify(device));
      setItem('app-type', appType);
      setItem('app-version', version);
    },
    {
      appType: 'DELIVERY',
      session: createFakeSession(),
      version: APP_VERSION,
      device: {
        id: 'web-7',
        device: 'web-7',
        type: 'WEB',
        appName: 'Browser Delivery',
        appVersion: APP_VERSION,
      },
    },
  );

  return state;
};

module.exports = {
  API_ORIGIN,
  bindBrowserDiagnostics,
  createOwnDeliveryChargeMock,
};
