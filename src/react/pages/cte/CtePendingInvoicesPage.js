import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {api} from '@controleonline/ui-common/src/api';
import DefaultTableImportModal from '@controleonline/ui-default/src/react/components/table/DefaultTableImportModal';
import {useStore} from '@store';
import {
  buildRouteSummary,
  CTE_PENDING_ENDPOINT,
  formatMoney,
  unwrapInvoiceCollection,
} from '@controleonline/ui-logistic/src/shared/ctePendingInvoices';

export default function CtePendingInvoicesPage() {
  const peopleStore = useStore('people');
  const {currentCompany} = peopleStore.getters || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [isImportModalVisible, setIsImportModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(CTE_PENDING_ENDPOINT);
      const collection = unwrapInvoiceCollection(response?.response || response);
      setGroups(collection.groups);
    } catch (err) {
      setError(err?.message || String(err));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => buildRouteSummary(groups, selectedIds), [groups, selectedIds]);

  const toggleInvoice = useCallback(invoiceId => {
    const id = String(invoiceId);
    setSelectedIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  }, []);



  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>NFs sem CT-e</Text>
            <Text style={styles.subtitle}>
              Agrupadas por empresa e endereço, sem passar por pedidos.
            </Text>
          </View>
           <Pressable
             style={styles.uploadButton}
             onPress={() => { console.log('Import button pressed'); setIsImportModalVisible(true); }}
             android_ripple={{color: '#fff'}}
           >
             <Icon name="upload-cloud" size={16} color="#fff" style={{marginRight: 6}} />
             <Text style={styles.uploadButtonText}>Importar XML / ZIP</Text>
           </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.summaryCard} testID="cte-route-summary">
        <Text style={styles.summaryTitle}>Resumo da rota</Text>
        <Text style={styles.summaryText}>
          {summary.invoiceCount} NF(s) em {summary.groupCount} grupo(s)
        </Text>
        <Text style={styles.summaryValue}>{formatMoney(summary.totalValue)}</Text>
      </View>
        <ScrollView contentContainerStyle={styles.content}>
        {/* Existing invoice list rendering */}
        {groups.map(group => (
          <View key={group.id} style={styles.groupCard} testID={`cte-group-${group.id}`}>
            <Text style={styles.groupTitle}>{group.companyName}</Text>
            <Text style={styles.groupAddress}>{group.addressLabel}</Text>
            <Text style={styles.groupTotals}>
              {group.invoiceCount} NF(s) · {formatMoney(group.totalValue)}
            </Text>
            {(group.invoices || []).map(invoice => {
              const selected = selectedIds.includes(String(invoice.id));
              return (
                <Pressable
                  key={String(invoice.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Selecionar NF ${invoice.invoiceNumber || invoice.id}`}
                  onPress={() => toggleInvoice(invoice.id)}
                  style={[styles.invoiceRow, selected && styles.invoiceRowSelected]}
                >
                  <View style={{flex: 1}}>
                    <Text style={styles.invoiceTitle}>NF #{invoice.invoiceNumber || invoice.id}</Text>
                    <Text style={styles.invoiceMeta}>
                      Modelo {invoice.invoiceModel || '—'} · {formatMoney(invoice.invoiceTotal)}
                    </Text>
                  </View>
                  <Text style={styles.selectHint}>{selected ? 'Na rota' : 'Incluir'}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <DefaultTableImportModal
        onClose={() => setIsImportModalVisible(false)}
        storeName="invoice_taxes"
        visible={isImportModalVisible}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A'},
  subtitle: {fontSize: 13, color: '#64748B', marginTop: 4},
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  uploadSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dropzoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: '#E0F2FE',
  },
  dropzoneTextWrap: {
    alignItems: 'flex-start',
  },
  dropzoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropzoneHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  messageBoxSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  messageBoxError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  messageText: {fontSize: 13, flex: 1},
  messageTextSuccess: {color: '#065F46', fontWeight: '600'},
  messageTextError: {color: '#991B1B', fontWeight: '600'},
  center: {paddingVertical: 24, alignItems: 'center'},
  errorBox: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {color: '#B91C1C', fontSize: 13},
  summaryCard: {
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  summaryTitle: {fontSize: 13, fontWeight: '800', color: '#0F766E', textTransform: 'uppercase'},
  summaryText: {fontSize: 13, color: '#155E75', marginTop: 6},
  summaryValue: {fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 4},
  content: {padding: 16, paddingBottom: 40},
  empty: {color: '#94A3B8', fontSize: 13},
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  groupTitle: {fontSize: 15, fontWeight: '800', color: '#0F172A'},
  groupAddress: {fontSize: 12, color: '#64748B', marginTop: 4},
  groupTotals: {fontSize: 12, fontWeight: '700', color: '#0369A1', marginTop: 6, marginBottom: 10},
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  invoiceRowSelected: {
    borderColor: '#67E8F9',
    backgroundColor: '#ECFEFF',
  },
  invoiceTitle: {fontSize: 14, fontWeight: '700', color: '#0F172A'},
  invoiceMeta: {fontSize: 11, color: '#64748B', marginTop: 2},
  selectHint: {fontSize: 12, fontWeight: '700', color: '#0284C7'},
});

