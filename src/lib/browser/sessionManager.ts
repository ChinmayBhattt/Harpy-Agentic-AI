import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import {
  BrowserSessionState,
  InteractiveElement,
  BrowserStepLog,
  PendingConfirmation,
  BrowserControlMode,
} from './types';

// Global singleton registry for active sessions across Next.js API requests
interface ActiveSession {
  context: BrowserContext;
  page: Page;
  state: BrowserSessionState;
  subscribers: Set<(state: BrowserSessionState) => void>;
  logSubscribers: Set<(log: BrowserStepLog) => void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __harpyBrowserInstance: Browser | undefined;
  // eslint-disable-next-line no-var
  var __harpyBrowserSessions: Map<string, ActiveSession> | undefined;
}

if (!global.__harpyBrowserSessions) {
  global.__harpyBrowserSessions = new Map<string, ActiveSession>();
}

export class BrowserSessionManager {
  private static async getBrowser(): Promise<Browser> {
    if (global.__harpyBrowserInstance && global.__harpyBrowserInstance.isConnected()) {
      return global.__harpyBrowserInstance;
    }

    global.__harpyBrowserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    return global.__harpyBrowserInstance;
  }

  public static async getSession(sessionId = 'default'): Promise<ActiveSession> {
    const sessions = global.__harpyBrowserSessions!;
    const existing = sessions.get(sessionId);

    if (existing && !existing.page.isClosed()) {
      return existing;
    }

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      deviceScaleFactor: 1,
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Stealth script to bypass bot-detection on interactive pages
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    const page = await context.newPage();

    // Default starting state
    const initialState: BrowserSessionState = {
      sessionId,
      url: 'https://www.google.com',
      title: 'Google',
      screenshot: '',
      interactiveElements: [],
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      controlMode: 'agent',
      status: 'idle',
      currentStep: 0,
      maxSteps: 15,
      logs: [],
    };

    const session: ActiveSession = {
      context,
      page,
      state: initialState,
      subscribers: new Set(),
      logSubscribers: new Set(),
    };

    sessions.set(sessionId, session);

    // Initial navigation
    try {
      await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this.observe(sessionId);
    } catch (err) {
      console.warn('Initial session navigation warning:', err);
    }

    return session;
  }

  public static subscribe(
    sessionId: string,
    onState: (state: BrowserSessionState) => void,
    onLog?: (log: BrowserStepLog) => void
  ): () => void {
    const sessions = global.__harpyBrowserSessions!;
    const session = sessions.get(sessionId);
    if (!session) return () => {};

    session.subscribers.add(onState);
    if (onLog) session.logSubscribers.add(onLog);

    return () => {
      session.subscribers.delete(onState);
      if (onLog) session.logSubscribers.delete(onLog);
    };
  }

  public static emitState(sessionId: string) {
    const sessions = global.__harpyBrowserSessions!;
    const session = sessions.get(sessionId);
    if (!session) return;
    session.subscribers.forEach((cb) => {
      try {
        cb(session.state);
      } catch (err) {
        console.error('State subscriber callback error:', err);
      }
    });
  }

  public static addLog(
    sessionId: string,
    log: Omit<BrowserStepLog, 'id' | 'timestamp'>
  ): BrowserStepLog {
    const sessions = global.__harpyBrowserSessions!;
    const session = sessions.get(sessionId);
    const fullLog: BrowserStepLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    if (session) {
      session.state.logs = [...session.state.logs.slice(-40), fullLog];
      session.logSubscribers.forEach((cb) => {
        try {
          cb(fullLog);
        } catch (err) {
          console.error('Log subscriber callback error:', err);
        }
      });
      this.emitState(sessionId);
    }

    return fullLog;
  }

