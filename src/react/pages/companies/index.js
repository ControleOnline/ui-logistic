/* eslint-disable no-unused-vars */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import {useStore} from '@store';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  normalizeEntityId,
  resolveCurrentPeopleIri,
} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import styles from '../deliveryList.styles';

const PAGE_SIZE = 50;

const COMPANY_COLUMNS = [
  {
    isIdentity: true,
    sortable: true,
    editable: false,
    filters: false,
    name: 'id',
    label: 'id',
    align: 'left',
    format: value => `#${value}`,
  },
  {
    sortable: true,
    name: 'name',
    editable: false,
    filters: false,
    label: 'name',
    align: 'left',
    sortField: 'name',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'alias',
    editable: false,
    filters: false,
    label: 'alias',
    align: 'left',
    sortField: 'alias',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'peopleType',
    editable: false,
    filters: false,
    label: 'peopleType',
    align: 'left',
    sortField: 'peopleType',
    format: value => (String(value || '').toUpperCase() === 'J' ? 'PJ' : 'PF'),
  },
];

const normalizeText = value => String(value || '').trim();

const appendUniqueById = (currentItems, pageItems) => {
  const nextItems = Array.isArray(currentItems) ? [...currentItems] : [];
  const incoming = Array.isArray(pageItems) ? pageItems : [];
  const incomingIds = new Set(incoming.map(item => normalizeEntityId(item)));

  return [
    ...nextItems.filter(item => !incomingIds.has(normalizeEntityId(item))),
    ...incoming,
  ];
};

export default function DeliveryCompaniesPage() {
  const isFocused = useIsFocused();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const {showError} = useMessage() || {};

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {actions: peopleActions} = peopleStore;

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

  const [currentPage, setCurrentPage] = useState(1);
  const [loadedCompanies, setLoadedCompanies] = useState([]);
  const [reportedTotalItems, setReportedTotalItems] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'name',
    direction: 'asc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const activeQueryKeyRef = useRef('');
  const requestIdRef = useRef(0);

  const totalItems = Number(reportedTotalItems || 0);

  const hasMore = useMemo(() => {
    if (!loadedCompanies.length) {
      return false;
    }

    if (totalItems > 0) {
      return loadedCompanies.length < totalItems;
    }

    return loadedCompanies.length % PAGE_SIZE === 0;
  }, [loadedCompanies.length, totalItems]);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        currentPeopleIri,
        searchText: normalizeText(searchText),
        sortField: sortState?.field || '',
        sortDirection: sortState?.direction || '',
      }),
    [currentPeopleIri, searchText, sortState?.direction, sortState?.field],
  );

  const buildQuery = useCallback(
    page => {
      const query = {
        itemsPerPage: PAGE_SIZE,
        page,
        'link.people': currentPeopleIri,
        'link.linkType': 'courier',
        enable: 1,
        peopleType: 'J',
      };

      const normalizedSearch = normalizeText(searchText);
      if (normalizedSearch) {
        query.search = normalizedSearch;
      }

      if (sortState?.field && sortState?.direction) {
        query[`order[${sortState.field}]`] = sortState.direction;
      }

      return query;
    },
    [currentPeopleIri, searchText, sortState],
  );

  const fetchPage = useCallback(
    async (page, replace = false) => {
      if (!currentPeopleIri) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsLoading(true);
      const requestKey = queryKey;
      activeQueryKeyRef.current = requestKey;

      try {
        const response = await peopleActions.getItems(buildQuery(page));
        if (activeQueryKeyRef.current !== requestKey) {
          return;
        }
        const pageItems = Array.isArray(response) ? response : [];
        setReportedTotalItems(Number(peopleStore.getters.totalItems || pageItems.length || 0));
        setLoadedCompanies(prev =>
          replace ? pageItems : appendUniqueById(prev, pageItems),
        );
      } catch (error) {
        showError?.(error?.message || 'Nao foi possivel carregar as empresas homologadas.');
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildQuery, currentPeopleIri, peopleActions, peopleStore, queryKey, showError],
  );

  useEffect(() => {
    if (!isFocused || !currentPeopleIri) {
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setLoadedCompanies([]);
      setReportedTotalItems(0);
      fetchPage(1, true);
    }, 180);

    return () => clearTimeout(timeout);
  }, [currentPeopleIri, fetchPage, isFocused, queryKey]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) {
      return;
    }

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setLoadingMore(true);
    fetchPage(nextPage, false);
  }, [currentPage, fetchPage, hasMore, loadingMore]);

  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;
  const isBootstrapReady =
    Boolean(sessionChecked) && hasCurrentCompany && Boolean(themeColors);

  if (!isBootstrapReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary || '#2563EB'} />
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
      <View style={styles.content}>
        <View style={styles.tableWrap}>
          <DefaultTable
            accentColor={brandColors.primary}
            columns={COMPANY_COLUMNS}
            data={loadedCompanies}
            hasMore={hasMore}
            initialViewMode="table"
            isLoading={loadingMore || isLoading}
            add={false}
            onEndReached={loadMore}
            searchProps={{
              onSearch: setSearchText,
              placeholder: 'Buscar empresa',
              value: searchText,
            }}
            onSortChange={setSortState}
            showColumnFiltersButton={false}
            showRowActions={false}
            sort={sortState}
            storeName="people"
            totalItems={totalItems}
            totalItemsLabel="empresas"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
