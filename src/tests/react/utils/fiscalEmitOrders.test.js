import {selectFiscalOrders} from '../../../shared/fiscalEmitOrders';

describe('selectFiscalOrders', () => {
  it('keeps only the orders selected for the emission screen', () => {
    const rows = [{id: 72892}, {id: 72890}, {id: 72175}];

    expect(selectFiscalOrders(rows, ['72890', '72175'])).toEqual([{id: 72890}, {id: 72175}]);
  });

  it('does not fabricate missing order rows', () => {
    expect(selectFiscalOrders([{id: 72175}], ['72175', '72177'])).toEqual([{id: 72175}]);
  });
});
