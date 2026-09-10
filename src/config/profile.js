/**
 * The one place a fact about Abhimanyu lives.
 *
 * Before this file the same career facts were typed into three components and disagreed with each
 * other. SocialWidget claimed "Noida"; AboutMe claimed "Kota, Rajasthan"; public/resume.txt puts
 * the current role in Jaipur. The widget advertised TypeScript, AWS and MongoDB — none of which
 * appear in any other source — while omitting Golang, C++ and IoT, which appear in all of them.
 * A visitor who opened About Me and the Social widget in the same session saw two different people.
 *
 * Rules for editing:
 *
 *   1. Every value here must be checkable against public/resume.txt or the live LinkedIn profile.
 *      If you cannot point at the source, it does not belong in this file. The widget's whole job
 *      is to be believed, and one invented line costs more than ten true ones earn.
 *
 *   2. Durations are never written down. Store dates and let `tenure()` derive the rest, so the
 *      record cannot quietly go stale while nobody is editing it.
 *
 *   3. `recommendations` and `endorsements` ship EMPTY. They come from the LinkedIn data archive
 *      (Settings -> Data privacy -> Get a copy of your data -> *larger archive*), which is the only
 *      free and first-party way to get them — LinkedIn's Profile API needs approved developer
 *      status plus a paid Consumer Solutions plan, and cannot be called from a browser anyway.
 *      Until the archive is imported the UI drops those sections entirely rather than inventing
 *      filler, which is exactly the failure this file exists to end.
 */

/** GitHub is fetched live; the rest is a signed record. Both states are labelled in the UI. */
export const handles = {
  github: 'abhi-deotech',
  linkedin: 'abhimanyu-saxena-b656a4183',
  twitter: 'TrippySaxena',
  // `contact@abhi.dev` was here and is NOT a real address — it shipped in AboutMe's social row for
  // anyone who clicked it. Null until the real one is supplied; every mailto link is dropped while
  // it is null, and the in-app Mail window remains the working contact path.
  email: null,
};

export const identity = {
  name: 'Abhimanyu Saxena',
  given: 'Abhimanyu',
  family: 'Saxena',
  headline: 'Software Engineer | Team Lead',
  // Résumé address, and what AboutMe already showed. If the LinkedIn profile header says Jaipur
  // (where Deotechsolutions is), change this one line — do not add a second location field.
  location: 'Kota, Rajasthan, India',
  dob: '1998-02-17',
  languages: ['English', 'Hindi'],
  objective:
    'Passionate and versatile Software Engineer with a strong background in computer science. ' +
    'Targeting opportunities in Software Development, exploring roles in Electronics, IoT, and ' +
    'other technology domains. Proficient full stack developer with nearly 3 years of industry ' +
    'experience in end-to-end application development, deployment, and maintenance.',
};

/**
 * Newest first. `end: null` means current. Dates are YYYY-MM because that is the precision the
 * résumé actually carries — do not invent a day.
 */
export const positions = [
  {
    title: 'Software Engineer | Team Lead',
    company: 'Deotechsolutions',
    location: 'Jaipur',
    start: '2025-07',
    end: null,
    bullets: [
      'Led development teams building scalable web applications, mentoring junior developers and establishing coding standards across multiple projects.',
      'Managed full-stack development across product lines, overseeing front-end and back-end architecture while implementing QA processes that reduced deployment errors.',
      'Directed technical planning with cross-functional teams, translating business requirements into roadmaps and delivering major releases ahead of schedule.',
    ],
  },
  {
    title: 'Software Engineer',
    company: 'LendFoundry',
    location: 'Jodhpur & Ahmedabad',
    start: '2021-09',
    end: '2024-07',
    bullets: [
      'Developed and maintained web-based applications using modern JavaScript frameworks and back-end tools.',
      'Conducted requirement analysis and collaborated with cross-functional teams to ensure delivery under tight timelines.',
      'Engaged in code reviews, testing, and enhancement of existing features based on client feedback.',
    ],
  },
];

