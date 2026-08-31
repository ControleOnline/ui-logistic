import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'invoice_taxes',
    isLoading: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {'status.realStatus': 'closed'},
    reload: false,
    add: false,
    columns: [
      {name: 'id', label: 'ID', isIdentity: true, editable: false},
      {name: 'invoiceNumber', label: 'NF', isIdentity: false, editable: false},
      {name: 'invoiceKey', label: 'Chave', editable: false},
      {name: 'companyName', label: 'Empresa', editable: false},
      {name: 'clientName', label: 'Destinatário', editable: false},
      {name: 'invoiceTotal', label: 'Total', type: 'money', summary: 'sum', editable: false, align: 'right'},
      {name: 'status', label: 'Status', editable: false, externalFilter: true},
    ],
  },
  actions,
  getters,
  mutations,
};
