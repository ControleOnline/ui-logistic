/*
 * Contract imported from MODOS_OPERACAO.md
 * - DELIVERY rate tables are read as an immutable version collection.
 * - The store only mirrors the canonical collection exposed by the backend resource.
 * - Create/update/activation flows use custom screens, but the listing contract stays in one store.
 */

import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import {DELIVERY_RATE_GROUP_COLUMNS} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'delivery_tax_groups',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    reload: false,
    add: true,
    columns: DELIVERY_RATE_GROUP_COLUMNS,
  },
  actions,
  getters,
  mutations,
};
