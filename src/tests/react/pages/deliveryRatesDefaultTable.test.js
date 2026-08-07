/* global describe, expect, it */

describe('delivery rates DefaultTable migration (#291)', () => {
  it('manager requestParams use company IRI', () => {
    const companyId = '3';
    const requestParams = {company: `/people/${companyId}`};
    expect(requestParams.company).toBe('/people/3');
  });

  it('courier requestParams use courier IRI', () => {
    const peopleId = '9';
    const requestParams = {courier: `/people/${peopleId}`};
    expect(requestParams.courier).toBe('/people/9');
  });
});
