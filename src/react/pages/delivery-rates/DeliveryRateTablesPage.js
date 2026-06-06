/*
 * Contract imported from MODOS_OPERACAO.md
 * - Courier rate versions are immutable and listed by courier ownership.
 * - This screen is the operational entry point after onboarding is complete.
 */

/* eslint-disable no-unused-vars */

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
import {useDeliveryRateGroupsCollection} from './hooks';
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
    useMemo(() => ({ courier: currentPeopleIri, itemsPerPage: 100 }), [currentPeopleIri]),
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

  const hasVehicleVersion = useMemo(
    () => items.some(group => Boolean(group?.vehicleType)),
    [items],
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
            <Text style={styles.emptyStateTitle}>Motoboy não identificado</Text>
            <Text style={styles.emptyStateText}>
              A lista de tabelas depende do vínculo `people_link` do tipo `courier`.
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
          <Text style={styles.heroTitle}>Minhas tabelas</Text>
          <Text style={styles.heroText}>
            Tabelas imutáveis com km por faixa, valor mínimo por viagem e valor mínimo da diária.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{visibleGroups.length} versões</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {hasVehicleVersion ? 'Veículo liberado' : 'Veículo pendente'}
              </Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {resolveCompanyLabel(currentCompany)}
              </Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error}</Text>
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
              add={!error}
              columns={columns}
              data={visibleGroups}
              initialViewMode="table"
              isLoading={isLoading}
              onAdd={() => (hasVehicleVersion ? navigation.navigate('DeliveryRateTableFormPage') : openSetup())}
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
          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reload}>
            <Text style={styles.primaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
