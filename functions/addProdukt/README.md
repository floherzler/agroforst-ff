# addProdukt

Appwrite Cloud Function for admins to insert or update produce catalog entries that power the `marketing` and `zentrale` pages.

**Required environment variables**

- `APPWRITE_FUNCTION_API_ENDPOINT`
- `APPWRITE_FUNCTION_PROJECT_ID`
- `APPWRITE_FUNCTION_KEY` (supplied via the Appwrite gateway)
- `APPWRITE_FUNCTION_DATABASE_ID`
- `APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID`
- `APPWRITE_FUNCTION_DEBUG` (optional)

**Payload**

```json
{
  "id": "optional-document-id",
  "name": "Tomate",
  "sorte": "San Marzano",
  "hauptkategorie": "Gemüse",
  "unterkategorie": "Fruchtgemüse",
  "lebensdauer": "einjährig",
  "fruchtfolge_vor": ["Kohl"],
  "fruchtfolge_nach": ["Salat"],
  "bodenansprueche": ["Löss"],
  "begleitpflanzen": ["Basilikum"],
  "meta": { "mengenEinheit": "st" }
}
```

Fields that are not provided are omitted from the saved document. The function first tries to create; if the document already exists it performs an update, so you can safely call it with the same `id` from the UI.
