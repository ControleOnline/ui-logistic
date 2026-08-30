import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'invoice_tasks',
    isLoading: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {taskType: 'cte_emission', 'status.realStatus': 'emitted'},
    reload: false,
    add: false,
    columns: [
      {name: 'id', label: 'ID', isIdentity: true, editable: false},
      {name: 'cfop', label: 'CFOP', editable: false},
      {name: 'invoiceTotal', label: 'Total', type: 'money', editable: false},
      {name: 'status', label: 'Status', editable: false},
    ],
  },
  actions,
  getters,
  mutations,
};
