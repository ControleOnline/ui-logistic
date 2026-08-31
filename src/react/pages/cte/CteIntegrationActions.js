import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';

export default function CteIntegrationActions({row}) {
  const store = useStore('integration_cte');
  const {showSuccess, showError} = useMessage() || {};
  const [loading, setLoading] = useState('');

  const id = String(row?.id || '').replace(/\D+/g, '');
  const statusName = String(row?.status?.status || row?.status?.realStatus || '').toLowerCase();
  const realStatus = String(row?.status?.realStatus || '').toLowerCase();
  const isError = realStatus === 'error' || statusName === 'pending' && realStatus === 'error';
  const isClosed = realStatus === 'closed';
  const canReprocess = isError || realStatus === 'error' || realStatus === 'pending';
  const canCancel = !isClosed;

  const reload = () => {
    store?.actions?.setReload?.(true);
    store?.actions?.getItems?.({page: 1, itemsPerPage: 50});
  };

  const reprocess = async () => {
    setLoading('reprocess');
    try {
      // Re-enqueue by resetting status to open/open and retry 0
      // IntegrationService expects status = open/open to be picked by worker
      const openStatus = await api.fetch('statuses', {params: {status: 'open', realStatus: 'open', context: 'integration', itemsPerPage: 1}});
      const statusIri = openStatus?.member?.[0]?.['@id'] || openStatus?.['hydra:member']?.[0]?.['@id'] || '/statuses/1';
      await api.fetch(`integrations/${id}`, {
        method: 'PUT',
        body: {status: statusIri, retry: 0},
        headers: {'content-type': 'application/ld+json'},
      });
      showSuccess?.('Integração reenfileirada com sucesso');
      reload();
    } catch (err) {
      showError?.(err?.message || String(err));
    } finally {
      setLoading('');
    }
  };

  const cancel = async () => {
    setLoading('cancel');
    try {
      // Delete integration = cancel
      await api.fetch(`integrations/${id}`, {method: 'DELETE'});
      showSuccess?.('Integração cancelada');
      reload();
    } catch (err) {
      // fallback: try to set status to closed/canceled
      try {
        const closedStatus = await api.fetch('statuses', {params: {status: 'closed', realStatus: 'canceled', context: 'integration', itemsPerPage: 1}});
        const statusIri = closedStatus?.member?.[0]?.['@id'] || closedStatus?.['hydra:member']?.[0]?.['@id'] || null;
        if (statusIri) {
          await api.fetch(`integrations/${id}`, {method: 'PUT', body: {status: statusIri}, headers: {'content-type': 'application/ld+json'}});
          showSuccess?.('Integração cancelada');
          reload();
          return;
        }
        throw err;
      } catch (e2) {
        showError?.(e2?.message || err?.message || String(err));
      }
    } finally {
      setLoading('');
    }
  };

  return (
    <View style={styles.wrap}>
      {canReprocess ? (
        <Pressable onPress={reprocess} disabled={!!loading} style={[styles.btn, styles.reprocess, loading && styles.disabled]}>
          <Text style={styles.text}>{loading === 'reprocess' ? '...' : 'Reprocessar'}</Text>
        </Pressable>
      ) : null}
      {canCancel ? (
        <Pressable onPress={cancel} disabled={!!loading} style={[styles.btn, styles.cancel, loading && styles.disabled]}>
          <Text style={styles.text}>{loading === 'cancel' ? '...' : 'Cancelar'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', gap: 6},
  btn: {paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center'},
  reprocess: {backgroundColor: '#0EA5E9'},
  cancel: {backgroundColor: '#DC2626'},
  disabled: {opacity: 0.6},
  text: {color: '#fff', fontWeight: '800', fontSize: 11},
});
