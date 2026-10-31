#!/usr/bin/env python3
for fname in ['home.css', 'materi-list.css', 'auth.css', 'navbar.css']:
    with open(r'D:\Website\Pendidikan-PTKOM\frontend\\' + fname, 'rb') as f:
        orig = f.read()
    print(f'{fname}: ends with CRLF={orig.endswith(b"\r\n")}, LF={orig.endswith(b"\n")}, last 10={orig[-10:]}')

# Also check the split files
import os
CSS_DIR = r'D:\Website\Pendidikan-PTKOM\frontend\css'
for root, dirs, files in os.walk(CSS_DIR):
    for f in files:
        if f.endswith('.css'):
            path = os.path.join(root, f)
            with open(path, 'rb') as fp:
                content = fp.read()
            if not content.endswith(b'\r\n') and not content.endswith(b'\n'):
                print(f'NO TRAILING NEWLINE: {path}')