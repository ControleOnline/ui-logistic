import {formatPhoneDisplay, resolveAddressDisplayParts} from '@controleonline/ui-common/src/react/utils/entityDisplay';

const normalizeText = value => String(value ?? '').trim();
const normalizeKey = value => normalizeText(value).toLowerCase();
const normalizeReferenceId = value => normalizeText(value).replace(/\D+/g, '');

const isConnectedValue = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  normalizeKey(value) === 'true';

const normalizeIntegrationKey = value => {
  const key = normalizeKey(value);

  if (key === '99food') {
    return 'food99';
  }

  return key;
};

const buildIntegrationStatusMap = integrationStatuses =>
  new Map(
    Array.isArray(integrationStatuses)
      ? integrationStatuses
          .filter(item => normalizeIntegrationKey(item?.key) !== '')
          .map(item => [normalizeIntegrationKey(item?.key), item])
      : [],
  );

const mergeIntegrationStatus = (integration, status) => {
  if (!integration || typeof integration !== 'object' || !status || typeof status !== 'object') {
    return integration;
  }

  const connected = isConnectedValue(status.connected);
  const online = Object.prototype.hasOwnProperty.call(status, 'online')
    ? isConnectedValue(status.online)
    : undefined;
  const statusLabel = connected ? 'Conectado' : 'Pendente';

  return {
    ...integration,
    connected,
    online,
    status: integration.status || statusLabel,
    summary: integration.summary || statusLabel,
  };
};

const shouldExposeIntegration = (integration, statusMap) => {
  const status = statusMap.get(normalizeIntegrationKey(integration?.key));

  if (!status) {
    return false;
  }

  return isConnectedValue(status.connected);
};

const resolveManagedByStore = (order, management = {}, delivery = {}) => {
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
      delivery?.trackingUrl,
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

const normalizeQuoteState = value => {
  const state = normalizeKey(value);

  return state || 'pending';
};

const normalizeQuotePrice = (price, quoteState) => {
  const state = normalizeQuoteState(quoteState);
  if (!['ready', 'selected', 'requested'].includes(state)) {
    return null;
  }

  if (price === null || price === undefined || price === '') {
    return null;
  }

  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) ? Number(numericPrice.toFixed(2)) : null;
};

const resolveQuoteStateLabel = (quoteState, price) => {
  switch (normalizeQuoteState(quoteState)) {
    case 'ready':
      return price !== null ? 'Cotacao pronta' : 'Cotacao concluida';
    case 'selected':
    case 'requested':
      return 'Entrega solicitada';
    case 'closed':
    case 'delivered':
    case 'finished':
      return 'Entrega definida';
    case 'unavailable':
      return 'Cotacao indisponivel';
    case 'error':
      return 'Erro na cotacao';
    default:
      return 'Aguardando cotacao';
  }
};

const resolveQuoteSummary = (quoteState, price, eta, trackingUrl) => {
  const normalizedState = normalizeQuoteState(quoteState);

  if (normalizedState === 'selected' || normalizedState === 'requested') {
    return 'Entrega solicitada';
  }

  if (normalizedState === 'closed' || normalizedState === 'delivered' || normalizedState === 'finished') {
    return 'Entrega definida';
  }

  if (normalizedState === 'ready' && price !== null) {
    return 'Cotacao pronta';
  }

  if (normalizedState === 'unavailable') {
    return 'Cotacao indisponivel';
  }

  if (normalizedState === 'error') {
    return 'Erro na cotacao';
  }

  if (eta) {
    return eta;
  }

  if (trackingUrl) {
    return 'Rastreio disponivel';
  }

  return 'Aguardando cotacao';
};

const normalizeQuoteProvider = provider => {
  if (!provider || typeof provider !== 'object') {
    return null;
  }

  const key = normalizeIntegrationKey(provider.key);
  if (!key) {
    return null;
  }

  return {
    key,
    label: normalizeText(provider.label || provider.name || provider.key),
    connected: isConnectedValue(provider.connected),
    online: Object.prototype.hasOwnProperty.call(provider, 'online')
      ? isConnectedValue(provider.online)
      : undefined,
    state: provider.state && typeof provider.state === 'object' ? provider.state : {},
  };
};

