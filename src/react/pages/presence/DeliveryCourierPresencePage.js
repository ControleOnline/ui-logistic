/*
 * Contract imported from MODOS_OPERACAO.md
 * - Courier presence is managed per company with automatic/manual state and reusable weekly schedules.
 * - Manual connect and disconnect events require a reason and write an audit entry in the log table.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  buildScheduleWindowLabel,
  formatDateValue,
  formatWeekdayLabel,
  normalizeText,
  resolveAvailabilityStateLabel,
  resolvePeopleLabel,
  unwrapHydratorItem,
} from '@controleonline/ui-logistic/src/shared/deliveryPresence';
import {resolveCurrentPeopleIri} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';

const extraStyles = StyleSheet.create({
  summaryRow: {
    gap: 6,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  summaryValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  scheduleSwitchWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  scheduleEnabledText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  mutedCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  mutedCardTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  mutedCardText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
});

const normalizePresenceItem = presence => {
  if (!presence) {
    return null;
  }

  return {
    ...presence,
    company: presence?.company || null,
    courier: presence?.courier || null,
    schedules: Array.isArray(presence?.schedules) ? presence.schedules : [],
  };
};

const extractScheduleIds = presence =>
  Array.isArray(presence?.schedules)
    ? presence.schedules
        .map(presenceSchedule =>
          Number(
            String(
              presenceSchedule?.schedule?.id ||
                presenceSchedule?.scheduleId ||
                presenceSchedule?.schedule?.['@id'] ||
                presenceSchedule?.schedule ||
                '',
            ).replace(/\D+/g, ''),
          ),
        )
        .filter(Boolean)
        .map(id => String(id))
    : [];

const normalizeScheduleDraft = presence => ({
  availabilityMode:
    normalizeText(presence?.availabilityMode) || 'automatic',
  isOnline: Boolean(presence?.isOnline),
  manualReason: normalizeText(presence?.manualReason),
});

export default function DeliveryCourierPresencePage({
  readOnly = false,
  navigation: navigationProp = null,
  route: routeProp = null,
}) {
  const navigation = navigationProp || useNavigation();
  const route = routeProp || useRoute();
  const isFocused = useIsFocused();
  const {showError, showPrompt, showSuccess} = useMessage() || {};
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const presenceStore = useStore('delivery_courier_company_presences');
  const schedulesStore = useStore('delivery_courier_schedules');

  const {actions: presenceActions} = presenceStore;
  const {actions: scheduleActions} = schedulesStore;
  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const currentPeopleIri = useMemo(
    () => resolveCurrentPeopleIri(user),
    [user?.people, user?.peopleId, user?.person, user?.personId],
  );

  const routeReadOnly = Boolean(route?.params?.readOnly);
  const isReadOnly = Boolean(readOnly || routeReadOnly);

  const targetCompanyId = useMemo(
    () =>
      String(
        route?.params?.companyId ||
          route?.params?.company?.id ||
          route?.params?.company?.value ||
          currentCompany?.id ||
          '',
      ).replace(/\D+/g, ''),
    [currentCompany?.id, route?.params?.company, route?.params?.companyId],
  );

  const targetPresenceId = useMemo(
    () =>
      String(route?.params?.presenceId || route?.params?.id || '').replace(/\D+/g, ''),
    [route?.params?.id, route?.params?.presenceId],
  );

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [currentCompany?.id, themeColors],
  );

  const [presenceItem, setPresenceItem] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [draft, setDraft] = useState(() => normalizeScheduleDraft());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const targetCompany = useMemo(
    () => presenceItem?.company || route?.params?.company || currentCompany || null,
    [currentCompany, presenceItem?.company, route?.params?.company],
  );

  const targetCompanyLabel = useMemo(
    () => resolvePeopleLabel(targetCompany),
    [targetCompany],
  );

  const targetCourierLabel = useMemo(
    () => resolvePeopleLabel(presenceItem?.courier || user?.people || user?.person),
    [presenceItem?.courier, user?.people, user?.person],
  );

  const loadPresence = async () => {
    if (isReadOnly && targetPresenceId) {
      const response = await presenceActions.get(targetPresenceId);
      return normalizePresenceItem(response);
    }

    if (!targetCompanyId) {
      return null;
    }

    const query = {
      company: `/people/${targetCompanyId}`,
    };

    if (!isReadOnly && currentPeopleIri) {
      query.courier = currentPeopleIri;
    }

    const response = await presenceActions.getItems(query);
    const item = Array.isArray(response) ? response[0] : response?.[0] || null;
    return normalizePresenceItem(item);
  };

  const loadSchedules = async () => {
    if (isReadOnly || !currentPeopleIri) {
      return [];
    }

    const response = await scheduleActions.getItems({
      courier: currentPeopleIri,
    });

    return Array.isArray(response) ? response : [];
  };

  const reload = async () => {
    if (!bootstrapReady) {
      return;
    }

    if (!isReadOnly && !currentPeopleIri) {
      showError?.('Nao foi possivel identificar o motoboy logado.');
      return;
    }

    if (isReadOnly && !targetPresenceId && !targetCompanyId) {
      return;
    }

    setIsLoading(true);
    try {
      const [nextPresence, nextSchedules] = await Promise.all([
        loadPresence(),
        loadSchedules(),
      ]);

      setPresenceItem(nextPresence);
      setSchedules(nextSchedules);
      setSelectedScheduleIds(extractScheduleIds(nextPresence));
      setDraft(normalizeScheduleDraft(nextPresence));
    } catch (caughtError) {
      showError?.(caughtError?.message || 'Nao foi possivel carregar a presenca.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    reload();
  }, [isFocused, targetCompanyId, targetPresenceId, isReadOnly, currentPeopleIri, bootstrapReady]);

  useEffect(() => {
    setDraft(normalizeScheduleDraft(presenceItem));
    setSelectedScheduleIds(extractScheduleIds(presenceItem));
  }, [presenceItem?.id]);

  const currentStateLabel = useMemo(
    () => resolveAvailabilityStateLabel({ ...presenceItem, ...draft }),
    [draft, presenceItem],
  );

  const currentModeLabel = useMemo(() => {
    const mode = normalizeText(presenceItem?.availabilityMode || draft.availabilityMode);
    return mode === 'manual' ? 'Manual' : 'Automatico';
  }, [draft.availabilityMode, presenceItem?.availabilityMode]);

  const currentEffectiveOnline = useMemo(() => {
    if (presenceItem?.availabilityMode === 'manual') {
      return Boolean(presenceItem?.isOnline);
    }

    return Boolean(presenceItem?.effectiveOnline ?? presenceItem?.isOnline);
  }, [presenceItem]);

  const renderedSchedules = useMemo(
    () => (isReadOnly ? presenceItem?.schedules || [] : schedules),
    [isReadOnly, presenceItem?.schedules, schedules],
  );

  const savePresence = async overrides => {
    if (!targetCompanyId) {
      showError?.('Empresa nao identificada para esta presenca.');
      return null;
    }

    if (!isReadOnly && !currentPeopleIri) {
      showError?.('Nao foi possivel identificar o motoboy logado.');
      return null;
    }

    const wasExisting = Boolean(presenceItem?.id);
    setIsSaving(true);
    try {
      const nextPayload = {
        companyId: targetCompanyId,
        availabilityMode: overrides?.availabilityMode || draft.availabilityMode || 'automatic',
        isOnline:
          overrides?.isOnline !== undefined ? overrides.isOnline : draft.isOnline,
        manualReason:
          overrides?.manualReason !== undefined
            ? overrides.manualReason
            : draft.manualReason,
        scheduleIds:
          Array.isArray(overrides?.scheduleIds) ? overrides.scheduleIds : selectedScheduleIds,
      };

      const response = await api.fetch('/delivery_courier_company_presences', {
        method: 'POST',
        body: nextPayload,
      });
      const saved = normalizePresenceItem(unwrapHydratorItem(response));

      setPresenceItem(saved);
      setDraft(normalizeScheduleDraft(saved));
      setSelectedScheduleIds(extractScheduleIds(saved));

      if (saved) {
        showSuccess?.(wasExisting ? 'Presenca atualizada.' : 'Presenca criada.');
      }

      return saved;
    } catch (caughtError) {
      showError?.(caughtError?.message || 'Nao foi possivel salvar a presenca.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualToggle = async nextOnline => {
    const reason = await showPrompt?.({
      title: nextOnline ? 'Motivo da conexao' : 'Motivo da desconexao',
      message: 'Informe o motivo para registrar a mudanca manual.',
      defaultValue: draft.manualReason || '',
      placeholder: 'Ex.: imprevisto na rota',
      confirmLabel: 'Salvar',
    });

    if (!reason) {
      return;
    }

    await savePresence({
      availabilityMode: 'manual',
      isOnline: Boolean(nextOnline),
      manualReason: reason,
    });
  };

  const handleAutomaticMode = async () => {
    await savePresence({
      availabilityMode: 'automatic',
      manualReason: null,
    });
  };

  const handleScheduleToggle = async scheduleId => {
    if (isReadOnly) {
      return;
    }

    const normalizedId = String(scheduleId).replace(/\D+/g, '');
    if (!normalizedId) {
      return;
    }

    const nextSelectedIds = selectedScheduleIds.includes(normalizedId)
      ? selectedScheduleIds.filter(id => id !== normalizedId)
      : [...selectedScheduleIds, normalizedId];

    const saved = await savePresence({
      scheduleIds: nextSelectedIds,
    });

    if (saved) {
      setSelectedScheduleIds(nextSelectedIds);
    }
  };

  const openHistory = () => {
    if (!presenceItem?.id) {
      return;
    }

    navigation.navigate('DeliveryCourierPresenceHistoryPage', {
      id: String(presenceItem.id).replace(/\D+/g, ''),
      store: 'delivery_courier_company_presences',
      entityClass: 'ControleOnline\\Entity\\DeliveryCourierCompanyPresence',
      entityLabel:
        targetCompanyLabel || `Presenca #${String(presenceItem.id).replace(/\D+/g, '')}`,
    });
  };

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary || '#0EA5E9'} />
      </View>
    );
  }

  if (!isReadOnly && !currentPeopleIri) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Motoboy nao identificado</Text>
            <Text style={styles.emptyStateText}>
              A presenca depende do vinculo `people_link` do tipo `courier`.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!targetCompanyId && !targetPresenceId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Empresa nao informada</Text>
            <Text style={styles.emptyStateText}>
              Abra a empresa homologada ou a presenca vinda do inbox do manager.
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
          <Text style={styles.heroEyebrow}>{isReadOnly ? 'Manager' : 'Courier'}</Text>
          <Text style={styles.heroTitle}>
            {targetCompanyLabel || 'Presenca da empresa'}
          </Text>
          <Text style={styles.heroText}>
            {isReadOnly
              ? 'A tela e apenas de leitura. O manager acompanha quem esta online e qual foi a ultima mudanca.'
              : 'A tela controla o estado online por empresa e os horarios automaticos reutilizaveis.'}
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{currentModeLabel}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{currentStateLabel}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {currentEffectiveOnline ? 'Disponivel' : 'Indisponivel'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumo da presenca</Text>
            <Text style={styles.sectionText}>
              {isReadOnly
                ? 'Somente leitura para o manager.'
                : 'Qualquer acao manual grava o motivo no log e atualiza o estado materializado.'}
            </Text>
          </View>

          <View style={extraStyles.summaryRow}>
            <Text style={extraStyles.summaryLabel}>Motoboy</Text>
            <Text style={extraStyles.summaryValue}>{targetCourierLabel}</Text>
          </View>

          <View style={extraStyles.summaryRow}>
            <Text style={extraStyles.summaryLabel}>Empresa</Text>
            <Text style={extraStyles.summaryValue}>{targetCompanyLabel}</Text>
          </View>

          <View style={extraStyles.summaryRow}>
            <Text style={extraStyles.summaryLabel}>Horario automatico</Text>
            <Text style={extraStyles.summaryValue}>
              {selectedScheduleIds.length > 0
                ? `${selectedScheduleIds.length} vinculados`
                : 'Nenhum horario vinculado'}
            </Text>
          </View>

          <View style={extraStyles.summaryRow}>
            <Text style={extraStyles.summaryLabel}>Motivo manual</Text>
            <Text style={extraStyles.summaryValue}>
              {normalizeText(presenceItem?.manualReason || draft.manualReason) || '-'}
            </Text>
          </View>

          <View style={extraStyles.summaryRow}>
            <Text style={extraStyles.summaryLabel}>Ultima conexao</Text>
            <Text style={extraStyles.summaryValue}>
              {formatDateValue(presenceItem?.lastOnlineAt)}
            </Text>
          </View>

          <View style={extraStyles.summaryRow}>
            <Text style={extraStyles.summaryLabel}>Ultima desconexao</Text>
            <Text style={extraStyles.summaryValue}>
              {formatDateValue(presenceItem?.lastOfflineAt)}
            </Text>
          </View>
        </View>

        {!isReadOnly ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Acoes rapidas</Text>
              <Text style={styles.sectionText}>
                Use a conexao manual quando houver imprevisto e volte para automatico quando a rotina normalizar.
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.primaryButton}
                disabled={isSaving}
                onPress={handleAutomaticMode}
              >
                <Text style={styles.primaryButtonText}>Automatico</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.secondaryButton}
                disabled={isSaving}
                onPress={() => handleManualToggle(true)}
              >
                <Text style={styles.secondaryButtonText}>Ligar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.secondaryButton}
                disabled={isSaving}
                onPress={() => handleManualToggle(false)}
              >
                <Text style={styles.secondaryButtonText}>Desligar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.ghostButton}
                disabled={!presenceItem?.id}
                onPress={openHistory}
              >
                <Text style={styles.ghostButtonText}>Historico</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.ghostButton}
                onPress={() => navigation.navigate('DeliveryCourierSchedulesPage')}
              >
                <Text style={styles.ghostButtonText}>Horarios</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Horarios associados</Text>
            <Text style={styles.sectionText}>
              {isReadOnly
                ? 'Os horarios abaixo sao apenas leitura.'
                : 'Marque os horarios que esta empresa pode usar para ligar a presenca automaticamente.'}
            </Text>
          </View>

          {renderedSchedules.length === 0 ? (
            <View style={extraStyles.mutedCard}>
              <Text style={extraStyles.mutedCardTitle}>Nenhum horario cadastrado</Text>
              <Text style={extraStyles.mutedCardText}>
                Cadastre janelas na tela de horarios antes de associar empresas.
              </Text>
            </View>
          ) : (
            <View style={styles.fieldGroup}>
              {renderedSchedules.map(scheduleLink => {
                const scheduleEntity = isReadOnly ? scheduleLink?.schedule : scheduleLink;
                const scheduleId = String(scheduleEntity?.id || '').replace(/\D+/g, '');
                const selected = selectedScheduleIds.includes(scheduleId);
                const scheduleLabel =
                  normalizeText(scheduleEntity?.label) ||
                  `${normalizeText(scheduleEntity?.weekdayLabel) || formatWeekdayLabel(scheduleEntity?.weekday)} ${buildScheduleWindowLabel(scheduleEntity)}`;

                return (
                  <View key={scheduleId} style={styles.bandCard}>
                    <View style={styles.bandHeader}>
                      <View style={styles.bandTitleWrap}>
                        <Text style={styles.bandIndex}>{scheduleLabel}</Text>
                        <Text style={styles.bandSubtitle}>
                          {normalizeText(scheduleEntity?.weekdayLabel) || formatWeekdayLabel(scheduleEntity?.weekday)} - {buildScheduleWindowLabel(scheduleEntity)}
                        </Text>
                      </View>

                      <View style={extraStyles.scheduleSwitchWrap}>
                        <Text style={extraStyles.scheduleEnabledText}>
                          {selected ? 'Vinculado' : 'Livre'}
                        </Text>
                        <Switch
                          disabled={isReadOnly || isSaving}
                          value={selected}
                          onValueChange={() => handleScheduleToggle(scheduleId)}
                        />
                      </View>
                    </View>

                    <View style={styles.heroPillRow}>
                      <View style={styles.heroPill}>
                        <Text style={styles.heroPillText}>
                          {normalizeText(scheduleEntity?.weekdayLabel) || formatWeekdayLabel(scheduleEntity?.weekday)}
                        </Text>
                      </View>
                      <View style={styles.heroPill}>
                        <Text style={styles.heroPillText}>
                          {buildScheduleWindowLabel(scheduleEntity)}
                        </Text>
                      </View>
                      <View style={styles.heroPill}>
                        <Text style={styles.heroPillText}>
                          {scheduleEntity?.active ? 'Ativo' : 'Inativo'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Auditoria</Text>
          <Text style={styles.helperText}>
            Toda mudanca de online/offline e modo fica registrada no log da entidade e aparece nos dois aplicativos.
          </Text>

          <View style={styles.actionBar}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.86} style={styles.ghostButton} onPress={reload}>
              <Text style={styles.ghostButtonText}>Atualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
