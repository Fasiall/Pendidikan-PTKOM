#!/usr/bin/env python3
import os
import json

CSS_DIR = r"D:\Website\Pendidikan-PTKOM\frontend\css"

with open(os.path.join(CSS_DIR, "manifest.json"), "r") as f:
    manifest = json.load(f)

# Convert all paths to forward slashes
for of in manifest["originalFileOrder"]:
    of["parts"] = [p.replace("\\", "/") for p in of["parts"]]

manifest["pageOverrides"] = {k: v.replace("\\", "/") if v else v for k, v in manifest["pageOverrides"].items()}

manifest["alwaysLast"] = manifest["alwaysLast"].replace("\\", "/")

with open(os.path.join(CSS_DIR, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print("Manifest updated with forward slashes")