const normalizeQuoteSelection = selection => {
  if (!selection || typeof selection !== 'object') {
    return {
      quoteOrderId: null,
      providerKey: '',
      price: null,
      trackingUrl: null,
      selectedAt: '',
    };
  }

  return {
    quoteOrderId: selection.quoteOrderId || selection.quote_order_id || null,
    providerKey: normalizeIntegrationKey(selection.providerKey || selection.provider_key || ''),
    price:
      selection.price === null || selection.price === undefined || selection.price === ''
        ? null
        : Number(selection.price),
    trackingUrl: normalizeText(selection.trackingUrl || selection.tracking_url || ''),
    selectedAt: normalizeText(selection.selectedAt || selection.selected_at || ''),
  };
};

const normalizeQuoteCard = (quote, providerMap) => {
  if (!quote || typeof quote !== 'object') {
    return null;
  }

  const providerKey = normalizeIntegrationKey(
    quote.providerKey || quote.provider_key || quote.app || quote.key,
  );
  const provider = providerMap.get(providerKey) || quote.providerState || {};
  const quoteState = normalizeQuoteState(quote.quoteState || quote.quote_state || quote.state);
  const rawPrice = quote.price ?? quote.value ?? null;
  const price = normalizeQuotePrice(rawPrice, quoteState);
  const eta = normalizeText(quote.eta || quote.etaLabel || quote.deliveryTime || quote.delivery_time || '');
  const trackingUrl = normalizeText(quote.trackingUrl || quote.tracking_url || '');
  const connected = Object.prototype.hasOwnProperty.call(quote, 'connected')
    ? isConnectedValue(quote.connected)
    : isConnectedValue(provider.connected);
  const online = Object.prototype.hasOwnProperty.call(quote, 'online')
    ? isConnectedValue(quote.online)
    : isConnectedValue(provider.online);

  return {
    id: quote.id ?? quote.quoteOrderId ?? quote.quote_order_id ?? null,
    mainOrderId: quote.mainOrderId ?? quote.main_order_id ?? null,
    orderType: normalizeText(quote.orderType || quote.order_type || ''),
    app: normalizeText(quote.app || quote.providerLabel || quote.provider_label || ''),
    providerKey,
    providerLabel: normalizeText(
      quote.providerLabel || quote.provider_label || provider.label || quote.label || providerKey,
    ),
    price,
    eta: eta || null,
    status: quote.status && typeof quote.status === 'object' ? quote.status : null,
    quoteState,
    quoteStateLabel: resolveQuoteStateLabel(quoteState, price),
    quoteMessage: normalizeText(quote.quoteMessage || quote.quote_message || ''),
    trackingUrl: trackingUrl || null,
    selected: Boolean(quote.selected) || ['selected', 'requested'].includes(quoteState),
    available: !['unavailable', 'error'].includes(quoteState),
    connected,
    online,
    requestable:
      Object.prototype.hasOwnProperty.call(quote, 'requestable')
        ? Boolean(quote.requestable)
        : quoteState === 'ready',
    summary: normalizeText(
      quote.summary || quote.summaryText || resolveQuoteSummary(quoteState, price, eta, trackingUrl),
    ),
    otherInformations:
      quote.otherInformations && typeof quote.otherInformations === 'object'
        ? quote.otherInformations
        : {
            logistics:
              quote.logistics && typeof quote.logistics === 'object' ? quote.logistics : {},
          },
    providerState: provider && typeof provider === 'object' ? provider : {},
  };
};

const normalizeOrderStatusKey = status => {
  if (!status) {
    return '';
  }

  if (typeof status === 'string') {
    return normalizeKey(status);
  }

  if (typeof status === 'object') {
    return normalizeKey(status.realStatus || status.status || status.name || '');
  }

  return normalizeKey(status);
};

const isClosedOrderStatus = status => normalizeOrderStatusKey(status) === 'closed';

