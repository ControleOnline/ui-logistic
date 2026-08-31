import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';

const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');

export default function CteCteActions({row}) {
  const navigation = useNavigation();
  const id = rowId(row);
  const [preview, setPreview] = useState({visible: false, title: '', url: '', loading: false, error: ''});

  const openPdf = async () => {
    if (!id) return;
    setPreview({
      visible: true,
      title: `CT-e #${row?.invoiceNumber || id}`,
      url: '',
      loading: true,
      error: '',
    });
    try {
      const response = await api.fetch(`invoice_taxes/${id}/download-nf`, {params: {format: 'base64'}});
      const pdf = response?.pdf || response?.response?.pdf;
      if (!pdf) throw new Error('PDF do CT-e não retornou conteúdo.');
      setPreview(current => ({
        ...current,
        loading: false,
        url: `data:application/pdf;base64,${pdf}`,
      }));
    } catch (err) {
      setPreview(current => ({
        ...current,
        loading: false,
        error: err?.message || String(err),
      }));
    }
  };

  const openDetail = () => {
    if (!id) return;
    navigation.navigate('CteDetailPage', {id});
  };

  const closePreview = () =>
    setPreview({visible: false, title: '', url: '', loading: false, error: ''});

  return (
    <View style={styles.wrap}>
      <Pressable onPress={openPdf} style={styles.pdf} hitSlop={6}>
        <MaterialCommunityIcons name="file-pdf-box" size={14} color="#fff" />
        <Text style={styles.text}>PDF</Text>
      </Pressable>
      <Pressable onPress={openDetail} style={styles.detail} hitSlop={6}>
        <MaterialCommunityIcons name="eye-outline" size={14} color="#fff" />
        <Text style={styles.text}>Detalhe</Text>
      </Pressable>

      <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{preview.title}</Text>
              <Pressable onPress={closePreview}>
                <Text style={styles.modalClose}>Fechar</Text>
              </Pressable>
            </View>
            {preview.loading ? <Text style={styles.hint}>Montando DACTE a partir do XML do CT-e...</Text> : null}
            {preview.error ? <Text style={styles.error}>{preview.error}</Text> : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', gap: 6},
  pdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0369A1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: {color: '#fff', fontWeight: '800', fontSize: 11},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, maxHeight: '92%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  modalClose: {color: '#0F766E', fontWeight: '800'},
  hint: {marginTop: 6, color: '#64748B'},
  error: {color: '#B91C1C', marginTop: 10},
});
