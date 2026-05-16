import React from 'react';
import OrderLogisticsPage from '@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage';

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
      title: global.t?.t('orders', 'title', 'logistics') || 'Logistica',
    },
    path: 'order-logistics-page',
    initialParams: {store: 'orders'},
  },
];

export default logisticRoutes;
