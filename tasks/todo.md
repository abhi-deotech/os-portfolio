# Music App: Global Dual-Engine Playback — Todo

Plan: /home/hepond/.claude/plans/radiant-cooking-snail.md

- [ ] Install `music-metadata` devDependency
- [ ] `plugins/musicManifest.js` — Vite plugin: scan `public/assets/music/*.mp3`, ID3 → `virtual:music-manifest`, cover extraction, dev watcher
- [ ] Seed `public/assets/music/` with royalty-free tracks (ffmpeg re-encode + ID3 tags), gitignore `.covers/`
- [ ] `src/data/musicData.js` — `source: 'youtube'` on existing tracks, merge virtual manifest
- [ ] `src/utils/musicEngine.js` — global singleton: Audio element + YT iframe backends, store subscription, AnalyserNode, seek()
- [ ] `src/App.jsx` — attach engine on mount
- [ ] `src/store/slices/musicSlice.js` — nextTrack/prevTrack actions, fix default currentTrack; `osStore.js` reset isPlaying on rehydrate
- [ ] `src/components/MusicApp.jsx` — strip YT code, wire to store/engine
- [ ] `src/components/Visualizer.jsx` — real analyser data with fake fallback
- [ ] `src/components/ControlCenter.jsx` — wire Skip button
- [ ] `vite.config.js` — register plugin, exclude .mp3 from compression
- [ ] Verify end-to-end in browser (playback both backends, window close, drop-in test, reload) + `npm run build`

## Review

(to be filled after implementation)
