/*
 * Contract imported from MODOS_OPERACAO.md
 * - This editor creates immutable delivery-rate versions, never in-place edits.
 * - Km bands are the main editable rows and each save produces a snapshot payload.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  DELIVERY_RATE_VEHICLE_TYPES,
  buildBandLabel,
  buildGroupPayload,
  createEmptyBand,
  normalizeText,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import styles from './styles';

const normalizeDraft = initialDraft => ({
  groupName: normalizeText(initialDraft?.groupName),
  code: normalizeText(initialDraft?.code),
  vehicleType: normalizeText(initialDraft?.vehicleType),
  bands:
    Array.isArray(initialDraft?.bands) && initialDraft.bands.length > 0
      ? initialDraft.bands.map((band, index) => ({
          taxName: normalizeText(band?.taxName) || `Faixa ${index + 1}`,
          taxDescription: normalizeText(band?.taxDescription),
          kmFrom: normalizeText(band?.kmFrom),
          kmTo: normalizeText(band?.kmTo),
          pricePerKm: normalizeText(band?.pricePerKm),
          minimumTripValue: normalizeText(band?.minimumTripValue),
          minimumDailyValue: normalizeText(band?.minimumDailyValue),
          taxOrder: Number.isFinite(Number(band?.taxOrder)) ? Number(band.taxOrder) : index,
        }))
      : [createEmptyBand(0)],
  companyIds: Array.isArray(initialDraft?.companyIds) ? [...initialDraft.companyIds] : [],
});

const fieldPairs = [
  ['kmFrom', 'Km inicial', 'decimal-pad'],
  ['kmTo', 'Km final', 'decimal-pad'],
  ['pricePerKm', 'Valor por km', 'decimal-pad'],
  ['minimumTripValue', 'Mínimo por viagem', 'decimal-pad'],
  ['minimumDailyValue', 'Mínimo da diária', 'decimal-pad'],
];

const DeliveryRateTableEditor = ({
  accentColor = '#0EA5E9',
  initialDraft = {},
  onCancel = null,
  onSave = null,
  onSaved = null,
  saveLabel = 'Salvar versão',
  title = 'Tabela de entrega',
  subtitle = 'Cadastro da versão e das faixas de km da tabela de entrega.',
  helperText = 'Depois de salvar, você ainda poderá associar empresas ou criar uma nova versão a partir desta base.',
  lockVehicleType = false,
}) => {
  const [draft, setDraft] = useState(() => normalizeDraft(initialDraft));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(normalizeDraft(initialDraft));
  }, [initialDraft]);

  const canSave = useMemo(
    () =>
      Boolean(normalizeText(draft.groupName)) &&
      Boolean(normalizeText(draft.vehicleType)) &&
      Array.isArray(draft.bands) &&
      draft.bands.length > 0,
    [draft.bands, draft.groupName, draft.vehicleType],
  );

  const updateField = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const updateBand = (index, field, value) => {
    setDraft(prev => ({
      ...prev,
      bands: prev.bands.map((band, currentIndex) =>
        currentIndex === index ? { ...band, [field]: value, taxName: field === 'taxName' ? value : band.taxName || `Faixa ${index + 1}` } : band,
      ),
    }));
  };

  const addBand = () => {
    setDraft(prev => ({
      ...prev,
      bands: [...prev.bands, createEmptyBand(prev.bands.length)],
    }));
  };

  const removeBand = index => {
    setDraft(prev => {
      if (prev.bands.length <= 1) {
        return prev;
      }

      const bands = prev.bands.filter((_, currentIndex) => currentIndex !== index);
      return {
        ...prev,
        bands: bands.map((band, bandIndex) => ({
          ...band,
          taxOrder: bandIndex,
          taxName: normalizeText(band.taxName) || `Faixa ${bandIndex + 1}`,
        })),
      };
    });
  };

  const handleSave = async () => {
    if (!canSave || typeof onSave !== 'function') {
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildGroupPayload(draft);
      const saved = await onSave(payload, draft);
      onSaved?.(saved);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Delivery</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroText}>{subtitle}</Text>
        <View style={styles.heroPillRow}>
          {[
            `Faixas: ${draft.bands.length}`,
            `Veículo: ${normalizeText(draft.vehicleType) || 'pendente'}`,
            lockVehicleType ? 'Veículo travado' : 'Veículo editável',
          ].map(pill => (
            <View key={pill} style={styles.heroPill}>
              <Text style={styles.heroPillText}>{pill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Identificação</Text>
          <Text style={styles.sectionText}>
            O nome e o tipo de veículo definem a versão. O código pode ser preenchido ou gerado automaticamente.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Nome da tabela</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex.: Entrega região central"
            placeholderTextColor="#94A3B8"
            value={draft.groupName}
            onChangeText={value => updateField('groupName', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Código da tabela</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Opcional"
            placeholderTextColor="#94A3B8"
            value={draft.code}
            onChangeText={value => updateField('code', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tipo de veículo</Text>
          <View style={styles.segmentedRow}>
            {DELIVERY_RATE_VEHICLE_TYPES.map(option => {
              const active = normalizeText(draft.vehicleType) === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.86}
                  style={[
                    styles.segmentedOption,
                    active ? styles.segmentedOptionActive : null,
                  ]}
                  disabled={lockVehicleType}
                  onPress={() => updateField('vehicleType', option.value)}
                >
                  <Icon
                    name={active ? 'check-circle' : 'circle'}
                    size={15}
                    color={active ? '#FFFFFF' : '#0F172A'}
                  />
                  <Text
                    style={[
                      styles.segmentedLabel,
                      active ? styles.segmentedLabelActive : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Faixas de km</Text>
          <Text style={styles.sectionText}>
            Cada faixa será salva como uma linha imutável da tabela de entrega. A ordem abaixo define a leitura inicial.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          {draft.bands.map((band, bandIndex) => (
            <View key={`${band.taxOrder}-${bandIndex}`} style={styles.bandCard}>
              <View style={styles.bandHeader}>
                <View style={styles.bandTitleWrap}>
                  <Text style={styles.bandIndex}>{buildBandLabel(band)}</Text>
                  <Text style={styles.bandSubtitle}>
                    Faixa {bandIndex + 1} da versão atual
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.bandRemoveButton}
                  onPress={() => removeBand(bandIndex)}
                  disabled={draft.bands.length <= 1}
                >
                  <Icon name="trash-2" size={14} color={draft.bands.length <= 1 ? '#CBD5E1' : '#E11D48'} />
                </TouchableOpacity>
              </View>

              <View style={styles.bandGrid}>
                <View style={styles.bandGridRow}>
                  {fieldPairs.map(([field, label, keyboardType]) => (
                    <View key={field} style={styles.bandField}>
                      <Text style={styles.fieldLabel}>{label}</Text>
                      <TextInput
                        style={[styles.textInput, styles.bandFieldInput]}
                        keyboardType={keyboardType}
                        placeholderTextColor="#94A3B8"
                        placeholder={label}
                        value={band[field]}
                        onChangeText={value => updateBand(bandIndex, field, value)}
                      />
                    </View>
                  ))}
                </View>

                <View style={styles.bandField}>
                  <Text style={styles.fieldLabel}>Observação</Text>
                  <TextInput
                    style={[styles.textInput, styles.bandFieldInput, styles.bandFieldFull]}
                    placeholder="Opcional"
                    placeholderTextColor="#94A3B8"
                    value={band.taxDescription}
                    onChangeText={value => updateBand(bandIndex, 'taxDescription', value)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.86} style={styles.ghostButton} onPress={addBand}>
          <Icon name="plus" size={15} color="#0F172A" />
          <Text style={styles.ghostButtonText}>Adicionar faixa</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        <Text style={styles.helperText}>{helperText}</Text>

        <View style={styles.actionBar}>
          <TouchableOpacity activeOpacity={0.86} style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            style={[
              styles.primaryButton,
              !canSave || isSaving ? styles.primaryButtonDisabled : null,
              { backgroundColor: accentColor },
            ]}
            disabled={!canSave || isSaving}
            onPress={handleSave}
          >
            <Icon name="save" size={15} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {isSaving ? 'Salvando...' : saveLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default DeliveryRateTableEditor;
