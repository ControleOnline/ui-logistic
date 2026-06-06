/*
 * Contract imported from MODOS_OPERACAO.md
 * - DELIVERY delivery-rate tables are immutable versions and are displayed as courier-owned history.
 * - Km bands are the canonical editable rows for each version.
 * - Company links are activated separately and must keep previous versions visible.
 */

import Formatter from '@controleonline/ui-common/src/utils/formatter.js';

export const DELIVERY_RATE_VEHICLE_TYPES = [
  { value: 'moto', label: 'Moto' },
  { value: 'bike', label: 'Bicicleta' },
];

export const DELIVERY_RATE_GROUP_COLUMNS = [
  {
    isIdentity: true,
    sortable: true,
    editable: false,
    filters: false,
    name: 'id',
    label: 'ID',
    align: 'left',
    to: value => ({
      name: 'DeliveryRateVersionPage',
      params: { id: String(value).replace(/\D+/g, '') },
    }),
    format: value => `#${value}`,
  },
  {
    sortable: true,
    name: 'code',
    editable: false,
    filters: false,
    label: 'Código',
    align: 'left',
    sortField: 'code',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'groupName',
    editable: false,
    filters: false,
    label: 'Tabela',
    align: 'left',
    sortField: 'groupName',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'vehicleType',
    editable: false,
    filters: false,
    label: 'Veículo',
    align: 'left',
    sortField: 'vehicleType',
    format: value => {
      if (!value) return '-';
      const match = DELIVERY_RATE_VEHICLE_TYPES.find(option => option.value === value);
      return match?.label || String(value).toUpperCase();
    },
  },
  {
    sortable: true,
    name: 'versionNumber',
    editable: false,
    filters: false,
    label: 'Versão',
    align: 'center',
    sortField: 'versionNumber',
    format: value => `v${value || 1}`,
  },
  {
    sortable: true,
    name: 'courier',
    editable: false,
    filters: false,
    label: 'Motoboy',
    align: 'left',
    sortField: 'courier.alias',
    format: value => {
      if (!value) return '-';
      return [value?.name, value?.alias].filter(Boolean).join(' - ') || '-';
    },
  },
  {
    sortable: true,
    name: 'taxesCount',
    editable: false,
    filters: false,
    label: 'Faixas',
    align: 'center',
    sortField: 'taxesCount',
    format: value => String(value ?? 0),
  },
  {
    sortable: true,
    name: 'companiesCount',
    editable: false,
    filters: false,
    label: 'Empresas',
    align: 'center',
    sortField: 'companiesCount',
    format: value => String(value ?? 0),
  },
  {
    sortable: true,
    name: 'activeCompaniesCount',
    editable: false,
    filters: false,
    label: 'Ativas',
    align: 'center',
    sortField: 'activeCompaniesCount',
    format: value => String(value ?? 0),
  },
  {
    sortable: true,
    name: 'creationDate',
    editable: false,
    filters: false,
    label: 'Criado em',
    align: 'left',
    sortField: 'creationDate',
    format: value => Formatter.formatDateYmdTodmY(value, true) || '-',
  },
  {
    sortable: true,
    name: 'alterDate',
    editable: false,
    filters: false,
    label: 'Atualizado em',
    align: 'left',
    sortField: 'alterDate',
    format: value => Formatter.formatDateYmdTodmY(value, true) || '-',
  },
];

export const DELIVERY_RATE_BAND_COLUMNS = [
  {
    isIdentity: true,
    sortable: true,
    editable: false,
    filters: false,
    name: 'id',
    label: 'ID',
    align: 'left',
    format: value => `#${value}`,
  },
  {
    sortable: true,
    name: 'taxName',
    editable: false,
    filters: false,
    label: 'Faixa',
    align: 'left',
    sortField: 'taxOrder',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'kmFrom',
    editable: false,
    filters: false,
    label: 'Km inicial',
    align: 'center',
    sortField: 'kmFrom',
    format: value => formatKmValue(value),
  },
  {
    sortable: true,
    name: 'kmTo',
    editable: false,
    filters: false,
    label: 'Km final',
    align: 'center',
    sortField: 'kmTo',
    format: value => formatKmValue(value),
  },
  {
    sortable: true,
    name: 'pricePerKm',
    editable: false,
    filters: false,
    label: 'Valor por km',
    align: 'right',
    sortField: 'pricePerKm',
    format: value => Formatter.formatMoney(value || 0),
  },
  {
    sortable: true,
    name: 'minimumTripValue',
    editable: false,
    filters: false,
    label: 'Mínimo por viagem',
    align: 'right',
    sortField: 'minimumTripValue',
    format: value => Formatter.formatMoney(value || 0),
  },
  {
    sortable: true,
    name: 'minimumDailyValue',
    editable: false,
    filters: false,
    label: 'Mínimo da diária',
    align: 'right',
    sortField: 'minimumDailyValue',
    format: value => Formatter.formatMoney(value || 0),
  },
];

export const normalizeText = value => String(value ?? '').trim();

export const normalizeEntityId = value => {
  if (value && typeof value === 'object') {
    return normalizeEntityId(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value).replace(/\D+/g, '');
};

export const formatKmValue = value => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return Number.isFinite(Number(value))
    ? Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: Number(String(value).includes('.') ? 2 : 0),
        maximumFractionDigits: 2,
      })
    : String(value);
};

