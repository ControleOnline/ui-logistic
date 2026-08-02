import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const normalizeText = value => String(value ?? '').trim();

const ActionButton = ({
  styles,
  label,
  icon = null,
  onPress,
  disabled = false,
  primary = false,
  secondary = false,
  success = false,
  style = null,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={[
      styles.actionButton,
      primary && styles.actionButtonPrimary,
      secondary && styles.actionButtonSecondary,
      success && styles.actionButtonSuccess,
      disabled && styles.actionButtonDisabled,
      style,
    ]}
  >
    {icon}
    <Text
      style={[
        styles.actionButtonText,
        primary && styles.actionButtonTextPrimary,
        secondary && styles.actionButtonTextSecondary,
        success && styles.actionButtonTextSuccess,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const resolveStopLabel = stop => {
  if (!stop || typeof stop !== 'object') {
    return 'Parada sem identificacao';
  }

  const parts = [];
  const externalCode = normalizeText(stop?.mainOrder?.externalCode);
  const displayId = normalizeText(stop?.displayId || stop?.id || '');
  const customerName = normalizeText(stop?.client?.name || stop?.deliveryContact?.name || '');
  const statusLabel = normalizeText(stop?.status?.status || stop?.status?.realStatus || '');

  if (externalCode) {
    parts.push(`Comanda #${externalCode}`);
  }

  if (displayId) {
    parts.push(`#${displayId}`);
  }

  if (customerName) {
    parts.push(customerName);
  }

  if (statusLabel) {
    parts.push(statusLabel);
  }

  return parts.join(' • ') || 'Parada sem identificacao';
};

export default function DeliveryRouteProgressCard({
  styles,
  currentStop,
  nextStops = [],
  routeStrategyLabel = '',
  routeDistanceLabel = '',
  requestLoading = false,
  onMarkDelivered = null,
  containerStyle = null,
}) {
  const remainingStops = Array.isArray(nextStops) ? nextStops.filter(Boolean) : [];
  const nextStopPreview = remainingStops.slice(0, 4);
  const currentStopLabel = resolveStopLabel(currentStop);
  const routeSummary = routeStrategyLabel
    ? routeDistanceLabel
      ? `${routeStrategyLabel} • ${routeDistanceLabel}`
      : routeStrategyLabel
    : routeDistanceLabel;

  return (
    <View style={[styles.deliveryRunCard, containerStyle]}>
      <View style={styles.deliveryRunHeader}>
        <View style={styles.deliveryRunTextWrap}>
          <Text style={styles.deliveryRunTitle}>Corrida ativa</Text>
          <Text style={styles.deliveryRunSubtitle}>
            {remainingStops.length > 0
              ? `${remainingStops.length} parada(s) restantes antes de liberar o app.`
              : 'Ultima parada da corrida. Ao concluir, o app volta ao estado livre.'}
          </Text>
        </View>

        {routeSummary ? (
          <View style={styles.deliveryRunSummaryPill}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color="#166534" />
            <Text style={styles.deliveryRunSummaryText}>{routeSummary}</Text>
          </View>
        ) : null}
      </View>

      {currentStop ? (
        <View style={styles.deliveryRunCurrentStopCard}>
          <View style={styles.deliveryRunCurrentStopHeader}>
            <View style={styles.deliveryRunCurrentStopTextWrap}>
              <Text style={styles.deliveryRunCurrentStopTitle}>Parada atual</Text>
              <Text style={styles.deliveryRunCurrentStopBody}>{currentStopLabel}</Text>
            </View>

            <View style={styles.deliveryRunCurrentStopBadge}>
              <MaterialCommunityIcons name="map-marker-check" size={14} color="#166534" />
              <Text style={styles.deliveryRunCurrentStopBadgeText}>Ativa</Text>
            </View>
          </View>

          <View style={styles.deliveryRunActions}>
            <ActionButton
              styles={styles}
              label={requestLoading ? 'Atualizando' : 'Marcar como entregue'}
              icon={<MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
              onPress={onMarkDelivered}
              disabled={requestLoading || !currentStop}
              success
              style={styles.deliveryRunActionButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.deliveryRunEmptyState}>
          <Text style={styles.deliveryRunEmptyTitle}>Nenhuma parada ativa</Text>
          <Text style={styles.deliveryRunEmptyText}>
            Quando houver uma corrida em andamento, a parada atual aparece aqui.
          </Text>
        </View>
      )}

      {nextStopPreview.length > 0 ? (
        <View style={styles.deliveryRunNextStops}>
          <Text style={styles.deliveryRunNextStopsTitle}>Próximas paradas</Text>
          {nextStopPreview.map((stop, index) => (
            <View key={`${stop?.id || index}`} style={styles.deliveryRunNextStopItem}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#0EA5E9" />
              <Text style={styles.deliveryRunNextStopText}>{resolveStopLabel(stop)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
