const MARKETPLACE_COURIER_KEYS = new Set(['ifood', 'food99', '99food']);
const OWN_DELIVERY_KEYS = new Set(['delivery', 'own', 'internal', 'nossa']);
const PAY_ON_DELIVERY_POLICIES = new Set([
  'on_delivery',
  'pay_at_delivery',
  'pay_at_exit_or_delivery',
  'delivery',
  'cobrar_na_entrega',
]);

const normalizeKey = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const readStatusToken = status =>
  normalizeKey(
    status && typeof status === 'object'
      ? status.realStatus || status.status || status.name
      : status,
  );

export const isMarketplaceCourier = providerKey =>
  MARKETPLACE_COURIER_KEYS.has(normalizeKey(providerKey));

export const isOwnDeliveryProvider = providerKey => {
  const key = normalizeKey(providerKey);
  if (!key) {
    return true;
  }

  return OWN_DELIVERY_KEYS.has(key) && !MARKETPLACE_COURIER_KEYS.has(key);
};

export const isSaleOrderReady = status => readStatusToken(status) === 'ready';

export const shouldOpenOnDelivery = ({saleStatus, providerKey} = {}) =>
  isSaleOrderReady(saleStatus) &&
  isOwnDeliveryProvider(providerKey) &&
  !isMarketplaceCourier(providerKey);

export const needsChargeOnDelivery = ({paymentPolicy, invoices} = {}) => {
  const policy = normalizeKey(paymentPolicy);
  if (!PAY_ON_DELIVERY_POLICIES.has(policy)) {
    return false;
  }

  const rows = Array.isArray(invoices) ? invoices : [];
  if (rows.length === 0) {
    return true;
  }

  return rows.some(invoice => {
    const paidFlag = invoice?.paid === true || invoice?.isPaid === true;
    const status = readStatusToken(invoice?.status);
    return !paidFlag && status !== 'paid';
  });
};

export const filterOwnDeliveryQueue = (orders = [], {saleOrdersById} = {}) =>
  (Array.isArray(orders) ? orders : []).filter(order => {
    const providerKey =
      order?.providerKey ||
      order?.app ||
      order?.currentIntegrationKey ||
      (order?.orderType === 'delivery' ? 'delivery' : '');
    const mainOrderId = String(
      order?.mainOrderId || order?.main_order_id || order?.mainOrder?.id || '',
    );
    const saleOrder =
      (saleOrdersById && mainOrderId && saleOrdersById[mainOrderId]) ||
      order?.mainOrder ||
      null;
    const saleStatus = saleOrder?.status || order?.saleStatus;

    return shouldOpenOnDelivery({saleStatus, providerKey});
  });

export const OWN_DELIVERY_SMOKE_META = {
  flowchartIds: [1],
  flowchartLinks: ['https://admin.controleonline.com/admin/flowcharts/1'],
  fluxo: 'logistica-entrega',
  issue: 'ControleOnline/app-community#610',
  steps: [
    'ready',
    'escolha-delivery-nossa',
    'lista-delivery',
    'cobranca-na-entrega',
    'closed',
  ],
};
