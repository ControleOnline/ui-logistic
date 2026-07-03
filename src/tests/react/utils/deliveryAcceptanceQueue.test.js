const {
  resolveDeliveryAcceptanceQueueHead,
  resolveDeliveryRunPlan,
  resolveDeliveryWorkflowHead,
} = require('../../../react/utils/deliveryAcceptanceQueue')

const {describe, expect, it} = global

describe('deliveryAcceptanceQueue', () => {
  it('keeps awaiting-acceptance orders ahead of active runs', () => {
    const queueHead = resolveDeliveryWorkflowHead([
      {
        id: 10,
        orderType: 'delivery',
        status: {
          status: 'pending',
          realStatus: 'pending',
        },
      },
      {
        id: 11,
        orderType: 'delivery',
        status: {
          status: 'way',
          realStatus: 'pending',
        },
        addressDestination: {
          latitude: -23.55,
          longitude: -46.63,
        },
      },
    ])

    expect(queueHead?.id).toBe(10)
    expect(resolveDeliveryAcceptanceQueueHead([
      {
        id: 10,
        orderType: 'delivery',
        status: {
          status: 'pending',
          realStatus: 'pending',
        },
      },
    ])?.id).toBe(10)
  })

  it('orders the delivery run by eta when available', () => {
    const plan = resolveDeliveryRunPlan([
      {
        id: 21,
        orderType: 'delivery',
        status: {
          status: 'way',
          realStatus: 'pending',
        },
        route: {
          etaMinutes: 18,
        },
        addressDestination: {
          latitude: -23.56,
          longitude: -46.64,
        },
      },
      {
        id: 22,
        orderType: 'delivery',
        status: {
          status: 'way',
          realStatus: 'pending',
        },
        route: {
          etaMinutes: 9,
        },
        addressDestination: {
          latitude: -23.57,
          longitude: -46.61,
        },
      },
    ])

    expect(plan.strategy).toBe('eta')
    expect(plan.totalStops).toBe(2)
    expect(plan.stops.map(stop => stop.id)).toEqual([22, 21])
  })

  it('falls back to the nearest stop when eta is not available', () => {
    const plan = resolveDeliveryRunPlan(
      [
        {
          id: 31,
          orderType: 'delivery',
          status: {
            status: 'way',
            realStatus: 'pending',
          },
          addressDestination: {
            latitude: 0,
            longitude: 2,
          },
        },
        {
          id: 32,
          orderType: 'delivery',
          status: {
            status: 'way',
            realStatus: 'pending',
          },
          addressDestination: {
            latitude: 0,
            longitude: 1,
          },
        },
      ],
      {
        courierCoordinates: {
          latitude: 0,
          longitude: 0,
        },
      },
    )

    expect(plan.strategy).toBe('distance')
    expect(plan.stops.map(stop => stop.id)).toEqual([32, 31])
  })
})
