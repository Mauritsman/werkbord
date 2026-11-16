/* CCB-pagina: taal, persoonlijke link (?l= ?c= ?n=), plaatshouders voor foto's en het scrollverhaal.
   Animaties: enkel transform en opacity (GSAP + ScrollTrigger, lokaal meegeleverd).
   Deze pagina bewaart niets op het toestel van de bezoeker: geen cookies, geen trackers. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  /* de hero vult het scherm onder de testbalk en de kopbalk */
  function boven() {
    var t = d.querySelector(".testbalk"), k = d.querySelector(".kop");
    root.style.setProperty("--boven", ((t ? t.offsetHeight : 0) + (k ? k.offsetHeight : 0)) + "px");
  }
  boven();
  window.addEventListener("resize", boven, { passive: true });

  var T = window.CCB_T || {}, V = window.CCB_VAST || {};
  var TALEN = ["en", "fr", "de", "it", "nl"];
  var MAIL = "sales@geysenccb.be";
  var qs = new URLSearchParams(location.search);

  /* persoonlijke code: niet zichtbaar op de pagina, enkel in het onderwerp van de e-mail */
  var code = (qs.get("c") || "").replace(/[^a-z0-9]/gi, "").slice(0, 16);
  /* bedrijfsnaam: enkel in de tekst van de e-mail die de bezoeker zelf verstuurt */
  var naam = (qs.get("n") || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 120);
  /* "Voor <bedrijf>" bovenaan enkel als de pagina uit het (ontgrendelde) systeem geopend werd,
     zoals in info.html: zo kan niemand via een link eigen tekst op een Geysen-pagina zetten. */
  var uitSysteem = (function () {
    try { var t = +localStorage.getItem("ccb-systeem-open"); return !!t && Date.now() - t < 12 * 3600e3; }
    catch (e) { return false; }
  })();

  function kiesTaal() {
    var l = (qs.get("l") || "").toLowerCase();
    if (TALEN.indexOf(l) > -1) return l;
    var lijst = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < lijst.length; i++) {
      var k = String(lijst[i] || "").slice(0, 2).toLowerCase();
      if (TALEN.indexOf(k) > -1) return k;
    }
    return "en";
  }

  /* Engels uit de HTML bewaren, zodat we terug kunnen schakelen */
  var EN = { t: {}, a: {}, l: {} };
  d.querySelectorAll("[data-t]").forEach(function (e) { EN.t[e.dataset.t] = e.textContent; });
  d.querySelectorAll("[data-ta]").forEach(function (e) { EN.a[e.dataset.ta] = e.alt; });
  d.querySelectorAll("[data-tl]").forEach(function (e) { EN.l[e.dataset.tl] = e.getAttribute("aria-label"); });

  function landNaam(l, cc) {
    try { return new Intl.DisplayNames([V.locale[l] || l], { type: "region" }).of(cc); } catch (e) { return null; }
  }

  function zet(l) {
    var L = T[l] || {};
    var pak = function (k, bron) { return (l !== "en" && L[k]) || bron[k]; };
    root.lang = l;
    d.querySelectorAll("[data-t]").forEach(function (e) { var v = pak(e.dataset.t, EN.t); if (v) e.textContent = v; });
    d.querySelectorAll("[data-ta]").forEach(function (e) { var v = pak(e.dataset.ta, EN.a); if (v) e.alt = v; });
    d.querySelectorAll("[data-tl]").forEach(function (e) { var v = pak(e.dataset.tl, EN.l); if (v) e.setAttribute("aria-label", v); });
    d.title = (V.titel && V.titel[l]) || d.title;
    var g = d.getElementById("taalgroep");
    if (g && V.taalgroep) g.setAttribute("aria-label", V.taalgroep[l]);
    d.querySelectorAll("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === l)); });

    /* landnamen en datums in de taal van de pagina */
    d.querySelectorAll("[data-land]").forEach(function (e) { var n = landNaam(l, e.dataset.land); if (n) e.textContent = n; });
    var lijst = d.getElementById("landen");
    if (lijst) {
      var items = Array.prototype.slice.call(lijst.children);
      items.sort(function (a, b) {
        if (a.hasAttribute("data-laatst")) return 1;
        if (b.hasAttribute("data-laatst")) return -1;
        return a.textContent.localeCompare(b.textContent, V.locale[l]);
      }).forEach(function (li) { lijst.appendChild(li); });
    }
    try {
      var fmt = new Intl.DateTimeFormat(V.locale[l] || "en-GB", { day: "numeric", month: "long", year: "numeric" });
      d.querySelectorAll("[data-datum]").forEach(function (e) { e.textContent = fmt.format(new Date(e.dataset.datum + "T12:00:00")); });
    } catch (e) {}

    /* e-mailknoppen: onderwerp in de taal + referentie, bedrijfsnaam in de tekst */
    d.querySelectorAll("[data-mail]").forEach(function (a) {
      var o = V.onderwerp && V.onderwerp[a.dataset.mail];
      var onderwerp = (o ? (o[l] || o.en) : "CCB") + (code ? " · ref. CCB-" + code : "");
      var href = "mailto:" + MAIL + "?subject=" + encodeURIComponent(onderwerp);
      if (naam) href += "&body=" + encodeURIComponent((V.bedrijf[l] || V.bedrijf.en) + ": " + naam + "\n\n");
      a.href = href;
    });

    var v = d.getElementById("voor");
    if (v && naam && uitSysteem) { v.hidden = false; v.textContent = (V.voor[l] || V.voor.en) + naam; }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  d.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      zet(b.dataset.lang);
      try { var u = new URL(location.href); u.searchParams.set("l", b.dataset.lang); history.replaceState(null, "", u); } catch (e) {}
    });
  });
  zet(kiesTaal());

  /* foto ontbreekt? Toon een duidelijke plaatshouder. Een foto toevoegen = het bestand met die naam in assets/fotos/ zetten. */
  d.querySelectorAll("img[data-plaatshouder]").forEach(function (img) {
    function vervang() {
      var box = d.createElement("div");
      box.className = "plaatshouder";
      box.textContent = img.dataset.plaatshouder;
      img.replaceWith(box);
    }
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) vervang();
    else img.addEventListener("error", vervang, { once: true });
  });

  /* ---------- scrollverhaal: tekening per stap ---------- */
  var rmQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var G = window.gsap, ST = window.ScrollTrigger;
  var svg = d.querySelector(".tekening svg");
  var stappen = Array.prototype.slice.call(d.querySelectorAll(".stap"));
  var legendes = Array.prototype.slice.call(d.querySelectorAll(".legende"));
  var open = svg && svg.querySelector(".laag-open");
  var dicht = svg && svg.querySelector(".laag-dicht");
  var markeringen = svg ? Array.prototype.slice.call(svg.querySelectorAll(".hl")) : [];
  var ballonnen = svg ? Array.prototype.slice.call(svg.querySelectorAll(".ballon")) : [];
  var deeltjes = svg ? Array.prototype.slice.call(svg.querySelectorAll(".deeltjes rect")) : [];
  var huidig = -1, dichtZichtbaar = false, val = [];

  function zicht(el, aan, duur, extra) {
    if (!el) return;
    if (G) {
      var vars = { autoAlpha: aan ? 1 : 0, duration: duur, ease: "power2.out", overwrite: "auto" };
      if (extra) for (var k in extra) vars[k] = extra[k];
      G.to(el, vars);
    } else {
      el.style.opacity = aan ? "1" : "0";
      el.style.visibility = aan ? "visible" : "hidden";
    }
  }

  function zetStaat(n) {
    if (n === huidig) return;
    huidig = n;
    var rm = rmQ.matches, duur = rm ? 0 : 0.45;
    zicht(open, n === 0, duur);
    if (n >= 1 && !dichtZichtbaar) {
      dichtZichtbaar = true;
      if (G && !rm) G.fromTo(dicht, { autoAlpha: 0, y: -22 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out", overwrite: "auto" });
      else zicht(dicht, true, 0);
    } else if (n === 0 && dichtZichtbaar) {
      dichtZichtbaar = false;
      zicht(dicht, false, duur, rm ? null : { y: -22 });
    }
    markeringen.forEach(function (h) { zicht(h, +h.dataset.s === n, duur); });
    ballonnen.forEach(function (b) {
      var aan = +b.dataset.s === n;
      zicht(b, aan, aan ? duur : duur * 0.6, rm || !G ? null : { x: aan ? 0 : 6 });
    });
    legendes.forEach(function (lg) { lg.classList.toggle("is-actief", +lg.dataset.s === n); });
    stappen.forEach(function (s, i) { s.classList.toggle("is-actief", i === n); });
    val.forEach(function (tw) { if (n === 0 && !rmQ.matches) tw.restart(true); else tw.pause(); });
  }

  if (svg && stappen.length) {
    /* beginstand: alles van de CCB verborgen, open band zichtbaar */
    [dicht].concat(markeringen, ballonnen).forEach(function (el) {
      if (G) G.set(el, { autoAlpha: 0 }); else { el.style.opacity = "0"; el.style.visibility = "hidden"; }
    });
    if (G && !rmQ.matches) {
      /* gemorst materiaal valt langs de randen (enkel in de stap "open band") */
      deeltjes.forEach(function (r, i) {
        val.push(G.fromTo(r, { y: -34, opacity: 0 }, {
          keyframes: [{ opacity: 1, duration: 0.25 }, { y: 30, duration: 1.3, ease: "power1.in" }, { opacity: 0, duration: 0.25 }],
          repeat: 2, delay: (i % 5) * 0.32 + (i > 4 ? 0.16 : 0), paused: true
        }));
      });
    }
    zetStaat(0);

    if (G && ST) {
      stappen.forEach(function (s, i) {
        ST.create({ trigger: s, start: "top 62%", end: "bottom 62%", onToggle: function (self) { if (self.isActive) zetStaat(i); } });
      });
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) zetStaat(stappen.indexOf(e.target)); });
      }, { rootMargin: "-38% 0px -38% 0px" });
      stappen.forEach(function (s) { io.observe(s); });
    }
  }

  if (!G || !ST) return;
  G.registerPlugin(ST);

  var mm = G.matchMedia();
  /* openingsmoment van de hero: één keer, bij het laden */
  mm.add("(prefers-reduced-motion: no-preference)", function () {
    G.timeline({ defaults: { ease: "expo.out", duration: 1.1 } })
      .from(".held h1", { y: 26, autoAlpha: 0 })
      .from(".held .lead", { y: 18, autoAlpha: 0 }, "-=0.9")
      .from(".held .acties", { y: 14, autoAlpha: 0 }, "-=0.9")
      .from(".held__hoofd", { x: 48, autoAlpha: 0, duration: 1.4 }, 0.1)
      .from(".held__detail", { y: 36, autoAlpha: 0, duration: 1.3 }, 0.45)
      .from(".held__voet", { autoAlpha: 0, duration: 1 }, 0.7);
  });
  /* fotostrook: op breed scherm schuift de rij zacht naar links terwijl je voorbij scrolt (enkel transform) */
  mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", function () {
    var rij = d.querySelector(".strook__rij");
    if (!rij) return;
    G.fromTo(rij, { x: 0 }, { x: function () { return -Math.max(0, rij.scrollWidth - window.innerWidth); }, ease: "none",
      scrollTrigger: { trigger: ".strook", start: "top bottom", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true } });
  });
  /* het traject van de licentie loopt mee met het scrollen, zoals een band */
  mm.add({
    breed: "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
    smal: "(max-width: 900px) and (prefers-reduced-motion: no-preference)"
  }, function (ctx) {
    var breed = ctx.conditions.breed;
    G.fromTo(".route__lijn", breed ? { scaleX: 0 } : { scaleY: 0 }, {
      scaleX: 1, scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".route__baan", start: "top 85%", end: breed ? "bottom 60%" : "bottom 70%", scrub: 0.6 }
    });
  });

  /* actieve sectie in de navigatie */
  d.querySelectorAll(".nav a").forEach(function (a) {
    var doel = d.querySelector(a.getAttribute("href"));
    if (!doel) return;
    ST.create({
      trigger: doel, start: "top 40%", end: "bottom 40%",
      onToggle: function (self) { if (self.isActive) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }
    });
  });

  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ST.refresh(); });
  window.addEventListener("load", function () { ST.refresh(); });
})();
