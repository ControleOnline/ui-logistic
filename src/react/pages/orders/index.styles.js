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
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  filtersHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filtersTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  filterSelectorsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: -8,
    marginHorizontal: -4,
  },
  filterSelectorSlot: {
    minWidth: 0,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  filterSelectorSlotHalf: {
    width: '50%',
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
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMetaRow: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  channelText: {
    color: '#475569',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default styles;
