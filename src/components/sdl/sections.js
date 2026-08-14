/**
 * Design Language section metadata.
 *
 * Kept out of DesignLanguage.jsx so that file exports components only — mixing constant and
 * component exports breaks React Fast Refresh for the whole module.
 *
 * Seven boards would be one 20,000px wall if merged. RECIPES.md specifies three distinct artifact
 * types (calibration board, review round, interaction bench) and PHILOSOPHY.md's process note is
 * explicit: "one set at a time, full-size specimens."
 */
export const DL_SECTIONS = [
  { id: 'dl-overview', label: 'Overview' },
  { id: 'dl-colorways', label: 'Colorways & Roles' },
  { id: 'dl-type', label: 'Type & Measure' },
  { id: 'dl-motion', label: 'Motion & States' },
  { id: 'dl-rejections', label: 'Rejections' },
];

export default DL_SECTIONS;
