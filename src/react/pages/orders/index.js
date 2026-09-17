// fluxo: motoboy-cadastro | etapa: delivery-orders | wiki: https://github.com/ControleOnline/app-community/wiki/Venda-Producao
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Platform, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {buildOrderDetailsRouteParams} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {getDateRange} from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import {
  resolveDeliveryWorkflowHead,
  resolveDeliveryWorkflowRouteName,
} from '@controleonline/ui-logistic/src/react/utils/deliveryAcceptanceQueue';
import {filterDeliveryStatusItems} from '@controleonline/ui-logistic/src/react/utils/deliveryStatusFilters';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import styles from './index.styles';

const DELIVERY_ORDER_TYPE = 'delivery';

const normalizeText = value => String(value || '').trim();

const resolveDateRangeFilter = value => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const shortcut = value.shortcut || value.value || 'all';
  const customRange = value.customRange || {from: '', to: ''};
  const dateRange = getDateRange(shortcut, customRange, {
    relativeMode: 'rolling',
    useCurrentMoment: true,
  });

  return {
    after: dateRange?.after || '',
    before: dateRange?.before || '',
  };
};

const buildDeliveryRequestParams = ({
  currentPeopleIri,
  filters,
}) => {
  if (!currentPeopleIri) {
    return null;
  }

  const query = {
    orderType: DELIVERY_ORDER_TYPE,
    provider: currentPeopleIri,
  };

  if (filters?.status) {
    query.status = filters.status;
  }

  const dateRange = resolveDateRangeFilter(filters?.orderDate);

  if (dateRange.after) {
    query['orderDate[after]'] = dateRange.after;
  }

  if (dateRange.before) {
    query['orderDate[before]'] = dateRange.before;
  }

  return query;
};

const buildOrderMetaText = order => {
  const meta = [];
  const mainOrderExternalCode = normalizeText(order?.mainOrder?.externalCode);
  const deliveryContact = normalizeText(
    order?.deliveryContact?.name || order?.deliveryContact?.alias,
  );

  if (mainOrderExternalCode) {
    meta.push(`Comanda: #${mainOrderExternalCode}`);
  }

  if (deliveryContact) {
    meta.push(`Recebedor: ${deliveryContact}`);
  }

  return meta.join(' ');
};