  public static async observe(sessionId = 'default'): Promise<{
    state: BrowserSessionState;
    elements: InteractiveElement[];
    pageSummary: string;
  }> {
    const session = await this.getSession(sessionId);
    const page = session.page;

    let title = 'Untitled';
    let url = 'about:blank';

    try {
      title = await page.title();
      url = page.url();
    } catch {}

    // Extract interactive elements from DOM
    let elements: InteractiveElement[] = [];
    try {
      elements = await page.evaluate(() => {
        const selector =
          'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="tab"], [tabindex="0"]';
        const rawElements = Array.from(document.querySelectorAll<HTMLElement>(selector));

        const results: any[] = [];
        let index = 1;

        // Remove old Harpy badge tags if present
        document.querySelectorAll('.harpy-element-badge').forEach((el) => el.remove());

        for (const el of rawElements) {
          // Check visibility
          const style = window.getComputedStyle(el);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            el.offsetWidth <= 0 ||
            el.offsetHeight <= 0
          ) {
            continue;
          }

          const rect = el.getBoundingClientRect();
          // Filter if completely out of viewport
          if (
            rect.bottom < 0 ||
            rect.top > window.innerHeight ||
            rect.right < 0 ||
            rect.left > window.innerWidth
          ) {
            continue;
          }

          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute('role') || undefined;
          const type = (el as HTMLInputElement).type || undefined;
          const placeholder = (el as HTMLInputElement).placeholder || undefined;
          const ariaLabel = el.getAttribute('aria-label') || undefined;
          const name = (el as HTMLInputElement).name || undefined;
          const href = (el as HTMLAnchorElement).href || undefined;

          // Compute readable text
          let text = (
            el.innerText ||
            el.getAttribute('title') ||
            ariaLabel ||
            placeholder ||
            (el as HTMLInputElement).value ||
            ''
          ).trim();

          if (!text && tag === 'input') {
            text = `Input (${type || 'text'})`;
          }

          text = text.substring(0, 80).replace(/\s+/g, ' ');

          // Check if sensitive action
          const lower = (text + ' ' + (name || '') + ' ' + (type || '')).toLowerCase();
          const isSensitive =
            type === 'password' ||
            /\b(credit|card|cvv|delete account|pay now|checkout|transfer|confirm purchase|sign out|logout)\b/.test(
              lower
            );

          // Tag element for easy targeting
          el.setAttribute('data-harpy-index', String(index));

          results.push({
            index,
            tag,
            text,
            role,
            type,
            placeholder,
            ariaLabel,
            name,
            href,
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            isSensitive,
          });

          index++;
          if (index > 45) break; // Limit elements for token efficiency
        }

        return results;
      });
    } catch (err) {
      console.warn('Failed to extract elements:', err);
    }

    // Capture screenshot
    let screenshotBase64 = '';
    try {
      const buffer = await page.screenshot({
        type: 'jpeg',
        quality: 75,
      });
      screenshotBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.warn('Failed to capture screenshot:', err);
    }

    // Extract page summary text (clean main text)
    let pageSummary = '';
    try {
      pageSummary = await page.evaluate(() => {
        const bodyClone = document.body.cloneNode(true) as HTMLElement;
        bodyClone.querySelectorAll('script, style, noscript, svg').forEach((n) => n.remove());
        return (bodyClone.innerText || '').replace(/\n{3,}/g, '\n\n').substring(0, 1500);
      });
    } catch {}

    // Update state
    session.state.url = url;
    session.state.title = title;
    session.state.screenshot = screenshotBase64;
    session.state.interactiveElements = elements;

    this.emitState(sessionId);

