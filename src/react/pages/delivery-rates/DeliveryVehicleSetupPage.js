/*
 * Contract imported from MODOS_OPERACAO.md
 * - This screen only registers the courier vehicle in its own dedicated table.
 * - The vehicle record stores a rich identity snapshot with brand, model, year, plate, and optional color.
 * - The first vehicle can be saved before any company courier link exists.
 * - Delivery-rate versions live on a separate screen and are not edited here.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {unwrapHydratorItem} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {
  isDeliveryCourierVehicleComplete,
  normalizeDeliveryCourierVehicle,
  useDeliveryCourierVehiclesCollection,
} from './hooks';
import styles from './styles';

const VEHICLE_OPTIONS = [
  { value: 'moto', label: 'Moto' },
  { value: 'bike', label: 'Bicicleta' },
];

const createVehicleDraft = vehicle => {
  const normalizedVehicle = normalizeDeliveryCourierVehicle(vehicle);

  return {
    vehicleType: normalizedVehicle.vehicleType || 'moto',
    brand: normalizedVehicle.brand || '',
    model: normalizedVehicle.model || '',
    plate: normalizedVehicle.plate || '',
    year: normalizedVehicle.year ? String(normalizedVehicle.year) : '',
    color: normalizedVehicle.color || '',
  };
};

export default function DeliveryVehicleSetupPage() {
  const navigation = useNavigation();
  const {showError, showSuccess} = useMessage() || {};
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const currentPeopleId = useMemo(
    () => String(user?.people || user?.peopleId || user?.person || user?.personId || '').replace(/\D+/g, ''),
    [user?.people, user?.peopleId, user?.person, user?.personId],
  );
  const currentPeopleIri = currentPeopleId ? `/people/${currentPeopleId}` : '';

  const {items: vehicles, isLoading, reload, error} = useDeliveryCourierVehiclesCollection(
    useMemo(() => ({ courier: currentPeopleIri}), [currentPeopleIri]),
    Boolean(currentPeopleIri),
  );

  const currentVehicle = Array.isArray(vehicles) ? vehicles[0] || null : null;

  const [draft, setDraft] = useState(() => createVehicleDraft());
  const [savedAndContinue, setSavedAndContinue] = useState(false);

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  useEffect(() => {
    setDraft(createVehicleDraft(currentVehicle));
  }, [currentVehicle]);

  useEffect(() => {
    if (
      !isLoading &&
      currentVehicle &&
      currentPeopleIri &&
      !savedAndContinue &&
      isDeliveryCourierVehicleComplete(currentVehicle)
    ) {
      navigation.replace('HomePage');
    }
  }, [currentPeopleIri, currentVehicle, isLoading, navigation, savedAndContinue]);

  const canSave =
    Boolean(draft.vehicleType) &&
    Boolean(draft.brand.trim()) &&
    Boolean(draft.model.trim()) &&
    Boolean(draft.plate.trim()) &&
    Boolean(draft.year.trim());

  const updateField = (field, value) => {
    setDraft(prev => ({
      ...prev,
      [field]: field === 'plate' ? String(value || '').toUpperCase() : value,
    }));
  };

  const handleSave = async () => {
    if (!currentPeopleIri) {
      return;
    }

    try {
      const response = await api.fetch('/delivery_courier_vehicles', {
        method: 'POST',
        body: {
          vehicleType: draft.vehicleType,
          brand: draft.brand,
          model: draft.model,
          plate: draft.plate,
          year: draft.year,
          color: draft.color,
        },
      });
      const saved = unwrapHydratorItem(response);

      showSuccess?.('Veículo salvo com sucesso.');
      if (saved?.id) {
        setSavedAndContinue(true);
      }
      await reload();
      navigation.replace('DeliveryRateTablesPage');
    } catch (error) {
      showError?.(error?.message || 'Não foi possível salvar o veículo.');
      throw error;
    }
  };

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>

          <View style={styles.actionBar}>
            <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reload}>
              <Text style={styles.primaryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentPeopleIri) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Cadastro indisponível</Text>
            <Text style={styles.emptyStateText}>
              O veículo só pode ser salvo quando o usuário autenticado estiver identificado.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.scrollContent}>
        <ScrollView contentContainerStyle={{gap: 12}} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tipo de veículo</Text>
              <Text style={styles.sectionText}>
                Este cadastro apenas libera o veículo da sua conta. A tela de tabelas vem depois.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.segmentedRow}>
                {VEHICLE_OPTIONS.map(option => {
                  const active = draft.vehicleType === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.86}
                      style={[
                        styles.segmentedOption,
                        active ? styles.segmentedOptionActive : null,
                      ]}
                      onPress={() => updateField('vehicleType', option.value)}
                    >
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
              <Text style={styles.sectionTitle}>Dados do veículo</Text>
              <Text style={styles.sectionText}>
                Informe os dados completos do veículo. Esses campos são obrigatórios para liberar o acesso do motoboy.
              </Text>
            </View>

            <View style={styles.bandGrid}>
              <View style={styles.bandGridRow}>
                <View style={styles.bandField}>
                  <Text style={styles.fieldLabel}>Marca</Text>
                  <TextInput
                    style={[styles.textInput, styles.bandFieldInput]}
                    placeholder="Ex.: Honda"
                    placeholderTextColor="#94A3B8"
                    value={draft.brand}
                    autoCapitalize="words"
                    onChangeText={value => updateField('brand', value)}
                  />
                </View>

                <View style={styles.bandField}>
                  <Text style={styles.fieldLabel}>Modelo</Text>
                  <TextInput
                    style={[styles.textInput, styles.bandFieldInput]}
                    placeholder="Ex.: CG 160"
                    placeholderTextColor="#94A3B8"
                    value={draft.model}
                    autoCapitalize="words"
                    onChangeText={value => updateField('model', value)}
                  />
                </View>
              </View>

              <View style={styles.bandGridRow}>
                <View style={styles.bandField}>
                  <Text style={styles.fieldLabel}>Ano</Text>
                  <TextInput
                    style={[styles.textInput, styles.bandFieldInput]}
                    placeholder="Ex.: 2024"
                    placeholderTextColor="#94A3B8"
                    value={draft.year}
                    keyboardType="number-pad"
                    maxLength={4}
                    onChangeText={value => updateField('year', value.replace(/\D+/g, ''))}
                  />
                </View>

                <View style={styles.bandField}>
                  <Text style={styles.fieldLabel}>Placa</Text>
                  <TextInput
                    style={[styles.textInput, styles.bandFieldInput]}
                    placeholder="Ex.: ABC1D23"
                    placeholderTextColor="#94A3B8"
                    value={draft.plate}
                    autoCapitalize="characters"
                    maxLength={10}
                    onChangeText={value => updateField('plate', value.replace(/\s+/g, ''))}
                  />
                </View>
              </View>

              <View style={[styles.bandField, styles.bandFieldFull]}>
                <Text style={styles.fieldLabel}>Cor</Text>
                <TextInput
                  style={[styles.textInput, styles.bandFieldInput]}
                  placeholder="Ex.: Preta"
                  placeholderTextColor="#94A3B8"
                  value={draft.color}
                  autoCapitalize="words"
                  onChangeText={value => updateField('color', value)}
                />
              </View>
            </View>
          </View>

          <View style={styles.actionBar}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={[styles.primaryButton, !canSave ? styles.primaryButtonDisabled : null]}
              disabled={!canSave}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>Salvar veículo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
