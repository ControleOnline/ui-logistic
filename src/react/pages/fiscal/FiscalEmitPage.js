import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {
  fetchSelectedFiscalOrders,
  selectFiscalOrders,
} from '@controleonline/ui-logistic/src/shared/fiscalEmitOrders';
import {FiscalModelField} from '@controleonline/ui-logistic/src/react/components/fiscal/FiscalAuxiliarySelect';

const toIds = value =>
  (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(/[,\s]+/))
    .map(item => String(item).replace(/\D+/g, ''))
    .filter(Boolean);
const rowId = row => String(row?.id ?? row?.['@id'] ?? '').replace(/\D+/g, '');
const formatMoney = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
const formatDate = value =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '-';

const PartyCard = ({icon, label, person, tone, model, modelOptions}) => (
  <View style={[styles.partyCard, {borderColor: tone}]}>
    <View style={styles.partyHeader}>
      <View style={[styles.partyIcon, {backgroundColor: tone}]}>
        <MaterialCommunityIcons name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.partyLabel}>{label}</Text>
    </View>
    <Text style={styles.partyName}>
      {person?.name || person?.alias || 'Não informado'}
    </Text>
    <Text style={styles.partyDetail}>{person?.alias || '-'}</Text>
    {model ? <FiscalModelField model={model} options={modelOptions} /> : null}
  </View>
);
const OrderCard = ({row, onRemove}) => (
  <View style={styles.orderCard}>
    <View style={styles.orderHeader}>
      <View style={styles.orderBadge}>
        <MaterialCommunityIcons
          name="clipboard-text-outline"
          size={16}
          color="#0F766E"
        />
        <Text style={styles.orderNumber}>Pedido #{row.id}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remover pedido ${row.id}`}
        onPress={() => onRemove(row)}
        style={styles.removeButton}>
        <MaterialCommunityIcons name="close" size={16} color="#fff" />
      </Pressable>
    </View>
    <Text style={styles.clientName}>
      {row.client?.name || row.client?.alias || 'Cliente não informado'}
    </Text>
    <Text style={styles.orderDate}>
      Data do pedido: {formatDate(row.orderDate)}
    </Text>
    <View style={styles.orderMetric}>
      <Text style={styles.metricLabel}>Total</Text>
      <Text style={styles.metricValue}>{formatMoney(row.price)}</Text>
    </View>
  </View>
);

