import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {
  buildFiscalPdfFilename,
  DETAIL_PAGE_BY_TYPE,
  isValidFiscalDocument,
  resolveFiscalDocumentConfig,
  resolveInvoiceTaxId,
} from '@controleonline/ui-logistic/src/shared/fiscalDocuments';

export default function FiscalEmittedActions({row, documentType}) {
  const navigation = useNavigation();
  const config = resolveFiscalDocumentConfig(documentType);
  const valid = isValidFiscalDocument(row);
  const id = resolveInvoiceTaxId(row);
  const filename = buildFiscalPdfFilename(row, documentType);
  const detailPage = DETAIL_PAGE_BY_TYPE[documentType];
  const [preview, setPreview] = useState({visible: false, title: '', url: '', filename: '', loading: false, error: ''});

  const openDetail = () => {
    if (!valid || !id || !detailPage) return;
    navigation.navigate(detailPage, {id});
  };

  const openPdf = async () => {
    if (!valid || !id) return;
    setPreview({visible: true, title: filename, url: '', filename, loading: true, error: ''});
    try {
      const response = await api.fetch(`invoice_taxes/${id}/download-nf`, {params: {format: 'base64'}});
      const pdf = response?.pdf || response?.response?.pdf;
      if (!pdf) throw new Error(`PDF de ${config?.title || 'documento'} sem conteúdo. Verifique série e número.`);
      setPreview(current => ({...current, loading: false, url: `data:application/pdf;base64,${pdf}`}));
    } catch (err) {
      setPreview(current => ({...current, loading: false, error: err?.message || String(err)}));
    }
  };

  const closePreview = () =>
    setPreview({visible: false, title: '', url: '', filename: '', loading: false, error: ''});

  return (
    <View style={styles.wrap}>
      <Pressable
        testID={`${documentType}-row-detail`}
        accessibilityRole="button"
        accessibilityLabel={`Abrir detalhe da ${config?.title || 'nota'}`}
        accessibilityState={{disabled: !valid}}
        disabled={!valid}
        onPress={openDetail}
        style={[styles.detail, !valid && styles.disabled]}>
        <MaterialCommunityIcons name="eye-outline" size={14} color="#fff" />
        <Text style={styles.text}>Detalhe</Text>
      </Pressable>
      <Pressable
        testID={`${documentType}-row-pdf`}
        accessibilityRole="button"
        accessibilityLabel={`Baixar PDF ${filename}`}
        accessibilityState={{disabled: !valid}}
        disabled={!valid}
        onPress={openPdf}
        style={[styles.pdf, !valid && styles.disabled]}>
        <MaterialCommunityIcons name="file-pdf-box" size={14} color="#fff" />
        <Text style={styles.text}>PDF</Text>
      </Pressable>
      <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{preview.title}</Text>
              <Pressable testID={`${documentType}-pdf-close`} onPress={closePreview}>
                <Text style={styles.modalClose}>Fechar</Text>
              </Pressable>
            </View>
            {preview.loading ? <Text style={styles.hint}>Carregando PDF {preview.filename}…</Text> : null}
            {preview.error ? <Text testID={`${documentType}-pdf-error`} style={styles.error}>{preview.error}</Text> : null}
            {preview.url
              ? React.createElement('iframe', {
                  src: preview.url,
                  title: preview.title,
                  style: {width: '100%', height: '75vh', border: 0, background: '#fff'},
                })
              : null}
            {preview.url
              ? React.createElement('a', {href: preview.url, download: preview.filename, style: styles.download}, `Baixar ${preview.filename}`)
              : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', gap: 6},
  pdf: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F766E', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10},
  detail: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0369A1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10},
  disabled: {opacity: 0.35},
  text: {color: '#fff', fontWeight: '800', fontSize: 11},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', padding: 16, justifyContent: 'center'},
  modalCard: {backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, maxHeight: '92%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  modalClose: {color: '#0F766E', fontWeight: '800'},
  hint: {marginTop: 6, color: '#64748B'},
  error: {color: '#B91C1C', marginTop: 10},
  download: {display: 'inline-block', marginTop: 12, color: '#0F766E', fontWeight: 800},
});
