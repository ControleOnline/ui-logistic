import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useStore} from '@store';
import CteFiscalConfig, {
  resolveFiscalCompanyId,
} from '@controleonline/ui-accounting/src/react/components/fiscal/CteFiscalConfig';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import CteIntegrationActions from './CteIntegrationActions';
import CteCteActions from './CteCteActions';

const TABS = [
  {key: 'pending', label: 'CTEs à emitir', storeName: 'invoice_taxes'},
  {key: 'cte', label: 'CTE', storeName: 'invoice_tasks_processing'},
  {key: 'integrations', label: 'Integrações', storeName: 'integration'},
];

const toInvoiceIds = value =>
  (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(/[,\s]+/))
    .map(item => String(item).replace(/\D+/g, ''))
    .filter(Boolean);

export default function CtePendingInvoicesPage() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('pending');
  const [fiscalConfigVisible, setFiscalConfigVisible] = useState(false);
  const current = TABS.find(item => item.key === tab) || TABS[0];
  const invoiceStore = useStore('invoice_taxes');
  const peopleStore = useStore('people');
  const fiscalCompany = peopleStore?.getters?.currentCompany || null;
  const fiscalCompanyId = resolveFiscalCompanyId(fiscalCompany);
  const currentCompanyIri = fiscalCompanyId ? `/people/${fiscalCompanyId}` : null;
  const selectedIds = toInvoiceIds(invoiceStore?.getters?.selected);
  const showEmit = tab === 'pending' && selectedIds.length > 0;

  const requestParams = useMemo(() => {
    if (!currentCompanyIri) return {};
    if (current.storeName === 'invoice_tasks_processing') return {invoiceModel: 57, provider: currentCompanyIri};
    if (current.storeName === 'integration') return {queueName: 'CteEmission', provider: currentCompanyIri};
    return {provider: currentCompanyIri};
  }, [current.storeName, currentCompanyIri]);

  const rowActionsComponent = useMemo(() => {
    if (current.storeName === 'integration') return CteIntegrationActions;
    if (current.storeName === 'invoice_tasks_processing') return CteCteActions;
    return undefined;
  }, [current.storeName]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>CT-e</Text>
          <Pressable
            testID="cte-fiscal-config-button"
            accessibilityRole="button"
            accessibilityLabel="Configurações fiscais CT-e"
            disabled={!fiscalCompanyId}
            onPress={() => setFiscalConfigVisible(true)}
            style={[styles.configButton, !fiscalCompanyId && styles.configButtonDisabled]}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={20}
              color={fiscalCompanyId ? '#0F172A' : '#94A3B8'}
            />
          </Pressable>
        </View>
        <View style={styles.tabs}>
          {TABS.map(item => (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === 'pending' ? <DefaultExternalFilters storeName="invoice_taxes" /> : null}
      {tab === 'cte' ? <DefaultExternalFilters storeName="invoice_tasks_processing" /> : null}
      {tab === 'integrations' ? <DefaultExternalFilters storeName="integration" /> : null}
      {currentCompanyIri ? (
        <DefaultTable
          key={current.storeName}
          storeName={current.storeName}
          requestParams={requestParams}
          rowActionsComponent={rowActionsComponent}
          showRowActions={Boolean(rowActionsComponent)}
          rowActionsWidth={rowActionsComponent === CteCteActions ? 168 : rowActionsComponent ? 140 : undefined}
          pinRowActions
        />
      ) : (
        <View style={styles.emptyConfigState}>
          <Text style={styles.emptyConfigText}>Selecione a empresa corrente para consultar os documentos fiscais.</Text>
        </View>
      )}
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
      <Modal
        visible={fiscalConfigVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFiscalConfigVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Fiscal CT-e</Text>
                <Text style={styles.modalSubtitle}>{fiscalCompany?.name || fiscalCompany?.alias || `Empresa #${fiscalCompanyId}`}</Text>
              </View>
              <Pressable
                testID="cte-fiscal-config-close"
                accessibilityRole="button"
                accessibilityLabel="Fechar configurações fiscais CT-e"
                onPress={() => setFiscalConfigVisible(false)}
                style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
              </Pressable>
            </View>
            {fiscalCompanyId ? (
              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator>
                <CteFiscalConfig
                  company={fiscalCompany}
                  navigation={navigation}
                />
              </ScrollView>
            ) : (
              <View style={styles.emptyConfigState}>
                <Text style={styles.emptyConfigText}>Empresa corrente não identificada.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0'},
  headerTitleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10},
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A'},
  configButton: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0'},
  configButtonDisabled: {opacity: 0.55},
  tabs: {flexDirection: 'row', gap: 8},
  tab: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F1F5F9'},
  tabActive: {backgroundColor: '#0EA5E9'},
  tabText: {fontSize: 12, fontWeight: '700', color: '#334155'},
  tabTextActive: {color: '#fff'},
  emitButton: {margin: 16, backgroundColor: '#0F766E', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  emitText: {color: '#fff', fontWeight: '800'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.44)', justifyContent: 'center', padding: 16},
  modalPanel: {maxHeight: '92%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1'},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0'},
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  modalSubtitle: {fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2},
  closeButton: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'},
  modalContent: {padding: 12},
  emptyConfigState: {padding: 24},
  emptyConfigText: {fontSize: 13, fontWeight: '700', color: '#64748B'},
});
