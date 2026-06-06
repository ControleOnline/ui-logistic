/*
 * Contract imported from MODOS_OPERACAO.md
 * - Couriers associate a delivery-rate version with one or more companies.
 * - Existing links stay visible and new links are appended, not overwritten.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {
  normalizeEntityId,
  resolveCompanyLabel,
  resolveCompanyStatusLabel,
  unwrapHydratorItem,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {useDeliveryRateGroupItem} from './hooks';
import styles from './styles';

const normalizePeopleId = user =>
  normalizeEntityId(user?.people || user?.peopleId || user?.person || user?.personId || '');

export default function DeliveryRateTableCompaniesPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const {showError, showSuccess} = useMessage() || {};
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const peopleActions = peopleStore.actions;

  const groupId = useMemo(
    () => String(route?.params?.id || route?.params?.groupId || '').replace(/\D+/g, ''),
    [route?.params?.groupId, route?.params?.id],
  );

  const {item: group, isLoading, reload, error} = useDeliveryRateGroupItem(groupId, Boolean(groupId));
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const currentPeopleId = useMemo(() => normalizePeopleId(user), [user]);
  const currentPeopleIri = currentPeopleId ? `/people/${currentPeopleId}` : '';

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const linkedCompanyIds = useMemo(
    () =>
      Array.isArray(group?.companies)
        ? group.companies
            .map(link => normalizeEntityId(link?.company ?? link?.companyId ?? link))
            .filter(Boolean)
        : [],
    [group?.companies],
  );

  const visibleCompanies = useMemo(
    () =>
      companies
        .map(company => ({
          ...company,
          selected: selectedCompanyIds.includes(String(company?.id)),
          linked: linkedCompanyIds.includes(String(company?.id)),
        }))
        .sort((left, right) =>
          resolveCompanyLabel(left).toLowerCase().localeCompare(resolveCompanyLabel(right).toLowerCase()),
        ),
    [companies, linkedCompanyIds, selectedCompanyIds],
  );

  useEffect(() => {
    if (!currentPeopleIri || !peopleActions.myCompanies) {
      return;
    }

    peopleActions
      .myCompanies()
      .then(list => {
        const nextCompanies = Array.isArray(list) ? list : [];
        setCompanies(nextCompanies);
        setSelectedCompanyIds(prev => {
          const next = new Set(prev);
          linkedCompanyIds.forEach(id => next.add(String(id)));
          return Array.from(next);
        });
      })
      .catch(error => {
        showError?.(error?.message || 'Não foi possível carregar as empresas disponíveis.');
      });
  }, [currentPeopleIri, linkedCompanyIds, peopleActions, showError]);

  const toggleCompany = company => {
    const companyId = String(company?.id || '').replace(/\D+/g, '');
    if (!companyId || company?.panel_enabled === false || linkedCompanyIds.includes(companyId)) {
      return;
    }

    setSelectedCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId],
    );
  };

  const handleSave = async () => {
    if (!groupId) {
      return;
    }

    const additions = selectedCompanyIds.filter(
      id => id && !linkedCompanyIds.includes(String(id)),
    );

    if (additions.length === 0) {
      navigation.replace('DeliveryRateTablesPage');
      return;
    }

    setSaving(true);
    try {
      const response = await api.fetch(`/delivery_tax_groups/${groupId}/companies/associate`, {
        method: 'POST',
        body: { companyIds: additions },
      });
      unwrapHydratorItem(response);
      showSuccess?.('Empresas associadas à tabela.');
      await reload();
      navigation.replace('DeliveryRateTablesPage');
    } catch (error) {
      showError?.(error?.message || 'Não foi possível associar as empresas.');
    } finally {
      setSaving(false);
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

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Tabela não informada</Text>
            <Text style={styles.emptyStateText}>
              Abra uma tabela válida para associar empresas.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Tabela não encontrada</Text>
            <Text style={styles.emptyStateText}>
              Esta tabela não está disponível no seu contexto de segurança.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Courier</Text>
          <Text style={styles.heroTitle}>Associar empresas</Text>
          <Text style={styles.heroText}>
            Escolha quais empresas poderão usar esta versão da tabela. As empresas já associadas ficam travadas como histórico.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{group.groupName}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>v{group.versionNumber}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{group.vehicleType || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Empresas disponíveis</Text>
            <Text style={styles.sectionText}>
              Somente empresas com painel habilitado podem receber a associação.
            </Text>
          </View>

          <View style={styles.listCard}>
            {visibleCompanies.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>Nenhuma empresa encontrada</Text>
                <Text style={styles.emptyStateText}>
                  Use o vínculo `people_link` do tipo `courier` para disponibilizar empresas.
                </Text>
              </View>
            ) : (
              visibleCompanies.map(company => {
                const companyId = String(company?.id || '').replace(/\D+/g, '');
                const isLinked = linkedCompanyIds.includes(companyId);
                const isSelectable = company?.panel_enabled !== false && !isLinked;
                const isSelected = isLinked || selectedCompanyIds.includes(companyId);

                return (
                  <View key={companyId} style={styles.companyRow}>
                    <View style={styles.companyIdentity}>
                      <Text style={styles.companyTitle}>{resolveCompanyLabel(company)}</Text>
                      <Text style={styles.companyMeta}>
                        {resolveCompanyStatusLabel(company)} · #{companyId}
                      </Text>
                      {isLinked ? (
                        <View style={[styles.statusBadge, styles.statusBadgeActive]}>
                          <Text style={styles.statusBadgeText}>Já associada</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.toggleColumn}>
                      <Switch
                        value={isSelected}
                        disabled={!isSelectable}
                        onValueChange={() => toggleCompany(company)}
                        trackColor={{ false: '#E2E8F0', true: '#BAE6FD' }}
                        thumbColor={isSelected ? '#0EA5E9' : '#94A3B8'}
                      />
                      {!isSelectable ? (
                        <Text style={styles.companyMeta}>Indisponível</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <Text style={styles.helperText}>
            {selectedCompanyIds.length} empresas selecionadas, {linkedCompanyIds.length} já associadas.
          </Text>

          <View style={styles.actionBar}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.secondaryButton}
              onPress={() => navigation.replace('DeliveryRateTablesPage')}
            >
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
              disabled={saving}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Salvando...' : 'Salvar associações'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
