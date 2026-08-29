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

const Field = ({label, value}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '—'}</Text>
  </View>
);

const InputField = ({label, value, onChangeText, placeholder, keyboardType}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      style={styles.input}
    />
  </View>
);

export default function CteEmitPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const invoiceStore = useStore('invoice_taxes');
  const ids = useMemo(() => {
    const fromRoute = toInvoiceIds(route.params?.ids || route.params?.selectedIds);
    return fromRoute.length ? fromRoute : readIdsFromLocation();
  }, [route.params?.ids, route.params?.selectedIds]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    cfop: '5353',
    modal: '01',
    tipoServico: '0',
    tipoCte: '0',
    tomador: '3',
    natureza: 'PRESTACAO DE SERVICO DE TRANSPORTE',
    rntrc: '',
    valorFrete: '',
    valorReceber: '',
    observacao: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const setField = (key, value) => setForm(current => ({...current, [key]: value}));

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
    const first = rows[0] || {};
    return {
      companyName: first.companyName || first.issuerName || 'Empresa não informada',
      issuerName: first.issuerName || first.companyName || 'Emitente não informado',
      clientName: first.clientName || 'Destinatário não informado',
      providerName: first.providerName || 'Remetente não informado',
      carrierName: first.carrierName || 'Transportadora não informada',
      addressLabel: first.addressLabel || 'Endereço não informado',
      providerAddressLabel: first.providerAddressLabel || first.addressLabel || 'Endereço não informado',
      clientAddressLabel: first.clientAddressLabel || 'Endereço não informado',
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
          cfop: form.cfop,
          extra: form,
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
        <Text style={styles.hint}>Dados das NFs em leitura. Preencha os campos do CT-e para enfileirar a emissão.</Text>
        {loading ? <Text style={styles.hint}>Carregando NFs {ids.join(', ')}...</Text> : null}

        <View style={styles.card}>
          <Text style={styles.section}>Dados das NFs</Text>
          <Field label="Empresa / emitente" value={summary.issuerName} />
          <Field label="Remetente" value={summary.providerName} />
          <Field label="Destinatário" value={summary.clientName} />
          <Field label="Transportadora" value={summary.carrierName} />
          <Field label="Endereço do emitente" value={summary.addressLabel} />
          <Field label="Endereço do remetente" value={summary.providerAddressLabel} />
          <Field label="Endereço do destinatário" value={summary.clientAddressLabel} />
          <Field label="Quantidade de NFs" value={String(summary.invoiceCount)} />
          <Field label="Valor das NFs" value={formatMoney(summary.totalValue)} />
        </View>

        {rows.map(row => (
          <View key={rowId(row) || String(row.invoiceNumber)} style={styles.nfCard}>
            <Text style={styles.nfTitle}>NF #{row.invoiceNumber || rowId(row)}</Text>
            <Text style={styles.nfMeta}>Modelo {row.invoiceModel || '—'} · {formatMoney(row.invoiceTotal)}</Text>
            <Text style={styles.nfMeta}>Destinatário: {row.clientName || '—'}</Text>
            <Text style={styles.nfMeta}>Remetente: {row.providerName || '—'}</Text>
            <Text style={styles.nfMeta}>{row.invoiceKey || 'sem chave'}</Text>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.section}>Dados do CT-e</Text>
          <InputField label="CFOP" value={form.cfop} onChangeText={value => setField('cfop', value)} placeholder="5353" />
          <InputField label="Modal (01 rodoviário)" value={form.modal} onChangeText={value => setField('modal', value)} placeholder="01" />
          <InputField label="Tipo de serviço (0 normal)" value={form.tipoServico} onChangeText={value => setField('tipoServico', value)} placeholder="0" />
          <InputField label="Tipo do CT-e (0 normal)" value={form.tipoCte} onChangeText={value => setField('tipoCte', value)} placeholder="0" />
          <InputField label="Tomador (0 remetente, 3 destinatário)" value={form.tomador} onChangeText={value => setField('tomador', value)} placeholder="3" />
          <InputField label="Natureza da prestação" value={form.natureza} onChangeText={value => setField('natureza', value)} />
          <InputField label="RNTRC" value={form.rntrc} onChangeText={value => setField('rntrc', value)} placeholder="RNTRC da transportadora" />
          <InputField label="Valor do frete" value={form.valorFrete} onChangeText={value => setField('valorFrete', value)} keyboardType="decimal-pad" placeholder="0,00" />
          <InputField label="Valor a receber" value={form.valorReceber} onChangeText={value => setField('valorReceber', value)} keyboardType="decimal-pad" placeholder="0,00" />
          <InputField label="Observação" value={form.observacao} onChangeText={value => setField('observacao', value)} placeholder="Informações complementares" />
        </View>

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
  section: {fontSize: 13, fontWeight: '800', color: '#0F766E', textTransform: 'uppercase', marginBottom: 4},
  field: {marginTop: 8},
  label: {fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase'},
  value: {fontSize: 15, fontWeight: '700', color: '#0F172A'},
  nfCard: {backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8},
  nfTitle: {fontWeight: '800', color: '#0F172A'},
  nfMeta: {color: '#64748B', marginTop: 2, fontSize: 12},
  input: {marginTop: 6, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, backgroundColor: '#fff'},
  error: {color: '#B91C1C', marginTop: 10},
  button: {marginTop: 16, backgroundColor: '#0F766E', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  buttonText: {color: '#fff', fontWeight: '800'},
});
