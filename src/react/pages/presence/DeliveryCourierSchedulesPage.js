/*
 * Contract imported from MODOS_OPERACAO.md
 * - Reusable courier schedules are listed from the scoped backend collection.
 * - The courier manages weekly time windows here and the presence screen reuses them by link.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  formatWeekdayLabel,
  normalizeText,
} from '@controleonline/ui-logistic/src/shared/deliveryPresence';
import {resolveCurrentPeopleIri} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';

const PAGE_SIZE = 100;

const buildScheduleSearchText = schedule =>
  [
    schedule?.label,
    schedule?.weekdayLabel,
    schedule?.windowLabel,
    schedule?.active ? 'ativo' : 'inativo',
    schedule?.creationDate,
    schedule?.alterDate,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export default function DeliveryCourierSchedulesPage() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const {showError} = useMessage() || {};
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const schedulesStore = useStore('delivery_courier_schedules');

  const {actions, getters} = schedulesStore;
  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {columns} = getters;

  const currentPeopleIri = useMemo(
    () => resolveCurrentPeopleIri(user),
    [user?.people, user?.peopleId, user?.person, user?.personId],
  );

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [currentCompany?.id, themeColors],
  );

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'weekday',
    direction: 'asc',
  });

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const loadSchedules = async () => {
    if (!currentPeopleIri) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await actions.getItems({
        courier: currentPeopleIri,
      });
      setItems(Array.isArray(response) ? response : []);
    } catch (caughtError) {
      const message =
        caughtError?.message || 'Nao foi possivel carregar os horarios do motoboy.';
      setError(message);
      showError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused || !currentPeopleIri) {
      return;
    }

    loadSchedules();
  }, [currentPeopleIri, isFocused]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = normalizeText(searchText).toLowerCase();
    if (!normalizedSearch) {
      return items;
    }

    return items.filter(item => buildScheduleSearchText(item).includes(normalizedSearch));
  }, [items, searchText]);

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary || '#0EA5E9'} />
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Motoboy nao identificado</Text>
            <Text style={styles.emptyStateText}>
              Os horarios dependem do vinculo `people_link` do tipo `courier`.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.scrollContent}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista de horarios</Text>
            <Text style={styles.sectionText}>
              Use um horario para varias empresas sem duplicar a faixa de tempo.
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor={brandColors.primary || '#0EA5E9'}
              add={false}
              columns={columns}
              data={visibleItems}
              initialViewMode="table"
              isLoading={isLoading}
              onAdd={() => navigation.navigate('DeliveryCourierScheduleFormPage')}
              onEditRow={row =>
                navigation.navigate('DeliveryCourierScheduleFormPage', {
                  id: String(row?.id || '').replace(/\D+/g, ''),
                })
              }
              onRowPress={row =>
                navigation.navigate('DeliveryCourierScheduleFormPage', {
                  id: String(row?.id || '').replace(/\D+/g, ''),
                })
              }
              searchProps={{
                onSearch: setSearchText,
                placeholder: 'Buscar horario, dia ou janela',
                value: searchText,
              }}
              onSortChange={setSortState}
              showColumnFiltersButton={false}
              showRowActions={false}
              sort={sortState}
              storeName="delivery_courier_schedules"
              totalItems={visibleItems.length}
              totalItemsLabel="horarios"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel="Novo horario"
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => navigation.navigate('DeliveryCourierScheduleFormPage')}
          >
            <Text style={styles.primaryButtonText}>Novo horario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel="Atualizar"
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={loadSchedules}
          >
            <Text style={styles.secondaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
