import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {formatMoney} from '@controleonline/ui-logistic/src/shared/ctePendingInvoices';
import CteEmitNfCard from './CteEmitNfCard';
import {downloadFiscalXml} from '@controleonline/ui-logistic/src/react/pages/fiscal/FiscalDocumentActions';
import {extractFiscalDocumentFromXml} from '@controleonline/ui-logistic/src/shared/fiscalDocuments';

const HOMOLOG_LABEL = /homologa|sem valor fiscal/i;

const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');

const cleanName = (value, fallback) => {
  const text = String(value || '').trim();
  if (!text || HOMOLOG_LABEL.test(text) || text === fallback) return fallback;
  return text;
};

const formatWeight = value =>
  `${Number(value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`;

const peopleName = people =>
  cleanName(people?.alias || people?.name, null) || null;

const fiscalDocument = row => row?.fiscalDocument || {};
const fiscalSeries = row => fiscalDocument(row).series || row?.fiscalSeries || '--';
const fiscalNumber = row => fiscalDocument(row).number || row?.fiscalNumber || '--';
const fiscalKey = row => fiscalDocument(row).key || row?.invoiceKey || '--';

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

const ReadField = ({label, value, wide}) => (
  <View style={[styles.field, wide && styles.fieldWide]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={String(value ?? '')} editable={false} style={[styles.input, styles.inputReadonly]} />
  </View>
);

export default function CteDetailPage() {
  const route = useRoute();
  const {width} = useWindowDimensions();
  const cteId = useMemo(() => {
    const fromRoute = String(route.params?.id || '').replace(/\D+/g, '');
    if (fromRoute) return fromRoute;
    if (typeof window !== 'undefined' && window.location?.search) {
      return String(new URLSearchParams(window.location.search).get('id') || '').replace(/\D+/g, '');
    }
    return '';
  }, [route.params?.id]);

  const [cte, setCte] = useState(null);
  const [nfs, setNfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState({visible: false, title: '', url: '', loading: false, error: ''});
  const cardColumns = width >= 1280 ? 4 : width >= 980 ? 3 : width >= 680 ? 2 : 1;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cteId) {
        setError('CT-e não informado.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const cteResponse = await api.fetch(`invoice_taxes/${cteId}`);
        const nfResponse = await api.fetch('invoice_taxes', {
          params: {cte: cteId, itemsPerPage: 200},
        });
        const collection = nfResponse?.member || nfResponse?.['hydra:member'] || [];
        const onlyNfs = (Array.isArray(collection) ? collection : []).filter(row => {
          const id = rowId(row);
          const model = Number(row?.invoiceModel || 0);
          if (id && id === cteId) return false;
          if (model === 57) return false;
          return true;
        });
        if (!cancelled) {
          setCte(cteResponse);
          setNfs(onlyNfs);
        }
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
  }, [cteId]);

  const summary = useMemo(() => {
    const first = nfs[0] || cte || {};
    const cteFiscal = {
      ...extractFiscalDocumentFromXml(cte?.invoice, cte?.invoiceModel),
      ...fiscalDocument(cte),
    };
    const issuer = peopleName(cte?.issuer) || peopleName(cte?.company) || cleanName(first.issuerName || first.companyName, 'Emitente não informado');
    const client = peopleName(cte?.client) || cleanName(first.clientName, 'Destinatário não informado');
    const provider = peopleName(cte?.provider) || cleanName(first.providerName, 'Remetente não informado');
    const carrier = peopleName(cte?.carrier) || cleanName(first.carrierName, 'Transportadora não informada');
    return {
      issuerName: issuer,
      clientName: client,
      providerName: provider,
      carrierName: carrier,
      addressLabel: first.addressLabel || 'Endereço não informado',
      providerAddressLabel: first.providerAddressLabel || 'Endereço não informado',
      clientAddressLabel: first.clientAddressLabel || 'Endereço não informado',
      rntrc: String(first.rntrc || '').trim(),
      invoiceCount: nfs.length,
      totalValue: nfs.reduce((sum, row) => sum + Number(row?.invoiceTotal || 0), 0) || Number(cte?.invoiceTotal || 0),
      totalWeight: nfs.reduce((sum, row) => sum + Number(row?.weight || 0), 0),
      cteNumber: fiscalNumber(cte),
      cteSeries: fiscalSeries(cte),
      cteKey: fiscalKey(cte),
      cteProtocol: cteFiscal.protocol || cte?.fiscalProtocol || '--',
      cteAuthorizationStatus: cteFiscal.authorizationStatus || '--',
      cteAuthorizationMessage: cteFiscal.authorizationMessage || '-',
      cteIssuedAt: cteFiscal.issuedAt || '--',
      cteAuthorizedAt: cteFiscal.authorizedAt || '--',
      cteCfop: cteFiscal.cfop || '--',
      status: cte?.status?.status || cte?.status?.realStatus || '-',
    };
  }, [cte, nfs]);

  const openPdf = async (row, kind = 'NF') => {
    const id = rowId(row) || (kind === 'CT-e' ? cteId : '');
    if (!id) return;
    setPreview({
      visible: true,
      title: `${kind} #${fiscalNumber(row) !== '--' ? fiscalNumber(row) : row?.invoiceNumber || id}`,
      url: '',
      loading: true,
      error: '',
    });
    try {
      const response = await api.fetch(`invoice_taxes/${id}/download-nf`, {params: {format: 'base64'}});
      const pdf = response?.pdf || response?.response?.pdf;
      if (!pdf) throw new Error(`PDF do ${kind} não retornou conteúdo.`);
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

  const openCtePdf = () => openPdf(cte || {id: cteId, fiscalNumber: summary.cteNumber}, 'CT-e');

  const closePreview = () =>
    setPreview({visible: false, title: '', url: '', loading: false, error: ''});

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Detalhe do CT-e</Text>
            <Text style={styles.hint}>
              Visualização somente leitura. Emissão e organização de rotas estão desativadas.
            </Text>
          </View>
          {!loading && !error && cteId ? (
            <View style={styles.headerActions}>
            <Pressable onPress={openCtePdf} style={styles.headerPdf} testID="cte-detail-pdf">
              <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
              <Text style={styles.headerPdfText}>PDF</Text>
            </Pressable>
            <Pressable onPress={() => downloadFiscalXml(cte, 'cte').catch(() => {})} style={styles.headerXml} testID="cte-detail-xml">
              <MaterialCommunityIcons name="xml" size={18} color="#fff" />
              <Text style={styles.headerPdfText}>XML</Text>
            </Pressable>
            </View>
          ) : null}
        </View>

        {loading ? <Text style={styles.hint}>Carregando CT-e...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !error ? (
          <>
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="file-document-outline" size={18} color="#0F766E" />
                <View>
                  <Text style={styles.summaryLabel}>CT-e</Text>
                  <Text style={styles.summaryValue}>Série {summary.cteSeries} / Nº {summary.cteNumber}</Text>
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
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="file-multiple-outline" size={18} color="#0F766E" />
                <View>
                  <Text style={styles.summaryLabel}>Notas fiscais</Text>
                  <Text style={styles.summaryValue}>{summary.invoiceCount} NF(s)</Text>
                </View>
              </View>
            </View>

            <View style={styles.partyGrid}>
              <PartyCard icon="office-building" role="Emitente" name={summary.issuerName} address={summary.addressLabel} tone="#0F766E" />
              <PartyCard icon="package-variant-closed" role="Remetente" name={summary.providerName} address={summary.providerAddressLabel} tone="#0369A1" />
              <PartyCard icon="account-arrow-right" role="Destinatário" name={summary.clientName} address={summary.clientAddressLabel} tone="#7C3AED" />
              <PartyCard
                icon="truck-delivery-outline"
                role="Transportadora"
                name={summary.carrierName}
                address={summary.rntrc ? `RNTRC ${summary.rntrc}` : 'RNTRC não informado'}
                tone="#C2410C"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>Dados do CT-e</Text>
              <View style={styles.formGrid}>
                <ReadField label="Série" value={summary.cteSeries} />
                <ReadField label="Número" value={summary.cteNumber} />
                <ReadField label="Chave" value={summary.cteKey} wide />
                <ReadField label="Protocolo" value={summary.cteProtocol} />
                <ReadField label="Status SEFAZ" value={`${summary.cteAuthorizationStatus} - ${summary.cteAuthorizationMessage}`} />
                <ReadField label="Emissão" value={summary.cteIssuedAt} />
                <ReadField label="Autorização" value={summary.cteAuthorizedAt} />
                <ReadField label="CFOP" value={summary.cteCfop} />
                <ReadField label="Status interno" value={summary.status} />
                <ReadField label="Modelo" value={cte?.invoiceModel || 57} />
                <ReadField label="Total" value={formatMoney(cte?.invoiceTotal)} />
                <ReadField label="NFs vinculadas" value={summary.invoiceCount} />
              </View>
            </View>

            <Text style={styles.section}>NFs deste CT-e</Text>
            <View style={[styles.nfGrid, cardColumns > 1 && {flexDirection: 'row', flexWrap: 'wrap', gap: 12}]}>
              {nfs.length === 0 ? (
                <Text style={styles.hint}>Nenhuma NF vinculada encontrada.</Text>
              ) : (
                nfs.map(row => (
                  <View key={rowId(row)} style={cardColumns > 1 ? {flexBasis: `${Math.floor(100 / cardColumns) - 2}%`, flexGrow: 1, minWidth: 220} : undefined}>
                    <CteEmitNfCard row={row} onPreview={nf => openPdf(nf, 'NF')} />
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{preview.title}</Text>
              <Pressable onPress={closePreview}>
                <Text style={styles.modalClose}>Fechar</Text>
              </Pressable>
            </View>
            {preview.loading ? <Text style={styles.hint}>Montando PDF...</Text> : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {padding: 16, paddingBottom: 40},
  titleRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4},
  titleBlock: {flex: 1, minWidth: 0},
  title: {fontSize: 20, fontWeight: '800', color: '#0F172A'},
  hint: {marginTop: 6, marginBottom: 14, color: '#64748B'},
  headerPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  headerXml: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerPdfText: {color: '#fff', fontWeight: '800', fontSize: 13},
  summaryBar: {flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap'},
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 180,
    flexGrow: 1,
  },
  summaryLabel: {fontSize: 11, fontWeight: '700', color: '#047857', textTransform: 'uppercase'},
  summaryValue: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  partyGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12},
  partyCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  partyHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8},
  partyIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
  },
  partyRole: {fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase'},
  partyName: {fontSize: 14, fontWeight: '800', color: '#0F172A'},
  partyAddress: {marginTop: 4, fontSize: 12, color: '#64748B', lineHeight: 16},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  formGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  field: {flexGrow: 1, flexBasis: 220, minWidth: 180},
  fieldWide: {flexBasis: '100%', minWidth: '100%'},
  label: {fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase'},
  input: {marginTop: 6, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, backgroundColor: '#fff'},
  inputReadonly: {backgroundColor: '#F1F5F9', color: '#334155'},
  error: {color: '#B91C1C', marginTop: 10},
  nfGrid: {marginBottom: 16},
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
});
