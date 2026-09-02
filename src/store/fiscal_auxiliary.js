import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

const option = (value, label) => ({value, label});

export const FISCAL_AUXILIARY = {
  modals: [option('01', 'Rodoviário'), option('02', 'Aéreo'), option('03', 'Aquaviário'), option('04', 'Ferroviário'), option('05', 'Dutoviário'), option('06', 'Multimodal')],
  serviceTypes: [option('0', 'Normal'), option('1', 'Subcontratação'), option('2', 'Redespacho'), option('3', 'Redespacho intermediário'), option('4', 'Serviço vinculado a multimodal')],
  cteTypes: [option('0', 'Normal'), option('1', 'Complemento de valores'), option('2', 'Anulação'), option('3', 'Substituto')],
  takers: [option('0', 'Remetente'), option('1', 'Expedidor'), option('2', 'Recebedor'), option('3', 'Destinatário')],
  fiscalModels: [option('55', 'NF-e'), option('65', 'NFC-e'), option('57', 'CT-e'), option('NFSE', 'NFS-e')],
};

export default {
  namespaced: true,
  state: {item: null, items: [], resourceEndpoint: null, isLoading: false, error: '', totalItems: 0, summary: {}, filters: {}, reload: false, selected: [], configs: {}, auxiliary: FISCAL_AUXILIARY},
  actions,
  getters,
  mutations,
};
