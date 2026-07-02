import React, {useEffect, useMemo, useState} from 'react';
import {Text, View} from 'react-native';
import {api} from '@controleonline/ui-common/src/api';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
import resolveOrderLogisticsSnapshot from './orderLogisticsPresentation';
import createStyles from './orderLogisticsPage.styles';
import {
  buildOrderLogisticsSnapshotSource,
  formatApiError,
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
  refreshKey = 0,
  onSelectQuote = null,
  requestLoading = false,
}) {
  const {showError} = useMessage() || {};
  const {ppcColors} = useOrderDetailsVisuals();
  const pageStyles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    if (!orderId) {
      setPayload(null);
      setLoadFailed(false);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setLoadFailed(false);

    api
      .fetch(`/marketplace/logistics/orders/${orderId}`, {
        method: 'GET',
      })
      .then(response => {
        if (!active) {
          return null;
        }

        const normalized = Array.isArray(response?.member)
          ? response.member[0] || null
          : Array.isArray(response?.['hydra:member'])
            ? response['hydra:member'][0] || null
            : response?.result && typeof response.result === 'object'
              ? response.result
              : response?.data && typeof response.data === 'object'
                ? response.data
                : response || null;

        setPayload(normalized);
        return normalized;
      })
      .catch(error => {
        if (!active) {
          return null;
        }

        setPayload(null);
        setLoadFailed(true);
        showError?.(formatApiError(error));
        return null;
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [orderId, refreshKey, showError]);

  const logistics = useMemo(
    () => resolveOrderLogisticsSnapshot(buildOrderLogisticsSnapshotSource(order, payload)),
    [order, payload],
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
    return <StateStore error="Pedido nao informado." />;
  }

  if (isLoading) {
    return <StateStore loading="Carregando cotações..." />;
  }

  if (loadFailed) {
    return <StateStore error="Nao foi possivel carregar as cotações." />;
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