const quoteProviderPriority = providerKey => {
  switch (normalizeIntegrationKey(providerKey)) {
    case 'ifood':
      return 0;
    case 'uber':
      return 1;
    case 'food99':
      return 2;
    default:
      return 999;
  }
};

const hasNumericPrice = value =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

const compareQuoteCards = (left, right) => {
  const leftHasPrice = hasNumericPrice(left?.price);
  const rightHasPrice = hasNumericPrice(right?.price);

  if (leftHasPrice !== rightHasPrice) {
    return leftHasPrice ? -1 : 1;
  }

  if (leftHasPrice && rightHasPrice) {
    const leftPrice = Number(left.price);
    const rightPrice = Number(right.price);
    if (leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }
  }

  const leftPriority = quoteProviderPriority(left?.providerKey);
  const rightPriority = quoteProviderPriority(right?.providerKey);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftId = Number(normalizeReferenceId(left?.id) || 0);
  const rightId = Number(normalizeReferenceId(right?.id) || 0);
  if (leftId !== rightId) {
    return leftId - rightId;
  }

  return 0;
};

const buildQuoteStatusSummary = (providers, quotes) => {
  const summary = {
    providers: Array.isArray(providers) ? providers.length : 0,
    quotes: Array.isArray(quotes) ? quotes.length : 0,
    ready: 0,
    pending: 0,
    selected: 0,
    unavailable: 0,
    error: 0,
  };

  (Array.isArray(quotes) ? quotes : []).forEach(quote => {
    const state = normalizeQuoteState(quote?.quoteState);
    if (Object.prototype.hasOwnProperty.call(summary, state)) {
      summary[state] += 1;
    } else {
      summary.pending += 1;
    }
  });

  return summary;
};

