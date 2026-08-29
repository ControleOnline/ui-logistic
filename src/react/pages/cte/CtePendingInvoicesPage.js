import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';

export default function CtePendingInvoicesPage() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>NFs sem CT-e</Text>
        <Text style={styles.subtitle}>
          Lista, agrupamento, seleção e resumo vêm do store invoice_taxes.
        </Text>
      </View>
      <DefaultTable storeName="invoice_taxes" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {fontSize: 18, fontWeight: '800', color: '#0F172A'},
  subtitle: {fontSize: 13, color: '#64748B', marginTop: 4},
});
