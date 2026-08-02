/*
 * Contract imported from MODOS_OPERACAO.md
 * - Reusable courier schedules are loaded from the canonical backend collection only.
 * - The store is read-only for listing; create/update happens through the dedicated courier screen.
 */

import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import {DELIVERY_COURIER_SCHEDULE_COLUMNS} from '@controleonline/ui-logistic/src/shared/deliveryPresence';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'delivery_courier_schedules',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    reload: false,
    add: false,
    columns: DELIVERY_COURIER_SCHEDULE_COLUMNS,
  },
  actions,
  getters,
  mutations,
};