const buildQuoteSnapshot = source => {
  const payload = normalizePayload(source);
  const order = payload.order || source.order || source;
  const delivery = payload.delivery || {};
  const route = payload.route || {};
  const management = payload.management || {};
  const providersSource = Array.isArray(payload.providers) ? payload.providers : [];
  const providerList = providersSource
    .map(normalizeQuoteProvider)
    .filter(Boolean);
  const providerMap = new Map(providerList.map(item => [item.key, item]));
  const quoteSource = Array.isArray(payload.quotes)
    ? payload.quotes
    : Array.isArray(payload.integrations)
      ? payload.integrations
      : [];
  const quotes = quoteSource
    .map(quote => normalizeQuoteCard(quote, providerMap))
    .filter(Boolean);

  if (providerMap.size === 0) {
    quotes.forEach(quote => {
      if (!quote?.providerKey) {
        return;
      }

      if (!providerMap.has(quote.providerKey)) {
        providerMap.set(quote.providerKey, {
          key: quote.providerKey,
          label: quote.providerLabel || quote.providerKey,
          connected: quote.connected,
          online: quote.online,
          state: quote.providerState || {},
        });
      }
    });
  }

  quotes.sort(compareQuoteCards);

  const selection = normalizeQuoteSelection(payload.selection || {});
  const selectedQuote =
    quotes.find(quote => normalizeReferenceId(quote.id) === normalizeReferenceId(selection.quoteOrderId)) ||
    null;
  const pickupAddress = route.pickupAddress || order?.addressOrigin || null;
  const dropoffAddress = route.dropoffAddress || order?.addressDestination || null;
  const pickupContact = route.pickupContact || order?.retrieveContact || order?.provider || null;
  const dropoffContact = route.dropoffContact || order?.deliveryContact || order?.client || null;
  const pickupAddressParts = pickupAddress ? resolveAddressDisplayParts(pickupAddress) : null;
  const dropoffAddressParts = dropoffAddress ? resolveAddressDisplayParts(dropoffAddress) : null;
  const pickupContactInfo = normalizePeopleContact(pickupContact);
  const dropoffContactInfo = normalizePeopleContact(dropoffContact);
  const quoteStatus = payload.quoteStatus && typeof payload.quoteStatus === 'object'
    ? payload.quoteStatus
    : buildQuoteStatusSummary(Array.from(providerMap.values()), quotes);
  const managementMode = normalizeKey(management.mode || 'quote');
  const selectedProviderKey = selection.providerKey || selectedQuote?.providerKey || '';
  const selectedTrackingUrl = selection.trackingUrl || selectedQuote?.trackingUrl || null;
  const selectedPrice = selection.price !== null ? selection.price : selectedQuote?.price ?? null;
  const courierContact = route.courierContact || order?.deliveryPeople || null;
  const courierContactInfo = normalizePeopleContact(courierContact);
  const deliveryPeopleId =
    order?.deliveryPeopleId ??
    order?.deliveryPeople?.id ??
    route.courierContact?.id ??
    null;
  const hasDeliveryOrder = Boolean(
    deliveryPeopleId ||
      courierContactInfo.name ||
      courierContactInfo.phone ||
      courierContactInfo.email,
  );
  const isClosedOrder = isClosedOrderStatus(order?.status);
  const showIntegrationSection = !isClosedOrder;

  return {
    order: {
      id: order?.id ?? null,
      displayId: normalizeText(order?.displayId ?? order?.id ?? '') || null,
      orderType: normalizeText(order?.orderType || ''),
      app: normalizeText(order?.app || ''),
      mainOrderId: order?.mainOrderId ?? order?.main_order_id ?? order?.mainOrder?.id ?? null,
      mainOrder: order?.mainOrder ?? order?.main_order ?? null,
      price: order?.price !== undefined && order?.price !== null ? Number(order.price) : null,
      status: order?.status && typeof order.status === 'object' ? order.status : null,
      client: order?.client || null,
      provider: order?.provider || null,
      payer: order?.payer || null,
      addressOrigin: pickupAddress,
      addressDestination: dropoffAddress,
      retrieveContact: pickupContact,
      deliveryContact: dropoffContact,
      deliveryPeopleId,
      deliveryPeople: courierContact,
      comments: normalizeText(order?.comments || ''),
      otherInformations: order?.otherInformations || {},
    },
    route: {
      pickupAddress,
      dropoffAddress,
      pickupAddressParts,
      dropoffAddressParts,
      pickupContact: pickupContactInfo,
      dropoffContact: dropoffContactInfo,
      courierContact: courierContactInfo,
    },
    management: {
      mode: hasDeliveryOrder ? 'integration' : managementMode || 'quote',
      managedByStore: hasDeliveryOrder
        ? false
        : typeof management.managedByStore === 'boolean'
          ? management.managedByStore
          : managementMode === 'quote' || normalizeKey(order?.app) === 'pos',
      label: hasDeliveryOrder ? 'Entrega gerenciada pela integracao' : management.label || 'Cotacoes da loja',
      source: normalizeText(management.source || order?.app || ''),
      mainOrderId: management.mainOrderId ?? order?.mainOrderId ?? order?.main_order_id ?? order?.mainOrder?.id ?? order?.id ?? null,
    },
    providers: Array.from(providerMap.values()),
    quotes,
    selection: {
      quoteOrderId: selection.quoteOrderId,
      providerKey: selectedProviderKey,
      price: selectedPrice,
      trackingUrl: selectedTrackingUrl,
      selectedAt: selection.selectedAt || '',
    },
    quoteStatus,
    canQuote: showIntegrationSection
      && !hasDeliveryOrder
      && Array.from(providerMap.values()).some(provider => provider.connected),
    hasDeliveryOrder,
    isClosedOrder,
    showIntegrationSection,
    showQuotesSection: Boolean(selectedQuote) || quotes.length > 0 || (!isClosedOrder && !hasDeliveryOrder),
    pickupAddressParts,
    dropoffAddressParts,
    pickupContact: pickupContactInfo,
    dropoffContact: dropoffContactInfo,
    couriers: [],
    integrations: quotes,
    currentIntegration: selectedQuote,
    delivery: {
      deliveryPeopleId,
      deliveryPeople: courierContactInfo,
      trackingUrl: selectedTrackingUrl,
      requestedAt: selection.selectedAt || '',
      status:
        normalizeText(delivery.status || '') ||
        (hasDeliveryOrder ? 'Entrega definida' : selectedQuote?.quoteStateLabel || ''),
      currentIntegrationKey: selectedProviderKey || selectedQuote?.providerKey || (hasDeliveryOrder ? normalizeIntegrationKey(order?.app) || '' : ''),
    },
  };
};

