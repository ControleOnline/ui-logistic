import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const ActionButton = ({
  styles,
  label,
  icon = null,
  onPress,
  disabled = false,
  primary = false,
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
        success && styles.actionButtonTextSuccess,
        danger && styles.actionButtonTextDanger,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default function DeliveryAcceptanceCard({
  styles,
  requestLoading,
  onAccept,
  onCancel,
  containerStyle = null,
}) {
  return (
    <View style={[styles.deliveryAcceptanceCard, containerStyle]}>
      <View style={styles.deliveryAcceptanceTextWrap}>
        <Text style={styles.deliveryAcceptanceTitle}>Aguardando aceite</Text>
        <Text style={styles.deliveryAcceptanceSubtitle}>
          Aceite a corrida para assumir a entrega ou cancele se nao puder atender.
        </Text>
      </View>
      <View style={styles.deliveryAcceptanceActions}>
        <ActionButton
          styles={styles}
          label="Aceitar corrida"
          icon={<MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
          onPress={onAccept}
          disabled={requestLoading}
          success
          style={styles.deliveryAcceptanceButton}
        />
        <ActionButton
          styles={styles}
          label="Cancelar corrida"
          icon={<MaterialCommunityIcons name="close" size={18} color="#B91C1C" />}
          onPress={onCancel}
          disabled={requestLoading}
          danger
          style={styles.deliveryAcceptanceButton}
        />
      </View>
    </View>
  );
}
