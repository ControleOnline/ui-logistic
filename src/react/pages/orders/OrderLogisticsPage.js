import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {
  normalizeText as normalizeDisplayText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay';
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
import resolveOrderLogisticsSnapshot from './orderLogisticsPresentation';
import createStyles from './orderLogisticsPage.styles';

const normalizeOrderId = value =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .trim();

const normalizeText = value => String(value ?? '').trim();

const normalizeActionResult = response => {
  if (Array.isArray(response?.member)) {
    return response.member[0] || null;
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'][0] || null;
  }

  if (response?.result && typeof response.result === 'object') {
    return response.result;
  }

  if (response?.data && typeof response.data === 'object') {
    return response.data;
  }

  return response || null;
};

const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a solicitacao.';
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n');
  }

  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    'Nao foi possivel concluir a solicitacao.'
  );
};

const renderAddressLines = parts => {
  if (!parts) {
    return ['Endereco nao informado.'];
  }

  const primary = normalizeDisplayText(parts.primary || parts.streetLine || parts.nickname);
  const secondary = normalizeDisplayText(parts.secondary);
  const complement = normalizeDisplayText(parts.complement);
  const lines = [primary, secondary, complement].filter(Boolean);

  return lines.length ? lines : ['Endereco nao informado.'];
};

const renderContactLines = contact => {
  if (!contact) {
    return ['Contato nao informado.'];
  }

  const lines = [
    normalizeDisplayText(contact.name),
    normalizeDisplayText(contact.phone),
    normalizeDisplayText(contact.email),
  ].filter(Boolean);

  return lines.length ? lines : ['Contato nao informado.'];
};

const formatQuotePrice = price => {
  if (price === null || price === undefined || price === '') {
    return 'Aguardando valor';
  }

  const numeric = Number(price);
  if (!Number.isFinite(numeric)) {
    return 'Aguardando valor';
  }

  return Formatter.formatMoney(numeric);
};

const isRelevantOrdersMessage = (message, orderId, companyId) => {
  if (!message || normalizeText(message.store) !== 'orders') {
    return false;
  }

  const messageCompanyId = normalizeText(message.company?.id || message.companyId || message.company);
  if (companyId && messageCompanyId && messageCompanyId !== companyId) {
    return false;
  }

  const messageOrderId = normalizeOrderId(message.order ?? message.orderId ?? message.order_id);
  const messageMainOrderId = normalizeOrderId(
    message.mainOrderId ?? message.main_order_id ?? message.mainorderid,
  );

  return messageOrderId === orderId || messageMainOrderId === orderId;
};

