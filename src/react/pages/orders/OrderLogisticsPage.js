import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
import {normalizeText as normalizeDisplayText, resolveAddressDisplayParts} from '@controleonline/ui-common/src/react/utils/entityDisplay';
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
  const secondary = normalizeDisplayText(
    [parts.district, parts.cityStateLine, parts.postalCode]
      .filter(Boolean)
      .join(' • '),
  );
  const complement = normalizeDisplayText(parts.complement);

  return [primary, secondary, complement].filter(Boolean);
};

const renderContactLines = contact => {
  if (!contact) {
    return ['Contato nao informado.'];
  }

  const lines = [
    normalizeDisplayText(contact.name),
    normalizeDisplayText(contact.phone),
    normalizeDisplayText(contact.email),
  ];

  return lines.filter(Boolean).length ? lines.filter(Boolean) : ['Contato nao informado.'];
};

const SectionCard = ({
  styles,
  title,
  subtitle = '',
  action = null,
  children,
}) => (
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

const Pill = ({styles, label, tone = 'default'}) => (
  <View style={[styles.courierMetaPill, tone === 'accent' && styles.statusPill]}>
    <Text
      style={[
        styles.courierMetaPillText,
        tone === 'accent' && styles.statusPillText,
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

const CourierCard = ({
  styles,
  courier,
  onRequest,
  disabled,
  requestLoading,
}) => (
  <View
    style={[
      styles.courierCard,
      courier?.selected && styles.courierCardSelected,
    ]}
  >
    <View style={styles.courierCardHeader}>
      <Text style={styles.courierCardTitle}>{courier?.label || courier?.name || 'Entregador'}</Text>
      <Text style={styles.courierCardSubtitle}>
        {courier?.phone?.display || courier?.phone?.phone || courier?.email?.email || 'Sem contato informado'}
      </Text>
    </View>

    <View style={styles.courierMetaRow}>
      {courier?.selected ? <Pill styles={styles} tone="accent" label="Selecionado" /> : null}
      {courier?.peopleType ? (
        <Pill styles={styles} label={String(courier.peopleType).toUpperCase()} />
      ) : null}
    </View>

    <ActionButton
      styles={styles}
      label={courier?.selected ? 'Solicitar novamente' : 'Solicitar entrega'}
      icon={<MaterialCommunityIcons name="truck-fast-outline" size={18} color={courier?.selected ? '#FFFFFF' : '#0284C7'} />}
      onPress={onRequest}
      disabled={disabled || requestLoading}
      primary={!courier?.selected}
      secondary={courier?.selected}
    />
  </View>
);

const IntegrationCard = ({
  styles,
  integration,
  onOpenTracking,
  onRequest,
  requestLoading,
}) => {
  const hasPrice = integration?.price !== null && integration?.price !== undefined;
  const priceLabel = hasPrice
    ? Formatter.formatMoney(integration.price)
    : 'Cotacao indisponivel';

  return (
    <View
      style={[
        styles.integrationCard,
        integration?.active && styles.integrationCardActive,
      ]}
    >
      <View style={styles.integrationHeader}>
        <View style={styles.integrationTitleWrap}>
          <Text style={styles.integrationLabel}>{integration?.label || 'Integracao'}</Text>
          <Text style={styles.integrationMeta}>
            {integration?.summary || (integration?.request?.enabled ? 'Disponivel para solicitacao' : 'Consulta apenas')}
          </Text>
        </View>

        {integration?.active ? <Pill styles={styles} tone="accent" label="Ativo" /> : null}
      </View>

      <View style={styles.integrationBody}>
        <Text style={styles.integrationPrice}>{priceLabel}</Text>
        {integration?.eta ? <Text style={styles.integrationEta}>{integration.eta}</Text> : null}
        {integration?.status ? <Text style={styles.integrationStatus}>{integration.status}</Text> : null}
      </View>

      {integration?.trackingUrl ? (
        <TouchableOpacity
          onPress={onOpenTracking}
          disabled={requestLoading || !integration?.trackingUrl}
          style={styles.linkButton}
        >
          <Text style={styles.linkButtonText}>Abrir rastreio</Text>
        </TouchableOpacity>
      ) : null}

      {integration?.request?.enabled ? (
        <ActionButton
          styles={styles}
          label={`Solicitar via ${integration?.label || 'integracao'}`}
          icon={<MaterialCommunityIcons name="send-clock-outline" size={18} color="#FFFFFF" />}
          onPress={() => onRequest?.(integration)}
          disabled={requestLoading}
          primary
        />
      ) : null}
    </View>
  );
};

const OrderLogisticsPage = ({navigation, route}) => {
  const {showError, showSuccess} = useMessage() || {};
  const {ppcColors} = useOrderDetailsVisuals();
  const pageStyles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const insets = useSafeAreaInsets();
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const routeOrder = route?.params?.order || null;
  const order = ordersStore.getters.item || routeOrder;
  const orderId = useMemo(
    () => normalizeOrderId(route?.params?.id || order?.id),
    [order?.id, route?.params?.id],
  );
  const [payload, setPayload] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

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
    if (!orderId || !ordersActions?.get) {
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

  const refreshAll = useCallback(async () => {
    if (!orderId) {
      return;
    }

    setIsRefreshing(true);
    setLoadFailed(false);
    try {
      await Promise.all([refreshOrder(), refreshLogistics()]);
    } catch (error) {
      setLoadFailed(true);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [orderId, refreshLogistics, refreshOrder]);

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

      Promise.all([refreshOrder(), refreshLogistics()])
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
    }, [orderId, refreshLogistics, refreshOrder]),
  );

  const logistics = useMemo(
    () => resolveOrderLogisticsSnapshot({order, ...payload}),
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

  const requestDelivery = useCallback(
    async ({type, deliveryPeopleId = null, integration = null}) => {
      if (!orderId) {
        return;
      }

      if (integration?.frontOnly) {
        const requestedAt = new Date().toISOString();
        setRequestLoading(true);

        try {
          setPayload(previousPayload => {
            if (!previousPayload || typeof previousPayload !== 'object') {
              return previousPayload;
            }

            const updatedIntegrations = Array.isArray(previousPayload.integrations)
              ? previousPayload.integrations.map(card => {
                  if (card?.key !== integration.key) {
                    return {
                      ...card,
                      active: false,
                    };
                  }

                  return {
                    ...card,
                    active: true,
                    status: 'Solicitada no front',
                    summary: 'Solicitação registrada no front',
                    frontOnly: true,
                    request: {
                      ...card.request,
                      enabled: true,
                    },
                  };
                })
              : [];

            const selectedIntegration =
              updatedIntegrations.find(card => card?.key === integration.key) ||
              integration;

            return {
              ...previousPayload,
              integrations: updatedIntegrations,
              currentIntegration: selectedIntegration,
              delivery: {
                ...(previousPayload.delivery || {}),
                currentIntegrationKey: integration.key,
                requestedAt,
                status: 'Solicitada no front',
                trackingUrl:
                  selectedIntegration?.trackingUrl ||
                  previousPayload.delivery?.trackingUrl ||
                  null,
              },
            };
          });

          showSuccess?.('Solicitacao registrada no front.');
        } catch (error) {
          showError?.(formatApiError(error));
        } finally {
          setRequestLoading(false);
        }

        return;
      }

      try {
        setRequestLoading(true);
        const response = await api.fetch(`/marketplace/logistics/orders/${orderId}/request`, {
          method: 'POST',
          body: {
            type,
            delivery_people_id: deliveryPeopleId,
          },
        });

        const result = normalizeActionResult(response);
        if (String(result?.errno ?? '0') !== '0') {
          throw result || response;
        }

        await refreshAll();
        showSuccess?.('Solicitacao enviada com sucesso.');
      } catch (error) {
        showError?.(formatApiError(error));
      } finally {
        setRequestLoading(false);
      }
    },
    [orderId, refreshAll, showError, showSuccess],
  );

  const handleOpenTracking = useCallback(async url => {
    if (!url) {
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      showError?.('Nao foi possivel abrir o rastreio.');
    }
  }, [showError]);

  const handleCourierRegistration = useCallback(() => {
    navigation.navigate('EmployeesIndex', {
      context: ['courier'],
      defaultContext: 'courier',
      defaultPeopleType: 'F',
      selectedContext: 'courier',
    });
  }, [navigation]);

  const isStoreManaged = Boolean(
    String(order?.app ?? '').trim().toUpperCase() === 'POS' ||
      logistics.management?.managedByStore,
  );
  const currentIntegration = logistics.currentIntegration || null;
  const integrations = Array.isArray(logistics.integrations) ? logistics.integrations : [];
  const couriers = Array.isArray(logistics.couriers) ? logistics.couriers : [];
  const trackingUrl = logistics.delivery?.trackingUrl || currentIntegration?.trackingUrl || null;

  if (!orderId) {
    return (
      <SafeAreaView style={pageStyles.pageRoot}>
        <View style={[pageStyles.loadingWrap, {paddingTop: insets.top + 24}]}>
          <Text style={pageStyles.errorText}>Pedido nao identificado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={pageStyles.pageRoot}>
      <ScrollView
        contentContainerStyle={[
          pageStyles.pageScrollContent,
          {paddingBottom: Math.max(24, insets.bottom + 24)},
        ]}
      >
        <View style={pageStyles.topBarWrap}>
          <OrderStackedTopBar
            order={orderHeaderOrder}
            isKds
            showActions={false}
            showBackButton
            onBackPress={() => navigation.goBack()}
          />
        </View>

        {isRefreshing && !payload ? (
          <View style={pageStyles.loadingWrap}>
            <ActivityIndicator size="small" color={ppcColors?.accentInfo || '#0284C7'} />
          </View>
        ) : null}

        {loadFailed ? (
          <SectionCard
            styles={pageStyles}
            title="Falha ao carregar a logistica"
            subtitle="Tente atualizar a pagina para recarregar o resumo da entrega."
            action={(
              <ActionButton
                styles={pageStyles}
                label="Atualizar"
                icon={<MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />}
                onPress={refreshAll}
                primary
              />
            )}
          >
            <Text style={pageStyles.sectionHint}>
              Nao foi possivel obter as informacoes da entrega neste momento.
            </Text>
          </SectionCard>
        ) : null}

        <View style={pageStyles.bodyStack}>
          <SectionCard
            styles={pageStyles}
            title="Resumo da logistica"
            subtitle="Visao curta do pedido, status e entrega."
          >
            <View style={pageStyles.summaryGrid}>
              <FieldBlock
                styles={pageStyles}
                label="Modo"
                value={logistics.management?.label || (isStoreManaged ? 'Gerenciada pela loja' : 'Gerenciada por integracao')}
              />
              <FieldBlock
                styles={pageStyles}
                label="Status"
                value={
                  logistics.delivery?.status ||
                  currentIntegration?.status ||
                  (isStoreManaged ? 'Cotacoes disponiveis' : 'Status indisponivel')
                }
              />
              <FieldBlock
                styles={pageStyles}
                label="Entrega"
                value={
                  logistics.delivery?.deliveryPeople?.label ||
                  currentIntegration?.label ||
                  'Sem entregador selecionado'
                }
              />
            </View>

            {trackingUrl ? (
              <View style={pageStyles.sectionActionRow}>
                <ActionButton
                  styles={pageStyles}
                  label="Abrir rastreio"
                  icon={<MaterialCommunityIcons name="map-marker-path" size={18} color="#0284C7" />}
                  onPress={() => handleOpenTracking(trackingUrl)}
                  secondary
                />
              </View>
            ) : null}
          </SectionCard>

          <SectionCard
            styles={pageStyles}
            title="Rota"
            subtitle="Coleta e entrega em um bloco compacto."
          >
            <View style={pageStyles.routeGrid}>
              <FieldBlock styles={pageStyles} label="Coleta" value={pickupAddressLines} />
              <FieldBlock styles={pageStyles} label="Contato da coleta" value={pickupContactLines} />
              <FieldBlock styles={pageStyles} label="Entrega" value={dropoffAddressLines} />
              <FieldBlock styles={pageStyles} label="Contato da entrega" value={dropoffContactLines} />
            </View>
          </SectionCard>

          {isStoreManaged ? (
            <SectionCard
              styles={pageStyles}
              title="Escolha da entrega"
              subtitle="Entregadores da loja e cotações estimadas no front."
            >
              <View style={pageStyles.selectionGrid}>
                <View style={pageStyles.selectionPanel}>
                  <View style={pageStyles.selectionPanelHeader}>
                    <View style={pageStyles.selectionPanelTitleWrap}>
                      <Text style={pageStyles.selectionPanelTitle}>Entregadores da loja</Text>
                      <Text style={pageStyles.selectionPanelSubtitle}>
                        Use um cadastro local quando a loja ja tem motoboy.
                      </Text>
                    </View>

                    <ActionButton
                      styles={pageStyles}
                      label="Novo entregador"
                      icon={<MaterialCommunityIcons name="account-plus-outline" size={18} color="#0284C7" />}
                      onPress={handleCourierRegistration}
                      secondary
                    />
                  </View>

                  {couriers.length > 0 ? (
                    <View style={pageStyles.compactList}>
                      {couriers.map(courier => (
                        <CourierCard
                          key={courier.id || courier.peopleId}
                          styles={pageStyles}
                          courier={courier}
                          onRequest={() =>
                            requestDelivery({
                              type: 'courier',
                              deliveryPeopleId: courier.peopleId,
                            })
                          }
                          disabled={!courier?.peopleId}
                          requestLoading={requestLoading}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={pageStyles.emptyState}>
                      <Text style={pageStyles.emptyStateTitle}>Nenhum entregador cadastrado</Text>
                      <Text style={pageStyles.emptyStateText}>
                        Cadastre um entregador para solicitar a entrega sem depender das integrações.
                      </Text>
                    </View>
                  )}
                </View>

                <View style={pageStyles.selectionPanel}>
                  <View style={pageStyles.selectionPanelHeader}>
                    <View style={pageStyles.selectionPanelTitleWrap}>
                      <Text style={pageStyles.selectionPanelTitle}>Marketplace</Text>
                      <Text style={pageStyles.selectionPanelSubtitle}>
                        Cotacoes estimadas no front para Uber, iFood e 99 Food.
                      </Text>
                    </View>
                  </View>

                  {integrations.length > 0 ? (
                    <View style={pageStyles.compactList}>
                      {integrations.map(integration => (
                        <IntegrationCard
                          key={integration.key}
                          styles={pageStyles}
                          integration={integration}
                          onOpenTracking={() => handleOpenTracking(integration?.trackingUrl)}
                          onRequest={selectedIntegration =>
                            selectedIntegration?.frontOnly
                              ? requestDelivery({
                                type: selectedIntegration.key,
                                integration: selectedIntegration,
                              })
                              : selectedIntegration?.request?.enabled
                                ? requestDelivery({
                                  type: selectedIntegration.key,
                                  integration: selectedIntegration,
                                })
                                : handleOpenTracking(selectedIntegration?.trackingUrl)
                          }
                          requestLoading={requestLoading}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={pageStyles.emptyState}>
                      <Text style={pageStyles.emptyStateTitle}>Nenhuma integracao disponivel</Text>
                      <Text style={pageStyles.emptyStateText}>
                        Assim que os providers forem configurados, as cotacoes aparecem aqui.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </SectionCard>
          ) : (
            <SectionCard
              styles={pageStyles}
              title="Entrega gerenciada pela plataforma"
              subtitle="Mostramos somente o provider atual e o rastreio."
            >
              {currentIntegration ? (
                <IntegrationCard
                  styles={pageStyles}
                  integration={currentIntegration}
                  onOpenTracking={() => handleOpenTracking(currentIntegration?.trackingUrl)}
                  onRequest={() => handleOpenTracking(currentIntegration?.trackingUrl)}
                  requestLoading={requestLoading}
                />
              ) : (
                <View style={pageStyles.emptyState}>
                  <Text style={pageStyles.emptyStateTitle}>Sem rastreio ativo</Text>
                  <Text style={pageStyles.emptyStateText}>
                    O pedido ainda nao possui informacoes de entrega da plataforma.
                  </Text>
                </View>
              )}
            </SectionCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderLogisticsPage;
