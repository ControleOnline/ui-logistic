import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import { buildOrderDetailsRouteParams } from '@controleonline/ui-orders/src/react/utils/orderRoute';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './index.styles';

const DELIVERY_ORDER_TYPE = 'delivery';

const normalizeText = value => String(value || '').trim();

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
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const deliveryStore = useStore('delivery_orders');

  const { user, sessionChecked } = authStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};
  const { currentCompany } = peopleStore.getters || {};
  const { getters: deliveryGetters } = deliveryStore;

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

  const primaryColor = brandColors.primary || '#2563EB';
  const hasCurrentCompany = !!currentCompany && Object.keys(currentCompany || {}).length > 0;
  const isBootstrapReady = Boolean(sessionChecked) && hasCurrentCompany && Boolean(themeColors);
  const orderCount = Number(deliveryGetters?.totalItems || deliveryGetters?.items?.length || 0);

  const openOrder = useCallback(
    order => {
      if (!order) return;

      navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
    },
    [navigation],
  );

  const renderCard = useCallback(
    ({ item: order, openRow }) => {
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

  if (!isBootstrapReady) {
    return <StateStore loading="Carregando pedidos de entrega..." />;
  }

  if (!currentPeopleIri) {
    return (
      <StateStore
        error="Nao foi possivel identificar o motoboy logado."
        errorText="Verifique o vinculo `people_link` do tipo `courier` para este usuario."
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: brandColors.background || '#F8FAFC' }]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTag}>Delivery</Text>
              <Text style={styles.heroTitle}>Pedidos atribuidos</Text>
              <Text style={styles.heroSubtitle}>
                A lista vem filtrada pelo `provider` do motoboy logado e pelo tipo `delivery`.
              </Text>
            </View>
            <View
              style={[
                styles.heroCounterPill,
                { borderColor: primaryColor, backgroundColor: `${primaryColor}14` },
              ]}
            >
              <Text style={[styles.heroCounterText, { color: primaryColor }]}>
                {orderCount} pedidos
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tableWrap}>
          <DefaultTable
            accentColor={brandColors.primary}
            add={false}
            forceCardsOnCompact={false}
            onRowPress={openOrder}
            requestParams={{
              orderType: DELIVERY_ORDER_TYPE,
              provider: currentPeopleIri,
            }}
            renderCard={renderCard}
            searchProps={{
              placeholder: 'Buscar pedido, cliente ou recebedor',
            }}
            showRowActions={false}
            sort={{
              direction: 'desc',
              field: 'orderDate',
            }}
            storeName="delivery_orders"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
