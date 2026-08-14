import React, { useMemo, useRef } from 'react';
import { Upload, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { ColorwayCard } from '../sdl/Specimens';
import { colorwaysByTheme, resolveColorway, COLORWAYS } from '../../theme/registry';
import { ICON_THEMES, iconAudit } from '../../theme/icons';
import { WALLPAPERS, isCustomWallpaper, resolveWallpaper } from '../../theme/wallpapers';
import { APPS } from '../../config/apps';
import AppIcon from '../common/AppIcon';

/**
 * Appearance — the single pane for how Lumina OS looks.
 *
 * There used to be two: "Appearance" (colorway, density, icons, motion) and "Desktop" (wallpaper,
 * accent swatches, brightness, transparency, reset). They overlapped on wallpaper AND on
 * transparency, so the same switch existed twice with two different visual grammars, and the older
 * pane still offered the four pre-SDL accent swatches — a control that sixteen colorways had made
 * meaningless. One pane, one grammar, each control exactly once.
 */

const Card = ({ title, sub, children, right }) => (
  <section
    className="mb-6"
    style={{
      background: 'var(--sdl-glass-bg)', border: '1px solid var(--sdl-glass-border)',
      borderRadius: 'var(--sdl-radius-lg)', padding: 16,
    }}
  >
    <div className="flex items-start justify-between gap-4 mb-3">
      <div>
        <h3 style={{ color: 'var(--sdl-ink)', fontSize: 15, fontWeight: 650 }}>{title}</h3>
        {sub && <p className="text-[12px] mt-0.5" style={{ color: 'var(--sdl-sec)' }}>{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

/** Accessible segmented control. role=radiogroup + roving selection, unlike the bare divs before. */
const Segmented = ({ label, value, options, onChange }) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = value === o.id;
      return (
        <button
          key={o.id}
          role="radio"
          aria-checked={on}
          type="button"
          onClick={() => onChange(o.id)}
          className="text-[12px] px-3 rounded-full transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
          style={{
            height: 'var(--sdl-control-h, 36px)',
            background: on ? 'var(--sdl-soft)' : 'var(--sdl-sunken)',
            color: on ? 'var(--sdl-aink)' : 'var(--sdl-sec)',
            fontWeight: 600,
            boxShadow: on ? 'var(--sdl-hairline)' : 'none',
          }}
        >
          {o.name}
        </button>
      );
    })}
  </div>
);

const Switch = ({ label, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="w-12 h-6 rounded-full p-1 shrink-0 transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
    style={{ background: checked ? 'var(--sdl-accent)' : 'var(--sdl-sunken)' }}
  >
    <span
      className="block w-4 h-4 rounded-full transition-transform duration-hover ease-sdl"
      style={{ background: 'var(--sdl-onAccent, #fff)', transform: checked ? 'translateX(24px)' : 'none' }}
    />
  </button>
);

const Row = ({ title, sub, children }) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <div className="min-w-0">
      <span className="block text-[13px]" style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}>{title}</span>
      {sub && <span className="block text-[11px] mt-0.5" style={{ color: 'var(--sdl-sec)' }}>{sub}</span>}
    </div>
    {children}
  </div>
);

/**
 * Keyboard-operable slider. The originals were bare divs with an onClick that read clientX — no
 * role, no tabindex, no arrow keys, so brightness could only be set with a mouse.
 */
const Slider = ({ label, value, onChange, suffix = '%' }) => (
  <div>
    <div className="flex justify-between text-[12px] mb-1.5">
      <span style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}>{label}</span>
      <span className="tabular-nums" style={{ color: 'var(--sdl-sec)' }}>{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="sdl-range w-full h-1.5 appearance-none rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: `linear-gradient(to right, var(--sdl-accent) ${value}%, var(--sdl-sunken) ${value}%)`,
      }}
    />
  </div>
);

/** Six representative apps, rendered exactly as the dock will render them under a candidate theme. */
const PREVIEW_APPS = ['files', 'terminal', 'music', 'projects', 'settings', 'achievements']
  .map((id) => APPS.find((a) => a.id === id))
  .filter(Boolean);

