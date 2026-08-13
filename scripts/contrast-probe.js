/**
 * contrast-probe — paste into the browser console (or inject via the Browser pane) on any screen.
 *
 * This is the only automated check that detects the light-mode inversion. "bg-white/5 is now
 * invisible on a light plane" IS a contrast failure, so a real compositing contrast walk catches it
 * where a screenshot diff cannot.
 *
 * Reports three classes of problem:
 *   TEXT      — text/background below WCAG 1.4.3 (4.5:1 normal, 3:1 large)
 *   UI        — borders/controls below WCAG 1.4.11 (3:1)
 *   VANISHED  — a surface whose composited fill is within 1.5% of its parent's, i.e. a fill that is
 *               doing no demarcation at all (SDL law 4). This is the inversion signature.
 *
 * Usage:  __contrastProbe()            → summary + worst 25
 *         __contrastProbe({all:true})  → every finding
 */
(function () {
  const parseRGB = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ({ r, g, b }) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const dist = (a, b) => Math.abs(lum(a) - lum(b));

  /** Composite an element's effective background by walking ancestors until opaque. */
  function effectiveBg(el) {
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = parseRGB(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) { stack.push(bg); if (bg.a === 1) break; }
      n = n.parentElement;
    }
    const root = parseRGB(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    let acc = root.a === 1 ? root : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc);
    return acc;
  }

  function hasOwnText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true;
    return false;
  }

  window.__contrastProbe = function (opts = {}) {
    const findings = [];
    const els = document.querySelectorAll('body *');
    for (const el of els) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;

      const label = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;
      const bg = effectiveBg(el);

      // TEXT
      if (hasOwnText(el)) {
        const fg = parseRGB(cs.color);
        if (fg) {
          const composited = fg.a < 1 ? over(fg, bg) : fg;
          const r = ratio(composited, bg);
          const size = parseFloat(cs.fontSize);
          const bold = parseInt(cs.fontWeight, 10) >= 700;
          const large = size >= 24 || (size >= 18.66 && bold);
          const need = large ? 3 : 4.5;
          if (r < need) findings.push({ type: 'TEXT', ratio: +r.toFixed(2), need, label, text: el.textContent.trim().slice(0, 40), el });
        }
      }

      // UI — visible borders
      const bw = parseFloat(cs.borderTopWidth);
      if (bw > 0) {
        const bc = parseRGB(cs.borderTopColor);
        if (bc && bc.a > 0.02) {
          const r = ratio(over(bc, bg), bg);
          if (r < 3) findings.push({ type: 'UI', ratio: +r.toFixed(2), need: 3, label, text: 'border', el });
        }
      }

      // VANISHED — a fill that does no demarcation against what it sits on
      const own = parseRGB(cs.backgroundColor);
      if (own && own.a > 0 && own.a < 1) {
        const parentBg = el.parentElement ? effectiveBg(el.parentElement) : bg;
        const composited = over(own, parentBg);
        if (dist(composited, parentBg) < 0.015 && rect.width > 40 && rect.height > 20) {
          findings.push({ type: 'VANISHED', ratio: +(dist(composited, parentBg) * 100).toFixed(2), need: 1.5, label, text: 'fill ≈ parent', el });
        }
      }
    }

    const by = (t) => findings.filter((f) => f.type === t);
    const mode = document.documentElement.getAttribute('data-mode') || '(unset)';
    const cw = document.documentElement.getAttribute('data-colorway') || '(unset)';
    console.log(`%ccontrast-probe  colorway=${cw}  mode=${mode}  scanned=${els.length}`, 'font-weight:bold');
    console.log(`  TEXT failures     ${by('TEXT').length}`);
    console.log(`  UI failures       ${by('UI').length}`);
    console.log(`  VANISHED surfaces ${by('VANISHED').length}`);
    const worst = findings.sort((a, b) => a.ratio - b.ratio).slice(0, opts.all ? findings.length : 25);
    if (worst.length) console.table(worst.map(({ el, ...r }) => r));
    return { colorway: cw, mode, total: findings.length, text: by('TEXT').length, ui: by('UI').length, vanished: by('VANISHED').length, findings };
  };

  return '__contrastProbe() ready';
})();
