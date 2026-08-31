import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

const peopleFormat = value => value?.name || value?.alias || value?.['@id'] || '-';
const peopleFormatList = value =>
  value && value['@id']
    ? {
        value: value['@id'].split('/').pop(),
        label: `${value.name || ''} - ${value.alias || ''}`.trim() || value['@id'],
      }
    : value;

const formatStatusOption = value => {
  if (!value) return value;
  if (typeof value !== 'object' || Array.isArray(value)) {
    return {value, label: String(value || '-')};
  }
  const statusId = value?.['@id']?.split('/').pop() || value?.id || value?.value;
  const label = value.status || value.realStatus || '-';
  const color = String(value.color || '').trim();
  return {
    ...value,
    value: statusId,
    label,
    ...(color ? {color} : {}),
  };
};

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
    configs: {
      import: {
        enabled: true,
        importType: 'invoice_tax',
        allowedExtensions: ['xml', 'zip'],
      },
    },
    columns: [
      {name: 'id', label: 'ID', isIdentity: true, editable: false, externalFilter: true},
      {name: 'invoiceNumber', label: 'NF', isIdentity: false, editable: false, externalFilter: true},
      {name: 'invoiceKey', label: 'Chave', editable: false, externalFilter: true},
      {
        name: 'company',
        label: 'Empresa',
        editable: false,
        externalFilter: true,
        list: 'people',
        searchParam: 'company',
        format: peopleFormat,
        formatList: peopleFormatList,
        saveFormat: value => (value ? `/people/${value.value || value}` : null),
      },
      {
        name: 'client',
        label: 'Destinatário',
        editable: false,
        externalFilter: true,
        list: 'people',
        searchParam: 'client',
        format: peopleFormat,
        formatList: peopleFormatList,
        saveFormat: value => (value ? `/people/${value.value || value}` : null),
      },
      {
        name: 'provider',
        label: 'Remetente',
        editable: false,
        externalFilter: true,
        list: 'people',
        searchParam: 'provider',
        format: peopleFormat,
        formatList: peopleFormatList,
        saveFormat: value => (value ? `/people/${value.value || value}` : null),
      },
      {
        name: 'carrier',
        label: 'Transportadora',
        editable: false,
        externalFilter: true,
        list: 'people',
        searchParam: 'carrier',
        format: peopleFormat,
        formatList: peopleFormatList,
        saveFormat: value => (value ? `/people/${value.value || value}` : null),
      },
      {name: 'invoiceTotal', label: 'Total', type: 'money', summary: 'sum', editable: false, align: 'right', externalFilter: true},
      {
        name: 'status',
        label: 'Status',
        editable: false,
        externalFilter: true,
        list: 'status/getItems',
        listRequestParams: {context: 'invoice_tax'},
        searchParam: 'status',
        style: row => ({color: row?.status?.color}),
        format: value => formatStatusOption(value),
        formatList: value => formatStatusOption(value),
        saveFormat: value => (value ? `/statuses/${value.value || value}` : null),
      },
    ],
  },
  actions,
  getters,
  mutations,
};