const buildLegacySnapshot = order => {
  const orderData = order?.order || order;
  const delivery = order?.delivery || {};
  const pickupAddress = orderData?.addressOrigin || null;
  const dropoffAddress = orderData?.addressDestination || null;
  const pickupContact = orderData?.retrieveContact || orderData?.provider || null;
  const dropoffContact = orderData?.deliveryContact || orderData?.client || null;
  const courierContact = orderData?.deliveryPeople || null;
  const courierContactInfo = normalizePeopleContact(courierContact);
  const pickupAddressParts = pickupAddress ? resolveAddressDisplayParts(pickupAddress) : null;
  const dropoffAddressParts = dropoffAddress ? resolveAddressDisplayParts(dropoffAddress) : null;
  const couriers = [];
  const integrations = [];
  const deliveryPeopleId = orderData?.deliveryPeople?.id || orderData?.deliveryPeopleId || null;
  const managedByStore = resolveManagedByStore(orderData, {}, {
    deliveryPeopleId,
  });

  return {
    pickupAddressParts,
    dropoffAddressParts,
    pickupContact: normalizePeopleContact(pickupContact),
    dropoffContact: normalizePeopleContact(dropoffContact),
    route: {
      pickupAddress,
      dropoffAddress,
      pickupAddressParts,
      dropoffAddressParts,
      pickupContact: normalizePeopleContact(pickupContact),
      dropoffContact: normalizePeopleContact(dropoffContact),
      courierContact: courierContactInfo,
    },
    managedByStore,
    managedByStoreLabel: managedByStore ? 'Gerenciada pela loja' : 'Nao gerenciada pela loja',
    canRequestDriver: Boolean(
      couriers.length > 0 ||
        integrations.some(card => Boolean(card?.request?.enabled || card?.requestable)),
    ),
    hasDriver: Boolean(
      deliveryPeopleId ||
        courierContactInfo.name ||
        courierContactInfo.phone ||
        courierContactInfo.email,
    ),
    couriers,
    delivery: {
      deliveryPeopleId,
      deliveryPeople: courierContactInfo,
      trackingUrl: null,
      requestedAt: null,
      status: null,
    },
    management: {
      mode: managedByStore ? 'store' : 'integration',
      managedByStore,
      label: managedByStore ? 'Gerenciada pela loja' : 'Nao gerenciada pela loja',
      source: normalizeText(orderData?.app),
    },
    providers: [],
    quotes: [],
    selection: {
      quoteOrderId: null,
      providerKey: '',
      price: null,
      trackingUrl: null,
      selectedAt: '',
    },
    quoteStatus: {
      providers: 0,
      quotes: 0,
      ready: 0,
      pending: 0,
      selected: 0,
      unavailable: 0,
      error: 0,
    },
    canQuote: false,
    integrations,
    currentIntegration: null,
    order: {
      id: orderData?.id ?? null,
      displayId: normalizeText(orderData?.displayId ?? orderData?.id ?? '') || null,
      orderType: normalizeText(orderData?.orderType || ''),
      app: normalizeText(orderData?.app || ''),
      mainOrderId: orderData?.mainOrderId ?? orderData?.main_order_id ?? orderData?.mainOrder?.id ?? null,
      mainOrder: orderData?.mainOrder ?? orderData?.main_order ?? null,
      price: orderData?.price !== undefined && orderData?.price !== null ? Number(orderData.price) : null,
      status: orderData?.status && typeof orderData.status === 'object' ? orderData.status : null,
      client: orderData?.client || null,
      provider: orderData?.provider || null,
      payer: orderData?.payer || null,
      addressOrigin: pickupAddress,
      addressDestination: dropoffAddress,
      retrieveContact: pickupContact,
      deliveryContact: dropoffContact,
      deliveryPeopleId,
      deliveryPeople: courierContact,
      comments: normalizeText(orderData?.comments || ''),
      otherInformations: orderData?.otherInformations || {},
    },
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
    source.currentIntegration ||
    source.integrationStatuses ||
    source.route ||
    source.providers ||
    source.quotes ||
    source.selection ||
    source.quoteStatus
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
  const managedByStore = resolveManagedByStore(order, management, delivery);
  const rawIntegrations = Array.isArray(payload.integrations) ? payload.integrations : [];
  const integrationStatusesSource = payload.integrationStatuses ?? payload.companyIntegrations ?? null;
  const integrationStatuses = Array.isArray(integrationStatusesSource)
    ? integrationStatusesSource
    : [];
  const statusMap = buildIntegrationStatusMap(integrationStatuses);
  const mergedIntegrations = rawIntegrations.map(card =>
    mergeIntegrationStatus(card, statusMap.get(normalizeIntegrationKey(card?.key))),
  );
  const integrations = Array.isArray(integrationStatusesSource)
    ? mergedIntegrations.filter(card => shouldExposeIntegration(card, statusMap))
    : mergedIntegrations;
  const currentIntegrationCandidate =
    payload.currentIntegration ||
    mergedIntegrations.find(card => card?.active) ||
    null;
  const currentIntegration = mergeIntegrationStatus(
    currentIntegrationCandidate,
    statusMap.get(normalizeIntegrationKey(currentIntegrationCandidate?.key)),
  );
  const pickupAddress = order?.addressOrigin || null;
  const dropoffAddress = order?.addressDestination || null;
  const pickupContact = order?.retrieveContact || order?.provider || null;
  const dropoffContact = order?.deliveryContact || order?.client || null;
  const pickupAddressParts = pickupAddress ? resolveAddressDisplayParts(pickupAddress) : null;
  const dropoffAddressParts = dropoffAddress ? resolveAddressDisplayParts(dropoffAddress) : null;
  const courierSelected = delivery?.deliveryPeople || order?.deliveryPeople || null;
  const isClosedOrder = isClosedOrderStatus(order?.status);

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
    isClosedOrder,
    showIntegrationSection: !isClosedOrder,
    order: {
      id: order?.id ?? null,
      displayId: normalizeText(order?.displayId ?? order?.id ?? '') || null,
      orderType: normalizeText(order?.orderType || ''),
      app: normalizeText(order?.app || ''),
      mainOrderId: order?.mainOrderId ?? order?.main_order_id ?? order?.mainOrder?.id ?? null,
      mainOrder: order?.mainOrder ?? order?.main_order ?? null,
      price: order?.price !== undefined && order?.price !== null ? Number(order.price) : null,
      status: order?.status && typeof order.status === 'object' ? order.status : null,
      client: order?.client || null,
      provider: order?.provider || null,
      payer: order?.payer || null,
      addressOrigin: pickupAddress,
      addressDestination: dropoffAddress,
      retrieveContact: pickupContact,
      deliveryContact: dropoffContact,
      deliveryPeopleId,
      deliveryPeople: courierContact,
      comments: normalizeText(order?.comments || ''),
      otherInformations: order?.otherInformations || {},
    },
  };
};

export const resolveOrderLogisticsSnapshot = source => {
  const payload = normalizePayload(source);

  if (
    payload?.route ||
    payload?.providers ||
    payload?.quotes ||
    payload?.selection ||
    payload?.quoteStatus
  ) {
    return buildQuoteSnapshot(source);
  }

  if (
    payload?.management ||
    payload?.couriers ||
    payload?.integrations ||
    payload?.delivery ||
    payload?.currentIntegration ||
    payload?.member ||
    payload?.integrationStatuses
  ) {
    return buildPayloadSnapshot(source);
  }

  return buildLegacySnapshot(source);
};

export default resolveOrderLogisticsSnapshot;
