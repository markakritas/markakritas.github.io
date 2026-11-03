# markakritas.github.io

Mark Akritas's resume, typeset like a preprint and drawn with live figures: a Lorenz attractor you can rotate, a career scored as a piano roll, the stack charted as a star atlas, languages recorded as signals, and Ararat redrawn by Fourier circles. It uses the gruvbox palettes and Maple Mono of the [profile README](https://github.com/markakritas/markakritas). Light by default; `:set bg=dark` in the top bar (or `t`) switches. No frameworks and no build step.

| file | what it is |
| :-- | :-- |
| `index.html` | the page: structure and prose |
| `data.js` | everything the figures draw: roles, skills, languages, quotes (mirrors `scripts/content.py` in the profile repo) |
| `lib.js` | shared helpers: palette, render loop, lorenz/dft/marching-squares maths |
| `site.js` | every interactive figure on `index.html` |
| `style.css` | the paper, the plates, the layout, both themes |
| `print.html` | the source of the preprint PDF (static versions of the figures) |
| `mark-akritas-resume.pdf` | the classic, professional resume |
| `mark-akritas-resume-preprint.pdf` | the preprint edition, built from `print.html` |
| `*.woff2`, `OFL-*.txt` | Maple Mono and a JetBrains Mono fallback for maths glyphs, subset, under the SIL OFL |
| `v1/` | the first edition, 2018 |

## editing

Roles, dates, descriptions and the skills each role used live in `data.js`; the piano roll, the star atlas (first light and magnitude are derived from those tags), both job lists and the PDF all read from it. Prose such as the abstract and captions is in `index.html` and `print.html`.

## rebuilding the preprint PDF

Serve the folder (`python3 -m http.server`), open `http://localhost:8000/print.html` in Chrome, and print to PDF with paper A4, margins none and background graphics on. Or headless:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --virtual-time-budget=4000 --print-to-pdf=mark-akritas-resume-preprint.pdf http://localhost:8000/print.html
```
