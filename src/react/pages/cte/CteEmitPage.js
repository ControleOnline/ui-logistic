import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {formatMoney} from '@controleonline/ui-logistic/src/shared/ctePendingInvoices';
import CteEmitNfCard from './CteEmitNfCard';

const HOMOLOG_LABEL = /homologa|sem valor fiscal/i;

const toInvoiceIds = value =>
  (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(/[,\s]+/))
    .map(item => String(item).replace(/\D+/g, ''))
    .filter(Boolean);

const readQueryIds = key => {
  if (typeof window === 'undefined' || !window.location?.search) return [];
  return toInvoiceIds(new URLSearchParams(window.location.search).get(key));
};

const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');

const cleanName = (value, fallback) => {
  const text = String(value || '').trim();
  if (!text || HOMOLOG_LABEL.test(text) || text === fallback) return fallback;
  return text;
};

const formatWeight = value =>
  `${Number(value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`;

const PartyCard = ({icon, role, name, address, tone}) => (
  <View style={[styles.partyCard, tone && {borderColor: tone}]}>
    <View style={styles.partyHeader}>
      <View style={[styles.partyIcon, tone && {backgroundColor: tone}]}>
        <MaterialCommunityIcons name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.partyRole}>{role}</Text>
    </View>
    <Text style={styles.partyName}>{name}</Text>
    <Text style={styles.partyAddress}>{address}</Text>
  </View>
);

const InputField = ({label, value, onChangeText, placeholder, keyboardType, wide}) => (
  <View style={[styles.field, wide && styles.fieldWide]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} style={styles.input} />
  </View>
);

