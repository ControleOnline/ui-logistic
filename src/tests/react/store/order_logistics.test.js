const {jest} = require('@jest/globals');

const {beforeEach, describe, expect, it} = global;

let mockFetch = jest.fn();

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: (...args) => mockFetch(...args),
  },
}));

const store = require('../../../store/order_logistics').default;
const types = require('@controleonline/ui-default/src/store/default/mutation_types');

describe('order_logistics store', () => {
  beforeEach(() => {
    mockFetch = jest.fn();
  });

  it('loads the logistics payload from the member envelope', async () => {
    mockFetch.mockResolvedValue({
      member: [
        {
          id: 285,
          order: {
            id: 285,
          },
        },
      ],
    });

    const commit = jest.fn();
    const getters = {
      resourceEndpoint: 'marketplace/logistics/orders',
    };

    const result = await store.actions.get({commit, getters}, {id: 285});

    expect(mockFetch).toHaveBeenCalledWith('marketplace/logistics/orders/285', {
      method: 'GET',
    });
    expect(result).toEqual({
      id: 285,
      order: {
        id: 285,
      },
    });
    expect(commit).toHaveBeenCalledWith(types.SET_ITEM, {
      id: 285,
      order: {
        id: 285,
      },
    });
    expect(commit).toHaveBeenCalledWith(types.SET_LOADED_KEY, '285');
  });

  it('returns the quote request result from the member envelope', async () => {
    mockFetch.mockResolvedValue({
      member: [
        {
          errno: 0,
          errmsg: 'ok',
          data: {
            order_id: 285,
          },
        },
      ],
    });

    const commit = jest.fn();
    const getters = {
      resourceEndpoint: 'marketplace/logistics/orders',
    };

    const result = await store.actions.requestQuotes({commit, getters}, {id: 285});

    expect(mockFetch).toHaveBeenCalledWith('marketplace/logistics/orders/285/quote', {
      method: 'POST',
    });
    expect(result).toEqual({
      errno: 0,
      errmsg: 'ok',
      data: {
        order_id: 285,
      },
    });
  });

  it('returns the confirm action result from the order action response', async () => {
    mockFetch.mockResolvedValue({
      action: 'confirm',
      result: {
        errno: 0,
        errmsg: 'ok',
      },
      capabilities: [],
    });

    const commit = jest.fn();
    const getters = {
      resourceEndpoint: 'marketplace/logistics/orders',
    };

    const result = await store.actions.confirm({commit, getters}, {id: 285});

    expect(mockFetch).toHaveBeenCalledWith('/orders/285/confirm', {
      method: 'POST',
    });
    expect(result).toEqual({
      errno: 0,
      errmsg: 'ok',
    });
  });
});
