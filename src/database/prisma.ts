import { PrismaClient } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../env'

const connectionString = env.DATABASE_URL
export const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? [] : ["query"],
})