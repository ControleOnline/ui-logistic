/* eslint-disable no-unused-vars */
import React from 'react';
import OrderLogisticsPage from '@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage';
import DeliveryOrdersPage from '@controleonline/ui-logistic/src/react/pages/orders/index';
import DeliveryReceivablesPage from '@controleonline/ui-logistic/src/react/pages/receivables/index';
import DeliveryCompaniesPage from '@controleonline/ui-logistic/src/react/pages/companies/index';
import DeliveryVehicleSetupPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryVehicleSetupPage';
import DeliveryRateTablesPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryRateTablesPage';
import DeliveryRateTableFormPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryRateTableFormPage';
import DeliveryRateTableCompaniesPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryRateTableCompaniesPage';

export const WrappedOrderLogistics = ({navigation, route}) => {
  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      showBottomCart: false,
      showBottomToolBar: false,
    });
  }, [navigation]);

  return <OrderLogisticsPage navigation={navigation} route={route} />;
};

const logisticRoutes = [
  {
    name: 'OrderLogisticsPage',
    component: WrappedOrderLogistics,
    options: {
      headerShown: false,
      showBottomCart: false,
      showBottomToolBar: false,
      title: () => global.t?.t('orders', 'title', 'logistics') || 'Logistica',
    },
    path: 'order-logistics-page',
    initialParams: {store: 'orders'},
  },
  {
    name: 'DeliveryOrdersPage',
    component: DeliveryOrdersPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      showCompanyFilter: false,
      title: () => global.t?.t('orders', 'title', 'deliveryOrders') || 'Pedidos de entrega',
    },
    path: 'delivery/orders',
  },
  {
    name: 'DeliveryReceivablesPage',
    component: DeliveryReceivablesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      showCompanyFilter: false,
      title: () => global.t?.t('invoice', 'title', 'deliveryReceivables') || 'Recebiveis',
    },
    path: 'delivery/receivables',
  },
  {
    name: 'DeliveryCompaniesPage',
    component: DeliveryCompaniesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      showCompanyFilter: false,
      title: () => global.t?.t('people', 'title', 'deliveryCompanies') || 'Empresas homologadas',
    },
    path: 'delivery/companies',
  },
  {
    name: 'DeliveryVehicleSetupPage',
    component: DeliveryVehicleSetupPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      showCompanyFilter: false,
      title: 'Cadastro do veículo',
    },
    path: 'delivery/rates/setup',
  },
  {
    name: 'DeliveryRateTablesPage',
    component: DeliveryRateTablesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      showCompanyFilter: false,
      title: 'Minhas tabelas',
    },
    path: 'delivery/rates',
  },
  {
    name: 'DeliveryRateTableFormPage',
    component: DeliveryRateTableFormPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      showCompanyFilter: false,
      title: 'Nova tabela',
    },
    path: 'delivery/rates/form',
  },
  {
    name: 'DeliveryRateTableCompaniesPage',
    component: DeliveryRateTableCompaniesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      showCompanyFilter: false,
      title: 'Associar empresas',
    },
    path: 'delivery/rates/companies',
  },
];

export default logisticRoutes;
