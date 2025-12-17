import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';

const filePath = 'CC - Maternity-Haryana Code on Social Security Rules, 2021 (Chapter 4- Maternity Benefit).xlsx';

/**
 * Cleans a single row object.
 * 1. Trims keys (headers).
 * 2. Removes keys that are Excel artifacts (e.g., "__EMPTY").
 * 3. Trims string values.
 * 4. Removes fields with empty values OR placeholders like "-".
 */
const cleanRow = (row) => {
    const cleaned = {};
    
    Object.keys(row).forEach((key) => {
        const cleanKey = key.trim();

        if (!cleanKey || cleanKey.startsWith('__EMPTY')) {
            return;
        }

        let value = row[key];

        if (typeof value === 'string') {
            value = value.trim();
        }

        if (value !== null && value !== undefined && value !== "" && value !== "-") {
            cleaned[cleanKey] = value;
        }
    });

    return Object.keys(cleaned).length > 0 ? cleaned : null;
};

try {
    console.log(`Reading file: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const cleanedData = rawData
        .map(row => cleanRow(row))     
        .filter(row => row !== null);

    console.log(`\n--- Summary ---`);
    console.log(`Raw Rows Parsed:    ${rawData.length}`);
    console.log(`Cleaned Rows Saved: ${cleanedData.length}`);
    console.log(`Removed Empty Rows: ${rawData.length - cleanedData.length}`);

    fs.writeFileSync('output.json', JSON.stringify(rawData, null, 2));
    fs.writeFileSync('cleaned_output.json', JSON.stringify(cleanedData, null, 2));
    console.log(`\n[✔] Files saved: 'output.json' and 'cleaned_output.json'`);

} catch (error) {
    console.error('Error processing Excel:', error.message);
}