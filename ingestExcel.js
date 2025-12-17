import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import dotenv from 'dotenv';
import { createChunksFromCompliance } from './createChunks.js';
// import { createLocalEmbedding } from './localEmbeddings.js';
import { createEmbeddingsFromText } from './utils/helper.js';

// dotenv.config();

const JSON_FILE = './cleaned_output.json';
const BATCH_SIZE = 50;
const PINECONE_INDEX = "lexbot-openai";
const PINECONE_NAMESPACE = "v4-test-openai";
const EXPECTED_DIMENSION = 1024;
const ACT_NAME = "Maternity-Haryana Code on Social Security Rules, 2021 (Chapter 4- Maternity Benefit)";

const slug = (s) => String(s).toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_-]/g,'').slice(0,64);

const runIngestion = async () => {
  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(PINECONE_INDEX).namespace(PINECONE_NAMESPACE);

    console.log("📂 Reading JSON file...");
    const rawData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`📊 Loaded ${rawData.length} original records.`);

    let batch = [];
    let totalVectors = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const chunks = createChunksFromCompliance(row);
      const baseMetadata = {
        actName: ACT_NAME,
        subHead: row["Sub-Head"] || "",
        complianceDescription: row['Compliance Description'] || '',
        state: row["State Name"] ? row["State Name"].toLowerCase() : "haryana",
        scope: row["Applicability-Geog"] ? row["Applicability-Geog"].toLowerCase() : "state",
        criticality: row["Criticality"] || "High",
        periodicity: row["Periodicity"] || "Event Based",
        eventPeriodicity: (row["Event Periodicity"] && row["Event Periodicity"].length > 3) ? row["Event Periodicity"].toLowerCase() : "NA",
        applicableOnline: row["Is Applicable Online"] === "Yes",
        potentialImpact: row["Potential Impact"] || "NA",
        documentType: "compliance",
        section: row["Section"] ? String(row["Section"]) : "",
        subSection: row["Sub-Section"] ? String(row["Sub-Section"]) : "",
        rule: row["Rule/ Paragraph No."] ? String(row["Rule/ Paragraph No."]) : "",
        formName: row["Name of the form"] || "",
        formPurpose: row["Purpose of form"] || "",

        complianceType: row["Compliance Type"] || row["Type"] || "Statutory",
        applicability: row["Applicability"] || "",
        department: row["Department"] || "",
        keyDefinitions: row["Key Definitions"] || "",
        ruleName: row["Name of the rule or bi-laws"] || "",
        authority: row["Authority"] || row["Statutory Agency"] || "",
        siteAddress: row["Site Address"] || "",
        provision: row["Provision"] || "",
        triggerEvent: row["Events"] || "",
        dueDate: row["Due Date"] || "",
        expiryDate: row["Expiry Date"] || "",
        exemptions: row["Exemption"] || "",
        remarks: row["Remarks if any"] || ""
      };

      for (const [chunkType, chunkText] of Object.entries(chunks)) {
        if (!chunkText || chunkText.length < 5 || chunkText.includes("undefined")) continue;

        // const vector = await createLocalEmbedding(chunkText);
        const vector = await createEmbeddingsFromText(chunkText);

        if (!vector || !Array.isArray(vector)) {
          console.warn(`Skipping chunk - no vector returned for row ${i} ${chunkType}`);
          continue;
        }
        if (vector.length !== EXPECTED_DIMENSION) {
          console.error(`Skipping chunk - wrong vector dimension (${vector.length}) for row ${i} ${chunkType}. Expected ${EXPECTED_DIMENSION}.`);
          continue;
        }

        const metadata = {
          ...baseMetadata,
          chunk_type: chunkType,
          original_id: i
        };

        const id = `row_${i}_${slug(chunkType)}`;
        batch.push({ id, values: vector, metadata });

        if (batch.length >= BATCH_SIZE) {
          await index.upsert(batch);
          totalVectors += batch.length;
          console.log(`🚀 Uploaded batch. Total vectors: ${totalVectors}`);
          batch = [];
        }
      }
    }

    if (batch.length > 0) {
      await index.upsert(batch);
      totalVectors += batch.length;
      console.log(`🚀 Uploaded final batch. Total vectors: ${totalVectors}`);
    }

    console.log("✅ Ingestion Complete!");
  } catch (err) {
    console.error("❌ Error during ingestion:", err);
  }
};

runIngestion();