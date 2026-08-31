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
    filters: {},
    reload: false,
    add: false,
    columns: [
      {name: 'id', label: 'ID', isIdentity: true, editable: false, externalFilter: true},
      {name: 'invoiceNumber', label: 'NF', isIdentity: false, editable: false, externalFilter: true},
      {name: 'invoiceKey', label: 'Chave', editable: false, externalFilter: true},
      {name: 'companyName', label: 'Empresa', editable: false, externalFilter: true},
      {name: 'clientName', label: 'Destinatário', editable: false, externalFilter: true},
      {name: 'providerName', label: 'Remetente', editable: false, externalFilter: true},
      {name: 'carrierName', label: 'Transportadora', editable: false, externalFilter: true},
      {name: 'invoiceTotal', label: 'Total', type: 'money', summary: 'sum', editable: false, align: 'right', externalFilter: true},
      {name: 'status', label: 'Status', editable: false, externalFilter: true},
    ],
  },
  actions,
  getters,
  mutations,
};
