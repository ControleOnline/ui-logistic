const {
  filterOwnDeliveryQueue,
  isMarketplaceCourier,
  isOwnDeliveryProvider,
  isSaleOrderReady,
  needsChargeOnDelivery,
  OWN_DELIVERY_SMOKE_META,
  shouldOpenOnDelivery,
} = require('../../../react/utils/ownDeliveryHandoff');

const {describe, expect, it} = global;

describe('ownDeliveryHandoff', () => {
  it('declares flowchart 1 and logistica-entrega for the smoke manifesto', () => {
    expect(OWN_DELIVERY_SMOKE_META.flowchartIds).toEqual([1]);
    expect(OWN_DELIVERY_SMOKE_META.fluxo).toBe('logistica-entrega');
    expect(OWN_DELIVERY_SMOKE_META.steps).toEqual([
      'ready',
      'escolha-delivery-nossa',
      'lista-delivery',
      'cobranca-na-entrega',
      'closed',
    ]);
  });

  it('treats delivery as own courier and iFood/99 as marketplace', () => {
    expect(isOwnDeliveryProvider('delivery')).toBe(true);
    expect(isOwnDeliveryProvider('OWN')).toBe(true);
    expect(isMarketplaceCourier('ifood')).toBe(true);
    expect(isMarketplaceCourier('99food')).toBe(true);
    expect(isOwnDeliveryProvider('ifood')).toBe(false);
  });

  it('does not open ON DELIVERY before the sale order is Ready', () => {
    expect(
      shouldOpenOnDelivery({
        saleStatus: {realStatus: 'conference'},
        providerKey: 'delivery',
      }),
    ).toBe(false);
    expect(
      shouldOpenOnDelivery({
        saleStatus: {realStatus: 'ready'},
        providerKey: 'delivery',
      }),
    ).toBe(true);
    expect(isSaleOrderReady({status: 'Ready'})).toBe(true);
  });

  it('never opens ON DELIVERY for marketplace couriers even when Ready', () => {
    expect(
      shouldOpenOnDelivery({
        saleStatus: {realStatus: 'ready'},
        providerKey: 'ifood',
      }),
    ).toBe(false);
  });

  it('charges on delivery only when the payment policy asks and there is an unpaid invoice', () => {
    expect(
      needsChargeOnDelivery({
        paymentPolicy: 'Pay at exit or delivery',
        invoices: [{id: 1, paid: false, status: 'pending'}],
      }),
    ).toBe(true);
    expect(
      needsChargeOnDelivery({
        paymentPolicy: 'prepaid',
        invoices: [{id: 1, paid: false}],
      }),
    ).toBe(false);
    expect(
      needsChargeOnDelivery({
        paymentPolicy: 'on_delivery',
        invoices: [{id: 1, paid: true, status: 'paid'}],
      }),
    ).toBe(false);
  });

  it('keeps only Ready + own-delivery rows in the courier queue', () => {
    const queued = filterOwnDeliveryQueue(
      [
        {
          id: 10,
          app: 'delivery',
          mainOrderId: 100,
        },
        {
          id: 11,
          app: 'ifood',
          mainOrderId: 101,
        },
        {
          id: 12,
          app: 'delivery',
          mainOrderId: 102,
        },
      ],
      {
        saleOrdersById: {
          100: {id: 100, status: {realStatus: 'ready'}},
          101: {id: 101, status: {realStatus: 'ready'}},
          102: {id: 102, status: {realStatus: 'production'}},
        },
      },
    );

    expect(queued.map(order => order.id)).toEqual([10]);
  });
});
