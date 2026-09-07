// fluxo: motoboy-cadastro | etapa: courier-delivery-flow | wiki: https://github.com/ControleOnline/app-community/wiki/Venda-Producao
/*
 * Browser smoke for DELIVERY flows.
 * - Uses a fake session and mocked API responses so the suite stays open-source safe.
 * - Exercises the real browser routes for courier setup, rate history, presence and manager inbox screens.
 */

const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

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

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  summary: {},
});

const weekdayLabel = weekday => {
  const map = {
    1: 'Segunda',
    2: 'Terca',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sabado',
    7: 'Domingo',
  };

  return map[Number(weekday)] || '-';
};

const windowLabel = (startTime, endTime) => {
  const start = String(startTime || '').slice(0, 5) || '-';
  const end = String(endTime || '').slice(0, 5) || '-';

  if (start === '-' && end === '-') {
    return '-';
  }

  return `${start} - ${end}`;
};

const buildGroupRow = (group, defaults = {}) => {
  const taxes = Array.isArray(group?.taxes) ? group.taxes : [];
  const companies = Array.isArray(group?.companies) ? group.companies : [];
  const courier = group?.courier || defaults.courier || null;

  return {
    '@id': `/delivery_tax_groups/${group.id}`,
    id: group.id,
    code: group.code || null,
    groupName: group.groupName || '',
    vehicleType: group.vehicleType || null,
    versionNumber: group.versionNumber || 1,
    courier,
    taxes,
    companies,
    taxesCount: group.taxesCount ?? taxes.length,
    companiesCount: group.companiesCount ?? companies.length,
    activeCompaniesCount:
      group.activeCompaniesCount ??
      companies.filter(link => link && link.enabled !== false).length,
    creationDate: group.creationDate || '2026-06-06T12:00:00.000Z',
    alterDate: group.alterDate || '2026-06-06T12:00:00.000Z',
    previousGroup: group.previousGroup || null,
  };
};

const buildScheduleRow = schedule => ({
  '@id': `/delivery_courier_schedules/${schedule.id}`,
  id: schedule.id,
  courier: schedule.courier,
  label: schedule.label || '',
  weekday: Number(schedule.weekday || 1),
  weekdayLabel: schedule.weekdayLabel || weekdayLabel(schedule.weekday),
  startTime: schedule.startTime || '10:00',
  endTime: schedule.endTime || '12:00',
  windowLabel:
    schedule.windowLabel || windowLabel(schedule.startTime || '10:00', schedule.endTime || '12:00'),
  active: schedule.active !== false,
  usageCount: schedule.usageCount ?? 0,
  creationDate: schedule.creationDate || '2026-06-06T12:00:00.000Z',
  alterDate: schedule.alterDate || '2026-06-06T12:00:00.000Z',
});

const buildVehicleRow = vehicle => ({
  '@id': `/delivery_courier_vehicles/${vehicle.id}`,
  id: vehicle.id,
  courier: vehicle.courier,
  vehicleType: vehicle.vehicleType || 'moto',
  brand: vehicle.brand || 'Honda',
  model: vehicle.model || 'CG 160',
  plate: String(vehicle.plate || 'ABC1D23').replace(/\s+/g, '').toUpperCase(),
  year: Number(vehicle.year || 2024),
  color: vehicle.color || 'Preta',
  creationDate: vehicle.creationDate || '2026-06-06T12:00:00.000Z',
  alterDate: vehicle.alterDate || '2026-06-06T12:00:00.000Z',
});

const buildPresenceRow = presence => ({
  '@id': `/delivery_courier_company_presences/${presence.id}`,
  id: presence.id,
  company: presence.company,
  courier: presence.courier,
  availabilityMode: presence.availabilityMode || 'automatic',
  availabilityStateLabel:
    presence.availabilityStateLabel ||
    (presence.availabilityMode === 'manual'
      ? presence.isOnline
        ? 'Online manual'
        : 'Offline manual'
      : presence.isOnline
        ? 'Online automatico'
        : 'Offline automatico'),
  currentModeLabel:
    presence.currentModeLabel ||
    (presence.availabilityMode === 'manual' ? 'Manual' : 'Automatico'),
  effectiveOnline:
    presence.effectiveOnline !== undefined ? presence.effectiveOnline : Boolean(presence.isOnline),
  isOnline: Boolean(presence.isOnline),
  schedules: Array.isArray(presence.schedules)
    ? presence.schedules.map(schedule =>
        schedule && typeof schedule === 'object' && schedule.schedule
          ? schedule
          : {
              id: schedule?.id || schedule?.linkId || schedule?.presenceScheduleId || 1,
              schedule,
            },
      )
    : [],
  schedulesSummary:
    presence.schedulesSummary ||
    (Array.isArray(presence.schedules) && presence.schedules.length > 0
      ? presence.schedules
          .map(schedule => {
            const scheduleEntity = schedule && typeof schedule === 'object' && schedule.schedule
              ? schedule.schedule
              : schedule;
            return scheduleEntity?.label || scheduleEntity?.windowLabel || '';
          })
          .filter(Boolean)
          .join(', ')
      : ''),
  manualReason: presence.manualReason || '',
  lastOnlineAt: presence.lastOnlineAt || '2026-06-06T12:00:00.000Z',
  lastOfflineAt: presence.lastOfflineAt || '2026-06-06T11:30:00.000Z',
  alterDate: presence.alterDate || '2026-06-06T12:00:00.000Z',
});

const buildLogRow = log => ({
  '@id': `/logs/${log.id}`,
  id: log.id,
  rowId: log.rowId,
  className: log.className || '',
  entityIri: log.entityIri || '',
  action: log.action || 'update',
  createdAt: log.createdAt || '2026-06-06T12:30:00.000Z',
  userDisplayName: log.userDisplayName || 'Sistema',
  payload: log.payload || {},
});

const createFakeSession = ({
  userId = 7,
  companyId = 3,
  apiKey = 'test-api-key',
} = {}) => ({
  id: userId,
  people: `/people/${userId}`,
  api_key: apiKey,
  active: 1,
  mycompany: companyId,
});

const createCompany = (id, overrides = {}) => ({
  id,
  name: overrides.name || `Empresa ${id}`,
  alias: overrides.alias || `Empresa ${id}`,
  panel_enabled: overrides.panel_enabled !== undefined ? overrides.panel_enabled : true,
  enabled: overrides.enabled !== undefined ? overrides.enabled : true,
  commercial_enabled:
    overrides.commercial_enabled !== undefined ? overrides.commercial_enabled : true,
  user: overrides.user || {},
  permission: Array.isArray(overrides.permission) ? overrides.permission : [],
  theme:
    overrides.theme || {
      colors: {
        primary: '#0EA5E9',
        secondary: '#F97316',
      },
    },
  configs: overrides.configs || {},
});

const createCourier = (id = 7, overrides = {}) => ({
  id,
  name: overrides.name || 'Motoboy Teste',
  alias: overrides.alias || 'Motoboy Teste',
  active: overrides.active !== undefined ? overrides.active : 1,
});



const createAddress = (id, overrides = {}) => ({
  '@id': '/addresses/' + id,
  id,
  nickname: overrides.nickname || overrides.label || '',
  number: overrides.number || '100',
  complement: overrides.complement || '',
  street: {
    street: overrides.street || overrides.label || '',
    district: {
      district: overrides.district || 'Centro',
      city: {
        city: overrides.city || 'Sao Paulo',
        state: {
          uf: overrides.uf || 'SP',
        },
      },
    },
    cep: {
      cep: overrides.cep || '01000-000',
    },
  },
  latitude: overrides.latitude,
  longitude: overrides.longitude,
});

const createCustomer = (id = 81, overrides = {}) => ({
  '@id': '/people/' + id,
  id,
  name: overrides.name || 'Cliente Teste',
  alias: overrides.alias || 'Cliente Teste',
  phone: overrides.phone || [
    {
      id: 1,
      ddi: '55',
      ddd: '11',
      phone: '99999-0000',
    },
  ],
  email: overrides.email || [],
});

const createMainOrder = (id = 1200, overrides = {}) => ({
  '@id': '/orders/' + id,
  id,
  externalCode: overrides.externalCode || ('CM-' + id),
});

