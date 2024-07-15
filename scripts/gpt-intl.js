const { program } = require("commander");
const axios = require("axios");
var fs = require("fs");
const { isObject } = require("lodash");
var glob = require("glob");

const API_URL =
  "http://ec2-3-37-133-37.ap-northeast-2.compute.amazonaws.com/api/utils/intl/";

program
  .name("gpt-i18n")
  .description("CLI to help generate translated website content")
  .version("0.0.1");

// Options
program.option("-d, --debug", "output extra debugging", false);

program.parse();

const options = program.opts();
const languages = options.languages.split(",");
const preferredSourceLanguage = options.sourceLanguage;

// UTILS
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

glob("**/*/**.translations.json", options, function (er, files) {
  // files is an array of filenames.
  // If the `nonull` option is set, and nothing
  // was found, then files is ["**/*.js"]
  // er is an error object or null.
  files
    // .filter(filepath => !sourceFilePath || sourceFilePath === filepath)
    .map((filepath) => {
      console.log(`Processing ${filepath}...`);
      processFile(filepath);
    });
});
