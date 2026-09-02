import React from 'react';
import OrderLogisticsPage from '@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage';
import DeliveryOrdersPage from '@controleonline/ui-logistic/src/react/pages/orders/index';
import DeliveryReceivablesPage from '@controleonline/ui-logistic/src/react/pages/receivables/index';
import DeliveryMotoboyPaymentsPage from '@controleonline/ui-logistic/src/react/pages/motoboy-payments/index';
import DeliveryCompaniesPage from '@controleonline/ui-logistic/src/react/pages/companies/index';
import DeliveryVehicleSetupPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryVehicleSetupPage';
import DeliveryRateTablesPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryRateTablesPage';
import DeliveryRateTableFormPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryRateTableFormPage';
import DeliveryRateTableCompaniesPage from '@controleonline/ui-logistic/src/react/pages/delivery-rates/DeliveryRateTableCompaniesPage';
import DeliveryCourierSchedulesPage from '@controleonline/ui-logistic/src/react/pages/presence/DeliveryCourierSchedulesPage';
import DeliveryCourierScheduleFormPage from '@controleonline/ui-logistic/src/react/pages/presence/DeliveryCourierScheduleFormPage';
import DeliveryCourierPresencePage from '@controleonline/ui-logistic/src/react/pages/presence/DeliveryCourierPresencePage';
import DeliveryCourierPresenceHistoryPage from '@controleonline/ui-logistic/src/react/pages/presence/DeliveryCourierPresenceHistoryPage';
import CtePendingInvoicesPage from '@controleonline/ui-logistic/src/react/pages/cte/CtePendingInvoicesPage';
import CteEmitPage from '@controleonline/ui-logistic/src/react/pages/cte/CteEmitPage';
import CteDetailPage from '@controleonline/ui-logistic/src/react/pages/cte/CteDetailPage';
import {NfcePage, NfePage, NfsePage} from '@controleonline/ui-logistic/src/react/pages/fiscal/FiscalDocumentsPage';
import NfceEmitPage from '@controleonline/ui-logistic/src/react/pages/fiscal/NfceEmitPage';
import NfceDetailPage from '@controleonline/ui-logistic/src/react/pages/fiscal/NfceDetailPage';
import NfeEmitPage from '@controleonline/ui-logistic/src/react/pages/fiscal/NfeEmitPage';
import NfseEmitPage from '@controleonline/ui-logistic/src/react/pages/fiscal/NfseEmitPage';

export const WrappedOrderLogistics = ({navigation, route}) => {
  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      showBottomCart: false,
      showBottomToolBar: true,
    });
  }, [navigation]);

  return <OrderLogisticsPage navigation={navigation} route={route} />;
};

