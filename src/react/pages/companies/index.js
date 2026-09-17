// fluxo: transportador-cadastro | etapa: carrier-companies | wiki: https://github.com/ControleOnline/app-community/wiki/Venda-Producao
/*
 * Contract imported from MODOS_OPERACAO.md
 * - The courier companies screen now shows presence state, mode and schedule summary per company.
 * - Row press opens the company presence detail screen where the quick online/offline actions live.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  formatDateValue,
  normalizeText,
  resolveAvailabilityStateLabel,
  resolvePeopleLabel,
} from '@controleonline/ui-logistic/src/shared/deliveryPresence';
import {
  normalizeEntityId,
  resolveCurrentPeopleIri,
} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';

const PAGE_SIZE = 100;
const COURIER_LINK_TYPE = 'courier';

const COMPANY_PRESENCE_COLUMNS = [
  {
    isIdentity: true,
    sortable: true,
    editable: false,
    filters: false,
    name: 'id',
    label: 'ID',
    align: 'left',
    format: value => `#${value}`,
  },
  {
    sortable: true,
    name: 'name',
    editable: false,
    filters: false,
    label: 'Empresa',
    align: 'left',
    sortField: 'name',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'alias',
    editable: false,
    filters: false,
    label: 'Alias',
    align: 'left',
    sortField: 'alias',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'panel_enabled',
    editable: false,
    filters: false,
    label: 'Painel',
    align: 'center',
    sortField: 'panel_enabled',
    format: value => (value === false ? 'Sem painel' : 'Ativo'),
  },
  {
    sortable: true,
    name: 'availabilityStateLabel',
    editable: false,
    filters: false,
    label: 'Estado',
    align: 'left',
    sortField: 'availabilityStateLabel',
    format: value => normalizeText(value) || '-',
  },
  {
    sortable: true,
    name: 'availabilityMode',
    editable: false,
    filters: false,
    label: 'Modo',
    align: 'left',
    sortField: 'availabilityMode',
    format: value => {
      const mode = normalizeText(value).toLowerCase();
      if (!mode) {
        return '-';
      }

      return mode === 'manual' ? 'Manual' : 'Automatico';
    },
  },
  {
    sortable: true,
    name: 'effectiveOnline',
    editable: false,
    filters: false,
    label: 'Online',
    align: 'center',
    sortField: 'effectiveOnline',
    format: value => (value ? 'Sim' : 'Nao'),
  },
  {
    sortable: true,
    name: 'schedulesSummary',
    editable: false,
    filters: false,
    label: 'Horarios',
    align: 'left',
    sortField: 'schedulesSummary',
    format: value => normalizeText(value) || '-',
  },
  {
    sortable: true,
    name: 'manualReason',
    editable: false,
    filters: false,
    label: 'Motivo',
    align: 'left',
    sortField: 'manualReason',
    format: value => normalizeText(value) || '-',
  },
  {
    sortable: true,
    name: 'lastOnlineAt',
    editable: false,
    filters: false,
    label: 'Ultima conexao',
    align: 'left',
    sortField: 'lastOnlineAt',
    format: value => formatDateValue(value),
  },
  {
    sortable: true,
    name: 'alterDate',
    editable: false,
    filters: false,
    label: 'Atualizado em',
    align: 'left',
    sortField: 'alterDate',
    format: value => formatDateValue(value),
  },
];

const buildSearchText = row =>
  [
    row?.name,
    row?.alias,
    row?.panel_enabled ? 'painel ativo' : 'sem painel',
    row?.availabilityMode,
    row?.availabilityStateLabel,
    row?.schedulesSummary,
    row?.manualReason,
    row?.lastOnlineAt,
    row?.alterDate,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const isCourierCompany = company =>
  company?.user?.courier_enabled === true ||
  (Array.isArray(company?.permission) && company.permission.includes('courier'));

const buildCompanyPresenceRow = (company, presenceMap) => {
  const companyId = normalizeEntityId(company?.id);
  const presence = presenceMap.get(companyId) || null;

  return {
    ...company,
    companyId,
    presenceId: presence?.id || null,
    presence,
    courier: presence?.courier || null,
    company: company,
    availabilityMode: presence?.availabilityMode || '',
    availabilityStateLabel:
      presence?.availabilityStateLabel || resolveAvailabilityStateLabel(presence),
    effectiveOnline: Boolean(presence?.effectiveOnline ?? presence?.isOnline),
    schedulesSummary: presence?.schedulesSummary || '-',
    manualReason: presence?.manualReason || '',
    lastOnlineAt: presence?.lastOnlineAt || null,
    lastOfflineAt: presence?.lastOfflineAt || null,
    alterDate: presence?.alterDate || null,
  };
};

export default function DeliveryCompaniesPage() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const peopleActions = peopleStore.actions;
  const {actions: presenceActions} = useStore('delivery_courier_company_presences');

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

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

  const [companies, setCompanies] = useState([]);
  const [presenceRows, setPresenceRows] = useState([]);
  const [reportedTotalItems, setReportedTotalItems] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'name',
    direction: 'asc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const totalItems = Number(reportedTotalItems || 0);

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const mergedCompanies = useMemo(() => {
    const presenceMap = new Map();

    presenceRows.forEach(presence => {
      const companyId = normalizeEntityId(presence?.company?.id || presence?.companyId || presence?.company);
      if (!companyId) {
        return;
      }

      presenceMap.set(companyId, presence);
    });

    return companies.map(company => buildCompanyPresenceRow(company, presenceMap));
  }, [companies, presenceRows]);

  const visibleCompanies = useMemo(() => {
    const normalizedSearch = normalizeText(searchText).toLowerCase();
    if (!normalizedSearch) {
      return mergedCompanies;
    }

    return mergedCompanies.filter(company => buildSearchText(company).includes(normalizedSearch));
  }, [mergedCompanies, searchText]);

  const loadCompanies = async () => {
    if (!currentPeopleIri) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [companyList, presenceList] = await Promise.all([
        peopleActions.myCompaniesByLinkType({
          params: {
            linkType: COURIER_LINK_TYPE,
          },
        }),
        presenceActions.getItems({
          courier: currentPeopleIri,
        }),
      ]);

      const courierCompanies = Array.isArray(companyList)
        ? companyList.filter(isCourierCompany)
        : [];

      setCompanies(courierCompanies);
      setPresenceRows(Array.isArray(presenceList) ? presenceList : []);
      setReportedTotalItems(
        Number(
          courierCompanies.length || presenceList?.length || 0,
        ),
      );
    } catch (caughtError) {
      const message =
        caughtError?.message || 'Nao foi possivel carregar as empresas homologadas.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused || !currentPeopleIri) {
      return;
    }

    loadCompanies();
  }, [currentPeopleIri, isFocused]);

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary || '#0EA5E9'} />
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerStateTitle}>
          Nao foi possivel identificar o motoboy logado.
        </Text>
        <Text style={styles.centerStateText}>
          A lista de empresas vem do vinculo `people_link` do tipo `courier`.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background || '#F8FAFC'}]}
      edges={['bottom']}
    >
      <View style={styles.scrollContent}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista de empresas</Text>
            <Text style={styles.sectionText}>
              A lista mostra apenas empresas com vinculo courier ativo do motoboy logado. O estado e o historico sao resolvidos pelo backend com security filter.
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor={brandColors.primary || '#0EA5E9'}
              add={false}
              columns={COMPANY_PRESENCE_COLUMNS}
              data={visibleCompanies}
              initialViewMode="table"
              isLoading={isLoading}
              onRowPress={row =>
                navigation.navigate('DeliveryCourierPresencePage', {
                  companyId: String(row?.id || row?.companyId || '').replace(/\D+/g, ''),
                  company: row,
                })
              }
              searchProps={{
                onSearch: setSearchText,
                placeholder: 'Buscar empresa, estado ou horario',
                value: searchText,
              }}
              onSortChange={setSortState}
              showColumnFiltersButton={false}
              showRowActions={false}
              sort={sortState}
              storeName="delivery_courier_company_presences"
              totalItems={totalItems || visibleCompanies.length}
              totalItemsLabel="empresas"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.primaryButton}
            onPress={() => navigation.navigate('DeliveryCourierSchedulesPage')}
          >
            <Text style={styles.primaryButtonText}>Horarios</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.86} style={styles.secondaryButton} onPress={loadCompanies}>
            <Text style={styles.secondaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
