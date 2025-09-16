# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-09-16

### Added

- **Added:** Initial release (MVP)
- **Added:** Automatic environment detection for development and staging
- **Added:** Visual badge in WordPress admin bar with SVG icons
- **Added:** Popup interface with General tab
- **Added:** WordPress version, language and theme detection
- **Added:** Single-page application (SPA) support
- **Added:** Distinctive colors per environment:
  - Development: Green (`#28a745`) or Purple (`#4f39f6` for .dev domains)
  - Staging: Pink (`#e60076`)
  - Production: No badge
- **Added:** Component communication via Chrome APIs
- **Added:** Chrome Extensions Manifest V3 support
- **Added:** Background service worker
- **Added:** Content script injection
- **Added:** Chrome Storage API integration
- **Added:** MutationObserver for page change detection
- **Added:** Settings tab in popup interface (interface ready)
- **Added:** Custom domains configuration for staging environments (planned)
- **Added:** Badge color customization options (planned)
- **Added:** User preferences saving functionality (planned)

## [0.0.1] - 2024-01-XX

### Added

- **Added:** Project initialization
- **Added:** Basic extension structure
- **Added:** Manifest V3 configuration
- **Added:** Icon assets (16px, 32px, 48px, 128px)
- **Added:** Basic popup interface
- **Added:** Environment detection logic
- **Added:** WordPress admin bar integration

---

## Version History

- **v0.1.0**: MVP release with core functionality
- **v0.0.1**: Initial project setup

## Contributing

When adding entries to this changelog, please follow these guidelines:

1. **Added** for new features
2. **Updated** for changes in existing functionality
3. **Deprecated** for soon-to-be removed features
4. **Removed** for now removed features
5. **Fixed** for any bug fixes
6. **Security** for vulnerability fixes

## Links

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
