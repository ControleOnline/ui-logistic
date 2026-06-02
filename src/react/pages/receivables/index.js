/* eslint-disable no-unused-vars */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused, useNavigation} from '@react-navigation/native';
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

const RECEIVABLE_COLUMNS = [
  {
    isIdentity: true,
    sortable: true,
    editable: false,
    filters: false,
    name: 'id',
    label: 'id',
    align: 'left',
    to: value => ({
      name: 'InvoiceDetailsPage',
      params: {id: String(value).replace(/\D/g, '')},
    }),
    format: value => `#${value}`,
  },
  {
    sortable: true,
    name: 'payer',
    editable: false,
    filters: false,
    label: 'payer',
    align: 'left',
    sortField: 'payer.name',
    format: value => (value ? `${value?.name} - ${value?.alias}` : '-'),
  },
  {
    sortable: true,
    name: 'dueDate',
    editable: false,
    filters: false,
    label: 'dueDate',
    align: 'left',
    sortField: 'dueDate',
    format: value => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '-'),
  },
  {
    translate: true,
    sortable: true,
    name: 'status',
    editable: false,
    label: 'status',
    align: 'left',
    sortField: 'status.status',
    format: value => value?.status || '-',
  },
  {
    sortable: true,
    name: 'description',
    editable: false,
    filters: false,
    label: 'description',
    align: 'left',
    sortField: 'description',
    format: value => value || '-',
  },
  {
    sortable: true,
    name: 'price',
    editable: false,
    filters: false,
    label: 'price',
    align: 'right',
    sortField: 'price',
    format: value =>
      Number.isFinite(Number(value))
        ? Number(value).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})
        : '-',
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

export default function DeliveryReceivablesPage() {
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const invoiceStore = useStore('invoice');
  const {showError} = useMessage() || {};

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {actions: invoiceActions} = invoiceStore;

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
  const [loadedInvoices, setLoadedInvoices] = useState([]);
  const [reportedTotalItems, setReportedTotalItems] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'dueDate',
    direction: 'desc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const activeQueryKeyRef = useRef('');
  const requestIdRef = useRef(0);

  const totalItems = Number(reportedTotalItems || 0);

  const hasMore = useMemo(() => {
    if (!loadedInvoices.length) {
      return false;
    }

    if (totalItems > 0) {
      return loadedInvoices.length < totalItems;
    }

    return loadedInvoices.length % PAGE_SIZE === 0;
  }, [loadedInvoices.length, totalItems]);

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
        invoiceType: 'invoice',
      };

      if (currentPeopleIri) {
        query.receiver = currentPeopleIri;
      }

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
        const response = await invoiceActions.getItems(buildQuery(page));
        if (activeQueryKeyRef.current !== requestKey) {
          return;
        }
        const pageItems = Array.isArray(response) ? response : [];
        setReportedTotalItems(Number(invoiceStore.getters.totalItems || pageItems.length || 0));
        setLoadedInvoices(prev =>
          replace ? pageItems : appendUniqueById(prev, pageItems),
        );
      } catch (error) {
        showError?.(error?.message || 'Nao foi possivel carregar os recebiveis.');
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildQuery, currentPeopleIri, invoiceActions, invoiceStore, queryKey, showError],
  );

  useEffect(() => {
    if (!isFocused || !currentPeopleIri) {
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setLoadedInvoices([]);
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
          O relatorio de recebiveis depende do vinculo `people_link` do tipo `courier`.
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
            columns={RECEIVABLE_COLUMNS}
            data={loadedInvoices}
            hasMore={hasMore}
            initialViewMode="table"
            isLoading={loadingMore || isLoading}
            add={false}
          onEndReached={loadMore}
          onRowPress={item => {
            const invoiceId = String(item?.id || item?.['@id'] || '').replace(/\D/g, '');
            if (invoiceId) {
              navigation.navigate('InvoiceDetailsPage', {id: invoiceId});
            }
          }}
          searchProps={{
            onSearch: setSearchText,
            placeholder: 'Buscar recebivel',
              value: searchText,
            }}
            onSortChange={setSortState}
            showColumnFiltersButton={false}
            showRowActions={false}
            sort={sortState}
            storeName="invoice"
            totalItems={totalItems}
            totalItemsLabel="recebiveis"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
