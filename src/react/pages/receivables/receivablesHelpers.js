/*
 * Helpers for DELIVERY receivables / motoboy-payments views.
 * - Motoboy view: invoices where receiver = logged courier; optional company (payer) filter.
 * - Company view: invoices where payer = current company; optional receiver (motoboy) filter.
 */

const COURIER_LINK_TYPE = 'courier';

const normalizeText = value => String(value ?? '').trim();

export const normalizeEntityId = value => {
  if (value && typeof value === 'object') {
    return normalizeEntityId(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value).replace(/\D+/g, '');
};

export const toPeopleIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/people/${id}` : '';
};

export const resolvePeopleLabel = value => {
  if (!value || typeof value !== 'object') {
    return normalizeText(value) || '-';
  }

  const name = normalizeText(value.name);
  const alias = normalizeText(value.alias);
  if (name && alias) {
    return `${name} - ${alias}`;
  }

  return name || alias || normalizeText(value.label) || `#${normalizeEntityId(value) || '?'}`;
};

export const isCourierEnabledCompany = company =>
  company?.user?.courier_enabled === true ||
  (Array.isArray(company?.permission) && company.permission.includes('courier'));

/**
 * Build chip options for homologated companies (motoboy view).
 * @param {Array} companyList - from people.myCompaniesByLinkType({ linkType: 'courier' })
 */
export const buildCompanyFilterOptions = (companyList = []) => {
  const list = Array.isArray(companyList) ? companyList : [];
  return list
    .filter(isCourierEnabledCompany)
    .map(company => {
      const id = normalizeEntityId(company);
      if (!id) return null;
      return {
        id,
        iri: `/people/${id}`,
        label: resolvePeopleLabel(company),
      };
    })
    .filter(Boolean);
};

/**
 * Build chip options for motoboys linked to the current company (company view).
 * @param {Array} linkList - people_links with linkType=courier for the company
 */
export const buildMotoboyFilterOptions = (linkList = []) => {
  const list = Array.isArray(linkList) ? linkList : [];
  const seen = new Set();

  return list
    .map(link => {
      const people = link?.people || link?.person || null;
      const id = normalizeEntityId(people || link);
      if (!id || seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        iri: `/people/${id}`,
        label: resolvePeopleLabel(people || link),
      };
    })
    .filter(Boolean);
};

/**
 * Motoboy receivables request params: always receiver = courier; optional payer = company.
 */
export const buildMotoboyReceivablesParams = ({
  receiverIri,
  companyIri = '',
} = {}) => {
  const params = {
    invoiceType: 'invoice',
  };

  if (receiverIri) {
    params.receiver = receiverIri;
  }

  if (companyIri) {
    params.payer = companyIri;
  }

  return params;
};

/**
 * Company payments-to-motoboys request params: always payer = company; optional receiver = motoboy.
 */
export const buildCompanyMotoboyPaymentsParams = ({
  payerIri,
  motoboyIri = '',
} = {}) => {
  const params = {
    invoiceType: 'invoice',
  };

  if (payerIri) {
    params.payer = payerIri;
  }

  if (motoboyIri) {
    params.receiver = motoboyIri;
  }

  return params;
};

export { COURIER_LINK_TYPE };
