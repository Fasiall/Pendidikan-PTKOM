#!/usr/bin/env python3
"""
Phase A: Simplify CSS file names
- Rename files to short, lowercase, descriptive names (no sequence numbers)
- Move all style.css pieces to css/style/
- Update manifest.json and HTML files
- Bump version ?v=N
"""

import os
import json
import shutil

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
CSS_DIR = os.path.join(FRONTEND_DIR, "css")

# Renaming plan: old_rel_path -> new_rel_path
RENAME_PLAN = {
    # style.css pieces -> all go to css/style/
    "style/00-header-01.css": "style/header.css",
    "style/01-root-vars-02.css": "style/root-vars.css",
    "style/02-reset-03.css": "style/reset.css",
    "style/03-ambient-04.css": "style/ambient.css",
    "style/04-navbar-05.css": "style/navbar-deprecated.css",

    "components/01-buttons-06.css": "style/buttons.css",
    "components/02-cards-09.css": "style/stats-cards.css",
    "components/03-quiz-10.css": "style/quiz-layout.css",
    "components/03-quiz-11.css": "style/quiz-feedback.css",
    "components/04-results-12.css": "style/results.css",
    "components/05-modals-13.css": "style/modals.css",

    "layout/01-page-shells-07.css": "style/page-shells.css",
    "layout/02-hero-08.css": "style/hero.css",

    "pages/01-auth-dashboard-14.css": "style/auth-dashboard.css",
    "pages/01-auth-dashboard-15.css": "style/auth-dashboard-forms.css",
    "pages/02-materi-16.css": "style/materi-catalog.css",
    "pages/02-materi-17.css": "style/materi-content.css",

    "utilities/01-responsive-18.css": "style/responsive.css",
    "utilities/extra-01-19.css": "style/quiz-editor.css",
    "utilities/extra-02-20.css": "style/question-studio.css",
    "utilities/extra-03-21.css": "style/creator-login-modal.css",
    "utilities/extra-03-22.css": "style/creator-login-form.css",
    "utilities/extra-04-23.css": "style/dashboard-creator.css",
    "utilities/extra-04-24.css": "style/dashboard-forms.css",
    "utilities/extra-05-25.css": "style/quiz-cards.css",
    "utilities/extra-05-26.css": "style/quiz-controls.css",
    "utilities/extra-05-27.css": "style/quiz-results-admin.css",
    "utilities/extra-06-28.css": "style/fullwidth-sizing.css",
    "utilities/extra-06-29.css": "style/footer-toast-radius.css",
    "utilities/extra-07-30.css": "style/marquee-gallery.css",

    # theme.css pieces -> stay in css/theme/
    "theme/01-dasar-01.css": "theme/base.css",
    "theme/02-halaman-02.css": "theme/page.css",
    "theme/03-tombol-03.css": "theme/buttons.css",
    "theme/04-nav-04.css": "theme/nav.css",
    "theme/05-halaman-utama-05.css": "theme/home.css",
    "theme/06-kuis-06.css": "theme/quiz.css",
    "theme/07-hasil-07.css": "theme/results.css",
    "theme/08-auth-08.css": "theme/dashboard.css",
    "theme/09-dashboard-09.css": "theme/materi.css",
    "theme/10-materi-10.css": "theme/toast.css",
    "theme/11-toast-11.css": "theme/modal.css",
    "theme/12-modal-12.css": "theme/responsive.css",

    # theme-extra.css pieces -> stay in css/theme-extra/
    "theme-extra/00-header-01.css": "theme-extra/bridge.css",
    "theme-extra/01-navbar-buttons-badge-02.css": "theme-extra/navbar-buttons-badge.css",
    "theme-extra/02-hero-mascot-03.css": "theme-extra/hero-mascot.css",
    "theme-extra/03-modal-04.css": "theme-extra/modal-sticker.css",
    "theme-extra/04-quiz-screen-05.css": "theme-extra/quiz-screen.css",
    "theme-extra/04-quiz-screen-06.css": "theme-extra/quiz-copied.css",
    "theme-extra/05-results-leaderboard-07.css": "theme-extra/results-leaderboard.css",
    "theme-extra/06-marquee-08.css": "theme-extra/marquee.css",
    "theme-extra/07-dashboard-09.css": "theme-extra/dashboard-shell.css",
    "theme-extra/07-dashboard-10.css": "theme-extra/dashboard-panels.css",
    "theme-extra/08-toast-11.css": "theme-extra/toast-multi.css",
    "theme-extra/09-materi-register-12.css": "theme-extra/materi-register.css",
    "theme-extra/09-materi-register-13.css": "theme-extra/materi-register-continued.css",

    # pages/ (page-specific CSS)
    "pages/auth-01.css": "pages/auth.css",
    "pages/home-01.css": "pages/home-hero.css",
    "pages/home-02.css": "pages/home-features.css",
    "pages/materi-list-01.css": "pages/materi-list.css",
    "pages/materi-list-02.css": "pages/materi-list-search.css",

    # layout/navbar-01.css -> move to css/navbar.css
    "layout/navbar-01.css": "navbar.css",
}

