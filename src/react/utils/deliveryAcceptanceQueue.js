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
const DELIVERY_STATUS_IN_ROUTE = [
  'em rota',
  'en route',
  'in route',
  'on route',
  'way',
  'away',
  'picked up',
  'pickup',
  'dispatch',
  'delivery',
  'delivering',
];
const DELIVERY_STATUS_CANCELLED = ['cancelado', 'canceled', 'cancelled', 'cancel'];
const DELIVERY_STATUS_TERMINAL = [
  'closed',
  'fechado',
  'delivered',
  'entregue',
  'finished',
  'finalizado',
  ...DELIVERY_STATUS_CANCELLED,
];

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

const resolveDeliveryOrderStatusSource = order =>
  order?.status?.status ||
  order?.status?.realStatus ||
  order?.status?.name ||
  order?.delivery?.status ||
  order?.quoteState ||
  '';

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

  return includesDeliveryStatusKey(resolveDeliveryOrderStatusSource(order), DELIVERY_STATUS_AWAITING_ACCEPTANCE);
};

export const isDeliveryOrderInProgress = order => {
  if (!order || typeof order !== 'object') {
    return false;
  }

  if (resolveDeliveryOrderType(order) !== 'delivery') {
    return false;
  }

  const statusSource = resolveDeliveryOrderStatusSource(order);

  if (!statusSource) {
    return Boolean(order?.deliveryPeopleId || order?.deliveryPeople);
  }

  if (
    includesDeliveryStatusKey(statusSource, DELIVERY_STATUS_AWAITING_ACCEPTANCE) ||
    includesDeliveryStatusKey(statusSource, DELIVERY_STATUS_TERMINAL)
  ) {
    return false;
  }

  if (includesDeliveryStatusKey(statusSource, DELIVERY_STATUS_ACCEPTED)) {
    return true;
  }

  if (includesDeliveryStatusKey(statusSource, DELIVERY_STATUS_IN_ROUTE)) {
    return true;
  }

  return Boolean(order?.deliveryPeopleId || order?.deliveryPeople || order?.delivery?.trackingUrl);
};

export const resolveDeliveryWorkflowRouteName = order => {
  if (isDeliveryOrderAwaitingAcceptance(order)) {
    return 'OrderDetails';
  }

  if (isDeliveryOrderInProgress(order)) {
    return 'DeliveryRunPage';
  }

  return null;
};

