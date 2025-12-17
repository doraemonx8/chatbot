import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const JSON_FILE = './cleaned_output.json';
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
  console.error('Missing NEO4J env vars. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD');
  process.exit(1);
}


const determineFrequency = (desc, existingFreq) => {
  const cleanFreq = existingFreq ? String(existingFreq).trim().toLowerCase() : '';
  if (cleanFreq && !['-', 'na', 'n/a', 'none', ''].includes(cleanFreq)) return cleanFreq;

  const lower = String(desc || '').toLowerCase();
  if (/annual|annually|yearly|once a year|every year/.test(lower)) return 'Annual';
  if (/quarter|quarterly|q1|q2|q3|q4/.test(lower)) return 'Quarterly';
  if (/month|monthly/.test(lower)) return 'Monthly';
  if (/week|weekly/.test(lower)) return 'Weekly';
  if (/every day|daily/.test(lower)) return 'Daily';
  if (/register|record|maintain|maintaining|keep|ongoing/.test(lower)) return 'Ongoing';
  if (/return|due date|file by|last date|submit by/.test(lower)) return 'Event Based';
  return 'Event Based';
};


const runGraphIngestion = async () => {
    let driver;
    try {
        console.log("🔌 Connecting to Neo4j...");
        driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
        await driver.verifyConnectivity();
        console.log("✅ Connected to Neo4j!");

        console.log("📂 Reading JSON file...");
        const rawData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
        
        const session = driver.session();

        console.log(`🚀 Starting ingestion of ${rawData.length} records...`);
        
        const cypherQuery = `
            // 1. Establish Hierarchy (Act & State)
            MERGE (state:State {name: $stateName})
            MERGE (act:Act {name: $actName})
            MERGE (act)-[:APPLIES_TO]->(state)

            // 2. Create Topic/Sub-Head Node
            MERGE (topic:Topic {name: $subHead})

            // 3. Create the Main Compliance Node
            MERGE (c:Compliance {id: $complianceId})
            SET c.description = $complianceDesc,
                c.criticality = $criticality,
                c.periodicity = $periodicity,
                c.eventPeriodicity = $eventPeriodicity,
                c.dueDate = $dueDate,
                c.penalty = $penalty,
                c.applicabilityFull = $applicability,
                c.exemptions = $exemption,
                c.keyDefinitions = $definitions,
                c.siteUrl = $siteUrl,
                c.isOnline = $isApplicableOnline,
                c.potentialImpact = $potentialImpact,
                c.remarks = $remarks,
                c.nameOfRuleOrBiLaws = $nameOfRuleOrBiLaws

            // 4. Link Compliance to Hierarchy
            MERGE (c)-[:BELONGS_TO]->(act)
            MERGE (c)-[:APPLICABLE_IN]->(state)
            MERGE (c)-[:CATEGORIZED_AS]->(topic)

            // 5. Handle Authority (Statutory Agency)
            FOREACH (ignoreMe IN CASE WHEN $authorityName IS NOT NULL THEN [1] ELSE [] END |
                MERGE (auth:Authority {name: $authorityName})
                ON CREATE SET auth.address = $authorityAddress
                MERGE (c)-[:OVERSEEN_BY]->(auth)
            )

            // 6. Handle Section (Create Node and Link)
            FOREACH (ignoreMe IN CASE WHEN $section IS NOT NULL THEN [1] ELSE [] END |
                MERGE (sec:Section {name: toString($section), act: $actName})
                ON CREATE SET sec.subSection = toString($subSection)
                MERGE (c)-[:DERIVED_FROM_SECTION]->(sec)
                MERGE (sec)-[:PART_OF]->(act)
            )

            // 7. Handle Rules (Create Node and Link)
            FOREACH (ignoreMe IN CASE WHEN $rule IS NOT NULL THEN [1] ELSE [] END |
                MERGE (r:Rule {name: toString($rule), act: $actName})
                MERGE (c)-[:DERIVED_FROM_RULE]->(r)
                MERGE (r)-[:PART_OF]->(act)
            )

            // 8. Handle Forms (Create Node and Link)
            FOREACH (ignoreMe IN CASE WHEN $formName IS NOT NULL THEN [1] ELSE [] END |
                MERGE (f:Form {name: $formName})
                ON CREATE SET f.purpose = $formPurpose
                MERGE (c)-[:REQUIRES_SUBMISSION]->(f)
            )
        `;

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];

            const rawFreq = row["Frequency"] || row["Periodicity"];
            const description = row["Compliance Description"];
            const calculatedPeriodicity = determineFrequency(description, rawFreq);

            const autoId = i + 1;
            const uniqueId = `HARYANA_MATERNITY_${autoId}`;

            const params = {
                // Base Hierarchical Data
                actName: "Maternity-Haryana Code on Social Security Rules, 2021 (Chapter 4- Maternity Benefit)",
                stateName: row["State Name"] || "Haryana",
                subHead: row["Sub-Head"] || "General",

                // Core Compliance Data
                complianceId: uniqueId, 
                
                complianceDesc: row["Compliance Description"],
                criticality: row["Criticality"],
                periodicity: calculatedPeriodicity,
                eventPeriodicity: row["Event Periodicity"] || null,
                dueDate: row["Due Date"] || null,
                isApplicableOnline: row["Is Applicable Online"],
                siteUrl: row["Site Address"],

                // Long Text Fields
                applicability: row["Applicability"],
                penalty: row["Penal Provision"],
                potentialImpact: row["Potential Impact"],
                definitions: row["Key Definitions"],
                exemption: row["Exemption"] || null,
                remarks: row["Remarks if any"] || null,

                // Entities
                section: row["Section"] || null,
                subSection: row["Sub-Section"] || null,
                rule: row["Rule/ Paragraph No."] || null,
                nameOfRuleOrBiLaws: row["Name of the rule or bi-laws"] || null,
                
                formName: row["Name of the form"] || null,
                formPurpose: row["Purpose of form"] || null,
                
                authorityName: row["Statutory Agency"] || null,
                authorityAddress: row["Statutory Agency Address"] || null
            };

            await session.run(cypherQuery, params);
            
            process.stdout.write(`\r✅ Ingested record ${i + 1} of ${rawData.length} (ID: ${uniqueId})`);
        }

        console.log("\n\n🎉 Graph Ingestion Complete!");
        await session.close();

    } catch (err) {
        console.error("\n❌ Error during graph ingestion:", err);
    } finally {
        if (driver) await driver.close();
    }
};

runGraphIngestion();