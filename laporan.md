# Laporan Progress CSS Restructuring - Kuis Petualangan Ceria

**Tanggal:** 2026-10-31  
**Project:** Pendidikan-PTKOM Frontend  
**Branch:** css-restructure (pending creation)

---

## Ringkasan Task

Refactor 7 file CSS flat structure menjadi struktur terorganisir dengan mempertahankan cascade order yang persis sama. Terdiri dari 3 fase:

| Fase | Status | Deskripsi |
|------|--------|-----------|
| **Phase 0** | ✅ **SELESAI** | Baseline screenshots 36/36 (12 page states × 3 viewports) |
| **Phase 1** | 🔄 **IN PROGRESS** | Split 7 CSS → struktur baru + manifest.json + archive + update HTML |
| **Phase 2** | ⏳ **PENDING** | Konsolidasi component-based, deduplikasi, reduksi !important |

---

## File CSS Asli (7 files, total ~13,327 lines)

| File | Lines | Peran |
|------|-------|-------|
| `style.css` | 6,467 | Base system, reset, buttons, hero, quiz, results, modals, login, dashboard, materi, responsive |
| `theme.css` | 2,106 | Design system tokens (colors, spacing, typography) |
| `theme-extra.css` | 3,157 | Bridge tokens ↔ legacy, component overrides (GRUP 1-7) |
| `home.css` | 579 | Home page specific dengan !important overrides |
| `materi-list.css` | 501 | Materi list page styles |
| `auth.css` | 350 | Login/register page styles (scoped ke `body.auth-page`) |
| `navbar.css` | 189 | Navbar single source of truth (loaded LAST) |

---

## Cascade Order per HTML (Harus Dipertahankan)

| HTML | Load Order (1=first, 5=last) |
|------|------------------------------|
| `index.html` | style.css → theme.css → theme-extra.css → home.css → navbar.css |
| `login.html` | style.css → theme.css → theme-extra.css → auth.css → navbar.css |
| `materi.html` | style.css → theme.css → theme-extra.css → materi-list.css → navbar.css |
| `materi-detail.html` | style.css → theme.css → theme-extra.css → navbar.css |

**Key Insight:** `navbar.css` SELALU terakhir. 3 file pertama shared global. Ke-4 page-specific.

---

## Struktur Baru (Phase 1 Target)

```
frontend/
├── css/
│   ├── manifest.json           # Cascade order documentation
│   ├── base/
│   │   ├── 01-reset.css        # Reset, variables, base elements
│   │   ├── 02-tokens.css       # Design tokens (dari theme.css)
│   │   └── 03-bridge.css       # Token aliases + system overrides
│   ├── components/
│   │   ├── buttons.css         # Semua button styles
│   │   ├── forms.css           # Form fields, inputs, validation
│   │   ├── cards.css           # Card components
│   │   ├── modals.css          # Modal overlays
│   │   ├── badges.css          # Badges, pills, chips
│   │   ├── toast.css           # Toast notifications
│   │   └── quiz.css            # Quiz-specific: progress, answers, feedback, timer
│   ├── layout/
│   │   ├── navbar.css          # Navbar (loaded LAST)
│   │   ├── grid.css            # Grid utilities, containers
│   │   └── hero.css            # Hero section layouts
│   ├── pages/
│   │   ├── home.css            # index.html specific
│   │   ├── materi.css          # materi.html + materi-detail.html shared
│   │   ├── materi-list.css     # materi.html list view
│   │   ├── materi-detail.css   # materi-detail.html detail view
│   │   ├── auth.css            # login.html
│   │   └── dashboard.css       # Dashboard teacher view
│   └── utilities/
│       ├── animations.css      # Keyframes, transitions, reduced-motion
│       ├── helpers.css         # .hidden, .sr-only, .visually-hidden
│       └── print.css           # Print styles
└── css-archive/                # Original 7 files archived here
```

---

## Progress Phase 1 - Files Created

