const createChunksFromCompliance = (compliance) => {
    const get = (key) => {
        return compliance[key];
    };

    const ACT_NAME = "Maternity-Haryana Code on Social Security Rules, 2021 (Chapter 4- Maternity Benefit)";

    // Most Maternity compliances are "Event Based" (triggered by pregnancy/birth).
    // Returns are typically "Annual".
    const determineFrequency = (desc, existingFreq) => {
        if (existingFreq && existingFreq !== "-" && existingFreq !== "NA") return existingFreq;
        const lowerDesc = String(desc).toLowerCase();
        if (lowerDesc.includes("return") || lowerDesc.includes("annual")) return "Annual";
        if (lowerDesc.includes("register") || lowerDesc.includes("record")) return "Ongoing";
        return "Event Based";
    };

    const determineType = (existingType) => {
        if (existingType && existingType !== "-" && existingType !== "NA") return existingType;
        return "Statutory";
    };

    // --- EXTRACT DATA ---
    const rawFreq = get("Frequency") || get("Periodicity");
    const rawType = get("Compliance Type") || get("Type");
    const desc = get("Description") || get("Compliance Description") || get("Compliance");
    
    const frequency = determineFrequency(desc, rawFreq);
    const type = determineType(rawType);
    const state = "Haryana";

    // --- CREATE CHUNKS ---

    const overviewChunk = `
        **Act:** ${ACT_NAME}.
        **State:** ${state}.
        **Type:** ${type}.
        **Frequency:** ${frequency}.
        **Summary:** This is a ${frequency.toLowerCase()} compliance requirement under the ${ACT_NAME} applicable in ${state}.
    `.replace(/\s+/g, ' ').trim();

    const applicability = get("Applicability") || "All establishments covered under the Code on Social Security";
    const descriptionChunk = `
        **Requirement:** ${desc}.
        **Applicability:** ${applicability}.
        ${get("Department") ? `**Department:** ${get("Department")}.` : ""}
    `.replace(/\s+/g, ' ').trim();

    const definitions = get("Key Definitions");
    const definitionsChunk = `
        **Key Legal Definitions for Context:**
        ${definitions}
    `.replace(/\s+/g, ' ').trim();

    const section = get("Section");
    const subSection = get("Sub-Section");
    const rule = get("Rule/ Paragraph No.");
    const ruleName = get("Name of the rule or bi-laws");
    
    const ruleChunk = `
        **Legal Reference:**
        ${section ? `Section ${section}${subSection ? `(${subSection})` : ""}` : "Section: As applicable per the Code"}.
        ${rule ? `Rule ${rule}` : ""}.
        ${ruleName ? `Rule Name: "${ruleName}"` : ""}.
    `.replace(/\s+/g, ' ').trim();

    const authority = get("Authority") || get("Statutory Agency") || "Labour Department, Haryana";
    const formName = get("Name of the form") || get("Form"); 
    const formPurpose = get("Purpose of form");
    const website = get("Site Address") || "https://hrylabour.gov.in/"; 

    const executionChunk = `
        **Execution Details:**
        **Authority:** ${authority}.
        **Filing Mode:** ${get("Is Applicable Online") === "Yes" ? "Online filing." : "Manual filing."}.
        **Official Website:** ${website}.
        ${formName ? `**Required Form:** "${formName}" ${formPurpose ? `for ${formPurpose}` : ""}.` : ""}
    `.replace(/\s+/g, ' ').trim();

    const penalty = get("Penalty") || get("Potential Impact") || "Monetary fines and legal action as per Code on Social Security, 2020";
    const criticality = get("Criticality") || "High"; 

    const riskChunk = `
        **Risk Profile:**
        **Criticality:** ${criticality}.
        **Non-Compliance Impact:** ${penalty}.
        ${get("Provision") ? `**Provision Text:** ${get("Provision")}` : ""}
    `.replace(/\s+/g, ' ').trim();

    const eventChunk = `
        **Timeline:**
        ${get("Events") ? `Trigger Event: ${get("Events")}.` : ""}
        ${get("Due Date") ? `Due Date: ${get("Due Date")}.` : ""}
        ${get("Expiry Date") ? `Expiry: ${get("Expiry Date")}.` : ""}
    `.replace(/\s+/g, ' ').trim();

    const remarksChunk = `
        ${get("Exemption") ? `**Exemptions:** ${get("Exemption")}.` : ""}
        ${get("Remarks if any") ? `**Notes:** ${get("Remarks if any")}.` : ""}
    `.replace(/\s+/g, ' ').trim();

    const allChunks = {
        "overview": overviewChunk,
        "description": descriptionChunk,
        "definitions": definitionsChunk,
        "rule": ruleChunk,
        "execution": executionChunk,
        "risk": riskChunk,
        "event": eventChunk,
        "remarks": remarksChunk
    };

    Object.keys(allChunks).forEach((k) => {
        if (!allChunks[k] || allChunks[k].length < 25) delete allChunks[k];
        else allChunks[k] = allChunks[k].replace(/\s+/g, ' ').trim();
    });

    return allChunks;
};

export { createChunksFromCompliance };