const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const SCREENSHOTS_DIR = path.join(__dirname, '..', '.screenshots', 'baseline');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
];

// Setup dashboard mocks on the CONTEXT (persists across all pages and navigations)
async function setupDashboardMocks(context) {
  console.log(`  [route] Registering dashboard mocks on context...`);

  // Helper to match API paths
  const matchApi = (pathname) => (url) => {
    try {
      const u = new URL(url);
      return u.pathname.startsWith(pathname);
    } catch { return false; }
  };

  // DEBUG: Log ALL requests FIRST to see what's happening (function predicate matching everything)
  context.route(() => true, async route => {
    const url = route.request().url();
    console.log(`  [route] DEBUG REQUEST: ${url}`);
    await route.continue();
  });

  // Mock all dashboard API endpoints
  context.route(matchApi('/api/auth/me'), async route => {
    console.log(`  [route] Mocking /api/auth/me`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ teacher: { id: '1', username: 'gurutest', email: 'guru@test.com', fullName: 'Guru Test' } }) });
  });

  context.route(matchApi('/api/teacher/stats'), async route => {
    console.log(`  [route] Mocking /api/teacher/stats`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totalMaterials: 5, totalQuestions: 50, topics: 4, results: [], questions: [] }) });
  });

  context.route(matchApi('/api/materials/manage'), async route => {
    console.log(`  [route] Mocking /api/materials/manage`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ materials: [] }) });
  });

  context.route(matchApi('/api/sets/manage'), async route => {
    console.log(`  [route] Mocking /api/sets/manage`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sets: [] }) });
  });

  context.route(matchApi('/api/questions/manage'), async route => {
    console.log(`  [route] Mocking /api/questions/manage`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ questions: [] }) });
  });

  // Catch any unmocked API calls
  context.route(matchApi('/api/'), async route => {
    console.log(`  [route] UNMOCKED API: ${route.request().url()}`);
    await route.continue();
  });
}

