# ServiceNow Encoded Query Generator (Refined)

## Overview
This Tampermonkey userscript helps you generate ServiceNow encoded queries with a modern, modular UI. It is designed for maintainability and extensibility, following SOLID principles.

## How to Add New Features or Make Improvements

The codebase is organized into the following classes:
- **QueryGeneratorState**: Manages the state of the query builder (e.g., dynamic rows).
- **QueryBuilder**: Handles the logic for building the encoded query string.
- **ServiceNowExtractor**: Extracts field data from the ServiceNow list/table.
- **QueryGeneratorUI**: Handles all UI rendering, DOM manipulation, and event binding.
- **QueryGeneratorController**: Wires everything together and initializes the UI.

### Guidelines for Adding Features
1. **UI Changes**: Add or modify UI elements and event handlers in `QueryGeneratorUI`. Keep UI logic separate from business logic.
2. **Query Logic**: If you need to change how queries are built, update `QueryBuilder`.
3. **Extraction Logic**: If you need to change how data is extracted from the ServiceNow table, update `ServiceNowExtractor`.
4. **State Management**: If you need to add new state variables, do so in `QueryGeneratorState`.
5. **Controller**: Only update `QueryGeneratorController` if you need to change how the main components are wired together.
6. **Utilities**: Add new utility functions as pure functions outside the classes, and inject them where needed.

### Example: Adding a New Operator
- Update the `operators` array in the main script.
- Update any UI logic in `QueryGeneratorUI` that renders operator options.

### Example: Adding a New UI Section
- Add a new method to `QueryGeneratorUI` for rendering the section.
- Bind any new events in `bindUIEventListeners`.
- Store any new state in `QueryGeneratorState` if needed.

### Best Practices
- Keep each class focused on a single responsibility.
- Use dependency injection for helpers/utilities.
- Avoid putting logic in the global scope.
- Write clear, maintainable code and update this README and the CHANGELOG for any significant changes.

## Changelog
See [CHANGELOG.md](./CHANGELOG.md) for release history. 