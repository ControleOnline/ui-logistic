import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import {
  resolveCurrentPeopleIri,
} from '@controleonline/ui-logistic/src/react/utils/deliveryIdentity';
import styles from '../deliveryList.styles';

export default function DeliveryReceivablesPage() {
  const navigation = useNavigation();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const { user, sessionChecked } = authStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};
  const { currentCompany } = peopleStore.getters || {};

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

  const hasCurrentCompany =
    !!currentCompany && Object.keys(currentCompany || {}).length > 0;
  const isBootstrapReady =
    Boolean(sessionChecked) && hasCurrentCompany && Boolean(themeColors);

  const openInvoice = useCallback(
    invoice => {
      const invoiceId = String(invoice?.id || invoice?.['@id'] || '').replace(/\D/g, '');
      if (!invoiceId) return;

      navigation.navigate('InvoiceDetailsPage', { id: invoiceId });
    },
    [navigation],
  );

  if (!isBootstrapReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary || '#2563EB'} />
      </View>
    );
  }

  if (!currentPeopleIri) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerStateTitle}>
          Nao foi possivel identificar o motoboy logado.
        </Text>
        <Text style={styles.centerStateText}>
          O relatorio de recebiveis depende do vinculo `people_link` do tipo `courier`.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: brandColors.background || '#F8FAFC' }]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <View style={styles.tableWrap}>
          <DefaultTable
            accentColor={brandColors.primary}
            add={false}
            forceCardsOnCompact={false}
            onRowPress={openInvoice}
            requestParams={{
              invoiceType: 'invoice',
              receiver: currentPeopleIri,
            }}
            searchProps={{
              placeholder: 'Buscar recebivel',
            }}
            showRowActions={false}
            sort={{
              direction: 'desc',
              field: 'dueDate',
            }}
            storeName="invoice"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
