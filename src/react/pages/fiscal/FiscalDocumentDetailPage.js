import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {api} from '@controleonline/ui-common/src/api';

export default function FiscalDocumentDetailPage() {
  const route = useRoute();
  const navigation = useNavigation();
  const id = String(route.params?.id || '').replace(/\D+/g, '');
  const type = route.params?.documentType === 'nfce' ? 'NFC-e' : route.params?.documentType === 'nfse' ? 'NFS-e' : 'NF-e';
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!id) return undefined;
    api.fetch(`invoice_taxes/${id}`).then(value => { if (!cancelled) setDocument(value); }).catch(err => { if (!cancelled) setError(err?.message || String(err)); });
    return () => { cancelled = true; };
  }, [id]);

  const fiscal = document?.fiscalDocument || {};
  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.title}>Detalhe da {type}</Text><Text style={styles.subtitle}>Documento fiscal {id || 'não informado'}</Text></View><Pressable onPress={() => navigation.goBack()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={16} color="#fff" /><Text style={styles.buttonText}>Voltar</Text></Pressable></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {document ? <View style={styles.card}><Text style={styles.section}>Dados fiscais</Text>{[['Modelo', document.invoiceModel || (type === 'NFC-e' ? 65 : type === 'NF-e' ? 55 : '-')], ['Série', fiscal.series || document.fiscalSeries || '-'], ['Número', fiscal.number || document.fiscalNumber || '-'], ['Chave', fiscal.key || document.invoiceKey || '-'], ['Status', fiscal.authorizationStatus || document.fiscalAuthorizationStatus || document.status?.status || '-'], ['Protocolo', fiscal.protocol || document.fiscalProtocol || '-']].map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{String(value)}</Text></View>)}</View> : <Text style={styles.subtitle}>Carregando...</Text>}
  </ScrollView>;
}

const styles = StyleSheet.create({content: {padding: 16, backgroundColor: '#F8FAFC', minHeight: '100%'}, header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}, title: {fontSize: 20, fontWeight: '800', color: '#0F172A'}, subtitle: {marginTop: 4, color: '#64748B'}, back: {flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#0369A1', borderRadius: 8, padding: 10}, buttonText: {color: '#fff', fontWeight: '800'}, card: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 16}, section: {fontSize: 14, fontWeight: '800', color: '#0F766E', marginBottom: 10}, row: {borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 10}, label: {fontSize: 11, fontWeight: '700', color: '#64748B'}, value: {marginTop: 3, color: '#0F172A', fontWeight: '700'}, error: {color: '#B91C1C', fontWeight: '700'},});