export const education = [
  {
    title: 'B.Tech in Computer Science',
    school: 'SRM Institute of Science & Technology',
    location: 'Chennai',
    year: '2020',
  },
];

export const certifications = [
  {
    title: 'Full Stack Web Development',
    school: 'Udacity Nanodegree',
    year: 'Jan 2021',
  },
];

/** Straight off the résumé's TECHNICAL SKILLS block, in its order. */
export const skills = {
  languages: ['JavaScript', 'Golang', 'C++', 'Python'],
  frontend: ['React.js', 'Vite', 'Tailwind', 'Framer Motion'],
  tools: ['Docker', 'Git', 'IoT', 'Linux'],
  competencies: ['Requirement Analysis', 'API Integration', 'Full Stack', 'Agile'],
};

export const awards = [
  {
    title: 'SPOT Award',
    org: 'LendFoundry',
    detail: 'For outstanding project delivery and collaboration.',
  },
  {
    title: 'Peer Training & Mentoring',
    org: 'LendFoundry',
    detail: 'Conducted multiple training sessions during onboarding cycles.',
  },
];

/**
 * ---------------------------------------------------------------------------------------------
 * FROM THE LINKEDIN ARCHIVE — both arrays are intentionally empty until imported.
 * ---------------------------------------------------------------------------------------------
 *
 * How to fill them:
 *   1. LinkedIn -> Settings & Privacy -> Data privacy -> Get a copy of your data
 *   2. Tick the LARGER archive (the connections-only export does not include these), request it,
 *      wait for the email.
 *   3. `Recommendations_Received.csv` -> `recommendations` below.
 *      `Endorsement_Received_Info.csv` -> group by skill, count rows -> `endorsements` below.
 *   4. Set `record.archiveImportedAt` to the date you did it.
 *
 * Both sections vanish from the widget while these are empty. That is deliberate: a
 * "0 recommendations" empty state is worse than no section at all.
 */

/** @type {{ text: string, author: string, title: string, relationship: string, date: string }[]} */
export const recommendations = [];

/** @type {{ skill: string, count: number }[]} — highest count first. */
export const endorsements = [];

export const record = {
  /** Last time every field above was checked against public/resume.txt. */
  verifiedAt: '2026-09-03',
  /** Set when the LinkedIn archive lands. Null means the two arrays above are still empty. */
  archiveImportedAt: null,
};

/* --------------------------------------------------------------------------------------------
 * Derived values. Nothing below is stored — it is all computed from the dates above, so the
 * record ages correctly on its own.
 * ------------------------------------------------------------------------------------------ */

/** `2021-09` -> whole months elapsed to `end` (or to `now` when end is null). */
export const monthsBetween = (start, end, now = new Date()) => {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end
    ? end.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  return Math.max(0, (ey - sy) * 12 + (em - sm));
};

/** Months -> LinkedIn's own phrasing: "3 yr 2 mo", "8 mo", "1 yr". */
export const humanizeMonths = (months) => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} mo`;
  if (!m) return `${y} yr`;
  return `${y} yr ${m} mo`;
};

export const tenure = (position, now = new Date()) =>
  humanizeMonths(monthsBetween(position.start, position.end, now));

/**
 * Summed employed months across roles — NOT first-job-to-today. The résumé's "nearly 3 years" was
 * written during the LendFoundry run and has been stale since; summing actual tenures keeps the
 * claim true without anyone remembering to bump it.
 */
export const totalExperienceMonths = (now = new Date()) =>
  positions.reduce((acc, p) => acc + monthsBetween(p.start, p.end, now), 0);

/** `2025-07` -> "Jul 2025". `null` -> "Present". */
export const formatMonth = (ym) => {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[m - 1]} ${y}`;
};

export const profileUrls = {
  github: `https://github.com/${handles.github}`,
  linkedin: `https://linkedin.com/in/${handles.linkedin}`,
  twitter: `https://twitter.com/${handles.twitter}`,
  email: handles.email ? `mailto:${handles.email}` : null,
};
