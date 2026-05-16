import {formatPhoneDisplay, resolveAddressDisplayParts} from '@controleonline/ui-common/src/react/utils/entityDisplay';

const normalizeText = value => String(value ?? '').trim();
const normalizeKey = value => normalizeText(value).toLowerCase();

const FRONT_QUOTE_CATALOG = [
  {
    key: 'uber',
    label: 'Uber',
    eta: '20 - 30 min',
    basePrice: 8.9,
    multiplier: 0.06,
  },
  {
    key: 'ifood',
    label: 'iFood',
    eta: '25 - 40 min',
    basePrice: 9.9,
    multiplier: 0.065,
  },
  {
    key: 'food99',
    label: '99 Food',
    eta: '22 - 35 min',
    basePrice: 9.4,
    multiplier: 0.062,
  },
];

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const resolveOrderBasePrice = order => {
  const candidates = [
    order?.price,
    order?.total,
    order?.amount,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return 0;
};

const buildFrontQuoteCard = (order, spec) => {
  const orderBasePrice = resolveOrderBasePrice(order);
  const estimatedPrice = roundMoney(
    Math.max(spec.basePrice, spec.basePrice + (orderBasePrice * spec.multiplier)),
  );

  return {
    key: spec.key,
    label: spec.label,
    active: false,
    available: true,
    requestable: true,
    frontOnly: true,
    price: estimatedPrice,
    eta: spec.eta,
    status: 'Cotação estimada no front',
    trackingUrl: null,
    summary: 'Cotação estimada no front',
    state: {
      frontOnly: true,
      estimated: true,
    },
    snapshot: {
      frontOnly: true,
      orderPrice: orderBasePrice,
    },
    request: {
      enabled: true,
      type: spec.key,
    },
  };
};

const mergeIntegrationCard = (baseCard, backendCard) => {
  if (!backendCard || typeof backendCard !== 'object') {
    return baseCard;
  }

  return {
    ...baseCard,
    ...backendCard,
    price: backendCard.price === null || backendCard.price === undefined || backendCard.price === ''
      ? baseCard.price
      : backendCard.price,
    eta: backendCard.eta || baseCard.eta,
    status: backendCard.status || baseCard.status,
    trackingUrl: backendCard.trackingUrl || baseCard.trackingUrl,
    summary: backendCard.summary || baseCard.summary,
    frontOnly: true,
    request: {
      ...baseCard.request,
      ...(backendCard.request || {}),
      enabled: true,
      type: baseCard.key,
    },
    state: {
      ...baseCard.state,
      ...(backendCard.state || {}),
    },
    snapshot: {
      ...baseCard.snapshot,
      ...(backendCard.snapshot || {}),
    },
  };
};

const buildFrontQuoteCatalog = (order, backendCards = []) => {
  const backendByKey = new Map(
    backendCards
      .filter(card => card && typeof card === 'object' && normalizeKey(card.key) !== '')
      .map(card => [normalizeKey(card.key), card]),
  );
  const knownKeys = new Set();

  const catalog = FRONT_QUOTE_CATALOG.map(spec => {
    const baseCard = buildFrontQuoteCard(order, spec);
    const backendCard = backendByKey.get(normalizeKey(spec.key)) || null;
    const mergedCard = mergeIntegrationCard(baseCard, backendCard);
    knownKeys.add(normalizeKey(spec.key));

    return mergedCard;
  });

  backendCards.forEach(card => {
    const key = normalizeKey(card?.key);
    if (key === '' || knownKeys.has(key)) {
      return;
    }

    catalog.push({
      ...card,
      frontOnly: true,
      request: {
        ...(card.request || {}),
        enabled: true,
        type: card.key,
      },
    });
  });

  return catalog;
};

const resolveManagedByStore = (order, management = {}, uberState = {}, delivery = {}) => {
  if (normalizeKey(order?.app) === 'pos') {
    return true;
  }

  if (typeof management.managedByStore === 'boolean') {
    return management.managedByStore;
  }

  if (normalizeKey(management.mode) === 'store') {
    return true;
  }

  if (normalizeKey(management.mode) === 'integration') {
    return false;
  }

  return Boolean(
    delivery?.deliveryPeopleId ||
      delivery?.requestedAt ||
      delivery?.trackingUrl ||
      uberState?.managed_by_store ||
      uberState?.managedByStore ||
      uberState?.requested_at ||
      uberState?.delivery_id ||
      uberState?.estimate_id ||
      uberState?.store_id,
  );
};

const normalizePeopleContact = people => {
  if (!people || typeof people !== 'object') {
    return {
      name: '',
      phone: '',
      email: '',
    };
  }

  const phone = Array.isArray(people.phone)
    ? people.phone.map(item => formatPhoneDisplay(item)).find(Boolean)
    : formatPhoneDisplay(people.phone);
  const email = Array.isArray(people.email)
    ? people.email.map(item => normalizeText(item?.email)).find(Boolean)
    : normalizeText(people.email?.email || people.email);

  return {
    name: normalizeText(people.alias || people.name),
    phone: normalizeText(phone),
    email,
  };
};

const resolveUberState = order => {
  const otherInformations = order?.otherInformations;

  if (!otherInformations || typeof otherInformations !== 'object') {
    return {};
  }

  if (otherInformations.Uber && typeof otherInformations.Uber === 'object') {
    return otherInformations.Uber;
  }

  return otherInformations.uber && typeof otherInformations.uber === 'object'
    ? otherInformations.uber
    : {};
};

const buildLegacySnapshot = order => {
  const orderData = order?.order || order;
  const uberState = resolveUberState(orderData);
  const pickupAddress = orderData?.addressOrigin || orderData?.provider?.address?.[0] || null;
  const dropoffAddress = orderData?.addressDestination || null;
  const pickupContact = orderData?.retrieveContact || orderData?.provider || null;
  const dropoffContact = orderData?.deliveryContact || orderData?.client || null;
  const pickupAddressParts = pickupAddress ? resolveAddressDisplayParts(pickupAddress) : null;
  const dropoffAddressParts = dropoffAddress ? resolveAddressDisplayParts(dropoffAddress) : null;
  const managedByStore = resolveManagedByStore(orderData, {}, uberState, {
    trackingUrl: uberState?.tracking_url,
    requestedAt: uberState?.requested_at,
    deliveryPeopleId: orderData?.deliveryPeople?.id || orderData?.deliveryPeopleId || null,
  });
  const integrations = managedByStore ? buildFrontQuoteCatalog(orderData) : [];

  return {
    pickupAddressParts,
    dropoffAddressParts,
    pickupContact: normalizePeopleContact(pickupContact),
    dropoffContact: normalizePeopleContact(dropoffContact),
    managedByStore,
    managedByStoreLabel: managedByStore
      ? 'Gerenciada pela loja'
      : 'Nao gerenciada pela loja',
    canRequestDriver:
      !uberState?.delivery_id &&
      !uberState?.estimate_id &&
      !uberState?.requested_at,
    hasDriver: Boolean(
      uberState?.delivery_id ||
        uberState?.rider_name ||
        uberState?.rider_phone ||
        uberState?.tracking_url,
    ),
    uberState,
    couriers: [],
    delivery: {
      deliveryPeopleId: orderData?.deliveryPeople?.id || orderData?.deliveryPeopleId || null,
      trackingUrl: uberState?.tracking_url || null,
      requestedAt: uberState?.requested_at || null,
      status: uberState?.status || uberState?.order_status || uberState?.delivery_status || null,
    },
    management: {
      mode: managedByStore ? 'store' : 'integration',
      managedByStore,
      label: managedByStore
        ? 'Gerenciada pela loja'
        : 'Nao gerenciada pela loja',
      source: resolveText(orderData?.app),
    },
    integrations,
    currentIntegration: integrations.find(card => card?.active) || null,
  };
};

const normalizePayload = source => {
  if (!source || typeof source !== 'object') {
    return {};
  }

  if (
    source.management ||
    source.couriers ||
    source.integrations ||
    source.delivery ||
    source.currentIntegration
  ) {
    return source;
  }

  if (Array.isArray(source.member)) {
    return source.member[0] || {};
  }

  if (source.result && typeof source.result === 'object') {
    return source.result;
  }

  return source;
};

const resolveText = value => normalizeText(value);

const buildPayloadSnapshot = source => {
  const payload = normalizePayload(source);
  const order = payload.order || source.order || source;
  const management = payload.management || {};
  const delivery = payload.delivery || {};
  const couriers = Array.isArray(payload.couriers) ? payload.couriers : [];
  const managedByStore = resolveManagedByStore(order, management, resolveUberState(order), delivery);
  const integrations = managedByStore
    ? buildFrontQuoteCatalog(order, Array.isArray(payload.integrations) ? payload.integrations : [])
    : Array.isArray(payload.integrations) ? payload.integrations : [];
  const currentIntegration =
    payload.currentIntegration ||
    integrations.find(card => card?.active) ||
    null;
  const pickupAddress = order?.addressOrigin || order?.provider?.address?.[0] || null;
  const dropoffAddress = order?.addressDestination || null;
  const pickupContact = order?.retrieveContact || order?.provider || null;
  const dropoffContact = order?.deliveryContact || order?.client || null;
  const pickupAddressParts = pickupAddress ? resolveAddressDisplayParts(pickupAddress) : null;
  const dropoffAddressParts = dropoffAddress ? resolveAddressDisplayParts(dropoffAddress) : null;
  const courierSelected = delivery?.deliveryPeople || order?.deliveryPeople || null;
  const uberState = integrations.find(card => card?.key === 'uber')?.state || {};

  return {
    pickupAddressParts,
    dropoffAddressParts,
    pickupContact: normalizePeopleContact(pickupContact),
    dropoffContact: normalizePeopleContact(dropoffContact),
    managedByStore,
    managedByStoreLabel: managedByStore
      ? 'Gerenciada pela loja'
      : 'Nao gerenciada pela loja',
    canRequestDriver: managedByStore && (
      couriers.length > 0 ||
      integrations.some(card => Boolean(card?.request?.enabled || card?.requestable))
    ),
    hasDriver: Boolean(
      delivery?.deliveryPeopleId ||
        delivery?.trackingUrl ||
        courierSelected ||
        currentIntegration?.trackingUrl ||
        currentIntegration?.active,
    ),
    uberState,
    couriers,
    integrations,
    delivery: {
      deliveryPeopleId: delivery?.deliveryPeopleId || courierSelected?.id || null,
      deliveryPeople: delivery?.deliveryPeople || normalizePeopleContact(courierSelected),
      trackingUrl: delivery?.trackingUrl || currentIntegration?.trackingUrl || null,
      requestedAt: delivery?.requestedAt || null,
      status: delivery?.status || currentIntegration?.status || (managedByStore ? 'Aguardando solicitacao' : null),
      currentIntegrationKey: delivery?.currentIntegrationKey || currentIntegration?.key || null,
    },
    management: {
      mode: managedByStore ? 'store' : 'integration',
      managedByStore,
      label: managedByStore ? 'Gerenciada pela loja' : 'Nao gerenciada pela loja',
      source: management.source || resolveText(order?.app),
    },
    currentIntegration,
  };
};

export const resolveOrderLogisticsSnapshot = source => {
  if (
    source?.management ||
    source?.couriers ||
    source?.integrations ||
    source?.delivery ||
    source?.currentIntegration ||
    source?.member
  ) {
    return buildPayloadSnapshot(source);
  }

  return buildLegacySnapshot(source);
};

export default resolveOrderLogisticsSnapshot;
