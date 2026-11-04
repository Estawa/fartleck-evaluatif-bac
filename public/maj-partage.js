/*
 * Mise \u00e0 jour + partage de l'appli \u2014 module commun aux applis de C. Guilhem.
 *
 * - Pr\u00e9vient quand une nouvelle version est en ligne (bandeau \u00ab Mettre \u00e0 jour \u00bb).
 * - Petit bouton \ud83d\udcf2 sur le bord de l'\u00e9cran (d\u00e9pla\u00e7able) : QR code, WhatsApp,
 *   partage, copie du lien, recherche de mise \u00e0 jour.
 * - Ne touche \u00e0 aucune donn\u00e9e de l'appli (rien n'est effac\u00e9 lors d'une mise \u00e0 jour).
 *
 * Utilisation : <script src="/maj-partage.js" defer></script>
 * Les applis peuvent aussi appeler window.majPartage.ouvrir() ou .verifier().
 */
(function () {
  "use strict";
  if (window.majPartage) return;

  var script = document.currentScript;
  var SOURCE = script && script.src ? script.src : location.href;
  var RACINE = new URL(".", SOURCE).href;          // adresse de l'appli
  var QR_JS = new URL("maj-partage-qr.js", SOURCE).href;
  var CLE = "majPartage:" + RACINE;
  var avaitUnServiceWorker = !!(navigator.serviceWorker && navigator.serviceWorker.controller);

  var nomAppli = (document.title || "l'appli").trim();
  var nouvelle = false;
  var derniereVerif = 0;
  var masqueJusqua = 0;
  var hote, ombre, bandeau, onglet, panneau, etatTexte;

  function lire(k, d) { try { var v = localStorage.getItem(CLE + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function ecrire(k, v) { try { localStorage.setItem(CLE + k, JSON.stringify(v)); } catch (e) {} }

  // ------------------------------------------------------------------
  // nom de l'appli (manifeste)
  // ------------------------------------------------------------------
  function lireManifeste() {
    var l = document.querySelector('link[rel="manifest"]');
    if (!l || !l.href) return;
    fetch(l.href, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (m && (m.name || m.short_name)) nomAppli = m.name || m.short_name;
      majTitre();
    }).catch(function () {});
  }

  // ------------------------------------------------------------------
  // d\u00e9tection d'une nouvelle version
  // ------------------------------------------------------------------
  function fichiersDe(doc, base) {
    var res = [];
    var els = doc.querySelectorAll('script[src], link[rel="stylesheet"][href]');
    for (var i = 0; i < els.length; i++) {
      var a = els[i].getAttribute("src") || els[i].getAttribute("href");
      if (!a) continue;
      try {
        var u = new URL(a, base);
        if (u.origin !== location.origin) continue;
        if (/maj-partage/.test(u.pathname)) continue;
        res.push(u.origin + u.pathname);
      } catch (e) {}
    }
    return res;
  }

  function comparerPage() {
    return fetch(RACINE + (RACINE.indexOf("?") < 0 ? "?" : "&") + "maj=" + Date.now(), { cache: "no-store", credentials: "same-origin" })
      .then(function (r) {
        var type = r.headers.get("content-type") || "";
        if (!r.ok || type.indexOf("html") < 0) return false;
        return r.text().then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var enLigne = fichiersDe(doc, r.url || RACINE);
          if (!enLigne.length) return false;
          var ici = fichiersDe(document, location.href);
          for (var i = 0; i < enLigne.length; i++) if (ici.indexOf(enLigne[i]) < 0) return true;
          return false;
        });
      }).catch(function () { return false; });
  }

  function verifierServiceWorker() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return Promise.resolve(false);
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.update().catch(function () {}); })).then(function () {
        return regs.some(function (r) { return !!r.waiting; });
      });
    }).catch(function () { return false; });
  }

  function verifier(manuel) {
    if (!navigator.onLine) { if (manuel) etat("Pas de connexion internet pour v\u00e9rifier."); return Promise.resolve(false); }
    derniereVerif = Date.now();
    if (manuel) etat("Recherche d'une mise \u00e0 jour\u2026");
    return Promise.all([comparerPage(), verifierServiceWorker()]).then(function (r) {
      if (r[0] || r[1]) signalerNouvelle();
      else if (manuel) etat(nouvelle ? "Une nouvelle version est disponible." : "\u2713 Tu as la derni\u00e8re version (v\u00e9rifi\u00e9 \u00e0 " + heure() + ").");
      return nouvelle;
    });
  }

  function heure() { var d = new Date(); return d.getHours() + "h" + String(d.getMinutes()).padStart(2, "0"); }

  function signalerNouvelle() {
    nouvelle = true;
    etat("\ud83d\udd04 Une nouvelle version est disponible.");
    if (onglet) onglet.classList.add("nouveau");
    majBoutonVerif();
    if (Date.now() < masqueJusqua) return;
    construire();
    bandeau.classList.add("visible");
  }

  function mettreAJour(bouton) {
    if (bouton) { bouton.textContent = "Mise \u00e0 jour\u2026"; bouton.disabled = true; }
    var fini = false;
    function recharger() { if (fini) return; fini = true; location.reload(); }
    setTimeout(recharger, 4000);
    if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return recharger();
    navigator.serviceWorker.addEventListener("controllerchange", recharger);
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.update().catch(function () {}); })).then(function () {
        var attente = regs.filter(function (r) { return r.waiting || r.installing; });
        if (!attente.length) return recharger();
        attente.forEach(function (r) {
          var sw = r.waiting || r.installing;
          try { sw.postMessage({ type: "SKIP_WAITING" }); sw.postMessage("skipWaiting"); } catch (e) {}
        });
      });
    }).catch(recharger);
  }

  // ------------------------------------------------------------------
  // interface (dans une \u00ab ombre \u00bb pour ne pas se m\u00e9langer au style de l'appli)
  // ------------------------------------------------------------------
  var STYLE = [
    ":host{all:initial}",
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
    ".bandeau{position:fixed;left:50%;width:max-content;top:calc(10px + env(safe-area-inset-top,0px));transform:translate(-50%,-160%);transition:transform .35s ease;",
    "z-index:2147483646;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 24px);padding:10px 10px 10px 16px;border-radius:14px;",
    "background:#1f2937;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.35);font-size:15px;line-height:1.3}",
    ".bandeau.visible{transform:translate(-50%,0)}",
    ".bandeau b{font-weight:600}",
    ".bandeau span{flex:1;min-width:0}",
    "button{font:inherit;cursor:pointer;border:0;border-radius:10px;padding:9px 14px;font-size:15px;font-weight:600}",
    ".principal{background:#2563eb;color:#fff}",
    ".discret{background:transparent;color:inherit;opacity:.75;padding:9px 10px}",
    ".onglet{position:fixed;z-index:2147483645;width:34px;height:44px;display:flex;align-items:center;justify-content:center;font-size:20px;",
    "background:rgba(31,41,55,.55);color:#fff;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;",
    "box-shadow:0 2px 8px rgba(0,0,0,.2);transition:background .2s}",
    ".onglet.droite{right:0;border-radius:12px 0 0 12px}",
    ".onglet.gauche{left:0;border-radius:0 12px 12px 0}",
    ".onglet:hover{background:rgba(31,41,55,.85)}",
    ".onglet.nouveau::after{content:'';position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 2px #fff}",
    ".voile{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px}",
    ".voile.ouvert{display:flex}",
    ".carte{width:100%;max-width:360px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#111827;border-radius:18px;padding:18px;",
    "box-shadow:0 12px 40px rgba(0,0,0,.35);text-align:center}",
    "h2{margin:0 0 4px;font-size:18px}",
    ".petit{font-size:13px;color:#6b7280;margin:0 0 12px}",
    ".lien{word-break:break-all}",
    ".qr{width:220px;height:220px;margin:4px auto 8px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:10px}",
    ".qr svg{width:100%;height:100%}",
    ".boutons{display:grid;gap:8px;margin-top:10px}",
    ".boutons button{width:100%;padding:12px}",
    ".whatsapp{background:#25d366;color:#fff}",
    ".gris{background:#f3f4f6;color:#111827}",
    ".etat{font-size:13px;color:#374151;margin:12px 0 4px;min-height:1em}",
    "hr{border:0;border-top:1px solid #e5e7eb;margin:14px 0 4px}",
    "@media (prefers-color-scheme:dark){.carte{background:#1f2937;color:#f9fafb}.petit{color:#9ca3af}.gris{background:#374151;color:#f9fafb}.etat{color:#d1d5db}hr{border-top-color:#374151}}",
  ].join("");

  function el(tag, cls, texte) { var e = document.createElement(tag); if (cls) e.className = cls; if (texte != null) e.textContent = texte; return e; }

  function construire() {
    if (hote) return;
    hote = document.createElement("div");
    hote.id = "maj-partage";
    hote.setAttribute("data-html2canvas-ignore", "");
    ombre = hote.attachShadow ? hote.attachShadow({ mode: "open" }) : hote;
    var st = document.createElement("style"); st.textContent = STYLE; ombre.appendChild(st);

    // bandeau de mise \u00e0 jour
    bandeau = el("div", "bandeau");
    bandeau.setAttribute("role", "status");
    var t = el("span"); t.appendChild(el("b", null, "\ud83d\udd04 Nouvelle version disponible"));
    var maj = el("button", "principal", "Mettre \u00e0 jour");
    maj.onclick = function () { mettreAJour(maj); };
    var plusTard = el("button", "discret", "\u2715");
    plusTard.title = "Plus tard";
    plusTard.onclick = function () { bandeau.classList.remove("visible"); masqueJusqua = Date.now() + 3600000; };
    bandeau.appendChild(t); bandeau.appendChild(maj); bandeau.appendChild(plusTard);
    ombre.appendChild(bandeau);

    // petit onglet \ud83d\udcf2
    onglet = el("div", "onglet", "\ud83d\udcf2");
    onglet.title = "Partager l'appli / mise \u00e0 jour";
    onglet.setAttribute("role", "button");
    onglet.setAttribute("aria-label", "Partager l'appli et v\u00e9rifier les mises \u00e0 jour");
    placerOnglet(lire("cote", "droite"), lire("hauteur", 0.62));
    glisser(onglet);
    ombre.appendChild(onglet);

    // panneau
    panneau = el("div", "voile");
    panneau.onclick = function (e) { if (e.target === panneau) fermer(); };
    var carte = el("div", "carte");
    carte.appendChild(el("h2", "titre", ""));
    carte.appendChild(el("p", "petit lien", RACINE));
    var qr = el("div", "qr"); qr.textContent = "\u2026"; carte.appendChild(qr);
    carte.appendChild(el("p", "petit", "Scanne ce QR code avec l'appareil photo du t\u00e9l\u00e9phone pour ouvrir l'appli."));
    var b = el("div", "boutons");
    var wa = el("button", "whatsapp", "Envoyer par WhatsApp");
    wa.onclick = function () { window.open("https://wa.me/?text=" + encodeURIComponent(message()), "_blank", "noopener"); };
    b.appendChild(wa);
    if (navigator.share) {
      var pa = el("button", "gris", "Partager\u2026 (SMS, e-mail\u2026)");
      pa.onclick = function () { navigator.share({ title: nomAppli, text: message(), url: RACINE }).catch(function () {}); };
      b.appendChild(pa);
    }
    var co = el("button", "gris", "Copier le lien");
    co.onclick = function () { copier(RACINE, co); };
    b.appendChild(co);
    carte.appendChild(b);
    carte.appendChild(el("hr"));
    etatTexte = el("p", "etat", "");
    carte.appendChild(etatTexte);
    var bv = el("div", "boutons");
    var ve = el("button", "gris verif", "\ud83d\udd04 Rechercher une mise \u00e0 jour");
    ve.onclick = function () { verifier(true).then(majBoutonVerif); };
    bv.appendChild(ve);
    var fe = el("button", "discret", "Fermer");
    fe.onclick = fermer;
    bv.appendChild(fe);
    carte.appendChild(bv);
    panneau.appendChild(carte);
    ombre.appendChild(panneau);

    (document.body || document.documentElement).appendChild(hote);
    majTitre();
    if (nouvelle) onglet.classList.add("nouveau");
  }

  function majBoutonVerif() {
    var ve = ombre && ombre.querySelector(".verif");
    if (!ve || !nouvelle) return;
    ve.textContent = "Mettre \u00e0 jour maintenant"; ve.className = "principal verif";
    ve.onclick = function () { mettreAJour(ve); };
  }

  function majTitre() {
    if (!ombre) return;
    var t = ombre.querySelector(".titre");
    if (t) t.textContent = "Partager \u00ab " + nomAppli + " \u00bb";
  }

  function message() { return nomAppli + " \u2014 ouvre ce lien pour utiliser l'appli : " + RACINE; }

  function etat(t) { if (etatTexte) etatTexte.textContent = t; }

  function copier(texte, bouton) {
    var ok = function () { var a = bouton.textContent; bouton.textContent = "\u2713 Lien copi\u00e9"; setTimeout(function () { bouton.textContent = a; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(ok, function () { ancienneCopie(texte); ok(); });
    else { ancienneCopie(texte); ok(); }
  }
  function ancienneCopie(texte) {
    var z = document.createElement("textarea"); z.value = texte; z.style.position = "fixed"; z.style.opacity = "0";
    document.body.appendChild(z); z.select(); try { document.execCommand("copy"); } catch (e) {} z.remove();
  }

  function ouvrir() {
    construire();
    panneau.classList.add("ouvert");
    etat(nouvelle ? "\ud83d\udd04 Une nouvelle version est disponible." : (derniereVerif ? "\u2713 Derni\u00e8re v\u00e9rification \u00e0 " + heure() + "." : ""));
    dessinerQr();
  }
  function fermer() { if (panneau) panneau.classList.remove("ouvert"); }

  var qrPromesse = null;
  function chargerQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (!qrPromesse) qrPromesse = new Promise(function (ok, ko) {
      var s = document.createElement("script"); s.src = QR_JS; s.async = true;
      s.onload = function () { window.qrcode ? ok(window.qrcode) : ko(); };
      s.onerror = ko;
      document.head.appendChild(s);
    });
    return qrPromesse;
  }
  function dessinerQr() {
    var boite = ombre.querySelector(".qr");
    if (boite.getAttribute("data-fait")) return;
    chargerQr().then(function (qrcode) {
      var q = qrcode(0, "M"); q.addData(RACINE); q.make();
      boite.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      boite.setAttribute("data-fait", "1");
    }).catch(function () { boite.textContent = "QR code indisponible hors connexion"; boite.style.fontSize = "13px"; });
  }

  // ------------------------------------------------------------------
  // onglet d\u00e9pla\u00e7able (glisser = d\u00e9placer, toucher = ouvrir)
  // ------------------------------------------------------------------
  function placerOnglet(cote, h) {
    onglet.classList.remove("droite", "gauche");
    onglet.classList.add(cote === "gauche" ? "gauche" : "droite");
    var y = Math.max(8, Math.min(window.innerHeight - 52, h * window.innerHeight));
    onglet.style.top = y + "px";
    onglet._cote = cote; onglet._h = h;
  }
  function glisser(o) {
    var depart = null, bouge = false;
    o.addEventListener("pointerdown", function (e) {
      depart = { x: e.clientX, y: e.clientY }; bouge = false;
      try { o.setPointerCapture(e.pointerId); } catch (x) {}
    });
    o.addEventListener("pointermove", function (e) {
      if (!depart) return;
      if (!bouge && Math.abs(e.clientY - depart.y) + Math.abs(e.clientX - depart.x) < 8) return;
      bouge = true;
      var cote = e.clientX < window.innerWidth / 2 ? "gauche" : "droite";
      placerOnglet(cote, (e.clientY - 22) / window.innerHeight);
    });
    function fin() {
      if (!depart) return;
      depart = null;
      if (bouge) { ecrire("cote", o._cote); ecrire("hauteur", o._h); }
      else ouvrir();
    }
    o.addEventListener("pointerup", fin);
    o.addEventListener("pointercancel", function () { depart = null; });
    o.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") ouvrir(); });
    o.tabIndex = 0;
    window.addEventListener("resize", function () { placerOnglet(o._cote, o._h); });
  }

  // ------------------------------------------------------------------
  // d\u00e9marrage
  // ------------------------------------------------------------------
  function demarrer() {
    construire();
    lireManifeste();
    setTimeout(function () { verifier(false); }, 4000);
    setInterval(function () { if (document.visibilityState === "visible") verifier(false); }, 30 * 60000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && Date.now() - derniereVerif > 5 * 60000) verifier(false);
    });
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener("controllerchange", function () {
      // un nouveau service worker a pris la main : l'appli affich\u00e9e est l'ancienne
      if (avaitUnServiceWorker) signalerNouvelle();
      avaitUnServiceWorker = true;
    });
  }

  window.majPartage = { ouvrir: ouvrir, verifier: function () { return verifier(true); }, mettreAJour: function () { mettreAJour(null); } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})();
