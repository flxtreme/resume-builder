/* ============================================================
   Felix Ruz Resume Builder — index.js
   - Tiny mustache-like templating engine ({{field}}, {{#each}}, {{#if}})
   - Loads default.frrt as the resume template
   - Sidebar form (desktop) / drawer (mobile) editor
   - Markdown (.md) upload prefill
   - Live preview via iframe (srcdoc) so template's own <style> stays isolated
   - Print button prints the rendered template
   ============================================================ */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     0. TEMPLATE REGISTRY
     Add more entries here as new .frrt templates are created —
     the picker in the sidebar will automatically turn into a
     dropdown once there's more than one.
  --------------------------------------------------------- */
  const templates = [
    { name: "Default", path: "./templates/default.frrt" },
    { name: "Basic", path: "./templates/basic.frrt" }
  ];
  let activeTemplateIndex = 0;

  /* ---------------------------------------------------------
     1. TEMPLATE ENGINE
  --------------------------------------------------------- */
  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---- Tokenizer + recursive-descent parser so nested {{#each}}/{{#if}}
  // blocks (e.g. {{#each bullets}} inside {{#each experience}}) resolve
  // against the correct matching closing tag instead of the first one found.
  const TOKEN_RE = /{{(#each|#if|\/each|\/if)\s*([\w.]*)\s*}}|{{([\w.]+)}}/g;

  function tokenize(tpl) {
    const tokens = [];
    let lastIndex = 0;
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(tpl)) !== null) {
      if (m.index > lastIndex) tokens.push({ type: "text", value: tpl.slice(lastIndex, m.index) });
      if (m[1] === "#each") tokens.push({ type: "openEach", key: m[2] });
      else if (m[1] === "#if") tokens.push({ type: "openIf", key: m[2] });
      else if (m[1] === "/each") tokens.push({ type: "closeEach" });
      else if (m[1] === "/if") tokens.push({ type: "closeIf" });
      else tokens.push({ type: "var", key: m[3] });
      lastIndex = TOKEN_RE.lastIndex;
    }
    if (lastIndex < tpl.length) tokens.push({ type: "text", value: tpl.slice(lastIndex) });
    return tokens;
  }

  // Builds a nested AST from the flat token stream using a stack, so each
  // {{/each}} / {{/if}} closes its *nearest* matching open tag.
  function parse(tokens) {
    const root = { type: "root", children: [] };
    const stack = [root];
    tokens.forEach(function (tok) {
      const top = stack[stack.length - 1];
      if (tok.type === "openEach" || tok.type === "openIf") {
        const node = { type: tok.type, key: tok.key, children: [] };
        top.children.push(node);
        stack.push(node);
      } else if (tok.type === "closeEach" || tok.type === "closeIf") {
        if (stack.length > 1) stack.pop();
      } else {
        top.children.push(tok);
      }
    });
    return root;
  }

  function renderNodes(nodes, data) {
    return nodes
      .map(function (node) {
        if (node.type === "text") return node.value;
        if (node.type === "var") return escapeHtml(resolve(data, node.key));
        if (node.type === "openIf") {
          const val = resolve(data, node.key);
          const truthy = Array.isArray(val) ? val.length > 0 : !!val;
          return truthy ? renderNodes(node.children, data) : "";
        }
        if (node.type === "openEach") {
          const arr = resolve(data, node.key);
          if (!Array.isArray(arr) || arr.length === 0) return "";
          return arr
            .map(function (item, idx) {
              const ctx = Object.assign({}, item, { first: idx === 0 });
              return renderNodes(node.children, ctx);
            })
            .join("");
        }
        return "";
      })
      .join("");
  }

  function renderTemplate(tpl, data) {
    const ast = parse(tokenize(tpl));
    return renderNodes(ast.children, data);
  }

  function resolve(obj, path) {
    return path.split(".").reduce(function (acc, k) {
      return acc && acc[k] !== undefined ? acc[k] : undefined;
    }, obj);
  }

  /* ---------------------------------------------------------
     2. STATE / DATA MODEL
  --------------------------------------------------------- */
  const TECH_COLORS = {
    react: ["#20232a", "#61DAFB"], "next.js": ["#000000", "#ffffff"], nextjs: ["#000000", "#ffffff"],
    tailwind: ["#38BDF8", "#ffffff"], vite: ["#646CFF", "#ffffff"], angular: ["#DD0031", "#ffffff"],
    flutter: ["#02569B", "#ffffff"], "node.js": ["#339933", "#ffffff"], nodejs: ["#339933", "#ffffff"],
    nestjs: ["#E0234E", "#ffffff"], fastify: ["#000000", "#ffffff"], express: ["#000000", "#ffffff"],
    postgresql: ["#336791", "#ffffff"], drizzle: ["#C5F74F", "#000000"], prisma: ["#2D3748", "#ffffff"],
    bigquery: ["#4285F4", "#ffffff"], rest: ["#e2e8f0", "#475569"], soap: ["#e2e8f0", "#475569"],
    "google cloud": ["#4285F4", "#ffffff"], "cloud firestore": ["#FFCA28", "#000000"],
    "pub/sub": ["#4285F4", "#ffffff"], git: ["#e2e8f0", "#475569"], gitlab: ["#e2e8f0", "#475569"],
    "ci/cd": ["#e2e8f0", "#475569"], claude: ["#D97757", "#ffffff"], cursor: ["#000000", "#ffffff"],
    gemini: ["#1a73e8", "#ffffff"], "github copilot": ["#000000", "#ffffff"], antigravity: ["#e2e8f0", "#475569"],
    "vibe coding": ["#e2e8f0", "#475569"], jira: ["#0052CC", "#ffffff"], postman: ["#FF6C37", "#ffffff"],
    figma: ["#F24E1E", "#ffffff"]
  };

  function colorFor(label) {
    const c = TECH_COLORS[label.trim().toLowerCase()];
    return c ? { bg: c[0], color: c[1] } : { bg: "#e2e8f0", color: "#475569" };
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function defaultData() {
    return {
      name: "Felix Ruz",
      phone: "+63 950 345 9931",
      email: "flxrzjr@gmail.com",
      location: "Lucena City, Philippines",
      summary:
        "Software Engineer and Agentic Engineer with nearly 8 years of experience delivering high-impact web and mobile applications for global teams. I practice agentic engineering, leveraging AI tools to automate development workflows, accelerate delivery cycles, and consistently ship high-quality software. My approach balances technical full-stack expertise with AI-driven methodologies to build robust digital products that drive business value.",
      techStackRaw: [
        { id: uid(), category: "Frontend", tags: "React, Next.js, Tailwind, Vite, Angular, Flutter" },
        { id: uid(), category: "Backend", tags: "Node.js, NestJS, Fastify, Express, PostgreSQL, Drizzle, Prisma, BigQuery, REST, SOAP" },
        { id: uid(), category: "Cloud & DevOps", tags: "Google Cloud, Cloud Firestore, Pub/Sub, Git, GitLab, CI/CD" },
        { id: uid(), category: "AI & Agentic Tools", tags: "Claude, Cursor, Gemini, GitHub Copilot, Antigravity, Vibe Coding" },
        { id: uid(), category: "Tools & Design", tags: "Jira, Postman, Figma" }
      ],
      certifications: [
        { id: uid(), title: "ITIL Foundation Certificate", subtitle: "IT Service Management", issuer: "PeopleCert", date: "March 2025" }
      ],
      education: [
        { id: uid(), degree: "BS in Information Technology", school: "Dalubhasaan ng Lungsod ng Lucena", year: "2018" }
      ],
      interests: ["WFH Setup", "Visa Sponsorship", "Australia"],
      experience: [
        {
          id: uid(),
          title: "Software Engineer",
          company: "AirAsia Philippines, Inc.",
          location: "Philippines",
          employmentLocation: "Remote",
          type: "Regular",
          dates: "Nov 2022 – Present",
          bullets: [
            "Pioneered AI-assisted and vibe coding workflows on the team, accelerating development cycles and elevating code quality.",
            "Pioneered development of an internal airline system and co-led the development of its pricing module.",
            "Engineered a data sync service that fetches Workday updates, persists them to a central database, and propagates changes to downstream applications.",
            "Revamped a Vite module-federated flight scheduling app, integrating 25 report modules each with distinct UI, data sources, and Excel and PDF exports.",
            "Enhanced seat and baggage recommendation engines on AirAsia Move, implementing sit-together and child-adult pairing logic that drove ancillary sales uplift.",
            "Shipped a real-time airport operations monitoring application covering all AirAsia airports, enabling flight operations and network teams to surface and escalate live issues faster.",
            "Developed a Workvivo chatbot with self-service features including ISR creation, password reset, and account unlock, with live agent transfer support.",
            "Built a C-Level KPI dashboard with 100+ BigQuery queries and LLM-generated insights per chart for executive visibility.",
            "Delivered a pilot training tracker application for AirAsia with offline-first capabilities, allowing pilots to log and monitor training progress during flights and sync data upon reconnection.",
            "Created a crew portal for tracking sales, commissions, and flight schedules, with data sourced from BigQuery.",
            "Developed a recruitment application that pulls job postings from Workday, allows users to create hiring events with shareable applicant form links and custom email templates, and syncs candidate assessments back to Workday.",
            "Collaborated with Malaysia-based developers on cross-functional projects, including on-site work and training in Kuala Lumpur."
          ].join("\n")
        },
        {
          id: uid(),
          title: "Flutter Developer",
          company: "Ben Edictio Corp.",
          location: "Philippines",
          employmentLocation: "Remote",
          type: "Regular",
          dates: "Nov 2021 – Nov 2022",
          bullets: [
            "Assigned to Indra Philippines, Inc. as Flutter Developer; later seconded to AirAsia as Software Engineer and subsequently absorbed.",
            "Helped develop, debug, test, and maintain applications used by thousands of AirAsia users."
          ].join("\n")
        },
        {
          id: uid(),
          title: "Mobile Developer",
          company: "Bookdis Technology",
          location: "Philippines",
          employmentLocation: "On-site",
          type: "Regular",
          dates: "Jun 2020 – Oct 2021",
          bullets: [
            "Led the development of multiple Flutter mobile applications aligned with a food delivery service, including pricing logic and Google Maps integration.",
            "Built an order monitoring website to track and manage ongoing deliveries in real time.",
            "Translated UI/UX designs into smooth and user-friendly interfaces across mobile and web."
          ].join("\n")
        },
        {
          id: uid(),
          title: "Freelance Web Developer",
          company: "Oolong Media & Social Garden",
          location: "Canada / Australia",
          employmentLocation: "Remote",
          type: "Freelance",
          dates: "Aug 2018 – Feb 2020",
          bullets: [
            "Converted PSD and design mockups into custom WordPress pages and templates for Oolong Media.",
            "Built responsive Gravity Forms with dynamic fields to capture marketing leads effectively.",
            "Optimized WordPress sites through image deferring, performance tuning, and page speed testing.",
            "Maintained WordPress sites by keeping plugins up to date and ensuring overall stability.",
            "Built Unbounce landing pages for Social Garden's real estate developer clients, showcasing properties and floor plans.",
            "Built custom dynamic Unbounce forms to capture and convert leads."
          ].join("\n")
        }
      ]
    };
  }

  let TEMPLATE_HTML = "";
  let state = defaultData();

  /* ---------------------------------------------------------
     3. LOAD TEMPLATE (default.frrt) + INITIAL RENDER
  --------------------------------------------------------- */
  async function loadTemplate() {
    const entry = templates[activeTemplateIndex];
    try {
      const res = await fetch(entry.path);
      if (!res.ok) throw new Error("HTTP " + res.status);
      TEMPLATE_HTML = await res.text();
    } catch (e) {
      console.error("Could not load template: " + entry.path, e);
      TEMPLATE_HTML = "<p>Could not load template (" + entry.path + "). Serve this folder over HTTP.</p>";
    }
  }

  async function switchTemplate(index) {
    activeTemplateIndex = index;
    await loadTemplate();
    renderPreview();
  }

  /* ---------------------------------------------------------
     4. BUILD VIEWMODEL FOR TEMPLATE FROM STATE
  --------------------------------------------------------- */
  function buildViewModel() {
    const techStack = state.techStackRaw
      .filter(function (c) { return c.category && c.tags; })
      .map(function (c) {
        const items = c.tags.split(",").map(function (t) { return t.trim(); }).filter(Boolean).map(function (label) {
          const col = colorFor(label);
          return { label: label, bg: col.bg, color: col.color };
        });
        return { category: c.category, items: items };
      });

    const experience = state.experience.map(function (job) {
      const bulletLines = (job.bullets || "").split("\n").map(function (b) { return b.trim(); }).filter(Boolean);
      return {
        title: job.title,
        company: job.company,
        location: job.location,
        employmentLocation: job.employmentLocation,
        remote: !!job.employmentLocation,
        type: job.type,
        dates: job.dates,
        bullets: bulletLines.map(function (text) { return { text: text }; })
      };
    });

    const interests = (state.interests || []).map(function (label) { return { label: label }; });

    return {
      name: state.name,
      phone: state.phone,
      email: state.email,
      location: state.location,
      summary: state.summary,
      techStack: techStack,
      certifications: state.certifications,
      education: state.education,
      interests: interests,
      hasInterests: interests.length > 0,
      experience: experience
    };
  }

  /* ---------------------------------------------------------
     5. RENDER PREVIEW (iframe srcdoc keeps the template's own
        <style> fully isolated from the app's UI styles)
  --------------------------------------------------------- */
  function renderPreview() {
    const vm = buildViewModel();
    const html = renderTemplate(TEMPLATE_HTML, vm);
    const iframe = document.getElementById("preview-frame");
    iframe.srcdoc = html;
    window.__lastRenderedHtml = html; // used by print
  }

  /* ---------------------------------------------------------
     6. SIDEBAR FORM RENDERING
  --------------------------------------------------------- */
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function field(labelText, inputEl) {
    const wrap = el("label", { class: "field" }, [el("span", { class: "field-label", text: labelText })]);
    wrap.appendChild(inputEl);
    return wrap;
  }

  function textInput(value, onChange, placeholder) {
    const input = el("input", { type: "text", class: "input", placeholder: placeholder || "" });
    input.value = value || "";
    input.addEventListener("input", function () { onChange(input.value); renderPreview(); });
    return input;
  }

  function textArea(value, onChange, rows) {
    const ta = el("textarea", { class: "input textarea", rows: String(rows || 3) });
    ta.value = value || "";
    ta.addEventListener("input", function () { onChange(ta.value); renderPreview(); });
    return ta;
  }

  function buildSidebar() {
    const root = document.getElementById("sidebar-content");
    root.innerHTML = "";
    root.appendChild(buildTemplateSection());
    root.appendChild(buildPersonalSection());
    root.appendChild(buildExperienceSection());
    root.appendChild(buildTechStackSection());
    root.appendChild(buildCertificationSection());
    root.appendChild(buildEducationSection());
    root.appendChild(buildInterestsSection());
  }

  function buildTemplateSection() {
    const body = el("div", { class: "section-body" });

    const select = el("select", { class: "input" });
    templates.forEach(function (t, idx) {
      const opt = el("option", { value: String(idx), text: t.name });
      if (idx === activeTemplateIndex) opt.setAttribute("selected", "selected");
      select.appendChild(opt);
    });
    select.addEventListener("change", function () {
      switchTemplate(Number(select.value));
    });
    body.appendChild(field("Choose a template", select));

    return sectionShell("Template", body);
  }

  function sectionShell(title, contentNode, onAdd, addLabel) {
    const header = el("div", { class: "section-header" }, [
      el("h3", { class: "section-title", text: title })
    ]);
    if (onAdd) {
      header.appendChild(
        el("button", { class: "btn-add", type: "button", onclick: onAdd, text: "+ " + addLabel })
      );
    }
    return el("section", { class: "side-section" }, [header, contentNode]);
  }

  function buildPersonalSection() {
    const body = el("div", { class: "section-body" });
    body.appendChild(field("Full name", textInput(state.name, function (v) { state.name = v; })));
    body.appendChild(field("Phone", textInput(state.phone, function (v) { state.phone = v; })));
    body.appendChild(field("Email", textInput(state.email, function (v) { state.email = v; })));
    body.appendChild(field("Location", textInput(state.location, function (v) { state.location = v; })));
    body.appendChild(field("Summary", textArea(state.summary, function (v) { state.summary = v; }, 5)));
    return sectionShell("Personal Details", body);
  }

  function buildExperienceSection() {
    const body = el("div", { class: "section-body" });
    state.experience.forEach(function (job, idx) {
      body.appendChild(buildExperienceCard(job, idx));
    });
    return sectionShell("Experience", body, function () {
      state.experience.push({
        id: uid(), title: "", company: "", location: "", employmentLocation: "Remote",
        type: "Regular", dates: "", bullets: ""
      });
      buildSidebar();
      renderPreview();
    }, "Add job");
  }

  function buildExperienceCard(job, idx) {
    const card = el("div", { class: "card" });
    const head = el("div", { class: "card-head" }, [
      el("span", { class: "card-num", text: "#" + (idx + 1) }),
      el("button", { class: "btn-remove", type: "button", title: "Remove", onclick: function () {
        state.experience.splice(idx, 1); buildSidebar(); renderPreview();
      }, text: "✕" })
    ]);
    card.appendChild(head);
    card.appendChild(field("Job title", textInput(job.title, function (v) { job.title = v; })));
    card.appendChild(field("Company", textInput(job.company, function (v) { job.company = v; })));
    card.appendChild(field("Location", textInput(job.location, function (v) { job.location = v; })));
    card.appendChild(field("Work mode (e.g. Remote / On-site)", textInput(job.employmentLocation, function (v) { job.employmentLocation = v; })));
    card.appendChild(field("Type (e.g. Regular / Freelance)", textInput(job.type, function (v) { job.type = v; })));
    card.appendChild(field("Dates (e.g. Nov 2022 – Present)", textInput(job.dates, function (v) { job.dates = v; })));
    card.appendChild(field("Bullet points (one per line)", textArea(job.bullets, function (v) { job.bullets = v; }, 6)));
    return card;
  }

  function buildTechStackSection() {
    const body = el("div", { class: "section-body" });
    state.techStackRaw.forEach(function (cat, idx) {
      const card = el("div", { class: "card" });
      card.appendChild(el("div", { class: "card-head" }, [
        el("span", { class: "card-num", text: "#" + (idx + 1) }),
        el("button", { class: "btn-remove", type: "button", title: "Remove", onclick: function () {
          state.techStackRaw.splice(idx, 1); buildSidebar(); renderPreview();
        }, text: "✕" })
      ]));
      card.appendChild(field("Category", textInput(cat.category, function (v) { cat.category = v; })));
      card.appendChild(field("Tags (comma separated)", textArea(cat.tags, function (v) { cat.tags = v; }, 2)));
      body.appendChild(card);
    });
    return sectionShell("Tech Stack", body, function () {
      state.techStackRaw.push({ id: uid(), category: "", tags: "" });
      buildSidebar();
      renderPreview();
    }, "Add category");
  }

  function buildCertificationSection() {
    const body = el("div", { class: "section-body" });
    state.certifications.forEach(function (cert, idx) {
      const card = el("div", { class: "card" });
      card.appendChild(el("div", { class: "card-head" }, [
        el("span", { class: "card-num", text: "#" + (idx + 1) }),
        el("button", { class: "btn-remove", type: "button", title: "Remove", onclick: function () {
          state.certifications.splice(idx, 1); buildSidebar(); renderPreview();
        }, text: "✕" })
      ]));
      card.appendChild(field("Title", textInput(cert.title, function (v) { cert.title = v; })));
      card.appendChild(field("Subtitle", textInput(cert.subtitle, function (v) { cert.subtitle = v; })));
      card.appendChild(field("Issuer", textInput(cert.issuer, function (v) { cert.issuer = v; })));
      card.appendChild(field("Date", textInput(cert.date, function (v) { cert.date = v; })));
      body.appendChild(card);
    });
    return sectionShell("Certification", body, function () {
      state.certifications.push({ id: uid(), title: "", subtitle: "", issuer: "", date: "" });
      buildSidebar();
      renderPreview();
    }, "Add certification");
  }

  function buildEducationSection() {
    const body = el("div", { class: "section-body" });
    state.education.forEach(function (edu, idx) {
      const card = el("div", { class: "card" });
      card.appendChild(el("div", { class: "card-head" }, [
        el("span", { class: "card-num", text: "#" + (idx + 1) }),
        el("button", { class: "btn-remove", type: "button", title: "Remove", onclick: function () {
          state.education.splice(idx, 1); buildSidebar(); renderPreview();
        }, text: "✕" })
      ]));
      card.appendChild(field("Degree", textInput(edu.degree, function (v) { edu.degree = v; })));
      card.appendChild(field("School", textInput(edu.school, function (v) { edu.school = v; })));
      card.appendChild(field("Year", textInput(edu.year, function (v) { edu.year = v; })));
      body.appendChild(card);
    });
    return sectionShell("Education", body, function () {
      state.education.push({ id: uid(), degree: "", school: "", year: "" });
      buildSidebar();
      renderPreview();
    }, "Add education");
  }

  function buildInterestsSection() {
    const body = el("div", { class: "section-body" });
    body.appendChild(field("Interests (comma separated)", textArea(
      (state.interests || []).join(", "),
      function (v) { state.interests = v.split(",").map(function (s) { return s.trim(); }).filter(Boolean); },
      2
    )));
    return sectionShell("Interests", body);
  }

  /* ---------------------------------------------------------
     7. MARKDOWN UPLOAD -> PREFILL
  --------------------------------------------------------- */
  function parseMarkdownResume(md) {
    const data = defaultData();
    data.techStackRaw = [];
    data.certifications = [];
    data.education = [];
    data.experience = [];
    data.interests = [];

    const lines = md.split("\n");

    // Name: first level-1 heading
    const nameMatch = md.match(/^#\s+(.+)$/m);
    if (nameMatch) data.name = nameMatch[1].trim();

    // Contact line: phone | email | location  (first line with "|" near the top)
    const contactLine = lines.find(function (l) { return l.includes("|") && /@|\+?\d{3,}/.test(l); });
    if (contactLine) {
      const parts = contactLine.split("|").map(function (s) { return s.trim().replace(/\*\*/g, ""); });
      parts.forEach(function (p) {
        if (/@/.test(p)) data.email = p;
        else if (/\d{3,}/.test(p)) data.phone = p;
        else if (p) data.location = p;
      });
    }

    // Sections by ## heading
    const sectionRegex = /^##\s+(.+)$/gm;
    const sections = [];
    let m;
    while ((m = sectionRegex.exec(md)) !== null) {
      sections.push({ title: m[1].trim().toLowerCase(), start: m.index, headerLen: m[0].length });
    }
    sections.forEach(function (s, i) {
      const end = i + 1 < sections.length ? sections[i + 1].start : md.length;
      s.body = md.slice(s.start + s.headerLen, end).trim();
    });

    function findSection(name) {
      return sections.find(function (s) { return s.title.indexOf(name) !== -1; });
    }

    // Summary = paragraph right after the contact line, before first ## heading
    const firstSectionStart = sections.length ? sections[0].start : md.length;
    const headerEnd = md.search(/\n##\s/);
    const introBlock = md.slice(0, firstSectionStart);
    const introLines = introBlock.split("\n").map(function (l) { return l.trim(); });
    const summaryLine = introLines.reverse().find(function (l) {
      return l && !l.startsWith("#") && !l.includes("|") && !/^\+?\d/.test(l);
    });
    if (summaryLine) data.summary = summaryLine;

    // Tech stack
    const techSection = findSection("core tech stack") || findSection("tech stack");
    if (techSection) {
      const catRegex = /\*\*(.+?):\*\*\s*(.+)/g;
      let cm;
      while ((cm = catRegex.exec(techSection.body)) !== null) {
        data.techStackRaw.push({ id: uid(), category: cm[1].trim(), tags: cm[2].trim() });
      }
    }

    // Certification
    const certSection = findSection("certification");
    if (certSection) {
      const titleM = certSection.body.match(/\*\*(.+?)\*\*/);
      const restLines = certSection.body.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      let issuer = "", date = "", subtitle = "";
      if (titleM) {
        const titleLine = titleM[1];
        if (titleLine.includes("–") || titleLine.includes("-")) {
          const sp = titleLine.split(/[–-]/);
          subtitle = sp.slice(1).join("-").trim();
        }
      }
      const issuerLine = restLines.find(function (l) { return l.includes("•"); });
      if (issuerLine) {
        const sp = issuerLine.split("•");
        issuer = sp[0].trim();
        date = (sp[1] || "").replace(/\*/g, "").trim();
      }
      data.certifications.push({
        id: uid(),
        title: titleM ? titleM[1].split(/[–-]/)[0].trim() : "",
        subtitle: subtitle,
        issuer: issuer,
        date: date
      });
    }

    // Education
    const eduSection = findSection("education");
    if (eduSection) {
      const degreeM = eduSection.body.match(/\*\*(.+?)\*\*/);
      const lines2 = eduSection.body.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      data.education.push({
        id: uid(),
        degree: degreeM ? degreeM[1].trim() : "",
        school: lines2[1] || "",
        year: (lines2[2] || "").replace(/,/g, "").trim()
      });
    }

    // Interests
    const intSection = findSection("interests");
    if (intSection) {
      data.interests = intSection.body.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    }

    // Experience
    const expSection = findSection("experience");
    if (expSection) {
      const jobBlocks = expSection.body.split(/^###\s+/m).filter(Boolean);
      jobBlocks.forEach(function (block) {
        const headerLine = block.split("\n")[0].trim();
        const rest = block.split("\n").slice(1).join("\n").trim();
        const restLines = rest.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);

        let title = headerLine, company = "";
        const pipeIdx = headerLine.indexOf("|");
        if (pipeIdx !== -1) {
          title = headerLine.slice(0, pipeIdx).trim();
          company = headerLine.slice(pipeIdx + 1).trim();
        }

        let metaLine = restLines.find(function (l) { return l.includes("·"); }) || "";
        const metaParts = metaLine.split("·").map(function (s) { return s.trim(); });
        const location = metaParts[0] || "";
        const employmentLocation = metaParts[1] || "";
        const type = metaParts[2] || "";
        const dates = metaParts[3] || "";

        const bullets = restLines
          .filter(function (l) { return l.startsWith("-"); })
          .map(function (l) { return l.replace(/^-+\s*/, "").trim(); })
          .join("\n");

        data.experience.push({
          id: uid(), title: title, company: company, location: location,
          employmentLocation: employmentLocation, type: type, dates: dates, bullets: bullets
        });
      });
    }

    return data;
  }

  function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = parseMarkdownResume(e.target.result);
        state = parsed;
        buildSidebar();
        renderPreview();
        showToast("Resume loaded from " + file.name);
      } catch (err) {
        console.error(err);
        showToast("Could not parse that file. Check the console.", true);
      }
    };
    reader.readAsText(file);
  }

  function showToast(msg, isError) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.toggle("toast-error", !!isError);
    t.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { t.classList.remove("show"); }, 3000);
  }

  /* ---------------------------------------------------------
     8. PRINT
  --------------------------------------------------------- */
  function printResume() {
    const iframe = document.getElementById("preview-frame");
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }

  /* ---------------------------------------------------------
     9. DRAWER (mobile sidebar)
  --------------------------------------------------------- */
  function setupDrawer() {
    const drawer = document.getElementById("sidebar");
    const overlay = document.getElementById("drawer-overlay");
    const openBtn = document.getElementById("open-drawer-btn");
    const closeBtn = document.getElementById("close-drawer-btn");

    function open() { drawer.classList.add("open"); overlay.classList.add("show"); }
    function close() { drawer.classList.remove("open"); overlay.classList.remove("show"); }

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);
  }

  /* ---------------------------------------------------------
     10. INIT
  --------------------------------------------------------- */
  async function init() {
    await loadTemplate();
    buildSidebar();
    renderPreview();
    setupDrawer();

    document.getElementById("print-btn").addEventListener("click", printResume);
    document.getElementById("print-btn-mobile").addEventListener("click", printResume);

    const fileInput = document.getElementById("file-upload");
    fileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) handleFileUpload(file);
      fileInput.value = "";
    });

    document.getElementById("reset-btn").addEventListener("click", function () {
      state = defaultData();
      buildSidebar();
      renderPreview();
      showToast("Reset to default resume");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();