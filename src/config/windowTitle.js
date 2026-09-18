import { GAME_BY_ID } from './games.js';
import { APP_BY_ID } from './apps.jsx';

/**
 * A window's title. Titles were derived as `id[0].toUpperCase() + id.slice(1)`, which produced
 * "Retroarcade" and "Taskmanager" — and "Aichat" and "Browser" for apps, whose registry titles are
 * "Lumina AI" and "Flow-Net". Both registries are consulted: games first (retroarcade lives in both;
 * the game entry is the specific one), then apps, then the derived fallback for ids in neither.
 *
 * Lifted out of App.jsx so the popped-out window's document title uses the same words, and App keeps
 * component-only exports.
 */
export const windowTitle = (id) =>
  GAME_BY_ID[id]?.title ?? APP_BY_ID[id]?.title ?? String(id).charAt(0).toUpperCase() + String(id).slice(1);
