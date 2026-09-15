// fluxo: nfce-detalhe-pdf | etapa: jornada-completa | https://github.com/ControleOnline/ui-logistic/wiki/NFC-e-Detalhe-e-PDF
const {expect, test} = require('playwright/test');

const session = () => {
  const value = process.env.PLAYWRIGHT_SESSION_JSON;
  if (!value) throw new Error('PLAYWRIGHT_SESSION_JSON deve conter uma sessão real do staging.');
  return value;
};

const capture = async (page, testInfo, step, label) =>
  page.screenshot({path: testInfo.outputPath(`${step}-${label}.png`), fullPage: true});

test.describe('NFC-e emitida: detalhe e PDF', () => {
  test.beforeEach(async ({page}) => {
    await page.addInitScript(({sessionJson}) => {
      localStorage.setItem('session', sessionJson);
      localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
      localStorage.setItem('app-type', 'ERP');
    }, {sessionJson: session()});
  });

  test('completes the authenticated emitted-document journey with per-step evidence', async ({page}, testInfo) => {
    await page.goto('/nfce');
    await expect(page.getByText('NFC-e', {exact: true}).first()).toBeVisible({timeout: 30000});
    await page.getByTestId('nfce-emitted-tab').click();
    await expect(page.getByTestId('nfce-row-detail').first()).toBeVisible({timeout: 30000});
    await capture(page, testInfo, '01', 'lista');
    await expect(page.getByTestId('nfce-row-detail').first()).toBeEnabled();
    await expect(page.getByTestId('nfce-row-pdf').first()).toBeEnabled();
    await page.getByTestId('nfce-row-detail').first().click();
    await expect(page.getByText('Detalhe da NFC-e', {exact: true})).toBeVisible({timeout: 30000});
    for (const field of ['id', 'serie', 'numero', 'status', 'protocolo']) {
      await expect(page.getByTestId(`nfce-detail-${field}`)).toBeVisible();
    }
    await capture(page, testInfo, '02', 'detalhe');
    const detailPdf = page.getByTestId('nfce-detail-pdf');
    await expect(detailPdf).toBeEnabled();
    expect(await detailPdf.textContent()).toMatch(/NFC-E-.+-.+\.pdf/);
    await detailPdf.click();
    await expect(page.getByTestId('nfce-detail-pdf-close')).toBeVisible({timeout: 30000});
    await capture(page, testInfo, '03', 'pdf');
    await page.getByTestId('nfce-detail-pdf-close').click();
    await page.goto('/nfce');
    await page.getByTestId('nfce-emitted-tab').click();
    await expect(page.locator('[data-testid="nfce-row-detail"][aria-disabled="true"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="nfce-row-pdf"][aria-disabled="true"]')).toHaveCount(1);
    await capture(page, testInfo, '04', 'disabled');
  });

  test('exposes the actionable PDF error state', async ({page}, testInfo) => {
    await page.goto('/nfce');
    await page.getByTestId('nfce-emitted-tab').click();
    await expect(page.getByTestId('nfce-row-pdf').first()).toBeVisible({timeout: 30000});
    await page.route('**/invoice_taxes/*/download-nf**', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({})}));
    await page.getByTestId('nfce-row-pdf').first().click();
    await expect(page.getByTestId('nfce-pdf-error')).toContainText('não retornou conteúdo', {timeout: 30000});
    await capture(page, testInfo, '05', 'pdf-error');
  });
});
