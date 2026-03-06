import env from "@/app/env"

import { Account, Avatars, Client, Databases, Storage, Functions } from "appwrite"

const client = new Client()
    .setEndpoint(env.appwrite.endpoint)
    .setProject(env.appwrite.project_id)

const databases = new Databases(client)
const account = new Account(client)
const avatars = new Avatars(client)
const storage = new Storage(client)
const functions = new Functions(client)

export { account, avatars, client, databases, storage, functions }
