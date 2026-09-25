import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {resolveFiscalCompanyId} from '@controleonline/ui-accounting/src/react/components/fiscal/CteFiscalConfig';

const toIds = value =>
  (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(/[,\s]+/))
    .map(item => String(item).replace(/\D+/g, ''))
    .filter(Boolean);

export default function MdfeEmitPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const peopleStore = useStore('people');
  const company = peopleStore?.getters?.currentCompany || null;
  const companyId = resolveFiscalCompanyId(company);
  const documentIds = useMemo(
    () => toIds(route.params?.ids || route.params?.selectedIds),
    [route.params?.ids, route.params?.selectedIds],
  );
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [insurerId, setInsurerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const submit = async () => {
    if (!companyId || busy) return;
    if (!documentIds.length) {
      setError('Selecione ao menos um CT-e/NF-e elegível na aba CTE.');
      return;
    }
    setBusy(true);
    setError('');
    setResult('');
    try {
      const response = await api.fetch('invoice_taxes/mdfe', {
        method: 'POST',
        body: {
          provider: `/people/${companyId}`,
          documents: documentIds,
          vehicle: vehicleId ? `/delivery_courier_vehicles/${vehicleId}` : null,
          driver: driverId ? `/people/${driverId}` : null,
          insurer: insurerId ? `/people/${insurerId}` : null,
        },
      });
      setResult(response?.status || response?.message || 'Solicitação de MDF-e enviada.');
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Emitir MDF-e</Text>
        <Text style={styles.hint}>
          Origem, destino e municípios de descarregamento saem das NF-e vinculadas aos CT-e selecionados.
        </Text>
        <Text style={styles.label}>Documentos ({documentIds.length})</Text>
        <Text style={styles.value}>{documentIds.join(', ') || 'Nenhum documento selecionado'}</Text>
        <Text style={styles.label}>Veículo (delivery_courier_vehicle id)</Text>
        <TextInput testID="mdfe-vehicle" value={vehicleId} onChangeText={setVehicleId} style={styles.input} placeholder="ID do veículo" />
        <Text style={styles.label}>Condutor principal (people id)</Text>
        <TextInput testID="mdfe-driver" value={driverId} onChangeText={setDriverId} style={styles.input} placeholder="Pré-selecionar o condutor do veículo" />
        <Text style={styles.label}>Seguradora (people id)</Text>
        <TextInput testID="mdfe-insurer" value={insurerId} onChangeText={setInsurerId} style={styles.input} placeholder="Pessoa da seguradora" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {result ? <Text style={styles.ok}>{result}</Text> : null}
        <Pressable testID="mdfe-emit-submit" style={styles.submit} onPress={submit} disabled={busy}>
          <Text style={styles.submitText}>{busy ? 'Enviando...' : 'Enviar MDF-e (sped-mdfe)'}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>Voltar para /cte</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {padding: 16, gap: 8},
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A'},
  hint: {fontSize: 13, color: '#64748B', marginBottom: 8},
  label: {fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 8},
  value: {fontSize: 13, color: '#0F172A'},
  input: {borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff'},
  error: {color: '#B91C1C', fontWeight: '700'},
  ok: {color: '#047857', fontWeight: '700'},
  submit: {marginTop: 16, backgroundColor: '#0F766E', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  submitText: {color: '#fff', fontWeight: '800'},
  back: {paddingVertical: 12, alignItems: 'center'},
  backText: {color: '#0369A1', fontWeight: '700'},
});
