#!/usr/bin/env python3
"""Validatore dei file JSON del quiz di Farmacologia.

Uso (dalla radice del progetto):  python3 strumenti/valida.py
Codice di uscita 0 se tutto è valido, 1 altrimenti.
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "docs", "data")

LETTERE = ["A", "B", "C", "D", "E"]
DIFFICOLTA = {"base", "intermedio", "avanzato"}
TIPI = {"nozionistica", "meccanismo", "confronto", "caso_clinico", "farmacocinetica", "falsa"}
TARGET_DIFF = {"base": 0.20, "intermedio": 0.50, "avanzato": 0.30}
FILE_RE = re.compile(r"^(\d{2}[a-z]?)_[a-z0-9_]+\.json$")
ID_RE = re.compile(r"^(\d{2}[a-z]?)-(\d{3})$")
VIETATE = ["tutte le precedenti", "nessuna delle precedenti", "tutte le risposte", "nessuna delle risposte"]

errori = []
avvisi = []


def err(f, qid, msg):
    errori.append(f"[ERRORE] {f}" + (f" ({qid})" if qid else "") + f": {msg}")


def warn(f, msg):
    avvisi.append(f"[AVVISO] {f}: {msg}")


def is_str(x):
    return isinstance(x, str) and x.strip() != ""


def valida_capitolo(nome, dati, ids_globali, stat):
    m = FILE_RE.match(nome)
    if not m:
        err(nome, None, "nome file non conforme (atteso NN_nomecapitolo.json, minuscolo, senza accenti)")
        prefisso = None
    else:
        prefisso = m.group(1)

    if not isinstance(dati, dict):
        err(nome, None, "la radice deve essere un oggetto")
        return 0
    if not isinstance(dati.get("capitolo"), int) or isinstance(dati.get("capitolo"), bool):
        err(nome, None, "'capitolo' mancante o non intero")
    elif prefisso and int(re.match(r"\d+", prefisso).group()) != dati["capitolo"]:
        err(nome, None, f"'capitolo' ({dati['capitolo']}) non coincide con il nome file")
    if not is_str(dati.get("titolo")):
        err(nome, None, "'titolo' mancante o vuoto")
    if not is_str(dati.get("pagine")):
        err(nome, None, "'pagine' mancante o vuoto")

    par = dati.get("punti_alto_rischio")
    if not isinstance(par, list) or len(par) != 5 or not all(is_str(p) for p in par):
        err(nome, None, "'punti_alto_rischio' deve contenere esattamente 5 stringhe non vuote")

    domande = dati.get("domande")
    if not isinstance(domande, list) or not domande:
        err(nome, None, "'domande' mancante, non lista o vuota")
        return 0

    diff_cap = Counter()
    tipo_cap = Counter()
    for i, q in enumerate(domande):
        qid = q.get("id") if isinstance(q, dict) else None
        etichetta = qid if is_str(qid) else f"domanda #{i + 1}"
        if not isinstance(q, dict):
            err(nome, etichetta, "la domanda non è un oggetto")
            continue

        # id
        if not is_str(qid) or not ID_RE.match(qid):
            err(nome, etichetta, "'id' mancante o non nel formato NN-XXX")
        else:
            if prefisso and ID_RE.match(qid).group(1) != prefisso:
                err(nome, etichetta, f"prefisso dell'id diverso da quello del file ({prefisso})")
            if qid in ids_globali:
                err(nome, etichetta, f"id duplicato (già in {ids_globali[qid]})")
            else:
                ids_globali[qid] = nome

        d = q.get("difficolta")
        if d not in DIFFICOLTA:
            err(nome, etichetta, f"'difficolta' non valida: {d!r}")
        else:
            diff_cap[d] += 1
        t = q.get("tipo")
        if t not in TIPI:
            err(nome, etichetta, f"'tipo' non valido: {t!r}")
        else:
            tipo_cap[t] += 1

        for campo in ("argomento", "domanda", "spiegazione", "riferimento"):
            if not is_str(q.get(campo)):
                err(nome, etichetta, f"'{campo}' mancante o vuoto")

        opz = q.get("opzioni")
        if not isinstance(opz, dict) or sorted(opz.keys()) != LETTERE:
            err(nome, etichetta, "'opzioni' deve avere esattamente le chiavi A-E")
            opz = opz if isinstance(opz, dict) else {}
        for k, v in opz.items():
            if not is_str(v):
                err(nome, etichetta, f"opzione {k} vuota o non stringa")
        testi = [v.strip().lower() for v in opz.values() if isinstance(v, str)]
        if len(testi) != len(set(testi)):
            err(nome, etichetta, "opzioni duplicate")

        testo_tutto = " ".join(
            [str(q.get("domanda", ""))] + [str(v) for v in opz.values()]
        ).lower()
        for frase in VIETATE:
            if frase in testo_tutto:
                err(nome, etichetta, f"contiene la formula vietata '{frase}'")

        c = q.get("corretta")
        if c not in LETTERE:
            err(nome, etichetta, f"'corretta' non valida: {c!r}")
        dis = q.get("distrattori")
        if not isinstance(dis, dict):
            err(nome, etichetta, "'distrattori' mancante o non oggetto")
        elif c in LETTERE:
            attese = sorted(l for l in LETTERE if l != c)
            if sorted(dis.keys()) != attese:
                err(nome, etichetta, f"'distrattori' deve avere esattamente le chiavi {attese}")
            for k, v in dis.items():
                if not is_str(v):
                    err(nome, etichetta, f"distrattore {k} vuoto")

    n = len(domande)
    # avvisi su distribuzione
    for d, tgt in TARGET_DIFF.items():
        quota = diff_cap[d] / n
        if abs(quota - tgt) > 0.10:
            warn(nome, f"difficoltà '{d}' al {quota:.0%} (atteso ~{tgt:.0%})")
    if dati.get("capitolo") != 99 and tipo_cap["falsa"] / n > 0.10:
        warn(nome, f"domande 'falsa' al {tipo_cap['falsa'] / n:.0%} (massimo 10%)")
    usati = [t for t in TIPI if tipo_cap[t]]
    if len(usati) < 4:
        warn(nome, f"solo {len(usati)} tipologie di domanda usate")

    stat["per_capitolo"][nome] = n
    stat["diff"].update(diff_cap)
    stat["tipo"].update(tipo_cap)
    return n


def main():
    if not os.path.isdir(DATA):
        print(f"[ERRORE] cartella non trovata: {DATA}")
        return 1

    files = sorted(f for f in os.listdir(DATA) if f.endswith(".json"))
    contenuti = {}
    for f in files:
        try:
            with open(os.path.join(DATA, f), encoding="utf-8") as fh:
                contenuti[f] = json.load(fh)
        except UnicodeDecodeError:
            err(f, None, "file non in UTF-8")
        except json.JSONDecodeError as e:
            err(f, None, f"JSON non valido: {e}")

    ids = {}
    stat = {"per_capitolo": {}, "diff": Counter(), "tipo": Counter()}
    for f in files:
        if f == "manifest.json" or f not in contenuti:
            continue
        valida_capitolo(f, contenuti[f], ids, stat)

    # manifest
    capitoli_presenti = sorted(f for f in files if f != "manifest.json")
    man = contenuti.get("manifest.json")
    if "manifest.json" not in files:
        err("manifest.json", None, "manifest mancante")
    elif man is not None:
        voci = man.get("capitoli") if isinstance(man, dict) else None
        if not isinstance(voci, list):
            err("manifest.json", None, "'capitoli' mancante o non lista")
        else:
            elencati = []
            for v in voci:
                if not isinstance(v, dict) or not is_str(v.get("file")):
                    err("manifest.json", None, f"voce non valida: {v!r}")
                    continue
                fn = v["file"]
                elencati.append(fn)
                for campo, tipo in (("capitolo", int), ("titolo", str), ("n_domande", int)):
                    if not isinstance(v.get(campo), tipo):
                        err("manifest.json", fn, f"campo '{campo}' mancante o del tipo sbagliato")
                if fn in contenuti and isinstance(contenuti[fn], dict):
                    reale = len(contenuti[fn].get("domande", []) or [])
                    if v.get("n_domande") != reale:
                        err("manifest.json", fn, f"n_domande={v.get('n_domande')} ma il file ne contiene {reale}")
                    if v.get("capitolo") != contenuti[fn].get("capitolo"):
                        err("manifest.json", fn, "numero di capitolo diverso da quello del file")
            dup = [k for k, c in Counter(elencati).items() if c > 1]
            for d in dup:
                err("manifest.json", d, "file elencato più volte")
            for fn in sorted(set(capitoli_presenti) - set(elencati)):
                err("manifest.json", fn, "file presente in docs/data ma non nel manifest")
            for fn in sorted(set(elencati) - set(capitoli_presenti)):
                err("manifest.json", fn, "file nel manifest ma non presente in docs/data")
            ordine = [v.get("capitolo") for v in voci if isinstance(v, dict) and isinstance(v.get("capitolo"), int)]
            chiavi = [(c == 99, c) for c in ordine]
            if chiavi != sorted(chiavi):
                err("manifest.json", None, "voci non ordinate per capitolo (il 99 deve essere ultimo)")

    # output
    for e in errori:
        print(e)
    for a in avvisi:
        print(a)

    tot = sum(stat["per_capitolo"].values())
    print("\n=== RIEPILOGO ===")
    print(f"File di capitolo: {len(stat['per_capitolo'])}   Domande totali: {tot}")
    if stat["per_capitolo"]:
        print("\nPer capitolo:")
        for f, n in stat["per_capitolo"].items():
            print(f"  {f:45s} {n:4d}")
        print("\nPer difficoltà:")
        for d in ("base", "intermedio", "avanzato"):
            n = stat["diff"][d]
            print(f"  {d:12s} {n:4d}  ({n / tot:.0%})" if tot else f"  {d:12s} 0")
        print("\nPer tipo:")
        for t in sorted(TIPI):
            n = stat["tipo"][t]
            print(f"  {t:16s} {n:4d}  ({n / tot:.0%})" if tot else f"  {t:16s} 0")
    print(f"\nErrori: {len(errori)}   Avvisi: {len(avvisi)}")
    print("ESITO: " + ("OK" if not errori else "NON VALIDO"))
    return 0 if not errori else 1


if __name__ == "__main__":
    sys.exit(main())
