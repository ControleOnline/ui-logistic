/*
 * Contract imported from MODOS_OPERACAO.md
 * - Courier/company presence rows are loaded from the backend as the source of truth.
 * - The store mirrors the canonical row so the courier and manager apps can render the same status.
 */

import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import {DELIVERY_COURIER_PRESENCE_COLUMNS} from '@controleonline/ui-logistic/src/shared/deliveryPresence';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'delivery_courier_company_presences',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    reload: false,
    add: false,
    columns: DELIVERY_COURIER_PRESENCE_COLUMNS,
  },
  actions,
  getters,
  mutations,
};
