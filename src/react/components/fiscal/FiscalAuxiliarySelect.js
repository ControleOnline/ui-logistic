import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

export default function FiscalAuxiliarySelect({label, value, options = [], onChange, readOnly = false}) {
  const [visible, setVisible] = useState(false);
  const selected = useMemo(() => options.find(option => String(option.value) === String(value)), [options, value]);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={readOnly} onPress={() => setVisible(true)} style={[styles.input, readOnly && styles.readOnly]}>
      <Text style={selected ? styles.value : styles.placeholder}>{selected ? `${selected.value} - ${selected.label}` : 'Selecione'}</Text>
      {!readOnly ? <Text style={styles.chevron}>▾</Text> : null}
    </Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
        <View style={styles.modal} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>{label}</Text>
          <ScrollView>{options.map(option => <Pressable key={option.value} onPress={() => {onChange(option.value); setVisible(false);}} style={[styles.option, String(option.value) === String(value) && styles.optionSelected]}><Text style={styles.optionText}>{option.value} - {option.label}</Text></Pressable>)}</ScrollView>
        </View>
      </Pressable>
    </Modal>
  </View>;
}

export const FiscalModelField = ({model, options = []}) => {
  const selected = options.find(option => String(option.value) === String(model));
  return <View style={styles.field}><Text style={styles.label}>Modelo fiscal</Text><View style={[styles.input, styles.readOnly]}><Text style={styles.value}>{selected ? `${selected.value} - ${selected.label}` : String(model || '-')}</Text></View></View>;
};

const styles = StyleSheet.create({field: {flexGrow: 1, flexBasis: 220, minWidth: 180}, label: {fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase'}, input: {marginTop: 6, minHeight: 46, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, readOnly: {backgroundColor: '#F1F5F9'}, value: {color: '#0F172A'}, placeholder: {color: '#94A3B8'}, chevron: {fontSize: 18, color: '#0F766E'}, backdrop: {flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', padding: 20, justifyContent: 'center'}, modal: {backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '80%'}, modalTitle: {fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8}, option: {paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0'}, optionSelected: {backgroundColor: '#ECFDF5'}, optionText: {fontSize: 14, color: '#0F172A'}});
