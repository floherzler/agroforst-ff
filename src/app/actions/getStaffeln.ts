export const dynamic = "force-dynamic";

import { listStaffeln } from "@/lib/appwrite/appwriteProducts"

export async function getStaffeln(): Promise<Staffel[]> {
    console.log("Fetching staffeln...")
    return listStaffeln()
}
