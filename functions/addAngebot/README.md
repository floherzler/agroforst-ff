# addAngebot

Cloud Function that lets admins create new offer documents that are shown on the Marktplatz. It also double-checks that the referenced product exists and keeps the available quantity in sync with the provided total quantity.

**Environment variables**

- `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` in root `.env`
- `APPWRITE_API_KEY` in root `.env` for local testing
- `APPWRITE_DATABASE_ID`
- `APPWRITE_TABLE_OFFERS_ID`
- `APPWRITE_TABLE_PRODUCTS_ID`

**Payload example**

```json
{
  "product_id": "tomate-san-marzano",
  "projected_quantity": 120,
  "available_quantity": 120,
  "unit": "piece",
  "unit_price_eur": 6.5,
  "sowing_date": "2026-05-01",
  "harvest_projection": ["2026-05-15", "2026-05-30"],
  "allocated_quantity": 0
}
```
