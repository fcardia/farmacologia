/* Quiz di Farmacologia — app statica (nessuna dipendenza). */
(function () {
  "use strict";

  var LETTERE = ["A", "B", "C", "D", "E"];
  var DIFFICOLTA = ["base", "intermedio", "avanzato"];
  var TIPI = {
    nozionistica: "Nozionistica",
    meccanismo: "Meccanismo",
    confronto: "Confronto",
    caso_clinico: "Caso clinico",
    farmacocinetica: "Farmacocinetica",
    falsa: "Affermazione falsa"
  };
  var CHIAVE_STATS = "quizFarmacologia.stats.v1";
  var CHIAVE_PREF = "quizFarmacologia.pref.v1";

  var app = document.getElementById("app");
  var manifest = null;
  var cacheCapitoli = {};
  var stats = caricaStats();
  var quiz = null; // sessione in corso
  var tastiAttivi = null; // gestore tastiera della schermata corrente

  /* ---------- Utilità DOM ---------- */

  function el(tag, attrs, figli) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, "");
        else n.setAttribute(k, v);
      });
    }
    (figli || []).forEach(function (f) {
      if (f === null || f === undefined || f === false) return;
      n.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return n;
  }

  function mostra(nodi, gestoreTasti) {
    app.textContent = "";
    nodi.forEach(function (n) { if (n) app.appendChild(n); });
    tastiAttivi = gestoreTasti || null;
    window.scrollTo(0, 0);
  }

  function mescola(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pct(ok, tot) { return tot ? Math.round((ok / tot) * 100) : 0; }

  function classePct(p) { return p < 50 ? "pct-bassa" : p < 75 ? "pct-media" : "pct-alta"; }

  function etichettaCap(c) { return "Cap. " + c.capitolo + " — " + c.titolo; }

  /* ---------- Archiviazione (sempre dentro try/catch) ---------- */

  var archivioDisponibile = (function () {
    try {
      var k = "__prova__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function leggi(chiave) {
    try {
      var s = window.localStorage.getItem(chiave);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  function scrivi(chiave, valore) {
    try { window.localStorage.setItem(chiave, JSON.stringify(valore)); } catch (e) { /* senza salvataggio */ }
  }

  function caricaStats() {
    var s = leggi(CHIAVE_STATS);
    return s && typeof s.q === "object" && s.q ? s : { q: {} };
  }

  function salvaStats() { scrivi(CHIAVE_STATS, stats); }

  function registraRisposta(d, corretta) {
    var s = stats.q[d.id] || { t: 0, e: 0, s: 0 };
    s.t += 1;
    if (corretta) { s.s += 1; } else { s.e += 1; s.s = 0; }
    s.arg = d.argomento;
    s.cap = d._cap;
    stats.q[d.id] = s;
    salvaStats();
  }

  function daRipetere(id) {
    var s = stats.q[id];
    return !!s && s.e >= 1 && s.s < 2;
  }

  /* ---------- Caricamento dati ---------- */

  function erroreCaricamento(err) {
    var daFile = window.location.protocol === "file:";
    mostra([
      el("h1", { text: "Impossibile caricare le domande" }),
      el("div", { class: "avviso" }, [
        el("p", { text: daFile
          ? "Hai aperto la pagina direttamente dal file (doppio clic). Il browser blocca il caricamento dei dati in questo modo."
          : "Il caricamento dei dati non è riuscito." }),
        el("p", null, ["Avvia un piccolo server locale dalla cartella ", el("code", { text: "docs" }), ":"]),
        el("p", null, [el("code", { text: "cd docs && python3 -m http.server" })]),
        el("p", null, ["poi apri ", el("code", { text: "http://localhost:8000" }), " nel browser."])
      ]),
      el("p", { class: "muted small", text: "Dettaglio tecnico: " + (err && err.message ? err.message : String(err)) })
    ]);
  }

  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " su " + url);
      return r.json();
    });
  }

  function caricaManifest() {
    return getJSON("data/manifest.json").then(function (m) {
      if (!m || !Array.isArray(m.capitoli)) throw new Error("manifest.json non valido");
      manifest = m;
      return m;
    });
  }

  function caricaCapitolo(voce) {
    if (cacheCapitoli[voce.file]) return Promise.resolve(cacheCapitoli[voce.file]);
    return getJSON("data/" + voce.file).then(function (dati) {
      (dati.domande || []).forEach(function (d) {
        d._cap = dati.capitolo;
        d._titoloCap = dati.titolo;
      });
      cacheCapitoli[voce.file] = dati;
      return dati;
    });
  }

  function caricaCapitoli(voci) { return Promise.all(voci.map(caricaCapitolo)); }

  function titoloCapitolo(n) {
    var v = (manifest ? manifest.capitoli : []).filter(function (c) { return c.capitolo === n; })[0];
    return v ? etichettaCap(v) : "Cap. " + n;
  }

  /* ---------- Schermata iniziale ---------- */

  function schermataIniziale() {
    var pref = leggi(CHIAVE_PREF) || {};
    var capitoli = manifest.capitoli;
    var nodi = [el("h1", { text: "Preparazione all'esame" })];

    if (!archivioDisponibile) {
      nodi.push(el("div", { class: "avviso", text: "Il salvataggio nel browser non è disponibile (ad es. navigazione privata): il quiz funziona, ma statistiche ed errori non verranno conservati." }));
    }

    if (!capitoli.length) {
      nodi.push(el("div", { class: "avviso", text: "Non ci sono ancora capitoli nel manifest (data/manifest.json)." }));
      mostra(nodi);
      return;
    }

    // Capitoli
    var selPrec = Array.isArray(pref.capitoli) ? pref.capitoli : null;
    var checkCap = capitoli.map(function (c) {
      return el("input", { type: "checkbox", value: c.file, checked: selPrec ? selPrec.indexOf(c.file) !== -1 : true });
    });
    var checkTutti = el("input", { type: "checkbox" });
    function aggiornaTutti() {
      var n = checkCap.filter(function (c) { return c.checked; }).length;
      checkTutti.checked = n === checkCap.length;
      checkTutti.indeterminate = n > 0 && n < checkCap.length;
    }
    checkTutti.addEventListener("change", function () {
      checkCap.forEach(function (c) { c.checked = checkTutti.checked; });
      aggiornaTutti();
    });
    checkCap.forEach(function (c) { c.addEventListener("change", aggiornaTutti); });
    aggiornaTutti();

    var totDomande = capitoli.reduce(function (s, c) { return s + (c.n_domande || 0); }, 0);
    var lista = el("ul", { class: "lista-check" }, [
      el("li", null, [el("label", { class: "check" }, [checkTutti, el("span", { class: "testo" }, [el("strong", { text: "Tutti i capitoli" })]), el("span", { class: "conta", text: totDomande + " domande" })])])
    ].concat(capitoli.map(function (c, i) {
      return el("li", null, [el("label", { class: "check" }, [checkCap[i], el("span", { class: "testo", text: etichettaCap(c) }), el("span", { class: "conta", text: c.n_domande + " dom." })])]);
    })));
    nodi.push(el("section", { class: "card" }, [el("h2", { text: "Capitoli" }), lista]));

    // Filtri
    var diffPrec = Array.isArray(pref.difficolta) ? pref.difficolta : DIFFICOLTA;
    var checkDiff = DIFFICOLTA.map(function (d) { return el("input", { type: "checkbox", value: d, checked: diffPrec.indexOf(d) !== -1 }); });
    var tipiPrec = Array.isArray(pref.tipi) ? pref.tipi : Object.keys(TIPI);
    var checkTipi = Object.keys(TIPI).map(function (t) { return el("input", { type: "checkbox", value: t, checked: tipiPrec.indexOf(t) !== -1 }); });
    var selNum = el("select", { "aria-label": "Numero di domande" }, ["10", "20", "30", "50", "tutte"].map(function (v) {
      return el("option", { value: v, selected: String(pref.numero || "20") === v }, [v === "tutte" ? "Tutte" : v]);
    }));

    nodi.push(el("section", { class: "card" }, [
      el("h2", { text: "Filtri" }),
      el("h3", { text: "Difficoltà" }),
      el("div", { class: "chips" }, checkDiff.map(function (c) { return el("label", { class: "chip" }, [c, c.value]); })),
      el("h3", { text: "Tipo di domanda" }),
      el("div", { class: "chips" }, checkTipi.map(function (c) { return el("label", { class: "chip" }, [c, TIPI[c.value]]); })),
      el("h3", { text: "Numero di domande" }),
      el("div", { class: "riga" }, [selNum])
    ]));

    var msg = el("div", { class: "avviso", hidden: true });
    function valori(arr) { return arr.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }); }

    var btnInizia = el("button", { type: "button", class: "btn primary", onclick: function () {
      var files = valori(checkCap), diff = valori(checkDiff), tipi = valori(checkTipi), num = selNum.value;
      scrivi(CHIAVE_PREF, { capitoli: files, difficolta: diff, tipi: tipi, numero: num });
      if (!files.length) { msg.textContent = "Seleziona almeno un capitolo."; msg.hidden = false; return; }
      if (!diff.length || !tipi.length) { msg.textContent = "Seleziona almeno una difficoltà e un tipo di domanda."; msg.hidden = false; return; }
      btnInizia.disabled = true;
      var voci = capitoli.filter(function (c) { return files.indexOf(c.file) !== -1; });
      caricaCapitoli(voci).then(function (dati) {
        var pool = [];
        dati.forEach(function (d) { pool = pool.concat(d.domande || []); });
        pool = pool.filter(function (q) { return diff.indexOf(q.difficolta) !== -1 && tipi.indexOf(q.tipo) !== -1; });
        if (!pool.length) {
          msg.textContent = "Nessuna domanda corrisponde ai filtri scelti.";
          msg.hidden = false;
          btnInizia.disabled = false;
          return;
        }
        pool = mescola(pool);
        if (num !== "tutte") pool = pool.slice(0, parseInt(num, 10));
        avviaQuiz(pool, "Quiz");
      }).catch(erroreCaricamento);
    } }, ["Inizia"]);

    var nErrori = Object.keys(stats.q).filter(daRipetere).length;
    nodi.push(msg);
    nodi.push(el("div", { class: "azioni" }, [btnInizia]));
    nodi.push(el("section", { class: "card" }, [
      el("h2", { text: "Ripasso e statistiche" }),
      el("div", { class: "azioni" }, [
        el("button", { type: "button", class: "btn", disabled: nErrori === 0, onclick: avviaRipetiErrori }, ["Ripeti i miei errori (" + nErrori + ")"]),
        el("button", { type: "button", class: "btn", onclick: schermataPuntiDeboli }, ["I miei punti deboli"]),
        el("button", { type: "button", class: "btn", onclick: schermataAltoRischio }, ["Punti ad alto rischio"])
      ]),
      el("p", { class: "muted small", text: "\"Ripeti i miei errori\" propone le domande sbagliate almeno una volta e non ancora risposte correttamente due volte di fila." }),
      zonaReset()
    ]));

    mostra(nodi, function (e) {
      if (e.key === "Enter" && e.target === document.body) { e.preventDefault(); btnInizia.click(); }
    });
  }

  function zonaReset() {
    var box = el("div");
    function chiuso() {
      box.textContent = "";
      box.appendChild(el("button", { type: "button", class: "btn link", onclick: aperto }, ["Azzera le statistiche…"]));
    }
    function aperto() {
      box.textContent = "";
      box.appendChild(el("div", { class: "avviso" }, [
        el("p", { text: "Vuoi davvero cancellare tutte le statistiche e l'elenco degli errori? L'operazione non si può annullare." }),
        el("div", { class: "azioni" }, [
          el("button", { type: "button", class: "btn danger", onclick: function () {
            stats = { q: {} };
            salvaStats();
            schermataIniziale();
          } }, ["Sì, azzera"]),
          el("button", { type: "button", class: "btn", onclick: chiuso }, ["Annulla"])
        ])
      ]));
    }
    chiuso();
    return box;
  }

  /* ---------- Quiz ---------- */

  function preparaDomanda(d) {
    var ordine = mescola(LETTERE);
    var opzioni = ordine.map(function (orig, i) {
      return {
        lettera: LETTERE[i],
        testo: d.opzioni[orig],
        giusta: orig === d.corretta,
        motivo: orig === d.corretta ? null : (d.distrattori || {})[orig] || ""
      };
    });
    return { d: d, opzioni: opzioni };
  }

  function avviaQuiz(domande, nome) {
    quiz = {
      nome: nome,
      voci: domande.map(preparaDomanda),
      indice: 0,
      risposte: [] // { voce, scelta, ok }
    };
    mostraDomanda();
  }

  function avviaRipetiErrori() {
    caricaCapitoli(manifest.capitoli).then(function (dati) {
      var pool = [];
      dati.forEach(function (d) { pool = pool.concat((d.domande || []).filter(function (q) { return daRipetere(q.id); })); });
      if (!pool.length) { schermataIniziale(); return; }
      avviaQuiz(mescola(pool), "Ripeti i miei errori");
    }).catch(erroreCaricamento);
  }

  function mostraDomanda() {
    var voce = quiz.voci[quiz.indice];
    var d = voce.d;
    var tot = quiz.voci.length;
    var risposto = false;

    var bottoni = voce.opzioni.map(function (o, i) {
      return el("button", { type: "button", class: "opzione", onclick: function () { rispondi(i); } }, [
        el("span", { class: "lettera", text: o.lettera }),
        el("span", { text: o.testo })
      ]);
    });
    var zonaFeedback = el("div", { class: "feedback" });

    function rispondi(i) {
      if (risposto) return;
      risposto = true;
      var scelta = voce.opzioni[i];
      var ok = scelta.giusta;
      quiz.risposte.push({ voce: voce, scelta: scelta, ok: ok });
      registraRisposta(d, ok);

      bottoni.forEach(function (b, j) {
        b.disabled = true;
        if (voce.opzioni[j].giusta) b.classList.add("giusta");
        else if (j === i) b.classList.add("sbagliata");
      });

      var giusta = voce.opzioni.filter(function (o) { return o.giusta; })[0];
      var altri = voce.opzioni.filter(function (o) { return !o.giusta && o !== scelta; });
      var ultimo = quiz.indice === tot - 1;
      var btnAvanti = el("button", { type: "button", class: "btn primary", onclick: avanti }, [ultimo ? "Vedi i risultati" : "Avanti"]);

      zonaFeedback.appendChild(el("div", { class: "card" }, [
        el("p", { class: "esito " + (ok ? "ok" : "ko"), text: ok ? "Risposta corretta!" : "Risposta sbagliata. La corretta è la " + giusta.lettera + "." }),
        el("p", null, [el("strong", { text: "Spiegazione: " }), d.spiegazione]),
        ok ? null : el("p", null, [el("strong", { text: "Perché la " + scelta.lettera + " è sbagliata: " }), scelta.motivo]),
        altri.length ? el("details", null, [
          el("summary", { text: ok ? "Perché le altre opzioni sono sbagliate" : "Le altre opzioni sbagliate" }),
          el("ul", null, altri.map(function (o) { return el("li", null, [el("strong", { text: o.lettera + ": " }), o.motivo]); }))
        ]) : null,
        el("p", { class: "riferimento", text: "Riferimento: " + d.riferimento })
      ]));
      zonaFeedback.appendChild(el("div", { class: "azioni" }, [btnAvanti]));
      btnAvanti.focus({ preventScroll: true });
      zonaFeedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function avanti() {
      quiz.indice += 1;
      if (quiz.indice >= tot) schermataRisultati();
      else mostraDomanda();
    }

    var nodi = [
      el("div", { class: "progresso" }, [
        el("div", { class: "riga" }, [
          el("span", { class: "muted", text: quiz.nome + " · Domanda " + (quiz.indice + 1) + " di " + tot }),
          el("span", { style: "flex:1" }),
          el("button", { type: "button", class: "btn link", onclick: function () {
            if (quiz.risposte.length) schermataRisultati(); else schermataIniziale();
          } }, ["Termina"])
        ]),
        el("div", { class: "barra", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(tot), "aria-valuenow": String(quiz.indice) }, [
          el("span", { style: "width:" + pct(quiz.indice, tot) + "%" })
        ])
      ]),
      el("section", { class: "card" }, [
        el("div", { class: "badges" }, [
          el("span", { class: "badge " + d.difficolta, text: d.difficolta }),
          el("span", { class: "badge", text: TIPI[d.tipo] || d.tipo }),
          el("span", { class: "badge", text: d.argomento }),
          el("span", { class: "badge", text: "Cap. " + d._cap })
        ]),
        el("p", { class: "testo-domanda", text: d.domanda }),
        el("div", { class: "opzioni" }, bottoni),
        zonaFeedback,
        el("p", { class: "tasti" }, ["Tastiera: ", el("kbd", { text: "1" }), "–", el("kbd", { text: "5" }), " oppure ", el("kbd", { text: "A" }), "–", el("kbd", { text: "E" }), " per rispondere, ", el("kbd", { text: "Invio" }), " per andare avanti."])
      ])
    ];

    mostra(nodi, function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!risposto) {
        var k = e.key.toUpperCase();
        var idx = "12345".indexOf(k);
        if (idx === -1) idx = LETTERE.indexOf(k);
        if (idx !== -1 && k.length === 1) { e.preventDefault(); rispondi(idx); }
      } else if (e.key === "Enter") {
        e.preventDefault();
        avanti();
      }
    });
  }

  /* ---------- Risultati ---------- */

  function tabella(intest, righe) {
    return el("div", { class: "tabella-wrap" }, [el("table", null, [
      el("thead", null, [el("tr", null, intest.map(function (h, i) { return el("th", { class: i ? "num" : null, text: h }); }))]),
      el("tbody", null, righe.map(function (r) {
        return el("tr", null, r.map(function (c, i) {
          if (c && c.nodeType) return el("td", { class: i ? "num" : null }, [c]);
          return el("td", { class: i ? "num" : null, text: String(c) });
        }));
      }))
    ])]);
  }

  function cellaPct(ok, tot) {
    var p = pct(ok, tot);
    return el("span", { class: classePct(p), text: p + "%" });
  }

  function schermataRisultati() {
    var r = quiz.risposte;
    var ok = r.filter(function (x) { return x.ok; }).length;
    var p = pct(ok, r.length);

    function raggruppa(chiave) {
      var g = {};
      r.forEach(function (x) {
        var k = chiave(x.voce.d);
        g[k] = g[k] || { ok: 0, tot: 0 };
        g[k].tot += 1;
        if (x.ok) g[k].ok += 1;
      });
      return g;
    }

    var perDiff = raggruppa(function (d) { return d.difficolta; });
    var perArg = raggruppa(function (d) { return d.argomento; });
    var sbagliate = r.filter(function (x) { return !x.ok; });

    var nodi = [
      el("h1", { text: "Risultato" }),
      el("section", { class: "card" }, [
        el("p", { class: "punteggio " + classePct(p), text: ok + " / " + r.length }),
        el("p", { class: "muted", text: p + "% di risposte corrette" + (r.length < quiz.voci.length ? " (quiz terminato in anticipo: " + r.length + " domande su " + quiz.voci.length + ")" : "") })
      ]),
      el("div", { class: "azioni" }, [
        el("button", { type: "button", class: "btn primary", disabled: !sbagliate.length, onclick: function () {
          avviaQuiz(mescola(sbagliate.map(function (x) { return x.voce.d; })), "Ripasso delle sbagliate");
        } }, ["Ripassa solo le sbagliate (" + sbagliate.length + ")"]),
        el("button", { type: "button", class: "btn", onclick: schermataIniziale }, ["Torna all'inizio"])
      ]),
      el("section", { class: "card" }, [
        el("h2", { text: "Per difficoltà" }),
        tabella(["Difficoltà", "Corrette", "%"], DIFFICOLTA.filter(function (d) { return perDiff[d]; }).map(function (d) {
          return [d, perDiff[d].ok + " / " + perDiff[d].tot, cellaPct(perDiff[d].ok, perDiff[d].tot)];
        })),
        el("h2", { text: "Per argomento" }),
        tabella(["Argomento", "Corrette", "%"], Object.keys(perArg).sort(function (a, b) {
          return pct(perArg[a].ok, perArg[a].tot) - pct(perArg[b].ok, perArg[b].tot) || a.localeCompare(b);
        }).map(function (a) {
          return [a, perArg[a].ok + " / " + perArg[a].tot, cellaPct(perArg[a].ok, perArg[a].tot)];
        }))
      ])
    ];

    if (sbagliate.length) {
      nodi.push(el("section", { class: "card" }, [el("h2", { text: "Domande sbagliate" })].concat(sbagliate.map(function (x) {
        var giusta = x.voce.opzioni.filter(function (o) { return o.giusta; })[0];
        return el("div", { class: "sbagliata-item" }, [
          el("p", null, [el("strong", { text: x.voce.d.domanda })]),
          el("p", { class: "esito ko small", text: "Tua risposta: " + x.scelta.testo }),
          el("p", { class: "esito ok small", text: "Corretta: " + giusta.testo }),
          el("p", { text: x.voce.d.spiegazione }),
          el("p", { class: "riferimento", text: "Riferimento: " + x.voce.d.riferimento })
        ]);
      }))));
    }

    mostra(nodi);
  }

  /* ---------- Punti deboli ---------- */

  function schermataPuntiDeboli() {
    var perArg = {};
    var tentativi = 0;
    Object.keys(stats.q).forEach(function (id) {
      var s = stats.q[id];
      if (!s || !s.t) return;
      var k = (s.cap !== undefined ? s.cap : "?") + "|" + (s.arg || "Senza argomento");
      perArg[k] = perArg[k] || { cap: s.cap, arg: s.arg || "Senza argomento", ok: 0, tot: 0, domande: 0 };
      perArg[k].tot += s.t;
      perArg[k].ok += s.t - s.e;
      perArg[k].domande += 1;
      tentativi += s.t;
    });
    var righe = Object.keys(perArg).map(function (k) { return perArg[k]; }).sort(function (a, b) {
      return pct(a.ok, a.tot) - pct(b.ok, b.tot) || b.tot - a.tot;
    });

    var nodi = [el("h1", { text: "I miei punti deboli" })];
    if (!archivioDisponibile) nodi.push(el("div", { class: "avviso", text: "Il salvataggio nel browser non è disponibile: le statistiche valgono solo per questa sessione." }));
    if (!righe.length) {
      nodi.push(el("p", { class: "muted", text: "Non ci sono ancora statistiche: rispondi a qualche domanda e torna qui." }));
    } else {
      nodi.push(el("p", { class: "muted", text: "Argomenti ordinati dalla percentuale di risposte corrette più bassa. Totale risposte registrate: " + tentativi + "." }));
      nodi.push(el("section", { class: "card" }, [tabella(["Argomento", "Risposte", "% corrette"], righe.map(function (x) {
        return [
          el("span", null, [el("strong", { text: x.arg }), el("br"), el("span", { class: "muted small", text: titoloCapitolo(x.cap) })]),
          String(x.tot),
          cellaPct(x.ok, x.tot)
        ];
      }))]));
    }
    nodi.push(el("div", { class: "azioni" }, [el("button", { type: "button", class: "btn", onclick: schermataIniziale }, ["Torna all'inizio"])]));
    mostra(nodi);
  }

  /* ---------- Punti ad alto rischio ---------- */

  function schermataAltoRischio() {
    mostra([el("p", { class: "muted", text: "Caricamento…" })]);
    caricaCapitoli(manifest.capitoli).then(function (dati) {
      var nodi = [
        el("h1", { text: "Punti ad alto rischio" }),
        el("p", { class: "muted", text: "Concetti facili da confondere, capitolo per capitolo." })
      ];
      dati.forEach(function (d) {
        nodi.push(el("details", { class: "card" }, [
          el("summary", { text: "Cap. " + d.capitolo + " — " + d.titolo }),
          el("ul", { class: "lista-rischio" }, (d.punti_alto_rischio || []).map(function (p) { return el("li", { text: p }); }))
        ]));
      });
      if (!dati.length) nodi.push(el("p", { class: "muted", text: "Nessun capitolo disponibile." }));
      nodi.push(el("div", { class: "azioni" }, [el("button", { type: "button", class: "btn", onclick: schermataIniziale }, ["Torna all'inizio"])]));
      mostra(nodi);
    }).catch(erroreCaricamento);
  }

  /* ---------- Avvio ---------- */

  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
    if (tastiAttivi) tastiAttivi(e);
  });

  document.getElementById("home-link").addEventListener("click", function () {
    if (manifest) schermataIniziale();
  });

  caricaManifest().then(schermataIniziale).catch(erroreCaricamento);
})();
