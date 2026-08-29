import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

export default function CteEmitNfActions({row, onPreview, onRemove}) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => onPreview?.(row)} style={styles.pdf}>
        <MaterialCommunityIcons name="file-pdf-box" size={14} color="#fff" />
        <Text style={styles.text}>PDF</Text>
      </Pressable>
      <Pressable onPress={() => onRemove?.(row)} style={styles.remove}>
        <MaterialCommunityIcons name="minus-circle-outline" size={14} color="#fff" />
        <Text style={styles.text}>Remover</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', gap: 8, marginTop: 8},
  pdf: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F766E', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10},
  remove: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#BE123C', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10},
  text: {color: '#fff', fontWeight: '800', fontSize: 11},
});
