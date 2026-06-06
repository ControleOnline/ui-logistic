/*
 * Contract imported from MODOS_OPERACAO.md
 * - The schedule form creates or updates one weekly window for the current courier.
 * - Saving never changes the company binding directly; that happens in the presence detail screen.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Switch, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  DELIVERY_PRESENCE_WEEKDAY_OPTIONS,
  formatWeekdayLabel,
  normalizeText,
  unwrapHydratorItem,
} from '@controleonline/ui-logistic/src/shared/deliveryPresence';
import {resolveCurrentPeopleIri} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';

const normalizeScheduleDraft = schedule => ({
  label: normalizeText(schedule?.label),
  weekday: Number(schedule?.weekday || 1),
  startTime: normalizeText(schedule?.startTime).slice(0, 5),
  endTime: normalizeText(schedule?.endTime).slice(0, 5),
  active: schedule?.active !== false,
});

export default function DeliveryCourierScheduleFormPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const {showError, showSuccess} = useMessage() || {};
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const schedulesStore = useStore('delivery_courier_schedules');

  const {actions} = schedulesStore;
  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const scheduleId = useMemo(
    () => String(route?.params?.id || route?.params?.scheduleId || '').replace(/\D+/g, ''),
    [route?.params?.id, route?.params?.scheduleId],
  );

  const currentPeopleIri = useMemo(
    () => resolveCurrentPeopleIri(user),
    [user?.people, user?.peopleId, user?.person, user?.personId],
  );

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [currentCompany?.id, themeColors],
  );

  const [draft, setDraft] = useState(() => normalizeScheduleDraft());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const loadSchedule = async () => {
    if (!scheduleId) {
      setDraft(normalizeScheduleDraft());
      return;
    }

    setIsLoading(true);
    try {
      const response = await actions.get(scheduleId);
      setDraft(normalizeScheduleDraft(response));
    } catch (caughtError) {
      const message =
        caughtError?.message || 'Nao foi possivel carregar o horario selecionado.';
      showError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!bootstrapReady) {
      return;
    }

    loadSchedule();
  }, [bootstrapReady, scheduleId]);

  const canSave = useMemo(
    () =>
      Boolean(normalizeText(draft.weekday)) &&
      Boolean(normalizeText(draft.startTime)) &&
      Boolean(normalizeText(draft.endTime)),
    [draft.endTime, draft.startTime, draft.weekday],
  );

  const updateField = (field, value) => {
    setDraft(currentDraft => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    if (!currentPeopleIri) {
      showError?.('Nao foi possivel identificar o motoboy logado.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        label: normalizeText(draft.label),
        weekday: Number(draft.weekday),
        startTime: normalizeText(draft.startTime),
        endTime: normalizeText(draft.endTime),
        active: Boolean(draft.active),
      };

      const response = await api.fetch(
        scheduleId ? `/delivery_courier_schedules/${scheduleId}` : '/delivery_courier_schedules',
        {
          method: scheduleId ? 'PUT' : 'POST',
          body: payload,
        },
      );
      const saved = unwrapHydratorItem(response);
      showSuccess?.(scheduleId ? 'Horario atualizado.' : 'Horario criado.');
      if (saved?.id) {
        navigation.replace('DeliveryCourierSchedulesPage');
      } else {
        navigation.goBack();
      }
    } catch (caughtError) {
      showError?.(caughtError?.message || 'Nao foi possivel salvar o horario.');
    } finally {
      setIsSaving(false);
    }
  };

  const openHistory = () => {
    if (!scheduleId) {
      return;
    }

    navigation.navigate('EntityLogPage', {
      id: scheduleId,
      store: 'delivery_courier_schedules',
      entityClass: 'ControleOnline\\Entity\\DeliveryCourierSchedule',
      entityLabel: normalizeText(draft.label) || `Horario #${scheduleId}`,
    });
  };

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary || '#0EA5E9'} />
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Motoboy nao identificado</Text>
            <Text style={styles.emptyStateText}>
              Os horarios dependem do vinculo `people_link` do tipo `courier`.
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
          <Text style={styles.heroTitle}>
            {scheduleId ? 'Editar horario' : 'Novo horario'}
          </Text>
          <Text style={styles.heroText}>
            O label e opcional. Se ficar vazio, o backend monta um nome automatico com base no dia e na janela.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {scheduleId ? `#${scheduleId}` : 'Novo registro'}
              </Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {formatWeekdayLabel(draft.weekday)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Identificacao</Text>
            <Text style={styles.sectionText}>
              Use essa janela em varias empresas sem repetir o intervalo.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nome do horario</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Opcional"
              placeholderTextColor="#94A3B8"
              value={draft.label}
              onChangeText={value => updateField('label', value)}
            />
            <Text style={styles.sectionNote}>
              Ex.: Segunda - manha, Terca - noite, Centro - 10h as 12h.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Dia da semana</Text>
            <View style={styles.segmentedRow}>
              {DELIVERY_PRESENCE_WEEKDAY_OPTIONS.map(option => {
                const active = Number(draft.weekday) === Number(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.86}
                    style={[
                      styles.segmentedOption,
                      active ? styles.segmentedOptionActive : null,
                    ]}
                    onPress={() => updateField('weekday', option.value)}
                  >
                    <Text
                      style={[
                        styles.segmentedLabel,
                        active ? styles.segmentedLabelActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.bandGrid}>
            <View style={styles.bandGridRow}>
              <View style={styles.bandField}>
                <Text style={styles.fieldLabel}>Hora inicial</Text>
                <TextInput
                  style={[styles.textInput, styles.bandFieldInput]}
                  keyboardType="default"
                  placeholder="10:00"
                  placeholderTextColor="#94A3B8"
                  value={draft.startTime}
                  onChangeText={value => updateField('startTime', value)}
                />
              </View>

              <View style={styles.bandField}>
                <Text style={styles.fieldLabel}>Hora final</Text>
                <TextInput
                  style={[styles.textInput, styles.bandFieldInput]}
                  keyboardType="default"
                  placeholder="12:00"
                  placeholderTextColor="#94A3B8"
                  value={draft.endTime}
                  onChangeText={value => updateField('endTime', value)}
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.heroPillRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>
                  {draft.active ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={[
                  styles.secondaryButton,
                  draft.active ? styles.segmentedOptionActive : null,
                ]}
                onPress={() => updateField('active', !draft.active)}
              >
                <Switch
                  value={draft.active}
                  onValueChange={value => updateField('active', value)}
                />
                <Text style={styles.secondaryButtonText}>
                  {draft.active ? 'Ativo' : 'Inativo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <Text style={styles.helperText}>
            A alteracao entra como nova versao da janela se voce estiver editando um horario ja existente.
          </Text>

          <View style={styles.actionBar}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>

            {scheduleId ? (
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.ghostButton}
                onPress={openHistory}
              >
                <Text style={styles.ghostButtonText}>Historico</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.86}
              style={[
                styles.primaryButton,
                !canSave || isSaving ? styles.primaryButtonDisabled : null,
                {backgroundColor: brandColors.primary || '#0EA5E9'},
              ]}
              disabled={!canSave || isSaving}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? 'Salvando...' : 'Salvar horario'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
