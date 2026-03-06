# addProdukt

Appwrite Cloud Function for admins to insert or update produce catalog entries that power the `marketing` and `zentrale` pages.

Canonical IDs now come from [`/home/flo178/projects/agroforst-ff/appwrite/resources.json`](/home/flo178/projects/agroforst-ff/appwrite/resources.json).

**Required environment variables**

- `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` in root `.env`
- `APPWRITE_API_KEY` in root `.env` for local testing
- `APPWRITE_DATABASE_ID`
- `APPWRITE_TABLE_PRODUCTS_ID`
- `APPWRITE_FUNCTION_DEBUG` (optional)

**Payload**

```json
{
  "id": "optional-document-id",
  "name": "Tomate",
  "variety": "San Marzano",
  "category": "gemuese",
  "subcategory": "fruchtgemuese",
  "lifespan": "einjaehrig",
  "crop_rotation_before": ["Kohl"],
  "crop_rotation_after": ["Salat"],
  "soil_requirements": ["Loess"],
  "companion_plants": ["Basilikum"]
}
```

Fields that are not provided are omitted from the saved document. The function first tries to create; if the document already exists it performs an update, so you can safely call it with the same `id` from the UI.
