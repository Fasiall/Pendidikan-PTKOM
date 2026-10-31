#!/usr/bin/env python3
"""
Proper CSS splitting at rule boundaries (balanced braces).
Preserves CRLF line endings.
"""

import os

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
ARCHIVE_DIR = os.path.join(FRONTEND_DIR, "css-archive")

def read_file_preserve_newlines(filepath):
    """Read file preserving original line endings."""
    with open(filepath, 'rb') as f:
        content = f.read()
    # Detect line ending
    if b'\r\n' in content:
        le = '\r\n'
    elif b'\n' in content:
        le = '\n'
    else:
        le = '\n'
    lines = content.decode('utf-8').splitlines(keepends=True)
    return lines, le, content

def write_file_preserve_newlines(filepath, lines, le):
    """Write file with consistent line endings."""
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
    """
    Split CSS at rule boundaries (balanced braces).
    Returns list of chunks (each chunk is a list of lines).
    """
    chunks = []
    current_chunk = []
    brace_depth = 0
    in_media = False
    media_depth = 0

    for line in lines:
        current_chunk.append(line)

        # Track brace depth for rule boundaries
        # Count { and } but ignore those in comments/strings for simplicity
        # Since we're at rule level, we track top-level braces
        stripped = line.strip()

        # Detect @media start
        if stripped.startswith('@media'):
            in_media = True
            media_depth = 1  # @media { starts a block
        elif in_media:
            # Count braces inside @media
            media_depth += line.count('{')
            media_depth -= line.count('}')
            if media_depth <= 0:
                in_media = False
                media_depth = 0
        elif not in_media:
            # Track top-level rule braces
            brace_depth += line.count('{')
            brace_depth -= line.count('}')

        # Check if we should split:
        # 1. At rule boundary (brace_depth == 0, not in media)
        # 2. Chunk is getting large (> max_lines)
        if len(current_chunk) >= max_lines and brace_depth == 0 and not in_media:
            # Good split point - at rule boundary
            chunks.append(current_chunk)
            current_chunk = []

    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk)

    return chunks

def split_file(source_name, dest_dir, prefix, max_lines=400):
    """Split a single CSS file properly."""
    src_path = os.path.join(ARCHIVE_DIR, source_name)
    lines, le, _ = read_file_preserve_newlines(src_path)

    chunks = split_at_rule_boundaries(lines, max_lines)

    created = []
    for i, chunk in enumerate(chunks):
        fname = f"{prefix}{i+1:02d}.css"
        dst_path = os.path.join(CSS_DIR, dest_dir, fname)
        write_file_preserve_newlines(dst_path, chunk, le)
        created.append(os.path.join(dest_dir, fname).replace('\\', '/'))
        print(f"  Created {fname}: {len(chunk)} lines")

    return created

def main():
    os.makedirs(os.path.join(CSS_DIR, "pages"), exist_ok=True)

    print("Splitting home.css...")
    home_parts = split_file("home.css", "pages", "home-")

    print("\nSplitting materi-list.css...")
    materi_parts = split_file("materi-list.css", "pages", "materi-list-")

    print(f"\nHome parts: {home_parts}")
    print(f"Materi parts: {materi_parts}")

    return home_parts, materi_parts

if __name__ == "__main__":
    main()