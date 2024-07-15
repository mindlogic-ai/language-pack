const { program } = require("commander");
const axios = require("axios");
var fs = require("fs");
const { isObject } = require("lodash");
var { glob } = require("glob");
const path = require('path');

const API_URL =
  "http://ec2-3-37-133-37.ap-northeast-2.compute.amazonaws.com/api/utils/intl/";

program
  .name("gpt-i18n")
  .description("CLI to help generate translated website content")
  .version("0.0.1");

// Options
program
  .option("-d, --debug", "output extra debugging", false)
  .option(
    "-l, --languages",
    "comma-separated list of language codes to translate to",
    "ko,en,es,ja,zh"
  )
  .option(
    "-srcLang, --sourceLanguage",
    "preferred source language to translate from when multiple language values already exist",
    "en"
  );

program.parse();

const options = program.opts();
const languages = options.languages.split(",");
const preferredSourceLanguage = options.sourceLanguage;

const { google } = require("googleapis");
require("dotenv").config();

// Parse the GOOGLE_CLOUD_API_KEY from the environment variable
const googleCloudApiKey = JSON.parse(process.env.GOOGLE_CLOUD_API_KEY);

// Set up the JWT client
const auth = new google.auth.GoogleAuth({
  credentials: googleCloudApiKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

// Create a Sheets API client
const sheets = google.sheets({ version: "v4", auth });

// The ID of the spreadsheet and the range of cells to read
const spreadsheetId = "1kqiRVv8ctThKi6pAI4VfCc8AhPRz1Xjmfy423vwOOp8";
const range = "화면";

const columnMappings = {
  4: "pageName",
  5: "translateKey",
  6: "ko",
  7: "en",
  8: "zh",
  9: "ja",
};

// UTILS
const fetchGoogleSheetData = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = response.data.values;

  if (values && values.length) {
    const data = {};
    
    values.forEach((row, rowIndex) => {
      if (rowIndex === 0) return; // Skip header row

      const rowData = {};
      let pageName = "";

      Object.keys(columnMappings).forEach((colIndex) => {
        const columnName = columnMappings[colIndex];
        const cellValue = row[colIndex - 1] || ""; // Adjust for 0-based index

        if (columnName === "pageName") {
          pageName = cellValue;
        } else {
          rowData[columnName] = cellValue;
        }
      });

      if (pageName) {
        if (!data[pageName]) {
          data[pageName] = {};
        }
        data[pageName][rowData.translateKey] = {
          ko: rowData.ko,
          en: rowData.en,
          zh: rowData.zh,
          ja: rowData.ja,
        };
      }
    });

    console.log("DATA", data)

    const dir = path.resolve(__dirname, '../content/blooming-app');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    
    // Write each pageName's data into separate JSON files
    Object.keys(data).forEach((pageName) => {
      const filePath = path.join(dir, `${pageName}.translations.json`);
      
      let existingData = {};
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      }

      // Merge new data with existing data
      const newData = data[pageName];
      Object.keys(newData).forEach((key) => {
        if (!existingData[key]) {
          existingData[key] = newData[key];
        }
      });

      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf8");
      console.log(`Data for ${pageName} saved to ${filePath}`);
    });
  } else {
    console.log("No data found.");
  }
};

fetchGoogleSheetData();

const hasSameElements = (arr1, arr2) =>
  arr1.sort().join(",") === arr2.sort().join(",");

const getReferenceText = (strOrObj) => {
  if (isObject(strOrObj)) {
    return strOrObj[preferredSourceLanguage]
      ? strOrObj[preferredSourceLanguage]
      : // if no preferred source language, default to first key
        strOrObj[Object.keys(strOrObj)[0]];
  } else {
    return strOrObj;
  }
};

const processFile = (sourceFilePath) => {
  let NEW_OBJ = {};

  const data = fs.readFileSync(sourceFilePath, { encoding: "utf-8" });
  const obj = JSON.parse(data);
  console.log(`Translating ${Object.keys(obj).length} keys to:`, languages);
  // Translate the values and write to NEW_OBJ
  const translations = Object.keys(obj).map(async (key) => {
    const localeValues = obj[key];
    const existingLanguageCodes = Object.keys(localeValues);
    if (
      isObject(localeValues) &&
      hasSameElements(existingLanguageCodes, languages)
    ) {
      console.log("skipping ", key);
      NEW_OBJ[key] = localeValues;
    } else {
      // send API request
      try {
        const reference_text = getReferenceText(localeValues);
        console.log("translating reference text", key, reference_text);
        const res = await axios.post(API_URL, {
          reference_text,
        });
        console.log("completed translation for:", key);
        NEW_OBJ[key] = res.data.translations;
      } catch (err) {
        console.error(err);
        NEW_OBJ[key] = obj[key];
        return;
      }
    }
  });

  Promise.all(translations).then(() => {
    // Write the new values into the file
    fs.writeFileSync(sourceFilePath, JSON.stringify(NEW_OBJ, null, 2));
  });
};

const processFiles = async () => {
  const files = await glob("**/*.translations.json", {
    ignore: "node_modules/**",
  });
  files
    // .filter(filepath => !sourceFilePath || sourceFilePath === filepath)
    .map((filepath) => {
      console.log(`Processing ${filepath}...`);
      processFile(filepath);
    });
};
processFiles();
