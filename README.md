# Mindlogic Language Pack 마인드로직 언어팩

마인드로직에서 지원하는 모든 언어들을 관리하기 위해 만들어진 repo 입니다.

## Scripts

### Setup:

Just `yarn`! Refer to `.env.test` for the required .env values.

### `yarn sync-gs-data`

`sync-gs-data` 은 블루밍 앱의 언어팩을 Google Spreadsheet에서 읽어옵니다. 기존에 존재하던 텍스트를 바꾸지 않고 새로 추가된 텍스트만 가져옵니다. 정리된 내용은 `gpt-intl` 스크립트에서 활용 가능하도록 `*.translations.json`파일로 정리됩니다.

### `yarn gpt-intl`

모든 `*.translations.json`을 ChatGPT를 활용해서 번역합니다. 현재 서포트되는 언어는 `ko`, `ja`, `zh`, `es`, `en` 입니다. 중국어와 일본어 번역은 한국어를 우선시하고, 나머지 언어의 번역은 영어를 베이스로 진행합니다.

To get the latest synced data from Google sheets:

```
yarn
yarn sync-gs-data
yarn gpt-intl
```

The scripts don't currently support easy ways of updating text through the Google sheet that already exists in JSON. This is done intentionally to allow easy overriding for the developer. To replace existing text, either update the JSON files directly or delete the edited JSON file and re-run the scripts.