// Pages and states to capture
const PAGES = [
  // Login pages FIRST
  { name: 'login', url: '/login.html', waitFor: '.login-card.auth-card', clearStorage: true },
  { name: 'login-daftar-akun', url: '/login.html', waitFor: '.login-card.auth-card', clearStorage: true, action: async (page) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.waitForSelector('#tabBtnRegister', { state: 'visible' });
    await page.click('#tabBtnRegister');
    await page.waitForTimeout(500);
    const formVisible = await page.evaluate(() => {
      const registerForm = document.getElementById('registerForm');
      const loginForm = document.getElementById('loginForm');
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabRegister = document.getElementById('tabBtnRegister');
      if (registerForm && registerForm.style.display !== 'none') return true;
      if (registerForm) registerForm.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
      if (tabLogin) { tabLogin.classList.remove('active'); tabLogin.setAttribute('aria-selected', 'false'); }
      if (tabRegister) { tabRegister.classList.add('active'); tabRegister.setAttribute('aria-selected', 'true'); }
      return registerForm && registerForm.style.display !== 'none';
    });
    if (!formVisible) throw new Error('Failed to show register form');
  }},

  // Beranda
  { name: 'beranda', url: '/index.html', waitFor: '#page-home', clearStorage: true, setup: async (page) => {
    await page.route('**/api/questions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/materials', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/quiz/leaderboard*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/auth/google/client-id', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({clientId: 'test'}) }));
  }},
  { name: 'beranda-popup-kode-kuis', url: '/index.html', waitFor: '#page-home', clearStorage: true, setup: async (page) => {
    await page.route('**/api/questions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/materials', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/quiz/leaderboard*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/auth/google/client-id', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({clientId: 'test'}) }));
  }, action: async (page) => {
    await page.fill('#studentName', 'Test Siswa');
    await page.click('#btnStart');
    await page.waitForFunction(() => document.querySelector('#modalJoinQuiz')?.classList.contains('show'), { timeout: 10000 });
    await page.waitForTimeout(300); // Wait for transition
  }},
  { name: 'beranda-kuis-berjalan', url: '/index.html', waitFor: '#page-home', clearStorage: true, setup: async (page) => {
    await page.route('**/api/questions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/materials', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/quiz/leaderboard*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/auth/google/client-id', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({clientId: 'test'}) }));
  }, action: async (page) => {
    await page.fill('#studentName', 'Test Siswa');
    await page.evaluate(() => {
      localStorage.setItem('kuis.currentQuiz', JSON.stringify({id: 'test', title: 'Test Quiz', questions: []}));
    });
    await page.click('#btnStart');
    await page.waitForFunction(() => document.querySelector('#modalJoinQuiz')?.classList.contains('show'), { timeout: 10000 });
    await page.waitForTimeout(300);
    await page.fill('#joinCodeInput', 'TEST01');
    await page.click('#btnSubmitJoin');
    await page.waitForSelector('#page-quiz.active', { timeout: 5000 }).catch(() => {});
  }},
  { name: 'beranda-hasil-kuis', url: '/index.html', waitFor: '#page-home', clearStorage: true, setup: async (page) => {
    await page.route('**/api/questions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/materials', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/quiz/leaderboard*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/auth/google/client-id', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({clientId: 'test'}) }));
  }, action: async (page) => {
    await page.fill('#studentName', 'Test Siswa');
    await page.click('#btnStart');
    await page.waitForFunction(() => document.querySelector('#modalJoinQuiz')?.classList.contains('show'), { timeout: 10000 });
    await page.waitForTimeout(300);
    await page.fill('#joinCodeInput', 'TEST01');
    await page.click('#btnSubmitJoin');
    await page.waitForSelector('#page-result.active', { timeout: 5000 }).catch(() => {});
  }},

  // Daftar materi
  { name: 'materi-daftar', url: '/materi.html', waitFor: '.mlist-head', clearStorage: true, action: async (page) => {
    await page.route('**/api/materials', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: '1', title: 'Matematika Dasar', subject: 'Matematika', summary: 'Belajar penjumlahan dan pengurangan', published: true },
        { id: '2', title: 'IPA Kelas 1', subject: 'IPA', summary: 'Mengenal tumbuhan dan hewan', published: true },
        { id: '3', title: 'Bahasa Indonesia', subject: 'Bahasa Indonesia', summary: 'Membaca dan menulis huruf', published: true },
      ]) });
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#materiGrid .materi-card', { timeout: 10000 }).catch(() => {});
  }},

  // Detail materi
  { name: 'materi-detail', url: '/materi-detail.html?id=1', waitFor: 'body', clearStorage: true, action: async (page) => {
    await page.route('**/api/materials/1', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: '1', title: 'Matematika Dasar', subject: 'Matematika', summary: 'Belajar penjumlahan dan pengurangan',
        content: '<p>Ini adalah konten materi matematika dasar untuk siswa SD.</p>', published: true
      }) });
    });
    await page.route('**/api/quiz-sets', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '1', title: 'Latihan Penjumlahan', code: 'ABC123', time_limit: 10 }]) });
    });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  }},

  // Dashboard guru - all tabs (setup done once per viewport via context)
  { name: 'dashboard-tab-set-soal', url: '/index.html#dashboard', waitFor: '#page-dashboard.active', forceReload: true, setup: async (page) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('kuis.token', 'fake-token');
      localStorage.setItem('kuis.teacher', JSON.stringify({id: '1', name: 'Guru Test', email: 'guru@test.com'}));
    });
  }},
  { name: 'dashboard-tab-bank-soal', url: '/index.html#dashboard', waitFor: '#page-dashboard.active', forceReload: true, setup: async (page) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('kuis.token', 'fake-token');
      localStorage.setItem('kuis.teacher', JSON.stringify({id: '1', name: 'Guru Test', email: 'guru@test.com'}));
    });
  }, action: async (page) => {
    await page.waitForSelector('#page-dashboard.active');
    await page.click('[data-tab="tabSoal"]');
    await page.waitForSelector('#tabSoal.active');
  }},
  { name: 'dashboard-tab-riwayat', url: '/index.html#dashboard', waitFor: '#page-dashboard.active', forceReload: true, setup: async (page) => {
    await page.route('**/api/teacher/stats', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        totalMaterials: 5, totalQuestions: 50, topics: 4,
        results: [{ id: '1', studentName: 'Siswa 1', score: 8, total: 10, quizTitle: 'Test Quiz', createdAt: new Date().toISOString() }]
      }) });
    });
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('kuis.token', 'fake-token');
      localStorage.setItem('kuis.teacher', JSON.stringify({id: '1', name: 'Guru Test', email: 'guru@test.com'}));
    });
  }, action: async (page) => {
    await page.waitForSelector('#page-dashboard.active');
    await page.click('[data-tab="tabRiwayat"]');
    await page.waitForSelector('#tabRiwayat.active');
  }},

  // Popup logout
  { name: 'popup-logout', url: '/index.html#dashboard', waitFor: '#page-dashboard.active', forceReload: true, setup: async (page) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('kuis.token', 'fake-token');
      localStorage.setItem('kuis.teacher', JSON.stringify({id: '1', name: 'Guru Test', email: 'guru@test.com'}));
    });
  }, action: async (page) => {
    await page.waitForSelector('#page-dashboard.active');
    await page.click('#btnLogout');
    await page.waitForSelector('#modalLogoutConfirm:not([aria-hidden="true"])');
  }},
];

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Strip query string from URL before resolving file path
      const urlPath = req.url.split('?')[0];
      let filePath = path.join(FRONTEND_DIR, urlPath === '/' ? '/index.html' : urlPath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
        '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, content) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });
    server.listen(0, 'localhost', () => resolve({ server, baseUrl: `http://localhost:${server.address().port}` }));
  });
}

