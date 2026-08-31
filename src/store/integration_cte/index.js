import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: null,
    items: [],
    resourceEndpoint: 'integrations',
    isLoading: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {queueName: 'CteEmission'},
    reload: false,
    add: false,
    columns: [
      {name: 'id', label: 'ID', isIdentity: true, editable: false, externalFilter: true},
      {name: 'queueName', label: 'Fila', editable: false, externalFilter: true},
      {
        name: 'status',
        label: 'Status',
        editable: false,
        externalFilter: true,
        list: 'status/getItems',
        listRequestParams: {context: 'integration'},
        searchParam: 'status',
        format: value => (value?.status || value?.realStatus || '-'),
        formatList: value => (value && value['@id'] ? {value: value['@id'].split('/').pop(), label: value.status || value.realStatus || value['@id']} : value),
        saveFormat: value => (value ? `/statuses/${value.value || value}` : null),
      },
      {name: 'retry', label: 'Tentativas', type: 'number', editable: false, externalFilter: true},
      {name: 'body', label: 'Payload', editable: false, externalFilter: false},
    ],
    configs: {
      showRowActions: true,
    },
  },
  actions,
  getters,
  mutations,
};