const createDeliveryStatusItems = () => [
  {
    '@id': '/statuses/delivery-awaiting-acceptance',
    id: 848,
    context: 'delivery',
    status: 'aguardando aceite',
    realStatus: 'pending',
    color: '#e67e22',
  },
  {
    '@id': '/statuses/delivery-accepted',
    id: 849,
    context: 'delivery',
    status: 'aceito',
    realStatus: 'accepted',
    color: '#16A34A',
  },
  {
    '@id': '/statuses/delivery-way',
    id: 850,
    context: 'delivery',
    status: 'em rota',
    realStatus: 'way',
    color: '#0EA5E9',
  },
  {
    '@id': '/statuses/delivery-closed',
    id: 851,
    context: 'delivery',
    status: 'closed',
    realStatus: 'closed',
    color: '#64748B',
  },
  {
    '@id': '/statuses/delivery-canceled',
    id: 852,
    context: 'delivery',
    status: 'canceled',
    realStatus: 'canceled',
    color: '#DC2626',
  },
  {
    '@id': '/statuses/delivery-preparing',
    id: 853,
    context: 'delivery',
    status: 'preparando',
    realStatus: 'preparing',
    color: '#e67e22',
  },
];

const buildDeliveryOrderRow = (overrides = {}) => {
  const courier = overrides.provider || createCourier();
  const customer = overrides.client || createCustomer();
  const mainOrder = overrides.mainOrder || createMainOrder();
  const originAddress =
    overrides.addressOrigin ||
    createAddress('origin-1', {
      label: 'Origem da viagem',
      street: 'Rua das Flores',
      number: '123',
      district: 'Centro',
      city: 'Sao Paulo',
      uf: 'SP',
      cep: '01000-010',
      latitude: -23.55052,
      longitude: -46.633308,
    });
  const destinationAddress =
    overrides.addressDestination ||
    createAddress('destination-1', {
      label: 'Destino da viagem',
      street: 'Avenida Paulista',
      number: '1500',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      uf: 'SP',
      cep: '01310-100',
      latitude: -23.563987,
      longitude: -46.654321,
    });

  return {
    '@id': '/orders/' + (overrides.id || 991),
    id: overrides.id || 991,
    app: overrides.app || 'DELIVERY',
    orderType: overrides.orderType || 'delivery',
    provider: courier,
    client: customer,
    deliveryContact: overrides.deliveryContact || customer,
    retrieveContact: overrides.retrieveContact || createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
    addressOrigin: originAddress,
    addressDestination: destinationAddress,
    mainOrderId: overrides.mainOrderId ?? mainOrder.id,
    main_order_id: overrides.main_order_id ?? mainOrder.id,
    mainOrder,
    price: overrides.price ?? 18.5,
    status:
      overrides.status ||
      {
        '@id': '/statuses/accept',
        id: 999,
        status: 'accept',
        realStatus: 'accept',
        color: '#16A34A',
      },
    deliveryPeopleId: overrides.deliveryPeopleId ?? courier.id,
    deliveryPeople: overrides.deliveryPeople || courier,
    comments: overrides.comments || 'Viagem aceita pelo motoboy teste.',
    orderDate: overrides.orderDate || '2026-06-10T12:00:00.000Z',
    alterDate: overrides.alterDate || '2026-06-10T12:05:00.000Z',
    otherInformations: overrides.otherInformations || {},
  };
};

const buildDeliveryLogisticsPayload = order => {
  const courier = order?.deliveryPeople || order?.provider || createCourier();
  const deliveryValue = Number(order?.price || 0) || 18.5;
  const mainOrderId = order?.mainOrderId ?? order?.main_order_id ?? order?.mainOrder?.id ?? null;
  const selectedQuoteId = Number(order?.id || 991) + 5000;
  const trackingUrl = 'https://tracking.example.com/delivery/' + (order?.id || 991);
  const deliveryStatus = String(
    order?.status?.status || order?.status?.realStatus || 'accept',
  ).trim() || 'accept';

  return {
    order,
    route: {
      pickupAddress: order?.addressOrigin || null,
      dropoffAddress: order?.addressDestination || null,
      pickupContact: order?.retrieveContact || order?.provider || null,
      dropoffContact: order?.deliveryContact || order?.client || null,
      courierContact: courier,
    },
    management: {
      mode: 'integration',
      managedByStore: false,
      label: 'Entrega aceita',
      source: 'delivery',
      mainOrderId,
    },
    providers: [
      {
        key: 'delivery',
        label: 'Entrega aceita',
        connected: true,
        online: true,
      },
    ],
    quotes: [
      {
        id: selectedQuoteId,
        mainOrderId,
        main_order_id: mainOrderId,
        orderType: 'delivery',
        app: 'delivery',
        providerKey: 'delivery',
        providerLabel: 'Entrega aceita',
        price: deliveryValue,
        eta: '35 min',
        status: {
          status: deliveryStatus,
          realStatus: deliveryStatus,
          name: deliveryStatus,
        },
        quoteState: 'selected',
        quoteMessage: 'Viagem aceita pelo motoboy teste.',
        trackingUrl,
        selected: true,
        available: true,
        requestable: false,
        deliveryPeople: courier,
      },
    ],
    selection: {
      quoteOrderId: selectedQuoteId,
      providerKey: 'delivery',
      price: deliveryValue,
      trackingUrl,
      selectedAt: '2026-06-10T12:30:00.000Z',
    },
    quoteStatus: {
      providers: 1,
      quotes: 1,
      ready: 0,
      pending: 0,
      selected: 1,
      unavailable: 0,
      error: 0,
    },
    delivery: {
      deliveryPeopleId: courier?.id || null,
      deliveryPeople: courier,
      trackingUrl,
      requestedAt: '2026-06-10T12:25:00.000Z',
      status: deliveryStatus,
      currentIntegrationKey: 'delivery',
    },
  };
};


const createDeliveryHomeMenus = () => ({
  modules: {
    delivery: {
      id: 'delivery-home',
      label: 'Operacao',
      icon: 'truck',
      menus: [
        {
          id: 'delivery-orders',
          menuKey: 'delivery_orders',
          label: 'Pedidos de entrega',
          route: 'DeliveryOrdersPage',
          icon: 'shopping-bag',
          color: '#0EA5E9',
          sortOrder: 10,
        },
        {
          id: 'delivery-receivables',
          menuKey: 'delivery_receivables',
          label: 'Recebiveis',
          route: 'DeliveryReceivablesPage',
          icon: 'dollar-sign',
          color: '#16A34A',
          sortOrder: 20,
        },
        {
          id: 'delivery-companies',
          menuKey: 'delivery_companies',
          label: 'Empresas homologadas',
          route: 'DeliveryCompaniesPage',
          icon: 'home',
          color: '#F97316',
          sortOrder: 30,
        },
        {
          id: 'delivery-rates',
          menuKey: 'delivery_rates',
          label: 'Minhas tabelas',
          route: 'DeliveryRateTablesPage',
          icon: 'list',
          color: '#8B5CF6',
          sortOrder: 40,
        },
      ],
    },
    toolbar: {
      id: 'delivery-toolbar',
      label: 'Navegacao',
      icon: 'menu',
      menus: [
        {
          id: 'delivery-toolbar-home',
          menuKey: 'home',
          menuType: 'toolbar',
          label: 'Home',
          route: 'HomePage',
          icon: 'home',
          color: '#0EA5E9',
          sortOrder: 10,
        },
        {
          id: 'delivery-toolbar-orders',
          menuKey: 'orders',
          menuType: 'toolbar',
          label: 'Pedidos',
          route: 'DeliveryOrdersPage',
          icon: 'shopping-bag',
          color: '#0EA5E9',
          sortOrder: 20,
        },
        {
          id: 'delivery-toolbar-receivables',
          menuKey: 'receivables',
          menuType: 'toolbar',
          label: 'Recebiveis',
          route: 'DeliveryReceivablesPage',
          icon: 'dollar-sign',
          color: '#16A34A',
          sortOrder: 30,
        },
        {
          id: 'delivery-toolbar-companies',
          menuKey: 'companies',
          menuType: 'toolbar',
          label: 'Empresas',
          route: 'DeliveryCompaniesPage',
          icon: 'briefcase',
          color: '#7C3AED',
          sortOrder: 40,
        },
        {
          id: 'delivery-toolbar-rates',
          menuKey: 'rate_tables',
          menuType: 'toolbar',
          label: 'Tabelas',
          route: 'DeliveryRateTablesPage',
          icon: 'list',
          color: '#64748B',
          sortOrder: 50,
        },
      ],
    },
  },
});

const createRequestCounter = page => {
  const counts = new Map();

  const handler = request => {
    if (request.method().toUpperCase() !== 'GET') {
      return;
    }

    const url = request.url();
    if (!url.startsWith(API_ORIGIN)) {
      return;
    }

    const pathname = new URL(url).pathname.replace(/^\/+/, '');
    counts.set(pathname, (counts.get(pathname) || 0) + 1);
  };

  page.on('request', handler);

  return {
    counts,
    reset: () => counts.clear(),
    stop: () => page.off('request', handler),
  };
};

