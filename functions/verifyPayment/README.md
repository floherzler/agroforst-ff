# verifyPayment

Appwrite Cloud Function that lets admin users mark payments as verified and keeps membership state in sync.

**Environment Variables (set in Appwrite function settings)**

- `APPWRITE_FUNCTION_API_ENDPOINT`
- `APPWRITE_FUNCTION_PROJECT_ID`
- `APPWRITE_FUNCTION_KEY` (provided via gateway header)
- `APPWRITE_FUNCTION_DATABASE_ID`
- `APPWRITE_FUNCTION_PAYMENT_COLLECTION_ID`
- `APPWRITE_FUNCTION_MEMBERSHIP_COLLECTION_ID` (optional, required if you want to update membership docs)
- `APPWRITE_FUNCTION_DEBUG` (optional, enable `1` to get stack traces in the response)

**Input (JSON)**

```json
{
  "paymentId": "<Appwrite document ID>",
  "membershipId": "optional",
  "status": "bezahlt",
  "amount": 123.45,
  "note": "Manuelle Prüfung",
  "force": true
}
```

**Authorization**

Expects `x-appwrite-user-id` header; looks up the user and ensures it has the `admin` label before touching the database.
