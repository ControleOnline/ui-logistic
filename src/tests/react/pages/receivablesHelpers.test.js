const {
  buildCompanyFilterOptions,
  buildMotoboyFilterOptions,
  buildMotoboyReceivablesParams,
  buildCompanyMotoboyPaymentsParams,
  isCourierEnabledCompany,
  toPeopleIri,
} = require('../../../react/pages/receivables/receivablesHelpers');

describe('receivablesHelpers', () => {
  describe('isCourierEnabledCompany', () => {
    it('accepts courier_enabled user flag', () => {
      expect(isCourierEnabledCompany({ user: { courier_enabled: true } })).toBe(true);
    });

    it('accepts permission array with courier', () => {
      expect(isCourierEnabledCompany({ permission: ['courier'] })).toBe(true);
    });

    it('rejects companies without courier flag', () => {
      expect(isCourierEnabledCompany({ permission: ['manager'] })).toBe(false);
    });
  });

  describe('buildCompanyFilterOptions', () => {
    it('maps homologated companies to chips', () => {
      const options = buildCompanyFilterOptions([
        { id: 10, name: 'Loja A', alias: 'A', user: { courier_enabled: true } },
        { id: 11, name: 'Sem courier', permission: [] },
      ]);
      expect(options).toEqual([
        { id: '10', iri: '/people/10', label: 'Loja A - A' },
      ]);
    });
  });

  describe('buildMotoboyFilterOptions', () => {
    it('maps people_link rows to unique motoboy chips', () => {
      const options = buildMotoboyFilterOptions([
        { people: { id: 7, name: 'Joao', alias: 'J' } },
        { people: { id: 7, name: 'Joao', alias: 'J' } },
        { people: { id: 8, name: 'Maria' } },
      ]);
      expect(options).toEqual([
        { id: '7', iri: '/people/7', label: 'Joao - J' },
        { id: '8', iri: '/people/8', label: 'Maria' },
      ]);
    });
  });

  describe('buildMotoboyReceivablesParams', () => {
    it('always sets receiver and optional payer', () => {
      expect(
        buildMotoboyReceivablesParams({
          receiverIri: '/people/1',
          companyIri: '/people/99',
        }),
      ).toEqual({
        invoiceType: 'invoice',
        receiver: '/people/1',
        payer: '/people/99',
      });
    });

    it('omits payer when empty', () => {
      expect(buildMotoboyReceivablesParams({ receiverIri: '/people/1' })).toEqual({
        invoiceType: 'invoice',
        receiver: '/people/1',
      });
    });
  });

  describe('buildCompanyMotoboyPaymentsParams', () => {
    it('always sets payer and optional receiver', () => {
      expect(
        buildCompanyMotoboyPaymentsParams({
          payerIri: '/people/50',
          motoboyIri: '/people/7',
        }),
      ).toEqual({
        invoiceType: 'invoice',
        payer: '/people/50',
        receiver: '/people/7',
      });
    });
  });

  describe('toPeopleIri', () => {
    it('normalizes numeric and object ids', () => {
      expect(toPeopleIri(42)).toBe('/people/42');
      expect(toPeopleIri({ id: 42 })).toBe('/people/42');
      expect(toPeopleIri('')).toBe('');
    });
  });
});