export default function FiscalEmitPage({documentType, title, model}) {
  const navigation = useNavigation();
  const route = useRoute();
  const pendingStore = useStore('fiscal_orders_pending');
  const fiscalAuxiliaryStore = useStore('fiscal_auxiliary');
  const fiscalModels =
    fiscalAuxiliaryStore?.getters?.auxiliary?.fiscalModels || [];
  const provider = String(route.params?.provider || '').trim();
  const [activeIds, setActiveIds] = useState(() => toIds(route.params?.ids));
  const [removedIds, setRemovedIds] = useState(() =>
    toIds(route.params?.removed),
  );
  const [loadedOrders, setLoadedOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceValue, setServiceValue] = useState('');
  const requestedOrdersKey = useRef('');
  const storeOrders = useMemo(
    () =>
      selectFiscalOrders(pendingStore?.getters?.items, [
        ...activeIds,
        ...removedIds,
      ]),
    [pendingStore?.getters?.items, activeIds.join(','), removedIds.join(',')],
  );
  const orders = useMemo(() => {
    const byId = new Map(
      [...storeOrders, ...loadedOrders].map(row => [rowId(row), row]),
    );
    return [...byId.values()];
  }, [storeOrders, loadedOrders]);
  const missingIds = useMemo(() => {
    const loadedIds = new Set(orders.map(rowId));
    return [...new Set([...activeIds, ...removedIds])].filter(
      id => !loadedIds.has(id),
    );
  }, [activeIds.join(','), removedIds.join(','), orders]);
  const updateRoute = useCallback(
    (nextActive, nextRemoved) => {
      setActiveIds(nextActive);
      setRemovedIds(nextRemoved);
      navigation.setParams({
        ids: nextActive.join(','),
        removed: nextRemoved.join(','),
        provider,
      });
    },
    [navigation, provider],
  );

  useEffect(() => {
    if (!provider || !missingIds.length) return undefined;
    const requestKey = `${provider}|${missingIds.join(',')}`;
    if (requestedOrdersKey.current === requestKey) return undefined;
    requestedOrdersKey.current = requestKey;
    let cancelled = false;
    fetchSelectedFiscalOrders({
      ids: missingIds,
      provider,
      fetcher: api.fetch.bind(api),
    })
      .then(rows => {
        if (!cancelled) setLoadedOrders(rows);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [provider, missingIds.join(',')]);

  const activeOrders = useMemo(() => {
    const ids = new Set(activeIds);
    return orders.filter(row => ids.has(rowId(row)));
  }, [activeIds, orders]);
  const removedOrders = useMemo(() => {
    const ids = new Set(removedIds);
    return orders.filter(row => ids.has(rowId(row)));
  }, [orders, removedIds]);
  const total = activeOrders.reduce(
    (sum, row) => sum + Number(row.price || 0),
    0,
  );
  const removeOrder = row => {
    const id = rowId(row);
    updateRoute(
      activeIds.filter(item => item !== id),
      [...removedIds, id],
    );
  };
  const restoreOrder = row => {
    const id = rowId(row);
    updateRoute(
      [...activeIds, id],
      removedIds.filter(item => item !== id),
    );
  };
  const submit = async () => {
    if (!activeIds.length || !provider || !model) {
      setError('Pedidos, empresa corrente e modelo fiscal são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await api.fetch(`orders/${activeIds[0]}/nfe`, {
        method: 'POST',
        params: {model, provider},
        body: {
          orderIds: activeIds,
          ...(documentType === 'nfse'
            ? {serviceCode, serviceDescription, serviceValue}
            : {}),
        },
      });
      const result = response?.response || response;
      if (result?.success === false || !result?.invoice_tax)
        throw new Error(result?.error || 'Os pedidos não foram emitidos.');
      navigation.navigate(
        documentType === 'nfce'
          ? 'NfcePage'
          : documentType === 'nfe'
            ? 'NfePage'
            : 'NfsePage',
      );
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>
          Revise os pedidos antes de enviar para emissão.
        </Text>
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="clipboard-multiple-outline"
              size={18}
              color="#0F766E"
            />
            <View>
              <Text style={styles.summaryLabel}>Pedidos</Text>
              <Text style={styles.summaryValue}>{activeOrders.length}</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="currency-brl"
              size={18}
              color="#0F766E"
            />
            <View>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.partyGrid}>
          <PartyCard
            icon="office-building"
            label="Empresa corrente"
            person={activeOrders[0]?.provider}
            tone="#0F766E"
            model={model}
            modelOptions={fiscalModels}
          />
          <PartyCard
            icon="account-arrow-right"
            label="Cliente"
            person={activeOrders[0]?.client}
            tone="#7C3AED"
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.section}>Pedidos desta emissão</Text>
        {documentType === 'nfse' ? (
          <View style={styles.serviceBox}>
            <Text style={styles.serviceLabel}>Dados do serviço</Text>
            <TextInput
              accessibilityLabel="Código nacional do serviço"
              value={serviceCode}
              onChangeText={setServiceCode}
              keyboardType="number-pad"
              placeholder="Código nacional com 6 dígitos"
              style={styles.serviceInput}
            />
            <TextInput
              accessibilityLabel="Descrição do serviço"
              value={serviceDescription}
              onChangeText={setServiceDescription}
              placeholder="Descrição do serviço"
              style={styles.serviceInput}
            />
            <TextInput
              accessibilityLabel="Valor do serviço"
              value={serviceValue}
              onChangeText={setServiceValue}
              keyboardType="decimal-pad"
              placeholder="Valor do serviço"
              style={styles.serviceInput}
            />
          </View>
        ) : null}
        <View style={styles.orderGrid}>
          {activeOrders.map(row => (
            <OrderCard key={rowId(row)} row={row} onRemove={removeOrder} />
          ))}
        </View>
        {removedOrders.length ? (
          <View style={styles.removedBox}>
            <Text style={styles.section}>Pedidos removidos</Text>
            {removedOrders.map(row => (
              <View key={rowId(row)} style={styles.removedRow}>
                <Text style={styles.removedText}>
                  Pedido #{row.id} · {formatMoney(row.price)}
                </Text>
                <Pressable
                  onPress={() => restoreOrder(row)}
                  style={styles.restoreButton}>
                  <Text style={styles.restoreText}>Adicionar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable
            testID={`${documentType}-confirm-emit-button`}
            onPress={submit}
            disabled={saving}
            style={[styles.emitButton, saving && styles.disabled]}>
            <MaterialCommunityIcons
              name="file-send-outline"
              size={18}
              color="#fff"
            />
            <Text style={styles.emitText}>
              {saving ? 'Emitindo...' : 'Enviar para emissão'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {padding: 16, paddingBottom: 40},
  title: {fontSize: 20, fontWeight: '800', color: '#0F172A'},
  hint: {marginTop: 6, marginBottom: 14, color: '#64748B'},
  summaryBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    minWidth: 180,
    flexGrow: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
  },
  summaryValue: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
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
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
  },
  orderGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  orderCard: {
    flexGrow: 1,
    flexBasis: 250,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 14,
    minHeight: 150,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  orderNumber: {fontSize: 12, fontWeight: '800', color: '#0F766E'},
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#BE123C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderDate: {marginTop: 4, fontSize: 12, color: '#64748B'},
  orderMetric: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
  },
  metricLabel: {fontSize: 10, color: '#64748B', textTransform: 'uppercase'},
  metricValue: {fontSize: 14, fontWeight: '800', color: '#0F172A'},
  removedBox: {
    marginTop: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  removedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removedText: {color: '#7C2D12', fontWeight: '700'},
  restoreButton: {backgroundColor: '#0369A1', borderRadius: 8, padding: 10},
  restoreText: {color: '#fff', fontWeight: '800', fontSize: 12},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 24,
  },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelText: {color: '#334155', fontWeight: '800'},
  emitButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 8,
  },
  emitText: {color: '#fff', fontWeight: '800'},
  error: {color: '#B91C1C', fontWeight: '700', marginBottom: 12},
  serviceBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  serviceLabel: {fontWeight: '800', color: '#0F172A', marginBottom: 8},
  serviceInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  disabled: {opacity: 0.6},
});
