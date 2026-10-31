#!/usr/bin/env python3
"""
Re-split specific problematic files at proper rule boundaries.
"""

import os

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
ARCHIVE_DIR = os.path.join(FRONTEND_DIR, "css-archive")

def read_file_preserve_newlines(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
    if b'\r\n' in content:
        le = '\r\n'
    elif b'\n' in content:
        le = '\n'
    else:
        le = '\n'
    lines = content.decode('utf-8').splitlines(keepends=True)
    return lines, le, content

def write_file_preserve_newlines(filepath, lines, le):
    normalized = []
    for line in lines:
        if line.endswith('\r\n'):
            normalized.append(line)
        elif line.endswith('\n'):
            normalized.append(line[:-1] + le)
        else:
            normalized.append(line + le)
    with open(filepath, 'wb') as f:
        f.write(''.join(normalized).encode('utf-8'))

def split_at_rule_boundaries(lines, max_lines=400):
    """Split CSS at rule boundaries (balanced braces)."""
    chunks = []
    current_chunk = []
    brace_depth = 0
    in_media = False
    media_depth = 0

    for line in lines:
        current_chunk.append(line)

        stripped = line.strip()

        # Detect @media start
        if stripped.startswith('@media'):
            in_media = True
            media_depth = 1
        elif in_media:
            media_depth += line.count('{')
            media_depth -= line.count('}')
            if media_depth <= 0:
                in_media = False
                media_depth = 0
        elif not in_media:
            brace_depth += line.count('{')
            brace_depth -= line.count('}')

        # Split at rule boundary when chunk is large enough
        if len(current_chunk) >= max_lines and brace_depth == 0 and not in_media:
            chunks.append(current_chunk)
            current_chunk = []

    if current_chunk:
        chunks.append(current_chunk)

    return chunks

def extract_section(lines, start_marker, end_marker=None):
    """Extract a section between markers."""
    start_idx = None
    end_idx = None

    for i, line in enumerate(lines):
        if start_marker in line and start_idx is None:
            start_idx = i
        if end_marker and end_marker in line and start_idx is not None and end_idx is None:
            end_idx = i
            break

    if start_idx is not None:
        if end_idx is not None:
            return lines[start_idx:end_idx]
        else:
            return lines[start_idx:]
    return []

def main():
    print("=== Fixing pages/01-auth-dashboard-* and pages/02-materi-* from style.css ===")
    style_lines, style_le, _ = read_file_preserve_newlines(os.path.join(ARCHIVE_DIR, 'style.css'))

    # Find sections - look for the section markers
    # Section 12: auth-dashboard (around line 1764-2425 in original)
    # Section 13: materi (around line 2425-2987 in original)

    # Extract auth-dashboard section (between specific markers)
    auth_start = None
    materi_start = None
    responsive_start = None

    for i, line in enumerate(style_lines):
        if 'AUTH DASHBOARD' in line.upper() or 'AUTH-DASHBOARD' in line.upper():
            auth_start = i
        elif 'MATERI' in line.upper() and 'REGISTER' not in line.upper() and materi_start is None:
            materi_start = i
        elif 'RESPONSIVE' in line.upper() and responsive_start is None:
            responsive_start = i

    print(f"Auth-dashboard start: {auth_start}, Materi start: {materi_start}, Responsive start: {responsive_start}")

    # Extract sections
    if auth_start is not None and materi_start is not None:
        auth_lines = style_lines[auth_start:materi_start]
        auth_chunks = split_at_rule_boundaries(auth_lines, 400)
        for i, chunk in enumerate(auth_chunks):
            fname = f"01-auth-dashboard-{14+i:02d}.css"
            dst = os.path.join(CSS_DIR, "pages", fname)
            write_file_preserve_newlines(dst, chunk, style_le)
            print(f"  Fixed {fname}: {len(chunk)} lines, braces={{={sum(l.count('{') for l in chunk)} }}={sum(l.count('}') for l in chunk)}")

    if materi_start is not None and responsive_start is not None:
        materi_lines = style_lines[materi_start:responsive_start]
        materi_chunks = split_at_rule_boundaries(materi_lines, 400)
        for i, chunk in enumerate(materi_chunks):
            fname = f"02-materi-{16+i:02d}.css"
            dst = os.path.join(CSS_DIR, "pages", fname)
            write_file_preserve_newlines(dst, chunk, style_le)
            print(f"  Fixed {fname}: {len(chunk)} lines, braces={{={sum(l.count('{') for l in chunk)} }}={sum(l.count('}') for l in chunk)}")

    print("\n=== Fixing theme-extra/04-quiz-screen-* and 07-dashboard-* from theme-extra.css ===")
    extra_lines, extra_le, _ = read_file_preserve_newlines(os.path.join(ARCHIVE_DIR, 'theme-extra.css'))

    # Find GRUP sections
    grup_starts = {}
    for i, line in enumerate(extra_lines):
        if 'GRUP' in line and ':' in line:
            grup_num = line.strip()
            grup_starts[grup_num] = i

    print(f"GRUP sections found: {list(grup_starts.keys())}")

    # GRUP 4: QUIZ SCREEN
    # GRUP 7: DASHBOARD
    grup_items = sorted(grup_starts.items(), key=lambda x: x[1])

    for idx, (grup_name, start_idx) in enumerate(grup_items):
        end_idx = grup_items[idx+1][1] if idx+1 < len(grup_items) else len(extra_lines)

        if 'GRUP 4' in grup_name or 'QUIZ' in grup_name.upper():
            print(f"Processing {grup_name} (lines {start_idx}-{end_idx})")
            quiz_lines = extra_lines[start_idx:end_idx]
            quiz_chunks = split_at_rule_boundaries(quiz_lines, 400)
            for i, chunk in enumerate(quiz_chunks):
                fname = f"04-quiz-screen-{5+i:02d}.css"
                dst = os.path.join(CSS_DIR, "theme-extra", fname)
                write_file_preserve_newlines(dst, chunk, extra_le)
                o = sum(l.count('{') for l in chunk)
                c = sum(l.count('}') for l in chunk)
                print(f"  Fixed {fname}: {len(chunk)} lines, braces={{={o} }}={c} [{'BALANCED' if o==c else 'UNBALANCED'}]")

        elif 'GRUP 7' in grup_name or 'DASHBOARD' in grup_name.upper():
            print(f"Processing {grup_name} (lines {start_idx}-{end_idx})")
            dash_lines = extra_lines[start_idx:end_idx]
            dash_chunks = split_at_rule_boundaries(dash_lines, 400)
            for i, chunk in enumerate(dash_chunks):
                fname = f"07-dashboard-{9+i:02d}.css"
                dst = os.path.join(CSS_DIR, "theme-extra", fname)
                write_file_preserve_newlines(dst, chunk, extra_le)
                o = sum(l.count('{') for l in chunk)
                c = sum(l.count('}') for l in chunk)
                print(f"  Fixed {fname}: {len(chunk)} lines, braces={{={o} }}={c} [{'BALANCED' if o==c else 'UNBALANCED'}]")

    print("\n=== Fixing utilities/extra-03-* from style.css extra sections ===")
    # Find the extra sections after responsive
    if responsive_start is not None:
        extra_style_lines = style_lines[responsive_start:]
        extra_chunks = split_at_rule_boundaries(extra_style_lines, 400)
        # Find which chunks correspond to extra-03-21 and extra-03-22
        # These are the 3rd and 4th extra chunks
        chunk_idx = 0
        for i, chunk in enumerate(extra_chunks):
            if len(chunk) > 50:  # Skip tiny chunks
                chunk_idx += 1
                if chunk_idx == 3:  # extra-03-21
                    fname = "extra-03-21.css"
                    dst = os.path.join(CSS_DIR, "utilities", fname)
                    write_file_preserve_newlines(dst, chunk, style_le)
                    o = sum(l.count('{') for l in chunk)
                    c = sum(l.count('}') for l in chunk)
                    print(f"  Fixed {fname}: {len(chunk)} lines, braces={{={o} }}={c} [{'BALANCED' if o==c else 'UNBALANCED'}]")
                elif chunk_idx == 4:  # extra-03-22
                    fname = "extra-03-22.css"
                    dst = os.path.join(CSS_DIR, "utilities", fname)
                    write_file_preserve_newlines(dst, chunk, style_le)
                    o = sum(l.count('{') for l in chunk)
                    c = sum(l.count('}') for l in chunk)
                    print(f"  Fixed {fname}: {len(chunk)} lines, braces={{={o} }}={c} [{'BALANCED' if o==c else 'UNBALANCED'}]")

if __name__ == "__main__":
    main()