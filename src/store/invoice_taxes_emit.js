import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'invoice_taxes/without-cte',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    reload: false,
    add: false,
    selected: [],
    columns: [
      {name: 'invoiceNumber', label: 'NF', isIdentity: true, editable: false},
      {name: 'clientName', label: 'Destinatário', editable: false},
      {name: 'providerName', label: 'Remetente', editable: false},
      {name: 'invoiceTotal', label: 'Valor', type: 'money', summary: 'sum', editable: false},
      {name: 'weight', label: 'Peso (kg)', type: 'number', summary: 'sum', editable: false},
      {name: 'invoiceKey', label: 'Chave', editable: false},
    ],
    configs: {
      selectable: false,
      showRowActions: true,
      viewMode: 'cards',
      forceCardsOnCompact: true,
      cardListProps: {numColumns: 4},
      summaryLabels: {
        count: {invoices: 'NFs'},
        sum: {invoiceTotal: 'Valor', weight: 'Peso total (kg)'},
      },
    },
  },
  actions,
  getters,
  mutations,
};
