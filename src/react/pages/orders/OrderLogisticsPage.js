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
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import AddCompanyModal from '@controleonline/ui-people/src/react/components/AddCompanyModal';
import resolveSystemErrorMessage from '@controleonline/ui-common/src/react/utils/systemErrorMessage';
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
  resolveDeliveryStatusLabel,
  resolveDeliveryStatusTone,
} from '@controleonline/ui-logistic/src/react/utils/deliveryAcceptanceQueue';
import {resolveCurrentPeopleIri} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import ContextHelpButton from '@controleonline/ui-common/src/react/components/ContextHelpButton';
import DefaultMap from '@controleonline/ui-default/src/react/components/map/DefaultMap';
import DeliveryAcceptanceCard from './DeliveryAcceptanceCard';
import OrderLogisticsQuotesList from './OrderLogisticsQuotesList';
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

const RouteSummaryStrip = ({styles, pickupAddressLines, dropoffAddressLines, ppcColors}) => (
  <View style={styles.routeSummaryStrip}>
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
  const authStore = useStore('auth');
  const websocketStore = useStore('websocket');
  const peopleStore = useStore('people');
  const addressStore = useStore('address');
  const ordersActions = ordersStore.actions;
  const ordersActionsRef = useRef(ordersActions);
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
  const isDeliveryDetailMode = Boolean(routeOrder);
  const isManagerOverviewMode = !isDeliveryDetailMode;
  const storeOrder = ordersStore.getters.item || null;
  const order = routeOrder || (normalizeOrderId(storeOrder?.id) === orderId ? storeOrder : null);
  const websocketMessages = Array.isArray(websocketStore.getters.messages)
    ? websocketStore.getters.messages
    : [];
  const peopleGetters = peopleStore?.getters || {};
  const currentCompany = peopleGetters.currentCompany || null;
  const defaultCompany = peopleGetters.defaultCompany || null;
  const currentCompanyId = normalizeText(currentCompany?.id);
  const [payload, setPayload] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [quotesRefreshKey, setQuotesRefreshKey] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
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

  useEffect(() => {
    ordersActionsRef.current = ordersActions;
  }, [ordersActions]);

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

  const refreshOrder = useCallback(async () => {
    const currentOrdersActions = ordersActionsRef.current;

    if (!orderId || typeof currentOrdersActions?.get !== 'function') {
      return null;
    }

    return currentOrdersActions.get({
      id: orderId,
      __storeMeta: {
        preserveItem: true,
      },
    });
  }, [orderId]);

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
    if (!orderId) {
      return null;
    }

    const [, logisticsResponse] = await Promise.all([refreshOrder(), refreshLogistics()]);
    return logisticsResponse;
  }, [orderId, refreshLogistics, refreshOrder]);

  const loadLogisticsData = useCallback(async () => {
    if (!orderId) {
      return null;
    }

    return refreshLogistics();
  }, [orderId, refreshLogistics]);

  const refreshAll = useCallback(async () => {
    if (!orderId) {
      return;
    }

    setIsRefreshing(true);
    setLoadFailed(false);

    try {
      await loadPageData();
      await refreshDeliveryQueue();
      setQuotesRefreshKey(previous => previous + 1);
    } catch (error) {
      showError?.(formatApiError(error));
      setLoadFailed(true);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPageData, orderId, refreshDeliveryQueue]);

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

      const loadInitialData = routeOrder ? loadLogisticsData() : loadPageData()

      loadInitialData
        .catch(error => {
          if (active) {
            setLoadFailed(true);
            showError?.(formatApiError(error));
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
    }, [loadLogisticsData, loadPageData, orderId, routeOrder]),
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
    () => resolveOrderLogisticsSnapshot(buildOrderLogisticsSnapshotSource(order, payload)),
    [order, payload],
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
  const headerStatusLabel = loadFailed
    ? 'Falha ao atualizar'
    : isRefreshing
      ? 'Atualizando'
      : isClosedOrder
        ? 'Fechado'
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
  const deliveryValueLabel = useMemo(
    () =>
      formatQuotePrice(
        selectedQuote?.price ?? logistics.selection.price ?? logistics.order?.price ?? null,
      ),
    [logistics.order?.price, logistics.selection.price, selectedQuote?.price],
  );
  const deliveryOrderLabel = useMemo(() => {
    const orderDisplayId = normalizeText(
      logistics.order?.displayId || logistics.order?.id || orderId || '',
    );

    if (orderDisplayId) {
      return '#' + orderDisplayId;
    }

    return 'Pedido nao informado';
  }, [logistics.order?.displayId, logistics.order?.id, orderId]);
  const deliveryStatusSource = useMemo(
    () =>
      logistics.order?.status?.status ||
      logistics.order?.status?.realStatus ||
      logistics.delivery?.status ||
      selectedQuote?.status?.status ||
      '',
    [
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
  const deliveryAcceptanceSpacer = showDeliveryAcceptanceActions ? 188 : 0;
  const helpMessage = useMemo(
    () =>
      isDeliveryDetailMode
        ? showDeliveryAcceptanceActions
          ? [
              'Resumo desta entrega, rota e mapa.',
              'Aceite ou recuse a corrida para continuar.',
            ]
          : [
              'Resumo desta entrega, rota e mapa.',
              'Os dados exibidos pertencem a esta corrida.',
            ]
        : [
            'Resumo do pedido principal, rota e mapa.',
            'A lista abaixo mostra as ordens vinculadas e o status de cada uma.',
          ],
    [isDeliveryDetailMode, showDeliveryAcceptanceActions],
  );

  useEffect(() => {
    if (!isDeliveryDetailMode) {
      return;
    }

    if (route?.params?.hideBottomToolBar === showDeliveryAcceptanceActions) {
      return;
    }

    navigation?.setParams?.({
      hideBottomToolBar: showDeliveryAcceptanceActions,
    });
  }, [
    isDeliveryDetailMode,
    navigation,
    route?.params?.hideBottomToolBar,
    showDeliveryAcceptanceActions,
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
  const deliveryMapMarkers = useMemo(
    () => [pickupMapMarker, dropoffMapMarker].filter(Boolean),
    [dropoffMapMarker, pickupMapMarker],
  );
  const mapConfig = useMemo(
    () => ({
      ...parseConfigObject(currentCompany?.configs || defaultCompany?.configs || {}),
      addresses: {
        origin: pickupMapMarker,
        destination: dropoffMapMarker,
        markers: deliveryMapMarkers,
      },
    }),
    [
      currentCompany?.configs,
      defaultCompany?.configs,
      deliveryMapMarkers,
      dropoffMapMarker,
      pickupMapMarker,
    ],
  );

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

  const runDeliveryAction = useCallback(
    async (path, successMessage) => {
      if (!orderId || requestLoading) {
        return;
      }

      try {
        setRequestLoading(true);
        const response = await api.fetch(path, {
          method: 'POST',
        });
        const result = normalizeActionResult(response);
        if (String(result?.errno ?? '0') !== '0') {
          throw result || response;
        }

        await refreshAll();
        await refreshDeliveryQueue();
        showSuccess?.(successMessage);
      } catch (error) {
        showError?.(formatApiError(error));
      } finally {
        setRequestLoading(false);
      }
    },
    [orderId, refreshAll, refreshDeliveryQueue, requestLoading, showError, showSuccess],
  );

  const handleAcceptDelivery = useCallback(() => {
    void runDeliveryAction(`/orders/${orderId}/confirm`, 'Entrega aceita com sucesso.');
  }, [orderId, runDeliveryAction]);

  const handleCancelDelivery = useCallback(() => {
    void runDeliveryAction(`/orders/${orderId}/cancel`, 'Entrega cancelada com sucesso.');
  }, [orderId, runDeliveryAction]);

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
  const canManageCustomerAndAddress = isManagerOverviewMode;

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
            <View style={pageStyles.deliveryHeroHeader}>
              <View style={pageStyles.deliveryHeroHeaderText}>
                <Text style={pageStyles.deliveryHeroLabel}>Cliente</Text>
                <Text style={pageStyles.deliveryHeroValue}>
                  {clientSummaryLines[0] || 'Cliente nao informado.'}
                </Text>
                {clientSummaryLines[1] ? (
                  <Text style={pageStyles.deliveryHeroMeta}>{clientSummaryLines[1]}</Text>
                ) : null}
              </View>
              <StatusPill
                styles={pageStyles}
                label={selectedOrderClientIri ? 'Cliente vinculado' : 'Sem cliente'}
                tone={selectedOrderClientIri ? 'success' : 'muted'}
              />
            </View>

            <RouteSummaryStrip
              styles={pageStyles}
              pickupAddressLines={pickupAddressLines}
              dropoffAddressLines={dropoffAddressLines}
              ppcColors={ppcColors}
            />

            <View style={pageStyles.deliveryHeroMetaRow}>
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
            </View>

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
              refreshKey={quotesRefreshKey}
              onSelectQuote={selectQuote}
              requestLoading={requestLoading}
            />
          ) : null}

          <StateStore
            loading={isRefreshing ? 'Atualizando logística...' : false}
            error={
              loadFailed ? 'Nao foi possivel atualizar as cotacoes. Tente novamente.' : false
            }
          />
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
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
