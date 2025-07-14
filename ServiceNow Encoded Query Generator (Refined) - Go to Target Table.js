// ==UserScript==
// @name         ServiceNow Encoded Query Generator (Refined) - Go to Target Table
// @namespace    http://tampermonkey.net/
// @version      1.16 // Increased version number for group.name change
// @description  Generate ServiceNow encoded queries with per-element control, bulk input (now persistent across extracts), and direct navigation to the target table.
// @author       Gemini
// @match        https://aiadev.service-now.com/sys_dictionary_list*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
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

    // Operators available in ServiceNow encoded queries
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

    // Array to store references to the dynamically created rows
    let dynamicQueryRows = [];

    // LocalStorage key for bulk keywords
    const BULK_KEYWORDS_STORAGE_KEY = 'snQueryGeneratorBulkKeywords';

    // Function to create the main UI container
    function createQueryGeneratorUI() {
        const container = document.createElement('div');
        container.id = 'queryGeneratorContainer';
        container.innerHTML = `
            <button class="toggle-button" id="toggleQueryGenerator">Hide</button>
            <h3>Sys_Dictionary Query Builder</h3>

            <button id="extractElementsBtn">Extract Elements from List</button>
            <div id="elementKeywordPairsContainer">
                <p style="text-align: center; color: #777;">Click "Extract Elements from List" to populate.</p>
            </div>

            <div class="input-group">
                <label for="bulkKeywordsInput">Bulk Keywords Input (one per line or comma-separated):</label>
                <textarea id="bulkKeywordsInput" placeholder="e.g., IBM, AZURE, SUPPORT"></textarea>
                <button id="applyBulkKeywordsBtn">Apply to All Rows</button>
            </div>

            <div class="input-group">
                <label for="mainConjunctionSelect">Conjunction between Element Groups:</label>
                <select id="mainConjunctionSelect">
                    <option value="^NQ">AND (^NQ)</option>
                    <option value="^OR">OR (^OR)</option>
                </select>
            </div>

            <div class="button-group">
                <button id="generateQueryBtn">Generate Query</button>
                <button id="copyQueryBtn">Copy Encoded Query</button>
                <button id="goToTargetTableBtn">Go to Target Table</button>
                <button id="clearAllBtn">Clear All</button>
            </div>
            <div id="queryOutput"></div>
            <div id="copyFeedback"></div>
        `;
        document.body.appendChild(container);

        // Event listeners
        document.getElementById('generateQueryBtn').addEventListener('click', generateEncodedQuery);
        document.getElementById('copyQueryBtn').addEventListener('click', copyEncodedQuery);
        document.getElementById('goToTargetTableBtn').addEventListener('click', goToTargetTable);
        document.getElementById('clearAllBtn').addEventListener('click', clearAll);
        document.getElementById('toggleQueryGenerator').addEventListener('click', toggleVisibility);
        document.getElementById('extractElementsBtn').addEventListener('click', extractElementsFromList);
        document.getElementById('applyBulkKeywordsBtn').addEventListener('click', applyBulkKeywords);

        const bulkKeywordsInput = document.getElementById('bulkKeywordsInput');
        bulkKeywordsInput.addEventListener('input', autoResizeTextarea);
        bulkKeywordsInput.addEventListener('input', saveBulkKeywords); // Save on input

        loadBulkKeywords(); // Load on initialization
    }

    function autoResizeTextarea(event) {
        event.target.style.height = 'auto';
        event.target.style.height = (event.target.scrollHeight) + 'px';
    }

    // Function to save bulk keywords to localStorage
    function saveBulkKeywords() {
        const bulkKeywordsInput = document.getElementById('bulkKeywordsInput');
        localStorage.setItem(BULK_KEYWORDS_STORAGE_KEY, bulkKeywordsInput.value);
    }

    // Function to load bulk keywords from localStorage
    function loadBulkKeywords() {
        const bulkKeywordsInput = document.getElementById('bulkKeywordsInput');
        const savedKeywords = localStorage.getItem(BULK_KEYWORDS_STORAGE_KEY);
        if (savedKeywords) {
            bulkKeywordsInput.value = savedKeywords;
            autoResizeTextarea({ target: bulkKeywordsInput }); // Adjust height after loading
        }
    }

    // Function to add a dynamic row for an element with its operator and keywords
    function addKeywordConditionRow(elementData) { // Now accepts an object with element, type, reference
        const container = document.getElementById('elementKeywordPairsContainer');
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('element-keyword-row');

        const elementLabel = document.createElement('span');
        elementLabel.classList.add('element-label');
        elementLabel.textContent = elementData.element; // Use element from data

        const operatorSelect = document.createElement('select');
        operators.forEach(op => {
            const option = document.createElement('option');
            option.value = op.value;
            option.textContent = op.text;
            operatorSelect.appendChild(option);
        });

        // Auto-populate operator based on type and reference
        if (elementData.type === 'Reference' && elementData.reference === 'Group') {
            operatorSelect.value = 'LIKE'; // Set to LIKE for Reference Type = Group
        } else {
            operatorSelect.value = 'LIKE'; // Default operator
        }

        // Wrapper for textarea and its clear button
        const keywordInputWrapper = document.createElement('div');
        keywordInputWrapper.classList.add('keyword-input-wrapper');

        const keywordsTextarea = document.createElement('textarea');
        keywordsTextarea.placeholder = 'Keywords (comma-separated)';
        keywordsTextarea.rows = 1;
        keywordsTextarea.addEventListener('input', autoResizeTextarea);

        const clearKeywordBtn = document.createElement('button');
        clearKeywordBtn.textContent = 'x'; // Small 'x' for clearing individual keyword input
        clearKeywordBtn.classList.add('clear-keyword-btn');
        clearKeywordBtn.title = `Clear keywords for ${elementData.element}`;
        clearKeywordBtn.addEventListener('click', () => {
            keywordsTextarea.value = '';
            autoResizeTextarea({ target: keywordsTextarea });
        });

        keywordInputWrapper.appendChild(keywordsTextarea);
        keywordInputWrapper.appendChild(clearKeywordBtn);


        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'X';
        removeBtn.classList.add('remove-row-btn');

        rowDiv.appendChild(elementLabel);
        rowDiv.appendChild(operatorSelect);
        rowDiv.appendChild(keywordInputWrapper); // Append the wrapper
        rowDiv.appendChild(removeBtn);

        container.appendChild(rowDiv);

        const newRowData = {
            element: elementData.element, // Store the element name
            originalType: elementData.type, // Store original type
            originalReference: elementData.reference, // Store original reference
            operatorSelect: operatorSelect,
            keywordsTextarea: keywordsTextarea,
            domElement: rowDiv // Store reference to the DOM element for removal
        };
        dynamicQueryRows.push(newRowData);

        removeBtn.addEventListener('click', () => {
            container.removeChild(rowDiv);
            // Remove from the dynamicQueryRows array
            const index = dynamicQueryRows.indexOf(newRowData);
            if (index > -1) {
                dynamicQueryRows.splice(index, 1);
            }
        });
    }

    // Function to generate the encoded query string
    function generateEncodedQuery() {
        const outputDiv = document.getElementById('queryOutput');
        const allQueryParts = [];
        const mainConjunction = document.getElementById('mainConjunctionSelect').value;

        dynamicQueryRows.forEach(rowData => {
            let elementFieldName = rowData.element.trim(); // Start with the original element name
            const operator = rowData.operatorSelect.value;
            const keywordsRaw = rowData.keywordsTextarea.value.trim();

            // Check if this element is a Reference to Group and adjust field name for the query
            if (rowData.originalType === 'Reference' && rowData.originalReference === 'Group') {
                elementFieldName = `${elementFieldName}.name`; // Append '.name' to the original element name
            }

            if (!elementFieldName || !keywordsRaw) {
                return; // Skip if element field name or keywords are empty
            }

            const keywords = keywordsRaw.split(/[\n,]+/).map(item => item.trim()).filter(item => item !== '');

            if (keywords.length === 0) {
                return; // Skip if no valid keywords after splitting
            }

            // Construct sub-query for this element and its keywords
            const subQueryConditions = keywords.map(keyword => `${elementFieldName}${operator}${keyword}`);
            // Join keywords for this specific element with ^OR
            allQueryParts.push(subQueryConditions.join('^OR'));
        });

        let encodedQuery = '';
        if (allQueryParts.length > 0) {
            // Join different element groups using the selected main conjunction
            encodedQuery = allQueryParts.join(mainConjunction);
        }

        outputDiv.textContent = encodedQuery;
    }

    // Function to copy the generated query to clipboard
    function copyEncodedQuery() {
        const queryOutput = document.getElementById('queryOutput');
        const feedbackDiv = document.getElementById('copyFeedback');
        const textToCopy = queryOutput.textContent;

        if (textToCopy) {
            // Use a temporary textarea to copy text to clipboard
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
                console.error('Failed to copy text: ', err);
            }
            document.body.removeChild(tempTextArea);
            setTimeout(() => feedbackDiv.textContent = '', 2000); // Clear feedback after 2 seconds
        } else {
            feedbackDiv.textContent = 'Nothing to copy!';
            feedbackDiv.style.color = 'orange';
            setTimeout(() => feedbackDiv.textContent = '', 2000);
        }
    }

    // Function to navigate to the target table with the generated query
    function goToTargetTable() {
        const encodedQuery = document.getElementById('queryOutput').textContent;
        if (!encodedQuery) {
            alert('Please generate an encoded query first.');
            return;
        }

        let targetTable = '';
        // Try to get the target table from the breadcrumb
        // Look for a breadcrumb link that explicitly states "Table = [tablename]"
        const breadcrumbLinks = document.querySelectorAll('.breadcrumb_container .breadcrumb_link b');
        for (const link of breadcrumbLinks) {
            if (link.textContent.includes('Table = ')) {
                targetTable = link.textContent.replace('Table = ', '').trim();
                break;
            }
        }

        // Fallback to parsing from URL if not found in breadcrumb or if on a generic list
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

        // Encode the query for URL safety
        const encodedQueryParam = encodeURIComponent(encodedQuery);

        // Construct the new URL
        const newUrl = `${window.location.origin}/${targetTable}_list.do?sysparm_query=${encodedQueryParam}&sysparm_first_row=1&sysparm_view=`;

        // Navigate to the new URL in a new tab
        window.open(newUrl, '_blank');
    }


    // Function to clear all input fields and output
    function clearAll(keepBulkKeywords = false) { // Added parameter
        document.getElementById('elementKeywordPairsContainer').innerHTML = `
            <p style="text-align: center; color: #777;">Click "Extract Elements from List" to populate.</p>
        `;
        dynamicQueryRows = []; // Clear the internal array
        document.getElementById('queryOutput').textContent = '';
        document.getElementById('copyFeedback').textContent = ''; // Clear copy feedback
        document.getElementById('mainConjunctionSelect').value = '^NQ'; // Reset main conjunction

        if (!keepBulkKeywords) { // Only clear bulk keywords if not explicitly told to keep them
            document.getElementById('bulkKeywordsInput').value = '';
            localStorage.removeItem(BULK_KEYWORDS_STORAGE_KEY);
        }
        document.getElementById('bulkKeywordsInput').style.height = 'auto'; // Reset height
    }

    // Function to toggle visibility of the generator
    function toggleVisibility() {
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

    // Function to extract 'element' values from the current sys_dictionary list
    function extractElementsFromList() {
        clearAll(true); // Call clearAll, but pass true to keep bulk keywords

        // Check if we are on a sys_dictionary list page
        if (!window.location.pathname.includes('_list.do')) { // Broader check for any list view
            alert('This feature is designed for ServiceNow list pages (e.g., /sys_dictionary_list.do, /sys_user_list.do). Please navigate to a list.');
            return;
        }

        // Select all rows within the list2_body tbody
        const rows = document.querySelectorAll('tbody.list2_body tr.list_row');

        if (rows.length === 0) {
            alert('No rows found in the list to extract elements from. Ensure the list is populated.');
            return;
        }

        const uniqueElementsData = new Map(); // Use Map to store unique elements with their type/reference

        rows.forEach(row => {
            const cells = row.querySelectorAll('td.vt');
            // Based on the provided HTML structure for sys_dictionary_list:
            // cells[1] -> Element Name (e.g., 'cloud_vendor')
            // cells[3] -> Type (e.g., 'String', 'Reference')
            // cells[4] -> Reference (e.g., 'Group') - this is an <a> tag inside the td
            if (cells.length >= 5) {
                const elementValue = cells[1].textContent.trim();
                const typeValue = cells[3].textContent.trim();
                const referenceLink = cells[4].querySelector('a');
                const referenceValue = referenceLink ? referenceLink.textContent.trim() : '';

                if (elementValue) {
                    uniqueElementsData.set(elementValue, {
                        element: elementValue,
                        type: typeValue,
                        reference: referenceValue
                    });
                }
            }
        });

        if (uniqueElementsData.size > 0) {
            // Remove the initial placeholder text
            document.getElementById('elementKeywordPairsContainer').innerHTML = '';
            // Sort by element name for consistent order
            Array.from(uniqueElementsData.values()).sort((a, b) => a.element.localeCompare(b.element)).forEach(elementData => {
                addKeywordConditionRow(elementData);
            });
        } else {
            alert('No "element" values could be extracted from the current list. Please check the list content or ensure it is a sys_dictionary list.');
        }
    }

    // Function to apply bulk keywords to all existing element rows
    function applyBulkKeywords() {
        const bulkKeywordsRaw = document.getElementById('bulkKeywordsInput').value.trim();
        if (!bulkKeywordsRaw) {
            alert('Please enter keywords in the "Bulk Keywords Input" field first.');
            return;
        }

        const keywordsToApply = bulkKeywordsRaw.split(/[\n,]+/).map(item => item.trim()).filter(item => item !== '').join(',\n');

        if (dynamicQueryRows.length === 0) {
            alert('No elements have been extracted yet. Please click "Extract Elements from List" first.');
            return;
        }

        dynamicQueryRows.forEach(rowData => {
            rowData.keywordsTextarea.value = keywordsToApply;
            autoResizeTextarea({ target: rowData.keywordsTextarea }); // Adjust height for each textarea
        });
    }

    // Initialize the UI when the document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createQueryGeneratorUI);
    } else {
        createQueryGeneratorUI();
    }
})();