const SectionCard = ({styles, title, subtitle = '', action = null, children}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>

    {action ? <View style={styles.sectionActionRow}>{action}</View> : null}

    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const FieldBlock = ({styles, label, value}) => (
  <View style={styles.sectionField}>
    <Text style={styles.sectionLabel}>{label}</Text>
    {Array.isArray(value) ? (
      value.map(line => (
        <Text key={`${label}-${line}`} style={styles.sectionValue}>
          {line}
        </Text>
      ))
    ) : (
      <Text style={styles.sectionValue}>{value}</Text>
    )}
  </View>
);

const StatusPill = ({styles, label, tone = 'default'}) => (
  <View
    style={[
      styles.statusPill,
      tone === 'muted' && styles.statusPillMuted,
      tone === 'success' && styles.statusPillSuccess,
      tone === 'danger' && styles.statusPillDanger,
    ]}
  >
    <Text
      style={[
        styles.statusPillText,
        tone === 'muted' && styles.statusPillTextMuted,
        tone === 'success' && styles.statusPillTextSuccess,
        tone === 'danger' && styles.statusPillTextDanger,
      ]}
    >
      {label}
    </Text>
  </View>
);

const ActionButton = ({
  styles,
  label,
  icon = null,
  onPress,
  disabled = false,
  primary = false,
  secondary = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.actionButton,
      primary && styles.actionButtonPrimary,
      secondary && styles.actionButtonSecondary,
      disabled && styles.actionButtonDisabled,
    ]}
  >
    {icon ? icon : null}
    <Text
      style={[
        styles.actionButtonText,
        primary && styles.actionButtonTextPrimary,
        secondary && styles.actionButtonTextSecondary,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const QuoteCard = ({
  styles,
  quote,
  onSelect,
  onOpenTracking,
  requestLoading,
  allowSelectionActions = true,
}) => {
  const selected = Boolean(quote?.selected);
  const requestable = Boolean(quote?.requestable);
  const available = Boolean(quote?.available);

  return (
    <View
      style={[
        styles.quoteCard,
        selected && styles.quoteCardSelected,
        !available && styles.quoteCardUnavailable,
      ]}
    >
      <View style={styles.quoteCardHeader}>
        <View style={styles.quoteCardTitleWrap}>
          <Text style={styles.quoteCardTitle}>{quote?.providerLabel || 'Integracao'}</Text>
          <Text style={styles.quoteCardMeta}>
            {normalizeText(quote?.providerKey || quote?.app || 'provider').toUpperCase()}
          </Text>
        </View>

        <StatusPill
          styles={styles}
          label={quote?.quoteStateLabel || 'Aguardando cotacao'}
          tone={
            selected || quote?.quoteState === 'closed'
              ? 'success'
              : quote?.quoteState === 'error'
                ? 'danger'
                : quote?.quoteState === 'unavailable'
                  ? 'muted'
                  : 'default'
          }
        />
      </View>

      <View style={styles.quoteCardBody}>
        <Text style={styles.quotePrice}>{formatQuotePrice(quote?.price)}</Text>
        {quote?.eta ? <Text style={styles.quoteEta}>{quote.eta}</Text> : null}
        {quote?.summary ? <Text style={styles.quoteSummary}>{quote.summary}</Text> : null}
        {quote?.quoteMessage ? <Text style={styles.quoteMessage}>{quote.quoteMessage}</Text> : null}
      </View>

      <View style={styles.quoteFooter}>
        {quote?.trackingUrl ? (
          <ActionButton
            styles={styles}
            label="Abrir rastreio"
            icon={<MaterialCommunityIcons name="map-marker-path" size={18} color="#0EA5E9" />}
            onPress={() => onOpenTracking?.(quote.trackingUrl)}
            disabled={requestLoading}
            secondary
          />
        ) : null}

        {requestable && allowSelectionActions ? (
          <ActionButton
            styles={styles}
            label={selected ? 'Selecionada' : 'Escolher cotacao'}
            icon={<MaterialCommunityIcons name="truck-fast-outline" size={18} color="#FFFFFF" />}
            onPress={() => onSelect?.(quote)}
            disabled={requestLoading || selected}
            primary
          />
        ) : (
          <StatusPill
            styles={styles}
            label={selected ? 'Cotacao selecionada' : quote?.quoteStateLabel || 'Pendente'}
            tone={selected || quote?.quoteState === 'closed' ? 'success' : 'muted'}
          />
        )}
      </View>
    </View>
  );
};

const OrderLogisticsPage = ({navigation, route}) => {
  const {showError, showSuccess} = useMessage() || {};
  const {ppcColors} = useOrderDetailsVisuals();
  const pageStyles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const insets = useSafeAreaInsets();
  const ordersStore = useStore('orders');
  const websocketStore = useStore('websocket');
  const peopleStore = useStore('people');
  const ordersActions = ordersStore.actions;
  const routeOrder = route?.params?.order || null;
  const order = ordersStore.getters.item || routeOrder;
  const orderId = useMemo(
    () => normalizeOrderId(route?.params?.id || order?.id),
    [order?.id, route?.params?.id],
  );
  const websocketMessages = Array.isArray(websocketStore.getters.messages)
    ? websocketStore.getters.messages
    : [];
  const currentCompanyId = normalizeText(peopleStore.getters.currentCompany?.id);
  const [payload, setPayload] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const lastProcessedMessageCountRef = useRef(websocketMessages.length);

  const orderHeaderOrder = useMemo(
    () =>
      order
        ? {
            ...order,
            status: {
              ...(order?.status || {}),
              color: normalizeText(order?.status?.color) || '#0EA5E9',
            },
          }
        : null,
    [order],
  );

  const refreshOrder = useCallback(async () => {
    if (!orderId || typeof ordersActions?.get !== 'function') {
      return null;
    }

    return ordersActions.get(orderId);
  }, [orderId, ordersActions]);

  const refreshLogistics = useCallback(async () => {
    if (!orderId) {
      return null;
    }

    const response = await api.fetch(`/marketplace/logistics/orders/${orderId}`, {
      method: 'GET',
    });
    const normalized = normalizeActionResult(response);
    setPayload(normalized);
    return normalized;
  }, [orderId]);

  const loadPageData = useCallback(async () => {
    if (!orderId) {
      return null;
    }

    const [, logisticsResponse] = await Promise.all([refreshOrder(), refreshLogistics()]);
    return logisticsResponse;
  }, [orderId, refreshLogistics, refreshOrder]);

  const refreshAll = useCallback(async () => {
    if (!orderId) {
      return;
    }

    setIsRefreshing(true);
    setLoadFailed(false);

    try {
      await loadPageData();
    } catch (error) {
      setLoadFailed(true);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPageData, orderId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!orderId) {
        return () => {
          active = false;
        };
      }

      setIsRefreshing(true);
      setLoadFailed(false);

      loadPageData()
        .catch(() => {
          if (active) {
            setLoadFailed(true);
          }
        })
        .finally(() => {
          if (active) {
            setIsRefreshing(false);
          }
        });

      return () => {
        active = false;
      };
    }, [loadPageData, orderId]),
  );

  useEffect(() => {
    if (!orderId || websocketMessages.length <= lastProcessedMessageCountRef.current) {
      return;
    }

    const newMessages = websocketMessages.slice(lastProcessedMessageCountRef.current);
    lastProcessedMessageCountRef.current = websocketMessages.length;

    if (
      newMessages.some(message => isRelevantOrdersMessage(message, orderId, currentCompanyId))
    ) {
      refreshAll().catch(() => {});
    }
  }, [currentCompanyId, orderId, refreshAll, websocketMessages]);

  const logistics = useMemo(
    () => resolveOrderLogisticsSnapshot({order, ...(payload || {})}),
    [order, payload],
  );

  const pickupAddressLines = useMemo(
    () => renderAddressLines(logistics.pickupAddressParts),
    [logistics.pickupAddressParts],
  );
  const dropoffAddressLines = useMemo(
    () => renderAddressLines(logistics.dropoffAddressParts),
    [logistics.dropoffAddressParts],
  );
  const pickupContactLines = useMemo(
    () => renderContactLines(logistics.pickupContact),
    [logistics.pickupContact],
  );
  const dropoffContactLines = useMemo(
    () => renderContactLines(logistics.dropoffContact),
    [logistics.dropoffContact],
  );
  const courierContactLines = useMemo(
    () => renderContactLines(logistics.delivery?.deliveryPeople || logistics.route?.courierContact),
    [logistics.delivery?.deliveryPeople, logistics.route?.courierContact],
  );
  const hasCourierContact = courierContactLines.some(line => line !== 'Contato nao informado.');

  const hasDeliveryOrder = Boolean(
    logistics.hasDeliveryOrder ||
      logistics.delivery?.deliveryPeopleId ||
      logistics.delivery?.deliveryPeople?.name ||
      logistics.route?.courierContact?.name,
  );
  const isClosedOrder = Boolean(logistics.isClosedOrder);
  const showIntegrationSection = logistics.showIntegrationSection ?? !isClosedOrder;
  const hasQuoteEntries = Boolean(
    logistics.quotes.length > 0 ||
      logistics.currentIntegration ||
      logistics.selection?.quoteOrderId,
  );
  const showRequestActions = showIntegrationSection && logistics.canQuote && !hasDeliveryOrder;
  const showQuoteSection = hasQuoteEntries || (!isClosedOrder && !hasDeliveryOrder);
  const quoteSummary = logistics.quoteStatus || {};
  const selectedQuote =
    logistics.quotes.find(
      quote => normalizeOrderId(quote.id) === normalizeOrderId(logistics.selection.quoteOrderId),
    ) ||
    logistics.currentIntegration ||
    null;

  const quoteActionLabel = logistics.quotes.length > 0 ? 'Atualizar cotações' : 'Solicitar cotações';
  const heroTitle = hasDeliveryOrder ? 'Entrega definida' : 'Cotações logísticas';
  const heroSubtitle = hasDeliveryOrder
    ? 'A entrega já foi vinculada ao pedido pela integracao. A tela mostra apenas os dados pertinentes.'
    : 'O backend cria uma ordem filha por integracao conectada da empresa. A tela mostra apenas o que foi realmente cotado.';
  const summaryCards = hasDeliveryOrder
    ? [
        {
          label: 'Pedido',
          value: normalizeText(order?.id || orderId || '--'),
        },
        {
          label: 'Integracoes',
          value: `${quoteSummary.providers || 0} conectadas`,
        },
        {
          label: 'Entrega',
          value: normalizeText(logistics.delivery?.status || 'Entrega definida'),
        },
        {
          label: 'Motoboy',
          value: courierContactLines.length > 0 ? courierContactLines : ['Motoboy nao informado.'],
        },
      ]
    : [
        {
          label: 'Pedido',
          value: normalizeText(order?.id || orderId || '--'),
        },
        {
          label: 'Integracoes',
          value: `${quoteSummary.providers || 0} conectadas`,
        },
        {
          label: 'Cotações',
          value: `${quoteSummary.quotes || logistics.quotes.length || 0}`,
        },
        {
          label: 'Selecionada',
          value: selectedQuote?.providerLabel || logistics.selection.providerKey || 'Nenhuma',
        },
      ];

  const requestQuotes = useCallback(async () => {
    if (!orderId) {
      return;
    }

    try {
      setRequestLoading(true);
      const response = await api.fetch(`/marketplace/logistics/orders/${orderId}/quote`, {
        method: 'POST',
      });
      const result = normalizeActionResult(response);
      if (String(result?.errno ?? '0') !== '0') {
        throw result || response;
      }

      await refreshAll();
      showSuccess?.('Cotacoes solicitadas com sucesso.');
    } catch (error) {
      showError?.(formatApiError(error));
    } finally {
      setRequestLoading(false);
    }
  }, [orderId, refreshAll, showError, showSuccess]);

  const selectQuote = useCallback(
    async quote => {
      if (!orderId || !quote?.id) {
        return;
      }

      try {
        setRequestLoading(true);
        const response = await api.fetch(
          `/marketplace/logistics/orders/${orderId}/quotes/${quote.id}/select`,
          {
            method: 'POST',
          },
        );
        const result = normalizeActionResult(response);
        if (String(result?.errno ?? '0') !== '0') {
          throw result || response;
        }

        await refreshAll();
        showSuccess?.('Entrega solicitada com sucesso.');
      } catch (error) {
        showError?.(formatApiError(error));
      } finally {
        setRequestLoading(false);
      }
    },
    [orderId, refreshAll, showError, showSuccess],
  );

  const handleOpenTracking = useCallback(
    async url => {
      if (!url) {
        return;
      }

      try {
        await Linking.openURL(url);
      } catch {
        showError?.('Nao foi possivel abrir o rastreio.');
      }
    },
    [showError],
  );

  const enabledProviders = logistics.providers.filter(provider => provider?.connected);
  const showEmptyState = logistics.quotes.length === 0;

  return (
    <SafeAreaView style={pageStyles.pageRoot} edges={['bottom']}>
      <OrderStackedTopBar
        navigation={navigation}
        order={orderHeaderOrder}
        isKds
        showActions={false}
      />

      <ScrollView
        style={pageStyles.pageScroll}
        contentContainerStyle={[
          pageStyles.pageScrollContent,
          {paddingBottom: 24 + (insets.bottom || 0)},
        ]}
      >
        <View style={pageStyles.topBarWrap}>
          {showIntegrationSection ? (
            <View style={pageStyles.heroCard}>
              <View style={pageStyles.heroHeaderRow}>
                <View style={pageStyles.heroTextWrap}>
                  <Text style={pageStyles.heroTitle}>{heroTitle}</Text>
                  <Text style={pageStyles.heroSubtitle}>{heroSubtitle}</Text>
                </View>

                <StatusPill
                  styles={pageStyles}
                  label={loadFailed ? 'Falha ao atualizar' : isRefreshing ? 'Atualizando' : 'Online'}
                  tone={loadFailed ? 'danger' : isRefreshing ? 'muted' : 'success'}
                />
              </View>

              <View style={pageStyles.summaryGrid}>
                {summaryCards.map(card => (
                  <FieldBlock
                    key={card.label}
                    styles={pageStyles}
                    label={card.label}
                    value={card.value}
                  />
                ))}
              </View>

              <View style={pageStyles.sectionActionRow}>
                {showRequestActions ? (
                  <ActionButton
                    styles={pageStyles}
                    label={quoteActionLabel}
                    icon={<MaterialCommunityIcons name="sync" size={18} color="#FFFFFF" />}
                    onPress={requestQuotes}
                    disabled={!orderId || requestLoading}
                    primary
                  />
                ) : null}
                <ActionButton
                  styles={pageStyles}
                  label="Atualizar tela"
                  icon={<MaterialCommunityIcons name="reload" size={18} color="#0EA5E9" />}
                  onPress={refreshAll}
                  disabled={isRefreshing || requestLoading}
                  secondary
                />
              </View>

              {showRequestActions && enabledProviders.length > 0 ? (
                <View style={pageStyles.providerChipRow}>
                  {enabledProviders.map(provider => (
                    <View key={provider.key} style={pageStyles.providerChip}>
                      <Text style={pageStyles.providerChipText}>
                        {provider.label}
                        {provider.online === false
                          ? ' • offline'
                          : provider.online === true
                            ? ' • online'
                            : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <SectionCard
            styles={pageStyles}
            title="Rota"
            subtitle="Coleta da empresa e entrega do pedido principal."
          >
            <View style={pageStyles.routeGrid}>
              <FieldBlock
                styles={pageStyles}
                label="Coleta"
                value={pickupAddressLines}
              />
              <FieldBlock
                styles={pageStyles}
                label="Entrega"
                value={dropoffAddressLines}
              />
            </View>

            <View style={pageStyles.routeGrid}>
              <FieldBlock
                styles={pageStyles}
                label="Contato da coleta"
                value={pickupContactLines}
              />
              <FieldBlock
                styles={pageStyles}
                label="Contato da entrega"
                value={dropoffContactLines}
              />
            </View>

            {hasCourierContact ? (
              <View style={pageStyles.routeGrid}>
                <FieldBlock
                  styles={pageStyles}
                  label="Entregador"
                  value={courierContactLines}
                />
                <FieldBlock
                  styles={pageStyles}
                  label="Status da entrega"
                  value={normalizeText(logistics.delivery?.status || 'Entrega definida')}
                />
              </View>
            ) : null}
          </SectionCard>

          {hasDeliveryOrder ? (
            <SectionCard
              styles={pageStyles}
              title="Entrega definida"
              subtitle="Entrega gerenciada pela 99 Food."
            >
              <View style={pageStyles.routeGrid}>
                <FieldBlock
                  styles={pageStyles}
                  label="Motoboy"
                  value={courierContactLines}
                />
                <FieldBlock
                  styles={pageStyles}
                  label="Status"
                  value={normalizeText(logistics.delivery?.status || 'Entrega definida')}
                />
              </View>

              <View style={pageStyles.routeGrid}>
                <FieldBlock
                  styles={pageStyles}
                  label="Contato do motoboy"
                  value={courierContactLines}
                />
                <FieldBlock
                  styles={pageStyles}
                  label="Integracao"
                  value={normalizeText(logistics.delivery?.currentIntegrationKey || order?.app || '99 Food')}
                />
              </View>

              {logistics.delivery?.trackingUrl ? (
                <ActionButton
                  styles={pageStyles}
                  label="Abrir rastreio"
                  icon={<MaterialCommunityIcons name="map-marker-path" size={18} color="#0EA5E9" />}
                  onPress={() => handleOpenTracking(logistics.delivery.trackingUrl)}
                  secondary
                />
              ) : null}
            </SectionCard>
          ) : selectedQuote ? (
            <SectionCard
              styles={pageStyles}
              title="Cotação selecionada"
              subtitle="O provider escolhido já foi convertido para entrega real."
            >
              <View style={pageStyles.selectionPanel}>
                <View style={pageStyles.selectionPanelHeader}>
                  <View style={pageStyles.selectionPanelTitleWrap}>
                    <Text style={pageStyles.selectionPanelTitle}>
                      {selectedQuote.providerLabel || 'Provider'}
                    </Text>
                    <Text style={pageStyles.selectionPanelSubtitle}>
                      {selectedQuote.quoteStateLabel || 'Selecionada'}
                    </Text>
                  </View>
                  <StatusPill styles={pageStyles} label="Selecionada" tone="success" />
                </View>

                <Text style={pageStyles.quotePrice}>{formatQuotePrice(selectedQuote.price)}</Text>
                {selectedQuote.eta ? <Text style={pageStyles.quoteEta}>{selectedQuote.eta}</Text> : null}
                {selectedQuote.trackingUrl ? (
                  <ActionButton
                    styles={pageStyles}
                    label="Abrir rastreio"
                    icon={<MaterialCommunityIcons name="map-marker-path" size={18} color="#0EA5E9" />}
                    onPress={() => handleOpenTracking(selectedQuote.trackingUrl)}
                    secondary
                  />
                ) : null}
              </View>
            </SectionCard>
          ) : null}

          {showQuoteSection ? (
            <SectionCard
              styles={pageStyles}
              title="Cotações"
              subtitle="Cada card abaixo é uma ordem delivery filha vinculada ao pedido principal."
            >
              {showEmptyState ? (
                <View style={pageStyles.emptyState}>
                  <Text style={pageStyles.emptyStateTitle}>Nenhuma cotacao ainda</Text>
                    <Text style={pageStyles.emptyStateText}>
                      Toque em solicitar cotações para disparar iFood, Uber e 99 Food conectados na
                      empresa.
                    </Text>
                  {enabledProviders.length > 0 ? (
                    <Text style={pageStyles.emptyStateText}>
                      Integracoes disponiveis: {enabledProviders.map(item => item.label).join(', ')}.
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={pageStyles.quoteGrid}>
                  {logistics.quotes.map(quote => (
                    <QuoteCard
                      key={quote.id}
                      styles={pageStyles}
                      quote={quote}
                      onSelect={selectQuote}
                      onOpenTracking={handleOpenTracking}
                      requestLoading={requestLoading}
                      allowSelectionActions={!isClosedOrder && !hasDeliveryOrder}
                    />
                  ))}
                </View>
              )}
            </SectionCard>
          ) : null}

          {loadFailed ? (
            <View style={pageStyles.errorBanner}>
              <Text style={pageStyles.errorText}>
                Nao foi possivel atualizar as cotacoes. Tente novamente.
              </Text>
            </View>
          ) : null}

          {isRefreshing ? (
            <View style={pageStyles.loadingWrap}>
              <ActivityIndicator color="#0EA5E9" />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderLogisticsPage;