const Appearance = () => {
  const colorway = useOSStore((s) => s.colorway);
  const setColorway = useOSStore((s) => s.setColorway);
  const density = useOSStore((s) => s.density);
  const setDensity = useOSStore((s) => s.setDensity);
  const iconTheme = useOSStore((s) => s.iconTheme);
  const setIconTheme = useOSStore((s) => s.setIconTheme);
  const reducedMotion = useOSStore((s) => s.reducedMotion);
  const setReducedMotion = useOSStore((s) => s.setReducedMotion);
  const transparencyEffects = useOSStore((s) => s.transparencyEffects);
  const setTransparencyEffects = useOSStore((s) => s.setTransparencyEffects);
  const lowPerformance = useOSStore((s) => s.lowPerformance);
  const setLowPerformance = useOSStore((s) => s.setLowPerformance);
  const brightness = useOSStore((s) => s.brightness);
  const setBrightness = useOSStore((s) => s.setBrightness);
  const accentIntensity = useOSStore((s) => s.accentIntensity);
  const setAccentIntensity = useOSStore((s) => s.setAccentIntensity);
  const wallpaper = useOSStore((s) => s.wallpaper);
  const setWallpaper = useOSStore((s) => s.setWallpaper);
  const resetSettingsToDefault = useOSStore((s) => s.resetSettingsToDefault);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  const uploadRef = useRef(null);
  const groups = colorwaysByTheme();
  const active = resolveColorway(colorway);
  const custom = isCustomWallpaper(wallpaper);

  // Measured, not asserted. Recomputed whenever the colorway changes so the warning can never go
  // stale against the swatches sitting right above it.
  const audits = useMemo(
    () => Object.fromEntries(ICON_THEMES.map((t) => [t.id, iconAudit(t.id, active, APPS)])),
    [active],
  );
  const activeAudit = audits[iconTheme] || { below: 0, total: APPS.length };

  const chooseWallpaper = (id) => { setWallpaper(id); unlockAchievement('decorator'); };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setWallpaper(reader.result); unlockAchievement('decorator'); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="mb-1" style={{ color: 'var(--sdl-ink)', fontSize: 34, fontWeight: 650, letterSpacing: '-0.02em', fontFamily: 'var(--sdl-font-title)' }}>
        Appearance
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--sdl-sec)' }}>
        How Lumina OS looks. {COLORWAYS.length - 1} SDL colorways, plus the legacy neon.
      </p>

      <Card
        title="Colorway"
        sub={`Mode follows the colorway — SDL law 7, temperature decides mode. Currently ${active.themeName}, ${active.mode}.`}
      >
        {groups.map((g) => (
          <div key={g.id} className="mb-5 last:mb-0">
            <h4 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>
              {g.name} · {g.mode} · {g.colorways.length}
            </h4>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
              {g.colorways.map((cw) => (
                <ColorwayCard key={cw.id} cw={cw} active={colorway === cw.id} onApply={setColorway} />
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card
        title="App icons"
        sub="Identity is the hue; discipline is the colorway. Each theme is previewed below at the size the dock actually draws."
      >
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {ICON_THEMES.map((t) => {
            const on = iconTheme === t.id;
            const a = audits[t.id];
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => { setIconTheme(t.id); unlockAchievement('decorator'); }}
                className="text-left p-3 transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
                style={{
                  background: on ? 'var(--sdl-soft)' : 'var(--sdl-sunken)',
                  border: `1px solid ${on ? 'var(--sdl-accent)' : 'var(--sdl-glass-border)'}`,
                  borderRadius: 'var(--sdl-radius)',
                }}
              >
                {/* The preview renders the REAL app records through the REAL renderer with a theme
                    override, so it cannot drift from the dock the way a mocked swatch row would. */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  {PREVIEW_APPS.map((app) => (
                    <AppIcon key={app.id} app={app} size={19} tile pad={7} theme={t.id} animate={false} />
                  ))}
                </div>
                <div className="text-[13px]" style={{ color: on ? 'var(--sdl-aink)' : 'var(--sdl-ink)', fontWeight: 650 }}>
                  {t.name}
                </div>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--sdl-sec)' }}>
                  {t.description}
                </p>
                {a.below > 0 && (
                  <div className="flex items-start gap-1.5 mt-2 text-[11px]" style={{ color: 'var(--sdl-alert)' }}>
                    <AlertTriangle size={13} className="shrink-0 mt-px" />
                    <span>
                      {a.below} of {a.total} icons fall below 3:1 on {active.name} — as low as {a.worst.toFixed(2)}:1.
                    </span>
                  </div>
                )}
                {a.below === 0 && a.flat && (
                  <div className="flex items-start gap-1.5 mt-2 text-[11px]" style={{ color: 'var(--sdl-sec)' }}>
                    <Info size={13} className="shrink-0 mt-px" />
                    <span>{active.name} is near-neutral, so this renders as greyscale here.</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {activeAudit.below > 0 && (
          <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--sdl-sec)' }}>
            The selected theme is a fixed palette, so it cannot follow this colorway. Every other
            theme measures clean on all {COLORWAYS.length} colorways.
          </p>
        )}
      </Card>

      <Card
        title="Wallpaper"
        sub="Photos are ingredients — they sit under the colorway’s wash, never over it. “Colorway” renders nothing so the designed plane shows through."
        right={(
          <>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="flex items-center gap-2 text-[12px] px-3 rounded-full shrink-0 transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
              style={{ height: 'var(--sdl-control-h, 36px)', background: 'var(--sdl-sunken)', color: 'var(--sdl-sec)', fontWeight: 600 }}
            >
              <Upload size={14} />
              Upload
            </button>
            <input ref={uploadRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          </>
        )}
      >
        {/* Preview. The old Desktop pane had one and this pane did not; it is the only way to see a
            photo wallpaper against the colorway's own ink before committing to it. */}
        <div
          className={`h-32 mb-3 relative overflow-hidden ${!custom && resolveWallpaper(wallpaper)?.type === 'live' ? resolveWallpaper(wallpaper).gradient : ''}`}
          style={{
            borderRadius: 'var(--sdl-radius)',
            border: '1px solid var(--sdl-glass-border)',
            background: !custom && resolveWallpaper(wallpaper)?.type === 'none' ? 'var(--sdl-plane)' : undefined,
            backgroundImage: custom
              ? `url(${wallpaper})`
              : resolveWallpaper(wallpaper)?.type === 'image' ? `url(${resolveWallpaper(wallpaper).url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 flex items-end p-3 gap-2">
            {PREVIEW_APPS.slice(0, 4).map((app) => (
              <AppIcon key={app.id} app={app} size={18} tile pad={9} animate={false} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 md:grid-cols-6 gap-2">
          {WALLPAPERS.map((wp) => {
            const on = !custom && wallpaper === wp.id;
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => chooseWallpaper(wp.id)}
                aria-pressed={on}
                title={wp.name}
                className={`h-14 rounded-lg overflow-hidden relative transition-all duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2 ${wp.type === 'live' ? wp.gradient : ''}`}
                style={{
                  border: `2px solid ${on ? 'var(--sdl-accent)' : 'var(--sdl-glass-border)'}`,
                  background: wp.type === 'none' ? 'var(--sdl-plane)' : undefined,
                }}
              >
                {wp.type === 'image' && <img src={wp.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                {wp.type === 'none' && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--sdl-sec)' }}>
                    Plane
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {custom && (
          <p className="text-[11px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
            Using an uploaded image. Pick a swatch above to go back to the library.
          </p>
        )}
      </Card>

      <Card
        title="Density"
        sub="Compact steps every space token down one, body −1px, KPI −20%. Radii, inks and accent voices never change."
      >
        <Segmented
          label="Density"
          value={density}
          onChange={setDensity}
          options={[{ id: 'comfortable', name: 'Comfortable' }, { id: 'compact', name: 'Compact' }]}
        />
      </Card>

      <Card title="Motion" sub={`This theme runs ${active.tempo.hover} / ${active.tempo.press} / ${active.tempo.pane} ms.`}>
        <Segmented
          label="Reduced motion"
          value={reducedMotion}
          onChange={setReducedMotion}
          options={[{ id: 'system', name: 'Follow system' }, { id: 'on', name: 'Reduce' }, { id: 'off', name: 'Full' }]}
        />
      </Card>

      <Card title="Surfaces" sub="How much of the world shows through the chrome.">
        <div className="divide-y" style={{ borderColor: 'var(--sdl-glass-border)' }}>
          <Row title="Transparency" sub="Glass surfaces blur what’s behind them. Off gives flat, opaque panels.">
            <Switch label="Transparency" checked={transparencyEffects} onChange={setTransparencyEffects} />
          </Row>
          <Row title="Performance mode" sub="Drops the 3D wallpaper and the heavier ambient effects.">
            <Switch label="Performance mode" checked={lowPerformance} onChange={setLowPerformance} />
          </Row>
        </div>
      </Card>

      <Card title="Display" sub="Two dials, both live on the whole shell.">
        <div className="space-y-5">
          <Slider label="Brightness" value={brightness} onChange={setBrightness} />
          <div>
            <Slider label="Atmosphere" value={accentIntensity} onChange={setAccentIntensity} />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--sdl-sec)' }}>
              Multiplies the wash, motif and glow alphas together — law 8’s “atmosphere whispers”, on
              one control. Labelled “Accent Intensity” until it was wired to something real.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Reset" sub="Restores colorway, icons, wallpaper, density, motion and both dials to factory defaults.">
        <button
          type="button"
          onClick={resetSettingsToDefault}
          className="flex items-center gap-2 text-[12px] px-4 rounded-full transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
          style={{
            height: 'var(--sdl-control-h, 36px)',
            background: 'var(--sdl-sunken)',
            color: 'var(--sdl-alert)',
            fontWeight: 650,
            border: '1px solid var(--sdl-glass-border)',
          }}
        >
          <RotateCcw size={14} />
          Reset appearance
        </button>
      </Card>
    </div>
  );
};

export default Appearance;
