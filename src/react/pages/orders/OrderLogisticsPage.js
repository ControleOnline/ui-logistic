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
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
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
  normalizeText as normalizeDisplayText,
  resolveAddressDisplayParts,
} from '@controleonline/ui-common/src/react/utils/entityDisplay';
import {normalizeEntityId, toEntityIri} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import {getOrderChannelLabel, getOrderChannelLogo} from '@assets/ppc/channels';
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
import ContextHelpButton from '@controleonline/ui-common/src/react/components/ContextHelpButton';
import {resolveGoogleMapsSettings} from '@controleonline/ui-common/src/react/utils/googleMapsConfig';
import ShopGoogleMap from '@controleonline/ui-shop/src/react/components/storefront/ShopGoogleMap';
import ShopNativeMap from '@controleonline/ui-shop/src/react/components/storefront/ShopNativeMap';
import resolveOrderLogisticsSnapshot from './orderLogisticsPresentation';
import createStyles from './orderLogisticsPage.styles';

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

const DeliveryRouteMap = ({apiKey, markerPayloads}) =>
  Platform.OS === 'web' ? (
    <ShopGoogleMap apiKey={apiKey} markerPayloads={markerPayloads} />
  ) : (
    <ShopNativeMap apiKey={apiKey} markerPayloads={markerPayloads} />
  );

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

