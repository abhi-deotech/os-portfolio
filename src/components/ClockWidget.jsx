import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useMinuteClock from '../hooks/useMinuteClock';
import useVisiblePoll from '../hooks/useVisiblePoll';
import useOSStore from '../store/osStore';
import { resolveUnit } from '../wallpaper/config';

// Module-level formatters: `toLocaleTimeString` / `toLocaleDateString` construct a new
// Intl.DateTimeFormat on every call, and this used to make two of them per second.
const TIME_HM = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const DATE_LONG = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

const ClockWidget = () => {
  // Minute-aligned. The widget shows HH:MM, so the old 1 s interval re-rendered it 60x per change.
  const time = useMinuteClock();

  // Real weather or none. This widget used to show a fixed "24°C, Clear" and a bar graph of
  // Math.random() heights labelled as activity — invented data on a surface that otherwise reports
  // only facts. It now shows Open-Meteo for the place chosen in Settings → Wallpaper mode, and
  // nothing at all until a place is chosen. The weather module is imported on demand: this widget
  // is in the entry chunk, and most visitors never choose a place.
  const place = useOSStore((s) => s.wallpaperPrefs.place);
  const unitPref = useOSStore((s) => s.wallpaperPrefs.unit);
  const unit = resolveUnit(unitPref);
  const [weather, setWeather] = useState(null);
  useVisiblePoll(async () => {
    try {
      const { fetchWeather, describeCode } = await import('../wallpaper/weather');
      const data = await fetchWeather(place, unit);
      setWeather({ ...data, ...describeCode(data.code, data.isDay) });
    } catch {
      setWeather(null);
    }
  }, 30 * 60_000, Boolean(place), place ? `${place.lat},${place.lon},${unit}` : '');
  const shown = place && weather;
  const { label, Icon } = shown ? weather : {};

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      /* `glass` + `lift`, not a hand-rolled bg/blur/border/shadow stack.
       *
       * This was `bg-veil/[0.03] backdrop-blur-3xl` — a 3% fill behind a **64px** blur. Two
       * problems. A blur that wide over a photo wallpaper is the classic trigger for backdrop
       * repaint seams: when anything nearby repaints (hovering a desktop icon is enough), the
       * compositor re-blurs only the dirty rectangle and the boundary shows up as a vertical band
       * straight through the widget. `--sdl-glass-blur` is 24px, well inside where that happens.
       *
       * Second, a 3% veil is near-invisible over a light colorway, and this widget never read
       * `transparencyEffects`, so turning transparency off did nothing to it. The role token is
       * mode-aware and already collapses to an opaque fill when the user disables glass.
       */
      className="p-6 rounded-[2.5rem] glass lift lift-hover flex flex-col gap-4 select-none group transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-5xl font-black text-sdl-ink tracking-tighter tabular-nums">
            {TIME_HM.format(time)}
          </h2>
          <p className="text-xs font-black text-os-primary uppercase tracking-[0.3em]">
            {DATE_LONG.format(time)}
          </p>
        </div>
        {shown && (
          <div className="p-3 bg-os-primary/10 rounded-2xl border border-os-primary/20" title={label}>
             <Icon className="text-os-primary" size={24} aria-hidden="true" />
          </div>
        )}
      </div>

      {shown && (
        <>
          <div className="h-px bg-veil/5 w-full my-2" />

          <div className="flex justify-between items-center px-1">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">{place.name}</span>
                <span className="text-lg font-black text-sdl-ink tabular-nums">{weather.temp}°{unit.toUpperCase()}</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">Condition</span>
                <span className="text-sm font-bold text-os-secondary uppercase tracking-wider">{label}</span>
             </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default ClockWidget;
