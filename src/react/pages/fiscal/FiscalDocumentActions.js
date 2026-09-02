import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';

const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');
const fiscalDocument = row => row?.fiscalDocument || {};
const fiscalNumber = row => fiscalDocument(row).number || row?.fiscalNumber || row?.invoiceNumber || rowId(row);

function FiscalDocumentActions({row, documentType}) {
  const navigation = useNavigation();
  const id = rowId(row);
  const title = documentType === 'nfce' ? 'NFC-e' : documentType === 'nfse' ? 'NFS-e' : 'NF-e';
  const [preview, setPreview] = useState({visible: false, loading: false, url: '', error: ''});

  const openPdf = async () => {
    if (!id) return;
    setPreview({visible: true, loading: true, url: '', error: ''});
    try {
      const response = await api.fetch(`invoice_taxes/${id}/download-nf`, {params: {format: 'base64'}});
      const pdf = response?.pdf || response?.response?.pdf;
      if (!pdf) throw new Error(`PDF da ${title} não retornou conteúdo.`);
      setPreview({visible: true, loading: false, url: `data:application/pdf;base64,${pdf}`, error: ''});
    } catch (error) {
      setPreview({visible: true, loading: false, url: '', error: error?.message || String(error)});
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable testID={`${documentType}-row-pdf`} onPress={openPdf} style={[styles.button, styles.pdf]}>
        <MaterialCommunityIcons name="file-pdf-box" size={14} color="#fff" /><Text style={styles.text}>PDF</Text>
      </Pressable>
      <Pressable
        testID={`${documentType}-row-detail`}
        onPress={() => id && navigation.navigate('FiscalDocumentDetailPage', {id, documentType})}
        style={[styles.button, styles.detail]}>
        <MaterialCommunityIcons name="eye-outline" size={14} color="#fff" /><Text style={styles.text}>Detalhe</Text>
      </Pressable>
      <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={() => setPreview({...preview, visible: false})}>
        <View style={styles.backdrop}><View style={styles.modal}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{title} Nº {fiscalNumber(row)}</Text><Pressable onPress={() => setPreview({...preview, visible: false})}><Text style={styles.close}>Fechar</Text></Pressable></View>
          {preview.loading ? <Text>Montando PDF...</Text> : null}
          {preview.error ? <Text style={styles.error}>{preview.error}</Text> : null}
          {preview.url ? React.createElement('iframe', {src: preview.url, title: title, style: {width: '100%', height: '75vh', border: 0}}) : null}
        </View></View>
      </Modal>
    </View>
  );
}

export const NfceDocumentActions = props => <FiscalDocumentActions {...props} documentType="nfce" />;
export const NfeDocumentActions = props => <FiscalDocumentActions {...props} documentType="nfe" />;
export const NfseDocumentActions = props => <FiscalDocumentActions {...props} documentType="nfse" />;
export default FiscalDocumentActions;

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', gap: 6},
  button: {flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10},
  pdf: {backgroundColor: '#0F766E'}, detail: {backgroundColor: '#0369A1'},
  text: {color: '#fff', fontWeight: '800', fontSize: 11},
  backdrop: {flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', padding: 16, justifyContent: 'center'},
  modal: {backgroundColor: '#F8FAFC', borderRadius: 8, padding: 16, maxHeight: '92%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'}, close: {color: '#0F766E', fontWeight: '800'}, error: {color: '#B91C1C', marginTop: 10},
});
