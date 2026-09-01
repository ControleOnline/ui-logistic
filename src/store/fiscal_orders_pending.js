import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

const peopleFormat = value => value?.name || value?.alias || value?.['@id'] || '-';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'orders/without-fiscal-document',
    isLoading: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    reload: false,
    columns: [
      {name: 'id', label: 'Pedido', isIdentity: true, editable: false, externalFilter: true},
      {name: 'orderDate', label: 'Data', type: 'date', editable: false, externalFilter: true},
      {name: 'client', label: 'Cliente', editable: false, externalFilter: true, format: peopleFormat},
      {name: 'provider', label: 'Fornecedor', editable: false, externalFilter: true, format: peopleFormat},
      {name: 'price', label: 'Total', type: 'money', editable: false, align: 'right', externalFilter: true},
      {
        name: 'status',
        label: 'Status',
        editable: false,
        externalFilter: true,
        format: value => value?.status || value?.realStatus || '-',
      },
    ],
  },
  actions,
  getters,
  mutations,
};