const createDeliveryApiMock = async (page, initialState = {}) => {
  const defaultCourier = initialState.courier || createCourier();
  const state = {
    courier: defaultCourier,
    companies: initialState.companies || [
      createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
      createCompany(4, { name: 'Restaurante Noite', alias: 'Noite' }),
    ],
    defaultCompany: initialState.defaultCompany || createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
    groups: Array.isArray(initialState.groups) ? [...initialState.groups] : [],
    vehicles: Array.isArray(initialState.vehicles) ? [...initialState.vehicles] : [
      buildVehicleRow({
        id: initialState.nextVehicleId || 151,
        courier: defaultCourier,
        vehicleType: 'moto',
        brand: 'Honda',
        model: 'CG 160',
        plate: 'ABC1D23',
        year: 2024,
        color: 'Preta',
      }),
    ],
    schedules: Array.isArray(initialState.schedules) ? [...initialState.schedules] : [],
    presences: Array.isArray(initialState.presences) ? [...initialState.presences] : [],
    logs: Array.isArray(initialState.logs) ? [...initialState.logs] : [],
    orders: Array.isArray(initialState.orders) ? [...initialState.orders] : [],
    logisticsOrders: initialState.logisticsOrders || {},
    statusItems: Array.isArray(initialState.statusItems)
      ? [...initialState.statusItems]
      : createDeliveryStatusItems(),
    deviceId: initialState.deviceId || 'web-7',
    menus: initialState.menus || createDeliveryHomeMenus(),
    nextGroupId: initialState.nextGroupId || 101,
    nextVehicleId: initialState.nextVehicleId || 152,
    nextScheduleId: initialState.nextScheduleId || 201,
    nextPresenceId: initialState.nextPresenceId || 301,
  };

  const fulfillJson = async (route, body, status = 200) =>
    route.fulfill({
      status,
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });

  const fulfillText = async (route, body, status = 200) =>
    route.fulfill({
      status,
      headers: textHeaders(),
      body,
    });

  const normalizeCollectionResponse = items => collection(items.map(item => ({ ...item })));

  const upsertGroup = group => {
    const normalizedGroup = buildGroupRow(group, { courier: state.courier });
    const existingIndex = state.groups.findIndex(item => String(item.id) === String(normalizedGroup.id));

    if (existingIndex >= 0) {
      state.groups[existingIndex] = normalizedGroup;
    } else {
      state.groups.push(normalizedGroup);
    }

    return normalizedGroup;
  };

  const upsertSchedule = schedule => {
    const normalizedSchedule = buildScheduleRow(schedule);
    const existingIndex = state.schedules.findIndex(item => String(item.id) === String(normalizedSchedule.id));

    if (existingIndex >= 0) {
      state.schedules[existingIndex] = normalizedSchedule;
    } else {
      state.schedules.push(normalizedSchedule);
    }

    return normalizedSchedule;
  };

  const upsertVehicle = vehicle => {
    const normalizedVehicle = buildVehicleRow(vehicle);
    const existingIndex = state.vehicles.findIndex(item => String(item.id) === String(normalizedVehicle.id));

    if (existingIndex >= 0) {
      state.vehicles[existingIndex] = normalizedVehicle;
    } else {
      state.vehicles.push(normalizedVehicle);
    }

    return normalizedVehicle;
  };

  const upsertPresence = presence => {
    const normalizedPresence = buildPresenceRow(presence);
    const existingIndex = state.presences.findIndex(item => String(item.id) === String(normalizedPresence.id));

    if (existingIndex >= 0) {
      state.presences[existingIndex] = normalizedPresence;
    } else {
      state.presences.push(normalizedPresence);
    }

    return normalizedPresence;
  };

  const findGroup = id =>
    state.groups.find(group => String(group.id) === String(id)) || null;

  const findSchedule = id =>
    state.schedules.find(schedule => String(schedule.id) === String(id)) || null;

  const findPresence = id =>
    state.presences.find(presence => String(presence.id) === String(id)) || null;


  const findOrder = id =>
    state.orders.find(order => String(order.id) === String(id)) || null;

  const upsertOrder = order => {
    const existingIndex = state.orders.findIndex(item => String(item.id) === String(order.id));

    if (existingIndex >= 0) {
      state.orders[existingIndex] = order;
    } else {
      state.orders.push(order);
    }

    return order;
  };

  const findLogisticsPayload = id => {
    const existing = state.logisticsOrders[String(id)] || null;

    if (existing) {
      return existing;
    }

    const order = findOrder(id);
    return order ? buildDeliveryLogisticsPayload(order) : null;
  };
  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      });
    }

    const postBody = () => {
      try {
        return request.postDataJSON();
      } catch {
        try {
          return JSON.parse(request.postData() || '{}');
        } catch {
          return {};
        }
      }
    };

    if (pathname === 'themes-colors.css') {
      return fulfillText(
        route,
        ':root { --primary: #0ea5e9; --secondary: #f97316; --accent: #14b8a6; }',
      );
    }

    if (pathname === 'runtime/ip') {
      return fulfillJson(route, {
        ip: '127.0.0.1',
        member: [{ ip: '127.0.0.1' }],
      });
    }

    if (pathname === 'people/companies/my') {
      const linkType = String(url.searchParams.get('linkType') || '').trim().toLowerCase();
      const companies =
        linkType === 'courier'
          ? state.companies.filter(company =>
              company?.user?.courier_enabled === true ||
              (Array.isArray(company?.permission) && company.permission.includes('courier')),
            )
          : state.companies;

      return fulfillJson(route, collection(companies));
    }

    if (pathname === 'people/company/default') {
      return fulfillJson(route, state.defaultCompany);
    }

    if (pathname === 'statuses' && method === 'GET') {
      const context = String(url.searchParams.get('context') || '').trim().toLowerCase();
      const realStatus = String(url.searchParams.get('realStatus') || '').trim().toLowerCase();
      const items = state.statusItems.filter(status => {
        const matchesContext =
          !context || String(status?.context || '').trim().toLowerCase() === context;
        const matchesRealStatus =
          !realStatus || String(status?.realStatus || '').trim().toLowerCase() === realStatus;

        return matchesContext && matchesRealStatus;
      });

      return fulfillJson(route, collection(items));
    }

    if (pathname === 'menus-people') {
      return fulfillJson(route, state.menus);
    }

    if (pathname.startsWith('translates')) {
      return fulfillJson(route, collection([]));
    }

    if (pathname === 'configs/discovery-configs' && method === 'POST') {
      return fulfillJson(route, {
        configs: {},
      });
    }

    if (pathname === 'devices' && method === 'GET') {
      const deviceId = String(url.searchParams.get('device') || state.deviceId || '').trim();
      return fulfillJson(
        route,
        collection(
          deviceId
            ? [
                {
                  id: 1,
                  device: deviceId,
                  alias: 'Browser Device',
                  type: 'WEB',
                  metadata: {
                    app: {
                      version: APP_VERSION,
                    },
                  },
                },
              ]
            : [],
        ),
      );
    }

    if (pathname === 'devices' && method === 'POST') {
      return fulfillJson(route, {
        id: 1,
        device: state.deviceId,
        alias: 'Browser Device',
        type: 'WEB',
        metadata: {
          app: {
            version: APP_VERSION,
          },
        },
      });
    }

    if (pathname === 'device_configs' && method === 'GET') {
      const deviceId = String(url.searchParams.get('device.device') || state.deviceId || '').trim();
      const peopleId = String(url.searchParams.get('people') || '').replace(/\D+/g, '');
      const type = String(url.searchParams.get('type') || 'MANAGER').trim().toUpperCase();

      if (!deviceId || !peopleId) {
        return fulfillJson(route, collection([]));
      }

      return fulfillJson(
        route,
        collection([
          {
            id: 1,
            device: {
              id: 1,
              device: deviceId,
            },
            people: {
              id: Number(peopleId),
            },
            type,
            configs: JSON.stringify({
              'config-version': APP_VERSION,
              'pos-gateway': 'infinite-pay',
            }),
          },
        ]),
      );
    }

    if (pathname === 'device_configs/add-configs' && method === 'POST') {
      const body = postBody();

      return fulfillJson(route, {
        id: 1,
        device: {
          id: 1,
          device: String(body?.device || state.deviceId || ''),
        },
        people: body?.people ? { id: Number(String(body.people).replace(/\D+/g, '')) } : { id: 3 },
        type: body?.type || 'MANAGER',
        configs: body?.configs || '{}',
      });
    }

    if (pathname === 'people/7') {
      return fulfillJson(route, state.courier);
    }

    if (pathname === 'orders' && method === 'GET') {
      const providerId = String(url.searchParams.get('provider') || '').replace(/\D+/g, '');
      const orderType = String(url.searchParams.get('orderType') || '').trim().toLowerCase();
      const search = String(url.searchParams.get('search') || '').trim().toLowerCase();

      const items = state.orders.filter(order => {
        const matchesProvider =
          !providerId ||
          String(order?.provider?.id || order?.providerId || order?.provider || '')
            .replace(/\D+/g, '') === providerId;
        const matchesOrderType =
          !orderType || String(order?.orderType || order?.order_type || '').trim().toLowerCase() === orderType;
        const matchesSearch =
          !search ||
          [
            order?.id,
            order?.mainOrder?.externalCode,
            order?.client?.name,
            order?.client?.alias,
            order?.deliveryContact?.name,
            order?.deliveryContact?.alias,
          ]
            .map(value => String(value || '').toLowerCase())
            .some(value => value.includes(search));

        return matchesProvider && matchesOrderType && matchesSearch;
      });

      return fulfillJson(route, collection(items));
    }

    const orderItemMatch = pathname.match(/^orders\/(\d+)$/);
    if (orderItemMatch && method === 'GET') {
      return fulfillJson(route, findOrder(orderItemMatch[1]) || null);
    }

    if (orderItemMatch && ['POST', 'PUT', 'PATCH'].includes(method)) {
      const body = postBody();
      const orderId = Number(orderItemMatch[1]);
      const currentOrder = findOrder(orderItemMatch[1]) || buildDeliveryOrderRow({ id: orderId });
      const savedOrder = upsertOrder({
        ...currentOrder,
        ...body,
        id: orderId,
        "@id": '/orders/' + orderId,
        mainOrderId:
          body?.mainOrderId ?? body?.main_order_id ?? currentOrder.mainOrderId ?? currentOrder.main_order_id ?? currentOrder.mainOrder?.id ?? null,
        main_order_id:
          body?.main_order_id ?? body?.mainOrderId ?? currentOrder.main_order_id ?? currentOrder.mainOrderId ?? currentOrder.mainOrder?.id ?? null,
        mainOrder: body?.mainOrder || currentOrder.mainOrder || null,
        orderType: body?.orderType || body?.order_type || currentOrder.orderType || 'delivery',
      });

      return fulfillJson(route, savedOrder);
    }

    const orderActionMatch = pathname.match(/^orders\/(\d+)\/(confirm|cancel|delivered)$/);
    if (orderActionMatch && method === 'POST') {
      const orderId = orderActionMatch[1];
      const action = orderActionMatch[2];
      const currentOrder = findOrder(orderId) || buildDeliveryOrderRow({ id: Number(orderId) });
      const nextStatus =
        action === 'confirm'
          ? {
              ...(currentOrder.status || {}),
              status: 'aceito',
              realStatus: 'accepted',
            }
          : action === 'delivered'
            ? {
                ...(currentOrder.status || {}),
                status: 'closed',
                realStatus: 'closed',
            }
            : {
                ...(currentOrder.status || {}),
                status: 'canceled',
                realStatus: 'canceled',
              };
      const nextDelivery =
        action === 'confirm'
          ? {
              ...(currentOrder.delivery || {}),
              status: 'aceito',
              realStatus: 'accepted',
            }
          : action === 'delivered'
            ? {
                ...(currentOrder.delivery || {}),
                status: 'closed',
                realStatus: 'closed',
              }
            : {
                ...(currentOrder.delivery || {}),
                status: 'canceled',
                realStatus: 'canceled',
              };

      const savedOrder = upsertOrder({
        ...currentOrder,
        status: nextStatus,
        delivery: nextDelivery,
      });

      state.logisticsOrders[orderId] = buildDeliveryLogisticsPayload(savedOrder);

      return fulfillJson(route, {
        action,
        result: {
          errno: 0,
          errmsg: 'ok',
        },
      });
    }

    const logisticsOrderMatch = pathname.match(/^marketplace\/logistics\/orders\/(\d+)$/);
    if (logisticsOrderMatch && method === 'GET') {
      const payload = findLogisticsPayload(logisticsOrderMatch[1]);
      return fulfillJson(route, collection(payload ? [payload] : []));
    }
    if (pathname === 'delivery_courier_vehicles' && method === 'GET') {
      const courierId = String(url.searchParams.get('courier') || '').replace(/\D+/g, '');
      const items = courierId
        ? state.vehicles.filter(vehicle => String(vehicle.courier?.id || vehicle.courierId || '') === courierId)
        : state.vehicles;

      return fulfillJson(route, normalizeCollectionResponse(items));
    }

    if (pathname === 'delivery_courier_vehicles' && method === 'POST') {
      const body = postBody();
      const requiredFields = ['vehicleType', 'brand', 'model', 'plate', 'year'];
      const hasMissingField = requiredFields.some(field => !String(body?.[field] ?? '').trim());

      if (hasMissingField) {
        return route.fulfill({
          status: 400,
          headers: jsonHeaders(),
          body: JSON.stringify({
            message: 'Informe marca, modelo, ano e placa do veículo.',
          }),
        });
      }

      const saved = upsertVehicle({
        id: state.nextVehicleId++,
        courier: state.courier,
        vehicleType: body?.vehicleType || 'moto',
        brand: body?.brand || 'Honda',
        model: body?.model || 'CG 160',
        plate: body?.plate || 'ABC1D23',
        year: body?.year || 2024,
        color: body?.color || 'Preta',
      });

      return fulfillJson(route, saved);
    }

    if (pathname === 'delivery_tax_groups' && method === 'GET') {
      return fulfillJson(route, normalizeCollectionResponse(state.groups));
    }

    if (pathname === 'delivery_tax_groups' && method === 'POST') {
      const body = postBody();
      const saved = upsertGroup({
        id: state.nextGroupId++,
        groupName: body?.groupName || 'Nova tabela',
        code: body?.code || null,
        vehicleType: body?.vehicleType || 'moto',
        versionNumber: body?.versionNumber || 1,
        courier: state.courier,
        taxes: Array.isArray(body?.taxes)
          ? body.taxes.map((tax, index) => ({
              id: index + 1,
              ...tax,
            }))
          : [],
        companies: [],
      });

      return fulfillJson(route, saved);
    }

    const groupItemMatch = pathname.match(/^delivery_tax_groups\/(\d+)$/);
    if (groupItemMatch && method === 'GET') {
      const group = findGroup(groupItemMatch[1]);
      return fulfillJson(route, group || null);
    }

    const groupCompaniesAssociateMatch = pathname.match(
      /^delivery_tax_groups\/(\d+)\/companies\/associate$/,
    );
    if (groupCompaniesAssociateMatch && method === 'POST') {
      const groupId = groupCompaniesAssociateMatch[1];
      const body = postBody();
      const group = findGroup(groupId);
      const companyIds = Array.isArray(body?.companyIds)
        ? body.companyIds.map(value => String(value).replace(/\D+/g, ''))
        : [];

      if (group) {
        group.companies = companyIds.map(companyId => {
          const company = state.companies.find(item => String(item.id) === String(companyId));
          return {
            id: Number(companyId),
            company: company || {
              id: Number(companyId),
              name: `Empresa ${companyId}`,
              alias: `Empresa ${companyId}`,
            },
            enabled: true,
          };
        });
        group.companiesCount = group.companies.length;
        group.activeCompaniesCount = group.companies.filter(link => link.enabled !== false).length;
      }

      return fulfillJson(route, group || null);
    }

    const groupCompanyToggleMatch = pathname.match(
      /^delivery_tax_groups\/(\d+)\/companies\/(\d+)$/,
    );
    if (groupCompanyToggleMatch && method === 'PATCH') {
      const groupId = groupCompanyToggleMatch[1];
      const companyId = groupCompanyToggleMatch[2];
      const body = postBody();
      const group = findGroup(groupId);
      if (group) {
        const link = Array.isArray(group.companies)
          ? group.companies.find(item => String(item.company?.id || item.companyId || item.id) === String(companyId))
          : null;
        if (link) {
          link.enabled = body?.enabled !== false;
        }
        group.activeCompaniesCount = Array.isArray(group.companies)
          ? group.companies.filter(item => item.enabled !== false).length
          : 0;
      }

      return fulfillJson(route, group || null);
    }

    if (pathname === 'delivery_courier_schedules' && method === 'GET') {
      const courierId = String(url.searchParams.get('courier') || '').replace(/\D+/g, '');
      const items = courierId
        ? state.schedules.filter(schedule => String(schedule.courier?.id || schedule.courierId || '') === courierId)
        : state.schedules;

      return fulfillJson(route, normalizeCollectionResponse(items));
    }

    if (pathname === 'delivery_courier_schedules' && method === 'POST') {
      const body = postBody();
      const saved = upsertSchedule({
        id: state.nextScheduleId++,
        courier: state.courier,
        label: body?.label || '',
        weekday: Number(body?.weekday || 1),
        startTime: body?.startTime || '10:00',
        endTime: body?.endTime || '12:00',
        active: body?.active !== false,
        usageCount: 0,
      });

      return fulfillJson(route, saved);
    }

    const scheduleItemMatch = pathname.match(/^delivery_courier_schedules\/(\d+)$/);
    if (scheduleItemMatch && (method === 'GET' || method === 'PUT')) {
      const schedule = findSchedule(scheduleItemMatch[1]);
      if (method === 'GET') {
        return fulfillJson(route, schedule || null);
      }

      const body = postBody();
      const saved = upsertSchedule({
        ...schedule,
        id: Number(scheduleItemMatch[1]),
        label: body?.label || schedule?.label || '',
        weekday: Number(body?.weekday || schedule?.weekday || 1),
        startTime: body?.startTime || schedule?.startTime || '10:00',
        endTime: body?.endTime || schedule?.endTime || '12:00',
        active: body?.active !== false,
      });

      return fulfillJson(route, saved);
    }

    if (pathname === 'delivery_courier_company_presences' && method === 'GET') {
      const companyId = String(url.searchParams.get('company') || '').replace(/\D+/g, '');
      const courierId = String(url.searchParams.get('courier') || '').replace(/\D+/g, '');
      const items = state.presences.filter(presence => {
        const matchesCompany =
          !companyId || String(presence.company?.id || presence.companyId || '') === companyId;
        const matchesCourier =
          !courierId || String(presence.courier?.id || presence.courierId || '') === courierId;
        return matchesCompany && matchesCourier;
      });

      return fulfillJson(route, normalizeCollectionResponse(items));
    }

    if (pathname === 'logs' && method === 'GET') {
      const rowId = String(url.searchParams.get('row') || '').replace(/\D+/g, '');
      const className = String(url.searchParams.get('class') || '').trim();
      const entityIri = String(url.searchParams.get('entity') || '').trim();
      const items = state.logs.filter(log => {
        const matchesRow = !rowId || String(log.rowId || log.row || '').replace(/\D+/g, '') === rowId;
        const matchesClass = !className || !log.className || String(log.className) === className;
        const matchesEntity = !entityIri || !log.entityIri || String(log.entityIri) === entityIri;
        return matchesRow && matchesClass && matchesEntity;
      });

      return fulfillJson(route, normalizeCollectionResponse(items));
    }

    if (pathname === 'delivery_courier_company_presences' && method === 'POST') {
      const body = postBody();
      const companyId = String(body?.companyId || '').replace(/\D+/g, '');
      const scheduleIds = Array.isArray(body?.scheduleIds)
        ? body.scheduleIds.map(value => String(value).replace(/\D+/g, '')).filter(Boolean)
        : [];
      const company = state.companies.find(item => String(item.id) === companyId) || null;
      const linkedSchedules = state.schedules.filter(schedule =>
        scheduleIds.includes(String(schedule.id)),
      );
      const currentPresence = state.presences.find(
        item => String(item.company?.id || item.companyId || '') === companyId,
      );

      const updated = {
        ...(currentPresence || {}),
        id: currentPresence?.id || state.nextPresenceId++,
        company: company || currentPresence?.company || { id: Number(companyId) },
        courier: state.courier,
        availabilityMode: body?.availabilityMode || currentPresence?.availabilityMode || 'automatic',
        isOnline:
          body?.isOnline !== undefined ? Boolean(body.isOnline) : Boolean(currentPresence?.isOnline),
        manualReason:
          body?.manualReason !== undefined
            ? body.manualReason
            : currentPresence?.manualReason || '',
        schedules: linkedSchedules.length > 0 ? linkedSchedules : currentPresence?.schedules || [],
        effectiveOnline:
          body?.isOnline !== undefined ? Boolean(body.isOnline) : Boolean(currentPresence?.effectiveOnline || currentPresence?.isOnline),
        availabilityStateLabel:
          body?.availabilityMode === 'manual'
            ? body?.isOnline
              ? 'Online manual'
              : 'Offline manual'
            : currentPresence?.availabilityStateLabel || 'Online automatico',
        currentModeLabel:
          body?.availabilityMode === 'manual' ? 'Manual' : 'Automatico',
        schedulesSummary:
          linkedSchedules.length > 0
            ? linkedSchedules.map(schedule => schedule.label || schedule.windowLabel || '').filter(Boolean).join(', ')
            : currentPresence?.schedulesSummary || '',
        lastOnlineAt:
          body?.isOnline !== false
            ? '2026-06-06T13:00:00.000Z'
            : currentPresence?.lastOnlineAt || '2026-06-06T12:00:00.000Z',
        lastOfflineAt:
          body?.isOnline === false
            ? '2026-06-06T13:00:00.000Z'
            : currentPresence?.lastOfflineAt || '2026-06-06T11:30:00.000Z',
      };

      const saved = upsertPresence(updated);
      return fulfillJson(route, saved);
    }

    const presenceItemMatch = pathname.match(/^delivery_courier_company_presences\/(\d+)$/);
    if (presenceItemMatch && method === 'GET') {
      const presence = findPresence(presenceItemMatch[1]);
      return fulfillJson(route, presence || null);
    }

    if (presenceItemMatch && method === 'POST') {
      const presence = findPresence(presenceItemMatch[1]);
      const body = postBody();
      const updated = upsertPresence({
        ...(presence || { id: Number(presenceItemMatch[1]) }),
        availabilityMode: body?.availabilityMode || presence?.availabilityMode || 'automatic',
        isOnline:
          body?.isOnline !== undefined ? Boolean(body.isOnline) : Boolean(presence?.isOnline),
        manualReason:
          body?.manualReason !== undefined
            ? body.manualReason
            : presence?.manualReason || '',
      });
      return fulfillJson(route, updated);
    }

    return fulfillJson(route, collection([]));
  });

  await page.addInitScript(
    ({ session, config, device, appType }) => {
      const setLocalStorageItem = (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Some initial documents (like about:blank) do not expose storage.
        }
      };

      setLocalStorageItem('session', JSON.stringify(session));
      setLocalStorageItem('config', JSON.stringify(config));
      setLocalStorageItem('device', JSON.stringify(device));
      setLocalStorageItem('app-type', appType);
    },
    {
      appType: 'DELIVERY',
      session: createFakeSession(),
      config: { language: 'pt-br' },
      device: {
        id: 'web-7',
        device: 'web-7',
        type: 'WEB',
        appName: 'Browser Delivery',
        appVersion: APP_VERSION,
        buildNumber: APP_VERSION,
        systemName: 'web',
        systemVersion: 'web',
        deviceType: 'web',
        metadata: {},
      },
    },
  );

  return state;
};

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


