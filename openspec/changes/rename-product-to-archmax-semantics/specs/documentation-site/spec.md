## MODIFIED Requirements

### Requirement: Static Deployment

The documentation site SHALL produce a fully static output (HTML, CSS, JS) deployable to any static hosting provider (GitHub Pages, Cloudflare Pages, Netlify).

The docs site MUST NOT be bundled into the application Docker image.

The canonical documentation domain SHALL be `semantics.archmax.ai`. The Astro `site` configuration and the repository `CNAME` file SHALL both name this domain, and every in-product and in-repository link to the documentation SHALL point at it.

#### Scenario: GitHub Pages deployment

- **WHEN** a commit is pushed to `main`
- **THEN** a GitHub Actions workflow builds the docs and deploys the static output to GitHub Pages
- **AND** the deployed site is served from `semantics.archmax.ai`

#### Scenario: Canonical URLs use the semantics domain

- **WHEN** the docs site is built
- **THEN** canonical link tags and sitemap entries are rooted at `https://semantics.archmax.ai`

#### Scenario: In-product documentation link

- **WHEN** a user follows the Documentation link from the application
- **THEN** they arrive at `semantics.archmax.ai`

### Requirement: Brand-Consistent Theming

The documentation site SHALL use color tokens, typography, and visual treatments consistent with the archmax company marketing website. The site title and product references SHALL name the product `archmax semantics`.

The accent palette MUST use hue 257° purple tones for interactive elements (links, highlights), with separate values for light and dark modes.

The gray scale MUST be pure neutral (hue 0°) with no color tint, matching the website's black/white/gray backgrounds and text.

#### Scenario: Neutral grays in light mode

- **WHEN** a user views the documentation site in light mode
- **THEN** backgrounds are pure white (`#ffffff`), text is near-black (`#141414`), and surface grays carry no color tint

#### Scenario: Neutral grays in dark mode

- **WHEN** a user views the documentation site in dark mode
- **THEN** backgrounds are near-black (`#121212`), text is near-white (`#f2f2f2`), and surface grays carry no color tint

#### Scenario: Purple accent on interactive elements only

- **WHEN** a user views any page
- **THEN** the 257° purple accent appears only on links, active highlights, and focus rings
- **AND** backgrounds, borders, and text use pure neutral grays

#### Scenario: Site names the product

- **WHEN** a user views any documentation page
- **THEN** the site title identifies the product as `archmax semantics`
- **AND** repository links point at `github.com/archmax-ai/semantics`

### Requirement: Solution Overview in Docs

The documentation landing page or quickstart MUST include a section describing what archmax semantics provides from a user's perspective, including:

- What the main UI sections are and what users do in each one
- That the "AI-Assisted Model Builder" is a chat interface, not a form-based wizard
- That MCP tokens are how external AI agents connect to the semantic layer
- That the Testing suite validates whether agents can use the models correctly

Each major UI section (Dashboard/Projects, Semantic Models, Data Federation, Data Browser, MCP Access, Testing) MUST be briefly introduced so users understand what they can do before they start.

The Data Federation section MUST describe three areas: **Data Sources** (connection management), **Browser** (schema and table exploration), and **Console** (ad-hoc federated SQL, extension install, and copyable setup commands for `INSTALL`, `LOAD`, and `ATTACH`).

This overview MUST be written for a non-technical audience that has never seen the product.

#### Scenario: New user understands the product

- **WHEN** a new user reads the documentation landing page
- **THEN** they understand the high-level workflow (create project, connect database, build model via chat, publish, create MCP token, connect agent)
- **AND** they can identify what each UI section does before navigating to it

#### Scenario: Reader understands Data Federation areas

- **WHEN** a new user reads the Data Federation description in the overview
- **THEN** they can distinguish connection setup, data browsing, and the federation console
- **AND** they know the console provides setup commands for extensions and attach examples

### Requirement: Version Badge in Docs Header

The documentation site SHALL display a version badge next to the logo in the Starlight navbar header. The badge SHALL show the current release version (e.g., `v0.3.1`) in a small pill-shaped tag with muted styling consistent with the site's design tokens.

The version SHALL be injected at build time from the latest git tag. The `docs.yml` GitHub Actions workflow SHALL resolve the latest `v*` tag and pass it as the `APP_VERSION` environment variable to the Astro build. When `APP_VERSION` is not set (local development), the badge SHALL display "dev".

The version badge SHALL be implemented as a custom Starlight component override for `SiteTitle`.

#### Scenario: Docs show current release version

- **WHEN** the docs site is built after release `v0.4.0` and deployed to GitHub Pages
- **THEN** the navbar header displays a badge reading "v0.4.0" next to the archmax semantics brand

#### Scenario: Local docs dev shows fallback

- **WHEN** a developer runs the docs dev server locally without `APP_VERSION` set
- **THEN** the navbar header displays a badge reading "dev" next to the archmax semantics brand

#### Scenario: Badge styling matches site design

- **WHEN** a user views the documentation site
- **THEN** the version badge uses muted colors (gray background, gray text) and pill-shaped rounded corners
- **AND** the badge does not visually compete with the logo or navigation
