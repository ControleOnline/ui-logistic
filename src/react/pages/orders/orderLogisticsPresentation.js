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

  const selection = normalizeQuoteSelection(payload.selection || {});
  const selectedQuote =
    quotes.find(quote => normalizeReferenceId(quote.id) === normalizeReferenceId(selection.quoteOrderId)) ||
    null;
  const pickupAddress = route.pickupAddress || order?.addressOrigin || order?.provider?.address?.[0] || null;
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

  return {
    order: {
      id: order?.id ?? null,
      orderType: normalizeText(order?.orderType || ''),
      app: normalizeText(order?.app || ''),
      mainOrderId: order?.mainOrderId ?? null,
      price: order?.price !== undefined && order?.price !== null ? Number(order.price) : null,
      status: order?.status && typeof order.status === 'object' ? order.status : null,
      client: order?.client || null,
      provider: order?.provider || null,
      payer: order?.payer || null,
      addressOrigin: pickupAddress,
      addressDestination: dropoffAddress,
      retrieveContact: pickupContact,
      deliveryContact: dropoffContact,
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
    },
    management: {
      mode: managementMode || 'quote',
      managedByStore:
        typeof management.managedByStore === 'boolean'
          ? management.managedByStore
          : managementMode === 'quote' || normalizeKey(order?.app) === 'pos',
      label: management.label || 'Cotacoes da loja',
      source: normalizeText(management.source || order?.app || ''),
      mainOrderId: management.mainOrderId ?? order?.id ?? null,
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
    canQuote: Array.from(providerMap.values()).some(
      provider => provider.connected && (provider.online !== false),
    ),
    pickupAddressParts,
    dropoffAddressParts,
    pickupContact: pickupContactInfo,
    dropoffContact: dropoffContactInfo,
    couriers: [],
    integrations: quotes,
    currentIntegration: selectedQuote,
    delivery: {
      trackingUrl: selectedTrackingUrl,
      requestedAt: selection.selectedAt || '',
      status: selectedQuote?.quoteStateLabel || '',
      currentIntegrationKey: selectedProviderKey || selectedQuote?.providerKey || '',
    },
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
  const couriers = [];
  const integrations = [];
  const managedByStore = resolveManagedByStore(orderData, {}, uberState, {
    trackingUrl: uberState?.tracking_url,
    requestedAt: uberState?.requested_at,
    deliveryPeopleId: orderData?.deliveryPeople?.id || orderData?.deliveryPeopleId || null,
  });

  return {
    pickupAddressParts,
    dropoffAddressParts,
    pickupContact: normalizePeopleContact(pickupContact),
    dropoffContact: normalizePeopleContact(dropoffContact),
    managedByStore,
    managedByStoreLabel: managedByStore ? 'Gerenciada pela loja' : 'Nao gerenciada pela loja',
    canRequestDriver: Boolean(
      !uberState?.delivery_id &&
        !uberState?.estimate_id &&
        !uberState?.requested_at &&
        (couriers.length > 0 || integrations.some(card => Boolean(card?.request?.enabled || card?.requestable))),
    ),
    hasDriver: Boolean(
      uberState?.delivery_id ||
        uberState?.rider_name ||
        uberState?.rider_phone ||
        uberState?.tracking_url,
    ),
    uberState,
    couriers,
    delivery: {
      deliveryPeopleId: orderData?.deliveryPeople?.id || orderData?.deliveryPeopleId || null,
      trackingUrl: uberState?.tracking_url || null,
      requestedAt: uberState?.requested_at || null,
      status: uberState?.status || uberState?.order_status || uberState?.delivery_status || null,
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
  const managedByStore = resolveManagedByStore(order, management, resolveUberState(order), delivery);
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
  const pickupAddress = order?.addressOrigin || order?.provider?.address?.[0] || null;
  const dropoffAddress = order?.addressDestination || null;
  const pickupContact = order?.retrieveContact || order?.provider || null;
  const dropoffContact = order?.deliveryContact || order?.client || null;
  const pickupAddressParts = pickupAddress ? resolveAddressDisplayParts(pickupAddress) : null;
  const dropoffAddressParts = dropoffAddress ? resolveAddressDisplayParts(dropoffAddress) : null;
  const courierSelected = delivery?.deliveryPeople || order?.deliveryPeople || null;
  const uberState = mergedIntegrations.find(card => card?.key === 'uber')?.state || {};

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
