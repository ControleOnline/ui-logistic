/*
 * Contract imported from MODOS_OPERACAO.md
 * - Editing a delivery-rate table creates a new immutable version from the current snapshot.
 * - The courier can change the header and km bands, then associate companies in the next step.
 */

/* eslint-disable no-unused-vars */

import React, {useMemo} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {
  createDraftFromGroup,
  createEmptyTableDraft,
  unwrapHydratorItem,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {useDeliveryRateGroupItem} from './hooks';
import DeliveryRateTableEditor from './DeliveryRateTableEditor';
import styles from './styles';

export default function DeliveryRateTableFormPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const {showError, showSuccess} = useMessage() || {};
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {sessionChecked, user} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const sourceId = useMemo(
    () => String(route?.params?.id || route?.params?.sourceId || route?.params?.cloneFrom || '').replace(/\D+/g, ''),
    [route?.params?.cloneFrom, route?.params?.id, route?.params?.sourceId],
  );

  const {item: sourceGroup, isLoading, error} = useDeliveryRateGroupItem(sourceId, Boolean(sourceId));

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const initialDraft = useMemo(
    () => (sourceGroup ? createDraftFromGroup(sourceGroup) : createEmptyTableDraft()),
    [sourceGroup],
  );

  const handleSave = async payload => {
    try {
      const body = {
        ...payload,
        cloneFrom: sourceGroup?.id ? String(sourceGroup.id) : undefined,
      };
      const response = await api.fetch('/delivery_tax_groups', {
        method: 'POST',
        body,
      });
      const saved = unwrapHydratorItem(response);

      showSuccess?.('Nova versão da tabela salva.');

      if (saved?.id) {
        navigation.replace('DeliveryRateTableCompaniesPage', { id: String(saved.id) });
      } else {
        navigation.replace('DeliveryRateTablesPage');
      }

      return saved;
    } catch (error) {
      showError?.(error?.message || 'Não foi possível salvar a versão da tabela.');
      throw error;
    }
  };

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!sourceId || sourceGroup ? (
        <DeliveryRateTableEditor
          initialDraft={initialDraft}
          lockVehicleType={false}
          saveLabel={sourceGroup ? 'Salvar nova versão' : 'Salvar tabela'}
          subtitle={
            sourceGroup
              ? 'A edição cria uma nova versão e preserva o histórico anterior.'
              : 'Cadastre uma nova tabela de entrega a partir do zero.'
          }
          title={sourceGroup ? `Versão a partir de ${sourceGroup.groupName}` : 'Nova tabela'}
          helperText="Se a tabela já existir, os vínculos de empresa são copiados para a nova versão e poderão ser ajustados no próximo passo."
          onCancel={() => navigation.navigate('DeliveryRateTablesPage')}
          onSave={handleSave}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyStateTitle}>Tabela não encontrada</Text>
          <Text style={styles.emptyStateText}>
            A tabela selecionada não está disponível no seu contexto de segurança.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