### ✅ Base Layer (3/3)
| File | Status | Source |
|------|--------|--------|
| `css/base/01-reset.css` | ✅ Created | style.css §1-3 (root vars, reset, base) |
| `css/base/02-tokens.css` | ✅ Created | theme.css (design tokens semantic) |
| `css/base/03-bridge.css` | ✅ Created | theme-extra.css (aliases + GRUP 1-7 overrides) |

### 🔄 Components Layer (2/7 created)
| File | Status | Source |
|------|--------|--------|
| `css/components/buttons.css` | ✅ Created | style.css §5, theme-extra GRUP 1, home.css, auth.css, materi-list.css |
| `css/components/forms.css` | ✅ Created | style.css §7,11,12, theme-extra GRUP 2, home.css, auth.css |
| `css/components/cards.css` | ⏳ Pending | style.css §6,8,13, theme-extra GRUP 3 |
| `css/components/modals.css` | ⏳ Pending | style.css §11,17, theme-extra GRUP 4 |
| `css/components/badges.css` | ⏳ Pending | style.css §6, theme-extra GRUP 5 |
| `css/components/toast.css` | ⏳ Pending | style.css §TOAST, theme-extra GRUP 6 |
| `css/components/quiz.css` | ⏳ Pending | style.css §9,10,15,16 |

### ⏳ Layout Layer (0/3)
| File | Status | Source |
|------|--------|--------|
| `css/layout/navbar.css` | ⏳ Copy | navbar.css (as-is, single source of truth) |
| `css/layout/grid.css` | ⏳ Pending | style.css §6 (.page, .page-container, grids) |
| `css/layout/hero.css` | ⏳ Pending | style.css §7 (hero section) |

### ⏳ Pages Layer (0/6)
| File | Status | Source |
|------|--------|--------|
| `css/pages/home.css` | ⏳ Pending | home.css + style.css home-specific |
| `css/pages/materi.css` | ⏳ Pending | Shared materi styles |
| `css/pages/materi-list.css` | ⏳ Pending | materi-list.css |
| `css/pages/materi-detail.css` | ⏳ Pending | style.css materi-detail section |
| `css/pages/auth.css` | ⏳ Pending | auth.css |
| `css/pages/dashboard.css` | ⏳ Pending | style.css §18 + theme-extra GRUP 7 |

### ⏳ Utilities Layer (0/3)
| File | Status | Source |
|------|--------|--------|
| `css/utilities/animations.css` | ⏳ Pending | All @keyframes dari style.css, theme-extra |
| `css/utilities/helpers.css` | ⏳ Pending | .hidden, visibility utilities |
| `css/utilities/print.css` | ⏳ Pending | If any |

---

## Logic Penyelesaian (Implementation Strategy)

### 1. **Extract & Split Methodology**
```
Untuk setiap original file:
  1. Baca seluruh content
  2. Identifikasi section markers (/* -------------------------------------------------------------------------- */)
  3. Kelompokkan by component type (button, form, card, modal, dll)
  4. Tulis ke file component yang sesuai
  5. Hapus duplikat (keep first occurrence in cascade order)
  6. Pastikan variabel pakai token dari 02-tokens.css
```

### 2. **Cascade Preservation Rules**
- **Base layer** (01, 02, 03) → loaded first di semua halaman
- **Components** → loaded after base, before layout
- **Layout** → grid, hero, navbar (navbar LAST)
- **Pages** → page-specific overrides
- **Utilities** → animations, helpers (can be anywhere, usually last)

### 3. **Deduplication Strategy**
| Duplicate Pattern | Resolution |
|-------------------|------------|
| Button styles di 4+ files | Konsolidasi ke `components/buttons.css` |
| Form input styles di 3+ files | Konsolidasi ke `components/forms.css` |
| Card styles di 3+ files | Konsolidasi ke `components/cards.css` |
| Modal styles di 2+ files | Konsolidasi ke `components/modals.css` |
| Toast styles di 2 files | Konsolidasi ke `components/toast.css` |
| Quiz styles tersebar | Konsolidasi ke `components/quiz.css` |

