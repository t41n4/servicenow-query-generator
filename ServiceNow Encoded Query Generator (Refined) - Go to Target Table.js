// ==UserScript==
// @name         ServiceNow Encoded Query Builder for Dictionary
// @namespace    http://tampermonkey.net/
// @version      1.17 // Refactored for SOLID principles
// @description  Generate ServiceNow encoded queries with per-element control, bulk input (now persistent across extracts), and direct navigation to the target table.
// @author       t41n4
// @match        https://aiadev.service-now.com/sys_dictionary_list*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // Inject CSS for the UI
    GM_addStyle(`
                /* Universal box-sizing for consistent layout */
                #queryGeneratorContainer *,
                #queryGeneratorContainer *:before,
                #queryGeneratorContainer *:after {
                    box-sizing: border-box;
                }

                #queryGeneratorContainer {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: clamp(300px, 40vw, 550px); /* Responsive width: min 300px, 40% of viewport, max 550px */
                    max-height: 90vh; /* Max height 90% of viewport height */
                    background-color: #ffffff; /* Lighter background */
                    border: 1px solid #e0e0e0;
                    border-radius: 12px; /* More rounded corners */
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); /* Softer, larger shadow */
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    color: #333;
                    z-index: 9999;
                    padding: 20px; /* Increased padding */
                    display: flex; /* Use flexbox for main layout */
                    flex-direction: column;
                    gap: 15px; /* Increased gap between main sections */
                    resize: both; /* Allow resizing */
                    overflow: hidden; /* Hide main overflow, let internal sections handle it */
                }

                #queryGeneratorContainer h3 {
                    margin-top: 0;
                    margin-bottom: 5px; /* Reduced margin for tighter header */
                    color: #2c3e50;
                    font-size: 18px; /* Slightly larger font */
                    font-weight: 700; /* Bolder */
                    text-align: center;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #f0f0f0; /* Subtle separator */
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px; /* Spacing within input groups */
                }

                .input-group label {
                    font-weight: 600; /* Slightly bolder labels */
                    color: #444;
                    font-size: 13px;
                }

                .input-group textarea,
                .input-group select {
                    width: 100%;
                    padding: 10px; /* Increased padding */
                    border: 1px solid #dcdcdc;
                    border-radius: 6px; /* More rounded inputs */
                    background-color: #fcfcfc;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                    min-height: 60px;
                    max-height: 150px;
                    resize: vertical;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .input-group textarea:focus,
                .input-group select:focus {
                    border-color: #3498db;
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2); /* Focus ring */
                    outline: none;
                }

                .button-group {
                    display: flex;
                    flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
                    gap: 10px;
                    margin-top: 5px;
                }

                .button-group button {
                    background-color: #3498db;
                    color: white;
                    border: none;
                    border-radius: 6px; /* More rounded buttons */
                    padding: 10px 18px; /* Increased padding */
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600; /* Bolder text */
                    transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
                    flex-grow: 1; /* Allow buttons to grow */
                    min-width: 120px; /* Ensure minimum width for buttons */
                }

                .button-group button:hover {
                    background-color: #2980b9;
                    transform: translateY(-2px); /* More pronounced lift effect */
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                }
                .button-group button:active {
                    transform: translateY(0);
                    box-shadow: none;
                }

                #generateQueryBtn {
                    background-color: #27ae60;
                }
                #generateQueryBtn:hover {
                    background-color: #229954;
                }

                #copyQueryBtn {
                    background-color: #2c3e50;
                }
                #copyQueryBtn:hover {
                    background-color: #34495e;
                }

                #clearAllBtn {
                    background-color: #95a5a6;
                }
                #clearAllBtn:hover {
                    background-color: #7f8c8d;
                }

                #extractElementsBtn {
                    background-color: #8e44ad;
                    margin-bottom: 10px; /* Space before the container */
                }
                #extractElementsBtn:hover {
                    background-color: #6c3483;
                }

                #applyBulkKeywordsBtn {
                    background-color: #f39c12; /* Orange color for distinction */
                }
                #applyBulkKeywordsBtn:hover {
                    background-color: #e67e22;
                }

                #goToTargetTableBtn { /* Style for the new "Go to Target Table" button */
                    background-color: #007bff; /* Blue color */
                }
                #goToTargetTableBtn:hover {
                    background-color: #0056b3;
                }

                /* Highlighted element cell */
                .snqg-highlight-element-cell {
                    background-color: #ffe066 !important;
                    transition: background-color 0.3s;
                }

                #elementKeywordPairsContainer {
                    flex-grow: 1; /* Allows this section to take available space */
                    display: flex;
                    flex-direction: column;
                    gap: 12px; /* Spacing between rows */
                    border: 1px dashed #dcdcdc; /* Lighter dashed border */
                    padding: 15px; /* Increased padding */
                    border-radius: 8px;
                    min-height: 80px; /* Ensure some height even if empty */
                    overflow-y: auto; /* Enable vertical scrolling for this section */
                    background-color: #fcfcfc;
                }

                #elementKeywordPairsContainer p {
                    margin: 0;
                    padding: 10px;
                    color: #888;
                    font-style: italic;
                }

                .element-keyword-row {
                    display: grid;
                    grid-template-columns: 1fr 0.7fr 1.5fr auto; /* Element, Operator, Keywords, Remove */
                    gap: 10px; /* Spacing within a row */
                    align-items: center; /* Align items to center */
                    padding: 10px;
                    background-color: #f8f8f8; /* Slightly different background for rows */
                    border: 1px solid #e9e9e9;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05); /* Subtle shadow for rows */
                }

                .element-keyword-row .element-label {
                    font-weight: 600;
                    color: #34495e;
                    word-break: break-all;
                    /* No padding-top needed if items are centered */
                }

                .element-keyword-row select {
                    padding: 8px; /* Consistent padding with textarea */
                }

                .keyword-input-wrapper {
                    display: flex; /* Use flex for input and clear button */
                    align-items: center;
                    gap: 5px; /* Space between textarea and clear button */
                    width: 100%; /* Take full width of its grid cell */
                }

                .element-keyword-row textarea {
                    flex-grow: 1; /* Textarea takes available space */
                    min-height: 30px;
                    max-height: 80px;
                    padding: 8px;
                    border: 1px solid #dcdcdc; /* Re-add border for textarea */
                    border-radius: 6px; /* Match other inputs */
                    background-color: #fff; /* White background for text area */
                }

                .clear-keyword-btn {
                    background-color: #ccc;
                    color: #333;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px; /* Smaller padding */
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                    transition: background-color 0.2s ease;
                    flex-shrink: 0; /* Prevent button from shrinking */
                }

                .clear-keyword-btn:hover {
                    background-color: #b0b0b0;
                }

                .element-keyword-row .remove-row-btn {
                    background-color: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 10px; /* Slightly larger remove button */
                    cursor: pointer;
                    font-size: 13px;
                    transition: background-color 0.2s ease;
                }

                .element-keyword-row .remove-row-btn:hover {
                    background-color: #c0392b;
                }

                #queryOutput {
                    background-color: #ecf0f1;
                    border: 1px solid #bdc3c7;
                    border-radius: 8px; /* More rounded output box */
                    padding: 15px; /* Increased padding */
                    min-height: 80px;
                    word-break: break-all;
                    white-space: pre-wrap;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 13px;
                    color: #2c3e50;
                    overflow-x: auto;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.08); /* Inner shadow for output */
                }

                .toggle-button {
                    position: absolute;
                    top: 10px; /* Adjusted position */
                    left: 10px; /* Adjusted position */
                    background-color: #34495e;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 6px 10px;
                    cursor: pointer;
                    font-size: 12px;
                    z-index: 10000;
                    transition: background-color 0.2s ease, transform 0.1s ease;
                }
                .toggle-button:hover {
                    background-color: #4a627a;
                    transform: translateY(-1px);
                }

                #copyFeedback {
                    text-align: center;
                    font-weight: 600;
                    margin-top: 5px;
                    height: 20px; /* Reserve space to prevent layout shift */
                    font-size: 13px;
                }

                /* Media queries for smaller screens */
                @media (max-width: 768px) {
                    #queryGeneratorContainer {
                        width: 95vw; /* Take more width on smaller screens */
                        right: 2.5vw; /* Center it more */
                        left: 2.5vw;
                        top: 10px; /* Closer to top */
                        max-height: 95vh; /* Allow more vertical space */
                    }

                    .element-keyword-row {
                        grid-template-columns: 1fr; /* Stack elements, operator, keywords vertically */
                        gap: 5px;
                    }
                    .element-keyword-row .element-label,
                    .element-keyword-row select,
                    .element-keyword-row textarea {
                        width: 100%; /* Ensure full width */
                    }
                    .element-keyword-row .remove-row-btn {
                        width: fit-content; /* Keep remove button compact */
                        align-self: flex-end; /* Align to the right */
                    }
                    .keyword-input-wrapper {
                        flex-direction: row; /* Keep horizontal on small screens */
                    }
                }
            `);

    // =====================
    // State Management
    // =====================
    class QueryGeneratorState {
        constructor() {
            this.dynamicQueryRows = [];
        }
        clear() {
            this.dynamicQueryRows = [];
        }
    }

    // =====================
    // Query Builder
    // =====================
    class QueryBuilder {
        constructor(state) {
            this.state = state;
        }
        build(mainConjunction) {
            const allQueryParts = [];
            this.state.dynamicQueryRows.forEach(rowData => {
                let field = rowData.element;
                if (rowData.reference === 'Group' && field) {
                    field = `${field}.name`;
                }
                const operator = rowData.operatorSelect.value;
                const keywordsRaw = rowData.keywordsTextarea.value.trim();
                if (!field || !keywordsRaw) return;
                const keywords = keywordsRaw.split(/[\n,]+/).map(item => item.trim()).filter(item => item !== '');
                if (keywords.length === 0) return;
                const subQueryConditions = keywords.map(keyword => `${field}${operator}${keyword}`);
                allQueryParts.push(subQueryConditions.join('^OR'));
            });
            if (allQueryParts.length > 0) {
                return allQueryParts.join(mainConjunction);
            }
            return '';
        }
    }

    // =====================
    // ServiceNow Table Extraction
    // =====================
    class ServiceNowExtractor {
        constructor(mapRowToDataObject, getHeaderMap) {
            this.mapRowToDataObject = mapRowToDataObject;
            this.getHeaderMap = getHeaderMap;
        }
        extractElements(addKeywordConditionRow, clearAll) {
            clearAll(true);
            if (!window.location.pathname.includes('_list.do')) {
                alert('This feature is designed for ServiceNow list pages (e.g., /sys_dictionary_list.do, /sys_user_list.do). Please navigate to a list.');
                return;
            }
            const headerMap = this.getHeaderMap();
            const headerNames = headerMap.map(h => h.name);
            if (!headerNames.includes('element') || !headerNames.includes('column_label') || (!headerNames.includes('internal_type') && !headerNames.includes('type')) || !headerNames.includes('reference')) {
                alert('Could not determine all required column indices. Please check the table structure.');
                return;
            }
            const rows = document.querySelectorAll('tbody.list2_body tr.list_row');
            if (rows.length === 0) {
                alert('No rows found in the list to extract elements from. Ensure the list is populated.');
                return;
            }
            rows.forEach(row => {
                const data = this.mapRowToDataObject(row, headerMap);
                addKeywordConditionRow(data);
            });
        }
    }

    // =====================
    // UI Rendering and Event Binding
    // =====================
    class QueryGeneratorUI {
        constructor(state, queryBuilder, extractor, operators) {
            this.state = state;
            this.queryBuilder = queryBuilder;
            this.extractor = extractor;
            this.operators = operators;
            this.BULK_KEYWORDS_STORAGE_KEY = 'snQueryGeneratorBulkKeywords';
            this.HIGHLIGHT_INPUT_STORAGE_KEY = 'snQueryGeneratorHighlightInput';
        }

        create() {
            const container = document.createElement('div');
            container.id = 'queryGeneratorContainer';
            container.appendChild(this.createToggleButton());
            container.appendChild(this.createHeaderSection());
            container.appendChild(this.createHighlightInputGroup()); // <-- Add highlight input
            container.appendChild(this.createExtractButtonsGroup());
            container.appendChild(this.createElementKeywordPairsContainer());
            container.appendChild(this.createBulkKeywordsInputGroup());
            container.appendChild(this.createConjunctionSelectGroup());
            container.appendChild(this.createButtonGroup());
            const [output, feedback] = this.createOutputAndFeedback();
            container.appendChild(output);
            container.appendChild(feedback);
            document.body.appendChild(container);
            this.bindUIEventListeners();
            this.loadBulkKeywords();
            this.loadHighlightInput();
            this.highlightElementCells(); // Auto-apply highlight on load
        }

        createHeaderSection() {
            const header = document.createElement('h3');
            header.textContent = 'Sys_Dictionary Query Builder';
            return header;
        }
        createHighlightInputGroup() {
            const group = document.createElement('div');
            group.className = 'input-group';
            group.style.marginBottom = '0';
            group.innerHTML = `
                <label for="highlightInput">Highlight Elements (comma-separated, e.g. *group, *script, =admin, user):</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input id="highlightInput" type="text" placeholder="*group, *script, =admin, user" style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid #dcdcdc; font-size: 13px;" />
                  <button id="highlightBtn" style="background-color: #ffe066; color: #333; font-weight: bold; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer;">Highlight</button>
                  <button id="clearHighlightBtn" style="background-color: #ccc; color: #333; font-weight: bold; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer;">Clear</button>
                </div>
            `;
            return group;
        }
        createExtractButtonsGroup() {
            const group = document.createElement('div');
            group.style.display = 'flex';
            group.style.flexDirection = 'column';
            group.appendChild(this.createExtractElementsButton());
            const extractHighlightedBtn = document.createElement('button');
            extractHighlightedBtn.id = 'extractHighlightedElementsBtn';
            extractHighlightedBtn.textContent = 'Extract Highlighted Elements Only';
            extractHighlightedBtn.style.backgroundColor = '#ffe066';
            extractHighlightedBtn.style.color = '#333';
            extractHighlightedBtn.style.fontWeight = 'bold';
            extractHighlightedBtn.style.border = 'none';
            extractHighlightedBtn.style.borderRadius = '6px';
            extractHighlightedBtn.style.padding = '10px 18px';
            extractHighlightedBtn.style.cursor = 'pointer';
            extractHighlightedBtn.style.fontSize = '14px';
            group.appendChild(extractHighlightedBtn);
            return group;
        }
        createExtractElementsButton() {
            const btn = document.createElement('button');
            btn.id = 'extractElementsBtn';
            btn.textContent = 'Extract Elements from List';
            return btn;
        }
        createElementKeywordPairsContainer() {
            const div = document.createElement('div');
            div.id = 'elementKeywordPairsContainer';
            div.innerHTML = '<p style="text-align: center; color: #777;">Click "Extract Elements from List" to populate.</p>';
            return div;
        }
        createBulkKeywordsInputGroup() {
            const group = document.createElement('div');
            group.className = 'input-group';
            group.innerHTML = `
                <label for="bulkKeywordsInput">Bulk Keywords Input (one per line or comma-separated):</label>
                <textarea id="bulkKeywordsInput" placeholder="e.g., IBM, AZURE, SUPPORT"></textarea>
                <button id="applyBulkKeywordsBtn">Apply to All Rows</button>
            `;
            return group;
        }
        createConjunctionSelectGroup() {
            const group = document.createElement('div');
            group.className = 'input-group';
            group.innerHTML = `
                <label for="mainConjunctionSelect">Conjunction between Element Groups:</label>
                <select id="mainConjunctionSelect">
                    <option value="^NQ">AND (^NQ)</option>
                    <option value="^OR">OR (^OR)</option>
                </select>
            `;
            return group;
        }
        createButtonGroup() {
            const group = document.createElement('div');
            group.className = 'button-group';
            group.innerHTML = `
                <button id="generateQueryBtn">Generate Query</button>
                <button id="copyQueryBtn">Copy Encoded Query</button>
                <button id="goToTargetTableBtn">Go to Target Table</button>
                <button id="clearAllBtn">Clear All</button>
            `;
            return group;
        }
        createOutputAndFeedback() {
            const output = document.createElement('div');
            output.id = 'queryOutput';
            const feedback = document.createElement('div');
            feedback.id = 'copyFeedback';
            return [output, feedback];
        }
        createToggleButton() {
            const btn = document.createElement('button');
            btn.className = 'toggle-button';
            btn.id = 'toggleQueryGenerator';
            btn.textContent = 'Hide';
            return btn;
        }

        bindUIEventListeners() {
            document.getElementById('generateQueryBtn').addEventListener('click', () => this.generateEncodedQuery());
            document.getElementById('copyQueryBtn').addEventListener('click', () => this.copyEncodedQuery());
            document.getElementById('goToTargetTableBtn').addEventListener('click', () => this.goToTargetTable());
            document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
            document.getElementById('toggleQueryGenerator').addEventListener('click', () => this.toggleVisibility());
            document.getElementById('extractElementsBtn').addEventListener('click', () => this.extractElementsFromList());
            document.getElementById('extractHighlightedElementsBtn').addEventListener('click', () => this.extractHighlightedElementsOnly());
            document.getElementById('applyBulkKeywordsBtn').addEventListener('click', () => this.applyBulkKeywords());
            const bulkKeywordsInput = document.getElementById('bulkKeywordsInput');
            bulkKeywordsInput.addEventListener('input', (e) => this.autoResizeTextarea(e));
            bulkKeywordsInput.addEventListener('input', () => this.saveBulkKeywords());
            // Highlight listeners
            document.getElementById('highlightBtn').addEventListener('click', () => this.highlightElementCells());
            document.getElementById('clearHighlightBtn').addEventListener('click', () => this.clearHighlightElementCells());
            const highlightInput = document.getElementById('highlightInput');
            highlightInput.addEventListener('input', () => this.saveHighlightInput());
        }

        autoResizeTextarea(event) {
            event.target.style.height = 'auto';
            event.target.style.height = (event.target.scrollHeight) + 'px';
        }
        saveBulkKeywords() {
            const bulkKeywordsInput = document.getElementById('bulkKeywordsInput');
            localStorage.setItem(this.BULK_KEYWORDS_STORAGE_KEY, bulkKeywordsInput.value);
        }
        loadBulkKeywords() {
            const bulkKeywordsInput = document.getElementById('bulkKeywordsInput');
            const savedKeywords = localStorage.getItem(this.BULK_KEYWORDS_STORAGE_KEY);
            if (savedKeywords) {
                bulkKeywordsInput.value = savedKeywords;
                this.autoResizeTextarea({ target: bulkKeywordsInput });
            }
        }
        saveHighlightInput() {
            const highlightInput = document.getElementById('highlightInput');
            localStorage.setItem(this.HIGHLIGHT_INPUT_STORAGE_KEY, highlightInput.value);
        }
        loadHighlightInput() {
            const highlightInput = document.getElementById('highlightInput');
            const saved = localStorage.getItem(this.HIGHLIGHT_INPUT_STORAGE_KEY);
            if (saved) highlightInput.value = saved;
        }
        addKeywordConditionRow(elementData) {
            const container = document.getElementById('elementKeywordPairsContainer');
            // Remove placeholder if present
            const placeholder = container.querySelector('p');
            if (placeholder) {
                container.removeChild(placeholder);
            }
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('element-keyword-row');
            const elementLabel = document.createElement('span');
            elementLabel.classList.add('element-label');
            elementLabel.textContent = elementData.element;
            const operatorSelect = document.createElement('select');
            this.operators.forEach(op => {
                const option = document.createElement('option');
                option.value = op.value;
                option.textContent = op.text;
                operatorSelect.appendChild(option);
            });
            if (elementData.type === 'Reference' && elementData.reference === 'Group') {
                operatorSelect.value = 'LIKE';
            } else {
                operatorSelect.value = 'LIKE';
            }
            const keywordInputWrapper = document.createElement('div');
            keywordInputWrapper.classList.add('keyword-input-wrapper');
            const keywordsTextarea = document.createElement('textarea');
            keywordsTextarea.placeholder = 'Keywords (comma-separated)';
            keywordsTextarea.rows = 1;
            keywordsTextarea.addEventListener('input', (e) => this.autoResizeTextarea(e));
            keywordInputWrapper.appendChild(keywordsTextarea);
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'X';
            removeBtn.classList.add('remove-row-btn');
            rowDiv.appendChild(elementLabel);
            rowDiv.appendChild(operatorSelect);
            rowDiv.appendChild(keywordInputWrapper);
            rowDiv.appendChild(removeBtn);
            container.appendChild(rowDiv);
            const newRowData = {
                element: elementData.element,
                label: elementData.label,
                type: elementData.type,
                reference: elementData.reference,
                operatorSelect: operatorSelect,
                keywordsTextarea: keywordsTextarea,
                domElement: rowDiv
            };
            this.state.dynamicQueryRows.push(newRowData);
            removeBtn.addEventListener('click', () => {
                container.removeChild(rowDiv);
                const index = this.state.dynamicQueryRows.indexOf(newRowData);
                if (index > -1) {
                    this.state.dynamicQueryRows.splice(index, 1);
                }
                // If no rows left, show placeholder
                if (this.state.dynamicQueryRows.length === 0) {
                    container.innerHTML = `<p style="text-align: center; color: #777;">Click \"Extract Elements from List\" to populate.</p>`;
                }
            });
        }
        generateEncodedQuery() {
            const outputDiv = document.getElementById('queryOutput');
            const mainConjunction = document.getElementById('mainConjunctionSelect').value;
            outputDiv.textContent = this.queryBuilder.build(mainConjunction);
        }
        copyEncodedQuery() {
            const queryOutput = document.getElementById('queryOutput');
            const feedbackDiv = document.getElementById('copyFeedback');
            const textToCopy = queryOutput.textContent;
            if (textToCopy) {
                const tempTextArea = document.createElement('textarea');
                tempTextArea.value = textToCopy;
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                try {
                    document.execCommand('copy');
                    feedbackDiv.textContent = 'Copied!';
                    feedbackDiv.style.color = 'green';
                } catch (err) {
                    feedbackDiv.textContent = 'Failed to copy!';
                    feedbackDiv.style.color = 'red';
                }
                document.body.removeChild(tempTextArea);
                setTimeout(() => feedbackDiv.textContent = '', 2000);
            } else {
                feedbackDiv.textContent = 'Nothing to copy!';
                feedbackDiv.style.color = 'orange';
                setTimeout(() => feedbackDiv.textContent = '', 2000);
            }
        }
        goToTargetTable() {
            const encodedQuery = document.getElementById('queryOutput').textContent;
            if (!encodedQuery) {
                alert('Please generate an encoded query first.');
                return;
            }
            let targetTable = '';
            const breadcrumbLinks = document.querySelectorAll('.breadcrumb_container .breadcrumb_link b');
            for (const link of breadcrumbLinks) {
                if (link.textContent.includes('Table = ')) {
                    targetTable = link.textContent.replace('Table = ', '').trim();
                    break;
                }
            }
            if (!targetTable) {
                const currentPath = window.location.pathname;
                const match = currentPath.match(/\/(.+?_list\.do)/);
                if (match && match[1]) {
                    targetTable = match[1].replace('_list.do', '');
                }
            }
            if (!targetTable) {
                alert('Could not determine the target table. Please ensure you are on a ServiceNow list view with a clear table name in the breadcrumb or URL.');
                return;
            }
            const encodedQueryParam = encodeURIComponent(encodedQuery);
            const newUrl = `${window.location.origin}/${targetTable}_list.do?sysparm_query=${encodedQueryParam}&sysparm_first_row=1&sysparm_view=`;
            window.open(newUrl, '_blank');
        }
        clearAll(keepBulkKeywords = false) {
            document.getElementById('elementKeywordPairsContainer').innerHTML = `
                <p style="text-align: center; color: #777;">Click "Extract Elements from List" to populate.</p>
            `;
            this.state.clear();
            document.getElementById('queryOutput').textContent = '';
            document.getElementById('copyFeedback').textContent = '';
            document.getElementById('mainConjunctionSelect').value = '^NQ';
            if (!keepBulkKeywords) {
                document.getElementById('bulkKeywordsInput').value = '';
                localStorage.removeItem(this.BULK_KEYWORDS_STORAGE_KEY);
            }
            document.getElementById('bulkKeywordsInput').style.height = 'auto';
        }
        toggleVisibility() {
            const container = document.getElementById('queryGeneratorContainer');
            const button = document.getElementById('toggleQueryGenerator');
            if (container.style.display === 'none') {
                container.style.display = 'flex';
                button.textContent = 'Hide';
            } else {
                container.style.display = 'none';
                button.textContent = 'Show';
            }
        }
        extractElementsFromList() {
            this.clearAll(true);
            this.extractor.extractElements((data) => this.addKeywordConditionRow(data), () => this.clearAll(true));
            this.injectAddToQueryBuilderButtons();
            this.observeTableChanges();
        }
        extractHighlightedElementsOnly() {
            this.clearAll(true);
            // Find highlighted element cells
            const highlightedCells = document.querySelectorAll('tbody.list2_body td.snqg-highlight-element-cell');
            if (!highlightedCells.length) {
                alert('No highlighted elements found.');
                return;
            }
            // For each highlighted cell, get its row and extract data
            const headerMap = getHeaderMap();
            highlightedCells.forEach(cell => {
                const row = cell.closest('tr');
                if (row) {
                    const data = mapRowToDataObject(row, headerMap);
                    this.addKeywordConditionRow(data);
                }
            });
        }
        applyBulkKeywords() {
            const bulkKeywordsRaw = document.getElementById('bulkKeywordsInput').value.trim();
            if (!bulkKeywordsRaw) {
                alert('Please enter keywords in the "Bulk Keywords Input" field first.');
                return;
            }
            const keywordsToApply = bulkKeywordsRaw.split(/[\n,]+/).map(item => item.trim()).filter(item => item !== '').join(',\n');
            if (this.state.dynamicQueryRows.length === 0) {
                alert('No elements have been extracted yet. Please click "Extract Elements from List" first.');
                return;
            }
            this.state.dynamicQueryRows.forEach(rowData => {
                rowData.keywordsTextarea.value = keywordsToApply;
                this.autoResizeTextarea({ target: rowData.keywordsTextarea });
            });
        }
        injectAddToQueryBuilderButtons() {
            if (!window.location.pathname.includes('_list.do')) return;
            const headerRow = document.querySelector('table.data_list_table thead tr');
            if (headerRow) {
                const ths = headerRow.querySelectorAll('th');
                if (!ths[0] || ths[0].className !== 'add-to-query-builder-header') {
                    const blankTh = document.createElement('th');
                    blankTh.className = 'add-to-query-builder-header';
                    blankTh.style.width = '1%';
                    headerRow.insertBefore(blankTh, ths[0] || null);
                }
            }
            const headerMap = getHeaderMap();
            const headerNames = headerMap.map(h => h.name);
            if (!headerNames.includes('element') || !headerNames.includes('column_label') || (!headerNames.includes('internal_type') && !headerNames.includes('type')) || !headerNames.includes('reference')) {
                return;
            }
            const rows = document.querySelectorAll('tbody.list2_body tr.list_row');
            rows.forEach((row, idx) => {
                if (row.querySelector('.add-to-query-builder-btn')) return;
                let firstCell = row.querySelector('td');
                if (firstCell) {
                    const btnCell = document.createElement('td');
                    btnCell.className = 'vt custom-action-button';
                    btnCell.style.verticalAlign = 'middle';
                    btnCell.style.textAlign = 'center';
                    row.insertBefore(btnCell, firstCell);
                }
                // Now map data after button cell is inserted, so mapRowToDataObject skips the button cell
                const data = mapRowToDataObject(row, headerMap);
                if (!data.element) return;
                if (this.state.dynamicQueryRows.some(row => row.element === data.element)) return;
                const btn = document.createElement('button');
                btn.textContent = 'Add Query';
                btn.className = 'add-to-query-builder-btn';
                btn.style.background = '#27ae60';
                btn.style.color = 'white';
                btn.style.border = 'none';
                btn.style.borderRadius = '5px';
                btn.style.padding = '4px 10px';
                btn.style.marginRight = '6px';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '12px';
                btn.style.fontWeight = 'bold';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.state.dynamicQueryRows.some(row => row.element === data.element)) return;
                    this.addKeywordConditionRow(data);
                });
                // Add the button to the cell (after mapping)
                const btnCell = row.querySelector('td.custom-action-button');
                if (btnCell && btnCell.childNodes.length === 0) {
                    btnCell.appendChild(btn);
                }
            });
            // Re-apply highlight after table/buttons injected
            this.highlightElementCells();
        }
        observeTableChanges() {
            const tableBody = document.querySelector('tbody.list2_body');
            if (!tableBody) return;
            if (tableBody._addToQueryBuilderObserver) return;
            const observer = new MutationObserver(() => {
                this.injectAddToQueryBuilderButtons();
                this.highlightElementCells(); // Re-apply highlight on table change
            });
            observer.observe(tableBody, { childList: true, subtree: false });
            tableBody._addToQueryBuilderObserver = observer;
        }
        highlightElementCells() {
            const input = document.getElementById('highlightInput').value.trim();
            if (!input) return;
            // Parse multiple criteria, separated by commas
            const criteria = input.split(',').map(s => s.trim()).filter(Boolean).map(crit => {
                let matchType = 'starts';
                let value = crit;
                if (crit.startsWith('*')) {
                    matchType = 'contains';
                    value = crit.slice(1);
                } else if (crit.startsWith('=')) {
                    matchType = 'exact';
                    value = crit.slice(1);
                }
                return { matchType, value: value.trim().toLowerCase() };
            });
            // Find the 'element' column index
            const headerMap = getHeaderMap();
            const elementHeader = headerMap.find(h => h.canonicalKey === 'element');
            if (!elementHeader) return;
            const colIdx = elementHeader.idx;
            // Highlight matching cells
            const rows = document.querySelectorAll('tbody.list2_body tr.list_row');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                let cellIdx = 0;
                for (let i = 0; i < headerMap.length && cellIdx < cells.length; i++) {
                    const h = headerMap[i];
                    const cell = cells[cellIdx];
                    if (cell.classList.contains('list_decoration_cell') || cell.classList.contains('custom-action-button')) {
                        cellIdx++;
                        continue;
                    }
                    if (i === colIdx) {
                        const cellText = (cell.textContent || '').trim().toLowerCase();
                        let match = false;
                        for (const crit of criteria) {
                            if (crit.matchType === 'contains' && cellText.includes(crit.value)) {
                                match = true;
                                break;
                            } else if (crit.matchType === 'exact' && cellText === crit.value) {
                                match = true;
                                break;
                            } else if (crit.matchType === 'starts' && cellText.startsWith(crit.value)) {
                                match = true;
                                break;
                            }
                        }
                        if (match) {
                            cell.classList.add('snqg-highlight-element-cell');
                        } else {
                            cell.classList.remove('snqg-highlight-element-cell');
                        }
                        break;
                    }
                    cellIdx++;
                }
            });
        }
        clearHighlightElementCells() {
            const highlighted = document.querySelectorAll('.snqg-highlight-element-cell');
            highlighted.forEach(cell => cell.classList.remove('snqg-highlight-element-cell'));
        }
    }

    // =====================
    // Utilities/Helpers (as before)
    // =====================
    function getCanonicalHeaderKey(headerName, headerText) {
        const name = (headerName || '').toLowerCase().trim();
        const text = (headerText || '').toLowerCase().trim();
        if (name === 'element' || text === 'element' || text === 'field name') return 'element';
        if (name === 'column_label' || text === 'column label' || text === 'label') return 'label';
        if (name === 'internal_type' || name === 'type' || text === 'type' || text === 'internal type') return 'type';
        if (name === 'reference' || text === 'reference') return 'reference';
        return null;
    }
    function getHeaderMap() {
        const headerRow = document.querySelector('table.data_list_table thead tr');
        const headerMap = [];
        if (headerRow) {
            const ths = headerRow.querySelectorAll('th');
            ths.forEach((th, idx) => {
                const name = th.getAttribute('name') || '';
                const text = th.textContent || '';
                const canonicalKey = getCanonicalHeaderKey(name, text);
                headerMap.push({ name, text, idx, th, canonicalKey });
            });
        }
        return headerMap;
    }
    function mapRowToDataObject(row, headerMap) {
        const allCells = Array.from(row.querySelectorAll('td'));
        const dataHeaders = headerMap.filter(h => h.canonicalKey);
        const data = { element: '', label: '', type: '', reference: '' };
        let cellIdx = 0;
        for (let i = 0; i < headerMap.length && cellIdx < allCells.length; i++) {
            const h = headerMap[i];
            const cell = allCells[cellIdx];
            if (cell.classList.contains('list_decoration_cell') || cell.classList.contains('custom-action-button')) {
                cellIdx++;
                continue;
            }
            if (!h.canonicalKey) {
                cellIdx++;
                continue;
            }
            let value = cell.textContent.trim();
            if (h.canonicalKey === 'reference') {
                const link = cell.querySelector('a');
                if (link) value = link.textContent.trim();
            }
            data[h.canonicalKey] = value;
            cellIdx++;
        }
        return data;
    }

    // =====================
    // Operators
    // =====================
    const operators = [
        { value: '=', text: '=' },
        { value: '!=', text: '!=' },
        { value: 'LIKE', text: 'LIKE' },
        { value: 'NOT LIKE', text: 'NOT LIKE' },
        { value: 'STARTSWITH', text: 'STARTSWITH' },
        { value: 'ENDSWITH', text: 'ENDSWITH' },
        { value: 'CONTAINS', text: 'CONTAINS' },
        { value: 'NOT CONTAINS', text: 'NOT CONTAINS' },
        { value: 'IN', text: 'IN' },
        { value: 'NOT IN', text: 'NOT IN' }
    ];

    // =====================
    // Main Controller
    // =====================
    class QueryGeneratorController {
        constructor() {
            this.state = new QueryGeneratorState();
            this.queryBuilder = new QueryBuilder(this.state);
            this.extractor = new ServiceNowExtractor(mapRowToDataObject, getHeaderMap);
            this.ui = new QueryGeneratorUI(this.state, this.queryBuilder, this.extractor, operators);
        }
        init() {
            this.ui.create();
            this.ui.injectAddToQueryBuilderButtons();
            this.ui.observeTableChanges();
        }
    }

    // =====================
    // Initialize
    // =====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            const controller = new QueryGeneratorController();
            controller.init();
        });
    } else {
        const controller = new QueryGeneratorController();
        controller.init();
    }

})();