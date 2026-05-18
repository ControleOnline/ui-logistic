import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
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
import {getOrderChannelLabel, getOrderChannelLogo} from '@assets/ppc/channels';
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
import ContextHelpButton from '@controleonline/ui-common/src/react/components/ContextHelpButton';
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

const resolveProviderLabel = quote => {
  const explicitLabel = normalizeDisplayText(quote?.providerLabel || quote?.provider_label);
  if (explicitLabel) {
    return explicitLabel;
  }

  return (
    normalizeDisplayText(
      getOrderChannelLabel({
        app: quote?.app || quote?.providerKey || quote?.provider_key || quote?.key || '',
      }),
    ) || normalizeDisplayText(quote?.providerKey || quote?.provider_key || quote?.app || 'Integracao')
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

const resolveProviderLogo = quote =>
  getOrderChannelLogo({
    app: quote?.app || quote?.providerLabel || quote?.providerKey || quote?.provider_key || '',
  });

const resolveQuoteStatusLabel = quote => {
  const rawStatus =
    quote?.status?.status ||
    quote?.status?.realStatus ||
    quote?.status?.name ||
    quote?.quoteStateLabel ||
    quote?.quoteState ||
    '';

  const normalized = normalizeText(rawStatus);
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return 'Pendente';
  }

  if (['closed', 'fechado'].includes(lower)) {
    return 'Fechado';
  }

  if (['selected', 'requested'].includes(lower)) {
    return 'Solicitada';
  }

  if (['ready'].includes(lower)) {
    return 'Pronta';
  }

  return normalized;
};

const resolveQuoteStatusTone = quote => {
  const lower = resolveQuoteStatusLabel(quote).toLowerCase();

  if (lower.includes('fechado') || lower.includes('solicitad') || lower.includes('pronta')) {
    return 'success';
  }

  if (lower.includes('erro') || lower.includes('indispon')) {
    return 'danger';
  }

  return 'muted';
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

const SectionCard = ({styles, title, subtitle = '', action = null, headerRight = null, children}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {headerRight ? <View style={styles.sectionHeaderAction}>{headerRight}</View> : null}
    </View>

    {action ? <View style={styles.sectionActionRow}>{action}</View> : null}

    <View style={styles.sectionBody}>{children}</View>
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

const CompactInfoChip = ({styles, icon, label, tone = 'default'}) => (
  <View
    style={[
      styles.compactChip,
      tone === 'success' && styles.compactChipSuccess,
      tone === 'danger' && styles.compactChipDanger,
      tone === 'muted' && styles.compactChipMuted,
    ]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={12}
      color={
        tone === 'success'
          ? '#16A34A'
          : tone === 'danger'
            ? '#DC2626'
            : tone === 'muted'
              ? '#64748B'
              : '#0284C7'
      }
    />
    <Text
      style={[
        styles.compactChipText,
        tone === 'success' && styles.compactChipTextSuccess,
        tone === 'danger' && styles.compactChipTextDanger,
        tone === 'muted' && styles.compactChipTextMuted,
      ]}
    >
      {label}
    </Text>
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

const ProviderBadge = ({styles, quote}) => {
  const logo = resolveProviderLogo(quote);
  const fallback = resolveProviderLabel(quote)
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.providerBadge}>
      {logo ? (
        <Image source={logo} style={styles.providerBadgeImage} resizeMode="contain" />
      ) : (
        <Text style={styles.providerBadgeText}>{fallback || 'GO'}</Text>
      )}
    </View>
  );
};

const QuoteCard = ({
  styles,
  quote,
  onSelect,
  onOpenTracking,
  requestLoading,
  allowSelectionActions = true,
  delivery = null,
}) => {
  const selected = Boolean(quote?.selected);
  const requestable = Boolean(quote?.requestable);
  const available = Boolean(quote?.available);
  const providerLabel = resolveProviderLabel(quote);
  const statusLabel = resolveQuoteStatusLabel(quote);
  const deliveryContact = delivery?.deliveryPeople || quote?.deliveryPeople || quote?.courierContact || null;
  const deliveryName = normalizeText(deliveryContact?.name || '');
  const deliveryPhone = normalizeText(deliveryContact?.phone || '');
  const deliveryStatus = normalizeText(delivery?.status || quote?.quoteStateLabel || '');
  const showDeliveryDetails = Boolean(delivery && (deliveryName || deliveryPhone || deliveryStatus));
  const openTrackingUrl = quote?.trackingUrl || delivery?.trackingUrl || null;
  const showTrackingButton = Boolean(openTrackingUrl);

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
          <View style={styles.quoteBrandRow}>
            <ProviderBadge styles={styles} quote={quote} />
            <View style={styles.quoteBrandTextWrap}>
              <Text style={styles.quoteCardTitle}>{providerLabel || 'Integracao'}</Text>
              <Text style={styles.quoteCardMeta}>
                {normalizeText(quote?.providerKey || quote?.app || 'provider').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <StatusPill
          styles={styles}
          label={statusLabel}
          tone={resolveQuoteStatusTone(quote)}
        />
      </View>

      <View style={styles.quoteCardBody}>
        <View style={styles.quoteInfoRow}>
          <CompactInfoChip styles={styles} icon="cash" label={formatQuotePrice(quote?.price)} />
          {quote?.eta ? (
            <CompactInfoChip styles={styles} icon="clock-outline" label={quote.eta} />
          ) : null}
          {showDeliveryDetails ? (
            <CompactInfoChip
              styles={styles}
              icon="motorbike"
              label={deliveryName || 'Motoboy nao informado'}
              tone="success"
            />
          ) : null}
          {showDeliveryDetails && deliveryPhone ? (
            <CompactInfoChip styles={styles} icon="phone-outline" label={deliveryPhone} />
          ) : null}
          {showDeliveryDetails && deliveryStatus ? (
            <CompactInfoChip
              styles={styles}
              icon="check-circle-outline"
              label={deliveryStatus}
              tone="success"
            />
          ) : null}
        </View>
        {quote?.quoteMessage ? <Text style={styles.quoteMessage}>{quote.quoteMessage}</Text> : null}
      </View>

      <View style={styles.quoteFooter}>
        {showTrackingButton ? (
          <ActionButton
            styles={styles}
            label="Abrir rastreio"
            icon={<MaterialCommunityIcons name="map-marker-path" size={18} color="#0EA5E9" />}
            onPress={() => onOpenTracking?.(openTrackingUrl)}
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
        ) : null}
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

  const isClosedOrder = Boolean(logistics.isClosedOrder);
  const hasDeliveryOrder = Boolean(
    logistics.hasDeliveryOrder ||
      logistics.delivery?.deliveryPeopleId ||
      logistics.delivery?.deliveryPeople?.name ||
      logistics.route?.courierContact?.name,
  );
  const selectedQuote =
    logistics.quotes.find(
      quote => normalizeOrderId(quote.id) === normalizeOrderId(logistics.selection.quoteOrderId),
    ) ||
    logistics.currentIntegration ||
    null;
  const canRequestQuotes = Boolean(logistics.canQuote && !hasDeliveryOrder && !isClosedOrder);
  const quoteActionLabel = logistics.quotes.length > 0 ? 'Atualizar cotações' : 'Solicitar cotações';
  const headerStatusLabel = loadFailed ? 'Falha ao atualizar' : isRefreshing ? 'Atualizando' : isClosedOrder ? 'Fechado' : 'Online';
  const helpMessage = useMemo(
    () =>
      [
        'Cada card representa uma cotacao ou entrega vinculada.',
        'O logo identifica a integracao.',
        'Quando a entrega ja foi definida, motoboy e telefone aparecem no card selecionado.',
      ],
    [],
  );
  const displayQuotes = useMemo(() => {
    if (logistics.quotes.length > 0) {
      return logistics.quotes;
    }

    if (!hasDeliveryOrder) {
      return [];
    }

    const fallbackProviderKey = normalizeText(
      logistics.delivery?.currentIntegrationKey || selectedQuote?.providerKey || order?.app || 'food99',
    );
    const fallbackProviderLabel =
      resolveProviderLabel({
        providerKey: fallbackProviderKey,
        app: logistics.delivery?.currentIntegrationKey || order?.app || '',
        providerLabel: selectedQuote?.providerLabel || '',
      }) || 'Integracao';

    return [
      {
        id:
          selectedQuote?.id ||
          logistics.selection.quoteOrderId ||
          logistics.delivery?.deliveryPeopleId ||
          orderId,
        app: logistics.delivery?.currentIntegrationKey || order?.app || '',
        providerKey: fallbackProviderKey,
        providerLabel: fallbackProviderLabel,
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
          <SectionCard
            styles={pageStyles}
            title="Logística"
            headerRight={
              <View style={pageStyles.sectionHeaderRightGroup}>
                <StatusPill
                  styles={pageStyles}
                  label={headerStatusLabel}
                  tone={loadFailed ? 'danger' : isRefreshing ? 'muted' : isClosedOrder ? 'muted' : 'success'}
                />
                <ContextHelpButton
                  title="Logística"
                  message={helpMessage}
                  accessibilityLabel="Ajuda da logística"
                />
              </View>
            }
            action={
              <View style={pageStyles.sectionActionRow}>
                {canRequestQuotes ? (
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
            }
          >
            <View style={pageStyles.routeGrid}>
              <FieldBlock styles={pageStyles} label="Origem" value={pickupAddressLines} />
              <FieldBlock styles={pageStyles} label="Destino" value={dropoffAddressLines} />
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

            {displayQuotes.length > 0 ? (
              <View style={pageStyles.quoteGrid}>
                {displayQuotes.map((quote, index) => {
                  const selectedById =
                    Boolean(quote?.selected) ||
                    normalizeOrderId(quote.id) ===
                      normalizeOrderId(selectedQuote?.id || logistics.selection.quoteOrderId);
                  const quoteStatusLabel = resolveQuoteStatusLabel(quote);
                  const quoteHasDeliveryDetails = hasDeliveryOrder && (
                    selectedById ||
                    ['fechado', 'closed'].includes(quoteStatusLabel.toLowerCase())
                  );

                  return (
                    <QuoteCard
                      key={`${quote.id || quote.providerKey || 'quote'}-${index}`}
                      styles={pageStyles}
                      quote={quote}
                      delivery={quoteHasDeliveryDetails ? logistics.delivery : null}
                      onSelect={selectQuote}
                      onOpenTracking={handleOpenTracking}
                      requestLoading={requestLoading}
                      allowSelectionActions={!isClosedOrder && !hasDeliveryOrder}
                    />
                  );
                })}
              </View>
            ) : (
              <View style={pageStyles.emptyState}>
                <Text style={pageStyles.emptyStateTitle}>Nenhuma cotacao ainda</Text>
                <Text style={pageStyles.emptyStateText}>
                  {canRequestQuotes
                    ? 'Solicite cotações para exibir as opções vinculadas.'
                    : 'A entrega ainda não possui cotações vinculadas.'}
                </Text>
              </View>
            )}
            </SectionCard>

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
