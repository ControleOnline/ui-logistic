import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';

const TABS = [
  {key: 'pending', label: 'CTEs à emitir', storeName: 'invoice_taxes'},
  {key: 'processing', label: 'Em processamento', storeName: 'invoice_tasks_processing'},
  {key: 'emitted', label: 'Emitidos', storeName: 'invoice_tasks_emitted'},
];

export default function CtePendingInvoicesPage() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('pending');
  const invoiceStore = useStore('invoice_taxes');
  const selected = Array.isArray(invoiceStore?.getters?.selected) ? invoiceStore.getters.selected : [];
  const current = TABS.find(item => item.key === tab) || TABS[0];
  const showEmit = tab === 'pending' && selected.length > 1;

  const items = useMemo(() => invoiceStore?.getters?.items || [], [invoiceStore?.getters?.items]);
  const selectedRows = items.filter(row => selected.includes(String(row?.id)));

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
      <DefaultTable storeName={current.storeName} />
      {showEmit ? (
        <Pressable
          testID="cte-emit-button"
          style={styles.emitButton}
          onPress={() => navigation.navigate('CteEmitPage', {selectedIds: selected, rows: selectedRows})}
        >
          <Text style={styles.emitText}>Emitir CTE ({selected.length} NFs)</Text>
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
