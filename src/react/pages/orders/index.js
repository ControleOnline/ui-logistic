import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Platform, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import CompactFilterSelector from '@controleonline/ui-default/src/react/components/filters/CompactFilterSelector';
import DateShortcutFilter from '@controleonline/ui-default/src/react/components/filters/DateShortcutFilter';
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
  dateFilter,
  customRange,
  statusFilter,
}) => {
  if (!currentPeopleIri) {
    return null;
  }

  const query = {
    orderType: DELIVERY_ORDER_TYPE,
    provider: currentPeopleIri,
  };

  if (statusFilter !== 'all') {
    query.status = statusFilter;
  }

  const dateRange = resolveDateRangeFilter({
    shortcut: dateFilter,
    customRange,
  });

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
  const {actions: statusActions, getters: statusGetters} = statusStore;

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

  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customRange, setCustomRange] = useState({from: '', to: ''});
  const [loadedDeliveryQueueItems, setLoadedDeliveryQueueItems] = useState([]);
  const hasCurrentCompany = !!currentCompany && Object.keys(currentCompany || {}).length > 0;
  const isBootstrapReady = Boolean(sessionChecked) && hasCurrentCompany && Boolean(themeColors);

  const statusItems = useMemo(
    () => (Array.isArray(statusGetters.items) ? statusGetters.items : []),
    [statusGetters.items],
  );

  const resolvedStatusOptions = useMemo(() => {
    const allStatusOption = {
      key: 'all',
      label: normalizeText(global.t?.t('orders', 'label', 'all')) || 'Todos',
    };
    const seenKeys = new Set(['all']);
    const mappedStatuses = filterDeliveryStatusItems(statusItems)
      .reduce((accumulator, status) => {
        const key = normalizeText(
          status?.['@id'] || (status?.id ? `/statuses/${status.id}` : ''),
        );

        if (!key || seenKeys.has(key)) {
          return accumulator;
        }

        seenKeys.add(key);
        accumulator.push({
          key,
          label:
            normalizeText(global.t?.t('orders', 'status', status?.status)) ||
            normalizeText(status?.status) ||
            key,
        });
        return accumulator;
      }, []);

    return [allStatusOption, ...mappedStatuses];
  }, [statusItems]);

  const currentStatusLabel = useMemo(
    () =>
      resolvedStatusOptions.find(option => option.key === statusFilter)?.label ||
      resolvedStatusOptions[0]?.label ||
      'Todos',
    [resolvedStatusOptions, statusFilter],
  );

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
        customRange,
        dateFilter,
        statusFilter,
      }),
    [currentPeopleIri, customRange, dateFilter, statusFilter],
  );

  const dateShortcutColors = useMemo(
    () => ({
      accent: brandColors.primary || '#2563EB',
      appBg: 'transparent',
      border: '#CBD5E1',
      borderSoft: '#E2E8F0',
      cardBg: '#FFFFFF',
      cardBgSoft: '#F8FAFC',
      danger: '#DC2626',
      isLight: true,
      panelBg: '#EFF6FF',
      pillTextDark: '#FFFFFF',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
    }),
    [brandColors.primary],
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
    if (!isFocused || !currentCompany?.id || typeof statusActions?.getItems !== 'function') {
      return;
    }

    statusActions.getItems({context: 'delivery'}).catch(() => {});
  }, [
    currentCompany?.id,
    isFocused,
    statusActions,
  ]);

  useEffect(() => {
    if (
      statusFilter !== 'all' &&
      !resolvedStatusOptions.some(option => option.key === statusFilter)
    ) {
      setStatusFilter('all');
    }
  }, [
    resolvedStatusOptions,
    statusFilter,
  ]);

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
        <View style={styles.filtersCard}>
          <View style={styles.filtersHeaderRow}>
            <Text style={styles.filtersTitle}>
              {global.t?.t('orders', 'title', 'filters') || 'Filtros'}
            </Text>
          </View>

          <View style={styles.filterSelectorsRow}>
            <View style={[styles.filterSelectorSlot, styles.filterSelectorSlotHalf]}>
              <CompactFilterSelector
                icon="check-circle"
                label={currentStatusLabel}
                labelCaption={global.t?.t('orders', 'label', 'status') || 'Status'}
                accentColor={brandColors.primary}
                active={statusFilter !== 'all'}
                dense
                title={global.t?.t('orders', 'label', 'status') || 'Status'}
                options={resolvedStatusOptions}
                selectedKey={statusFilter}
                onSelect={optionKey => {
                  setStatusFilter(optionKey);
                  return true;
                }}
              />
            </View>

            <View style={[styles.filterSelectorSlot, styles.filterSelectorSlotHalf]}>
              <DateShortcutFilter
                value={dateFilter}
                onChange={setDateFilter}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                dense
                labelCaption={global.t?.t('orders', 'label', 'period') || 'Periodo'}
                colors={dateShortcutColors}
                optionKeys={['all', 'today', 'yesterday', '7d', '30d', 'custom']}
              />
            </View>
          </View>
        </View>

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
