/* Loads data/cv.json and data/extras.json, checks them, and derives what the figures need.
   Usage: CV.ready.then((C) => …). Works from any page in the repo: paths resolve from this script. */

window.CV = (() => {
  const ROOT = new URL("../../", document.currentScript.src);
  const get = (name) => fetch(new URL(`data/${name}`, ROOT), { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`data/${name}: ${r.status}`);
    return r.json();
  });

  const years = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    return y + (m - 1) / 12;
  };
  /** python's date.toordinal(), on the visitor's local calendar day */
  const ordinal = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) + 719163;
  /** the same deterministic daily pick as content.of_the_day in the profile repo */
  const ofTheDay = (items, salt = 0, d = new Date()) => items[(ordinal(d) * 7 + salt) % items.length];

  function build(cv, ex) {
    const warn = (msg) => console.warn(`[data] ${msg}`);
    const FAMILIES = cv.families, GROUPS = cv.groups;
    const SKILLS = cv.skills.map((s) => {
      if (!FAMILIES[s.family]) warn(`skill "${s.id}" has unknown family "${s.family}"`);
      return { ...s, fam: s.family, abbr: s.abbr || s.name };
    });
    const skillIndex = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
    const CAREER = cv.career.map((r) => {
      if (!GROUPS[r.group]) warn(`role "${r.id}" has unknown group "${r.group}"`);
      for (const k of ["start", "end"]) if (r[k] && !/^\d{4}-\d{2}$/.test(r[k])) warn(`role "${r.id}": ${k} should be "YYYY-MM"`);
      const skills = (r.skills || []).filter((id) => skillIndex[id] || warn(`role "${r.id}" lists unknown skill "${id}"`));
      return { text: "", ...r, skills };
    });
    const now = new Date(), nowY = now.getFullYear() + now.getMonth() / 12;
    for (const s of SKILLS) {
      s.roles = CAREER.filter((r) => r.skills.includes(s.id));
      s.magnitude = s.roles.length;
      const first = s.roles.length ? Math.min(...s.roles.map((r) => years(r.start))) : (s.since ?? nowY);
      s.firstLight = Math.max(s.since ?? -Infinity, first);
    }
    const ids = new Set(ex.thinkers.map((t) => t.id));
    for (const [a, b] of ex.influences) for (const x of [a, b]) if (!ids.has(x)) warn(`influence mentions unknown thinker "${x}"`);
    return {
      NAME: cv.name, FAMILIES, GROUPS, SKILLS, skillIndex, CAREER, POOLED: cv.pooled,
      LANGUAGES: cv.languages, INTERESTS: cv.interests, PROJECTS: cv.projects,
      THINKERS: ex.thinkers, INFLUENCES: ex.influences, QUOTES: ex.quotes, EQUATIONS: ex.equations,
      years, ofTheDay,
    };
  }

  const ready = Promise.all([get("cv.json"), get("extras.json")]).then(([cv, ex]) => build(cv, ex));
  ready.catch((e) => console.error("[data] could not load the resume data:", e));
  return { ready, years, ofTheDay };
})();
