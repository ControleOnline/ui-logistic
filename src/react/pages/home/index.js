/* eslint-disable no-unused-vars */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import {useStore} from '@store';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {buildOrderDetailsRouteParams} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {getDateRange} from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import styles from './index.styles';

const PAGE_SIZE = 50;
const DELIVERY_ORDER_TYPE = 'delivery';

const normalizeText = value => String(value || '').trim();

const normalizeEntityId = value => {
  if (value && typeof value === 'object') {
    return normalizeEntityId(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value).replace(/\D+/g, '');
};

const normalizeFilterValue = value => {
  if (value && typeof value === 'object') {
    return normalizeFilterValue(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value);
};

const resolveDateRangeFilter = value => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const shortcut = value.shortcut || value.value || 'all';
  const customRange = value.customRange || { from: '', to: '' };
  const dateRange = getDateRange(shortcut, customRange, {
    relativeMode: 'rolling',
    useCurrentMoment: true,
  });

  return {
    after: dateRange?.after || '',
    before: dateRange?.before || '',
  };
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

export default function DeliveryHomePage({navigation}) {
  const isFocused = useIsFocused();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const deliveryStore = useStore('delivery_orders');
  const ordersStore = useStore('orders');

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {actions: deliveryActions, getters: deliveryGetters} = deliveryStore;
  const {actions: orderActions} = ordersStore;
  const {
    columns,
    items: storedOrders,
    totalItems: storedTotalItems,
    isLoadingList,
    loadedKey,
  } = deliveryGetters;
  const currentPeopleId = useMemo(
    () => normalizeEntityId(user?.people ?? user?.peopleId ?? ''),
    [user?.people, user?.peopleId],
  );
  const currentPeopleIri = currentPeopleId ? `/people/${currentPeopleId}` : '';

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [currentCompany?.id, themeColors],
  );

  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [tableFilters, setTableFilters] = useState({});
  const [sortState, setSortState] = useState({
    field: 'orderDate',
    direction: 'desc',
  });
  const fetchingRef = useRef(false);
  const requestedKeyRef = useRef('');

  const historyQuery = useMemo(() => {
    const query = {
      itemsPerPage: PAGE_SIZE,
    };

    const currentSort =
      sortState?.field && sortState?.direction
        ? sortState
        : { field: 'orderDate', direction: 'desc' };

    query[`order[${currentSort.field}]`] = currentSort.direction;

    if (searchText) {
      query.search = searchText.replace(/^#/, '');
    }

    Object.entries(tableFilters || {}).forEach(([key, value]) => {
      if (!key) {
        return;
      }

      if (key === 'search') {
        const normalizedSearch = normalizeText(value);
        if (normalizedSearch) {
          query.search = normalizedSearch.replace(/^#/, '');
        }
        return;
      }

      if (key === 'orderDate' || key === 'alterDate') {
        const dateRange = resolveDateRangeFilter(value);
        if (dateRange.after) {
          query[`${key}[after]`] = dateRange.after;
        }
        if (dateRange.before) {
          query[`${key}[before]`] = dateRange.before;
        }
        return;
      }

      if (Array.isArray(value)) {
        const nextValues = value.map(normalizeFilterValue).filter(Boolean);
        if (nextValues.length > 0) {
          query[key] = nextValues;
        }
        return;
      }

      const normalizedValue = normalizeFilterValue(value);
      if (normalizedValue) {
        query[key] = normalizedValue;
      }
    });

    if (currentPeopleIri) {
      query.provider = currentPeopleIri;
    }

    query.orderType = DELIVERY_ORDER_TYPE;

    return query;
  }, [currentPeopleIri, searchText, sortState, tableFilters]);

  const historyLoadedKey = useMemo(
    () => JSON.stringify(historyQuery || {}),
    [historyQuery],
  );

  const orders = Array.isArray(storedOrders) ? storedOrders : [];
  const totalOrders = Number(storedTotalItems || 0);
  const hasMore = useMemo(() => {
    if (!orders.length) {
      return false;
    }

    if (totalOrders > 0) {
      return orders.length < totalOrders;
    }

    return orders.length % PAGE_SIZE === 0;
  }, [orders.length, totalOrders]);

  const fetchPage = useCallback(
    async (targetPage, replace = false) => {
      if (!currentPeopleIri) {
        return;
      }

      if (fetchingRef.current) {
        return;
      }

      fetchingRef.current = true;
      requestedKeyRef.current = historyLoadedKey;

      try {
        setError('');
        await deliveryActions.fetchHistoryPage({
          query: {
            ...historyQuery,
            page: targetPage,
          },
          append: !replace,
          loadedKey: historyLoadedKey,
        });
      } catch (err) {
        setError(
          err?.message ||
            'Nao foi possivel carregar os pedidos de entrega.',
        );
      } finally {
        fetchingRef.current = false;
        setLoadingMore(false);
      }
    },
    [currentPeopleIri, deliveryActions, historyLoadedKey, historyQuery],
  );

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (!currentPeopleIri) {
      return;
    }

    const hasLoadedSnapshot =
      loadedKey === historyLoadedKey && Array.isArray(storedOrders);

    if (!hasLoadedSnapshot && requestedKeyRef.current !== historyLoadedKey) {
      fetchPage(1, true);
      return;
    }

    setError('');
  }, [currentPeopleIri, fetchPage, historyLoadedKey, isFocused, loadedKey, storedOrders]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || fetchingRef.current) {
      return;
    }

    setLoadingMore(true);
    fetchPage(Math.floor(orders.length / PAGE_SIZE) + 1, false);
  }, [fetchPage, hasMore, loadingMore, orders.length]);

  const openOrder = useCallback(
    order => {
      if (!order) {
        return;
      }

      orderActions.syncOrder?.(order);
      navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
    },
    [navigation, orderActions],
  );

  const renderCard = useCallback(
    ({item: order}) => {
      return (
        <TouchableOpacity
          key={order?.id}
          style={styles.orderCard}
          activeOpacity={0.85}
          onPress={() => openOrder(order)}
        >
          <OrderHeader
            order={order}
            metaText={buildOrderMetaText(order)}
          />
        </TouchableOpacity>
      );
    },
    [openOrder],
  );

  const orderCount = totalOrders > 0 ? totalOrders : orders.length;
  const primaryColor = brandColors.primary || '#2563EB';
  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;
  const isBootstrapReady =
    Boolean(sessionChecked) && hasCurrentCompany && Boolean(themeColors);

  if (!isBootstrapReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
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
      style={[styles.container, {backgroundColor: brandColors.background || '#F8FAFC'}]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTag}>Delivery</Text>
              <Text style={styles.heroTitle}>Pedidos atribuídos</Text>
              <Text style={styles.heroSubtitle}>
                A lista vem filtrada pelo `provider` do motoboy logado e pelo tipo `delivery`.
              </Text>
            </View>
            <View
              style={[
                styles.heroCounterPill,
                {borderColor: primaryColor, backgroundColor: `${primaryColor}14`},
              ]}
            >
              <Text style={[styles.heroCounterText, {color: primaryColor}]}>
                {orderCount} pedidos
              </Text>
            </View>
          </View>
        </View>

        {!isLoadingList && !!error ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateTitle}>Nao foi possivel carregar a lista.</Text>
            <Text style={styles.centerStateText}>{error}</Text>
          </View>
        ) : null}

        {!error ? (
          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor={brandColors.primary}
              columns={columns}
              data={orders}
              hasMore={hasMore}
              initialViewMode="table"
              isLoading={isLoadingList || loadingMore}
              add={false}
              filters={tableFilters}
              onEndReached={loadMore}
              onFilterChange={setTableFilters}
              onRowPress={openOrder}
              renderCard={renderCard}
              searchProps={{
                onSearch: setSearchText,
                placeholder: 'Buscar pedido, cliente ou recebedor',
                value: searchText,
              }}
              onSortChange={setSortState}
              showColumnFiltersButton
              showRowActions={false}
              sort={sortState}
              storeName="delivery_orders"
              totalItems={totalOrders}
              totalItemsLabel="pedidos"
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
