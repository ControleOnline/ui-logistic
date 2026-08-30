import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import {CTE_PENDING_COLUMNS} from '@controleonline/ui-logistic/src/shared/ctePendingInvoices';

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
    columns: CTE_PENDING_COLUMNS,
    configs: {
      selectable: true,
      showRowActions: false,
      import: {
        enabled: true,
        importType: 'invoice_tax',
        allowedExtensions: ['xml', 'zip'],
      },
      summaryLabels: {
        count: {invoices: 'NFs', groups: 'Grupos'},
        sum: {invoiceTotal: 'Total da rota'},
      },
    },
  },
  actions,
  getters,
  mutations,
};
