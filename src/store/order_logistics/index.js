import {api} from '@controleonline/ui-common/src/api';
import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import {splitStoreActionPayload} from '@controleonline/ui-default/src/store/default/actions';

const normalizeText = value => String(value ?? '').trim();

const normalizeOrderId = value =>
  normalizeText(value)
    .replace(/\D+/g, '')
    .trim();

const extractHydraMember = response =>
  Array.isArray(response?.member) ? response.member[0] ?? null : null;

const extractActionResult = response => response?.result ?? null;

const runRequest = async ({commit}, path, {body = undefined, storeMeta = {}} = {}) => {
  const commitOptions = storeMeta.skipSystemError === true ? {skipSystemError: true} : {};

  commit(types.SET_ISSAVING, true);
  commit(types.SET_ERROR, null, commitOptions);

  try {
    const response = await api.fetch(path, body === undefined
      ? {method: 'POST'}
      : {method: 'POST', body});

    return response;
  } catch (error) {
    commit(types.SET_ERROR, error, commitOptions);
    throw error;
  } finally {
    commit(types.SET_ISSAVING, false);
  }
};

const syncLoadedLogistics = (commit, item, orderId) => {
  commit(types.SET_ITEM, item);
  commit(types.SET_LOADED_KEY, orderId || '');
  commit(types.SET_LOADED_AT, Date.now());
  return item;
};

const get = async ({commit, getters}, params = {}) => {
  const {payload: requestParams, storeMeta} = splitStoreActionPayload(params);
  const orderId = normalizeOrderId(requestParams?.id ?? requestParams);
  const commitOptions = storeMeta.skipSystemError === true ? {skipSystemError: true} : {};

  if (!orderId) {
    return Promise.reject(new Error('Pedido nao informado.'));
  }

  commit(types.SET_ISLOADING, true);
  commit(types.SET_ERROR, null, commitOptions);
  commit(types.SET_ACTIVE_REQUEST_KEY, orderId);

  try {
    const response = await api.fetch(`${getters.resourceEndpoint}/${orderId}`, {
      method: 'GET',
    });
    const item = extractHydraMember(response);

    if (!item) {
      throw new Error('Nao foi possivel carregar a logistica do pedido.');
    }

    return syncLoadedLogistics(commit, item, orderId);
  } catch (error) {
    commit(types.SET_ERROR, error, commitOptions);
    throw error;
  } finally {
    commit(types.SET_ACTIVE_REQUEST_KEY, '');
    commit(types.SET_ISLOADING, false);
  }
};

const requestQuotes = async ({commit, getters}, params = {}) => {
  const {payload: requestParams, storeMeta} = splitStoreActionPayload(params);
  const orderId = normalizeOrderId(requestParams?.id ?? requestParams?.orderId ?? requestParams);

  if (!orderId) {
    return Promise.reject(new Error('Pedido nao informado.'));
  }

  const response = await runRequest(
    {commit, getters},
    `${getters.resourceEndpoint}/${orderId}/quote`,
    {storeMeta},
  );

  const result = extractHydraMember(response);
  const errno = String(result?.errno ?? '0');

  if (errno !== '0') {
    const error = new Error(normalizeText(result?.errmsg ?? 'Nao foi possivel solicitar as cotações.'));
    commit(types.SET_ERROR, error, storeMeta.skipSystemError === true ? {skipSystemError: true} : {});
    throw error;
  }

  return result;
};

const selectQuote = async ({commit, getters}, params = {}) => {
  const {payload: requestParams, storeMeta} = splitStoreActionPayload(params);
  const orderId = normalizeOrderId(requestParams?.orderId ?? requestParams?.id ?? requestParams);
  const quoteOrderId = normalizeOrderId(
    requestParams?.quoteOrderId ?? requestParams?.quote_id ?? requestParams?.quoteId,
  );

  if (!orderId) {
    return Promise.reject(new Error('Pedido nao informado.'));
  }

  if (!quoteOrderId) {
    return Promise.reject(new Error('Cotacao nao informada.'));
  }

  const response = await runRequest(
    {commit, getters},
    `${getters.resourceEndpoint}/${orderId}/quotes/${quoteOrderId}/select`,
    {storeMeta},
  );

  const result = extractHydraMember(response);
  const errno = String(result?.errno ?? '0');

  if (errno !== '0') {
    const error = new Error(normalizeText(result?.errmsg ?? 'Nao foi possivel selecionar a cotacao.'));
    commit(types.SET_ERROR, error, storeMeta.skipSystemError === true ? {skipSystemError: true} : {});
    throw error;
  }

  return result;
};

const confirm = async ({commit, getters}, params = {}) => {
  const {payload: requestParams, storeMeta} = splitStoreActionPayload(params);
  const orderId = normalizeOrderId(requestParams?.id ?? requestParams?.orderId ?? requestParams);

  if (!orderId) {
    return Promise.reject(new Error('Pedido nao informado.'));
  }

  const response = await runRequest(
    {commit, getters},
    `/orders/${orderId}/confirm`,
    {storeMeta},
  );

  const result = extractActionResult(response);
  const errno = String(result?.errno ?? '0');

  if (errno !== '0') {
    const error = new Error(normalizeText(result?.errmsg ?? 'Nao foi possivel confirmar a entrega.'));
    commit(types.SET_ERROR, error, storeMeta.skipSystemError === true ? {skipSystemError: true} : {});
    throw error;
  }

  return result;
};

const cancel = async ({commit, getters}, params = {}) => {
  const {payload: requestParams, storeMeta} = splitStoreActionPayload(params);
  const orderId = normalizeOrderId(requestParams?.id ?? requestParams?.orderId ?? requestParams);

  if (!orderId) {
    return Promise.reject(new Error('Pedido nao informado.'));
  }

  const response = await runRequest(
    {commit, getters},
    `/orders/${orderId}/cancel`,
    {storeMeta},
  );

  const result = extractActionResult(response);
  const errno = String(result?.errno ?? '0');

  if (errno !== '0') {
    const error = new Error(normalizeText(result?.errmsg ?? 'Nao foi possivel cancelar a entrega.'));
    commit(types.SET_ERROR, error, storeMeta.skipSystemError === true ? {skipSystemError: true} : {});
    throw error;
  }

  return result;
};

const delivered = async ({commit, getters}, params = {}) => {
  const {payload: requestParams, storeMeta} = splitStoreActionPayload(params);
  const orderId = normalizeOrderId(requestParams?.id ?? requestParams?.orderId ?? requestParams);

  if (!orderId) {
    return Promise.reject(new Error('Pedido nao informado.'));
  }

  const response = await runRequest(
    {commit, getters},
    `/orders/${orderId}/delivered`,
    {storeMeta},
  );

  const result = extractActionResult(response);
  const errno = String(result?.errno ?? '0');

  if (errno !== '0') {
    const error = new Error(normalizeText(result?.errmsg ?? 'Nao foi possivel concluir a parada.'));
    commit(types.SET_ERROR, error, storeMeta.skipSystemError === true ? {skipSystemError: true} : {});
    throw error;
  }

  return result;
};

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'marketplace/logistics/orders',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    messages: [],
    message: {},
    reload: false,
    loadedKey: '',
    loadedAt: 0,
    activeRequestKey: '',
  },
  actions: {
    ...actions,
    get,
    requestQuotes,
    selectQuote,
    confirm,
    cancel,
    delivered,
  },
  getters,
  mutations,
};