test('opens the delivery home menu and routes without looping backend calls', async ({ page }) => {
  await page.setViewportSize({width: 390, height: 844});
  await createDeliveryApiMock(page, {
    menus: createDeliveryHomeMenus(),
    companies: [
      createCompany(3, {
        name: 'Restaurante Centro',
        alias: 'Centro',
        user: {
          courier_enabled: true,
        },
        permission: ['courier'],
      }),
      createCompany(4, {
        name: 'Restaurante Noite',
        alias: 'Noite',
        user: {
          courier_enabled: false,
        },
        permission: ['employee'],
      }),
    ],
  });

  const requestCounter = createRequestCounter(page);

  const openDeliveryHome = async () => {
    await page.goto('/');
    await expect(page.getByText(/Delivery orders|Pedidos de entrega/).first()).toBeVisible();
    expect(requestCounter.counts.get('menus-people') || 0).toBeGreaterThanOrEqual(1);
    requestCounter.reset();
  };

  await openDeliveryHome();
  const bottomNavigation = page.getByTestId('bottom-navigation');
  await expect(bottomNavigation).toBeVisible({timeout: 15000});
  const bottomNavigationBox = await bottomNavigation.boundingBox();
  expect(bottomNavigationBox).toBeTruthy();
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const bottomGap = viewport.height - (bottomNavigationBox.y + bottomNavigationBox.height);
  expect(bottomGap).toBeLessThanOrEqual(64);
  const leftGap = bottomNavigationBox.x;
  const rightGap = viewport.width - (bottomNavigationBox.x + bottomNavigationBox.width);
  expect(leftGap).toBeLessThanOrEqual(4);
  expect(rightGap).toBeLessThanOrEqual(4);
  const paddingBottom = await bottomNavigation.evaluate(node =>
    Number.parseFloat(window.getComputedStyle(node).paddingBottom || '0'),
  );
  expect(paddingBottom).toBeGreaterThan(0);
  await page.getByText(/Delivery orders|Pedidos de entrega/).first().click();
  await expect(page).toHaveURL(/delivery\/orders/);
  await page.waitForTimeout(250);
  // The delivery shell may finish one queue prefetch while the table performs
  // its paginated load; the guard is against an unbounded reload loop.
  expect(requestCounter.counts.get('orders') || 0).toBeLessThanOrEqual(3);

  await openDeliveryHome();
  await page.getByText(/Delivery receivables|Recebiveis/).first().click();
  await expect(page).toHaveURL(/delivery\/receivables/);
  await expect(page.getByPlaceholder('Buscar recebivel')).toBeVisible();
  await page.waitForTimeout(1500);
  expect(requestCounter.counts.get('invoices') || 0).toBeLessThanOrEqual(1);

  await openDeliveryHome();
  await page.getByText(/Delivery companies|Empresas homologadas/).first().click();
  await expect(page).toHaveURL(/delivery\/companies/);
  await expect(page.getByText(/Delivery Companies|Empresas homologadas/).first()).toBeVisible();
  await expect(page.getByText('Lista de empresas')).toBeVisible();
  await expect(page.getByText('1 empresas', { exact: true })).toBeVisible();
  await expect(page.getByText('#3', { exact: true })).toBeVisible();
  await expect(page.getByText('#4', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(requestCounter.counts.get('people/companies/my') || 0).toBeLessThanOrEqual(2);
  expect(requestCounter.counts.get('delivery_courier_company_presences') || 0).toBeLessThanOrEqual(2);

  await openDeliveryHome();
  await page.getByText(/Delivery rates|Minhas tabelas/).first().click();
  await expect(page).toHaveURL(/delivery\/courier\/rates/);
  await expect(page.getByRole('heading', { name: 'Minhas tabelas' })).toBeVisible();
  await page.waitForTimeout(750);
  expect(requestCounter.counts.get('delivery_courier_vehicles') || 0).toBeLessThanOrEqual(2);
  expect(requestCounter.counts.get('delivery_tax_groups') || 0).toBeLessThanOrEqual(2);

  requestCounter.stop();
});

test.describe('delivery browser smoke', () => {
  test('opens the courier vehicle setup and lands on the rate table list after save', async ({
    page,
  }) => {
    await createDeliveryApiMock(page, {
      vehicles: [],
    });

    await page.goto('/delivery/courier/vehicle/setup');

    await expect(page.getByRole('heading', { name: 'Cadastro do veículo' })).toBeVisible();
    await expect(page.getByText('Salvar veículo', { exact: true })).toBeVisible();

    await page.getByText('Bicicleta', { exact: true }).locator('xpath=..').click();
    await page.getByPlaceholder('Ex.: Honda').fill('Shimano');
    await page.getByPlaceholder('Ex.: CG 160').fill('Breeze');
    await page.getByPlaceholder('Ex.: 2024').fill('2025');
    await page.getByPlaceholder('Ex.: ABC1D23').fill('xyz9q12');
    await page.getByPlaceholder('Ex.: Preta').fill('Vermelha');

    await page.getByText('Salvar veículo', { exact: true }).click();

    await expect(page).toHaveURL(/delivery\/courier\/rates/);
    await expect(page.getByRole('heading', { name: 'Minhas tabelas' })).toBeVisible();
  });

  test('opens the courier rate list, version detail and company activation pages', async ({
    page,
  }) => {
    await createDeliveryApiMock(page, {
      groups: [
        buildGroupRow(
          {
            id: 101,
            groupName: 'Tabela Central',
            code: 'CENTRO',
            vehicleType: 'moto',
            versionNumber: 1,
            courier: createCourier(),
            taxes: [
              {
                id: 1,
                taxName: 'Faixa 1',
                kmFrom: '0',
                kmTo: '5',
                pricePerKm: '3.50',
                minimumTripValue: '10.00',
                minimumDailyValue: '25.00',
              },
              {
                id: 2,
                taxName: 'Faixa 2',
                kmFrom: '5',
                kmTo: '10',
                pricePerKm: '4.00',
                minimumTripValue: '12.00',
                minimumDailyValue: '30.00',
              },
            ],
            companies: [
              {
                id: 3,
                company: createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
                enabled: true,
              },
              {
                id: 4,
                company: createCompany(4, { name: 'Restaurante Noite', alias: 'Noite' }),
                enabled: false,
              },
            ],
          },
          { courier: createCourier() },
        ),
      ],
    });

    await page.goto('/delivery/courier/rates');

    await expect(page.getByRole('heading', { name: 'Minhas tabelas' })).toBeVisible();
    await expect(page.getByText('Tabela Central', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Moto', { exact: true })).toBeVisible();

    await page.getByText('Tabela Central', { exact: true }).last().click();

    await expect(page.getByRole('heading', { name: 'Detalhe da tabela' })).toBeVisible();
    await expect(page.getByText('Tabela Central', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Empresas', { exact: true }).last()).toBeVisible();

    await page.goto('/delivery/manager/rates/history?code=101');

    await expect(page.getByRole('heading', { name: 'Histórico da tabela' })).toBeVisible();
    await expect(page.getByText('Tabela Central', { exact: true }).last()).toBeVisible();

    await page.goto('/delivery/manager/rates/companies?id=101');

    await expect(page.getByText('Ativação por empresa', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Restaurante Centro - Centro').last()).toBeVisible();
    await expect(page.getByText('Restaurante Noite - Noite', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Tabela ativa', { exact: true })).toBeVisible();
    await expect(page.getByText('Tabela inativa', { exact: true })).toBeVisible();
  });

  test('opens the courier presence flow and saves a reusable schedule', async ({ page }) => {
    await createDeliveryApiMock(page, {
      schedules: [
        buildScheduleRow({
          id: 201,
          courier: createCourier(),
          label: 'Segunda - manha',
          weekday: 1,
          startTime: '10:00',
          endTime: '12:00',
          active: true,
          usageCount: 2,
        }),
      ],
      presences: [
        buildPresenceRow({
          id: 301,
          company: createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
          courier: createCourier(),
          availabilityMode: 'manual',
          isOnline: true,
          manualReason: 'Imprevisto na rota',
          schedules: [],
        }),
      ],
    });

    await page.goto('/delivery/courier/presence/detail?companyId=3');

    await expect(page.getByText('Restaurante Centro - Centro', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Ligar', { exact: true })).toBeVisible();
    await expect(page.getByText('Desligar', { exact: true })).toBeVisible();
    await expect(page.getByText('Horarios', { exact: true })).toBeVisible();

    await page.getByText('Horarios', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Horarios do motoboy' })).toBeVisible();
    await expect(page.getByText('Novo horario', { exact: true }).last()).toBeVisible();

    await page.goto('/delivery/courier/presence/schedule-form');
    await expect(page.getByText(/Horario do motoboy|Horarios do motoboy/).first()).toBeVisible();

    await page.getByPlaceholder('Opcional').first().fill('Terça - tarde');
    await page.getByText('Terca', { exact: true }).locator('xpath=..').click();

    await page.getByPlaceholder('10:00').fill('14:00');
    await page.getByPlaceholder('12:00').fill('18:00');

    await page.getByText('Salvar horario', { exact: true }).click();

    await expect(page).toHaveURL(/delivery\/courier\/presence\/schedules/);
    await expect(page.getByRole('heading', { name: 'Horarios do motoboy' })).toBeVisible();
    await expect(page.getByText('Terça - tarde', { exact: true })).toBeVisible();
  });

  test('opens the manager inbox and readonly presence detail', async ({ page }) => {
    await createDeliveryApiMock(page, {
      presences: [
        buildPresenceRow({
          id: 301,
          company: createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
          courier: createCourier(),
          availabilityMode: 'manual',
          isOnline: true,
          manualReason: 'Imprevisto na rota',
          schedules: [
            buildScheduleRow({
              id: 201,
              courier: createCourier(),
              label: 'Segunda - manha',
              weekday: 1,
              startTime: '10:00',
              endTime: '12:00',
              active: true,
              usageCount: 2,
            }),
          ],
          schedulesSummary: 'Segunda - manha',
        }),
      ],
    });

    await page.goto('/delivery/manager/presence');

    await expect(page.getByRole('heading', { name: 'Presenca dos motoboys' })).toBeVisible();
    await expect(page.getByText('Restaurante Centro - Centro', { exact: true }).first()).toBeVisible();

    await page.goto('/delivery/manager/presence/detail?presenceId=301');

    await expect(page.getByText('Somente leitura para o manager.')).toBeVisible();
    await expect(page.getByText('Restaurante Centro - Centro', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Imprevisto na rota')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ligar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Desligar' })).toHaveCount(0);
  });

  test('opens the courier table form and saves a new version draft', async ({ page }) => {
    await createDeliveryApiMock(page);

    await page.goto('/delivery/courier/rates/form');

    await expect(page.getByRole('heading', { name: 'Nova tabela' })).toBeVisible();
    await expect(page.getByText('Salvar tabela', { exact: true })).toBeVisible();

    await page.getByPlaceholder('Ex.: Entrega região central').fill('Entrega Centro');
    await page.getByPlaceholder('Opcional').first().fill('CENTRO');
    await page.getByText('Moto', { exact: true }).locator('xpath=..').click();

    await page.getByPlaceholder('Km inicial').fill('0');
    await page.getByPlaceholder('Km final').fill('5');
    await page.getByPlaceholder('Valor por km').fill('3.50');
    await page.getByPlaceholder('Mínimo por viagem').fill('10.00');
    await page.getByPlaceholder('Mínimo da diária').fill('25.00');

    await page.getByText('Salvar tabela', { exact: true }).locator('xpath=..').click();

    await expect(page).toHaveURL(/delivery\/courier\/rates\/companies/);
    await expect(page.getByRole('heading', { name: 'Associar empresas' })).toBeVisible();
    await expect(page.getByText('Restaurante Centro - Centro', { exact: true }).last()).toBeVisible();
  });

  test('opens the courier presence history screen from the detail view', async ({ page }) => {
    await createDeliveryApiMock(page, {
      presences: [
        buildPresenceRow({
          id: 301,
          company: createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
          courier: createCourier(),
          availabilityMode: 'manual',
          isOnline: true,
          manualReason: 'Imprevisto na rota',
          schedules: [
            buildScheduleRow({
              id: 201,
              courier: createCourier(),
              label: 'Segunda - manha',
              weekday: 1,
              startTime: '10:00',
              endTime: '12:00',
              active: true,
              usageCount: 2,
            }),
          ],
          schedulesSummary: 'Segunda - manha',
        }),
      ],
      logs: [
        buildLogRow({
          id: 9001,
          rowId: 301,
          className: 'ControleOnline\\Entity\\DeliveryCourierCompanyPresence',
          entityIri: '/delivery_courier_company_presences/301',
          action: 'update',
          payload: {
            message: 'Imprevisto na rota',
            availabilityMode: 'manual',
            isOnline: true,
            manualReason: 'Imprevisto na rota',
          },
        }),
      ],
    });

    await page.goto('/delivery/courier/presence/detail?companyId=3');

    await expect(page.getByText('Restaurante Centro - Centro', { exact: true }).first()).toBeVisible();
    await page.getByText('Historico', { exact: true }).click();

    await expect(page).toHaveURL(/delivery\/courier\/presence\/history/);
    await expect(page.getByText('Timeline')).toBeVisible();
    await expect(page.getByText('Imprevisto na rota').last()).toBeVisible();
  });

  test('opens the manager presence history screen in read only mode', async ({ page }) => {
    await createDeliveryApiMock(page, {
      presences: [
        buildPresenceRow({
          id: 301,
          company: createCompany(3, { name: 'Restaurante Centro', alias: 'Centro' }),
          courier: createCourier(),
          availabilityMode: 'manual',
          isOnline: true,
          manualReason: 'Imprevisto na rota',
          schedulesSummary: 'Segunda - manha',
        }),
      ],
      logs: [
        buildLogRow({
          id: 9001,
          rowId: 301,
          className: 'ControleOnline\\Entity\\DeliveryCourierCompanyPresence',
          entityIri: '/delivery_courier_company_presences/301',
          action: 'update',
          payload: {
            message: 'Imprevisto na rota',
            availabilityMode: 'manual',
            isOnline: true,
            manualReason: 'Imprevisto na rota',
          },
        }),
      ],
    });

    await page.goto(
      '/delivery/manager/presence/history?id=301&store=delivery_courier_company_presences&entityClass=ControleOnline%5CEntity%5CDeliveryCourierCompanyPresence&entityLabel=Restaurante%20Centro%20-%20Centro',
    );

    await expect(page.getByText('Timeline')).toBeVisible();
    await expect(page.getByText('Restaurante Centro - Centro', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Imprevisto na rota').last()).toBeVisible();
  });

  test('opens an accepted delivery trip with route and order details', async ({ page }) => {
    bindBrowserDiagnostics(page);
    const deliveryOrder = buildDeliveryOrderRow();
    const routeRequests = [];

    await page.context().grantPermissions(['geolocation'], {
      origin: 'http://localhost:8081',
    });
    await page.context().setGeolocation({
      latitude: -23.55052,
      longitude: -46.633308,
    });

    page.on('request', request => {
      if (request.url().includes('router.project-osrm.org/route/v1/driving')) {
        routeRequests.push(request);
      }
    });

    await createDeliveryApiMock(page, {
      orders: [deliveryOrder],
      logisticsOrders: {
        [deliveryOrder.id]: buildDeliveryLogisticsPayload(deliveryOrder),
      },
    });


    await page.goto('/delivery/orders');

    await expect(page.getByText('Cliente Teste').first()).toBeVisible();
    await expect(page.getByText('accept').first()).toBeVisible();

    await page.goto('/order-logistics-page?id=' + deliveryOrder.id);

    await expect(page.getByText('Detalhes da entrega', { exact: true })).toBeVisible();
    await expect(page.getByText('Valor da entrega', { exact: true })).toBeVisible();
    await expect(page.getByText('Pedido atual', { exact: true })).toBeVisible();
    await expect(page.getByText('#991', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Mapa da entrega', { exact: true })).toBeVisible();
    await expect(page.getByText('Coleta', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Entrega', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Aceito', { exact: true }).first()).toBeVisible();
    expect(routeRequests.length).toBeGreaterThan(0);
  });

  test('shows acceptance actions for delivery orders that are waiting for acceptance', async ({
    page,
  }) => {
    const waitingOrder = buildDeliveryOrderRow({
      id: 72533,
      status: {
        '@id': '/statuses/waiting-acceptance',
        id: 944,
        status: 'aguardando aceite',
        realStatus: 'pending',
        color: '#e67e22',
      },
    });

    await createDeliveryApiMock(page, {
      orders: [waitingOrder],
      logisticsOrders: {
        [waitingOrder.id]: buildDeliveryLogisticsPayload(waitingOrder),
      },
    });

    await page.goto('/order-details?store=orders&id=' + waitingOrder.id);

    await expect(page.getByText('Aguardando aceite').first()).toBeVisible();
    await expect(page.getByText(/Aceitar corrida/i)).toBeVisible();
    await expect(page.getByText(/Cancelar corrida/i)).toBeVisible();
  });

  test('opens the delivery route directly when all orders are already accepted', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    await page.context().grantPermissions(['geolocation'], {
      origin: 'http://localhost:8081',
    });
    await page.context().setGeolocation({
      latitude: -23.55052,
      longitude: -46.633308,
    });

    const acceptedOrderOne = buildDeliveryOrderRow({
      id: 72533,
      orderDate: '2026-06-10T09:00:00.000Z',
      status: {
        '@id': '/statuses/accepted-1',
        id: 9991,
        status: 'aceito',
        realStatus: 'accepted',
        color: '#16A34A',
      },
      addressDestination: createAddress('destination-72533', {
        label: 'Destino 72533',
        street: 'Rua Distante',
        number: '900',
        district: 'Jardim Maia',
        city: 'Guarulhos',
        uf: 'SP',
        cep: '07150-000',
        latitude: -23.5684,
        longitude: -46.6058,
      }),
    });
    acceptedOrderOne.delivery = {
      etaMinutes: 10,
    };

    const acceptedOrderTwo = buildDeliveryOrderRow({
      id: 72534,
      orderDate: '2026-06-10T10:00:00.000Z',
      status: {
        '@id': '/statuses/accepted-2',
        id: 9992,
        status: 'aceito',
        realStatus: 'accepted',
        color: '#16A34A',
      },
      addressDestination: createAddress('destination-72534', {
        label: 'Destino 72534',
        street: 'Rua Proxima',
        number: '120',
        district: 'Centro',
        city: 'Guarulhos',
        uf: 'SP',
        cep: '07010-000',
        latitude: -23.5512,
        longitude: -46.6329,
      }),
    });
    acceptedOrderTwo.delivery = {
      etaMinutes: 30,
    };

    const acceptedOrderThree = buildDeliveryOrderRow({
      id: 72535,
      orderDate: '2026-06-10T11:00:00.000Z',
      status: {
        '@id': '/statuses/accepted-3',
        id: 9993,
        status: 'aceito',
        realStatus: 'accepted',
        color: '#16A34A',
      },
      addressDestination: createAddress('destination-72535', {
        label: 'Destino 72535',
        street: 'Avenida Intermediaria',
        number: '450',
        district: 'Vila Augusta',
        city: 'Guarulhos',
        uf: 'SP',
        cep: '07023-000',
        latitude: -23.5577,
        longitude: -46.6391,
      }),
    });
    acceptedOrderThree.delivery = {
      etaMinutes: 20,
    };

    await createDeliveryApiMock(page, {
      orders: [acceptedOrderOne, acceptedOrderTwo, acceptedOrderThree],
      logisticsOrders: {
        [acceptedOrderOne.id]: buildDeliveryLogisticsPayload(acceptedOrderOne),
        [acceptedOrderTwo.id]: buildDeliveryLogisticsPayload(acceptedOrderTwo),
        [acceptedOrderThree.id]: buildDeliveryLogisticsPayload(acceptedOrderThree),
      },
    });

    await page.goto('/delivery/orders');
    await expect(page).toHaveURL(/delivery\/run/, {timeout: 15000});
    const runUrl = new URL(page.url());
    expect(runUrl.pathname).toBe('/delivery/run');
    expect(runUrl.searchParams.has('id')).toBe(false);
    await expect(page.getByText(/Corrida ativa/i)).toBeVisible();
    await expect(page.getByText(/Parada atual/i)).toBeVisible();
    await expect(page.getByText(/Marcar como entregue/i)).toBeVisible();
  });

  test('locks the delivery app on the first pending order and advances the queue', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const firstWaitingOrder = buildDeliveryOrderRow({
      id: 72533,
      orderDate: '2026-06-10T10:00:00.000Z',
      status: {
        '@id': '/statuses/waiting-acceptance',
        id: 944,
        status: 'aguardando aceite',
        realStatus: 'pending',
        color: '#e67e22',
      },
    });
    firstWaitingOrder.delivery = {
      etaMinutes: 30,
    };
    const secondWaitingOrder = buildDeliveryOrderRow({
      id: 72534,
      orderDate: '2026-06-10T11:00:00.000Z',
      status: {
        '@id': '/statuses/waiting-acceptance-2',
        id: 945,
        status: 'aguardando aceite',
        realStatus: 'pending',
        color: '#e67e22',
      },
    });
    secondWaitingOrder.delivery = {
      etaMinutes: 10,
    };
    const acceptedOrder = buildDeliveryOrderRow({
      id: 72535,
      orderDate: '2026-06-10T09:00:00.000Z',
      status: {
        '@id': '/statuses/accept',
        id: 999,
        status: 'aceito',
        realStatus: 'accepted',
        color: '#16A34A',
      },
    });
    acceptedOrder.delivery = {
      etaMinutes: 20,
    };

    await createDeliveryApiMock(page, {
      orders: [acceptedOrder, firstWaitingOrder, secondWaitingOrder],
      logisticsOrders: {
        [acceptedOrder.id]: buildDeliveryLogisticsPayload(acceptedOrder),
        [firstWaitingOrder.id]: buildDeliveryLogisticsPayload(firstWaitingOrder),
        [secondWaitingOrder.id]: buildDeliveryLogisticsPayload(secondWaitingOrder),
      },
    });

    await page.goto('/delivery/orders');
    await expect(page).toHaveURL(/order-details\?store=orders&id=72533/, {timeout: 15000});

    await expect(page.getByText('Aguardando aceite').first()).toBeVisible();
    await expect(page.getByText(/Aceitar corrida/i)).toBeVisible();
    await expect(page.getByText(/Cancelar corrida/i)).toBeVisible();

    await page.getByText(/Aceitar corrida/i).click();
    await expect(page).toHaveURL(
      /order-details.*id=72534/,
    );

    await expect(page.getByText('Aguardando aceite').first()).toBeVisible();
    await expect(page.getByText(/Aceitar corrida/i)).toBeVisible();
    await expect(page.getByText(/Cancelar corrida/i)).toBeVisible();

    await page.getByText(/Aceitar corrida/i).click();
    await expect(page).toHaveURL(/delivery\/run/, {timeout: 15000});
    expect(new URL(page.url()).searchParams.has('id')).toBe(false);

    await expect(page.getByText(/Corrida ativa/i)).toBeVisible();
    await expect(page.getByText(/Parada atual/i)).toBeVisible();
    const markDeliveredButton = page.getByText(/Marcar como entregue/i).first();
    await expect(markDeliveredButton).toBeVisible();

    await markDeliveredButton.click();
    await expect(page).toHaveURL(/delivery\/run/, {timeout: 15000});
    expect(new URL(page.url()).searchParams.has('id')).toBe(false);

    await expect(page.getByText(/Corrida ativa/i)).toBeVisible();
    await expect(markDeliveredButton).toBeVisible();

    await markDeliveredButton.click();
    await expect(page).toHaveURL(/delivery\/run/, {timeout: 15000});
    expect(new URL(page.url()).searchParams.has('id')).toBe(false);
    await expect(page.getByText(/Corrida ativa/i)).toBeVisible();

    await markDeliveredButton.click();
    await expect(page).toHaveURL(/delivery\/run/, {timeout: 15000});
    expect(new URL(page.url()).searchParams.has('id')).toBe(false);
    await expect(page.getByText(/Corrida ativa/i)).toHaveCount(0);
    await expect(page.getByText(/Parada atual/i)).toHaveCount(0);
    await expect(page.getByText(/Marcar como entregue/i)).toHaveCount(0);
  });

  test('opens order details for a delivery order without reloading it in a loop', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);

    const deliveryOrder = buildDeliveryOrderRow({
      id: 72532,
      price: 47.47,
      orderDate: '2026-06-10T12:00:00.000Z',
      alterDate: '2026-06-10T12:05:00.000Z',
      deliveryPeopleId: null,
      deliveryPeople: null,
      status: {
        '@id': '/statuses/closed',
        id: 1001,
        status: 'closed',
        realStatus: 'closed',
        color: '#6B7280',
      },
      addressOrigin: createAddress('origin-72532', {
        label: 'Origem da viagem',
        street: 'Rua das Flores',
        number: '123',
        district: 'Centro',
        city: 'Sao Paulo',
        uf: 'SP',
        cep: '01000-010',
        latitude: -23.55052,
        longitude: -46.633308,
      }),
      addressDestination: createAddress('destination-72532', {
        label: 'Destino fake do teste',
        street: 'Rua Falsa do Teste',
        number: '200',
        district: 'Centro',
        city: 'Sao Paulo',
        uf: 'SP',
        cep: '01000-000',
        latitude: -23.563987,
        longitude: -46.654321,
      }),
    });

    const orderRequests = [];
    page.on('request', request => {
      if (
        request.method() === 'GET' &&
        new URL(request.url()).pathname === '/orders/72532'
      ) {
        orderRequests.push(request);
      }
    });

    await createDeliveryApiMock(page, {
      orders: [deliveryOrder],
      logisticsOrders: {
        [deliveryOrder.id]: buildDeliveryLogisticsPayload(deliveryOrder),
      },
    });

    await page.goto('/order-details?store=orders&id=72532');

    await page.waitForTimeout(1200);

    await expect(page.getByText('Entrega', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Mapa da entrega', { exact: true })).toBeVisible();
    await expect(page.getByText('Detalhes da entrega', { exact: true })).toBeVisible();
    await expect(page.getByText(/Corrida ativa/i)).toHaveCount(0);
    await expect(page.getByText(/Marcar como entregue/i)).toHaveCount(0);

    expect(orderRequests.length).toBeLessThanOrEqual(3);
  });
});
