const { google } = require("googleapis");
const path = require("path");
var fs = require("fs");
require("dotenv").config();

// Parse the GOOGLE_CLOUD_API_KEY from the environment variable
const googleCloudApiKey = JSON.parse(process.env.GOOGLE_CLOUD_API_KEY);

// Set up the JWT client
const auth = new google.auth.GoogleAuth({
  credentials: googleCloudApiKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const snakeCase = (string) => {
  return (string ?? "")
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join("_");
};

// Create a Sheets API client
const sheets = google.sheets({ version: "v4", auth });

// The ID of the spreadsheet and the range of cells to read
const spreadsheetIds = [
  {
    id: "1kqiRVv8ctThKi6pAI4VfCc8AhPRz1Xjmfy423vwOOp8",
    name: "blooming-app",
  },
  {
    id: "1UOuuYqVb62m1OLlEKUsu-7XZOeo-ebUyS1lpO2PRVvY",
    name: "blooming-artist-app",
  },
  {
    id: "1gZArMBdjgLQGdAVwPy6xJKjc3N7mPp-uyAMHyI1-WHo",
    name: "blooming-console",
  },
];
const range = "화면";

const columnMappings = {
  4: "pageName",
  5: "translateKey",
  6: "ko",
  7: "en",
  8: "zh",
  9: "ja",
};

const processGoogleSheetText = (text) => {
  return text
    ?.replaceAll("\\n", "\n")
    .replaceAll("\n\n", "\n")
    .replaceAll(/[\u2028\u2029]/g, "")
    .split("\n")
    .map((s) => s.trim())
    .join("\n");
};

const fetchGoogleSheetData = async (spreadsheetId, folderName) => {
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
        const cellValue = row[colIndex - 1] || undefined; // Adjust for 0-based index

        if (columnName === "pageName") {
          pageName = snakeCase(cellValue);
        } else {
          rowData[columnName] = cellValue;
        }
      });

      if (pageName) {
        if (!data[pageName]) {
          data[pageName] = {};
        }
        data[pageName][rowData.translateKey] = {
          ko: processGoogleSheetText(rowData.ko),
          en: processGoogleSheetText(rowData.en),
          zh: processGoogleSheetText(rowData.zh),
          ja: processGoogleSheetText(rowData.ja),
        };
      }
    });

    console.log("DATA", data);

    const dir = path.resolve(__dirname, `../content/${folderName}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write each pageName's data into separate JSON files
    Object.keys(data).forEach((pageName) => {
      const filePath = path.join(dir, `${pageName}.translations.json`);

      let existingData = {};
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf8");
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

spreadsheetIds.forEach(({ id, name }) => {
  fetchGoogleSheetData(id, name);
});