const CompactInfoChip = ({styles, icon, label, tone = 'default', ppcColors}) => (
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
                  <ActivityIndicator size="small" color={ppcColors?.accentInfo} />
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
                  <ActivityIndicator size="small" color={ppcColors?.accentInfo} />
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
                        <ActivityIndicator size="small" color={ppcColors?.accentInfo} />
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
                  <ActivityIndicator size="small" color={ppcColors?.accentInfo} />
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
                        <ActivityIndicator size="small" color={ppcColors?.accentInfo} />
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
  const websocketStore = useStore('websocket');
  const peopleStore = useStore('people');
  const addressStore = useStore('address');
  const ordersActions = ordersStore.actions;
  const ordersActionsRef = useRef(ordersActions);
  const addressActions = addressStore?.actions || {};
  const peopleActions = peopleStore?.actions || {};
  const routeOrder = route?.params?.order || null;
  const order = ordersStore.getters.item || routeOrder;
  const orderId = useMemo(
    () => normalizeOrderId(route?.params?.id || order?.id),
    [order?.id, route?.params?.id],
  );
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

      loadLogisticsData()
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
    }, [loadLogisticsData, orderId]),
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
  const clientContactLines = useMemo(
    () =>
      renderContactLines(
        logistics.route?.dropoffContact || logistics.dropoffContact || localOrderClient,
      ),
    [localOrderClient, logistics.dropoffContact, logistics.route?.dropoffContact],
  );
  const clientAddressLines = useMemo(
    () =>
      renderAddressLines(
        logistics.route?.dropoffAddressParts ||
          logistics.dropoffAddressParts ||
          resolveAddressDisplayParts(localOrderAddress),
      ),
    [localOrderAddress, logistics.dropoffAddressParts, logistics.route?.dropoffAddressParts],
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
    logistics.canQuote && !hasDeliveryOrder && !isClosedOrder && hasDeliveryAddress,
  );
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
  const emptyStateMessage = hasDeliveryAddress
    ? 'Solicite cotações para exibir as opções vinculadas.'
    : 'Informe um endereço de entrega válido para solicitar cotações.';
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


  const companyConfigs = useMemo(
    () => parseConfigObject(currentCompany?.configs || defaultCompany?.configs || {}),
    [currentCompany?.configs, defaultCompany?.configs],
  );
  const googleMapsSettings = useMemo(
    () => resolveGoogleMapsSettings(companyConfigs),
    [companyConfigs],
  );
  const googleMapsApiKey =
    googleMapsSettings.webGoogleMapsApiKey ||
    googleMapsSettings.androidGoogleMapsApiKey ||
    '';
  const deliveryValueLabel = useMemo(
    () =>
      formatQuotePrice(
        selectedQuote?.price ?? logistics.selection.price ?? logistics.order?.price ?? null,
      ),
    [logistics.order?.price, logistics.selection.price, selectedQuote?.price],
  );
  const deliveryMainOrderLabel = useMemo(() => {
    const externalCode = normalizeText(logistics.order?.mainOrder?.externalCode);
    if (externalCode) {
      return '#' + externalCode;
    }

    const mainOrderIdValue = normalizeText(
      logistics.order?.mainOrderId ?? logistics.order?.main_order_id ?? '',
    );

    if (mainOrderIdValue) {
      return '#' + mainOrderIdValue;
    }

    return 'Pedido nao informado';
  }, [logistics.order?.mainOrder?.externalCode, logistics.order?.mainOrderId, logistics.order?.main_order_id]);
  const deliveryStatusLabel = useMemo(
    () =>
      normalizeText(
        logistics.delivery?.status ||
          selectedQuote?.status?.status ||
          logistics.order?.status?.status ||
          logistics.order?.status?.realStatus ||
          '',
      ) || 'Status nao informado',
    [
      logistics.delivery?.status,
      logistics.order?.status?.realStatus,
      logistics.order?.status?.status,
      selectedQuote?.status?.status,
    ],
  );
  const pickupMapMarker = useMemo(
    () =>
      buildDeliveryMapMarker({
        id: 'pickup',
        label: 'Origem',
        address: logistics.route?.pickupAddress || logistics.order?.addressOrigin || null,
        addressLines: pickupAddressLines,
      }),
    [logistics.order?.addressOrigin, logistics.route?.pickupAddress, pickupAddressLines],
  );
  const dropoffMapMarker = useMemo(
    () =>
      buildDeliveryMapMarker({
        id: 'dropoff',
        label: 'Destino',
        address: logistics.route?.dropoffAddress || logistics.order?.addressDestination || null,
        addressLines: dropoffAddressLines,
      }),
    [dropoffAddressLines, logistics.order?.addressDestination, logistics.route?.dropoffAddress],
  );
  const deliveryMapMarkers = useMemo(
    () => [pickupMapMarker, dropoffMapMarker].filter(Boolean),
    [dropoffMapMarker, pickupMapMarker],
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
            <View style={pageStyles.routeGrid}>
              <FieldBlock styles={pageStyles} label="Cliente do pedido" value={clientSummaryLines} />
              <FieldBlock
                styles={pageStyles}
                label="Contato do cliente"
                value={clientContactLines}
              />
            </View>
            <View style={pageStyles.routeGrid}>
              <FieldBlock
                styles={pageStyles}
                label="Endereco de entrega"
                value={clientAddressLines}
              />
              <FieldBlock
                styles={pageStyles}
                label="Status do vinculo"
                value={selectedOrderClientIri ? ['Cliente vinculado'] : ['Sem cliente']}
              />
            </View>

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

            <SectionCard
              styles={pageStyles}
              title="Detalhes da entrega"
              subtitle="Valor, pedido principal e status aceito"
            >
              <View style={pageStyles.routeGrid}>
                <FieldBlock styles={pageStyles} label="Valor da entrega" value={[deliveryValueLabel]} />
                <FieldBlock styles={pageStyles} label="Pedido principal" value={[deliveryMainOrderLabel]} />
                <FieldBlock styles={pageStyles} label="Status da entrega" value={[deliveryStatusLabel]} />
              </View>
            </SectionCard>

            {deliveryMapMarkers.length > 0 ? (
              <SectionCard
                styles={pageStyles}
                title="Mapa da entrega"
                subtitle="Origem e destino da viagem"
              >
                <View style={pageStyles.mapViewportWrap}>
                  <DeliveryRouteMap apiKey={googleMapsApiKey} markerPayloads={deliveryMapMarkers} />
                </View>
                <View style={pageStyles.routeGrid}>
                  <FieldBlock styles={pageStyles} label="Origem" value={pickupAddressLines} />
                  <FieldBlock styles={pageStyles} label="Destino" value={dropoffAddressLines} />
                </View>
              </SectionCard>
            ) : null}

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
                <Text style={pageStyles.emptyStateText}>{emptyStateMessage}</Text>
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
              <ActivityIndicator color={ppcColors?.accentInfo} />
            </View>
          ) : null}
        </View>
      </ScrollView>
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
    </SafeAreaView>
  );
};

export default OrderLogisticsPage;
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
