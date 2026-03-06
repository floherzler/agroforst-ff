const env = {
  appwrite: {
    endpoint: String(import.meta.env.VITE_APPWRITE_ENDPOINT ?? ""),
    project_id: String(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? ""),
  },
};

export default env;
