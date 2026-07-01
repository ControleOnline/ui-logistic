const normalizeText = value => String(value ?? '').trim();

export const normalizeDeliveryOrderId = value =>
  normalizeText(value).replace(/\D+/g, '');

export const DELIVERY_STATUS_AWAITING_ACCEPTANCE = [
  'aguardando aceite',
  'awaiting acceptance',
  'waiting acceptance',
  'pending acceptance',
  'acceptance pending',
  'pending',
  'pendente',
];

const DELIVERY_STATUS_ACCEPTED = ['aceito', 'accepted', 'accept'];
const DELIVERY_STATUS_CANCELLED = ['cancelado', 'canceled', 'cancelled', 'cancel'];

export const normalizeDeliveryStatusKey = value =>
  normalizeText(value).toLowerCase();

export const includesDeliveryStatusKey = (value, keys) =>
  keys.some(key => normalizeDeliveryStatusKey(value).includes(key));

export const resolveDeliveryStatusLabel = value => {
  const normalized = normalizeDeliveryStatusKey(value);

  if (!normalized) {
    return 'Status nao informado';
  }

  if (includesDeliveryStatusKey(normalized, DELIVERY_STATUS_AWAITING_ACCEPTANCE)) {
    return 'Aguardando aceite';
  }

  if (DELIVERY_STATUS_ACCEPTED.includes(normalized)) {
    return 'Aceito';
  }

  if (DELIVERY_STATUS_CANCELLED.includes(normalized)) {
    return 'Cancelado';
  }

  return normalizeText(value);
};

export const resolveDeliveryStatusTone = value => {
  const normalized = normalizeDeliveryStatusKey(value);

  if (includesDeliveryStatusKey(normalized, DELIVERY_STATUS_AWAITING_ACCEPTANCE)) {
    return 'warning';
  }

  if (DELIVERY_STATUS_CANCELLED.includes(normalized)) {
    return 'danger';
  }

  if (DELIVERY_STATUS_ACCEPTED.includes(normalized)) {
    return 'success';
  }

  return 'success';
};

const resolveDeliveryOrderType = order => {
  const normalized = normalizeText(order?.orderType || order?.order_type || '').toLowerCase();
  return normalized;
};

const resolveQueueTimestamp = order => {
  const candidates = [
    order?.orderDate,
    order?.order_date,
    order?.createdAt,
    order?.created_at,
    order?.alterDate,
    order?.alter_date,
  ];

  for (const candidate of candidates) {
    const timestamp = Date.parse(candidate);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  const numericId = Number.parseInt(normalizeDeliveryOrderId(order?.id), 10);
  return Number.isFinite(numericId) ? numericId : Number.MAX_SAFE_INTEGER;
};

export const isDeliveryOrderAwaitingAcceptance = order => {
  if (!order || typeof order !== 'object') {
    return false;
  }

  if (resolveDeliveryOrderType(order) !== 'delivery') {
    return false;
  }

  const statusSource =
    order?.status?.status ||
    order?.status?.realStatus ||
    order?.status?.name ||
    order?.delivery?.status ||
    order?.quoteState ||
    '';

  return includesDeliveryStatusKey(statusSource, DELIVERY_STATUS_AWAITING_ACCEPTANCE);
};

export const resolveDeliveryAcceptanceQueue = orders =>
  (Array.isArray(orders) ? orders : [])
    .filter(isDeliveryOrderAwaitingAcceptance)
    .slice()
    .sort((left, right) => {
      const leftTimestamp = resolveQueueTimestamp(left);
      const rightTimestamp = resolveQueueTimestamp(right);

      if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
      }

      const leftId = Number.parseInt(normalizeDeliveryOrderId(left?.id), 10) || 0;
      const rightId = Number.parseInt(normalizeDeliveryOrderId(right?.id), 10) || 0;

      return leftId - rightId;
    });

export const resolveDeliveryAcceptanceQueueHead = orders =>
  resolveDeliveryAcceptanceQueue(orders)[0] || null;
