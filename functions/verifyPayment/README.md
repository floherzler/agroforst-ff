# verifyPayment

Appwrite Cloud Function that lets admin users mark payments as verified and keeps membership state in sync.

**Environment Variables (set in Appwrite function settings)**

- `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` in root `.env`
- `APPWRITE_API_KEY` in root `.env` for local testing
- `APPWRITE_DATABASE_ID`
- `APPWRITE_TABLE_PAYMENTS_ID`
- `APPWRITE_TABLE_MEMBERSHIPS_ID`
- `APPWRITE_FUNCTION_DEBUG` (optional, enable `1` to get stack traces in the response)

**Input (JSON)**

```json
{
  "payment_id": "<Appwrite row ID>",
  "membership_id": "optional",
  "status": "paid",
  "amount": 123.45,
  "note": "Manuelle Prüfung",
  "force": true
}
```

**Authorization**

Expects `x-appwrite-user-id` header; looks up the user and ensures it has the `admin` label before touching the database.
