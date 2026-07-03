const {
  filterDeliveryStatusItems,
  isPreparingDeliveryStatus,
} = require('../../../react/utils/deliveryStatusFilters')

const {describe, expect, it} = global

describe('deliveryStatusFilters', () => {
  it('filters out delivery preparing statuses and keeps the delivery lifecycle', () => {
    const statusItems = [
      {
        id: 1,
        context: 'delivery',
        status: 'aguardando aceite',
        realStatus: 'pending',
      },
      {
        id: 2,
        context: 'delivery',
        status: 'Preparando',
        realStatus: 'preparing',
      },
      {
        id: 3,
        context: 'delivery',
        status: 'aceito',
        realStatus: 'accepted',
      },
      {
        id: 4,
        context: 'delivery',
        status: 'em rota',
        realStatus: 'way',
      },
      {
        id: 5,
        context: 'delivery',
        status: 'closed',
        realStatus: 'closed',
      },
      {
        id: 6,
        context: 'order',
        status: 'preparando',
        realStatus: 'preparing',
      },
    ]

    expect(isPreparingDeliveryStatus(statusItems[1])).toBe(true)
    expect(isPreparingDeliveryStatus(statusItems[5])).toBe(false)

    const filtered = filterDeliveryStatusItems(statusItems)

    expect(filtered.map(item => item.status)).toEqual([
      'aguardando aceite',
      'aceito',
      'em rota',
      'closed',
    ])
  })
})
