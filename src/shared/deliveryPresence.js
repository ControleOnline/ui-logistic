/*
 * Contract imported from MODOS_OPERACAO.md
 * - Courier presence uses reusable weekly schedules plus a per-company online/offline row.
 * - List and detail screens share the same label and formatting helpers to keep manager and courier views aligned.
 */

import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {normalizeEntityId} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';

export const DELIVERY_PRESENCE_AVAILABILITY_MODES = [
  {value: 'automatic', label: 'Automatico'},
  {value: 'manual', label: 'Manual'},
];

export const DELIVERY_PRESENCE_WEEKDAY_OPTIONS = [
  {value: 1, label: 'Segunda'},
  {value: 2, label: 'Terca'},
  {value: 3, label: 'Quarta'},
  {value: 4, label: 'Quinta'},
  {value: 5, label: 'Sexta'},
  {value: 6, label: 'Sabado'},
  {value: 7, label: 'Domingo'},
];

export const normalizeText = value => String(value ?? '').trim();

export const resolvePeopleLabel = people => {
  if (!people || typeof people !== 'object') {
    return normalizeText(people) || '-';
  }

  return [
    normalizeText(people?.name),
    normalizeText(people?.alias),
  ].filter(Boolean).join(' - ') || normalizeText(people?.alias) || normalizeText(people?.name) || '-';
};

export const formatWeekdayLabel = value => {
  const numericValue = Number(normalizeEntityId(value) || value);
  const match = DELIVERY_PRESENCE_WEEKDAY_OPTIONS.find(option => option.value === numericValue);
  if (match) {
    return match.label;
  }

  return normalizeText(value) || '-';
};

export const formatTimeValue = value => {
  if (!value) {
    return '-';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return '-';
  }

  return normalized.slice(0, 5);
};

export const formatDateValue = value => Formatter.formatDateYmdTodmY(value, true) || '-';

export const buildScheduleWindowLabel = schedule => {
  const start = formatTimeValue(schedule?.startTime);
  const end = formatTimeValue(schedule?.endTime);

  if (start === '-' && end === '-') {
    return '-';
  }

  return `${start} - ${end}`;
};

export const resolveAvailabilityStateLabel = presence => {
  if (!presence) {
    return '-';
  }

  if (presence?.availabilityStateLabel) {
    return normalizeText(presence.availabilityStateLabel) || '-';
  }

  const effectiveOnline = Boolean(presence?.effectiveOnline ?? presence?.isOnline);
  const mode = normalizeText(presence?.availabilityMode);

  if (mode === 'manual') {
    return effectiveOnline ? 'Online manual' : 'Offline manual';
  }

  return effectiveOnline ? 'Online automatico' : 'Offline automatico';
};

export const buildPresenceSearchText = presence =>
  [
    presence?.courier?.name,
    presence?.courier?.alias,
    presence?.company?.name,
    presence?.company?.alias,
    presence?.availabilityMode,
    presence?.availabilityStateLabel,
    presence?.currentModeLabel,
    presence?.manualReason,
    presence?.schedulesSummary,
    presence?.lastOnlineAt,
    presence?.lastOfflineAt,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const DELIVERY_COURIER_SCHEDULE_COLUMNS = [
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
    name: 'label',
    editable: false,
    filters: false,
    label: 'Horario',
    align: 'left',
    sortField: 'label',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'weekday',
    editable: false,
    filters: false,
    label: 'Dia',
    align: 'left',
    sortField: 'weekday',
    format: value => formatWeekdayLabel(value),
  },
  {
    sortable: true,
    name: 'windowLabel',
    editable: false,
    filters: false,
    label: 'Janela',
    align: 'left',
    sortField: 'startTime',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'active',
    editable: false,
    filters: false,
    label: 'Ativo',
    align: 'center',
    sortField: 'active',
    format: value => (value ? 'Sim' : 'Nao'),
  },
  {
    sortable: true,
    name: 'usageCount',
    editable: false,
    filters: false,
    label: 'Vinculos',
    align: 'center',
    sortField: 'usageCount',
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
    format: value => formatDateValue(value),
  },
  {
    sortable: true,
    name: 'alterDate',
    editable: false,
    filters: false,
    label: 'Atualizado em',
    align: 'left',
    sortField: 'alterDate',
    format: value => formatDateValue(value),
  },
];

export const DELIVERY_COURIER_PRESENCE_COLUMNS = [
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
    name: 'company',
    editable: false,
    filters: false,
    label: 'Empresa',
    align: 'left',
    sortField: 'company.alias',
    format: value => resolvePeopleLabel(value),
  },
  {
    sortable: true,
    name: 'courier',
    editable: false,
    filters: false,
    label: 'Motoboy',
    align: 'left',
    sortField: 'courier.alias',
    format: value => resolvePeopleLabel(value),
  },
  {
    sortable: true,
    name: 'availabilityMode',
    editable: false,
    filters: false,
    label: 'Modo',
    align: 'left',
    sortField: 'availabilityMode',
    format: value => {
      const match = DELIVERY_PRESENCE_AVAILABILITY_MODES.find(option => option.value === value);
      return match?.label || normalizeText(value) || '-';
    },
  },
  {
    sortable: true,
    name: 'availabilityStateLabel',
    editable: false,
    filters: false,
    label: 'Estado',
    align: 'left',
    sortField: 'availabilityStateLabel',
    format: value => normalizeText(value) || '-',
  },
  {
    sortable: true,
    name: 'effectiveOnline',
    editable: false,
    filters: false,
    label: 'Online',
    align: 'center',
    sortField: 'effectiveOnline',
    format: value => (value ? 'Sim' : 'Nao'),
  },
  {
    sortable: true,
    name: 'schedulesSummary',
    editable: false,
    filters: false,
    label: 'Horarios',
    align: 'left',
    sortField: 'schedulesSummary',
    format: value => normalizeText(value) || '-',
  },
  {
    sortable: true,
    name: 'manualReason',
    editable: false,
    filters: false,
    label: 'Motivo',
    align: 'left',
    sortField: 'manualReason',
    format: value => normalizeText(value) || '-',
  },
  {
    sortable: true,
    name: 'lastOnlineAt',
    editable: false,
    filters: false,
    label: 'Ultima conexao',
    align: 'left',
    sortField: 'lastOnlineAt',
    format: value => formatDateValue(value),
  },
  {
    sortable: true,
    name: 'lastOfflineAt',
    editable: false,
    filters: false,
    label: 'Ultima desconexao',
    align: 'left',
    sortField: 'lastOfflineAt',
    format: value => formatDateValue(value),
  },
  {
    sortable: true,
    name: 'alterDate',
    editable: false,
    filters: false,
    label: 'Atualizado em',
    align: 'left',
    sortField: 'alterDate',
    format: value => formatDateValue(value),
  },
];

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
