import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import DefaultErrors from '@controleonline/ui-default/src/react/components/errors/DefaultErrors';
import resolveSystemErrorMessage from '@controleonline/ui-common/src/react/utils/systemErrorMessage';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
import resolveOrderLogisticsSnapshot from './orderLogisticsPresentation';
import createStyles from './orderLogisticsPage.styles';
import {
  buildOrderLogisticsSnapshotSource,
  QuoteCard,
} from './OrderLogisticsPage';

const normalizeText = value => String(value ?? '').trim();
const normalizeOrderId = value =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .trim();

const sortBySelection = quotes =>
  Array.isArray(quotes)
    ? [...quotes].sort((left, right) => {
        const leftSelected = Boolean(left?.selected);
        const rightSelected = Boolean(right?.selected);

        if (leftSelected !== rightSelected) {
          return leftSelected ? -1 : 1;
        }

        const leftPrice = Number(left?.price);
        const rightPrice = Number(right?.price);

        if (Number.isFinite(leftPrice) && Number.isFinite(rightPrice) && leftPrice !== rightPrice) {
          return leftPrice - rightPrice;
        }

        return normalizeOrderId(left?.id).localeCompare(normalizeOrderId(right?.id));
      })
    : [];

export default function OrderLogisticsQuotesList({
  orderId,
  order,
  onSelectQuote = null,
  requestLoading = false,
}) {
  const orderLogisticsStore = useStore('order_logistics');
  const logisticsItem = orderLogisticsStore?.getters?.item || null;
  const isLoading = Boolean(orderLogisticsStore?.getters?.isLoading);
  const loadError = resolveSystemErrorMessage(orderLogisticsStore?.getters?.error);
  const {ppcColors} = useOrderDetailsVisuals();
  const pageStyles = useMemo(() => createStyles(ppcColors), [ppcColors]);

  const logistics = useMemo(
    () => resolveOrderLogisticsSnapshot(buildOrderLogisticsSnapshotSource(order, logisticsItem)),
    [order, logisticsItem],
  );

  const selectedQuote =
    logistics.quotes.find(
      quote => normalizeOrderId(quote.id) === normalizeOrderId(logistics.selection.quoteOrderId),
    ) ||
    logistics.currentIntegration ||
    null;
  const hasDeliveryOrder = Boolean(
    logistics.hasDeliveryOrder ||
      logistics.delivery?.deliveryPeopleId ||
      logistics.delivery?.deliveryPeople?.name ||
      logistics.route?.courierContact?.name,
  );
  const displayQuotes = useMemo(() => {
    if (logistics.quotes.length > 0) {
      return sortBySelection(logistics.quotes);
    }

    if (!hasDeliveryOrder) {
      return [];
    }

    const fallbackProviderKey = normalizeText(
      logistics.delivery?.currentIntegrationKey || selectedQuote?.providerKey || order?.app || 'food99',
    );

    return [
      {
        id:
          selectedQuote?.id ||
          logistics.selection.quoteOrderId ||
          logistics.delivery?.deliveryPeopleId ||
          orderId,
        app: logistics.delivery?.currentIntegrationKey || order?.app || '',
        providerKey: fallbackProviderKey,
        providerLabel: selectedQuote?.providerLabel || fallbackProviderKey || 'Integracao',
        price: selectedQuote?.price ?? logistics.selection.price ?? null,
        eta: selectedQuote?.eta || '',
        quoteState: selectedQuote?.quoteState || 'selected',
        quoteStateLabel:
          selectedQuote?.quoteStateLabel ||
          normalizeText(logistics.delivery?.status || 'Entrega definida'),
        quoteMessage: selectedQuote?.quoteMessage || '',
        summary:
          selectedQuote?.summary || normalizeText(logistics.delivery?.status || 'Entrega definida'),
        trackingUrl: selectedQuote?.trackingUrl || logistics.delivery?.trackingUrl || null,
        selected: true,
        available: true,
        requestable: false,
        deliveryPeople: logistics.delivery?.deliveryPeople || null,
      },
    ];
  }, [
    hasDeliveryOrder,
    logistics.delivery,
    logistics.quotes,
    logistics.selection.price,
    logistics.selection.quoteOrderId,
    order?.app,
    orderId,
    selectedQuote,
  ]);

  if (!orderId) {
    return <DefaultErrors compact title="Pedido nao informado." />;
  }

  if (isLoading && !logisticsItem) {
    return <StateStore mode="compact" loading="Carregando cotações..." />;
  }

  if (loadError && !logisticsItem) {
    return (
      <DefaultErrors
        compact
        error={loadError}
        title="Nao foi possivel carregar as cotações."
      />
    );
  }

  if (displayQuotes.length === 0) {
    return (
      <View style={pageStyles.emptyState}>
        <Text style={pageStyles.emptyStateTitle}>Nenhuma cotacao ainda</Text>
        <Text style={pageStyles.emptyStateText}>
          {!logistics.dropoffAddressParts
            ? 'Informe um endereço de entrega válido para solicitar cotações.'
            : 'Solicite cotações para exibir as opções vinculadas.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={pageStyles.quoteGrid}>
      {displayQuotes.map((quote, index) => {
        const selectedById =
          Boolean(quote?.selected) ||
          normalizeOrderId(quote.id) === normalizeOrderId(selectedQuote?.id || logistics.selection.quoteOrderId);
        const quoteStatusLabel = normalizeText(quote?.quoteStateLabel || quote?.status?.status || '');
        const quoteHasDeliveryDetails =
          hasDeliveryOrder &&
          (selectedById || ['fechado', 'closed'].includes(quoteStatusLabel.toLowerCase()));
        const allowSelectionActions = !logistics.isClosedOrder && !hasDeliveryOrder;

        return (
          <QuoteCard
            key={`${quote.id || quote.providerKey || 'quote'}-${index}`}
            styles={pageStyles}
            quote={quote}
            delivery={quoteHasDeliveryDetails ? logistics.delivery : null}
            onSelect={onSelectQuote}
            ppcColors={ppcColors}
            requestLoading={requestLoading}
            allowSelectionActions={allowSelectionActions}
          />
        );
      })}
    </View>
  );
}