### 4. **Variable Migration**
```
Legacy (style.css)          → New (02-tokens.css)
--primary: #4F46E5          → --color-primary: var(--primary)
--accent: #10B981           → --color-accent: var(--accent)
--ink: #0F172A              → --color-ink: var(--ink)
...dst
```
Bridge file (03-bridge.css) memetakan token baru → legacy vars agar zero breaking changes.

---

## Permasalahan & Solusi (Dari Phase 0 & Phase 1)

### Phase 0 - Screenshot Baseline Issues

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| Dashboard tidak aktif via hash | `handleHashRoute()` butuh full URL | Navigate langsung ke `/index.html#dashboard` |
| Materi-detail `.materi-top` timeout | Selector tidak ditemukan | `waitFor('body')` + `waitForLoadState` + 1000ms |
| Login/daftar akun form register | Tab switch butuh click | Click tab button + `page.evaluate()` DOM manipulation |
| Syntax error dashboard config | Object literal malformed | Rewrite script dengan syntax benar |
| API mocking routes not matching | Glob/regex mismatch | Function-based route matching |
| localStorage cross-test pollution | Token carry-over antar test | `addInitScript` clear sebelum setiap test |
| Hash navigation tidak fire DOMContentLoaded | Same-document navigation | Force reload flag / fresh page per test |
| `script.js` functions not found | Query string `?v=10` 404 | Server strip query: `req.url.split('?')[0]` |
| Beranda popup butuh student name | `onStartQuizClick()` validasi | `page.fill('#studentName', 'Test Siswa')` sebelum click |

### Phase 1 - CSS Splitting Issues (Antisipasi)

| Potential Issue | Mitigation |
|-----------------|------------|
| Cascade regression | manifest.json explicit order + visual regression test |
| Missing selectors | Grep verify setiap selector dari original ada di new structure |
| Duplicate rules | Enforce: base defines tokens, components only USE tokens |
| Query string versioning | Keep `?v=N` pattern, increment on changes |
| Navbar !important bleed | Navbar sudah isolated di navbar.css (loaded last) |
| Auth page scoped styles | `body.auth-page` scoping dipindah ke pages/auth.css |

---

## Verification Plan (Post Phase 1)

```bash
# 1. Archive originals
mv frontend/*.css frontend/css-archive/

# 2. Update HTML link tags (only allowed HTML change)
# index.html: 16 link tags (base 3 + components 7 + layout 2 + pages 1 + utilities 2 + navbar 1)
# login.html: 15 link tags (base 3 + components 7 + layout 2 + pages 1 + navbar 1)
# materi.html: 15 link tags (base 3 + components 7 + layout 2 + pages 1 + navbar 1)
# materi-detail.html: 14 link tags (base 3 + components 7 + layout 2 + pages 1 + navbar 1)

# 3. Run visual regression
cd D:/Website/Pendidikan-PTKOM
node scripts/screenshot-baseline.js

# 4. Expected: 36/36 screenshots match baseline (pixel-perfect or within tolerance)
```

---

## Next Steps (Immediate)

1. **Complete remaining 5 component files** (cards, modals, badges, toast, quiz)
2. **Create 3 layout files** (navbar copy, grid, hero)
3. **Create 6 page files** (home, materi, materi-list, materi-detail, auth, dashboard)
4. **Create 3 utility files** (animations, helpers, print)
5. **Create manifest.json** dengan cascade order exact
6. **Archive originals** ke `frontend/css-archive/`
7. **Update 4 HTML files** dengan link tags baru
8. **Run screenshot baseline** untuk verifikasi visual parity

---

## Estimasi Effort Remaining

| Task | Files | Est. Time |
|------|-------|-----------|
| Components (5 remaining) | 5 | ~45 min |
| Layout (3) | 3 | ~20 min |
| Pages (6) | 6 | ~60 min |
| Utilities (3) | 3 | ~15 min |
| Manifest + Archive + HTML update | - | ~20 min |
| Verification test | - | ~10 min |
| **Total** | **20 files** | **~2.5 hours** |

---

## Catatan Teknis Penting

