import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';

/**
 * Drop-in music track system.
 *
 * Scans public/assets/music/*.mp3 at dev/build time, reads each file's ID3
 * tags (title, artist, album, genre, duration, embedded cover art) and exposes
 * the result as the virtual module `virtual:music-manifest`.
 *
 * Adding a track to the app = dropping a tagged MP3 into public/assets/music/.
 * No code changes. Missing tags fall back to a "Artist - Title.mp3" filename
 * convention and a generated gradient cover.
 */

const MUSIC_DIR = 'public/assets/music';
const COVERS_DIR = '_covers'; // inside MUSIC_DIR; gitignored, regenerated every run
const PUBLIC_BASE = '/assets/music';
const VIRTUAL_ID = 'virtual:music-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'track';

// Deterministic SVG gradient cover for untagged files (data URI, ~300 bytes).
const fallbackCover = (title) => {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const h1 = hash % 360;
  const h2 = (h1 + 80) % 360;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${h1},70%,45%)"/>` +
    `<stop offset="1" stop-color="hsl(${h2},70%,25%)"/></linearGradient></defs>` +
    `<rect width="300" height="300" fill="url(#g)"/>` +
    `<circle cx="150" cy="150" r="60" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="6"/>` +
    `<circle cx="150" cy="150" r="12" fill="rgba(255,255,255,0.5)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

async function scanTracks(root) {
  const musicDir = path.resolve(root, MUSIC_DIR);
  await mkdir(path.join(musicDir, COVERS_DIR), { recursive: true });

  let files = [];
  try {
    files = (await readdir(musicDir)).filter((f) => /\.mp3$/i.test(f)).sort();
  } catch {
    return [];
  }

  const tracks = [];
  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const id = slugify(base);
    // Filename convention fallback: "Artist - Title.mp3"
    const [fnArtist, fnTitle] = base.includes(' - ')
      ? base.split(' - ').map((s) => s.trim())
      : [null, base];

    const track = {
      id,
      source: 'local',
      src: encodeURI(`${PUBLIC_BASE}/${file}`),
      title: fnTitle || base,
      artist: fnArtist || 'Unknown Artist',
      album: 'Lumina Local',
      genre: 'Local',
      duration: 0,
      cover: null,
    };

    try {
      const meta = await parseFile(path.join(musicDir, file), { duration: true });
      const c = meta.common;
      if (c.title) track.title = c.title;
      if (c.artist) track.artist = c.artist;
      if (c.album) track.album = c.album;
      if (c.genre?.length) track.genre = c.genre[0];
      if (meta.format.duration) track.duration = Math.round(meta.format.duration);

      const pic = c.picture?.[0];
      if (pic) {
        const ext = /png/i.test(pic.format) ? 'png' : 'jpg';
        const coverFile = `${id}.${ext}`;
        await writeFile(path.join(musicDir, COVERS_DIR, coverFile), pic.data);
        track.cover = encodeURI(`${PUBLIC_BASE}/${COVERS_DIR}/${coverFile}`);
      }
    } catch (err) {
      console.warn(`[music-manifest] Could not read tags for ${file}: ${err.message}`);
    }

    if (!track.cover) track.cover = fallbackCover(track.title);
    tracks.push(track);
  }

  console.log(`[music-manifest] ${tracks.length} local track(s) found in ${MUSIC_DIR}`);
  return tracks;
}

export default function musicManifest() {
  let root = process.cwd();

  return {
    name: 'music-manifest',

    configResolved(config) {
      root = config.root;
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    async load(id) {
      if (id !== RESOLVED_ID) return;
      const tracks = await scanTracks(root);
      return `export default ${JSON.stringify(tracks)};`;
    },

    configureServer(server) {
      const musicDir = path.resolve(root, MUSIC_DIR);
      server.watcher.add(musicDir);
      const onChange = (file) => {
        if (!file.startsWith(musicDir) || !/\.mp3$/i.test(file)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}
