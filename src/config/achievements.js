import {
  Trophy, Star, Terminal as TermIcon, Edit3, Search, Activity, Zap, Gamepad2,
  Music, Palette, Gauge, Book, Share2, Brain, Grid3x3, Hash, Layers, Timer,
} from 'lucide-react';

/**
 * The single achievement registry.
 *
 * There used to be two: a 16-entry array in Achievements.jsx and a 13-entry object in
 * AchievementToast.jsx. They disagreed. Five ids that games actually fire —
 * 2048_master, memory_master, snake_pro, sudoku_pro, trivia_expert — appeared in NEITHER,
 * so those five rewards were write-only: they inflated the "unlocked N of 16" counter past
 * the number of visible cards and rendered no toast at all. Three more (deep_thinker,
 * devops_escape, system_pro) were in the panel but not the toast, so they unlocked in
 * silence. `architect` had a different title AND description in each list.
 *
 * One list means an id can never again exist in only half the system. `unlockAchievement`
 * warns in dev when handed an id that isn't here, so the next orphan is caught at the call
 * site instead of silently vanishing.
 *
 * `hue` is an OKLCH hue angle on the same contract as apps.jsx — the colorway tints these,
 * so they can't drift out of the theme the way the old per-entry `from-blue-400` gradients did.
 */
export const ACHIEVEMENTS = [
  // — System —
  { id: 'first_login', title: 'Hello World', desc: 'Successfully logged into Lumina OS.', icon: Star, hue: 216 },
  { id: 'search_pro', title: 'Spotlight Master', desc: 'Used the global search for the first time.', icon: Search, hue: 288 },
  { id: 'terminal_wiz', title: 'Command Line Guru', desc: 'Executed 5 terminal commands.', icon: TermIcon, hue: 145 },
  { id: 'hacker', title: 'Mainframe Access', desc: 'Tried to SSH into a remote host.', icon: Zap, hue: 24 },
  { id: 'writer', title: 'Poet in Exile', desc: 'Saved your first note in Notepad.', icon: Edit3, hue: 196 },
  { id: 'monitor', title: 'System Admin', desc: 'Opened the Task Manager to monitor resources.', icon: Activity, hue: 216 },
  { id: 'system_pro', title: 'Power User', desc: 'Managed advanced system processes in Task Manager.', icon: Activity, hue: 34 },
  // The panel called this "System Architect / Created a new folder or file"; the toast called
  // it "Deep Diver / Explored the system architecture documentation". The call site in
  // fileSystemSlice fires it on node creation, so the panel's wording was the correct one.
  { id: 'architect', title: 'System Architect', desc: 'Created a new folder or file in the filesystem.', icon: Book, hue: 165 },
  { id: 'decorator', title: 'Interior Designer', desc: 'Customized your desktop theme in Settings.', icon: Palette, hue: 276 },
  { id: 'speed_demon', title: 'Speed Demon', desc: 'Personalized your system performance with a benchmark.', icon: Gauge, hue: 96 },
  { id: 'devops_escape', title: 'DevOps Escape Artist', desc: 'Successfully escaped the simulated Vim trap.', icon: TermIcon, hue: 300 },
  { id: 'easter_egg', title: 'Rabbit Hole', desc: 'Found the secret matrix mode.', icon: Trophy, hue: 86 },

  // — Media & social —
  { id: 'audiophile', title: 'Music Lover', desc: 'Played a track in the Music app.', icon: Music, hue: 340 },
  { id: 'deep_thinker', title: 'Deep Thinker', desc: 'Engaged in a detailed conversation with Lumina AI.', icon: Brain, hue: 256 },
  { id: 'socialite', title: 'Well Connected', desc: 'Visited my LinkedIn or GitHub profile.', icon: Share2, hue: 206 },

  // — Games — the five below were fired by the games but registered nowhere.
  { id: 'gamer', title: 'NexusX Explorer', desc: 'Launched your first game in the Game Center.', icon: Gamepad2, hue: 34 },
  { id: 'snake_pro', title: 'Snake Charmer', desc: 'Scored 100 or more in Snake.', icon: Gamepad2, hue: 145 },
  { id: '2048_master', title: 'Merge King', desc: 'Reached the 2048 tile.', icon: Layers, hue: 56 },
  { id: 'sudoku_pro', title: 'Grandmaster', desc: 'Completed a Sudoku board.', icon: Hash, hue: 176 },
  { id: 'memory_master', title: 'Total Recall', desc: 'Cleared a Memory Match board.', icon: Grid3x3, hue: 122 },
  { id: 'trivia_expert', title: 'Quick Wit', desc: 'Answered 10 trivia questions correctly.', icon: Timer, hue: 300 },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;

/** True when `id` is a registered achievement. Used by the dev guard in unlockAchievement. */
export const isKnownAchievement = (id) => Object.hasOwn(ACHIEVEMENT_BY_ID, id);
