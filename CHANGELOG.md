# Changelog

All notable changes to this project will be documented in this file.

## [1.15] - 2024-06-09
### Added
- Refactored the entire codebase to follow SOLID principles.
- Split logic into modular classes: QueryGeneratorState, QueryBuilder, ServiceNowExtractor, QueryGeneratorUI, and QueryGeneratorController.
- All UI, state, extraction, and query logic are now encapsulated in their respective classes for maintainability and extensibility.

### Changed
- No breaking changes to user-facing features, but all internals are now organized for easier future development. 