1. **Navbar.css** - JANGAN diubah, sudah single source of truth, loaded LAST di semua halaman
2. **auth.css** - Scoped ke `body.auth-page`, pindahkan as-is ke `pages/auth.css`
3. **!important** - Hanya di home.css & navbar.css, home.css !important dipindah ke pages/home.css
4. **Query strings** - Pertahankan `?v=1` di semua link tags baru
5. **Reduced motion** - Sudah di 01-reset.css dan 03-bridge.css, konsolidasi ke utilities/animations.css
6. **Print styles** - Cek apakah ada, jika tidak buat file kosong placeholder

---

## File Manifest.json Draft

```json
{
  "version": "1.0",
  "description": "CSS cascade order manifest. Load order = array order. Later entries override earlier.",
  "globalBase": [
    "base/01-reset.css",
    "base/02-tokens.css",
    "base/03-bridge.css"
  ],
  "components": [
    "components/buttons.css",
    "components/forms.css",
    "components/cards.css",
    "components/modals.css",
    "components/badges.css",
    "components/toast.css",
    "components/quiz.css"
  ],
  "layout": [
    "layout/grid.css",
    "layout/hero.css"
  ],
  "pageOverrides": {
    "index.html": ["pages/home.css"],
    "login.html": ["pages/auth.css"],
    "materi.html": ["pages/materi-list.css"],
    "materi-detail.html": ["pages/materi-detail.css"]
  },
  "alwaysLast": ["layout/navbar.css"],
  "utilities": [
    "utilities/animations.css",
    "utilities/helpers.css"
  ]
}
```

---

## JavaScript Module Splitting (Completed)

### Script.js Split Results
| Module | Statements | Range (bytes) | Description |
|--------|------------|---------------|-------------|
| `js/01-dom-refs.js` | 87 | 0-5139 | DOM element references |
| `js/02-state.js` | 15 | 5139-6031 | Global state variables |
| `js/03-api-helpers.js` | 11 | 6033-14428 | API helpers, toast, fetch wrapper |
| `js/04-navigation.js` | 2 | 14430-16888 | Page navigation logic |
| `js/05-decorations.js` | 2 | 16890-19464 | Title & background decorations |
| `js/06a-quiz-render.js` | 7 | 19466-24804 | Quiz rendering logic |
| `js/06b-quiz-answer.js` | 5 | 24804-32135 | Quiz answer handling |
| `js/07-animations.js` | 9 | 32137-38362 | Animations & audio |
| `js/08-results.js` | 2 | 38364-41144 | Results page logic |
| `js/09a-auth.js` | 12 | 41146-50286 | Login & dashboard auth |
| `js/09b-dashboard.js` | 7 | 50286-61872 | Teacher dashboard |
| `js/10a-admin-materials.js` | 18 | 61874-80468 | Admin material management |
| `js/10b-admin-questions.js` | 2 | 80468-96802 | Admin question management |
| `js/11-init.js` | 2 | 96804-105405 | Program initialization |
| `js/materi-data.js` | - | - | DUMMY_MATERIALS declaration (extracted from materi.js) |

### Verification Results
| Check | Status | Details |
|-------|--------|---------|
| `script.js` concatenation | ✅ **PASS** | Byte-for-byte match with original (105,405 chars) |
| `materi.js` reconstruction | ✅ **PASS** | Exact match when inserting materi-data.js at marker |
| Syntax check (node --check) | ✅ **PASS** | All 15 modules parse without errors |
| Playwright smoke tests | ✅ **PASS** | 4/4 pages load with zero JavaScript errors |

### HTML Updates
| File | Changes |
|------|---------|
| `index.html` | Updated script tags to load 14 modules in order + version bump |
| `login.html` | Updated script tags to load 14 modules in order + version bump |
| `materi.html` | Updated script tags (fixed duplicate materi-data.js) |
| `materi-detail.html` | Updated script tags (fixed duplicate materi-data.js) |

### Archive
- `archive/original/script.js` - Original 3140-line script.js preserved
- `archive/original/materi.js` - Original materi.js with DUMMY_MATERIALS preserved

---

*Generated by Claude Code - CSS Restructuring Phase 1 + JS Splitting Progress Report*