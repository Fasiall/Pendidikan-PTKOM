#!/usr/bin/env python3
import os
import json

CSS_DIR = r"D:\Website\Pendidikan-PTKOM\frontend\css"

# Load manifest
with open(os.path.join(CSS_DIR, "manifest.json"), "r") as f:
    manifest = json.load(f)

# Collect all referenced files
referenced = set()
for of in manifest["originalFileOrder"]:
    for p in of["parts"]:
        referenced.add(p.replace("\\", "/"))
for p in manifest["pageOverrides"].values():
    if p:
        referenced.add(p.replace("\\", "/"))
if manifest["alwaysLast"]:
    referenced.add(manifest["alwaysLast"].replace("\\", "/"))

print(f"Referenced files: {len(referenced)}")

# Find all CSS files
all_files = []
for root, dirs, files in os.walk(CSS_DIR):
    for f in files:
        if f.endswith(".css"):
            rel = os.path.relpath(os.path.join(root, f), CSS_DIR).replace("\\", "/")
            all_files.append(rel)

print(f"All CSS files: {len(all_files)}")

# Find unreferenced
unreferenced = [f for f in all_files if f not in referenced]
print(f"Unreferenced files: {len(unreferenced)}")
for f in sorted(unreferenced):
    print(f"  {f}")

# Delete unreferenced
for f in unreferenced:
    os.remove(os.path.join(CSS_DIR, f))
    print(f"Deleted: {f}")