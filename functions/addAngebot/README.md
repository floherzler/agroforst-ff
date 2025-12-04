# addAngebot

Cloud Function that lets admins create new offer documents that are shown on the Marktplatz. It also double-checks that the referenced product exists and keeps the available quantity in sync with the provided total quantity.

**Environment variables**

- `APPWRITE_FUNCTION_API_ENDPOINT`
- `APPWRITE_FUNCTION_PROJECT_ID`
- `APPWRITE_FUNCTION_KEY`
- `APPWRITE_FUNCTION_DATABASE_ID`
- `APPWRITE_FUNCTION_STAFFEL_COLLECTION_ID`
- `APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID` (optional, used for sanity checks)

**Payload example**

```json
{
  "produktID": "tomate-san-marzano",
  "menge": 120,
  "mengeVerfuegbar": 120,
  "einheit": "Stück",
  "euroPreis": 6.5,
  "saatPflanzDatum": "2025-05-01",
  "ernteProjektion": ["2025-05-15", "2025-05-30"],
  "mengeAbgeholt": 0
}
```
