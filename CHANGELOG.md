# Changelog

All notable changes to **Fire Harmony** (`FIRMS-Harmony`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation
- Redesigned `README.md` with complete product overview, system architecture diagram, technology stack, usage examples, and scientific references.
- Expanded `docs/` with `INSTALLATION.md`, `USER_GUIDE.md`, `DATA_DOCUMENTATION.md`, `DEVELOPMENT.md`, `DEPLOYMENT.md`, and `FAQ.md`.
- Upgraded `docs/ARCHITECTURE.md` with script load-order matrix, event bus contracts, and failure-mode documentation.
- Updated `CONTRIBUTING.md` with links to `docs/DEVELOPMENT.md` and `docs/INSTALLATION.md`.

## [1.2.0] - 2026-11-18

### Added
- **Empirical Harmonization Matrix:** Automated computation of cross-sensor overlap parameters (`2012–2024`), reporting count inflation ratio ($R_{\text{count}}$), total FRP ratio ($R_{\text{FRP}}$), and mean intensity ratio ($\alpha$).
- **Live NASA FIRMS CSV Pipeline:** Client-side CSV parser (`parseFIRMSCSV`) supporting standard NASA FIRMS exports (`MOD14`, `MYD14`, `VNP14IMGTDL`, `VJ114IMGTDL`).
- **Nile Corridor Boundary Filter:** Client-side ray-casting point-in-polygon verification (`inside`) isolating Egypt's agricultural corridor from Aswan (`24.0°N`) to the Mediterranean (`31.6°N`).
- **Agricultural Burning Calendar:** Seasonal phenology timeline highlighting autumn rice-straw burning, spring wheat stubble clearance, and the summer growing minimum.
- **Vector Brand Identity:** Custom SVG emblem and favicon (`assets/logo.svg`).
- **Architecture Documentation:** Initial technical reference under `docs/ARCHITECTURE.md`.

### Fixed
- Linked `analytics.js`, `sensors.js`, `methodology.js`, and `about.js` in `index.html`, enabling all six SPA views.
- Bound Home KPI counters (`js/home.js`) dynamically to the active `DATA` store via the `dataupdated` event bus.

## [1.0.0] - 2026-11-15

### Added
- Initial release of Fire Harmony interactive cartography platform.
- Leaflet 1.9.4 map integration with CARTO Dark Matter basemap, thermal FRP ramp, time-lapse playback, and CSV export.
- Temporal filtering across the `2001–2024` baseline.
- Bilingual English (`LTR`) and Arabic (`RTL`) language switching interface.
