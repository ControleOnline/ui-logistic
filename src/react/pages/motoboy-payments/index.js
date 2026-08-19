/*
 * Contract from MODOS_OPERACAO.md + ui-crm#25
 * - Company view: payments the current company makes to motoboys (payer = company).
 * - Extra filter: motoboys linked via people_link link_type=courier.
 * - Distinct route/menu: DeliveryMotoboyPaymentsPage / "Pagamentos a motoboys".
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
import {
  buildCompanyMotoboyPaymentsParams,
  buildMotoboyFilterOptions,
  COURIER_LINK_TYPE,
  normalizeEntityId,
  toPeopleIri,
} from '../receivables/receivablesHelpers';
import styles from '../deliveryList.styles';

const ALL_MOTOBOY_ID = '';

export default function DeliveryMotoboyPaymentsPage() {
  const navigation = useNavigation();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const peopleLinkStore = useStore('people_link');

  const { sessionChecked } = authStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};
  const { currentCompany } = peopleStore.getters || {};
  const peopleLinkActions = peopleLinkStore?.actions || {};

  const [selectedMotoboyId, setSelectedMotoboyId] = useState(ALL_MOTOBOY_ID);
  const [motoboyOptions, setMotoboyOptions] = useState([]);
  const [motoboysLoading, setMotoboysLoading] = useState(false);

  const currentCompanyId = useMemo(
    () => normalizeEntityId(currentCompany),
    [currentCompany],
  );
  const currentCompanyIri = useMemo(
    () => toPeopleIri(currentCompanyId),
    [currentCompanyId],
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

  const selectedMotoboyIri = useMemo(() => {
    if (!selectedMotoboyId) return '';
    const match = motoboyOptions.find(opt => opt.id === selectedMotoboyId);
    return match?.iri || '';
  }, [motoboyOptions, selectedMotoboyId]);

  const requestParams = useMemo(
    () =>
      buildCompanyMotoboyPaymentsParams({
        payerIri: currentCompanyIri,
        motoboyIri: selectedMotoboyIri,
      }),
    [currentCompanyIri, selectedMotoboyIri],
  );

  const loadMotoboyOptions = useCallback(async () => {
    if (
      !currentCompanyIri ||
      typeof peopleLinkActions.getItems !== 'function'
    ) {
      setMotoboyOptions([]);
      return;
    }

    setMotoboysLoading(true);
    try {
      const links = await peopleLinkActions.getItems({
        company: currentCompanyIri,
        linkType: COURIER_LINK_TYPE,
      });
      setMotoboyOptions(buildMotoboyFilterOptions(links));
    } catch (_err) {
      setMotoboyOptions([]);
    } finally {
      setMotoboysLoading(false);
    }
  }, [currentCompanyIri, peopleLinkActions]);

  useEffect(() => {
    if (!isBootstrapReady || !currentCompanyIri) return;
    loadMotoboyOptions();
  }, [isBootstrapReady, currentCompanyIri, loadMotoboyOptions]);

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
      { id: ALL_MOTOBOY_ID, label: 'Todos motoboys' },
      ...motoboyOptions.map(opt => ({ id: opt.id, label: opt.label })),
    ],
    [motoboyOptions],
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

  if (!currentCompanyIri) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerStateTitle}>Empresa não identificada</Text>
        <Text style={styles.centerStateText}>
          Selecione a empresa para ver os pagamentos a motoboys (invoices em
          que a empresa é o payer).
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
            Pagamentos a motoboys
          </Text>
          <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 16 }}>
            Invoices em que a empresa é o payer. Filtre por motoboy homologado.
          </Text>
          {motoboysLoading ? (
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
                const active = selectedMotoboyId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedMotoboyId(item.id)}
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
            searchProps={{
              placeholder: 'Buscar pagamento',
            }}
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
