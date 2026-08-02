/*
 * Contract imported from MODOS_OPERACAO.md
 * - DELIVERY is the courier app shell and must block entry until the first courier vehicle exists.
 * - The home menu only appears after the courier has a moto or bike registered in the dedicated vehicle table.
 */

import React, {useEffect, useMemo} from 'react';
import {ActivityIndicator, ScrollView, Text as NativeText, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-animatable';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import AppMenuGrid from '@controleonline/ui-layout/src/react/components/AppMenuGrid';
import {normalizeEntityId} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {
  isDeliveryCourierVehicleComplete,
  useDeliveryCourierVehiclesCollection,
} from '@controleonline/ui-logistic/src/react/pages/delivery-rates/hooks';
import styles from './index.styles';

const normalizePeopleId = user =>
  normalizeEntityId(user?.people || user?.peopleId || user?.person || user?.personId || '');

export default function DeliveryHomePage({navigation}) {
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors, menus} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const currentPeopleId = useMemo(() => normalizePeopleId(user), [user]);
  const currentPeopleIri = currentPeopleId ? `/people/${currentPeopleId}` : '';

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.theme?.colors],
  );

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(user) &&
    Boolean(currentCompany) &&
    Boolean(themeColors);

  const {
    items: courierVehicles,
    isLoading: isCourierVehicleLoading,
    error: courierVehicleError,
    reload: reloadCourierVehicles,
  } = useDeliveryCourierVehiclesCollection(
    useMemo(() => ({ courier: currentPeopleIri}), [currentPeopleIri]),
    Boolean(bootstrapReady && currentPeopleIri),
  );

  const hasRegisteredVehicle = useMemo(
    () => courierVehicles.some(vehicle => isDeliveryCourierVehicleComplete(vehicle)),
    [courierVehicles],
  );

  useEffect(() => {
    if (!bootstrapReady || !currentPeopleIri || isCourierVehicleLoading || courierVehicleError) {
      return;
    }

    if (!hasRegisteredVehicle) {
      navigation.replace('DeliveryVehicleSetupPage');
    }
  }, [bootstrapReady, currentPeopleIri, courierVehicleError, hasRegisteredVehicle, isCourierVehicleLoading, navigation]);

  if (!bootstrapReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={brandColors.primary || '#2563EB'} size="large" />
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: brandColors.background}]}
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Motoboy não identificado</Text>
            <Text style={styles.emptyStateText}>
              O modo DELIVERY depende do vínculo `people_link` do tipo `courier`.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (courierVehicleError) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: brandColors.background}]}
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#FCA5A5',
              borderRadius: 18,
              borderWidth: 1,
              gap: 10,
              maxWidth: 420,
              padding: 16,
              width: '100%',
            }}
          >
            <NativeText style={{color: '#991B1B', fontSize: 16, fontWeight: '800'}}>
              Falha ao carregar o delivery
            </NativeText>
            <NativeText style={{color: '#B91C1C', fontSize: 13, lineHeight: 18}}>
              {courierVehicleError}
            </NativeText>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={reloadCourierVehicles}
              style={{
                alignItems: 'center',
                alignSelf: 'flex-start',
                backgroundColor: '#0EA5E9',
                borderRadius: 14,
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 16,
              }}
            >
              <NativeText style={{color: '#FFFFFF', fontSize: 13, fontWeight: '800'}}>
                Tentar novamente
              </NativeText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isCourierVehicleLoading || !hasRegisteredVehicle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={brandColors.primary || '#2563EB'} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background}]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Entrega</Text>
        </View>

        <AppMenuGrid
          emptyMessage="Nenhum menu de entrega configurado."
          menus={menus}
          navigation={navigation}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
