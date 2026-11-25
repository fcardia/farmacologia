"""Rigenera docs/data/manifest.json dai file di capitolo presenti."""
import json, glob, os
voci = []
for f in sorted(glob.glob("docs/data/*.json")):
    nome = os.path.basename(f)
    if nome == "manifest.json":
        continue
    d = json.load(open(f, encoding="utf-8"))
    voci.append({"file": nome, "capitolo": d["capitolo"], "titolo": d["titolo"], "n_domande": len(d["domande"])})
voci.sort(key=lambda v: (v["capitolo"] == 99, v["capitolo"], v["file"]))
json.dump({"capitoli": voci}, open("docs/data/manifest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n".join(f'{v["file"]}: {v["n_domande"]}' for v in voci))
