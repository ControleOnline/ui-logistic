/*
 * Contract imported from MODOS_OPERACAO.md
 * - Courier rate versions are immutable and listed by courier ownership.
 * - Vehicle onboarding happens on a dedicated screen; this screen only manages rate tables.
 * - Listing is fully driven by DefaultTable + delivery_tax_groups store (no parallel client filter).
 */

import React, {useMemo} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {normalizeEntityId} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {
  isDeliveryCourierVehicleComplete,
  useDeliveryCourierVehiclesCollection,
} from './hooks';
import styles from './styles';

const normalizePeopleId = user =>
  normalizeEntityId(user?.people || user?.peopleId || user?.person || user?.personId || '');

export default function DeliveryRateTablesPage() {
  const navigation = useNavigation();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const deliveryTaxGroupsStore = useStore('delivery_tax_groups');

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {columns, error} = deliveryTaxGroupsStore.getters;

  const currentPeopleId = useMemo(() => normalizePeopleId(user), [user]);
  const currentPeopleIri = currentPeopleId ? `/people/${currentPeopleId}` : '';

  const requestParams = useMemo(
    () => (currentPeopleIri ? {courier: currentPeopleIri} : {}),
    [currentPeopleIri],
  );

  const {
    items: vehicles,
    isLoading: isVehicleLoading,
    error: vehicleError,
    reload: reloadVehicles,
  } = useDeliveryCourierVehiclesCollection(
    useMemo(() => ({courier: currentPeopleIri}), [currentPeopleIri]),
    Boolean(currentPeopleIri),
  );

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const combinedError = error || vehicleError;
  const hasRegisteredVehicle = useMemo(
    () => vehicles.some(vehicle => isDeliveryCourierVehicleComplete(vehicle)),
    [vehicles],
  );

  const openSetup = () => navigation.navigate('DeliveryVehicleSetupPage');

  const reload = () => {
    if (currentPeopleIri && typeof deliveryTaxGroupsStore.actions?.getItems === 'function') {
      deliveryTaxGroupsStore.actions.getItems(requestParams);
    }
    reloadVehicles();
  };

  if (!bootstrapReady || isVehicleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Courier não identificado</Text>
            <Text style={styles.emptyStateText}>
              Faça login com um usuário vinculado a people antes de gerenciar tarifas.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Courier</Text>
          <Text style={styles.heroTitle}>Minhas tabelas de entrega</Text>
          <Text style={styles.heroText}>
            Versões imutáveis das suas tarifas. Use editar para criar uma nova versão a partir da
            atual.
          </Text>
        </View>

        {!hasRegisteredVehicle ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Veículo pendente</Text>
            <Text style={styles.errorText}>
              Cadastre o veículo antes de criar ou editar tabelas de tarifa.
            </Text>
            <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={openSetup}>
              <Text style={styles.primaryButtonText}>Configurar veículo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {combinedError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{String(combinedError)}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Versões</Text>
            <Text style={styles.sectionText}>
              Clique em uma linha para ver o histórico. O ícone de edição cria uma nova versão a
              partir da atual.
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor="#0EA5E9"
              add={!combinedError && hasRegisteredVehicle}
              columns={columns}
              initialViewMode="table"
              onAdd={() =>
                hasRegisteredVehicle
                  ? navigation.navigate('DeliveryRateTableFormPage')
                  : openSetup()
              }
              onEditRow={row =>
                navigation.navigate('DeliveryRateTableFormPage', {
                  id: String(row?.id || '').replace(/\D+/g, ''),
                })
              }
              onRowPress={row =>
                navigation.navigate('DeliveryRateVersionPage', {
                  id: String(row?.id || '').replace(/\D+/g, ''),
                })
              }
              requestParams={requestParams}
              searchProps={{
                compact: true,
                placeholder: 'Buscar tabela, código ou veículo',
                searchKey: 'search',
                storeName: 'delivery_tax_groups',
              }}
              showColumnFiltersButton={false}
              showRowActions
              storeName="delivery_tax_groups"
              totalItemsLabel="versões"
              visibleColumnsPreferenceKey="delivery-rates-courier-tables"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reload}>
            <Text style={styles.primaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.primaryButton}
            onPress={reloadVehicles}>
            <Text style={styles.primaryButtonText}>Atualizar veículo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
