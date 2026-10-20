/**
 * Captures the README screenshots from a running instance (docker compose by default).
 *
 *   pnpm --filter web screenshots
 *   BASE_URL=https://staging.example.com pnpm --filter web screenshots
 *   PLAYWRIGHT_CHANNEL=chrome pnpm --filter web screenshots   # use installed Chrome
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { type Browser, type BrowserContextOptions, chromium, type Page } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.SCREENSHOT_EMAIL ?? 'admin@example.com';
const PASSWORD = process.env.SCREENSHOT_PASSWORD ?? 'DemoAdmin#2026';
const OUT_DIR = path.resolve(import.meta.dirname, '../../../docs/screenshots');

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
} satisfies Record<string, BrowserContextOptions>;

type Shot = {
  name: string;
  path: string | ((page: Page) => Promise<string>);
  // Waits for real content, not just the skeleton.
  ready: string;
  signedIn?: boolean;
};

const SHOTS: Shot[] = [
  { name: 'login', path: '/login', ready: 'button[type=submit]', signedIn: false },
  { name: 'dashboard', path: '/dashboard', ready: '.recharts-surface' },
  { name: 'doctors', path: '/doctors', ready: '[aria-label=Doctors] a' },
  {
    name: 'doctor-detail',
    // The busiest doctor makes the most representative detail page.
    path: async (page) => {
      const response = await page.request.get(`${BASE_URL}/api/v1/stats/overview`);
      const body = (await response.json()) as { data: { topDoctors: { id: string }[] } };
      const id = body.data.topDoctors[0]?.id;
      if (!id) throw new Error('No doctors with patients to screenshot');
      return `/doctors/${id}`;
    },
    ready: '[aria-label=Patients] [data-slot]',
  },
  { name: 'patients', path: '/patients', ready: '[aria-label=Patients] span' },
];

// The two pages that show the design system best, also in dark mode.
const DARK_SHOTS = ['dashboard', 'doctors'];

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

async function capture(
  browser: Browser,
  viewport: keyof typeof VIEWPORTS,
  colorScheme: 'light' | 'dark',
) {
  const fileFor = (name: string) =>
    `${viewport}-${name}${colorScheme === 'dark' ? '-dark' : ''}.png`;

  async function shoot(page: Page, shot: Shot) {
    const url = typeof shot.path === 'string' ? shot.path : await shot.path(page);
    await page.goto(`${BASE_URL}${url}`);
    await page.waitForSelector(shot.ready, { state: 'attached' });
    await page.waitForLoadState('networkidle');
    // Lets charts finish laying out and fonts settle.
    await page.waitForTimeout(600);
    const file = fileFor(shot.name);
    if (viewport === 'desktop') {
      // Grow the window to the page instead of using fullPage: the sidebar is fixed to the
      // viewport, so a fullPage capture would cut its background off at the fold.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: VIEWPORTS.desktop.viewport.width, height });
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: path.join(OUT_DIR, file) });
    if (viewport === 'desktop') await page.setViewportSize(VIEWPORTS.desktop.viewport);
    process.stdout.write(`saved docs/screenshots/${file}\n`);
  }

  const shots = SHOTS.filter((shot) => colorScheme === 'light' || DARK_SHOTS.includes(shot.name));

  // Signed-out pages get their own context, so no session cookie can redirect them.
  const signedOut = await browser.newContext({ ...VIEWPORTS[viewport], colorScheme });
  for (const shot of shots.filter((item) => item.signedIn === false)) {
    await shoot(await signedOut.newPage(), shot);
  }
  await signedOut.close();

  const signedIn = await browser.newContext({ ...VIEWPORTS[viewport], colorScheme });
  const page = await signedIn.newPage();
  await signIn(page);
  for (const shot of shots.filter((item) => item.signedIn !== false)) await shoot(page, shot);
  await signedIn.close();
}

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {},
);
try {
  await capture(browser, 'desktop', 'light');
  await capture(browser, 'mobile', 'light');
  await capture(browser, 'desktop', 'dark');
} finally {
  await browser.close();
}
