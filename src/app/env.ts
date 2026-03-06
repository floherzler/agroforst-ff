const env = {
  appwrite: {
    endpoint: String(import.meta.env.VITE_APPWRITE_ENDPOINT ?? ""),
    project_id: String(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? ""),
    db: String(import.meta.env.VITE_DATABASE_ID ?? ""),
    storage: String(import.meta.env.VITE_STORAGE_ID ?? ""),
    post_collection_id: String(import.meta.env.VITE_POST_COLLECTION_ID ?? ""),
    angebote_collection_id: String(import.meta.env.VITE_STAFFEL_COLLECTION_ID ?? ""),
    event_collection_id: String(import.meta.env.VITE_EVENT_COLLECTION_ID ?? ""),
    produce_collection_id: String(import.meta.env.VITE_PRODUCE_COLLECTION_ID ?? ""),
    order_collection_id: String(import.meta.env.VITE_ORDER_COLLECTION_ID ?? ""),
    order_function_id: String(import.meta.env.VITE_ORDER_FUNCTION_ID ?? ""),
    membership_function_id: String(import.meta.env.VITE_MEMBERSHIP_FUNCTION_ID ?? ""),
    payment_verify_function_id: String(import.meta.env.VITE_PAYMENT_VERIFY_FUNCTION_ID ?? ""),
    add_produkt_function_id: String(import.meta.env.VITE_ADD_PRODUKT_FUNCTION_ID ?? ""),
    add_angebot_function_id: String(import.meta.env.VITE_ADD_ANGEBOT_FUNCTION_ID ?? ""),
    membership_collection_id: String(import.meta.env.VITE_MEMBERSHIP_COLLECTION_ID ?? ""),
    payment_collection_id: String(import.meta.env.VITE_PAYMENT_COLLECTION_ID ?? ""),
    nachrichten_collection_id: "nachrichten"
  }
}

export default env
