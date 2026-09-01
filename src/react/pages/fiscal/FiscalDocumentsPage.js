import React, {useMemo, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet, Text, Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {
  buildFiscalDocumentRequestParams,
  resolveFiscalDocumentConfig,
} from '@controleonline/ui-logistic/src/shared/fiscalDocuments';

const TABS = [
  {key: 'pending', labelKey: 'pendingLabel', storeName: 'fiscal_orders_pending'},
  {key: 'emitted', labelKey: 'emittedLabel', storeName: 'invoice_tasks_processing'},
  {key: 'integrations', label: 'Integrações', storeName: 'integration'},
];

export default function FiscalDocumentsPage({documentType}) {
  const navigation = useNavigation();
  const config = resolveFiscalDocumentConfig(documentType);
  if (!config) return null;
  const [tab, setTab] = useState('pending');
  const current = TABS.find(item => item.key === tab) || TABS[0];
  const requestParams = useMemo(
    () => buildFiscalDocumentRequestParams(config, current.key),
    [config, current.key],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{config.title}</Text>
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
      <DefaultTable
        key={`${config.key}-${current.key}`}
        storeName={current.storeName}
        requestParams={requestParams}
        pinRowActions
      />
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
  tabs: {flexDirection: 'row', gap: 8},
  tab: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F1F5F9'},
  tabActive: {backgroundColor: '#0EA5E9'},
  tabText: {fontSize: 12, fontWeight: '700', color: '#334155'},
  tabTextActive: {color: '#fff'},
});