    return {
      state: session.state,
      elements,
      pageSummary,
    };
  }

  public static async navigate(sessionId = 'default', inputUrl: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    session.state.isLoading = true;
    session.state.status = 'navigating';
    this.emitState(sessionId);

    let targetUrl = inputUrl.trim();

    // Check if input is a query instead of URL
    if (
      !targetUrl.startsWith('http://') &&
      !targetUrl.startsWith('https://') &&
      (targetUrl.includes(' ') || !targetUrl.includes('.'))
    ) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    this.addLog(sessionId, {
      stepNumber: session.state.currentStep,
      phase: 'ACT',
      action: `Navigating to ${targetUrl}`,
      status: 'pending',
    });

    try {
      await session.page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      session.state.isLoading = false;
      session.state.status = 'idle';
      await this.observe(sessionId);

      this.addLog(sessionId, {
        stepNumber: session.state.currentStep,
        phase: 'VERIFY',
        action: `Successfully loaded ${targetUrl}`,
        details: `Page Title: ${session.state.title}`,
        status: 'success',
      });
      return true;
    } catch (err: any) {
      session.state.isLoading = false;
      session.state.status = 'error';
      session.state.lastError = err.message || 'Navigation error';
      this.addLog(sessionId, {
        stepNumber: session.state.currentStep,
        phase: 'ACT',
        action: `Failed navigating to ${targetUrl}`,
        details: err.message,
        status: 'failed',
      });
      this.emitState(sessionId);
      return false;
    }
  }

  public static async click(
    sessionId = 'default',
    target: { index?: number; selector?: string; x?: number; y?: number }
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);
    const page = session.page;

    try {
      if (typeof target.x === 'number' && typeof target.y === 'number') {
        // Direct coordinates click
        await page.mouse.click(target.x, target.y);
      } else if (target.index) {
        const selector = `[data-harpy-index="${target.index}"]`;
        const locator = page.locator(selector).first();
        if ((await locator.count()) > 0) {
          await locator.click({ timeout: 5000 });
        } else {
          // Fallback to cached element coordinates
          const el = session.state.interactiveElements.find((e) => e.index === target.index);
          if (el) {
            await page.mouse.click(
              el.rect.x + el.rect.width / 2,
              el.rect.y + el.rect.height / 2
            );
          } else {
            throw new Error(`Element [${target.index}] not found`);
          }
        }
      } else if (target.selector) {
        await page.click(target.selector, { timeout: 5000 });
      }

      // Wait a moment for dynamic responses/navigation
      await page.waitForTimeout(600);
      await this.observe(sessionId);
      return true;
    } catch (err: any) {
      console.warn('Click execution error:', err);
      session.state.lastError = err.message;
      return false;
    }
  }

  public static async typeText(
    sessionId = 'default',
    target: { index?: number; selector?: string },
    text: string,
    pressEnter = false
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);
    const page = session.page;

    try {
      let locator;
      if (target.index) {
        locator = page.locator(`[data-harpy-index="${target.index}"]`).first();
        if ((await locator.count()) === 0) {
          const el = session.state.interactiveElements.find((e) => e.index === target.index);
          if (el) {
            await page.mouse.click(
              el.rect.x + el.rect.width / 2,
              el.rect.y + el.rect.height / 2
            );
          }
        } else {
          await locator.click({ timeout: 4000 });
        }
      } else if (target.selector) {
        locator = page.locator(target.selector).first();
        await locator.click({ timeout: 4000 });
      } else {
        // Auto-detect currently focused input, or auto-focus visible text input on page
        const isInputFocused = await page.evaluate(() => {
          const el = document.activeElement;
          return (
            el &&
            (el.tagName === 'INPUT' ||
              el.tagName === 'TEXTAREA' ||
              el.getAttribute('contenteditable') === 'true')
          );
        });

        if (!isInputFocused) {
          const visibleInput = page
            .locator('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])')
            .first();
          if ((await visibleInput.count()) > 0 && (await visibleInput.isVisible())) {
            await visibleInput.click({ timeout: 3000 }).catch(() => {});
          }
        }
      }

      // Type text into the active/targeted element
      await page.keyboard.type(text, { delay: 35 });

      if (pressEnter) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }

      await this.observe(sessionId);
      return true;
    } catch (err: any) {
      console.warn('Type execution error:', err);
      session.state.lastError = err.message;
      return false;
    }
  }

  public static async pressKey(sessionId = 'default', key: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    try {
      await session.page.keyboard.press(key);
      await session.page.waitForTimeout(400);
      await this.observe(sessionId);
      return true;
    } catch (err: any) {
      session.state.lastError = err.message;
      return false;
    }
  }

  public static async scroll(
    sessionId = 'default',
    direction: 'up' | 'down' = 'down',
    amount = 450
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);
    try {
      const delta = direction === 'down' ? amount : -amount;

      // 1. Playwright hardware mouse wheel dispatch (works on almost all modern SPAs & overflow containers)
      await session.page.mouse.move(640, 400);
      await session.page.mouse.wheel(0, delta);

      // 2. DOM scrolling fallback for standard scrollingElement and nested scrollable containers
      await session.page.evaluate((d) => {
        window.scrollBy(0, d);
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop += d;
        }
        const scrollables = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(
          (el) => {
            const style = window.getComputedStyle(el);
            return (
              (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
              el.scrollHeight > el.clientHeight
            );
          }
        );
        for (const s of scrollables) {
          s.scrollTop += d;
        }
      }, delta);

      await session.page.waitForTimeout(400);
      await this.observe(sessionId);
      return true;
    } catch (err: any) {
      session.state.lastError = err.message;
      return false;
    }
  }

  public static async goBack(sessionId = 'default'): Promise<boolean> {
    const session = await this.getSession(sessionId);
    try {
      await session.page.goBack();
      await this.observe(sessionId);
      return true;
    } catch {
      return false;
    }
  }

  public static async goForward(sessionId = 'default'): Promise<boolean> {
    const session = await this.getSession(sessionId);
    try {
      await session.page.goForward();
      await this.observe(sessionId);
      return true;
    } catch {
      return false;
    }
  }

  public static async reload(sessionId = 'default'): Promise<boolean> {
    const session = await this.getSession(sessionId);
    try {
      await session.page.reload();
      await this.observe(sessionId);
      return true;
    } catch {
      return false;
    }
  }

  public static setControlMode(sessionId = 'default', mode: BrowserControlMode) {
    const sessions = global.__harpyBrowserSessions!;
    const session = sessions.get(sessionId);
    if (session) {
      session.state.controlMode = mode;
      session.state.status = mode === 'manual' ? 'manual' : 'idle';
      this.emitState(sessionId);
    }
  }

  public static setPendingConfirmation(
    sessionId = 'default',
    confirmation: PendingConfirmation | null
  ) {
    const sessions = global.__harpyBrowserSessions!;
    const session = sessions.get(sessionId);
    if (session) {
      session.state.pendingConfirmation = confirmation;
      if (confirmation) {
        session.state.status = 'awaiting_confirmation';
      }
      this.emitState(sessionId);
    }
  }
}
