import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api} from '@controleonline/ui-common/src/api';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {
  buildRouteSummary,
  buildTableSummary,
  CTE_PENDING_COLUMNS,
  CTE_PENDING_ENDPOINT,
  unwrapInvoiceCollection,
} from '@controleonline/ui-logistic/src/shared/ctePendingInvoices';

export default function CtePendingInvoicesPage() {
  const peopleStore = useStore('people');
  const invoiceStore = useStore('invoice_taxes');
  const {currentCompany} = peopleStore.getters || {};

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(CTE_PENDING_ENDPOINT);
      const collection = unwrapInvoiceCollection(response?.response || response);
      setInvoices(collection.invoices || []);
      setGroups(collection.groups || []);
    } catch (err) {
      setInvoices([]);
      setGroups([]);
      invoiceStore.getters && (invoiceStore.getters.error = err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, invoiceStore]);

  useEffect(() => {
    load();
  }, [load]);

  const routeSummary = useMemo(
    () => buildRouteSummary(groups, selectedIds),
    [groups, selectedIds],
  );
  const tableSummary = useMemo(() => buildTableSummary(routeSummary), [routeSummary]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>NFs sem CT-e</Text>
        <Text style={styles.subtitle}>
          Agrupadas por empresa e endereço no DefaultTable.
        </Text>
      </View>
      <DefaultTable
        storeName="invoice_taxes"
        columns={CTE_PENDING_COLUMNS}
        data={invoices}
        isLoading={loading}
        onRefresh={load}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showRowActions={false}
        importAction
        onImport={load}
        summary={tableSummary}
        summaryLabels={{
          count: {invoices: 'NFs', groups: 'Grupos'},
          sum: {invoiceTotal: 'Total da rota'},
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A'},
  subtitle: {fontSize: 13, color: '#64748B', marginTop: 4},
});
