import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {
  buildNfcePdfFilename,
  isValidNfceDocument,
  resolveInvoiceTaxId,
  resolveNfceNumber,
  resolveNfceProtocol,
  resolveNfceSeries,
  resolveNfceStatus,
} from '@controleonline/ui-logistic/src/shared/fiscalDocuments';

const Field = ({label, value}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Text testID={`nfce-detail-${label}`} style={styles.value}>{String(value || '--')}</Text>
  </View>
);

export default function NfceDetailPage() {
  const route = useRoute();
  const invoiceTaxId = useMemo(() => {
    const fromRoute = resolveInvoiceTaxId(route.params?.id);
    if (fromRoute) return fromRoute;
    if (typeof window !== 'undefined' && window.location?.search) {
      return resolveInvoiceTaxId(new URLSearchParams(window.location.search).get('id'));
    }
    return '';
  }, [route.params?.id]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState({visible: false, title: '', url: '', filename: '', loading: false, error: ''});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!invoiceTaxId) {
        setError('InvoiceTax da NFC-e não informado.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await api.fetch(`invoice_taxes/${invoiceTaxId}`);
        const row = response?.response || response;
        if (cancelled) return;
        if (!row || !resolveInvoiceTaxId(row)) throw new Error('Documento fiscal não encontrado.');
        setItem(row);
      } catch (err) {
        if (!cancelled) setError(err?.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceTaxId]);

  const valid = isValidNfceDocument(item);
  const filename = buildNfcePdfFilename(item);

  const openPdf = async () => {
    if (!valid || !invoiceTaxId) return;
    setPreview({visible: true, title: filename, url: '', filename, loading: true, error: ''});
    try {
      const response = await api.fetch(`invoice_taxes/${invoiceTaxId}/download-nf`, {params: {format: 'base64'}});
      const pdf = response?.pdf || response?.response?.pdf;
      if (!pdf) throw new Error('Falha ao gerar o PDF. Confirme série e número armazenados no documento.');
      setPreview(current => ({...current, loading: false, url: `data:application/pdf;base64,${pdf}`}));
    } catch (err) {
      setPreview(current => ({...current, loading: false, error: err?.message || String(err)}));
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Detalhe da NFC-e</Text>
        {loading ? <Text style={styles.hint}>Carregando InvoiceTax #{invoiceTaxId}…</Text> : null}
        {error ? <Text testID="nfce-detail-error" style={styles.error}>{error}</Text> : null}
        {item ? (
          <>
            <Field label="id" value={resolveInvoiceTaxId(item)} />
            <Field label="serie" value={resolveNfceSeries(item)} />
            <Field label="numero" value={resolveNfceNumber(item)} />
            <Field label="status" value={resolveNfceStatus(item)} />
            <Field label="protocolo" value={resolveNfceProtocol(item)} />
            <Pressable
              testID="nfce-detail-pdf"
              accessibilityRole="button"
              disabled={!valid}
              onPress={openPdf}
              style={[styles.pdfButton, !valid && styles.disabled]}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
              <Text style={styles.pdfText}>{filename}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
      <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={() => setPreview(current => ({...current, visible: false}))}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{preview.title}</Text>
              <Pressable testID="nfce-detail-pdf-close" onPress={() => setPreview({visible: false, title: '', url: '', filename: '', loading: false, error: ''})}>
                <Text style={styles.modalClose}>Fechar</Text>
              </Pressable>
            </View>
            {preview.loading ? <Text style={styles.hint}>Carregando {preview.filename}…</Text> : null}
            {preview.error ? <Text testID="nfce-detail-pdf-error" style={styles.error}>{preview.error}</Text> : null}
            {preview.url
              ? React.createElement('iframe', {
                  src: preview.url,
                  title: preview.title,
                  style: {width: '100%', height: '75vh', border: 0, background: '#fff'},
                })
              : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {padding: 16, gap: 12},
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A'},
  field: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12},
  label: {fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase'},
  value: {marginTop: 4, fontSize: 16, fontWeight: '800', color: '#0F172A'},
  hint: {color: '#64748B'},
  error: {color: '#B91C1C', fontWeight: '700'},
  pdfButton: {marginTop: 8, backgroundColor: '#0F766E', borderRadius: 8, minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  pdfText: {color: '#fff', fontWeight: '800'},
  disabled: {opacity: 0.35},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', padding: 16, justifyContent: 'center'},
  modalCard: {backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, maxHeight: '92%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  modalClose: {color: '#0F766E', fontWeight: '800'},
});