export const createEmptyBand = (taxOrder = 0) => ({
  taxName: '',
  taxDescription: '',
  kmFrom: '',
  kmTo: '',
  pricePerKm: '',
  minimumTripValue: '',
  minimumDailyValue: '',
  taxOrder,
});

export const createEmptyTableDraft = () => ({
  groupName: '',
  code: '',
  vehicleType: '',
  bands: [createEmptyBand(0)],
  companyIds: [],
});

export const createBandsFromGroup = group =>
  Array.isArray(group?.taxes) && group.taxes.length > 0
    ? group.taxes.map((tax, index) => ({
        taxName: tax?.taxName || `Faixa ${index + 1}`,
        taxDescription: tax?.taxDescription || '',
        kmFrom: tax?.kmFrom ?? '',
        kmTo: tax?.kmTo ?? '',
        pricePerKm: tax?.pricePerKm ?? '',
        minimumTripValue: tax?.minimumTripValue ?? '',
        minimumDailyValue: tax?.minimumDailyValue ?? '',
        taxOrder: Number.isFinite(Number(tax?.taxOrder)) ? Number(tax.taxOrder) : index,
      }))
    : [createEmptyBand(0)];

export const createDraftFromGroup = group => ({
  groupName: group?.groupName || '',
  code: group?.code || '',
  vehicleType: group?.vehicleType || '',
  bands: createBandsFromGroup(group),
  companyIds: Array.isArray(group?.companies)
    ? group.companies
        .map(link => normalizeEntityId(link?.company ?? link?.companyId ?? link))
        .filter(Boolean)
    : [],
});

export const buildBandPayload = (band, index = 0) => ({
  taxName: normalizeText(band?.taxName) || `Faixa ${index + 1}`,
  taxDescription: normalizeText(band?.taxDescription) || null,
  kmFrom: normalizeText(band?.kmFrom) || null,
  kmTo: normalizeText(band?.kmTo) || null,
  pricePerKm: normalizeText(band?.pricePerKm) || null,
  minimumTripValue: normalizeText(band?.minimumTripValue) || null,
  minimumDailyValue: normalizeText(band?.minimumDailyValue) || null,
  taxOrder: Number.isFinite(Number(band?.taxOrder)) ? Number(band.taxOrder) : index,
});

export const buildGroupPayload = draft => ({
  groupName: normalizeText(draft?.groupName),
  code: normalizeText(draft?.code),
  vehicleType: normalizeText(draft?.vehicleType),
  taxes: Array.isArray(draft?.bands) ? draft.bands.map((band, index) => buildBandPayload(band, index)) : [],
  companyIds: Array.isArray(draft?.companyIds) ? draft.companyIds.map(normalizeEntityId).filter(Boolean) : [],
});

export const buildBandLabel = band => {
  const from = normalizeText(band?.kmFrom);
  const to = normalizeText(band?.kmTo);

  if (from || to) {
    return `${from || '0'} km - ${to || '+'} km`;
  }

  return normalizeText(band?.taxName) || 'Faixa';
};

export const buildGroupDisplayName = group =>
  [normalizeText(group?.groupName), group?.versionNumber ? `v${group.versionNumber}` : '']
    .filter(Boolean)
    .join(' - ');

export const resolveCompanyLabel = company =>
  [normalizeText(company?.name), normalizeText(company?.alias)]
    .filter(Boolean)
    .join(' - ') || normalizeText(company?.alias) || normalizeText(company?.name) || '-';

export const resolveCompanyStatusLabel = company => {
  if (company?.panel_enabled === false) {
    return 'Sem painel';
  }

  if (company?.enabled === false) {
    return 'Desativada';
  }

  return 'Habilitada';
};

export const unwrapHydratorItem = response =>
  response?.member?.[0] ||
  response?.member ||
  response?.response?.data?.[0] ||
  response?.response?.data ||
  response ||
  null;

export const unwrapHydratorCollection = response =>
  response?.member ||
  response?.response?.data ||
  response?.data ||
  [];

export const buildDeliveryRateSearchText = group =>
  [
    group?.code,
    group?.groupName,
    group?.vehicleType,
    group?.versionNumber ? `v${group.versionNumber}` : '',
    group?.courier?.name,
    group?.courier?.alias,
    group?.courier?.document,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const filterDeliveryRateGroups = (groups, searchText) => {
  const normalizedSearch = normalizeText(searchText).toLowerCase();
  if (!normalizedSearch) {
    return Array.isArray(groups) ? [...groups] : [];
  }

  return (Array.isArray(groups) ? groups : []).filter(group =>
    buildDeliveryRateSearchText(group).includes(normalizedSearch),
  );
};

export const sortDeliveryRateGroups = (groups, sortState = {}) => {
  const items = Array.isArray(groups) ? [...groups] : [];
  const field = normalizeText(sortState?.field);
  const direction = normalizeText(sortState?.direction).toLowerCase() === 'desc' ? 'desc' : 'asc';

  if (!field) {
    return items;
  }

  const readValue = (group, path) =>
    String(path)
      .split('.')
      .reduce((current, key) => (current === null || current === undefined ? current : current?.[key]), group);

  return items.sort((left, right) => {
    const leftValue = readValue(left, field);
    const rightValue = readValue(right, field);
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);

    const comparison =
      Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : normalizeText(leftValue).localeCompare(normalizeText(rightValue));

    return direction === 'desc' ? comparison * -1 : comparison;
  });
};
