const {OWN_DELIVERY_SMOKE_META} = require('../../../react/utils/ownDeliveryHandoff');

const READY_STATUS = {
  '@id': '/statuses/ready',
  id: 701,
  context: 'order',
  status: 'ready',
  realStatus: 'ready',
  color: '#10B981',
};

const CONFERENCE_STATUS = {
  '@id': '/statuses/conference',
  id: 700,
  context: 'order',
  status: 'conference',
  realStatus: 'conference',
  color: '#0EA5E9',
};

const CLOSED_STATUS = {
  '@id': '/statuses/delivery-closed',
  id: 851,
  context: 'delivery',
  status: 'closed',
  realStatus: 'closed',
  color: '#64748B',
};

const PENDING_DELIVERY_STATUS = {
  '@id': '/statuses/delivery-awaiting-acceptance',
  id: 848,
  context: 'delivery',
  status: 'aguardando aceite',
  realStatus: 'pending',
  color: '#e67e22',
};

const createCourier = () => ({
  id: 7,
  name: 'Motoboy Teste',
  alias: 'Motoboy Teste',
  active: 1,
});

const createCompany = () => ({
  id: 3,
  name: 'Restaurante Centro',
  alias: 'Centro',
  panel_enabled: true,
  enabled: true,
  theme: {colors: {primary: '#0EA5E9', secondary: '#F97316'}},
});

const createCustomer = () => ({
  '@id': '/people/81',
  id: 81,
  name: 'Cliente Teste',
  alias: 'Cliente Teste',
});

const createAddress = (id, street, number) => ({
  '@id': `/addresses/${id}`,
  id,
  number,
  street: {
    street,
    district: {
      district: 'Centro',
      city: {city: 'Sao Paulo', state: {uf: 'SP'}},
    },
    cep: {cep: '01000-000'},
  },
  latitude: -23.55,
  longitude: -46.63,
});

const createSaleOrder = ({id, status}) => ({
  '@id': `/orders/${id}`,
  id,
  orderType: 'sale',
  app: 'POS',
  status,
  externalCode: `VD-${id}`,
  price: 42.9,
  paymentPolicy: 'pay_at_exit_or_delivery',
});

const createOwnDeliveryOrder = ({id, mainOrder, status}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'DELIVERY',
  orderType: 'delivery',
  providerKey: 'delivery',
  provider: createCourier(),
  deliveryPeople: createCourier(),
  client: createCustomer(),
  deliveryContact: createCustomer(),
  retrieveContact: createCompany(),
  addressOrigin: createAddress('origin-1', 'Rua das Flores', '123'),
  addressDestination: createAddress('destination-1', 'Avenida Paulista', '1500'),
  mainOrderId: mainOrder.id,
  main_order_id: mainOrder.id,
  mainOrder,
  saleStatus: mainOrder.status,
  price: 12.5,
  status,
  comments: 'Entrega propria da loja',
});

const createUnpaidInvoice = ({id, orderId}) => ({
  '@id': `/invoices/${id}`,
  id,
  invoiceType: 'invoice',
  price: 42.9,
  paid: false,
  status: {status: 'pending', realStatus: 'pending'},
  receiver: {'@id': '/people/7', id: 7, name: 'Motoboy Teste'},
  order: {'@id': `/orders/${orderId}`, id: orderId},
  dueDate: '2026-08-26',
});

const createOwnDeliveryLogistics = order => ({
  order,
  management: {
    mode: 'store',
    managedByStore: true,
    label: 'Entrega nossa',
    source: 'delivery',
    mainOrderId: order.mainOrderId,
  },
  providers: [
    {key: 'delivery', label: 'Entrega nossa', connected: true, online: true},
    {key: 'ifood', label: 'iFood', connected: true, online: true},
  ],
  quotes: [
    {
      id: Number(order.id) + 5000,
      providerKey: 'delivery',
      providerLabel: 'Entrega nossa',
      price: order.price,
      quoteState: 'selected',
      selected: true,
      available: true,
      status: order.status,
    },
  ],
  selection: {
    providerKey: 'delivery',
    price: order.price,
  },
  delivery: {
    deliveryPeople: order.deliveryPeople,
    currentIntegrationKey: 'delivery',
    status: order.status?.realStatus,
  },
});

module.exports = {
  CLOSED_STATUS,
  CONFERENCE_STATUS,
  OWN_DELIVERY_SMOKE_META,
  PENDING_DELIVERY_STATUS,
  READY_STATUS,
  createCompany,
  createCourier,
  createOwnDeliveryLogistics,
  createOwnDeliveryOrder,
  createSaleOrder,
  createUnpaidInvoice,
};