export default function CteEmitPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const {width} = useWindowDimensions();
  const emitStore = useStore('invoice_taxes_emit');
  const initialIds = useMemo(() => {
    const fromRoute = toInvoiceIds(route.params?.ids || route.params?.selectedIds);
    return fromRoute.length ? fromRoute : readQueryIds('ids');
  }, [route.params?.ids, route.params?.selectedIds]);
  const initialParked = useMemo(() => {
    const fromRoute = toInvoiceIds(route.params?.parked);
    return fromRoute.length ? fromRoute : readQueryIds('parked');
  }, [route.params?.parked]);
  const [activeIds, setActiveIds] = useState(initialIds);
  const [parkedIds, setParkedIds] = useState(initialParked);
  const [parkedRows, setParkedRows] = useState([]);
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
  const [preview, setPreview] = useState({visible: false, title: '', url: '', loading: false, error: ''});
  const setField = (key, value) => setForm(current => ({...current, [key]: value}));
  const cardColumns = width >= 1280 ? 4 : width >= 980 ? 3 : width >= 680 ? 2 : 1;

  const persistIds = useCallback((nextActive, nextParked) => {
    setActiveIds(nextActive);
    setParkedIds(nextParked);
    navigation.setParams({ids: nextActive.join(','), parked: nextParked.join(',')});
  }, [navigation]);

  useEffect(() => {
    emitStore?.actions?.setFilters?.(activeIds.length ? {id: activeIds} : {id: ['-1']});
    emitStore?.actions?.setReload?.(true);
  }, [activeIds.join(',')]);

  useEffect(() => {
    let cancelled = false;
    const loadParked = async () => {
      if (!parkedIds.length) {
        if (!cancelled) setParkedRows([]);
        return;
      }
      const response = await api.fetch('invoice_taxes/without-cte', {params: {id: parkedIds, itemsPerPage: 200}});
      const collection = response?.member || response?.['hydra:member'] || [];
      if (!cancelled) setParkedRows(collection);
    };
    loadParked();
    return () => {
      cancelled = true;
    };
  }, [parkedIds.join(',')]);

  const items = Array.isArray(emitStore?.getters?.items) ? emitStore.getters.items : [];
  const summary = useMemo(() => {
    const first = items[0] || {};
    return {
      issuerName: cleanName(first.issuerName || first.companyName, 'Emitente não informado'),
      clientName: cleanName(first.clientName, 'Destinatário não informado'),
      providerName: cleanName(first.providerName, 'Remetente não informado'),
      carrierName: cleanName(first.carrierName, 'Transportadora não informada'),
      addressLabel: first.addressLabel || 'Endereço não informado',
      providerAddressLabel: first.providerAddressLabel || 'Endereço não informado',
      clientAddressLabel: first.clientAddressLabel || 'Endereço não informado',
      rntrc: String(first.rntrc || '').trim(),
      invoiceCount: items.length,
      totalValue: items.reduce((sum, row) => sum + Number(row?.invoiceTotal || 0), 0),
      totalWeight: items.reduce((sum, row) => sum + Number(row?.weight || 0), 0),
    };
  }, [items]);

  useEffect(() => {
    if (summary.rntrc && summary.rntrc !== form.rntrc) setField('rntrc', summary.rntrc);
  }, [summary.rntrc]);

  const openNfPdf = async row => {
    const id = rowId(row);
    setPreview({visible: true, title: `NF #${row.invoiceNumber || id}`, url: '', loading: true, error: ''});
    try {
      const response = await api.fetch(`invoice_taxes/${id}/download-nf`, {params: {format: 'base64'}});
      const pdf = response?.pdf || response?.response?.pdf;
      if (!pdf) throw new Error('PDF da NF não retornou conteúdo.');
      setPreview(current => ({...current, loading: false, url: `data:application/pdf;base64,${pdf}`}));
    } catch (err) {
      setPreview(current => ({...current, loading: false, error: err?.message || String(err)}));
    }
  };

  const removeNf = row => {
    const id = rowId(row);
    persistIds(activeIds.filter(item => item !== id), [...parkedIds, id]);
  };

  const restoreNf = row => {
    const id = rowId(row);
    persistIds([...activeIds, id], parkedIds.filter(item => item !== id));
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.fetch('invoice_tasks/emit-cte', {
        method: 'POST',
        body: {invoiceTaxIds: activeIds, cfop: form.cfop, extra: {...form, rntrc: summary.rntrc || form.rntrc}},
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
        <Text style={styles.hint}>Complete os dados do transporte. RNTRC vem do documento da transportadora ou da config fiscal.</Text>

        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#0F766E" />
            <View>
              <Text style={styles.summaryLabel}>Notas fiscais</Text>
              <Text style={styles.summaryValue}>{summary.invoiceCount} NF(s)</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="currency-brl" size={18} color="#0F766E" />
            <View>
              <Text style={styles.summaryLabel}>Valor das mercadorias</Text>
              <Text style={styles.summaryValue}>{formatMoney(summary.totalValue)}</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="weight-kilogram" size={18} color="#0F766E" />
            <View>
              <Text style={styles.summaryLabel}>Peso das mercadorias</Text>
              <Text style={styles.summaryValue}>{formatWeight(summary.totalWeight)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.partyGrid}>
          <PartyCard icon="office-building" role="Emitente da NF" name={summary.issuerName} address={summary.addressLabel} tone="#0F766E" />
          <PartyCard icon="package-variant-closed" role="Remetente" name={summary.providerName} address={summary.providerAddressLabel} tone="#0369A1" />
          <PartyCard icon="account-arrow-right" role="Destinatário" name={summary.clientName} address={summary.clientAddressLabel} tone="#7C3AED" />
          <PartyCard
            icon="truck-delivery-outline"
            role="Transportadora"
            name={summary.carrierName}
            address={summary.rntrc ? `RNTRC ${summary.rntrc}` : 'Cadastre o RNTRC no documento da transportadora ou na aba Fiscal / CT-e'}
            tone="#C2410C"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Dados do CT-e</Text>
          <View style={styles.formGrid}>
            <InputField label="CFOP" value={form.cfop} onChangeText={value => setField('cfop', value)} placeholder="5353" />
            <InputField label="Modal" value={form.modal} onChangeText={value => setField('modal', value)} placeholder="01 rodoviário" />
            <InputField label="Tipo de serviço" value={form.tipoServico} onChangeText={value => setField('tipoServico', value)} placeholder="0 normal" />
            <InputField label="Tipo do CT-e" value={form.tipoCte} onChangeText={value => setField('tipoCte', value)} placeholder="0 normal" />
            <InputField label="Tomador" value={form.tomador} onChangeText={value => setField('tomador', value)} placeholder="3 destinatário" />
            <InputField label="Valor do frete" value={form.valorFrete} onChangeText={value => setField('valorFrete', value)} keyboardType="decimal-pad" placeholder="0,00" />
            <InputField label="Valor a receber" value={form.valorReceber} onChangeText={value => setField('valorReceber', value)} keyboardType="decimal-pad" placeholder="0,00" />
            <InputField label="Natureza da prestação" value={form.natureza} onChangeText={value => setField('natureza', value)} wide />
            <InputField label="Observação" value={form.observacao} onChangeText={value => setField('observacao', value)} placeholder="Informações complementares" wide />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={saving || activeIds.length < 1} onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>{saving ? 'Enfileirando...' : 'Enviar para fila de integração'}</Text>
        </Pressable>

        <Text style={styles.section}>NFs deste CT-e</Text>
        <DefaultTable
          storeName="invoice_taxes_emit"
          initialViewMode="cards"
          forceCardsOnCompact
          compactBreakpoint={4000}
          showRowActions={false}
          cardListProps={{numColumns: cardColumns, columnWrapperStyle: styles.cardRow}}
          renderCard={({row}) => (
            <CteEmitNfCard row={row} onPreview={openNfPdf} onRemove={removeNf} />
          )}
        />

        {parkedRows.length ? (
          <View style={styles.parkedBox}>
            <Text style={styles.section}>NFs removidas (podem voltar)</Text>
            {parkedRows.map(row => (
              <View key={rowId(row)} style={styles.parkedRow}>
                <Text style={styles.partyName}>NF #{row.invoiceNumber} · {formatMoney(row.invoiceTotal)} · {formatWeight(row.weight)}</Text>
                <Pressable onPress={() => restoreNf(row)} style={styles.restore}>
                  <Text style={styles.restoreText}>Devolver</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={() => setPreview({visible: false, title: '', url: '', loading: false, error: ''})}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{preview.title}</Text>
              <Pressable onPress={() => setPreview({visible: false, title: '', url: '', loading: false, error: ''})}>
                <Text style={styles.modalClose}>Fechar</Text>
              </Pressable>
            </View>
            {preview.loading ? <Text style={styles.hint}>Montando PDF com o XML da NF...</Text> : null}
            {preview.error ? <Text style={styles.error}>{preview.error}</Text> : null}
            {preview.url ? React.createElement('iframe', {
              src: preview.url,
              title: preview.title,
              style: {width: '100%', height: '75vh', border: 0, background: '#fff'},
            }) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {padding: 16, paddingBottom: 40},
  title: {fontSize: 20, fontWeight: '800', color: '#0F172A'},
  hint: {marginTop: 6, marginBottom: 14, color: '#64748B'},
  summaryBar: {flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap'},
  summaryItem: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, minWidth: 180, flexGrow: 1},
  summaryLabel: {fontSize: 11, fontWeight: '700', color: '#047857', textTransform: 'uppercase'},
  summaryValue: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  partyGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12},
  partyCard: {flexGrow: 1, flexBasis: 220, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12},
  partyHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8},
  partyIcon: {width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F766E'},
  partyRole: {fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase'},
  partyName: {fontSize: 14, fontWeight: '800', color: '#0F172A'},
  partyAddress: {marginTop: 4, fontSize: 12, color: '#64748B', lineHeight: 16},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12},
  section: {fontSize: 13, fontWeight: '800', color: '#0F766E', textTransform: 'uppercase', marginBottom: 8, marginTop: 8},
  formGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  field: {flexGrow: 1, flexBasis: 220, minWidth: 180},
  fieldWide: {flexBasis: '100%', minWidth: '100%'},
  label: {fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase'},
  input: {marginTop: 6, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, backgroundColor: '#fff'},
  error: {color: '#B91C1C', marginTop: 10},
  button: {marginTop: 8, marginBottom: 16, backgroundColor: '#0F766E', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  buttonText: {color: '#fff', fontWeight: '800'},
  cardRow: {gap: 12, marginBottom: 12},
  parkedBox: {marginTop: 16, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FED7AA'},
  parkedRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  restore: {backgroundColor: '#0369A1', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10},
  restoreText: {color: '#fff', fontWeight: '800', fontSize: 12},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', padding: 16, justifyContent: 'center'},
  modalCard: {backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, maxHeight: '92%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  modalClose: {color: '#0F766E', fontWeight: '800'},
});
