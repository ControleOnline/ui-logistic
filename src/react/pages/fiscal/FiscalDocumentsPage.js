import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useStore} from '@store';
import NfceFiscalConfig from '@controleonline/ui-accounting/src/react/components/fiscal/NfceFiscalConfig';
import NfeFiscalConfig from '@controleonline/ui-accounting/src/react/components/fiscal/NfeFiscalConfig';
import NfseFiscalConfig from '@controleonline/ui-accounting/src/react/components/fiscal/NfseFiscalConfig';
import {resolveFiscalCompanyId} from '@controleonline/ui-accounting/src/react/components/fiscal/CteFiscalConfig';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {
  buildFiscalDocumentRequestParams,
  resolveFiscalDocumentConfig,
} from '@controleonline/ui-logistic/src/shared/fiscalDocuments';
import {NfceDocumentActions, NfeDocumentActions, NfseDocumentActions} from './FiscalDocumentActions';
import CteIntegrationActions from '../cte/CteIntegrationActions';

const TABS = [
  {key: 'pending', labelKey: 'pendingLabel', storeName: 'fiscal_orders_pending'},
  {key: 'emitted', labelKey: 'emittedLabel', storeName: 'invoice_tasks_processing'},
  {key: 'integrations', label: 'Integrações', storeName: 'integration'},
];

const CONFIG_COMPONENTS = {nfce: NfceFiscalConfig, nfe: NfeFiscalConfig, nfse: NfseFiscalConfig};

const resolveStoredFiscalCompany = () => {
  try {
    const session = globalThis.localStorage?.getItem('session');
    const myCompany = JSON.parse(session || '{}')?.mycompany;
    return myCompany ? {id: myCompany} : null;
  } catch {
    return null;
  }
};

