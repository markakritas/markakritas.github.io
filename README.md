# markakritas.github.io

![og.jpg](./assets/img/og.jpg)

Mark Akritas's resume, typeset like a preprint and drawn with live figures: a Lorenz attractor you can rotate, a career scored as a piano roll, the stack as a star atlas, a periodic table or a flow (pick with the dial), languages recorded as signals, and Ararat redrawn by Fourier circles. It uses the gruvbox palettes and Maple Mono of the [profile README](https://github.com/markakritas/markakritas). Light by default; `:set bg=dark` in the top bar (or `t`) switches. No frameworks and no build step.

```text
index.html            the page: structure and prose
404.html              not significant
data/
  cv.json             roles, skills, skill families, languages, projects
  extras.json         the philosophy map, quotes and equations of the day
assets/
  css/style.css       the paper, the plates, the layout, both themes
  js/cv.js            loads data/*.json, checks it, derives what the figures need
  js/lib.js           shared helpers: palette, render loop, lorenz / dft / marching-squares maths, the flow layout
  js/site.js          every interactive figure on index.html
  fonts/              Maple Mono, JetBrains Mono (maths), UnifrakturMaguntia, Noto Serif Armenian; subset, SIL OFL (UnifrakturMaguntia is whole, as its name is reserved)
  img/                favicon, social preview
resume/
  mark-akritas-resume.pdf            the classic, professional resume
  mark-akritas-resume-preprint.pdf   the preprint edition
  print.html                         its source
credits/              where the ideas came from (the page version of the list below)
v1/                   the first edition, 2018
```

## adding to it

Everything the figures draw comes from `data/cv.json`; the piano roll, the star atlas, both job lists and the preprint PDF are rebuilt from it on load. To add a role, add an object to `career` (roles show in file order within their group):

```json
{
  "id": "acme", "group": "industry", "role": "Senior ML Engineer", "where": "Acme",
  "org": "What Acme does", "start": "2027-03", "end": null, "main": true,
  "text": "One or two sentences on the work.",
  "skills": ["python", "llm", "rag", "docker"]
}
```

- `start` / `end` are `"YYYY-MM"`; `end: null` means ongoing. `main: true` lists the role under work experience with its text; without it the role goes under other experience.
- `skills` are ids from the `skills` list. They draw the role's chord in fig. 2 and set each star's brightness in fig. 3; a skill's first light is the start of the earliest role that lists it.
- A new skill is one line in `skills`: `{ "id": "jax", "name": "JAX", "family": "model" }`, optionally with `abbr` (its label on the atlas), `level` (basic · intermediate · good · excellent, shown under programming) or `since` (a first-light year, for tools younger than the roles that used them).
- `groups` and `families` map names to gruvbox colour tokens and set their order.
- `periodic` places every skill on the periodic-table view (`row`, `col`, `sym`); its `radioactive` series holds the soft skills, which appear on the table only.

Typos are reported in the browser console as `[data] …` warnings, such as a role listing a skill id that doesn't exist. The JSON is fetched, so preview through a server (`python3 -m http.server`), not by opening the file directly. Prose such as the abstract and the captions lives in `index.html` and `resume/print.html`, and the education cards with their sketches are in `index.html`.

## rebuilding the preprint PDF

Serve the folder, open `http://localhost:8000/resume/print.html` in Chrome, and print to PDF with paper A4, margins none and background graphics on. Or headless, from the repo root:

```sh
python3 -m http.server 8000 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --virtual-time-budget=4000 --print-to-pdf=resume/mark-akritas-resume-preprint.pdf http://localhost:8000/resume/print.html
```

## where the ideas came from

