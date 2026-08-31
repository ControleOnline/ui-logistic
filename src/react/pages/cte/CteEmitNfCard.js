import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {formatMoney} from '@controleonline/ui-logistic/src/shared/ctePendingInvoices';

const HOMOLOG_LABEL = /homologa|sem valor fiscal/i;

const cleanName = (value, fallback) => {
  const text = String(value || '').trim();
  if (!text || HOMOLOG_LABEL.test(text)) return fallback;
  return text;
};

const formatWeight = value =>
  `${Number(value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`;

export default function CteEmitNfCard({row, onPreview, onRemove}) {
  const number = row?.invoiceNumber || row?.id || '--';
  const client = cleanName(row?.clientName, 'Destinatário não informado');
  const provider = cleanName(row?.providerName, 'Remetente não informado');
  const key = String(row?.invoiceKey || '').trim();
  const canRemove = typeof onRemove === 'function';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="file-document-outline" size={16} color="#0F766E" />
          <Text style={styles.number}>NF {number}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => onPreview?.(row)} style={styles.pdf} hitSlop={8}>
            <MaterialCommunityIcons name="file-pdf-box" size={16} color="#fff" />
          </Pressable>
          {canRemove ? (
            <Pressable onPress={() => onRemove?.(row)} style={styles.remove} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={16} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.client} numberOfLines={2}>{client}</Text>
      <Text style={styles.provider} numberOfLines={1}>{provider}</Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Valor</Text>
          <Text style={styles.metricValue}>{formatMoney(row?.invoiceTotal)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Peso</Text>
          <Text style={styles.metricValue}>{formatWeight(row?.weight)}</Text>
        </View>
      </View>

      {key ? <Text style={styles.key} numberOfLines={1}>{key}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 14,
    minHeight: 168,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  badge: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8},
  number: {fontSize: 12, fontWeight: '800', color: '#0F766E'},
  actions: {flexDirection: 'row', gap: 6},
  pdf: {width: 28, height: 28, borderRadius: 8, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center'},
  remove: {width: 28, height: 28, borderRadius: 8, backgroundColor: '#BE123C', alignItems: 'center', justifyContent: 'center'},
  client: {marginTop: 12, fontSize: 15, fontWeight: '800', color: '#0F172A', lineHeight: 20},
  provider: {marginTop: 4, fontSize: 12, color: '#64748B'},
  metrics: {flexDirection: 'row', gap: 8, marginTop: 12},
  metric: {flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10},
  metricLabel: {fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase'},
  metricValue: {marginTop: 2, fontSize: 13, fontWeight: '800', color: '#0F172A'},
  key: {marginTop: 10, fontSize: 10, color: '#94A3B8', fontFamily: 'monospace'},
});
