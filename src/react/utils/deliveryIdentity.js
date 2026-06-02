import {getDateRange} from '@controleonline/ui-common/src/react/utils/dateRangeFilter';

const normalizeText = value => String(value ?? '').trim();

export const normalizeEntityId = value => {
  if (value && typeof value === 'object') {
    return normalizeEntityId(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value).replace(/\D+/g, '');
};

export const resolveCurrentPeopleId = user =>
  normalizeEntityId(user?.people ?? user?.peopleId ?? user?.person ?? user?.personId ?? '');

export const resolveCurrentPeopleIri = user => {
  const peopleId = resolveCurrentPeopleId(user);
  return peopleId ? `/people/${peopleId}` : '';
};

export const normalizeFilterValue = value => {
  if (value && typeof value === 'object') {
    return normalizeFilterValue(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value);
};

export const resolveDateRangeFilter = value => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const shortcut = value.shortcut || value.value || 'all';
  const customRange = value.customRange || {from: '', to: ''};
  const dateRange = getDateRange(shortcut, customRange, {
    relativeMode: 'rolling',
    useCurrentMoment: true,
  });

  return {
    after: dateRange?.after || '',
    before: dateRange?.before || '',
  };
};
