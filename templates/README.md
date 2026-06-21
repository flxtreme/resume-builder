# Creating a `.frrt` template

A `.frrt` file is just a **full HTML document** (your own `<style>`, your own layout)
with a small set of `{{ }}` placeholders that `index.js` fills in from the data
entered in the sidebar. There is no build step — the file is fetched as text and
templated in the browser.

## 1. Start from the existing template

Easiest path: copy `templates/default.frrt` to a new file and restyle it.

```
templates/
  default.frrt
  your-template-name.frrt   <-- new
```

Keep the structure (the placeholder tags below) intact — you can change anything
about the CSS, fonts, colors, spacing, and HTML markup around them.

## 2. The placeholder syntax

Three tags are supported:

| Syntax | Meaning |
|---|---|
| `{{field}}` | prints a value, escaped |
| `{{#if field}} ... {{/if}}` | renders the block only if `field` is truthy (or a non-empty array) |
| `{{#each field}} ... {{/each}}` | repeats the block once per item in the array; inside the block, fields refer to that item |

Blocks nest correctly — e.g. `{{#each experience}}` containing `{{#each bullets}}`
works fine, each `{{/each}}` closes its own matching `{{#each}}`.

## 3. Available fields

These are the only fields the engine will fill in. Anything else is up to your
own static HTML/CSS.

```
{{name}}
{{phone}}
{{email}}
{{location}}
{{summary}}

{{#each techStack}}
  {{category}}
  {{#each items}}
    {{label}} {{bg}} {{color}}      <!-- bg/color are hex strings for a badge -->
  {{/each}}
{{/each}}

{{#each certifications}}
  {{title}} {{subtitle}} {{issuer}} {{date}}
  {{#if first}} ... {{/if}}          <!-- true only for the first item -->
{{/each}}

{{#each education}}
  {{degree}} {{school}} {{year}}
  {{#if first}} ... {{/if}}
{{/each}}

{{#if hasInterests}}
  {{#each interests}}
    {{label}}
  {{/each}}
{{/if}}

{{#each experience}}
  {{title}} {{company}} {{location}} {{dates}}
  {{employmentLocation}}             <!-- e.g. "Remote" / "On-site" -->
  {{#if remote}} ... {{/if}}         <!-- true whenever employmentLocation is set -->
  {{type}}                           <!-- e.g. "Regular" / "Freelance" -->
  {{#each bullets}}
    {{text}}
  {{/each}}
{{/each}}
```

Notes:
- `{{#if first}}` inside `certifications`/`education` is a convenience for
  printing a section heading only once (see how `default.frrt` uses it to show
  "Certification" / "Education" above the first card only).
- All text values are HTML-escaped automatically — don't worry about special
  characters in user input.
- `bg` / `color` on tech-stack items come from a small color map in `index.js`
  (`TECH_COLORS`); unrecognized tags fall back to a neutral gray badge. You
  don't need to do anything with this — just style `.tech-badge` however you
  like and it'll receive an inline `background-color`/`color`.

## 4. Keep it a standalone document

Your `.frrt` file is rendered inside an `<iframe srcdoc="...">`, so:
- Include your own `<style>` in `<head>` — it stays fully isolated from the app UI.
- Don't rely on any styles/scripts from `index.html`.
- External fonts (e.g. `@import url(...)` from Google Fonts) work fine.
- Keep print styling in mind (`@media print { @page { size: A4; margin: 0; } }`)
  since the Print button calls `iframe.contentWindow.print()` directly.

## 5. Register it

Open `index.js` and add an entry to the `templates` array near the top:

```js
const templates = [
  { name: "Default", path: "./templates/default.frrt" },
  { name: "Your Template Name", path: "./templates/your-template-name.frrt" }
];
```

That's it — the "Template" dropdown in the sidebar reads from this array, so
your new template will appear as a selectable option automatically. No other
code changes are needed.

## 6. Test it

Serve the project folder over HTTP (the `.frrt` file is loaded via `fetch`,
which won't work over `file://`):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`, pick your template from the
dropdown, and confirm the preview and Print output look right.