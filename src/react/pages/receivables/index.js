/*
 * Contract from MODOS_OPERACAO.md + ui-crm#25
 * - DELIVERY motoboy view: receivables where the logged courier is the invoice receiver.
 * - Extra filter: homologated companies (people_link link_type=courier) as payer.
 * - Distinct route/menu: DeliveryReceivablesPage / "Recebíveis do motoboy".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveCurrentPeopleIri } from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import {
  buildCompanyFilterOptions,
  buildMotoboyReceivablesParams,
  COURIER_LINK_TYPE,
} from './receivablesHelpers';
import styles from '../deliveryList.styles';

const ALL_COMPANY_ID = '';

export default function DeliveryReceivablesPage() {
  const navigation = useNavigation();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const { user, sessionChecked } = authStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};
  const { currentCompany } = peopleStore.getters || {};
  const peopleActions = peopleStore.actions || {};

  const [selectedCompanyId, setSelectedCompanyId] = useState(ALL_COMPANY_ID);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

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

  const hasCurrentCompany =
    !!currentCompany && Object.keys(currentCompany || {}).length > 0;
  const isBootstrapReady =
    Boolean(sessionChecked) && hasCurrentCompany && Boolean(themeColors);

  const selectedCompanyIri = useMemo(() => {
    if (!selectedCompanyId) return '';
    const match = companyOptions.find(opt => opt.id === selectedCompanyId);
    return match?.iri || '';
  }, [companyOptions, selectedCompanyId]);

  const requestParams = useMemo(
    () =>
      buildMotoboyReceivablesParams({
        receiverIri: currentPeopleIri,
        companyIri: selectedCompanyIri,
      }),
    [currentPeopleIri, selectedCompanyIri],
  );

  const loadCompanyOptions = useCallback(async () => {
    if (typeof peopleActions.myCompaniesByLinkType !== 'function') {
      setCompanyOptions([]);
      return;
    }

    setCompaniesLoading(true);
    try {
      const companyList = await peopleActions.myCompaniesByLinkType({
        params: { linkType: COURIER_LINK_TYPE },
      });
      setCompanyOptions(buildCompanyFilterOptions(companyList));
    } catch (_err) {
      setCompanyOptions([]);
    } finally {
      setCompaniesLoading(false);
    }
  }, [peopleActions]);

  useEffect(() => {
    if (!isBootstrapReady || !currentPeopleIri) return;
    loadCompanyOptions();
  }, [isBootstrapReady, currentPeopleIri, loadCompanyOptions]);

  const openInvoice = useCallback(
    invoice => {
      const invoiceId = String(invoice?.id || invoice?.['@id'] || '').replace(
        /\D/g,
        '',
      );
      if (!invoiceId) return;
      navigation.navigate('InvoiceDetailsPage', { id: invoiceId });
    },
    [navigation],
  );

  const filterChips = useMemo(
    () => [
      { id: ALL_COMPANY_ID, label: 'Todas empresas' },
      ...companyOptions.map(opt => ({ id: opt.id, label: opt.label })),
    ],
    [companyOptions],
  );

  if (!isBootstrapReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={brandColors.primary || '#2563EB'}
        />
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerStateTitle}>
          Não foi possível identificar o motoboy logado.
        </Text>
        <Text style={styles.centerStateText}>
          O relatório de recebíveis depende do vínculo people_link do tipo
          courier.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: brandColors.background || '#F8FAFC' },
      ]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <View style={{ marginBottom: 10, gap: 6 }}>
          <Text
            style={{
              color: '#0F172A',
              fontSize: 16,
              fontWeight: '800',
            }}
          >
            Recebíveis do motoboy
          </Text>
          <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 16 }}>
            Invoices em que você é o receiver. Filtre por empresa homologada.
          </Text>
          {companiesLoading ? (
            <ActivityIndicator
              size="small"
              color={brandColors.primary || '#2563EB'}
            />
          ) : (
            <FlatList
              data={filterChips}
              horizontal
              keyExtractor={item => item.id || 'all'}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              renderItem={({ item }) => {
                const active = selectedCompanyId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedCompanyId(item.id)}
                    style={{
                      backgroundColor: active
                        ? brandColors.primary || '#2563EB'
                        : '#E2E8F0',
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : '#0F172A',
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
        <View style={styles.tableWrap}>
          <DefaultTable
            accentColor={brandColors.primary}
            add={false}
            onRowPress={openInvoice}
            requestParams={requestParams}
            showSearch
            searchPlaceholder="Buscar recebível"
            showRowActions={false}
            sort={{
              direction: 'desc',
              field: 'dueDate',
            }}
            storeName="invoice"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
