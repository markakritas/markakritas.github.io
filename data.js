/* Everything the figures draw, kept apart from the drawing code.
   Mirrors scripts/content.py in github.com/markakritas/markakritas.
   Edit freely: every figure on index.html and print.html is rebuilt from these tables. */

window.CV = (() => {
  // skill families -> colour token (css var), english label, star-atlas constellation name
  const FAMILIES = {
    lang:  { label: "languages",   latin: "Lingua",          color: "yellow" },
    model: { label: "modelling",   latin: "Modellus",        color: "red" },
    llm:   { label: "llm stack",   latin: "Machina Loquens", color: "purple" },
    voice: { label: "voice ai",    latin: "Vox",             color: "aqua" },
    ship:  { label: "shipping",    latin: "Navis",           color: "blue" },
    noble: { label: "noble gases", latin: "Gases Nobiles",   color: "green" },
    tool:  { label: "tooling",     latin: "Instrumenta",     color: "muted" },
  };

  // id, display name, family, optional `since` (year it could first have been used,
  // for tools younger than the roles they are tagged in), optional resume proficiency
  const SKILLS = [
    ["python", "Python", "lang", { level: "good" }],
    ["r", "R", "lang", { level: "good" }],
    ["sql", "SQL", "lang", { level: "intermediate" }],
    ["js", "JavaScript · HTML/CSS", "lang", { level: "basic", abbr: "JS" }],
    ["shell", "Shell", "lang"],
    ["ml", "machine learning", "model", { abbr: "ML" }],
    ["sklearn", "scikit-learn", "model", { abbr: "sklearn" }],
    ["pytorch", "PyTorch", "model"],
    ["lora", "LoRA fine-tuning", "model", { abbr: "LoRA" }],
    ["mixed", "mixed-effects models", "model", { abbr: "mixed models" }],
    ["doe", "design of experiments", "model", { abbr: "DoE" }],
    ["signal", "signal processing", "model", { abbr: "signals" }],
    ["nlp", "NLP", "model"],
    ["llm", "LLMs", "llm"],
    ["rag", "RAG", "llm"],
    ["agents", "agents", "llm"],
    ["vllm", "vLLM", "llm"],
    ["weaviate", "Weaviate", "llm"],
    ["kreuzberg", "kreuzberg", "llm"],
    ["searxng", "SearXNG", "llm"],
    ["livekit", "LiveKit", "voice"],
    ["elevenlabs", "ElevenLabs", "voice"],
    ["deepgram", "Deepgram", "voice"],
    ["rest", "REST APIs", "ship", { abbr: "REST" }],
    ["dash", "dashboards", "ship"],
    ["dataeng", "data engineering", "ship", { abbr: "data eng." }],
    ["linux", "Linux", "noble"],
    ["docker", "Docker", "noble"],
    ["git", "Git", "noble"],
    ["uv", "uv", "tool", { since: 2024.1 }],
    ["ruff", "ruff", "tool", { since: 2023.0 }],
    ["pydantic", "Pydantic", "tool"],
    ["jupyter", "Jupyter", "tool"],
    ["vscode", "VS Code", "tool"],
  ].map(([id, name, fam, extra = {}]) => ({ id, name, fam, abbr: name, ...extra }));

  // group -> colour token
  const GROUPS = {
    "industry": "orange",
    "research & teaching": "blue",
    "education": "aqua",
    "before data": "faint",
  };

  // the resume, line by line. `skills` are the stack each role used (drives the
  // chords in fig. 2 and the star magnitudes in fig. 3).
  const CAREER = [
    {
      id: "a2k", group: "industry", role: "AI/ML Engineer", where: "Advance2000",
      org: "Cloud Private Infrastructure", start: "2025-11", end: null, main: true,
      text: "LLM fine-tuning using LoRA. A private, ChatGPT-like AI assistant with web search, RAG and agentic features. Voice AI agents for call centers. Codebase and task management across the team for multiple projects.",
      skills: ["llm", "lora", "pytorch", "vllm", "rag", "weaviate", "searxng", "agents", "livekit", "elevenlabs", "deepgram", "python", "git", "docker", "linux", "pydantic", "uv", "ruff", "vscode"],
    },
    {
      id: "nlw", group: "industry", role: "AI Engineer", where: "NewLevelWork",
      org: "AI Coaching, Leadership & Development", start: "2025-01", end: "2025-11", main: true,
      text: "LLM- and voice-based chatbots, agentic workflows, RAG, document parsing, REST APIs.",
      skills: ["llm", "agents", "rag", "kreuzberg", "weaviate", "livekit", "elevenlabs", "deepgram", "rest", "python", "pydantic", "docker", "git", "uv", "vscode"],
    },
    {
      id: "noble", group: "industry", role: "Data Scientist / ML Engineer", where: "NobleScripts",
      org: "AI & Web Dev", start: "2020-06", end: "2026-05", main: true,
      text: "Research, machine learning, signal processing, REST API development, data collection, pipelines, deployment, codebase & task management, long-term maintenance.",
      skills: ["python", "ml", "sklearn", "pytorch", "signal", "rest", "dataeng", "sql", "js", "shell", "docker", "linux", "git", "jupyter", "vscode", "uv", "ruff"],
    },
    {
      id: "clin", group: "industry", role: "Data Scientist / Statistician", where: "ClinStatDevice / ClinSoft",
      org: "Bioinformatics", start: "2019-06", end: "2020-06", main: true,
      text: "Design of experiments, randomization, simulation, mixed-effects modelling, advanced visualization, dashboard development, report automation.",
      skills: ["r", "doe", "mixed", "dash", "sql"],
    },
    {
      id: "veon", group: "industry", role: "IT Intern", roleShort: "IT Intern · SQL, NLP", where: "Veon Armenia",
      start: "2018-09", end: "2018-11",
      text: "SQL reports, natural language processing.",
      skills: ["sql", "nlp", "python"],
    },
    {
      id: "aua", group: "research & teaching", role: "Teaching Associate", where: "American University of Armenia", short: "AUA",
      start: "2021-01", end: "2021-05",
      text: "Programming for Data Science: teaching Python & R.",
      skills: ["python", "r", "jupyter"],
    },
    {
      id: "pdrf", group: "research & teaching", role: "Research Assistant", where: "PDRF",
      start: "2020-07", end: "2021-03",
      text: "Skill-mismatch research: survey preparation, data analysis.",
      skills: ["r", "doe"],
    },
    {
      id: "meta", group: "research & teaching", role: "EPIC Startup Program", where: "MetaStyle",
      start: "2020-01", end: "2020-06",
      text: "Text style transfer using machine learning.",
      skills: ["python", "ml", "pytorch", "nlp"],
    },
    {
      id: "hero", group: "research & teaching", role: "AI Incubator Program", where: "Hero House · Expper Tech.", short: "Hero House · Expper", roleShort: "AI Incubator",
      start: "2019-07", end: "2019-10",
      text: "Robin the Robot: human–robot interaction research, emotional-response system prototyping.",
      skills: ["python", "ml"],
    },
    {
      id: "msc", group: "education", role: "Master, Industrial Engineering & Systems Management", where: "American University of Armenia", short: "AUA", roleShort: "Master, IE & Systems Mgmt",
      start: "2017-09", end: "2020-06",
      text: "Concentration in data analytics. Capstone: temporal data-based anomaly localization in networks.",
      skills: ["r", "python", "sql", "ml", "jupyter"],
    },
    {
      id: "bsc", group: "education", role: "Bachelor, Crisis Management", where: "Armenian State University of Economics", short: "ASUE",
      start: "2010-09", end: "2016-06",
      text: "Thesis: spatial development in the Republic of Armenia.",
      skills: [],
    },
    {
      id: "wiki", group: "before data", role: "Digitalization of Accounting", where: "Wikimedia Armenia",
      start: "2017-06", end: "2017-08", text: "", skills: [],
    },
    {
      id: "acct", group: "before data", role: "Accountant", where: "IT, commercial & public sectors", short: "IT, retail & public",
      start: "2015-08", end: "2017-09", text: "", skills: [],
    },
    {
      id: "judicial", group: "before data", role: "Judicial Acts Specialist", where: "",
      start: "2014-03", end: "2015-08", text: "", skills: [],
    },
    {
      id: "army", group: "before data", role: "Military Service", where: "Armed Forces of RA",
      start: "2011-12", end: "2013-12", text: "", skills: [],
    },
  ];
  const POOLED = { label: "pooled estimate", where: "data & ml", start: "2019-06" };

  const LANGUAGES = [
    // native script, english, proficiency, ILR-like level 0..5, greeting
    { script: "Հայերեն", name: "Armenian", level: 5, note: "native or bilingual", hello: "Բարև" },
    { script: "Русский", name: "Russian", level: 5, note: "native or bilingual", hello: "Привет" },
    { script: "English", name: "English", level: 4, note: "full professional", hello: "Hello" },
    { script: "Ελληνικά", name: "Greek", level: 2, note: "limited working", hello: "Γειά σου" },
  ];

  const INTERESTS = ["history", "music", "philosophy", "science", "linux ricing"];

  const PROJECTS = {
    newsletter: {
      name: "NewsPEPper", kicker: "weekly python newsletter",
      about: "PEPs and Python releases, summarized every saturday.",
      href: "https://newspepper.dev/#subscribe-email",
    },
    philosophy: { name: "map of philosophy", about: "a tool for philosophy enthusiasts", status: "in development" },
    extension: {
      name: "jumpwise", kind: "vs code extension",
      about: "intelligent navigation between symbols in your code files.",
      href: "https://marketplace.visualstudio.com/items?itemName=markakritas.jumpwise",
    },
  };

  // thinkers in rough chronological order, and who read whom
  const THINKERS = ["heraclitus", "parmenides", "socrates", "plato", "aristotle", "augustine", "aquinas",
    "descartes", "spinoza", "hume", "kant", "schopenhauer", "nietzsche", "wittgenstein"];
  const INFLUENCES = [
    ["heraclitus", "plato"], ["parmenides", "plato"], ["socrates", "plato"], ["plato", "aristotle"],
    ["plato", "augustine"], ["aristotle", "aquinas"], ["augustine", "aquinas"], ["aquinas", "descartes"],
    ["descartes", "spinoza"], ["hume", "kant"], ["kant", "schopenhauer"], ["schopenhauer", "nietzsche"],
    ["spinoza", "nietzsche"], ["schopenhauer", "wittgenstein"],
  ];

  // daily rotations (same lists and same pick as the profile, so both agree each day)
  const QUOTES = [
    ["Essentially, all models are wrong, but some are useful.", "George E. P. Box"],
    ["The first principle is that you must not fool yourself — and you are the easiest person to fool.", "Richard Feynman"],
    ["Nothing in biology makes sense except in the light of evolution.", "Theodosius Dobzhansky"],
    ["We are a way for the cosmos to know itself.", "Carl Sagan"],
    ["The limits of my language mean the limits of my world.", "Ludwig Wittgenstein"],
    ["Whereof one cannot speak, thereof one must be silent.", "Ludwig Wittgenstein"],
    ["Mathematics is the art of giving the same name to different things.", "Henri Poincaré"],
    ["What I cannot create, I do not understand.", "Richard Feynman"],
    ["The universe is not only queerer than we suppose, but queerer than we can suppose.", "J. B. S. Haldane"],
    ["Far better an approximate answer to the right question, which is often vague, than an exact answer to the wrong question, which can always be made precise.", "John Tukey"],
    ["The purpose of computing is insight, not numbers.", "Richard Hamming"],
    ["It is a capital mistake to theorize before one has data.", "Arthur Conan Doyle"],
    ["If you torture the data long enough, it will confess.", "Ronald Coase"],
    ["One must imagine Sisyphus happy.", "Albert Camus"],
    ["He who has a why to live can bear almost any how.", "Friedrich Nietzsche"],
    ["The map is not the territory.", "Alfred Korzybski"],
    ["The unexamined life is not worth living.", "Socrates"],
    ["If I have seen further it is by standing on the shoulders of Giants.", "Isaac Newton"],
    ["The theory of probabilities is at bottom nothing but common sense reduced to calculus.", "Pierre-Simon Laplace"],
    ["We are all in the gutter, but some of us are looking at the stars.", "Oscar Wilde"],
    ["The Cosmos is all that is or ever was or ever will be.", "Carl Sagan"],
    ["Nature uses only the longest threads to weave her patterns, so that each small piece of her fabric reveals the organization of the entire tapestry.", "Richard Feynman"],
    ["Everything flows.", "Heraclitus"],
    ["Biology is the study of complicated things that give the appearance of having been designed for a purpose.", "Richard Dawkins"],
    ["Not everything that can be counted counts, and not everything that counts can be counted.", "William Bruce Cameron"],
    ["The greatest value of a picture is when it forces us to notice what we never expected to see.", "John Tukey"],
    ["Two things fill the mind with ever new and increasing admiration and awe: the starry heavens above me and the moral law within me.", "Immanuel Kant"],
    ["The most beautiful thing we can experience is the mysterious.", "Albert Einstein"],
    ["Equipped with his five senses, man explores the universe around him and calls the adventure Science.", "Edwin Hubble"],
    ["My formula for greatness in a human being is amor fati.", "Friedrich Nietzsche"],
    ["I think, therefore I am.", "René Descartes"],
  ];
  const EQUATIONS = [
    ["P(θ|x) = P(x|θ) · P(θ) / P(x)", "bayes' theorem"],
    ["e^(iπ) + 1 = 0", "euler's identity"],
    ["iħ ∂ψ/∂t = Ĥψ", "schrödinger equation"],
    ["S = k · log W", "boltzmann entropy"],
    ["H(X) = −∑ p(x) log p(x)", "shannon entropy"],
    ["E = mc²", "mass–energy equivalence"],
    ["Gμν + Λgμν = (8πG/c⁴) Tμν", "einstein field equations"],
    ["∇ · E = ρ / ε₀", "gauss's law"],
    ["Δx · Δp ≥ ħ/2", "heisenberg uncertainty"],
    ["p² + 2pq + q² = 1", "hardy–weinberg equilibrium"],
    ["x[n+1] = r · x[n] · (1 − x[n])", "logistic map"],
    ["dx/dt = σ(y − x)", "lorenz system"],
    ["θ ← θ − η ∇L(θ)", "gradient descent"],
    ["softmax(QK⊤ / √d) V", "scaled dot-product attention"],
    ["v = Vmax [S] / (Km + [S])", "michaelis–menten kinetics"],
    ["H² = 8πGρ/3 − kc²/a² + Λc²/3", "friedmann equation"],
    ["v = H₀ d", "hubble–lemaître law"],
    ["F(ξ) = ∫ f(x) e^(−2πixξ) dx", "fourier transform"],
    ["dx/dt = αx − βxy", "lotka–volterra"],
    ["dS ≥ δQ / T", "second law of thermodynamics"],
    ["F = G m₁m₂ / r²", "newton's law of gravitation"],
    ["E = hν", "planck relation"],
    ["β = (X′X)⁻¹ X′y", "ordinary least squares"],
    ["φ = (1 + √5) / 2", "golden ratio · phyllotaxis"],
    ["D(P‖Q) = ∑ P(x) log P(x)/Q(x)", "kullback–leibler divergence"],
  ];

  // ── derived tables ────────────────────────────────────────────────────
  const years = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    return y + (m - 1) / 12;
  };
  const skillIndex = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
  for (const s of SKILLS) {
    s.roles = CAREER.filter((r) => r.skills.includes(s.id));
    s.magnitude = s.roles.length;
    const first = Math.min(...s.roles.map((r) => years(r.start)));
    s.firstLight = Math.max(s.since ?? -Infinity, first);
  }

  /** python's date.toordinal(), on the visitor's local calendar day */
  function ordinal(d = new Date()) {
    const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor(utc / 86400000) + 719163;
  }
  /** same deterministic daily pick as content.of_the_day in the profile */
  const ofTheDay = (items, salt = 0, d = new Date()) => items[(ordinal(d) * 7 + salt) % items.length];

  return {
    NAME: "Mark Akritas",
    ROLE: "data scientist · ml & ai engineer",
    TAGLINE: "fitting models to a noisy universe.",
    FAMILIES, SKILLS, skillIndex, GROUPS, CAREER, POOLED, LANGUAGES, INTERESTS, PROJECTS,
    THINKERS, INFLUENCES, QUOTES, EQUATIONS, years, ofTheDay,
  };
})();
