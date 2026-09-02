import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {FiscalModelField} from '@controleonline/ui-logistic/src/react/components/fiscal/FiscalAuxiliarySelect';
import {downloadFiscalPdf, downloadFiscalXml} from './FiscalDocumentActions';

const text = (...values) =>
  values.find(
    value =>
      value !== undefined && value !== null && String(value).trim() !== '',
  ) || '-';
const idOf = value => String(value || '').replace(/\D+/g, '');
const PartyCard = ({icon, label, person, tone}) => (
  <View style={[styles.partyCard, {borderColor: tone}]}>
    <View style={styles.partyHeader}>
      <View style={[styles.partyIcon, {backgroundColor: tone}]}>
        <MaterialCommunityIcons name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.partyLabel}>{label}</Text>
    </View>
    <Text style={styles.partyName}>{text(person?.name, person?.alias)}</Text>
    <Text style={styles.partyDetail}>
      {text(person?.document, person?.taxId, person?.['@id'])}
    </Text>
  </View>
);
const FiscalRow = ({label, value}) => (
  <View style={styles.fiscalRow}>
    <Text style={styles.fiscalLabel}>{label}</Text>
    <Text style={styles.fiscalValue}>{text(value)}</Text>
  </View>
);

export default function FiscalDocumentDetailLayout() {
  const route = useRoute();
  const navigation = useNavigation();
  const id = idOf(route.params?.id);
  const type = route.params?.documentType || 'nfe';
  const title =
    type === 'nfce'
      ? 'NFC-e'
      : type === 'nfse'
        ? 'NFS-e'
        : type === 'cte'
          ? 'CT-e'
          : 'NF-e';
  const models =
    useStore('fiscal_auxiliary')?.getters?.auxiliary?.fiscalModels || [];
  const [document, setDocument] = useState(null);
  const [orders, setOrders] = useState([]);
  const [preview, setPreview] = useState({
    visible: false,
    title: '',
    url: '',
    loading: false,
    error: '',
  });
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (!id) return undefined;
    api
      .fetch(`invoice_taxes/${id}`)
      .then(value => {
        if (!cancelled) setDocument(value);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  useEffect(() => {
    let cancelled = false;
    if (!id) return undefined;
    api
      .fetch('order_invoice_taxes', {
        params: {
          invoiceTax: `/invoice_taxes/${id}`,
          itemsPerPage: 200,
          page: 1,
        },
      })
      .then(async response => {
        const links = response?.member || response?.['hydra:member'] || [];
        const orderRefs = links
          .map(link => link?.order)
          .filter(order => typeof order === 'string' && order);
        const loadedOrders = await Promise.all(
          orderRefs.map(order => api.fetch(order.replace(/^\//, ''))),
        );
        if (!cancelled) setOrders(loadedOrders);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const openPdf = async () => {
    setPreview({
      visible: true,
      title: `${title} Nº ${summary.number}`,
      url: '',
      loading: true,
      error: '',
    });
    try {
      const response = await api.fetch(`invoice_taxes/${id}/download-nf`, {
        params: {format: 'base64'},
      });
      const content = response?.pdf || response?.response?.pdf;
      if (!content) throw new Error('PDF não retornou conteúdo.');
      setPreview(current => ({
        ...current,
        loading: false,
        url: `data:application/pdf;base64,${content}`,
      }));
    } catch (err) {
      setPreview(current => ({
        ...current,
        loading: false,
        error: err?.message || String(err),
      }));
    }
  };
  const closePreview = () =>
    setPreview({visible: false, title: '', url: '', loading: false, error: ''});
  const fiscal = document?.fiscalDocument || {};
  const summary = useMemo(
    () => ({
      number: text(
        fiscal.number,
        document?.fiscalNumber,
        document?.invoiceNumber,
      ),
      series: text(fiscal.series, document?.fiscalSeries),
      key: text(fiscal.key, document?.invoiceKey),
      status: text(
        fiscal.authorizationStatus,
        document?.fiscalAuthorizationStatus,
        document?.status?.status,
      ),
      protocol: text(fiscal.protocol, document?.fiscalProtocol),
      total: document?.invoiceTotal,
    }),
    [document, fiscal],
  );
  const model = text(
    document?.invoiceModel,
    fiscal.model,
    type === 'nfce'
      ? '65'
      : type === 'nfe'
        ? '55'
        : type === 'cte'
          ? '57'
          : 'NFSE',
  );
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Detalhe do {title}</Text>
            <Text style={styles.hint}>
              Documento fiscal {id || 'não informado'}
            </Text>
          </View>
          <Pressable onPress={openPdf} style={styles.pdfButton}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={18}
              color="#fff"
            />
            <Text style={styles.backText}>PDF</Text>
          </Pressable>
          <Pressable
            onPress={() => downloadFiscalPdf(document, type)}
            style={styles.downloadButton}
          >
            <MaterialCommunityIcons
              name="download"
              size={18}
              color="#0F766E"
            />
            <Text style={styles.downloadText}>Baixar</Text>
          </Pressable>
          <Pressable
            onPress={() => downloadFiscalXml(document, type)}
            style={styles.xmlButton}
          >
            <MaterialCommunityIcons name="xml" size={18} color="#7C3AED" />
            <Text style={styles.xmlText}>XML</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!document ? (
          <Text style={styles.hint}>Carregando documento...</Text>
        ) : (
          <>
            <View style={styles.summaryBar}>
              <FiscalRow label="Número" value={summary.number} />
              <FiscalRow label="Série" value={summary.series} />
              <FiscalRow
                label="Valor"
                value={
                  summary.total
                    ? Number(summary.total).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : '-'
                }
              />
            </View>
            <View style={styles.partyGrid}>
              <PartyCard
                icon="office-building"
                label="Emitente"
                person={
                  document.issuer || document.company || document.provider
                }
                tone="#0F766E"
              />
              <PartyCard
                icon="account-arrow-right"
                label="Destinatário"
                person={document.client || document.recipient}
                tone="#7C3AED"
              />
              <PartyCard
                icon="truck-delivery-outline"
                label="Transportador"
                person={document.carrier}
                tone="#C2410C"
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.section}>Dados fiscais</Text>
              <View style={styles.formGrid}>
                <FiscalModelField model={model} options={models} />
                <FiscalRow label="Número" value={summary.number} />
                <FiscalRow label="Série" value={summary.series} />
                <FiscalRow label="Chave" value={summary.key} />
                <FiscalRow label="Status" value={summary.status} />
                <FiscalRow label="Protocolo" value={summary.protocol} />
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.section}>Pedidos desta NF</Text>
              {orders.length ? (
                orders.map(order => (
                  <View key={order.id || order['@id']} style={styles.orderRow}>
                    <Text style={styles.orderId}>Pedido #{order.id}</Text>
                    <Text style={styles.orderDetail}>
                      {order.orderDate
                        ? new Date(order.orderDate).toLocaleDateString('pt-BR')
                        : '-'}{' '}
                      ·{' '}
                      {order.price
                        ? Number(order.price).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : '-'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.hint}>Nenhum pedido vinculado.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
      <Modal
        visible={preview.visible}
        transparent
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{preview.title}</Text>
              <Pressable onPress={closePreview}>
                <Text style={styles.modalClose}>Fechar</Text>
              </Pressable>
            </View>
            {preview.loading ? (
              <Text style={styles.hint}>Montando PDF...</Text>
            ) : null}
            {preview.error ? (
              <Text style={styles.error}>{preview.error}</Text>
            ) : null}
            {preview.url
              ? React.createElement('iframe', {
                  src: preview.url,
                  title: preview.title,
                  style: {
                    width: '100%',
                    height: '75vh',
                    border: 0,
                    background: '#fff',
                  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {fontSize: 20, fontWeight: '800', color: '#0F172A'},
  hint: {marginTop: 5, color: '#64748B'},
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    padding: 10,
  },
  backText: {color: '#fff', fontWeight: '800'},
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
  },
  downloadText: {color: '#0F766E', fontWeight: '800'},
  xmlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
  },
  xmlText: {color: '#7C3AED', fontWeight: '800'},
  summaryBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  summaryItem: {flexGrow: 1},
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  partyCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  partyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  partyIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  partyName: {fontSize: 14, fontWeight: '800', color: '#0F172A'},
  partyDetail: {marginTop: 4, fontSize: 12, color: '#64748B'},
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
  },
  formGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  fiscalRow: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  fiscalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  fiscalValue: {marginTop: 6, color: '#0F172A', fontWeight: '700'},
  orderRow: {borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingVertical: 12},
  orderId: {fontWeight: '800', color: '#0F172A'},
  orderDetail: {marginTop: 4, color: '#64748B'},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    maxHeight: '92vh',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  modalClose: {color: '#0F766E', fontWeight: '800'},
  error: {color: '#B91C1C', fontWeight: '700', marginBottom: 12},
});