export default function FiscalDocumentsPage({documentType}) {
  const navigation = useNavigation();
  const config = resolveFiscalDocumentConfig(documentType);
  const [loadedCompany, setLoadedCompany] = useState(null);
  const [tab, setTab] = useState('pending');
  const [configVisible, setConfigVisible] = useState(false);
  const pendingStore = useStore('fiscal_orders_pending');
  const integrationStore = useStore('integration');
  const peopleStore = useStore('people');
  const currentCompany = peopleStore?.getters?.currentCompany || null;
  const defaultCompany = peopleStore?.getters?.defaultCompany || null;
  const storedCompany = resolveStoredFiscalCompany();
  const fiscalCompany = resolveFiscalCompanyId(currentCompany)
    ? currentCompany
    : resolveFiscalCompanyId(defaultCompany)
      ? defaultCompany
      : loadedCompany || storedCompany;
  const peopleActions = peopleStore?.actions || {};
  const integrationActions = integrationStore?.actions || {};
  const integrationItems = Array.isArray(integrationStore?.getters?.items)
    ? integrationStore.getters.items
    : [];
  const integrationTotalItems = integrationStore?.getters?.totalItems;
  const fiscalCompanyId = resolveFiscalCompanyId(fiscalCompany);
  const currentCompanyIri = fiscalCompanyId ? `/people/${fiscalCompanyId}` : null;
  const current = TABS.find(item => item.key === tab) || TABS[0];
  const requestParams = useMemo(
    () => config && currentCompanyIri
      ? {...buildFiscalDocumentRequestParams(config, current.key), provider: currentCompanyIri}
      : {},
    [config, current.key, currentCompanyIri],
  );
  const FiscalConfig = config ? CONFIG_COMPONENTS[config.key] : null;
  const selectedIds = Array.isArray(pendingStore?.getters?.selected)
    ? pendingStore.getters.selected.map(item => String(item).replace(/\D+/g, '')).filter(Boolean)
    : [];
  const canEmit = current.key === 'pending' && selectedIds.length > 0;
  const rowActionsComponent = current.key === 'emitted'
    ? config.key === 'nfce' ? NfceDocumentActions : config.key === 'nfse' ? NfseDocumentActions : NfeDocumentActions
    : current.key === 'integrations'
      ? CteIntegrationActions
      : undefined;

  useEffect(() => {
    if (resolveFiscalCompanyId(currentCompany) || typeof peopleActions.myCompanies !== 'function') return;
    peopleActions.myCompanies().then(companies => {
      const firstCompany = Array.isArray(companies)
        ? companies.find(company => resolveFiscalCompanyId(company))
        : null;
      if (firstCompany) setLoadedCompany(firstCompany);
    }).catch(() => {});
  }, [currentCompany, peopleActions.myCompanies]);

  useEffect(() => {
    if (
      current.key !== 'integrations' ||
      !currentCompanyIri ||
      typeof integrationActions.getItems !== 'function'
    ) return;

    integrationActions.getItems(requestParams).catch(() => {});
  }, [current.key, currentCompanyIri, integrationActions.getItems, requestParams]);

  if (!config) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{config.title}</Text>
          <Pressable
            testID={`${config.key}-fiscal-config-button`}
            accessibilityRole="button"
            accessibilityLabel={`Configurações fiscais ${config.title}`}
            onPress={() => setConfigVisible(true)}
            style={styles.configButton}>
            <MaterialCommunityIcons name="cog-outline" size={20} color="#0F172A" />
          </Pressable>
        </View>
        <View style={styles.tabs}>
          {TABS.map(item => (
            <Pressable
              key={item.key}
              testID={`${config.key}-${item.key}-tab`}
              accessibilityRole="tab"
              accessibilityState={{selected: tab === item.key}}
              onPress={() => setTab(item.key)}
              style={[styles.tab, tab === item.key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>
                {item.label || config[item.labelKey]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <DefaultExternalFilters storeName={current.storeName} />
      {currentCompanyIri ? (
      <DefaultTable
          key={`${config.key}-${current.key}`}
          data={current.key === 'integrations' ? integrationItems : undefined}
          storeName={current.storeName}
          requestParams={requestParams}
          totalItems={current.key === 'integrations' ? integrationTotalItems : null}
          rowActionsComponent={rowActionsComponent}
          showRowActions={Boolean(rowActionsComponent)}
          rowActionsWidth={current.key === 'integrations' ? 140 : 140}
          pinRowActions
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Selecione a empresa corrente para consultar os documentos fiscais.</Text>
        </View>
      )}
      {canEmit ? (
        <Pressable
          testID="nfce-emit-button"
          accessibilityRole="button"
          accessibilityLabel={`Emitir ${config.title} para ${selectedIds.length} pedido(s)`}
          onPress={() => navigation.navigate(
            config.key === 'nfce' ? 'NfceEmitPage' : config.key === 'nfe' ? 'NfeEmitPage' : 'NfseEmitPage',
            {ids: selectedIds.join(','), provider: currentCompanyIri},
          )}
          style={styles.emitButton}>
          <MaterialCommunityIcons name="file-send-outline" size={18} color="#fff" />
          <Text style={styles.emitText}>Emitir {config.title} ({selectedIds.length})</Text>
        </Pressable>
      ) : null}
      <Modal visible={configVisible} transparent animationType="fade" onRequestClose={() => setConfigVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{config.title}</Text>
              <Pressable
                testID={`${config.key}-fiscal-config-close`}
                accessibilityRole="button"
                accessibilityLabel={`Fechar configurações fiscais ${config.title}`}
                onPress={() => setConfigVisible(false)}
                style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
              </Pressable>
            </View>
            <View style={styles.modalContent}>
              {FiscalConfig ? <FiscalConfig company={fiscalCompany} navigation={navigation} /> : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export const NfcePage = props => <FiscalDocumentsPage {...props} documentType="nfce" />;
export const NfePage = props => <FiscalDocumentsPage {...props} documentType="nfe" />;
export const NfsePage = props => <FiscalDocumentsPage {...props} documentType="nfse" />;

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0'},
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10},
  titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  configButton: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0'},
  tabs: {flexDirection: 'row', gap: 8},
  tab: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F1F5F9'},
  tabActive: {backgroundColor: '#0EA5E9'},
  tabText: {fontSize: 12, fontWeight: '700', color: '#334155'},
  tabTextActive: {color: '#fff'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.44)', justifyContent: 'center', padding: 16},
  modalPanel: {maxHeight: '92%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1'},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0'},
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  closeButton: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'},
  emptyState: {padding: 24},
  emptyStateText: {fontSize: 13, fontWeight: '700', color: '#64748B'},
  modalContent: {padding: 12},
});
