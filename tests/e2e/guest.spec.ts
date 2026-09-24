import { expect, test } from '@playwright/test';
import { DEFAULT_MIX } from '../../src/lib/mix';

const HOME = '/linosbinaural/';
const validLookingToken = 'a'.repeat(48);

test('restores a local draft without starting sound', async ({ page }) => {
  await page.addInitScript(mix => {
    localStorage.setItem('linosbinaural:v1:draft', JSON.stringify({ mix, title: 'Local draft', selected: null }));
  }, { ...DEFAULT_MIX, binaural: { ...DEFAULT_MIX.binaural, beat: 7.5 } });
  await page.goto(HOME);
  await expect(page.getByRole('heading', { name: 'Local draft' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Beat frequency (Hz)' })).toHaveValue('7.5');
  await expect(page.getByRole('button', { name: 'Play session' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Stop and reset session' })).toBeDisabled();
  await expect(page.locator('.room-scene')).not.toHaveClass(/playing/);
});

test('plays after a gesture, pauses, resumes, and stops', async ({ page }) => {
  await page.goto(HOME);
  await page.getByRole('button', { name: 'Play session' }).click();
  await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.room-scene')).toHaveClass(/playing/);
  await page.getByRole('button', { name: 'Pause session' }).click();
  await expect(page.getByRole('button', { name: 'Play session' })).toBeVisible();
  await page.getByRole('button', { name: 'Play session' }).click();
  await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop and reset session' }).click();
  await expect(page.getByRole('button', { name: 'Stop and reset session' })).toBeDisabled();
});

test('precise frequency inputs classify boundaries and advanced controls show channel values', async ({ page }) => {
  await page.goto(HOME);
  const beat = page.getByRole('spinbutton', { name: 'Beat frequency (Hz)' });
  await beat.fill('4');
  await expect(page.locator('.band-badge')).toContainText('Theta');
  await beat.fill('30');
  await expect(page.locator('.band-badge')).toContainText('Gamma');
  await page.getByRole('spinbutton', { name: 'Carrier frequency (Hz)' }).fill('300');
  await page.getByRole('button', { name: /Fine tuning/ }).click();
  await expect(page.locator('#advanced-audio')).toContainText('Left: 285 Hz · Right: 315 Hz');
  await page.getByRole('combobox', { name: 'Sound texture' }).selectOption('triangle');
  await expect(page.getByRole('combobox', { name: 'Sound texture' })).toHaveValue('triangle');
  await expect(page.getByRole('spinbutton', { name: 'End fade (s)' })).toBeVisible();
});

test('supports ambience only and continuous duration', async ({ page }) => {
  await page.goto(HOME);
  await page.getByRole('switch', { name: 'Enable binaural tones' }).click();
  await expect(page.getByRole('switch', { name: 'Enable binaural tones' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('Ambience only. Headphones are optional.')).toBeVisible();
  await page.getByRole('switch', { name: 'Enable Ocean waves' }).click();
  await expect(page.getByRole('switch', { name: 'Enable Ocean waves' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('combobox', { name: 'Stay a while' }).selectOption('continuous');
  await expect(page.getByRole('combobox', { name: 'Stay a while' })).toHaveValue('continuous');
  await expect(page.locator('.transport-time')).toContainText('∞');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('linosbinaural:v1:draft') || '{}')?.mix?.durationMinutes)).toBeNull();
});

test('loads a record without autoplay or raising master volume', async ({ page }) => {
  await page.goto(HOME);
  const master = page.getByRole('spinbutton', { name: 'Master volume (%)' });
  await master.fill('23');
  await page.getByRole('button', { name: /Quiet Shore/ }).click();
  await expect(page.getByRole('heading', { name: 'Quiet Shore' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Beat frequency (Hz)' })).toHaveValue('6');
  await expect(master).toHaveValue('23');
  await expect(page.getByRole('button', { name: 'Play session' })).toBeVisible();
  await expect(page.locator('.room-scene')).not.toHaveClass(/playing/);
});

test('keeps playback through internal navigation', async ({ page }) => {
  await page.goto(HOME);
  await page.getByRole('button', { name: 'Play session' }).click();
  await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/\/linosbinaural\/how-it-works\/?$/);
  await page.getByRole('link', { name: /Lino’s Binaural/ }).first().click();
  await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop and reset session' }).click();
});

for (const width of [390, 768]) {
  test(`mobile/tablet ${width}px keeps mixer and ambience usable without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto(HOME);
    await expect(page.getByRole('heading', { name: 'Binaural tones' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Outside & around' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play session' })).toBeVisible();
    await page.getByRole('switch', { name: 'Enable Pink noise' }).click();
    await expect(page.getByRole('switch', { name: 'Enable Pink noise' })).toHaveAttribute('aria-checked', 'true');
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
}

test('language and theme choices persist through reload', async ({ page }) => {
  await page.goto(HOME);
  await page.getByRole('button', { name: 'Mudar para português' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { name: 'Entre. Desacelere.' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
});

test('guest save dialog traps focus and closes with Escape without claiming a save', async ({ page }) => {
  await page.goto(HOME);
  const opener = page.getByRole('button', { name: 'Save mix' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Keep this little moment' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Sign in to save private mixes')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page.getByText('Mix saved privately to your library.')).toHaveCount(0);
});

test('account availability reflects the build configuration and keeps listening reachable', async ({ page }) => {
  await page.goto('/linosbinaural/account/');
  const unavailable = page.getByRole('heading', { name: 'The listening room is open.' });
  const signIn = page.getByRole('button', { name: 'Sign in' });
  await expect(unavailable.or(signIn)).toBeVisible();
  if (await unavailable.isVisible()) {
    await expect(page.getByText('Account services are not connected in this installation yet.')).toBeVisible();
    await expect(signIn).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to the listening desk' }).click();
  } else {
    await expect(signIn).toBeVisible();
    await expect(page.getByText('Account services are not connected in this installation yet.')).toHaveCount(0);
    await page.goto(HOME);
  }
  await expect(page.getByRole('button', { name: 'Play session' })).toBeVisible();
});

test('invalid and revoked-looking share links disclose no private mix', async ({ page }) => {
  await page.goto('/linosbinaural/shared/?token=invalid');
  await expect(page.getByRole('heading', { name: 'This record is unavailable' })).toBeVisible();
  await expect(page.getByText('Private mixes are never shown here.')).toBeVisible();
  await page.goto(`/linosbinaural/shared/?token=${validLookingToken}`);
  await expect(page.getByRole('heading', { name: 'This record is unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load this mix' })).toHaveCount(0);
});

test('production shell sends no ad requests or hydration, CSP, and required-asset errors', async ({ page }) => {
  const adRequests: string[] = [];
  const runtimeErrors: string[] = [];
  const requiredFailures: string[] = [];
  await page.addInitScript(() => {
    (window as typeof window & { __cspViolations?: string[] }).__cspViolations = [];
    window.addEventListener('securitypolicyviolation', event => {
      (window as typeof window & { __cspViolations?: string[] }).__cspViolations?.push(event.violatedDirective);
    });
  });
  page.on('request', request => { if (/doubleclick|googlesyndication|googleadservices|adservice|adnxs/i.test(request.url())) adRequests.push(request.url()); });
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400 && /\/linosbinaural\/(?:_next|art|audio)\//.test(new URL(response.url()).pathname)) requiredFailures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(HOME);
  await expect(page.getByRole('heading', { name: 'Come in. Tune out.' })).toBeVisible();
  await page.getByRole('button', { name: 'Fine tuning' }).click();
  expect(adRequests).toEqual([]);
  expect(requiredFailures).toEqual([]);
  expect(runtimeErrors).toEqual([]);
  expect(await page.evaluate(() => (window as typeof window & { __cspViolations?: string[] }).__cspViolations)).toEqual([]);
});