export const WrappedDeliveryRun = ({navigation, route}) => {
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
      showBottomToolBar: true,
      title: () => global.t?.t('orders', 'title', 'logistics') || 'Logistica',
    },
    path: 'order-logistics-page',
    initialParams: {store: 'orders', showBottomToolBar: true},
  },
  {
    name: 'DeliveryRunPage',
    component: WrappedDeliveryRun,
    options: {
      headerShown: false,
      showBottomCart: false,
      showBottomToolBar: false,
      title: () => global.t?.t('orders', 'title', 'deliveryRun') || 'Corrida',
    },
    path: 'delivery/run',
    initialParams: {store: 'orders', showBottomToolBar: false},
  },
  {
    name: 'DeliveryOrdersPage',
    component: DeliveryOrdersPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
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
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: () => global.t?.t('invoice', 'title', 'deliveryReceivables') || 'Recebíveis do motoboy',
    },
    path: 'delivery/receivables',
  },
  {
    name: 'DeliveryMotoboyPaymentsPage',
    component: DeliveryMotoboyPaymentsPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
      title: () => global.t?.t('invoice', 'title', 'motoboyPayments') || 'Pagamentos a motoboys',
    },
    path: 'delivery/motoboy-payments',
  },
  {
    name: 'DeliveryCompaniesPage',
    component: DeliveryCompaniesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
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
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Cadastro do veículo',
    },
    path: 'delivery/courier/vehicle/setup',
  },
  {
    name: 'DeliveryRateTablesPage',
    component: DeliveryRateTablesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Minhas tabelas',
    },
    path: 'delivery/courier/rates',
  },
  {
    name: 'DeliveryRateTableFormPage',
    component: DeliveryRateTableFormPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Nova tabela',
    },
    path: 'delivery/courier/rates/form',
  },
  {
    name: 'DeliveryRateTableCompaniesPage',
    component: DeliveryRateTableCompaniesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Associar empresas',
    },
    path: 'delivery/courier/rates/companies',
  },
  {
    name: 'DeliveryCourierSchedulesPage',
    component: DeliveryCourierSchedulesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Horarios do motoboy',
    },
    path: 'delivery/courier/presence/schedules',
  },
  {
    name: 'DeliveryCourierScheduleFormPage',
    component: DeliveryCourierScheduleFormPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Horario do motoboy',
    },
    path: 'delivery/courier/presence/schedule-form',
  },
  {
    name: 'DeliveryCourierPresencePage',
    component: DeliveryCourierPresencePage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Presenca por empresa',
    },
    path: 'delivery/courier/presence/detail',
  },
  {
    name: 'DeliveryCourierPresenceHistoryPage',
    component: DeliveryCourierPresenceHistoryPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Historico da presenca',
    },
    path: 'delivery/courier/presence/history',
  },
  {
    name: 'CtePendingInvoicesPage',
    component: CtePendingInvoicesPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
      title: 'CT-e',
    },
    path: 'cte',
  },
  {
    name: 'CteEmitPage',
    component: CteEmitPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Emitir CT-e',
    },
    path: 'cte/emit',
  },
  {
    name: 'CteDetailPage',
    component: CteDetailPage,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: true,
      showCompanyFilter: false,
      title: 'Detalhe do CT-e',
    },
    path: 'cte/detail',
  },
  {
    name: 'NfcePage',
    component: NfcePage,
    options: {headerShown: true, showBottomCart: false, showBottomToolBar: true, showCompanyFilter: true, companyFilterMode: 'icon', title: 'NFC-e'},
    path: 'nfce',
  },
  {
    name: 'NfceEmitPage',
    component: NfceEmitPage,
    options: {headerShown: true, showBottomCart: false, showBottomToolBar: true, showCompanyFilter: false, title: 'Emitir NFC-e'},
    path: 'nfce/emit',
  },
  {
    name: 'NfceDetailPage',
    component: NfceDetailPage,
    options: {headerShown: true, showBottomCart: false, showBottomToolBar: true, showCompanyFilter: false, title: 'Detalhe da NFC-e'},
    path: 'nfce/detail',
  },
  {
    name: 'NfePage',
    component: NfePage,
    options: {headerShown: true, showBottomCart: false, showBottomToolBar: true, showCompanyFilter: true, companyFilterMode: 'icon', title: 'NF-e'},
    path: 'nfe',
  },
  {
    name: 'NfeEmitPage',
    component: NfeEmitPage,
    options: {headerShown: true, showBottomCart: false, showBottomToolBar: true, showCompanyFilter: false, title: 'Emitir NF-e'},
    path: 'nfe/emit',
  },
  {
    name: 'NfsePage',
    component: NfsePage,
    options: {headerShown: true, showBottomCart: false, showBottomToolBar: true, showCompanyFilter: true, companyFilterMode: 'icon', title: 'NFSe'},
    path: 'nfse',
  },
  {
    name: 'NfseEmitPage',
    component: NfseEmitPage,
    options: {headerShown: true, showBottomCart: false, showBottomToolBar: true, showCompanyFilter: false, title: 'Emitir NFSe'},
    path: 'nfse/emit',
  },
];

export default logisticRoutes;
