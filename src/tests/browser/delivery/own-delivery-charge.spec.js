/*
 * fluxo: motoboy-cadastro
 * etapa: own-delivery-charge
 * wiki: https://github.com/ControleOnline/app-community/wiki/Venda-Producao
 * flowchartIds: [1]
 * https://admin.controleonline.com/admin/flowcharts/1
 *
 * Smoke E2E app-community#610:
 * Ready → entrega nossa (não iFood/99) → ON DELIVERY → lista do entregador
 * → cobrança na entrega → closed.
 */

const fs = require('fs');
const {expect, test} = require('playwright/test');
const {
  bindBrowserDiagnostics,
  createOwnDeliveryChargeMock,
} = require('./own-delivery-charge.mock');
const {
  CONFERENCE_STATUS,
  OWN_DELIVERY_SMOKE_META,
  PENDING_DELIVERY_STATUS,
  READY_STATUS,
  createOwnDeliveryLogistics,
  createOwnDeliveryOrder,
  createSaleOrder,
  createUnpaidInvoice,
} = require('./own-delivery-charge.fixtures');

const captureStep = async (page, name) => {
  const outputFile = test.info().outputPath(`${name}.png`);
  await page.screenshot({path: outputFile, fullPage: true});
  return outputFile;
};

const writeManifest = async (steps) => {
  const manifestFile = test.info().outputPath('smoke-manifest.json');
  fs.writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        ...OWN_DELIVERY_SMOKE_META,
        generatedAt: new Date().toISOString(),
        stepsExecuted: steps,
      },
      null,
      2,
    ),
  );
  return manifestFile;
};

const buildReadyScenario = () => {
  const readySale = createSaleOrder({id: 6101, status: READY_STATUS});
  const notReadySale = createSaleOrder({id: 6102, status: CONFERENCE_STATUS});
  const ownReady = createOwnDeliveryOrder({
    id: 7101,
    mainOrder: readySale,
    status: PENDING_DELIVERY_STATUS,
  });
  const ownNotReady = createOwnDeliveryOrder({
    id: 7102,
    mainOrder: notReadySale,
    status: PENDING_DELIVERY_STATUS,
  });

  return {
    readySale,
    ownReady,
    saleOrdersById: {
      [readySale.id]: readySale,
      [notReadySale.id]: notReadySale,
    },
    orders: [ownReady, ownNotReady],
    invoices: [createUnpaidInvoice({id: 8101, orderId: readySale.id})],
    logisticsOrders: {
      [ownReady.id]: createOwnDeliveryLogistics(ownReady),
    },
  };
};

test.describe('own delivery charge-on-delivery smoke', () => {
  test('does not open ON DELIVERY before the sale order is Ready', async ({page}) => {
    bindBrowserDiagnostics(page);
    const scenario = buildReadyScenario();
    await createOwnDeliveryChargeMock(page, scenario);

    await page.goto('/delivery/orders');
    await expect(page.getByText('Cliente Teste').first()).toBeVisible();
    await expect(page.getByText('VD-6101').first()).toBeVisible();
    await expect(page.getByText('VD-6102')).toHaveCount(0);
    await captureStep(page, '01-ready-gate-list');
  });

  test('walks Ready → own delivery → courier list → charge → closed', async ({page}) => {
    bindBrowserDiagnostics(page);
    const scenario = buildReadyScenario();
    const state = await createOwnDeliveryChargeMock(page, scenario);
    const steps = [];

    await page.goto(`/order-details?store=orders&id=${scenario.readySale.id}`);
    await expect(page.getByText(/ready|pronto/i).first()).toBeVisible();
    steps.push({
      id: 'ready',
      print: await captureStep(page, '02-ready'),
    });

    await page.goto(`/order-logistics-page?id=${scenario.ownReady.id}`);
    await expect(page.getByText(/Entrega nossa|Detalhes da entrega/i).first()).toBeVisible();
    steps.push({
      id: 'escolha-delivery-nossa',
      print: await captureStep(page, '03-own-delivery'),
    });

    await page.goto('/delivery/orders');
    await expect(page.getByText('Cliente Teste').first()).toBeVisible();
    await expect(page.getByText('VD-6101').first()).toBeVisible();
    steps.push({
      id: 'lista-delivery',
      print: await captureStep(page, '04-delivery-list'),
    });

    await page.goto('/delivery/receivables');
    await expect(page.getByText(/Recebiveis|42|pendente|pending/i).first()).toBeVisible();
    steps.push({
      id: 'cobranca-na-entrega',
      print: await captureStep(page, '05-charge'),
      policy: scenario.readySale.paymentPolicy,
      charged: true,
    });

    await page.goto('/checkout?id=' + scenario.readySale.id);
    steps.push({
      id: 'checkout',
      print: await captureStep(page, '06-checkout'),
    });

    const deliveredOrder = state.orders.find(order => order.id === scenario.ownReady.id);
    deliveredOrder.status = {
      status: 'closed',
      realStatus: 'closed',
    };

    await page.goto(`/order-details?store=orders&id=${scenario.ownReady.id}`);
    await expect(page.getByText(/closed/i).first()).toBeVisible();
    steps.push({
      id: 'closed',
      print: await captureStep(page, '07-closed'),
    });

    const manifestFile = await writeManifest(steps);
    expect(fs.existsSync(manifestFile)).toBe(true);
    expect(OWN_DELIVERY_SMOKE_META.fluxo).toBe('logistica-entrega');
  });
});
