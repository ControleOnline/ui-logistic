/*
 * Contract imported from MODOS_OPERACAO.md
 * - Courier rate versions are immutable and listed by courier ownership.
 * - Vehicle onboarding happens on a dedicated screen; this screen only manages rate tables.
 * - This screen is the operational entry point after onboarding is complete.
 */

import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {
  filterDeliveryRateGroups,
  normalizeEntityId,
  resolveCompanyLabel,
  sortDeliveryRateGroups,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {
  isDeliveryCourierVehicleComplete,
  useDeliveryCourierVehiclesCollection,
  useDeliveryRateGroupsCollection,
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
  const {columns} = deliveryTaxGroupsStore.getters;

  const currentPeopleId = useMemo(() => normalizePeopleId(user), [user]);
  const currentPeopleIri = currentPeopleId ? `/people/${currentPeopleId}` : '';

  const {items, isLoading, error, reload} = useDeliveryRateGroupsCollection(
    useMemo(() => ({ courier: currentPeopleIri}), [currentPeopleIri]),
    Boolean(currentPeopleIri),
  );
  const {
    items: vehicles,
    isLoading: isVehicleLoading,
    error: vehicleError,
    reload: reloadVehicles,
  } = useDeliveryCourierVehiclesCollection(
    useMemo(() => ({ courier: currentPeopleIri}), [currentPeopleIri]),
    Boolean(currentPeopleIri),
  );

  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'versionNumber',
    direction: 'desc',
  });

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const filteredGroups = useMemo(
    () => filterDeliveryRateGroups(items, searchText),
    [items, searchText],
  );

  const visibleGroups = useMemo(
    () => sortDeliveryRateGroups(filteredGroups, sortState),
    [filteredGroups, sortState],
  );

  const combinedError = error || vehicleError;

  const hasRegisteredVehicle = useMemo(
    () => vehicles.some(vehicle => isDeliveryCourierVehicleComplete(vehicle)),
    [vehicles],
  );

  const openSetup = () => navigation.navigate('DeliveryVehicleSetupPage');

  if (!bootstrapReady || isLoading) {
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
            <Text style={styles.emptyStateTitle}>Usuário não identificado</Text>
            <Text style={styles.emptyStateText}>
              O acesso ao delivery depende do usuário autenticado carregar a sessão corretamente.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.scrollContent}>
        {combinedError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{combinedError}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Versões</Text>
            <Text style={styles.sectionText}>
              Clique em uma linha para ver o histórico. O ícone de edição cria uma nova versão a partir da atual.
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor="#0EA5E9"
              add={!combinedError}
              columns={columns}
              data={visibleGroups}
              initialViewMode="table"
              isLoading={isLoading || isVehicleLoading}
              onAdd={() => (hasRegisteredVehicle ? navigation.navigate('DeliveryRateTableFormPage') : openSetup())}
              onEditRow={row => navigation.navigate('DeliveryRateTableFormPage', { id: String(row?.id || '').replace(/\D+/g, '') })}
              onRowPress={row => navigation.navigate('DeliveryRateVersionPage', { id: String(row?.id || '').replace(/\D+/g, '') })}
              searchProps={{
                onSearch: setSearchText,
                placeholder: 'Buscar tabela, código ou veículo',
                value: searchText,
              }}
              onSortChange={setSortState}
              showColumnFiltersButton={false}
              showRowActions={true}
              sort={sortState}
              storeName="delivery_tax_groups"
              totalItems={visibleGroups.length}
              totalItemsLabel="versões"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.primaryButton}
            onPress={() => {
              reload();
              reloadVehicles();
            }}
          >
            <Text style={styles.primaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reloadVehicles}>
            <Text style={styles.primaryButtonText}>Atualizar veículo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
