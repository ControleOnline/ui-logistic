const {expect, test} = require('playwright/test');

const documents = [
  {path: '/cte', key: 'cte', title: 'CT-e', queue: 'CteEmission'},
  {path: '/nfce', key: 'nfce', title: 'NFC-e', queue: 'NfceEmission'},
  {path: '/nfe', key: 'nfe', title: 'NF-e', queue: 'NfeEmission'},
  {path: '/nfse', key: 'nfse', title: 'NFSe', queue: 'NfseEmission'},
];

test.describe('fiscal documents real API smoke', () => {
  test.beforeEach(async ({page}) => {
    const session = process.env.PLAYWRIGHT_SESSION_JSON;
    if (!session) {
      throw new Error('PLAYWRIGHT_SESSION_JSON deve conter uma sessao real do staging.');
    }

    await page.addInitScript(({sessionJson}) => {
      localStorage.setItem('session', sessionJson);
      localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
      localStorage.setItem('app-type', 'ERP');
    }, {sessionJson: session});
  });

  for (const document of documents) {
    test(`${document.title} opens its tabs and configuration`, async ({page}) => {
      const apiRequests = [];
      page.on('request', request => {
        try {
          const url = new URL(request.url());
          if (
            url.pathname.replace(/\/+$/, '').endsWith('/integrations') ||
            url.searchParams.has('queueName') ||
            url.searchParams.has('queueName[]')
          ) {
            apiRequests.push(url);
          }
        } catch {
          // Ignore non-URL browser requests.
        }
      });

      await page.goto(document.path);
      await expect(page.getByText(document.title, {exact: true}).first()).toBeVisible({timeout: 30000});
      await expect(page.getByTestId(`${document.key}-fiscal-config-button`)).toBeVisible();

      await page.getByTestId(`${document.key}-integrations-tab`).click();
      await expect(page.getByText('Integrações', {exact: true}).first()).toBeVisible();
      await expect.poll(
        () => apiRequests.some(url =>
          [
            ...url.searchParams.getAll('queueName'),
            ...url.searchParams.getAll('queueName[]'),
          ].includes(document.queue),
        ),
        {timeout: 30000, intervals: [250]},
      ).toBeTruthy();

      await page.getByTestId(`${document.key}-fiscal-config-button`).click();
      await expect(page.getByTestId(`${document.key}-fiscal-config-close`)).toBeVisible();
      await page.getByTestId(`${document.key}-fiscal-config-close`).click();
    });
  }
});
