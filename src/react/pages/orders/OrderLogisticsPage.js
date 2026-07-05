/*
 * Contract imported from AGENTS.md
 * ## Escopo
 * - `ui-logistic` e o modulo React de operacao e visualizacao logisticas.
 * - Esta pagina e a referencia ativa de status, roteamento e detalhes operacionais do pedido.
 *
 * ## Estado
 *
 * ## Limites
 * - Consumir o payload materializado do backend como fonte de verdade.
 * - Nao mover a responsabilidade de apresentacao logistica para outro modulo.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import AddCompanyModal from '@controleonline/ui-people/src/react/components/AddCompanyModal';
import resolveSystemErrorMessage from '@controleonline/ui-common/src/react/utils/systemErrorMessage';
import DefaultErrors from '@controleonline/ui-default/src/react/components/errors/DefaultErrors';
import {
  buildAddressOptionSummary,
  buildCustomerSearchMeta,
  createEmptyAddressForm,
  normalizePostalCodeInput,
  resolveAddressDisplayParts,
  normalizeText as normalizeDisplayText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay';
import {normalizeEntityId, toEntityIri} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import {getOrderChannelLabel, getOrderChannelLogo} from '@assets/ppc/channels';
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
import {
  DELIVERY_STATUS_AWAITING_ACCEPTANCE,
  includesDeliveryStatusKey,
  resolveDeliveryRunPlan,
  resolveDeliveryStatusLabel,
  resolveDeliveryStatusTone,
} from '@controleonline/ui-logistic/src/react/utils/deliveryAcceptanceQueue';
import {resolveCurrentPeopleIri} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import ContextHelpButton from '@controleonline/ui-common/src/react/components/ContextHelpButton';
import DefaultMap from '@controleonline/ui-default/src/react/components/map/DefaultMap';
import DeliveryAcceptanceCard from './DeliveryAcceptanceCard';
import DeliveryRouteProgressCard from './DeliveryRouteProgressCard';
import OrderLogisticsQuotesList from './OrderLogisticsQuotesList';
import useDeviceCoordinates from '../../hooks/useDeviceCoordinates';
import resolveOrderLogisticsSnapshot from './orderLogisticsPresentation';
import createStyles from './orderLogisticsPage.styles';

export const buildOrderLogisticsSnapshotSource = (order, payload) => ({
  ...(payload || {}),
  order:
    order && typeof order === 'object'
      ? (
          String(order.orderType || payload?.order?.orderType || '').trim().toLowerCase() === 'delivery'
            ? payload?.order && typeof payload.order === 'object'
              ? {
                  ...payload.order,
                  ...order,
                }
              : order
            : ['sale', 'cart'].includes(
                String(order.orderType || payload?.order?.orderType || '').trim().toLowerCase(),
              )
              ? Array.isArray(order.orderProducts)
                ? order
                : payload?.order || order || null
              : payload?.order || order || null
        )
      : payload?.order || null,
});

const normalizeOrderId = value =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .trim();

const normalizeText = value => String(value ?? '').trim();

const GENERIC_ERROR_MESSAGES = new Set([
  'request failed',
  'failed to fetch',
  'network request failed',
]);

const extractErrorMessage = error => {
  const message = resolveSystemErrorMessage(error);
  if (!message) {
    return '';
  }

  return GENERIC_ERROR_MESSAGES.has(message.toLowerCase()) ? '' : message;
};

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

const extractCollectionItems = response => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.member)) {
    return response.member;
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'];
  }

  return [];
};

export const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a solicitacao.';
  if (typeof error === 'string') return error;
  return extractErrorMessage(error) || 'Nao foi possivel concluir a solicitacao.';
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
  const postalCode = normalizeDisplayText(parts.postalCode);
  const complement = normalizeDisplayText(parts.complement);
  const lines = [primary, secondary, postalCode, complement].filter(Boolean);

  return lines.length ? lines : ['Endereco nao informado.'];
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

const parseConfigObject = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }

    return {};
  }

  return value;
};

const pickFiniteCoordinate = (...candidates) => {
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
};

const extractAddressCoordinates = address => {
  if (!address || typeof address !== 'object') {
    return null;
  }

  const latitude = pickFiniteCoordinate(
    address.latitude,
    address.lat,
    address.coords?.latitude,
    address.coordinates?.latitude,
    address.location?.latitude,
    address.geo?.latitude,
  );
  const longitude = pickFiniteCoordinate(
    address.longitude,
    address.lng,
    address.coords?.longitude,
    address.coordinates?.longitude,
    address.location?.longitude,
    address.geo?.longitude,
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return {latitude, longitude};
};

const buildDeliveryMapMarker = ({id, label, address, addressLines = []}) => {
  const coordinates = extractAddressCoordinates(address);

  if (!coordinates) {
    return null;
  }

  return {
    id,
    companyName: label,
    title: label,
    addressLine: Array.isArray(addressLines) ? String(addressLines[0] || '') : '',
    addressExtra: Array.isArray(addressLines) ? addressLines.slice(1).filter(Boolean).join(' • ') : '',
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
};

const haversineDistanceKm = (from, to) => {
  const fromCoordinates = extractAddressCoordinates(from);
  const toCoordinates = extractAddressCoordinates(to);

  if (!fromCoordinates || !toCoordinates) {
    return null;
  }

  const toRadians = value => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(toCoordinates.latitude - fromCoordinates.latitude);
  const deltaLongitude = toRadians(toCoordinates.longitude - fromCoordinates.longitude);
  const latitude1 = toRadians(fromCoordinates.latitude);
  const latitude2 = toRadians(toCoordinates.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number.isFinite(c) ? earthRadiusKm * c : null;
};

const formatRouteDistanceLabel = distanceKm => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return '';
  }

  return `~ ${Formatter.formatDecimal(distanceKm, 'pt-BR', 1)} km`;
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
      tone === 'warning' && styles.statusPillWarning,
      tone === 'success' && styles.statusPillSuccess,
      tone === 'danger' && styles.statusPillDanger,
    ]}
  >
    <Text
      style={[
        styles.statusPillText,
        tone === 'muted' && styles.statusPillTextMuted,
        tone === 'warning' && styles.statusPillTextWarning,
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
  success = false,
  danger = false,
  style = null,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.actionButton,
      primary && styles.actionButtonPrimary,
      secondary && styles.actionButtonSecondary,
      success && styles.actionButtonSuccess,
      danger && styles.actionButtonDanger,
      disabled && styles.actionButtonDisabled,
      style,
    ]}
  >
    {icon ? icon : null}
    <Text
      style={[
        styles.actionButtonText,
        primary && styles.actionButtonTextPrimary,
        secondary && styles.actionButtonTextSecondary,
        success && styles.actionButtonTextSuccess,
        danger && styles.actionButtonTextDanger,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const CompactInfoChip = ({styles, icon, label, tone = 'default', ppcColors}) => (
  <View
    style={[
      styles.compactChip,
      tone === 'warning' && styles.compactChipWarning,
      tone === 'success' && styles.compactChipSuccess,
      tone === 'danger' && styles.compactChipDanger,
      tone === 'muted' && styles.compactChipMuted,
    ]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={12}
        color={
        tone === 'warning'
          ? styles.iconColorWarning.color
          : tone === 'success'
            ? styles.iconColorSuccess.color
            : tone === 'danger'
              ? styles.iconColorDanger.color
              : tone === 'muted'
                ? ppcColors?.textSecondary
                : ppcColors?.accentInfo
      }
    />
    <Text
      style={[
        styles.compactChipText,
        tone === 'warning' && styles.compactChipTextWarning,
        tone === 'success' && styles.compactChipTextSuccess,
        tone === 'danger' && styles.compactChipTextDanger,
        tone === 'muted' && styles.compactChipTextMuted,
      ]}
    >
      {label}
    </Text>
  </View>
);

const RouteSummaryStop = ({styles, icon, label, lines, tone = 'default', ppcColors}) => {
  const normalizedLines = Array.isArray(lines)
    ? lines.map(item => normalizeText(item)).filter(Boolean)
    : [];
  const primaryLine = normalizedLines[0] || 'Endereco nao informado.';
  const secondaryLine = normalizedLines.slice(1).join(' • ');

  return (
    <View
      style={[
        styles.routeSummaryStop,
        tone === 'success' && styles.routeSummaryStopSuccess,
      ]}
    >
      <View
        style={[
          styles.routeSummaryIconWrap,
          tone === 'success' && styles.routeSummaryIconWrapSuccess,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={
            tone === 'success'
              ? styles.iconColorSuccess.color
              : ppcColors?.accentInfo || styles.iconColorPrimary.color
          }
        />
      </View>
      <View style={styles.routeSummaryTextWrap}>
        <Text style={styles.routeSummaryLabel}>{label}</Text>
        <Text style={styles.routeSummaryPrimary}>{primaryLine}</Text>
        {secondaryLine ? (
          <Text style={styles.routeSummarySecondary}>{secondaryLine}</Text>
        ) : null}
      </View>
    </View>
  );
};

const RouteSummaryStrip = ({
  styles,
  currentPositionLines = [],
  pickupAddressLines,
  dropoffAddressLines,
  ppcColors,
}) => {
  const hasCurrentPosition = Array.isArray(currentPositionLines) && currentPositionLines.length > 0;

  return (
    <View style={styles.routeSummaryStrip}>
      {hasCurrentPosition ? (
        <>
          <RouteSummaryStop
            styles={styles}
            icon="crosshairs-gps"
            label="Posição atual"
            lines={currentPositionLines}
            ppcColors={ppcColors}
          />
          <View style={styles.routeSummaryDivider}>
            <MaterialCommunityIcons
              name="arrow-right-bold"
              size={18}
              color={ppcColors?.accentInfo || styles.iconColorPrimary.color}
            />
          </View>
        </>
      ) : null}
      <RouteSummaryStop
        styles={styles}
        icon="map-marker-outline"
        label="Coleta"
        lines={pickupAddressLines}
        ppcColors={ppcColors}
      />
      <View style={styles.routeSummaryDivider}>
        <MaterialCommunityIcons
          name="arrow-right-bold"
          size={18}
          color={ppcColors?.accentInfo || styles.iconColorPrimary.color}
        />
      </View>
      <RouteSummaryStop
        styles={styles}
        icon="map-marker"
        label="Entrega"
        lines={dropoffAddressLines}
        tone="success"
        ppcColors={ppcColors}
      />
    </View>
  );
};

const resolveDeliveryStopAddress = stop =>
  stop?.addressDestination ||
  stop?.delivery?.addressDestination ||
  stop?.route?.dropoffAddress ||
  stop?.route?.destination ||
  null;

const resolveDeliveryRunStrategyLabel = strategy => {
  switch (String(strategy || '').trim().toLowerCase()) {
    case 'manual':
      return 'Rota manual';
    case 'eta':
      return 'Rota por menor tempo';
    case 'distance':
      return 'Rota por menor distância';
    case 'timestamp':
      return 'Rota por ordem recebida';
    default:
      return '';
  }
};

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

export const QuoteCard = ({
  styles,
  quote,
  onSelect,
  onOpenTracking,
  requestLoading,
  allowSelectionActions = true,
  delivery = null,
  ppcColors,
}) => {
  const selected = Boolean(quote?.selected);
  const requestable = Boolean(quote?.requestable);
  const available = Boolean(quote?.available);
  const providerLabel = resolveProviderLabel(quote);
  const statusLabel = resolveQuoteStatusLabel(quote);
  const deliveryContact = delivery?.deliveryPeople || null;
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
          <CompactInfoChip styles={styles} icon="cash" label={formatQuotePrice(quote?.price)} ppcColors={ppcColors} />
          {quote?.eta ? (
            <CompactInfoChip styles={styles} icon="clock-outline" label={quote.eta} ppcColors={ppcColors} />
          ) : null}
          {showDeliveryDetails ? (
            <CompactInfoChip
              styles={styles}
              icon="motorbike"
              label={deliveryName || 'Motoboy nao informado'}
              tone="success"
              ppcColors={ppcColors}
            />
          ) : null}
          {showDeliveryDetails && deliveryPhone ? (
            <CompactInfoChip styles={styles} icon="phone-outline" label={deliveryPhone} ppcColors={ppcColors} />
          ) : null}
          {showDeliveryDetails && deliveryStatus ? (
            <CompactInfoChip
              styles={styles}
              icon="check-circle-outline"
              label={deliveryStatus}
              tone="success"
              ppcColors={ppcColors}
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
            icon={<MaterialCommunityIcons name="map-marker-path" size={18} color={ppcColors?.accentInfo} />}
            onPress={() => onOpenTracking?.(openTrackingUrl)}
            disabled={requestLoading}
            secondary
          />
        ) : null}

        {requestable && allowSelectionActions ? (
          <ActionButton
            styles={styles}
            label={selected ? 'Selecionada' : 'Escolher cotacao'}
            icon={<MaterialCommunityIcons name="truck-fast-outline" size={18} color={styles.iconColorWhite.color} />}
            onPress={() => onSelect?.(quote)}
            disabled={requestLoading || selected}
            primary
          />
        ) : null}
      </View>
    </View>
  );
};

const CustomerAssignmentModal = ({
  styles,
  visible,
  onClose,
  customerSearch,
  onCustomerSearchChange,
  customerSearchLoading,
  customerSearchResults,
  selectedOrderClientIri,
  customerLinkingId,
  onSelectCustomer,
  onCreateCustomer,
  ppcColors,
}) => {
  const normalizedSearch = normalizeText(customerSearch);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalSheetRoot}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalSheetBackdrop}
          onPress={customerLinkingId ? undefined : onClose}
        />
        <View style={styles.modalSheetWrap}>
          <View style={styles.assignmentModalCard}>
            <View style={styles.deliveryCodeHeader}>
              <Text style={styles.deliveryCodeStepBadge}>Cliente</Text>
              <TouchableOpacity
                onPress={onClose}
                disabled={!!customerLinkingId}
                style={styles.deliveryCodeCloseButton}
              >
                <MaterialCommunityIcons name="close" size={20} color={ppcColors?.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.deliveryCodeModalTitle}>
              {selectedOrderClientIri ? 'Trocar cliente do pedido' : 'Vincular cliente ao pedido'}
            </Text>

            <ScrollView
              style={styles.deliveryCodeScroll}
              contentContainerStyle={styles.deliveryCodeScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.assignmentSearchBox}>
                <MaterialCommunityIcons name="magnify" size={18} color={ppcColors?.textSecondary} />
                <TextInput
                  value={customerSearch}
                  onChangeText={onCustomerSearchChange}
                  editable={!customerLinkingId}
                  placeholder="Buscar cliente"
                  placeholderTextColor={ppcColors?.textSecondary}
                  autoCapitalize="none"
                  style={styles.assignmentSearchInput}
                />
                {customerSearchLoading ? (
                  <Text style={styles.assignmentOptionBadge}>Buscando</Text>
                ) : null}
              </View>

              {!normalizedSearch ? (
                <View style={styles.assignmentEmptyState}>
                  <Text style={styles.assignmentEmptyStateTitle}>Digite para buscar</Text>
                  <Text style={styles.assignmentEmptyStateText}>
                    Busque por nome, documento, telefone ou email.
                  </Text>
                </View>
              ) : customerSearchLoading ? (
                <View style={styles.assignmentEmptyState}>
                  <Text style={styles.assignmentEmptyStateText}>Buscando clientes...</Text>
                </View>
              ) : customerSearchResults.length > 0 ? (
                customerSearchResults.map(customer => {
                  const customerId = String(normalizeEntityId(customer) || '')
                  const customerIri = toEntityIri(customer, 'people')
                  const customerTitle =
                    normalizeDisplayText(customer?.alias || customer?.name) ||
                    `Cliente #${customerId || '--'}`
                  const customerMeta = buildCustomerSearchMeta(customer)
                  const isCurrent = customerIri === selectedOrderClientIri
                  const isSaving = customerLinkingId === customerId

                  return (
                    <TouchableOpacity
                      key={customerIri || customerId || customerTitle}
                      onPress={() => onSelectCustomer?.(customer)}
                      disabled={!!customerLinkingId}
                      style={[
                        styles.assignmentOptionCard,
                        isCurrent && styles.assignmentOptionCardSelected,
                      ]}
                    >
                      <View style={styles.assignmentOptionTextWrap}>
                        <Text style={styles.assignmentOptionTitle}>{customerTitle}</Text>
                        {customerMeta ? (
                          <Text style={styles.assignmentOptionMeta}>{customerMeta}</Text>
                        ) : null}
                      </View>

                      {isSaving ? (
                        <Text style={styles.assignmentOptionBadge}>Salvando</Text>
                      ) : isCurrent ? (
                        <Text style={styles.assignmentOptionBadge}>Atual</Text>
                      ) : (
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={ppcColors?.textSecondary}
                        />
                      )}
                    </TouchableOpacity>
                  )
                })
              ) : (
                <View style={styles.assignmentEmptyState}>
                  <Text style={styles.assignmentEmptyStateTitle}>Nenhum cliente encontrado</Text>
                  <Text style={styles.assignmentEmptyStateText}>
                    Use o cadastro rapido para criar e vincular um novo cliente.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={onCreateCustomer}
                disabled={!!customerLinkingId}
                style={styles.assignmentQuickActionCard}
              >
                <View style={styles.assignmentQuickActionHeader}>
                  <MaterialCommunityIcons name="account-plus" size={18} color={ppcColors?.accentInfo} />
                  <Text style={styles.assignmentQuickActionTitle}>
                    Cadastro rapido de cliente
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.sectionActionRow}>
              <ActionButton
                styles={styles}
                label="Fechar"
                onPress={onClose}
                disabled={!!customerLinkingId}
                secondary
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AddressAssignmentModal = ({
  styles,
  visible,
  onClose,
  selectedOrderClientIri,
  selectedOrderClient,
  selectedOrderAddressIri,
  addressOptionsLoading,
  addressOptions,
  addressSelectingId,
  addressSaveLoading,
  addressModalMode,
  addressForm,
  onOpenCreateMode,
  onAddressFormFieldChange,
  onSelectAddress,
  onCreateAddress,
  ppcColors,
}) => {
  const customerTitle = normalizeDisplayText(
    selectedOrderClient?.alias || selectedOrderClient?.name,
  );

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalSheetRoot}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalSheetBackdrop}
          onPress={addressSaveLoading || addressSelectingId ? undefined : onClose}
        />
        <View style={styles.modalSheetWrap}>
          <View style={styles.assignmentModalCard}>
            <View style={styles.deliveryCodeHeader}>
              <Text style={styles.deliveryCodeStepBadge}>Entrega</Text>
              <TouchableOpacity
                onPress={onClose}
                disabled={addressSaveLoading || !!addressSelectingId}
                style={styles.deliveryCodeCloseButton}
              >
                <MaterialCommunityIcons name="close" size={20} color={ppcColors?.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.deliveryCodeModalTitle}>
              Selecionar endereco de entrega
            </Text>

            <ScrollView
              style={styles.deliveryCodeScroll}
              contentContainerStyle={styles.deliveryCodeScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!!selectedOrderClientIri && customerTitle ? (
                <View style={styles.assignmentContextCard}>
                  <MaterialCommunityIcons name="account" size={16} color={ppcColors?.accentInfo} />
                  <Text style={styles.assignmentContextText}>
                    Cliente selecionado: {customerTitle}
                  </Text>
                </View>
              ) : null}

              {addressOptionsLoading ? (
                <View style={styles.assignmentEmptyState}>
                  <Text style={styles.assignmentEmptyStateText}>Carregando enderecos...</Text>
                </View>
              ) : addressOptions.length > 0 ? (
                addressOptions.map(address => {
                  const addressId = String(normalizeEntityId(address) || '')
                  const addressIri = toEntityIri(address, 'addresses')
                  const summary = buildAddressOptionSummary(address)
                  const isCurrent = addressIri === selectedOrderAddressIri
                  const isSaving = addressSelectingId === addressId

                  return (
                    <TouchableOpacity
                      key={addressIri || addressId || summary.primary}
                      onPress={() => onSelectAddress?.(address)}
                      disabled={!!addressSelectingId || addressSaveLoading}
                      style={[
                        styles.assignmentOptionCard,
                        isCurrent && styles.assignmentOptionCardSelected,
                      ]}
                    >
                      <View style={styles.assignmentOptionTextWrap}>
                        <Text style={styles.assignmentOptionTitle}>
                          {summary.primary || `Endereco #${addressId || '--'}`}
                        </Text>
                        {summary.secondary ? (
                          <Text style={styles.assignmentOptionMeta}>{summary.secondary}</Text>
                        ) : null}
                      </View>

                      {isSaving ? (
                        <Text style={styles.assignmentOptionBadge}>Salvando</Text>
                      ) : isCurrent ? (
                        <Text style={styles.assignmentOptionBadge}>Atual</Text>
                      ) : (
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={ppcColors?.textSecondary}
                        />
                      )}
                    </TouchableOpacity>
                  )
                })
              ) : (
                <View style={styles.assignmentEmptyState}>
                  <Text style={styles.assignmentEmptyStateTitle}>Nenhum endereco encontrado</Text>
                  <Text style={styles.assignmentEmptyStateText}>
                    Cadastre um novo endereco para este cliente.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={onOpenCreateMode}
                disabled={addressSaveLoading || !!addressSelectingId}
                style={styles.assignmentQuickActionCard}
              >
                <View style={styles.assignmentQuickActionHeader}>
                  <MaterialCommunityIcons name="map-marker-plus" size={18} color={ppcColors?.accentInfo} />
                  <Text style={styles.assignmentQuickActionTitle}>
                    Cadastro rapido de endereco
                  </Text>
                </View>
              </TouchableOpacity>

              {addressModalMode === 'create' ? (
                <>
                  <TextInput
                    value={addressForm.nickname}
                    onChangeText={value => onAddressFormFieldChange('nickname', value)}
                    editable={!addressSaveLoading}
                    placeholder="Referencia ou apelido"
                    placeholderTextColor={ppcColors?.textSecondary}
                    style={styles.assignmentFormInput}
                  />
                  <View style={styles.assignmentFormRow}>
                    <TextInput
                      value={addressForm.cep}
                      onChangeText={value => onAddressFormFieldChange('cep', value)}
                      editable={!addressSaveLoading}
                      placeholder="CEP"
                      placeholderTextColor={ppcColors?.textSecondary}
                      keyboardType="number-pad"
                      style={[styles.assignmentFormInput, styles.assignmentFormHalf]}
                    />
                    <TextInput
                      value={addressForm.number}
                      onChangeText={value => onAddressFormFieldChange('number', value)}
                      editable={!addressSaveLoading}
                      placeholder="Numero"
                      placeholderTextColor={ppcColors?.textSecondary}
                      keyboardType="number-pad"
                      style={[styles.assignmentFormInput, styles.assignmentFormHalf]}
                    />
                  </View>
                  <TextInput
                    value={addressForm.street}
                    onChangeText={value => onAddressFormFieldChange('street', value)}
                    editable={!addressSaveLoading}
                    placeholder="Rua"
                    placeholderTextColor={ppcColors?.textSecondary}
                    style={styles.assignmentFormInput}
                  />
                  <TextInput
                    value={addressForm.complement}
                    onChangeText={value => onAddressFormFieldChange('complement', value)}
                    editable={!addressSaveLoading}
                    placeholder="Complemento"
                    placeholderTextColor={ppcColors?.textSecondary}
                    style={styles.assignmentFormInput}
                  />
                  <TextInput
                    value={addressForm.district}
                    onChangeText={value => onAddressFormFieldChange('district', value)}
                    editable={!addressSaveLoading}
                    placeholder="Bairro"
                    placeholderTextColor={ppcColors?.textSecondary}
                    style={styles.assignmentFormInput}
                  />
                  <TextInput
                    value={addressForm.city}
                    onChangeText={value => onAddressFormFieldChange('city', value)}
                    editable={!addressSaveLoading}
                    placeholder="Cidade"
                    placeholderTextColor={ppcColors?.textSecondary}
                    style={styles.assignmentFormInput}
                  />
                  <View style={styles.assignmentFormRow}>
                    <TextInput
                      value={addressForm.state}
                      onChangeText={value => onAddressFormFieldChange('state', value)}
                      editable={!addressSaveLoading}
                      placeholder="Estado"
                      placeholderTextColor={ppcColors?.textSecondary}
                      style={[styles.assignmentFormInput, styles.assignmentFormHalf]}
                    />
                    <TextInput
                      value={addressForm.country}
                      onChangeText={value => onAddressFormFieldChange('country', value)}
                      editable={!addressSaveLoading}
                      placeholder="Pais"
                      placeholderTextColor={ppcColors?.textSecondary}
                      style={[styles.assignmentFormInput, styles.assignmentFormHalf]}
                    />
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.sectionActionRow}>
              <ActionButton
                styles={styles}
                label="Fechar"
                onPress={onClose}
                disabled={addressSaveLoading || !!addressSelectingId}
                secondary
              />
              {addressModalMode === 'create' ? (
                <ActionButton
                  styles={styles}
                  label={addressSaveLoading ? 'Salvando' : 'Salvar endereco'}
                  onPress={onCreateAddress}
                  disabled={addressSaveLoading || !!addressSelectingId}
                  primary
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const OrderLogisticsPage = ({navigation, route}) => {
  const {showError, showSuccess} = useMessage() || {};
  const {ppcColors} = useOrderDetailsVisuals();
  const pageStyles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const insets = useSafeAreaInsets();
  const ordersStore = useStore('orders');
  const deliveryOrdersStore = useStore('delivery_orders');
  const orderLogisticsStore = useStore('order_logistics');
  const authStore = useStore('auth');
  const websocketStore = useStore('websocket');
  const peopleStore = useStore('people');
  const addressStore = useStore('address');
  const ordersActions = ordersStore.actions;
  const ordersActionsRef = useRef(ordersActions);
  const orderLogisticsActions = orderLogisticsStore?.actions || {};
  const deliveryOrdersActions = deliveryOrdersStore?.actions || {};
  const addressActions = addressStore?.actions || {};
  const peopleActions = peopleStore?.actions || {};
  const currentPeopleIri = useMemo(
    () => resolveCurrentPeopleIri(authStore?.getters?.user || null),
    [authStore?.getters?.user],
  );
  const routeOrder = route?.params?.order || null;
  const orderId = useMemo(
    () => normalizeOrderId(route?.params?.id || routeOrder?.id),
    [route?.params?.id, routeOrder?.id],
  );
  const isDeliveryRunMode = route?.name === 'DeliveryRunPage' || route?.params?.deliveryRunMode === true;
  const isDeliveryDetailMode = Boolean(routeOrder) && !isDeliveryRunMode;
  const isManagerOverviewMode = !isDeliveryDetailMode && !isDeliveryRunMode;
  const courierCoordinates = useDeviceCoordinates(isDeliveryDetailMode || isDeliveryRunMode);
  const storeOrder = ordersStore.getters.item || null;
  const order = routeOrder || (normalizeOrderId(storeOrder?.id) === orderId ? storeOrder : null);
  const orderHeaderOrder = useMemo(
    () =>
      order
        ? {
            ...order,
            status: {
              ...(order?.status || {}),
              color: normalizeText(order?.status?.color) || ppcColors?.accentInfo,
            },
          }
        : null,
    [order],
  );
  const websocketMessages = Array.isArray(websocketStore.getters.messages)
    ? websocketStore.getters.messages
    : [];
  const peopleGetters = peopleStore?.getters || {};
  const currentCompany = peopleGetters.currentCompany || null;
  const defaultCompany = peopleGetters.defaultCompany || null;
  const currentCompanyId = normalizeText(currentCompany?.id);
  const orderLoadError = resolveSystemErrorMessage(ordersStore?.getters?.error);
  const logisticsPayload = orderLogisticsStore?.getters?.item || null;
  const logisticsError = resolveSystemErrorMessage(orderLogisticsStore?.getters?.error);
  const logisticsIsLoading = Boolean(orderLogisticsStore?.getters?.isLoading);
  const logisticsIsSaving = Boolean(orderLogisticsStore?.getters?.isSaving);
  const requestLoading = logisticsIsSaving;
  const isRefreshing = Boolean(
    logisticsIsLoading ||
      Boolean(ordersStore?.getters?.isLoading) ||
      Boolean(deliveryOrdersStore?.getters?.isLoading),
  );
  const loadFailed = Boolean((logisticsError || orderLoadError) && !logisticsPayload);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerCreateModalVisible, setCustomerCreateModalVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerLinkingId, setCustomerLinkingId] = useState('');
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressModalMode, setAddressModalMode] = useState('select');
  const [addressOptions, setAddressOptions] = useState([]);
  const [addressOptionsLoading, setAddressOptionsLoading] = useState(false);
  const [addressForm, setAddressForm] = useState(createEmptyAddressForm());
  const [addressSaveLoading, setAddressSaveLoading] = useState(false);
  const [addressSelectingId, setAddressSelectingId] = useState('');
  const lastProcessedMessageCountRef = useRef(websocketMessages.length);
  const deliveryQueueItems = Array.isArray(deliveryOrdersStore?.getters?.items)
    ? deliveryOrdersStore.getters.items
    : [];
  const deliveryQueueSourceItems = useMemo(() => {
    const items = Array.isArray(deliveryQueueItems) ? deliveryQueueItems.slice() : [];

    if (
      order &&
      !items.some(item => normalizeOrderId(item?.id) === orderId)
    ) {
      items.unshift(order);
    }

    return items;
  }, [deliveryQueueItems, order, orderId]);
  const deliveryRunPlan = useMemo(
    () =>
      resolveDeliveryRunPlan(deliveryQueueSourceItems, {
        courierCoordinates,
        preferShortestDistance: isDeliveryRunMode,
      }),
    [courierCoordinates, deliveryQueueSourceItems, isDeliveryRunMode],
  );
  const activeRunStops = deliveryRunPlan.stops || [];
  const activeRunCurrentStop = deliveryRunPlan.currentStop || null;
  const activeRunNextStops = deliveryRunPlan.nextStops || [];
  const deliveryRunDisplayOrder = useMemo(
    () => (isDeliveryRunMode ? activeRunCurrentStop || null : orderHeaderOrder),
    [activeRunCurrentStop, isDeliveryRunMode, orderHeaderOrder],
  );

  useEffect(() => {
    ordersActionsRef.current = ordersActions;
  }, [ordersActions]);

  const refreshOrder = useCallback(async () => {
    const currentOrdersActions = ordersActionsRef.current;

    if (!orderId || typeof currentOrdersActions?.get !== 'function') {
      return null;
    }

    return currentOrdersActions.get({
      id: orderId,
      __storeMeta: {
        preserveItem: true,
        skipSystemError: true,
      },
    });
  }, [orderId]);

  const refreshLogistics = useCallback(async () => {
    if (!orderId) {
      return null;
    }

    return orderLogisticsActions.get({
      id: orderId,
      __storeMeta: {
        skipSystemError: true,
      },
    });
  }, [orderId, orderLogisticsActions]);

  const refreshDeliveryQueue = useCallback(async () => {
    if (
      !currentPeopleIri ||
      typeof deliveryOrdersActions.getItems !== 'function'
    ) {
      return null;
    }

    return deliveryOrdersActions.getItems({
      orderType: 'delivery',
      provider: currentPeopleIri,
    });
  }, [currentPeopleIri, deliveryOrdersActions.getItems]);

  const loadPageData = useCallback(async () => {
    if (isDeliveryRunMode && !orderId) {
      return refreshDeliveryQueue();
    }

    if (!orderId) {
      return null;
    }

    const [, logisticsResponse] = await Promise.all([refreshOrder(), refreshLogistics()]);
    return logisticsResponse;
  }, [isDeliveryRunMode, orderId, refreshDeliveryQueue, refreshLogistics, refreshOrder]);

  const loadLogisticsData = useCallback(async () => {
    if (isDeliveryRunMode && !orderId) {
      return refreshDeliveryQueue();
    }

    if (!orderId) {
      return null;
    }

    return refreshLogistics();
  }, [isDeliveryRunMode, orderId, refreshDeliveryQueue, refreshLogistics]);

  const refreshAll = useCallback(async () => {
    if (!orderId && !isDeliveryRunMode) {
      return;
    }

    await loadPageData();

    if (!isDeliveryRunMode || orderId) {
      await refreshDeliveryQueue();
    }
  }, [isDeliveryRunMode, loadPageData, orderId, refreshDeliveryQueue]);

  useFocusEffect(
    useCallback(() => {
      if (!orderId && !isDeliveryRunMode) {
        return undefined;
      }

      const loadInitialData = routeOrder ? loadLogisticsData() : loadPageData();

      void loadInitialData.catch(() => {});

      return undefined;
    }, [isDeliveryRunMode, loadLogisticsData, loadPageData, orderId, routeOrder]),
  );

  useEffect(() => {
    if (
      (!orderId && !isDeliveryRunMode) ||
      websocketMessages.length <= lastProcessedMessageCountRef.current
    ) {
      return;
    }

    const newMessages = websocketMessages.slice(lastProcessedMessageCountRef.current);
    lastProcessedMessageCountRef.current = websocketMessages.length;

    const shouldRefresh = isDeliveryRunMode
      ? newMessages.some(message => {
          const storeName = normalizeText(message?.store).toLowerCase();

          if (storeName !== 'orders' && storeName !== 'delivery_orders') {
            return false;
          }

          const messageCompanyId = normalizeText(
            message?.company?.id || message?.companyId || message?.company,
          );

          return !currentCompanyId || !messageCompanyId || messageCompanyId === currentCompanyId;
        })
      : newMessages.some(message => isRelevantOrdersMessage(message, orderId, currentCompanyId));

    if (shouldRefresh) {
      refreshAll().catch(() => {});
    }
  }, [currentCompanyId, isDeliveryRunMode, orderId, refreshAll, websocketMessages]);

  const logistics = useMemo(
    () => resolveOrderLogisticsSnapshot(buildOrderLogisticsSnapshotSource(order, logisticsPayload)),
    [logisticsPayload, order],
  );

  const pickupAddressParts = useMemo(
    () =>
      isDeliveryDetailMode
        ? order?.addressOrigin
          ? resolveAddressDisplayParts(order.addressOrigin)
          : logistics.pickupAddressParts
        : logistics.pickupAddressParts,
    [isDeliveryDetailMode, logistics.pickupAddressParts, order?.addressOrigin],
  );
  const dropoffAddressParts = useMemo(
    () =>
      isDeliveryDetailMode
        ? order?.addressDestination
          ? resolveAddressDisplayParts(order.addressDestination)
          : logistics.dropoffAddressParts
        : logistics.dropoffAddressParts,
    [isDeliveryDetailMode, logistics.dropoffAddressParts, order?.addressDestination],
  );
  const pickupAddressLines = useMemo(
    () => renderAddressLines(pickupAddressParts),
    [pickupAddressParts],
  );
  const dropoffAddressLines = useMemo(
    () => renderAddressLines(dropoffAddressParts),
    [dropoffAddressParts],
  );
  const hasDeliveryAddress = useMemo(
    () => dropoffAddressLines.some(line => line !== 'Endereco nao informado.'),
    [dropoffAddressLines],
  );
  const localOrderClient = logistics.order?.client || null;
  const localOrderAddress = logistics.order?.addressDestination || null;
  const selectedOrderClientIri = useMemo(
    () => toEntityIri(localOrderClient, 'people'),
    [localOrderClient],
  );
  const selectedOrderAddressIri = useMemo(
    () => toEntityIri(localOrderAddress, 'addresses'),
    [localOrderAddress],
  );
  const orderCompanyIri = useMemo(
    () => toEntityIri(logistics.order?.provider || currentCompany || defaultCompany, 'people'),
    [currentCompany, defaultCompany, logistics.order?.provider],
  );
  const clientSummaryLines = useMemo(() => {
    const summarySource =
      localOrderClient && typeof localOrderClient === 'object'
        ? localOrderClient
        : logistics.route?.dropoffContact || logistics.dropoffContact || null;
    const title = normalizeDisplayText(summarySource?.alias || summarySource?.name);
    const meta = buildCustomerSearchMeta(summarySource);
    const lines = [title, meta].filter(Boolean);

    return lines.length ? lines : ['Cliente nao informado.'];
  }, [localOrderClient, logistics.dropoffContact, logistics.route?.dropoffContact]);

  const buildOrderUpdatePayload = useCallback(
    changes => {
      const baseOrder = logistics.order || order;
      const baseOrderId = normalizeEntityId(baseOrder);

      if (!baseOrderId) {
        throw new Error('Nao foi possivel identificar o pedido para atualizar.');
      }

      const providerIri = toEntityIri(baseOrder?.provider || currentCompany || defaultCompany, 'people');
      const statusIri = toEntityIri(baseOrder?.status, 'statuses');
      const orderType = normalizeText(baseOrder?.orderType || order?.orderType);

      return {
        id: Number(baseOrderId),
        app: normalizeText(baseOrder?.app || order?.app || 'POS') || 'POS',
        ...(orderType ? {orderType} : {}),
        ...(providerIri ? {provider: providerIri} : {}),
        ...(statusIri ? {status: statusIri} : {}),
        ...changes,
      };
    },
    [currentCompany, defaultCompany, logistics.order, order],
  );

  const updateCurrentOrder = useCallback(
    async changes => {
      const savedOrder = normalizeActionResult(
        await ordersActions.save(buildOrderUpdatePayload(changes)),
      );

      if (savedOrder && typeof ordersActions.syncOrder === 'function') {
        ordersActions.syncOrder(savedOrder);
      } else if (savedOrder) {
        ordersActions.setItem(savedOrder);
      }

      await loadPageData();

      return savedOrder;
    },
    [buildOrderUpdatePayload, loadPageData, ordersActions],
  );

  const closeCustomerModal = useCallback(() => {
    if (customerLinkingId) {
      return;
    }

    setCustomerModalVisible(false);
    setCustomerSearch('');
    setCustomerSearchResults([]);
  }, [customerLinkingId]);

  const openCustomerModal = useCallback(() => {
    setCustomerModalVisible(true);
  }, []);

  const openCustomerCreateModal = useCallback(() => {
    setCustomerCreateModalVisible(true);
  }, []);

  const closeAddressModal = useCallback(() => {
    if (addressSaveLoading || addressSelectingId) {
      return;
    }

    setAddressModalVisible(false);
    setAddressModalMode('select');
    setAddressOptions([]);
    setAddressForm(createEmptyAddressForm());
  }, [addressSaveLoading, addressSelectingId]);

  const loadAddressOptions = useCallback(
    async customer => {
      const customerIri = toEntityIri(customer, 'people');

      if (!customerIri) {
        setAddressOptions([]);
        return [];
      }

      try {
        setAddressOptionsLoading(true);
        const response = await addressActions.getItems({
          people: customerIri,
        });
        const items = extractCollectionItems(response);

        setAddressOptions(items);
        return items;
      } catch (addressError) {
        setAddressOptions([]);
        showError(formatApiError(addressError));
        return [];
      } finally {
        setAddressOptionsLoading(false);
      }
    },
    [addressActions, showError],
  );

  const openAddressCreateMode = useCallback(() => {
    setAddressForm(createEmptyAddressForm());
    setAddressModalMode('create');
    setAddressModalVisible(true);
  }, []);

  const openAddressModal = useCallback(async () => {
    setAddressModalVisible(true);

    if (!selectedOrderClientIri) {
      setAddressOptions([]);
      setAddressModalMode('create');
      return;
    }

    setAddressModalMode('select');
    await loadAddressOptions(localOrderClient);
  }, [loadAddressOptions, localOrderClient, selectedOrderClientIri]);

  const handleAddressFormFieldChange = useCallback((field, value) => {
    setAddressForm(previousForm => ({
      ...previousForm,
      [field]:
        field === 'cep'
          ? normalizePostalCodeInput(value)
          : field === 'number'
            ? String(value ?? '').replace(/\D+/g, '')
            : value,
    }));
  }, []);

  const handleSelectCustomer = useCallback(
    async customer => {
      const nextCustomerIri = toEntityIri(customer, 'people');
      const nextCustomerId = normalizeEntityId(customer);

      if (!nextCustomerIri) {
        showError('Nao foi possivel identificar o cliente selecionado.');
        return;
      }

      if (selectedOrderClientIri === nextCustomerIri) {
        closeCustomerModal();
        return;
      }

      try {
        setCustomerLinkingId(nextCustomerId);
        await updateCurrentOrder({client: nextCustomerIri});
        closeCustomerModal();
        showSuccess(
          selectedOrderClientIri
            ? 'Cliente do pedido atualizado com sucesso.'
            : 'Cliente vinculado ao pedido com sucesso.',
        );

        if (!selectedOrderAddressIri) {
          setAddressModalVisible(true);
          setAddressModalMode('select');
          await loadAddressOptions(customer);
        }
      } catch (updateError) {
        showError(formatApiError(updateError));
      } finally {
        setCustomerLinkingId('');
      }
    },
    [
      closeCustomerModal,
      loadAddressOptions,
      selectedOrderAddressIri,
      selectedOrderClientIri,
      showError,
      showSuccess,
      updateCurrentOrder,
    ],
  );

  const handleCustomerCreated = useCallback(
    async savedCustomer => {
      setCustomerCreateModalVisible(false);

      if (!savedCustomer) {
        return;
      }

      await handleSelectCustomer(savedCustomer);
    },
    [handleSelectCustomer],
  );

  const handleSelectAddress = useCallback(
    async address => {
      const nextAddressIri = toEntityIri(address, 'addresses');
      const nextAddressId = normalizeEntityId(address);

      if (!nextAddressIri) {
        showError('Nao foi possivel identificar o endereco selecionado.');
        return;
      }

      if (selectedOrderAddressIri === nextAddressIri) {
        closeAddressModal();
        return;
      }

      try {
        setAddressSelectingId(nextAddressId);
        await updateCurrentOrder({addressDestination: nextAddressIri});
        closeAddressModal();
        showSuccess('Endereco de entrega atualizado com sucesso.');
      } catch (updateError) {
        showError(formatApiError(updateError));
      } finally {
        setAddressSelectingId('');
      }
    },
    [
      closeAddressModal,
      selectedOrderAddressIri,
      showError,
      showSuccess,
      updateCurrentOrder,
    ],
  );

  const handleCreateAddress = useCallback(async () => {
    if (!selectedOrderClientIri) {
      showError('Vincule um cliente antes de cadastrar o endereco.');
      return;
    }

    const street = normalizeText(addressForm.street);
    const district = normalizeText(addressForm.district);
    const city = normalizeText(addressForm.city);
    const state = normalizeText(addressForm.state);
    const country = normalizeText(addressForm.country);
    const number = String(addressForm.number ?? '').replace(/\D+/g, '').trim();
    const cep = normalizePostalCodeInput(addressForm.cep);
    const complement = normalizeText(addressForm.complement);
    const nickname = normalizeText(addressForm.nickname) || 'Entrega';

    if (!street || !district || !city || !state || !country || !number || !cep) {
      showError('Rua, numero, bairro, cidade, estado, pais e CEP sao obrigatorios.');
      return;
    }

    try {
      setAddressSaveLoading(true);

      const payload = {
        street,
        district,
        city,
        state,
        country,
        number: Number(number),
        cep,
        nickname,
        complement,
        people: selectedOrderClientIri,
      };

      const savedAddress = normalizeActionResult(await addressActions.save(payload));
      const savedAddressIri = toEntityIri(savedAddress, 'addresses');

      if (!savedAddressIri) {
        throw new Error('Endereco criado sem identificador valido.');
      }

      await updateCurrentOrder({addressDestination: savedAddressIri});
      closeAddressModal();
      showSuccess('Endereco de entrega atualizado com sucesso.');
    } catch (saveError) {
      showError(formatApiError(saveError));
    } finally {
      setAddressSaveLoading(false);
    }
  }, [
    addressActions,
    addressForm.cep,
    addressForm.city,
    addressForm.complement,
    addressForm.country,
    addressForm.district,
    addressForm.nickname,
    addressForm.number,
    addressForm.state,
    addressForm.street,
    closeAddressModal,
    selectedOrderClientIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ]);

  useEffect(() => {
    if (!customerModalVisible) {
      return undefined;
    }

    const normalizedSearch = String(customerSearch || '').trim();

    if (!normalizedSearch || !orderCompanyIri) {
      setCustomerSearchResults([]);
      setCustomerSearchLoading(false);
      return undefined;
    }

    let isMounted = true;
    const timeoutId = setTimeout(async () => {
      try {
        setCustomerSearchLoading(true);
        const response = await peopleActions.getItems({
          'link.company': orderCompanyIri,
          'link.linkType': 'client',
          search: normalizedSearch,
        });

        if (!isMounted) {
          return;
        }

        setCustomerSearchResults(extractCollectionItems(response));
      } catch {
        if (isMounted) {
          setCustomerSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setCustomerSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [customerModalVisible, customerSearch, orderCompanyIri, peopleActions]);

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
  const canRequestQuotes = Boolean(
    isManagerOverviewMode && logistics.canQuote && !hasDeliveryOrder && !isClosedOrder && hasDeliveryAddress,
  );
  const quoteActionLabel = logistics.quotes.length > 0 ? 'Atualizar cotações' : 'Solicitar cotações';
  const deliveryValueLabel = useMemo(
    () =>
      formatQuotePrice(
        selectedQuote?.price ??
          logistics.selection.price ??
          deliveryRunDisplayOrder?.price ??
          logistics.order?.price ??
          null,
      ),
    [
      deliveryRunDisplayOrder?.price,
      logistics.order?.price,
      logistics.selection.price,
      selectedQuote?.price,
    ],
  );
  const deliveryOrderLabel = useMemo(() => {
    const orderDisplayId = normalizeText(
      deliveryRunDisplayOrder?.displayId ||
        deliveryRunDisplayOrder?.id ||
        logistics.order?.displayId ||
        logistics.order?.id ||
        orderId ||
        '',
    );

    if (orderDisplayId) {
      return '#' + orderDisplayId;
    }

    return 'Pedido nao informado';
  }, [
    deliveryRunDisplayOrder?.displayId,
    deliveryRunDisplayOrder?.id,
    logistics.order?.displayId,
    logistics.order?.id,
    orderId,
  ]);
  const deliveryStatusSource = useMemo(
    () =>
      deliveryRunDisplayOrder?.status?.status ||
      deliveryRunDisplayOrder?.status?.realStatus ||
      logistics.order?.status?.status ||
      logistics.order?.status?.realStatus ||
      logistics.delivery?.status ||
      selectedQuote?.status?.status ||
      '',
    [
      deliveryRunDisplayOrder?.status?.realStatus,
      deliveryRunDisplayOrder?.status?.status,
      logistics.delivery?.status,
      logistics.order?.status?.realStatus,
      logistics.order?.status?.status,
      selectedQuote?.status?.status,
    ],
  );
  const deliveryStatusLabel = useMemo(
    () => resolveDeliveryStatusLabel(deliveryStatusSource),
    [deliveryStatusSource],
  );
  const deliveryStatusTone = useMemo(
    () => resolveDeliveryStatusTone(deliveryStatusSource),
    [deliveryStatusSource],
  );
  const isAwaitingAcceptance = useMemo(
    () =>
      includesDeliveryStatusKey(
        deliveryStatusSource,
        DELIVERY_STATUS_AWAITING_ACCEPTANCE,
      ),
    [deliveryStatusSource],
  );
  const showDeliveryAcceptanceActions = Boolean(
    isDeliveryDetailMode && orderId && isAwaitingAcceptance && !isClosedOrder,
  );
  const showDeliveryRunProgress = Boolean(
    isDeliveryRunMode &&
      !isClosedOrder &&
      !showDeliveryAcceptanceActions &&
      activeRunStops.length > 0,
  );
  const headerStatusLabel = loadFailed
    ? 'Falha ao atualizar'
    : isRefreshing
      ? 'Atualizando'
      : isClosedOrder
        ? 'Fechado'
        : showDeliveryRunProgress
          ? 'Em rota'
          : includesDeliveryStatusKey(
              logistics.order?.status?.status ||
                logistics.order?.status?.realStatus ||
                logistics.delivery?.status ||
                selectedQuote?.status?.status ||
                '',
              DELIVERY_STATUS_AWAITING_ACCEPTANCE,
            )
            ? 'Aguardando aceite'
            : 'Online';
  const deliveryScreenBottomToolbarHidden =
    showDeliveryAcceptanceActions || showDeliveryRunProgress;
  const deliveryAcceptanceSpacer = showDeliveryAcceptanceActions ? 188 : 0;
  const helpMessage = useMemo(
    () =>
      isDeliveryRunMode
        ? showDeliveryRunProgress
          ? [
              'Resumo desta corrida, rota e mapa.',
              'Marque a parada atual como entregue para liberar a próxima.',
            ]
          : [
              'Resumo desta corrida, rota e mapa.',
              'A corrida aparece quando houver paradas aceitas para cumprir.',
            ]
        : isDeliveryDetailMode
        ? showDeliveryAcceptanceActions
          ? [
              'Resumo desta entrega, rota e mapa.',
              'Aceite ou recuse a corrida para continuar.',
            ]
          : showDeliveryRunProgress
            ? [
                'Resumo desta entrega, rota e mapa.',
                'A corrida fica travada aqui ate concluir a parada atual.',
              ]
          : [
              'Resumo desta entrega, rota e mapa.',
              'Os dados exibidos pertencem a esta corrida.',
            ]
        : [
            'Resumo do pedido principal, rota e mapa.',
            'A lista abaixo mostra as ordens vinculadas e o status de cada uma.',
          ],
    [isDeliveryDetailMode, isDeliveryRunMode, showDeliveryAcceptanceActions, showDeliveryRunProgress],
  );

  useEffect(() => {
    if (!isDeliveryDetailMode && !isDeliveryRunMode) {
      return;
    }

    if (route?.params?.hideBottomToolBar === deliveryScreenBottomToolbarHidden) {
      return;
    }

    navigation?.setParams?.({
      hideBottomToolBar: deliveryScreenBottomToolbarHidden,
    });
  }, [
    isDeliveryDetailMode,
    isDeliveryRunMode,
    navigation,
    route?.params?.hideBottomToolBar,
    deliveryScreenBottomToolbarHidden,
  ]);

  const pickupMapAddress = useMemo(
    () =>
      isDeliveryDetailMode
        ? order?.addressOrigin || null
        : logistics.route?.pickupAddress || logistics.order?.addressOrigin || null,
    [isDeliveryDetailMode, logistics.order?.addressOrigin, logistics.route?.pickupAddress, order?.addressOrigin],
  );
  const dropoffMapAddress = useMemo(
    () =>
      isDeliveryDetailMode
        ? order?.addressDestination || null
        : logistics.route?.dropoffAddress || logistics.order?.addressDestination || null,
    [isDeliveryDetailMode, logistics.order?.addressDestination, logistics.route?.dropoffAddress, order?.addressDestination],
  );
  const courierMapCoordinates = useMemo(
    () => extractAddressCoordinates(courierCoordinates),
    [courierCoordinates],
  );
  const deliveryRunStopMarkers = useMemo(
    () =>
      activeRunStops
        .map((stop, index) => {
          const stopAddress = resolveDeliveryStopAddress(stop);
          const stopLines = renderAddressLines(resolveAddressDisplayParts(stopAddress));

          return buildDeliveryMapMarker({
            id: `run-stop-${normalizeOrderId(stop?.id) || index + 1}`,
            label: index === 0 ? 'Parada atual' : `Parada ${index + 1}`,
            address: stopAddress,
            addressLines: stopLines,
          });
        })
        .filter(Boolean),
    [activeRunStops],
  );
  const deliveryRouteDistanceKm = useMemo(() => {
    if (!isDeliveryDetailMode && !isDeliveryRunMode) {
      return null;
    }

    if (showDeliveryRunProgress) {
      const routePoints = [courierMapCoordinates, ...deliveryRunStopMarkers].filter(Boolean);

      if (routePoints.length < 2) {
        return null;
      }

      return routePoints.slice(1).reduce((total, point, index) => {
        const previous = routePoints[index];
        const distance = haversineDistanceKm(previous, point);

        return Number.isFinite(distance) ? total + distance : total;
      }, 0);
    }

    const pickupCoordinates = extractAddressCoordinates(pickupMapAddress);
    const dropoffCoordinates = extractAddressCoordinates(dropoffMapAddress);

    if (!pickupCoordinates || !dropoffCoordinates) {
      return null;
    }

    const pickupToDropoffDistance = haversineDistanceKm(pickupCoordinates, dropoffCoordinates);

    if (!courierMapCoordinates) {
      return pickupToDropoffDistance;
    }

    const courierToPickupDistance = haversineDistanceKm(courierMapCoordinates, pickupCoordinates);

    if (!Number.isFinite(courierToPickupDistance) || !Number.isFinite(pickupToDropoffDistance)) {
      return pickupToDropoffDistance;
    }

    return courierToPickupDistance + pickupToDropoffDistance;
  }, [
    courierMapCoordinates,
    deliveryRunStopMarkers,
    dropoffMapAddress,
    pickupMapAddress,
    isDeliveryDetailMode,
    isDeliveryRunMode,
    showDeliveryRunProgress,
  ]);
  const routeDistanceLabel = useMemo(
    () => formatRouteDistanceLabel(deliveryRouteDistanceKm),
    [deliveryRouteDistanceKm],
  );
  const currentPositionLines = useMemo(
    () => {
      if ((!isDeliveryDetailMode && !isDeliveryRunMode) || !courierMapCoordinates) {
        return [];
      }

      if (showDeliveryRunProgress) {
        return [
          'GPS do aparelho',
          routeDistanceLabel ? `Rota total: ${routeDistanceLabel}` : 'Corrida em andamento',
          activeRunNextStops.length > 0
            ? `${activeRunNextStops.length} parada(s) restantes`
            : 'Ultima parada',
        ];
      }

      return [
        'GPS do aparelho',
        routeDistanceLabel ? `Rota estimada: ${routeDistanceLabel}` : 'Posição capturada',
      ];
    },
    [
      activeRunNextStops.length,
      courierMapCoordinates,
      isDeliveryDetailMode,
      isDeliveryRunMode,
      routeDistanceLabel,
      showDeliveryRunProgress,
    ],
  );
  const deliveryMapPaths = useMemo(() => {
    if (!isDeliveryDetailMode && !isDeliveryRunMode) {
      return [];
    }

    if (showDeliveryRunProgress) {
      const routePoints = [courierMapCoordinates, ...deliveryRunStopMarkers].filter(Boolean);
      const routes = [];

      for (let index = 0; index < routePoints.length - 1; index += 1) {
        const from = routePoints[index];
        const to = routePoints[index + 1];

        routes.push({
          id: `run-${index + 1}`,
          from,
          to,
          color: index === 0
            ? ppcColors?.accentInfo || '#0EA5E9'
            : ppcColors?.accentSuccess || '#10B981',
        });
      }

      return routes;
    }

    const pickupCoordinates = extractAddressCoordinates(pickupMapAddress);
    const dropoffCoordinates = extractAddressCoordinates(dropoffMapAddress);
    const routes = [];

    if (courierMapCoordinates && pickupCoordinates) {
      routes.push({
        id: 'courier-to-pickup',
        from: courierMapCoordinates,
        to: pickupCoordinates,
        color: ppcColors?.accentInfo || '#0EA5E9',
      });
    }

    if (pickupCoordinates && dropoffCoordinates) {
      routes.push({
        id: 'pickup-to-dropoff',
        from: pickupCoordinates,
        to: dropoffCoordinates,
        color: ppcColors?.accentSuccess || '#10B981',
      });
    }

    return routes;
  }, [
    courierMapCoordinates,
    deliveryRunStopMarkers,
    dropoffMapAddress,
    isDeliveryDetailMode,
    isDeliveryRunMode,
    pickupMapAddress,
    ppcColors?.accentInfo,
    ppcColors?.accentSuccess,
    showDeliveryRunProgress,
  ]);
  const pickupMapMarker = useMemo(
    () =>
      buildDeliveryMapMarker({
        id: 'pickup',
        label: 'Origem',
        address: pickupMapAddress,
        addressLines: pickupAddressLines,
      }),
    [pickupAddressLines, pickupMapAddress],
  );
  const dropoffMapMarker = useMemo(
    () =>
      buildDeliveryMapMarker({
        id: 'dropoff',
        label: 'Destino',
        address: dropoffMapAddress,
        addressLines: dropoffAddressLines,
      }),
    [dropoffAddressLines, dropoffMapAddress],
  );
  const courierMapMarker = useMemo(
    () =>
      showDeliveryRunProgress && courierMapCoordinates
        ? buildDeliveryMapMarker({
            id: 'courier',
            label: 'Posicao atual',
            address: courierCoordinates || courierMapCoordinates,
            addressLines: currentPositionLines,
          })
        : null,
    [courierCoordinates, courierMapCoordinates, currentPositionLines, showDeliveryRunProgress],
  );
  const deliveryMapMarkers = useMemo(
    () =>
      showDeliveryRunProgress
        ? [courierMapMarker, ...deliveryRunStopMarkers].filter(Boolean)
        : [pickupMapMarker, dropoffMapMarker].filter(Boolean),
    [courierMapMarker, deliveryRunStopMarkers, dropoffMapMarker, pickupMapMarker, showDeliveryRunProgress],
  );
  const mapConfig = useMemo(
    () => ({
      ...parseConfigObject(currentCompany?.configs || defaultCompany?.configs || {}),
      addresses: {
        origin: showDeliveryRunProgress ? courierMapMarker || deliveryRunStopMarkers[0] || pickupMapMarker : pickupMapMarker,
        destination: showDeliveryRunProgress
          ? deliveryRunStopMarkers[deliveryRunStopMarkers.length - 1] || dropoffMapMarker
          : dropoffMapMarker,
        markers: deliveryMapMarkers,
      },
    }),
    [
      currentCompany?.configs,
      courierMapMarker,
      defaultCompany?.configs,
      deliveryMapMarkers,
      deliveryRunStopMarkers,
      dropoffMapMarker,
      pickupMapMarker,
      showDeliveryRunProgress,
    ],
  );

  const requestQuotes = useCallback(async () => {
    if (!orderId) {
      return;
    }

    try {
      await orderLogisticsActions.requestQuotes({
        id: orderId,
        __storeMeta: {
          skipSystemError: true,
        },
      });
      await refreshAll();
      showSuccess?.('Cotacoes solicitadas com sucesso.');
    } catch {
    }
  }, [orderId, orderLogisticsActions, refreshAll, showSuccess]);

  const selectQuote = useCallback(
    async quote => {
      if (!orderId || !quote?.id) {
        return;
      }

      try {
        await orderLogisticsActions.selectQuote({
          orderId,
          quoteOrderId: quote.id,
          __storeMeta: {
            skipSystemError: true,
          },
        });
        await refreshAll();
        showSuccess?.('Entrega solicitada com sucesso.');
      } catch {
      }
    },
    [orderId, orderLogisticsActions, refreshAll, showSuccess],
  );

  const runDeliveryAction = useCallback(
    async (path, successMessage) => {
      if ((!orderId && !isDeliveryRunMode) || requestLoading) {
        return;
      }

      try {
        const targetOrderId = normalizeOrderId(path);

        if (!targetOrderId) {
          return;
        }

        if (path.endsWith('/confirm')) {
          await orderLogisticsActions.confirm({
            id: targetOrderId,
            __storeMeta: {
              skipSystemError: true,
            },
          });
        } else if (path.endsWith('/cancel')) {
          await orderLogisticsActions.cancel({
            id: targetOrderId,
            __storeMeta: {
              skipSystemError: true,
            },
          });
        } else if (path.endsWith('/delivered')) {
          await orderLogisticsActions.delivered({
            id: targetOrderId,
            __storeMeta: {
              skipSystemError: true,
            },
          });
        }

        if (isDeliveryRunMode && path.endsWith('/delivered')) {
          await refreshDeliveryQueue();
          showSuccess?.(successMessage);
          return;
        }

        await refreshAll();
        await refreshDeliveryQueue();
        showSuccess?.(successMessage);
      } catch {
      }
    },
    [
      orderLogisticsActions,
      isDeliveryRunMode,
      orderId,
      refreshAll,
      refreshDeliveryQueue,
      requestLoading,
      showSuccess,
    ],
  );

  const handleAcceptDelivery = useCallback(() => {
    void runDeliveryAction(`/orders/${orderId}/confirm`, 'Entrega aceita com sucesso.');
  }, [orderId, runDeliveryAction]);

  const handleCancelDelivery = useCallback(() => {
    void runDeliveryAction(`/orders/${orderId}/cancel`, 'Entrega cancelada com sucesso.');
  }, [orderId, runDeliveryAction]);

  const handleMarkStopDelivered = useCallback(() => {
    const targetOrderId = normalizeOrderId(activeRunCurrentStop?.id || orderId);

    if (!targetOrderId) {
      return;
    }

    void runDeliveryAction(`/orders/${targetOrderId}/delivered`, 'Parada concluida com sucesso.');
  }, [activeRunCurrentStop?.id, orderId, runDeliveryAction]);

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
  if (!logisticsPayload && isRefreshing) {
    return <StateStore mode="orders" loading="Carregando logística..." />;
  }

  if (loadFailed) {
    return (
      <DefaultErrors
        error={orderLogisticsStore?.getters?.error ?? ordersStore?.getters?.error}
        title="Nao foi possivel carregar a logística do pedido."
      />
    );
  }

  const canManageCustomerAndAddress = isManagerOverviewMode;

  return (
    <SafeAreaView style={pageStyles.pageRoot} edges={['bottom']}>
      <OrderStackedTopBar
        navigation={navigation}
        order={deliveryRunDisplayOrder}
        isKds
        showActions={false}
      />

      <ScrollView
        style={pageStyles.pageScroll}
        contentContainerStyle={[
          pageStyles.pageScrollContent,
          {
            paddingBottom: 24 + (insets.bottom || 0) + deliveryAcceptanceSpacer,
          },
        ]}
      >
        <View style={pageStyles.topBarWrap}>
          <SectionCard
            styles={pageStyles}
            title="Entrega"
            headerRight={
              <View style={pageStyles.sectionHeaderRightGroup}>
                <StatusPill
                  styles={pageStyles}
                  label={headerStatusLabel}
                  tone={loadFailed ? 'danger' : isRefreshing ? 'muted' : isClosedOrder ? 'muted' : 'success'}
                />
                <ContextHelpButton
                  title="Entrega"
                  message={helpMessage}
                  accessibilityLabel="Ajuda da entrega"
                />
              </View>
            }
            action={
              <View style={pageStyles.sectionActionRow}>
                {canRequestQuotes ? (
                  <ActionButton
                    styles={pageStyles}
                    label={quoteActionLabel}
                    icon={<MaterialCommunityIcons name="sync" size={18} color={ppcColors?.textPrimary} />}
                    onPress={requestQuotes}
                    disabled={!orderId || requestLoading}
                    primary
                  />
                ) : null}
                <ActionButton
                  styles={pageStyles}
                  label="Atualizar tela"
                  icon={<MaterialCommunityIcons name="reload" size={18} color={ppcColors?.accentInfo} />}
                  onPress={refreshAll}
                  disabled={isRefreshing || requestLoading}
                  secondary
                />
              </View>
            }
          >
            <RouteSummaryStrip
              styles={pageStyles}
              currentPositionLines={currentPositionLines}
              pickupAddressLines={pickupAddressLines}
              dropoffAddressLines={dropoffAddressLines}
              ppcColors={ppcColors}
            />

            <View style={pageStyles.deliveryInfoMetaRow}>
              <CompactInfoChip
                styles={pageStyles}
                icon="cash"
                label={deliveryValueLabel}
                ppcColors={ppcColors}
              />
              <CompactInfoChip
                styles={pageStyles}
                icon="file-document-outline"
                label={deliveryOrderLabel}
                tone="muted"
                ppcColors={ppcColors}
              />
              <CompactInfoChip
                styles={pageStyles}
                icon="check-circle-outline"
                label={deliveryStatusLabel}
                tone={deliveryStatusTone}
                ppcColors={ppcColors}
              />
              {routeDistanceLabel ? (
                <CompactInfoChip
                  styles={pageStyles}
                  icon="map-marker-distance"
                  label={routeDistanceLabel}
                  tone="muted"
                  ppcColors={ppcColors}
                />
              ) : null}
            </View>

            {showDeliveryRunProgress ? (
              <DeliveryRouteProgressCard
                styles={pageStyles}
                currentStop={activeRunCurrentStop || order}
                nextStops={activeRunNextStops}
                routeStrategyLabel={resolveDeliveryRunStrategyLabel(deliveryRunPlan.strategy)}
                routeDistanceLabel={routeDistanceLabel}
                requestLoading={requestLoading}
                onMarkDelivered={handleMarkStopDelivered}
              />
            ) : null}

            {canManageCustomerAndAddress ? (
              <View style={pageStyles.sectionActionRow}>
                <ActionButton
                  styles={pageStyles}
                  label={selectedOrderClientIri ? 'Trocar cliente' : 'Vincular cliente'}
                  icon={<MaterialCommunityIcons name="account" size={18} color={ppcColors?.textPrimary} />}
                  onPress={openCustomerModal}
                  primary
                />
                {selectedOrderClientIri ? (
                  <ActionButton
                    styles={pageStyles}
                    label="Alterar endereco"
                    icon={<MaterialCommunityIcons name="map-marker-outline" size={18} color={ppcColors?.accentInfo} />}
                    onPress={openAddressModal}
                    secondary
                  />
                ) : null}
              </View>
            ) : null}
          </SectionCard>

          {deliveryMapMarkers.length > 0 ? (
            <SectionCard styles={pageStyles} title="Mapa da entrega">
              <View style={pageStyles.mapViewportWrap}>
                <DefaultMap
                  config={mapConfig}
                  paths={deliveryMapPaths}
                  userCoordinates={courierMapCoordinates}
                />
              </View>
            </SectionCard>
          ) : null}

          <SectionCard
            styles={pageStyles}
            title="Detalhes da entrega"
            subtitle="Valor, pedido atual e status aceito"
          >
            <View style={pageStyles.routeGrid}>
              <FieldBlock styles={pageStyles} label="Valor da entrega" value={[deliveryValueLabel]} />
              <FieldBlock styles={pageStyles} label="Pedido atual" value={[deliveryOrderLabel]} />
              <FieldBlock styles={pageStyles} label="Status da entrega" value={[deliveryStatusLabel]} />
            </View>
          </SectionCard>

          {isManagerOverviewMode ? (
            <OrderLogisticsQuotesList
              orderId={orderId}
              order={order}
              onSelectQuote={selectQuote}
              requestLoading={requestLoading}
            />
          ) : null}

          {isRefreshing && logisticsPayload ? (
            <StateStore compact loading="Atualizando logística..." />
          ) : null}
        </View>
      </ScrollView>
      {showDeliveryAcceptanceActions ? (
        <View
          pointerEvents="box-none"
          style={[
            pageStyles.deliveryAcceptanceFloatingWrap,
            {
              bottom: (insets.bottom || 0) + 12,
            },
          ]}
        >
          <DeliveryAcceptanceCard
            styles={pageStyles}
            requestLoading={requestLoading}
            onAccept={handleAcceptDelivery}
            onCancel={handleCancelDelivery}
            containerStyle={pageStyles.deliveryAcceptanceFloatingCard}
          />
        </View>
      ) : null}
      {canManageCustomerAndAddress ? (
        <>
          <CustomerAssignmentModal
            styles={pageStyles}
            visible={customerModalVisible}
            onClose={closeCustomerModal}
            customerSearch={customerSearch}
            onCustomerSearchChange={setCustomerSearch}
            customerSearchLoading={customerSearchLoading}
            customerSearchResults={customerSearchResults}
            selectedOrderClientIri={selectedOrderClientIri}
            customerLinkingId={customerLinkingId}
            onSelectCustomer={handleSelectCustomer}
            onCreateCustomer={openCustomerCreateModal}
            ppcColors={ppcColors}
          />
          <AddCompanyModal
            visible={customerCreateModalVisible}
            onClose={() => setCustomerCreateModalVisible(false)}
            context={{context: 'client'}}
            onSuccess={savedCustomer => {
              void handleCustomerCreated(savedCustomer)
            }}
          />
          <AddressAssignmentModal
            styles={pageStyles}
            visible={addressModalVisible}
            onClose={closeAddressModal}
            selectedOrderClientIri={selectedOrderClientIri}
            selectedOrderClient={localOrderClient}
            selectedOrderAddressIri={selectedOrderAddressIri}
            addressOptionsLoading={addressOptionsLoading}
            addressOptions={addressOptions}
            addressSelectingId={addressSelectingId}
            addressSaveLoading={addressSaveLoading}
            ppcColors={ppcColors}
            addressModalMode={addressModalMode}
            addressForm={addressForm}
            onOpenCreateMode={openAddressCreateMode}
            onAddressFormFieldChange={handleAddressFormFieldChange}
            onSelectAddress={handleSelectAddress}
            onCreateAddress={handleCreateAddress}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
};

export default OrderLogisticsPage;