const resolveDeliveryRoutePriority = order => {
  const candidates = [
    order?.delivery?.routeOrder,
    order?.delivery?.route_order,
    order?.delivery?.stopIndex,
    order?.delivery?.stop_index,
    order?.route?.routeOrder,
    order?.route?.route_order,
    order?.route?.stopIndex,
    order?.route?.stop_index,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
};

const resolveDeliveryEtaMinutes = order => {
  const candidates = [
    order?.delivery?.etaMinutes,
    order?.delivery?.eta_minutes,
    order?.delivery?.estimatedEtaMinutes,
    order?.delivery?.estimated_eta_minutes,
    order?.route?.etaMinutes,
    order?.route?.eta_minutes,
    order?.route?.estimatedEtaMinutes,
    order?.route?.estimated_eta_minutes,
    order?.etaMinutes,
    order?.eta_minutes,
    order?.estimatedEtaMinutes,
    order?.estimated_eta_minutes,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
};

const pickFiniteCoordinate = (...candidates) => {
  for (const candidate of candidates) {
    const numeric = Number(String(candidate ?? '').replace(',', '.'));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
};

export const resolveDeliveryStopCoordinates = order => {
  const address =
    order?.addressDestination ||
    order?.delivery?.addressDestination ||
    order?.delivery?.dropoffAddress ||
    order?.route?.dropoffAddress ||
    order?.route?.destination ||
    order?.route?.dropoff ||
    null;

  if (!address || typeof address !== 'object') {
    return null;
  }

  const latitude = pickFiniteCoordinate(
    address.latitude,
    address.lat,
    address.coords?.latitude,
    address.coordinates?.latitude,
    address.location?.latitude,
    address.geo?.latitude,
  );
  const longitude = pickFiniteCoordinate(
    address.longitude,
    address.lng,
    address.coords?.longitude,
    address.coordinates?.longitude,
    address.location?.longitude,
    address.geo?.longitude,
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return {latitude, longitude};
};

const haversineDistanceKm = (from, to) => {
  const fromCoordinates = from && typeof from === 'object' ? from : null;
  const toCoordinates = to && typeof to === 'object' ? to : null;

  if (!fromCoordinates || !toCoordinates) {
    return null;
  }

  const toRadians = value => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(toCoordinates.latitude - fromCoordinates.latitude);
  const deltaLongitude = toRadians(toCoordinates.longitude - fromCoordinates.longitude);
  const latitude1 = toRadians(fromCoordinates.latitude);
  const latitude2 = toRadians(toCoordinates.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number.isFinite(c) ? earthRadiusKm * c : null;
};

const resolveDeliveryQueueFallbackTimestamp = order => {
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

const compareRunQueueItemsByFallback = (left, right) => {
  const leftTimestamp = resolveDeliveryQueueFallbackTimestamp(left);
  const rightTimestamp = resolveDeliveryQueueFallbackTimestamp(right);

  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  const leftId = Number.parseInt(normalizeDeliveryOrderId(left?.id), 10) || 0;
  const rightId = Number.parseInt(normalizeDeliveryOrderId(right?.id), 10) || 0;

  return leftId - rightId;
};

const chooseClosestRunStop = (origin, queue) => {
  let winner = null;
  let winnerDistance = null;

  queue.forEach(item => {
    const itemCoordinates = resolveDeliveryStopCoordinates(item);
    if (!itemCoordinates) {
      return;
    }

    const distance = haversineDistanceKm(origin, itemCoordinates);
    if (!Number.isFinite(distance)) {
      return;
    }

    if (winner === null || distance < winnerDistance) {
      winner = item;
      winnerDistance = distance;
    }
  });

  return winner;
};

const resolveBestRunOriginCoordinates = queue => {
  const entries = (Array.isArray(queue) ? queue : [])
    .map(order => ({
      order,
      coordinates: resolveDeliveryStopCoordinates(order),
    }))
    .filter(entry => entry.coordinates);

  if (entries.length === 0) {
    return null;
  }

  if (entries.length === 1) {
    return entries[0].coordinates;
  }

  let winner = entries[0];
  let winnerScore = null;

  entries.forEach(candidate => {
    const score = entries.reduce((total, other) => {
      if (other === candidate) {
        return total;
      }

      const distance = haversineDistanceKm(candidate.coordinates, other.coordinates);
      return Number.isFinite(distance) ? total + distance : total;
    }, 0);

    if (winnerScore === null || score < winnerScore) {
      winner = candidate;
      winnerScore = score;
    }
  });

  return winner.coordinates;
};

export const resolveDeliveryRunQueue = (orders, context = {}) => {
  const queue = (Array.isArray(orders) ? orders : [])
    .filter(isDeliveryOrderInProgress)
    .slice();
  const preferShortestDistance = Boolean(context?.preferShortestDistance);
  const courierCoordinates =
    context?.courierCoordinates ||
    context?.currentCoordinates ||
    context?.deviceCoordinates ||
    null;
  const canUseDistanceOptimization = queue.some(order => resolveDeliveryStopCoordinates(order));

  if (queue.length <= 1) {
    return queue.sort(compareRunQueueItemsByFallback);
  }

  const routePriorityExists = queue.some(order => Number.isFinite(resolveDeliveryRoutePriority(order)));
  if (routePriorityExists && !(preferShortestDistance && canUseDistanceOptimization)) {
    return queue.sort((left, right) => {
      const leftPriority = resolveDeliveryRoutePriority(left);
      const rightPriority = resolveDeliveryRoutePriority(right);

      if (leftPriority !== null && rightPriority !== null && leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      if (leftPriority !== null) {
        return -1;
      }

      if (rightPriority !== null) {
        return 1;
      }

      return compareRunQueueItemsByFallback(left, right);
    });
  }

  if (preferShortestDistance && canUseDistanceOptimization) {
    const remaining = queue.slice();
    const planned = [];
    let origin =
      courierCoordinates &&
      Number.isFinite(courierCoordinates.latitude) &&
      Number.isFinite(courierCoordinates.longitude)
        ? courierCoordinates
        : resolveBestRunOriginCoordinates(queue);

    if (!origin) {
      return queue.sort(compareRunQueueItemsByFallback);
    }

    while (remaining.length > 0) {
      const nextStop = chooseClosestRunStop(origin, remaining) || remaining[0];
      const nextIndex = remaining.indexOf(nextStop);
      if (nextIndex >= 0) {
        remaining.splice(nextIndex, 1);
      } else {
        remaining.shift();
      }

      planned.push(nextStop);

      const nextCoordinates = resolveDeliveryStopCoordinates(nextStop);
      if (nextCoordinates) {
        origin = nextCoordinates;
      }
    }

    return planned;
  }

  const etaPriorityExists = queue.some(order => Number.isFinite(resolveDeliveryEtaMinutes(order)));
  if (etaPriorityExists) {
    return queue.sort((left, right) => {
      const leftEta = resolveDeliveryEtaMinutes(left);
      const rightEta = resolveDeliveryEtaMinutes(right);

      if (leftEta !== null && rightEta !== null && leftEta !== rightEta) {
        return leftEta - rightEta;
      }

      if (leftEta !== null) {
        return -1;
      }

      if (rightEta !== null) {
        return 1;
      }

      return compareRunQueueItemsByFallback(left, right);
    });
  }

  return queue.sort(compareRunQueueItemsByFallback);
};

export const resolveDeliveryRunQueueHead = (orders, context = {}) =>
  resolveDeliveryRunQueue(orders, context)[0] || null;

export const resolveDeliveryWorkflowHead = (orders, context = {}) =>
  resolveDeliveryAcceptanceQueueHead(orders) || resolveDeliveryRunQueueHead(orders, context);

export const resolveDeliveryRunPlan = (orders, context = {}) => {
  const stops = resolveDeliveryRunQueue(orders, context);
  const routePriorityExists = stops.some(order => Number.isFinite(resolveDeliveryRoutePriority(order)));
  const etaExists = stops.some(order => Number.isFinite(resolveDeliveryEtaMinutes(order)));
  const preferShortestDistance = Boolean(context?.preferShortestDistance);
  const canUseDistanceOptimization = stops.some(order => resolveDeliveryStopCoordinates(order));

  return {
    strategy:
      preferShortestDistance && canUseDistanceOptimization
        ? 'distance'
        : routePriorityExists
          ? 'manual'
          : etaExists
            ? 'eta'
            : 'timestamp',
    totalStops: stops.length,
    currentStop: stops[0] || null,
    nextStops: stops.slice(1),
    stops,
  };
};
