import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    gap: 8,
    padding: 20,
  },
  centerStateTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  centerStateText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  tableWrap: {
    flex: 1,
    minHeight: 0,
  },
});

export default styles;