async function takeScreenshot(page, pageConfig, viewport, baseUrl) {
  const filename = `${pageConfig.name}-${viewport.name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  // Clear localStorage BEFORE navigation using addInitScript
  if (pageConfig.clearStorage) {
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  }

  if (pageConfig.setup) {
    console.log(`  [route] Calling setup for ${pageConfig.name}...`);
    await pageConfig.setup(page);
  }

  // For dashboard tests: force a full page load by navigating to about:blank first
  // This ensures addInitScript runs and DOMContentLoaded fires
  if (pageConfig.forceReload) {
    await page.goto('about:blank', { waitUntil: 'networkidle' });
  }

  // Add console logging for debugging
  page.on('console', msg => {
    const text = msg.text();
    if (pageConfig.name.startsWith('dashboard') || pageConfig.name === 'popup-logout') {
      console.log(`  [console] ${msg.type()}: ${text}`);
    } else if (msg.type() === 'error' || text.includes('dashboard') || text.includes('renderDashboard') ||
        text.includes('handleHashRoute') || text.includes('api') || text.includes('token') || text.includes('Gagal')) {
      console.log(`  [console] ${msg.type()}: ${text}`);
    }
  });

  // Log network requests for API calls
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log(`  [request] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', res => {
    if (res.url().includes('/api/')) {
      console.log(`  [response] ${res.status()} ${res.url()}`);
    }
  });

  // Register page-level API mocks for dashboard tests (more reliable than context routes)
  if (pageConfig.name.startsWith('dashboard') || pageConfig.name === 'popup-logout') {
    const matchApi = (pathname) => (url) => {
      try { return new URL(url).pathname.startsWith(pathname); } catch { return false; }
    };
    page.route(matchApi('/api/auth/me'), route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ teacher: { id: '1', username: 'gurutest', email: 'guru@test.com', fullName: 'Guru Test' } }) }));
    page.route(matchApi('/api/teacher/stats'), route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totalMaterials: 5, totalQuestions: 50, topics: 4, results: [{ id: '1', studentName: 'Siswa 1', score: 8, total: 10, quizTitle: 'Test Quiz', createdAt: new Date().toISOString() }] }) }));
  }

  await page.goto(baseUrl + pageConfig.url, { waitUntil: 'networkidle' });

  // Debug: check browser state for dashboard tests
  if (pageConfig.name.startsWith('dashboard') || pageConfig.name === 'popup-logout') {
    const debugInfo = await page.evaluate(() => ({
      hash: window.location.hash,
      token: localStorage.getItem('kuis.token'),
      teacher: localStorage.getItem('kuis.teacher'),
      pageDashboardExists: !!document.getElementById('page-dashboard'),
      pageDashboardClasses: document.getElementById('page-dashboard')?.className,
      activePage: document.querySelector('.page.active')?.id,
      allPages: Array.from(document.querySelectorAll('.page')).map(p => ({id: p.id, classes: p.className}))
    }));
    console.log(`  [debug] Browser state:`, JSON.stringify(debugInfo, null, 2));

    // Test API calls directly
    try {
      const apiTest = await page.evaluate(async () => {
        const API_BASE = ""; // Same as script.js
        const res = await fetch(API_BASE + "/api/auth/me", {
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("kuis.token") }
        });
        return { status: res.status, data: await res.json() };
      });
      console.log(`  [debug] API test /api/auth/me:`, JSON.stringify(apiTest, null, 2));
    } catch (e) {
      console.log(`  [debug] API test failed:`, e.message);
    }

    // Test script.js's api() function and renderDashboard()
    try {
      const scriptApiTest = await page.evaluate(async () => {
        // Call the global api() function from script.js
        if (typeof api === 'function') {
          try {
            const result = await api("/api/auth/me");
            return { success: true, data: result };
          } catch (e) {
            return { success: false, error: e.message, status: e.status };
          }
        } else {
          return { success: false, error: "api function not found" };
        }
      });
      console.log(`  [debug] script.js api() test:`, JSON.stringify(scriptApiTest, null, 2));
    } catch (e) {
      console.log(`  [debug] script.js api() test failed:`, e.message);
    }

    // Test renderDashboard directly
    try {
      const renderTest = await page.evaluate(async () => {
        if (typeof renderDashboard === 'function') {
          try {
            await renderDashboard();
            return { success: true };
          } catch (e) {
            return { success: false, error: e.message, stack: e.stack };
          }
        } else {
          return { success: false, error: "renderDashboard function not found" };
        }
      });
      console.log(`  [debug] renderDashboard() test:`, JSON.stringify(renderTest, null, 2));
    } catch (e) {
      console.log(`  [debug] renderDashboard() test failed:`, e.message);
    }
  }

  await page.waitForSelector(pageConfig.waitFor, { timeout: 30000 });

  if (pageConfig.action) {
    await pageConfig.action(page);
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  ✓ ${filename}`);
  return filepath;
}

async function main() {
  console.log('📸 Starting baseline screenshot capture...');
  console.log(`📁 Frontend: ${FRONTEND_DIR}`);
  console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const { server, baseUrl } = await createServer();
  console.log(`🌐 Server: ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Register dashboard mocks ONCE on the context (before any pages)
  await setupDashboardMocks(context);

  let successCount = 0, failCount = 0;

  for (const viewport of VIEWPORTS) {
    console.log(`\n📱 Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);

    // For non-dashboard pages, reuse a single page
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const pageConfig of PAGES) {
      // Dashboard tests need a fresh page for proper hash navigation
      const isDashboard = pageConfig.name.startsWith('dashboard') || pageConfig.name === 'popup-logout';
      const testPage = isDashboard ? await context.newPage() : page;

      if (isDashboard) {
        await testPage.setViewportSize({ width: viewport.width, height: viewport.height });
      }

      try {
        await takeScreenshot(testPage, pageConfig, viewport, baseUrl);
        successCount++;
      } catch (error) {
        console.error(`  ✗ ${pageConfig.name}-${viewport.name}.png - ${error.message}`);
        failCount++;
      }

      if (isDashboard) {
        await testPage.close();
      }
    }
    await page.close();
  }

  await browser.close();
  server.close();
  console.log(`\n✅ Completed: ${successCount} ok, ${failCount} failed`);
  console.log(`📁 Saved to: ${SCREENSHOTS_DIR}`);
}

main().catch(console.error);