export default function DeliveryOrdersPage() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const authStore = useStore('auth');
  const deliveryOrdersStore = useStore('delivery_orders');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const statusStore = useStore('status');

  const {user, sessionChecked} = authStore.getters || {};
  const {colors: themeColors} = themeStore.getters || {};
  const {actions: peopleActions, getters: peopleGetters} = peopleStore;
  const {currentCompany} = peopleGetters || {};
  const {getters: statusGetters} = statusStore;

  const currentPeopleId = useMemo(
    () => normalizeText(user?.people || user?.peopleId || '').replace(/\D+/g, ''),
    [user?.people, user?.peopleId],
  );
  const currentPeopleIri = currentPeopleId ? `/people/${currentPeopleId}` : '';

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [currentCompany?.theme?.colors, themeColors],
  );

  const [deliveryFilters, setDeliveryFilters] = useState({});
  const [loadedDeliveryQueueItems, setLoadedDeliveryQueueItems] = useState([]);
  const hasCurrentCompany = !!currentCompany && Object.keys(currentCompany || {}).length > 0;
  const isBootstrapReady = Boolean(sessionChecked) && hasCurrentCompany && Boolean(themeColors);

  const statusItems = useMemo(
    () => (Array.isArray(statusGetters.items) ? statusGetters.items : []),
    [statusGetters.items],
  );

  const resolvedStatusOptions = useMemo(() => {
    const seenKeys = new Set();
    return filterDeliveryStatusItems(statusItems)
      .reduce((accumulator, status) => {
        const key = normalizeText(
          status?.['@id'] || (status?.id ? `/statuses/${status.id}` : ''),
        );

        if (!key || seenKeys.has(key)) {
          return accumulator;
        }

        seenKeys.add(key);
        accumulator.push({
          value: key,
          label:
            normalizeText(global.t?.t('orders', 'status', status?.status)) ||
            normalizeText(status?.status) ||
            key,
        });
        return accumulator;
      }, []);
  }, [statusItems]);

  const deliveryQueueItems = Array.isArray(deliveryOrdersStore?.getters?.items)
    ? deliveryOrdersStore.getters.items
    : [];
  const deliveryQueueHead = resolveDeliveryWorkflowHead(
    loadedDeliveryQueueItems.length > 0 ? loadedDeliveryQueueItems : deliveryQueueItems,
  );
  const deliveryWorkflowRouteName = resolveDeliveryWorkflowRouteName(deliveryQueueHead);

  const deliverySort = useMemo(
    () => ({
      direction: 'desc',
      field: 'orderDate',
    }),
    [],
  );

  const deliveryRequestParams = useMemo(
    () =>
      buildDeliveryRequestParams({
        currentPeopleIri,
        filters: deliveryFilters,
      }),
    [currentPeopleIri, deliveryFilters],
  );
  const getExternalFilterOptions = useCallback(
    column => ((column?.name || column?.key) === 'status' ? resolvedStatusOptions : []),
    [resolvedStatusOptions],
  );

  const openOrder = useCallback(
    order => {
      if (!order) return;

      navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
    },
    [navigation],
  );

  const replaceWebLocation = useCallback(href => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.location?.replace === 'function'
    ) {
      window.location.replace(href);
      return true;
    }

    return false;
  }, []);

  const renderCard = useCallback(
    ({item: order, openRow}) => {
      return (
        <TouchableOpacity
          key={order?.id}
          style={styles.orderCard}
          activeOpacity={0.85}
          onPress={openRow || (() => openOrder(order))}
        >
          <OrderHeader order={order} metaText={buildOrderMetaText(order)} />
        </TouchableOpacity>
      );
    },
    [openOrder],
  );

  useEffect(() => {
    if (!isFocused || !sessionChecked || typeof peopleActions?.myCompanies !== 'function') {
      return;
    }

    if (!currentCompany?.id) {
      peopleActions.myCompanies().catch(() => {});
    }
  }, [
    currentCompany?.id,
    isFocused,
    peopleActions,
    sessionChecked,
  ]);

  useEffect(() => {
    if (!isFocused || !currentPeopleIri || !deliveryQueueHead?.id || !deliveryWorkflowRouteName) {
      return;
    }

    const nextParams =
      deliveryWorkflowRouteName === 'DeliveryRunPage'
        ? {
            store: 'orders',
            showBottomToolBar: false,
          }
        : buildOrderDetailsRouteParams(deliveryQueueHead.id, {
            store: 'orders',
          });
    const nextHref =
      deliveryWorkflowRouteName === 'DeliveryRunPage'
        ? `/delivery/run?${new URLSearchParams(nextParams).toString()}`
        : `/order-details?${new URLSearchParams(nextParams).toString()}`;

    if (replaceWebLocation(nextHref)) {
      return;
    }

    if (typeof navigation.replace === 'function') {
      navigation.replace(deliveryWorkflowRouteName, nextParams);
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: deliveryWorkflowRouteName,
          params: nextParams,
        },
      ],
    });
  }, [
    currentPeopleIri,
    deliveryQueueHead?.id,
    deliveryWorkflowRouteName,
    isFocused,
    navigation,
    replaceWebLocation,
  ]);

  useEffect(() => {
    setDeliveryFilters(current => {
      if (
        current.status &&
        !resolvedStatusOptions.some(option => option.value === current.status || option.key === current.status)
      ) {
        const next = {...current};
        delete next.status;
        return next;
      }

      return current;
    });
  }, [resolvedStatusOptions]);

  if (!isBootstrapReady) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={brandColors.primary || '#0EA5E9'} />
        <Text style={styles.centerStateTitle}>Carregando pedidos de entrega...</Text>
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerStateTitle}>
          Nao foi possivel identificar o motoboy logado.
        </Text>
        <Text style={styles.centerStateText}>
          Verifique o vinculo `people_link` do tipo `courier` para este usuario.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: brandColors.background || '#F8FAFC' }]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <DefaultExternalFilters
          accentColor={brandColors.primary}
          filters={deliveryFilters}
          getOptionsForColumn={getExternalFilterOptions}
          onChangeFilters={setDeliveryFilters}
          storeName="delivery_orders"
        />

        <View style={styles.tableWrap}>
          <DefaultTable
            accentColor={brandColors.primary}
            add={false}
            onDataLoaded={setLoadedDeliveryQueueItems}
            onRowPress={openOrder}
            requestParams={deliveryRequestParams}
            renderCard={renderCard}
            searchProps={{
              placeholder:
                global.t?.t('orders', 'placeholder', 'search_default') ||
                'Buscar pedido, cliente ou recebedor',
            }}
            showRowActions={false}
            sort={deliverySort}
            storeName="delivery_orders"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
