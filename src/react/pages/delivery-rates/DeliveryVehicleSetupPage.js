/*
 * Contract imported from MODOS_OPERACAO.md
 * - This screen blocks DELIVERY entry until the courier registers the first vehicle-linked rate version.
 * - The first save creates the immutable base version for moto or bike.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {
  createEmptyTableDraft,
  unwrapHydratorItem,
  normalizeText,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {useDeliveryRateGroupsCollection} from './hooks';
import DeliveryRateTableEditor from './DeliveryRateTableEditor';
import styles from './styles';

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

  const {items: deliveryRateGroups, isLoading, reload, error} = useDeliveryRateGroupsCollection(
    useMemo(() => ({ courier: currentPeopleIri, itemsPerPage: 50 }), [currentPeopleIri]),
    Boolean(currentPeopleIri),
  );

  const hasVehicleVersion = useMemo(
    () => deliveryRateGroups.some(group => normalizeText(group?.vehicleType) !== ''),
    [deliveryRateGroups],
  );

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  useEffect(() => {
    if (!isLoading && hasVehicleVersion && currentPeopleIri) {
      navigation.replace('HomePage');
    }
  }, [currentPeopleIri, hasVehicleVersion, isLoading, navigation]);

  const handleSave = async (payload) => {
    try {
      const response = await api.fetch('/delivery_tax_groups', {
        method: 'POST',
        body: payload,
      });
      const saved = unwrapHydratorItem(response);

      showSuccess?.('Primeira versão da tabela criada.');
      await reload();

      if (saved?.id) {
        navigation.replace('DeliveryRateTableCompaniesPage', { id: String(saved.id) });
      }

      return saved;
    } catch (error) {
      showError?.(error?.message || 'Não foi possível salvar a tabela de entrega.');
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
            <Text style={styles.emptyStateTitle}>Motoboy não identificado</Text>
            <Text style={styles.emptyStateText}>
              O fluxo de entrega depende do vínculo `people_link` do tipo `courier`.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DeliveryRateTableEditor
        initialDraft={createEmptyTableDraft()}
        lockVehicleType={false}
        saveLabel="Salvar e continuar"
        subtitle="Cadastre a primeira tabela da operação. Depois do primeiro save, você poderá associar empresas e criar novas versões."
        title="Cadastro do veículo"
        helperText="O veículo é obrigatório para liberar o app. Esta é a primeira versão imutável da tabela de entrega."
        onCancel={() => navigation.replace('HomePage')}
        onSave={handleSave}
        onSaved={saved => {
          if (!saved?.id) {
            navigation.replace('HomePage');
          }
        }}
      />
    </SafeAreaView>
  );
}
