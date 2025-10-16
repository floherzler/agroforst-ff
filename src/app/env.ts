const env = {
    appwrite: {
        endpoint: String(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT),
        project_id: String(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID),
        db: String(process.env.NEXT_PUBLIC_DATABASE_ID),
        storage: String(process.env.NEXT_PUBLIC_STORAGE_ID),
        post_collection_id: String(process.env.NEXT_PUBLIC_POST_COLLECTION_ID),
        angebote_collection_id: String(process.env.NEXT_PUBLIC_STAFFEL_COLLECTION_ID),
        event_collection_id: String(process.env.NEXT_PUBLIC_EVENT_COLLECTION_ID),
        produce_collection_id: String(process.env.NEXT_PUBLIC_PRODUCE_COLLECTION_ID),
        order_collection_id: String(process.env.NEXT_PUBLIC_ORDER_COLLECTION_ID),
        order_function_id: String(process.env.NEXT_PUBLIC_ORDER_FUNCTION_ID),
        membership_function_id: String(process.env.NEXT_PUBLIC_MEMBERSHIP_FUNCTION_ID),
    }
}

export default env
