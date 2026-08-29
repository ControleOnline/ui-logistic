import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {formatMoney} from '@controleonline/ui-logistic/src/shared/ctePendingInvoices';

const toInvoiceIds = value =>
  (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(/[,\s]+/))
    .map(item => String(item).replace(/\D+/g, ''))
    .filter(Boolean);

const readIdsFromLocation = () => {
  if (typeof window === 'undefined' || !window.location?.search) {
    return [];
  }

  const params = new URLSearchParams(window.location.search);
  return toInvoiceIds(params.get('ids') || params.get('selectedIds'));
};

const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');

export default function CteEmitPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const invoiceStore = useStore('invoice_taxes');
  const ids = useMemo(() => {
    const fromRoute = toInvoiceIds(route.params?.ids || route.params?.selectedIds);
    return fromRoute.length ? fromRoute : readIdsFromLocation();
  }, [route.params?.ids, route.params?.selectedIds]);
  const [rows, setRows] = useState([]);
  const [cfop, setCfop] = useState('5353');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const storedItems = Array.isArray(invoiceStore?.getters?.items) ? invoiceStore.getters.items : [];
        const fromStore = storedItems.filter(item => ids.includes(rowId(item)));
        if (fromStore.length === ids.length && ids.length > 0) {
          if (!cancelled) setRows(fromStore);
          return;
        }

        const response = await api.fetch('invoice_taxes/without-cte', {
          params: {itemsPerPage: 200, page: 1},
        });
        const collection = response?.member || response?.['hydra:member'] || response?.response?.member || [];
        const nextRows = collection.filter(item => ids.includes(rowId(item)));
        if (!cancelled) setRows(nextRows);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || String(err));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!ids.length) {
      setRows([]);
      setLoading(false);
      return undefined;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ids.join(',')]);

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Number(row?.invoiceTotal || 0), 0);
    return {
      companyName: rows[0]?.companyName || 'Empresa não informada',
      addressLabel: rows[0]?.addressLabel || 'Endereço não informado',
      invoiceCount: rows.length,
      totalValue: total,
    };
  }, [rows]);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.fetch('invoice_tasks/emit-cte', {
        method: 'POST',
        body: {
          invoiceTaxIds: ids,
          cfop,
        },
      });
      navigation.navigate('CtePendingInvoicesPage');
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Emitir CT-e</Text>
        <Text style={styles.hint}>Campos da NF são somente leitura. Informe o CFOP para enfileirar a emissão.</Text>
        {loading ? <Text style={styles.hint}>Carregando NFs {ids.join(', ')}...</Text> : null}
        <View style={styles.card}>
          <Text style={styles.label}>Empresa</Text>
          <Text style={styles.value}>{summary.companyName}</Text>
          <Text style={styles.label}>Endereço</Text>
          <Text style={styles.value}>{summary.addressLabel}</Text>
          <Text style={styles.label}>NFs</Text>
          <Text style={styles.value}>{summary.invoiceCount}</Text>
          <Text style={styles.label}>Valor das NFs</Text>
          <Text style={styles.value}>{formatMoney(summary.totalValue)}</Text>
        </View>
        {rows.map(row => (
          <View key={rowId(row) || String(row.invoiceNumber)} style={styles.nfCard}>
            <Text style={styles.nfTitle}>NF #{row.invoiceNumber || rowId(row)}</Text>
            <Text style={styles.nfMeta}>Modelo {row.invoiceModel || '—'} · {formatMoney(row.invoiceTotal)}</Text>
            <Text style={styles.nfMeta}>{row.invoiceKey || 'sem chave'}</Text>
          </View>
        ))}
        <Text style={styles.label}>CFOP</Text>
        <TextInput value={cfop} onChangeText={setCfop} style={styles.input} placeholder="5353" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={saving || !ids.length} onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>{saving ? 'Enfileirando...' : 'Enviar para fila de integração'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {padding: 16, paddingBottom: 40},
  title: {fontSize: 20, fontWeight: '800', color: '#0F172A'},
  hint: {marginTop: 6, marginBottom: 14, color: '#64748B'},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12},
  label: {marginTop: 8, fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase'},
  value: {fontSize: 15, fontWeight: '700', color: '#0F172A'},
  nfCard: {backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8},
  nfTitle: {fontWeight: '800', color: '#0F172A'},
  nfMeta: {color: '#64748B', marginTop: 2, fontSize: 12},
  input: {marginTop: 6, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, backgroundColor: '#fff'},
  error: {color: '#B91C1C', marginTop: 10},
  button: {marginTop: 16, backgroundColor: '#0F766E', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  buttonText: {color: '#fff', fontWeight: '800'},
});
