/* eslint-disable no-unused-vars */
import React, {useMemo} from 'react';
import {ActivityIndicator, ScrollView, View} from 'react-native';
import {Text} from 'react-native-animatable';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import AppMenuGrid from '@controleonline/ui-layout/src/react/components/AppMenuGrid';
import styles from './index.styles';

export default function DeliveryHomePage({navigation}) {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {colors: themeColors, menus} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  if (!currentCompany || !themeColors) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={brandColors.primary || '#2563EB'} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background || '#F8FAFC'}]}
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