No code was copied from another website; every figure is written from scratch. The ideas all came from somewhere, though, and they are listed here and on [the credits page](https://markakritas.github.io/credits/).

### tech

- **HTML, CSS, canvas & SVG**: no frameworks and no build step; hosted on GitHub Pages, content in two JSON files.
- **Runge–Kutta (RK4)**: integrating the Lorenz twins and the double pendulum.
- **Ramer–Douglas–Peucker**: simplifying curves, as in the profile README's build script.
- **mulberry32**: the small seeded random-number generator behind every sketch.
- **Box–Muller**: the bounce off the galton board's last peg.
- **Abramowitz & Stegun 7.1.26**: the normal CDF that shapes the red bell.
- **Catmull–Rom splines**: smooth curves through hand-placed points (the Ararat skyline, the river).
- **marching squares**: the contour lines of the thesis sketch.
- **discrete Fourier transform**: the rotating circles that redraw Ararat.
- **Unicode Braille patterns**: the Lorenz attractor in the terminal card.
- **fontTools, headless Chrome**: subsetting the fonts; printing the preprint PDF.

### fonts (all SIL OFL 1.1)

- [Maple Mono](https://github.com/subframe7536/maple-font), by the Maple Mono project authors: the face of the whole page, as of the profile README.
- [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), by JetBrains: the fallback for maths symbols and arrows.
- [UnifrakturMaguntia](https://fonts.google.com/specimen/UnifrakturMaguntia), by j. 'mach' wust after Peter Wiegel: the fraktur for the German thinkers on the philosophy map.
- [Noto Serif Armenian](https://github.com/notofonts/armenian), by the Noto project authors: Մասիս and Սիս under the peaks of Ararat.

### colours

- [gruvbox](https://github.com/morhetz/gruvbox), by Pavel Pertsev (morhetz): the light and dark palettes, by way of the profile README's `paper.py`; the paper grain is a softer version of the profile's.

### design & inspiration

- [The profile README](https://github.com/markakritas/markakritas): gruvbox on grain-paper cards with crop marks, Maple Mono, the Lorenz figure, the periodic table of the stack and its noble-gas pun, the forest-plot career that became the piano roll, the network of thinkers, the quotes and equations of the day, and the NewsPEPper and jumpwise logos.
- [Giorgia Lupi](https://giorgialupi.com), the inspiration for the whole piece: data humanism and the hand-drawn feel; her [famous writers' sleep habits](https://giorgialupi.com/famous-writers-sleep-habit-and-productivity), [painters' lives](https://giorgialupi.com/visualizing-painters-lives) (with Michela Buttignol), and the [Nobel prize visualisation](https://www.themarginalian.org/2012/11/29/giorgia-lupi-noble-prizes-visualization/), after which the flow (fig. 3c) is drawn.
- Anthropic's logo animation: the monogram that unfolds from Μ·Α into ΜΑΡΚ·ΑΚΡΙΤΑΣ.
- [Edward Tufte, Tufte CSS](https://edwardtufte.github.io/tufte-css/): margin notes, margin figures, quiet typography.
- [arXiv](https://arxiv.org) preprints: the running head, the revision date, § numbers and fig. N captions.

### kindred sites

- [Bartosz Ciechanowski](https://ciechanow.ski): interactive explainers.
- [Bret Victor](https://worrydream.com): explorable explanations.
- [Nicky Case](https://ncase.me): playable essays.
- [Red Blob Games](https://www.redblobgames.com): interactive tutorials.
- [Maggie Appleton](https://maggieappleton.com): an illustrated personal site.
- [Gwern](https://gwern.net): margin notes and typography.
- [Distill](https://distill.pub): interactive ML articles.
- [Nadieh Bremer](https://www.visualcinnamon.com), [Shirley Wu](https://shirleywu.studio), [Federica Fragapane](https://www.federicafragapane.com): data art.
- [The Pudding](https://pudding.cool): visual essays.

### science & graphs

- **The Lorenz attractor**: Edward Lorenz, *Deterministic Nonperiodic Flow* (1963); the title figure and its largest Lyapunov exponent, λ₁ ≈ 0.906 (fig. 1).
- **The bean machine**: Francis Galton; the galton board behind the abstract.
- **The logistic map**: Robert May (1976) and Mitchell Feigenbaum; period doubling into chaos, behind the trajectory.
- **The golden rectangle**: the spiral sketch on the title page.
- **Forest plots and piano rolls**: the career figure, a meta-analysis plot in the profile README and a piano roll with musical dynamics (p, mf, f) here (fig. 2).
- **Atlas Coelestis**: John Flamsteed (1729), and old planispheres; the stack as a sky (fig. 3a).
- **The periodic table**: Dmitri Mendeleev (1869); the stack as elements, radioactive series included (fig. 3b).
- **Sankey diagrams**: Matthew Sankey (1898); the stack as a flow, with Lupi's hairline strands (fig. 3c).
- **Oscilloscope traces**: languages as signals (fig. 5).
- **neofetch and Linux ricing**: the terminal card and its colour swatches.
- **The double pendulum**: deterministic, unrepeatable (fig. e).
- **Fourier epicycles**, as 3Blue1Brown popularised them in *But what is a Fourier series?* (2019): Ararat redrawn by rotating circles (fig. 6).
- **Lettering**: the Armenian eternity sign, fraktur for German, Roman inscription capitals for Latin (AVGVSTINVS).
