import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';

const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');
const fiscalDocument = row => row?.fiscalDocument || {};
const fiscalNumber = row => fiscalDocument(row).number || row?.fiscalNumber || row?.invoiceNumber || rowId(row);

export const downloadFiscalPdf = async (row, documentType = 'nfe') => {
  const id = rowId(row);
  if (!id) return;
  const response = await api.fetch(`invoice_taxes/${id}/download-nf`, {params: {format: 'base64'}});
  const pdf = response?.pdf || response?.response?.pdf;
  if (!pdf) throw new Error(`PDF da ${documentType.toUpperCase()} não retornou conteúdo.`);
  const prefix = documentType === 'nfce' ? 'NFCE' : documentType === 'nfse' ? 'NFSE' : documentType === 'cte' ? 'CTE' : 'NFE';
  const fiscal = fiscalDocument(row);
  const filename = response?.filename || response?.response?.filename || `${prefix}-${fiscal.series || row?.fiscalSeries || row?.series || ''}-${fiscalNumber(row)}.pdf`;
  if (typeof document !== 'undefined' && document.createElement) {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdf}`;
    link.download = filename;
    link.click();
    return;
  }
  if (typeof window !== 'undefined' && window.open) window.open(`data:application/pdf;base64,${pdf}`, '_blank');
};

function FiscalDocumentActions({row, documentType}) {
  const navigation = useNavigation();
  const id = rowId(row);
  const title = documentType === 'nfce' ? 'NFC-e' : documentType === 'nfse' ? 'NFS-e' : 'NF-e';
  const openPdf = () => downloadFiscalPdf(row, documentType).catch(error => console.error(error));

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
});
