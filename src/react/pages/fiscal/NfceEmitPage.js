import React, {useMemo, useState} from 'react';
import {Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';

const toIds = value =>
  (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(/[,\s]+/))
    .map(item => String(item).replace(/\D+/g, ''))
    .filter(Boolean);

export default function NfceEmitPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const ids = useMemo(() => toIds(route.params?.ids), [route.params?.ids]);
  const provider = String(route.params?.provider || '').trim();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!ids.length || !provider) {
      setError('Pedido e empresa corrente são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      for (const id of ids) {
        const response = await api.fetch(`orders/${id}/nfe`, {
          method: 'POST',
          params: {model: 65, provider},
        });
        const result = response?.response || response;
        if (result?.success === false || !result?.invoice_tax) {
          throw new Error(result?.error || `A NFC-e do pedido ${id} não foi emitida.`);
        }
      }
      navigation.navigate('NfcePage');
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="file-send-outline" size={40} color="#0F766E" />
        <Text style={styles.title}>Emitir NFC-e</Text>
        <Text style={styles.summary}>{ids.length} pedido(s) selecionado(s)</Text>
        <Text style={styles.hint}>A emissão será feita para a empresa corrente selecionada.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={() => navigation.goBack()} disabled={saving} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable testID="nfce-confirm-emit-button" onPress={submit} disabled={saving} style={[styles.emitButton, saving && styles.disabled]}>
            <MaterialCommunityIcons name="check" size={18} color="#fff" />
            <Text style={styles.emitText}>{saving ? 'Emitindo...' : 'Confirmar emissão'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {margin: 16, padding: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8},
  title: {fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 12},
  summary: {fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 8},
  hint: {fontSize: 13, color: '#64748B', marginTop: 8},
  error: {color: '#B91C1C', fontWeight: '700', marginTop: 16},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24},
  cancelButton: {minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1'},
  cancelText: {color: '#334155', fontWeight: '800'},
  emitButton: {minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', backgroundColor: '#0F766E', borderRadius: 8},
  emitText: {color: '#fff', fontWeight: '800'},
  disabled: {opacity: 0.6},
});
