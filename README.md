# Resume Builder

A static, no-build resume editor: edit your details in a sidebar, see a live
A4 preview on the right, and print straight to PDF. Resume content can also be
prefilled by uploading a `.md` file.

## Project structure

```
index.html              App shell — sidebar / drawer, preview pane, styles (Tailwind)
index.js                App logic — templating engine, data model, sidebar, print, .md import
templates/
  default.frrt          The default resume template
  README.md             How to create and register new .frrt templates
```

## Running it locally

The app fetches `.frrt` template files, so it needs to be served over HTTP
(opening `index.html` directly via `file://` won't work):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

## How it works

- **Sidebar** — edit Personal Details, Experience, Tech Stack, Certification,
  Education, and Interests. Changes re-render the preview instantly. On
  screens under 900px the sidebar becomes a slide-in drawer.
- **Template picker** — a dropdown at the top of the sidebar lets you choose
  which `.frrt` template renders the resume. Currently there's only one
  ("Default"); see [`/templates/README.md`](./templates/README.md) for how to
  add more.
- **Upload .md** — upload a markdown resume (matching the section headings
  used in `templates/default.frrt`) to prefill the sidebar instead of typing
  everything by hand.
- **Print** — renders the active template into an isolated iframe and calls
  the browser's print dialog, so you get a clean A4 PDF with no app UI.
- **Reset** — restores the sidebar to the built-in sample data.

## Adding a new resume template

Templates are plain HTML files with a small set of `{{ }}` placeholders,
registered in the `templates` array at the top of `index.js`. Full
instructions, the placeholder syntax, and the list of available fields are in
[`/templates/README.md`](./templates/README.md).