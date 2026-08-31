import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';

const TABS = [
  {key: 'pending', label: 'CTEs à emitir', storeName: 'invoice_taxes'},
  {key: 'cte', label: 'CTE', storeName: 'invoice_tasks_processing'},
];

const toInvoiceIds = value =>
  (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(/[,\s]+/))
    .map(item => String(item).replace(/\D+/g, ''))
    .filter(Boolean);

export default function CtePendingInvoicesPage() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('pending');
  const [pendingFilters, setPendingFilters] = useState({});
  const [cteFilters, setCteFilters] = useState({});
  const current = TABS.find(item => item.key === tab) || TABS[0];
  const invoiceStore = useStore('invoice_taxes');
  const tableStore = useStore(current.storeName);
  const selectedIds = toInvoiceIds(invoiceStore?.getters?.selected);
  const showEmit = tab === 'pending' && selectedIds.length > 0;

  const requestParams = useMemo(() => {
    if (current.storeName === 'invoice_tasks_processing') {
      // invoiceModel 57 = CTE - sempre fixo, spread depois não sobrescreve
      return {...cteFilters, invoiceModel: 57};
    }
    if (current.storeName === 'invoice_taxes') {
      return {...pendingFilters};
    }
    return {};
  }, [cteFilters, pendingFilters, current.storeName]);

  useEffect(() => {
    tableStore?.actions?.setReload?.(true);
    tableStore?.actions?.getItems?.({page: 1, itemsPerPage: 50});
  }, [current.storeName]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>CT-e</Text>
        <View style={styles.tabs}>
          {TABS.map(item => (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === 'pending' ? (
        <DefaultExternalFilters storeName="invoice_taxes" filters={pendingFilters} onChangeFilters={setPendingFilters} />
      ) : null}
      {tab === 'cte' ? (
        <DefaultExternalFilters storeName="invoice_tasks_processing" filters={cteFilters} onChangeFilters={setCteFilters} />
      ) : null}
      <DefaultTable key={current.storeName} storeName={current.storeName} requestParams={requestParams} />
      {showEmit ? (
        <Pressable
          testID="cte-emit-button"
          style={styles.emitButton}
          onPress={() => navigation.navigate('CteEmitPage', {ids: selectedIds.join(',')})}>
          <Text style={styles.emitText}>
            Emitir CTE ({selectedIds.length} {selectedIds.length === 1 ? 'NF' : 'NFs'})
          </Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0'},
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10},
  tabs: {flexDirection: 'row', gap: 8},
  tab: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F1F5F9'},
  tabActive: {backgroundColor: '#0EA5E9'},
  tabText: {fontSize: 12, fontWeight: '700', color: '#334155'},
  tabTextActive: {color: '#fff'},
  emitButton: {margin: 16, backgroundColor: '#0F766E', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  emitText: {color: '#fff', fontWeight: '800'},
});