def main():
    print("=== Phase A: Simplify CSS file names ===\n")

    # 1. Perform renames
    print("1. Renaming files...")
    for old_rel, new_rel in RENAME_PLAN.items():
        old_path = os.path.join(CSS_DIR, old_rel)
        new_path = os.path.join(CSS_DIR, new_rel)

        if not os.path.exists(old_path):
            print(f"  WARNING: {old_rel} not found, skipping")
            continue

        # Ensure target directory exists
        os.makedirs(os.path.dirname(new_path), exist_ok=True)

        # Rename (os.rename works like mv)
        os.rename(old_path, new_path)
        print(f"  {old_rel} -> {new_rel}")

    # 2. Remove empty directories
    print("\n2. Removing empty directories...")
    for subdir in ["components", "layout", "utilities"]:
        subdir_path = os.path.join(CSS_DIR, subdir)
        if os.path.exists(subdir_path) and not os.listdir(subdir_path):
            os.rmdir(subdir_path)
            print(f"  Removed empty: {subdir}/")

    # 3. Update manifest.json
    print("\n3. Updating manifest.json...")
    manifest_path = os.path.join(CSS_DIR, "manifest.json")
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Create mapping for manifest update
    old_to_new = {old: new for old, new in RENAME_PLAN.items()}

    # Update originalFileOrder
    for of in manifest["originalFileOrder"]:
        of["parts"] = [old_to_new.get(p, p) for p in of["parts"]]

    # Update pageOverrides
    for page, override in manifest["pageOverrides"].items():
        if isinstance(override, list):
            manifest["pageOverrides"][page] = [old_to_new.get(p, p) for p in override]
        elif override:
            manifest["pageOverrides"][page] = old_to_new.get(override, override)

    # Update alwaysLast
    if manifest["alwaysLast"]:
        manifest["alwaysLast"] = old_to_new.get(manifest["alwaysLast"], manifest["alwaysLast"])

    # Bump version
    manifest["version"] = "2.0"
    manifest["description"] = "CSS cascade order. Phase A: simplified names, all style pieces in css/style/."

    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("  manifest.json updated")

    # 4. Update HTML files
    print("\n4. Updating HTML files...")
    version = 4  # bump from v=3 to v=4

    def get_page_css_list(page):
        css_list = []
        for of in manifest["originalFileOrder"]:
            css_list.extend(of["parts"])
        page_override = manifest["pageOverrides"].get(page)
        if page_override:
            if isinstance(page_override, list):
                css_list.extend(page_override)
            else:
                css_list.append(page_override)
        css_list.append(manifest["alwaysLast"])
        return css_list

    def update_html(html_file, page_key):
        html_path = os.path.join(FRONTEND_DIR, html_file)
        if not os.path.exists(html_path):
            print(f"  WARNING: {html_file} not found")
            return

        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()

        css_list = get_page_css_list(page_key)
        new_links = '\n'.join(f'    <link rel="stylesheet" href="css/{css}?v={version}">' for css in css_list)

        lines = content.splitlines(keepends=True)
        css_start = -1
        css_end = -1
        for i, line in enumerate(lines):
            if 'rel="stylesheet"' in line and '.css' in line:
                if css_start == -1:
                    css_start = i
                css_end = i

        if css_start >= 0:
            new_lines = lines[:css_start] + [l + '\n' for l in new_links.split('\n')] + lines[css_end+1:]
            with open(html_path, 'w', encoding='utf-8', newline='') as f:
                f.write(''.join(new_lines))
            print(f"  Updated {html_file}: {len(css_list)} CSS links")
        else:
            print(f"  WARNING: No CSS links in {html_file}")

    for f, k in [("index.html", "index.html"), ("login.html", "login.html"),
                 ("materi.html", "materi.html"), ("materi-detail.html", "materi-detail.html")]:
        update_html(f, k)

    # 5. Create mapping table for laporan.md
    print("\n5. Creating mapping table for laporan.md...")
    mapping_lines = [
        "| Old Path | New Path | Notes |",
        "|----------|----------|-------|",
    ]
    for old, new in sorted(RENAME_PLAN.items()):
        mapping_lines.append(f"| {old} | {new} | |")

    mapping_text = '\n'.join(mapping_lines)
    print(mapping_text)

    # Save to a temp file for later inclusion in laporan.md
    with open(os.path.join(FRONTEND_DIR, "css_rename_mapping.md"), 'w', encoding='utf-8') as f:
        f.write(mapping_text)

    print("\n=== Phase A Complete ===")
    print(f"Total files renamed: {len(RENAME_PLAN)}")
    print(f"Version bumped to: v={version}")

if __name__ == "__main__":
    main()