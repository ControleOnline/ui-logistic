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

const statusFormat = value => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.status || value.realStatus || '-';
};

const statusPresentation = value => {
  if (!value || typeof value !== 'object') return {};
  const color = value.color || '';
  return color ? {color, label: statusFormat(value)} : {label: statusFormat(value)};
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
        format: (value, column, row) => {
          const presentation = statusPresentation(value);
          return presentation.color
            ? presentation
            : statusFormat(value);
        },
        formatList: value => {
          if (!value || !value['@id']) return value;
          return {
            value: value['@id'].split('/').pop(),
            label: value.status || value.realStatus || value['@id'],
            color: value.color || undefined,
          };
        },
        saveFormat: value => (value ? `/statuses/${value.value || value}` : null),
      },
    ],
  },
  actions,
  getters,
  mutations,
};
