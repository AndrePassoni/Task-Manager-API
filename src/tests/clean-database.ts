import { prisma } from "@/database/prisma"

export async function cleanDatabase() {
    await prisma.tasksHistory.deleteMany()
    await prisma.tasks.deleteMany()
    await prisma.teamMembers.deleteMany()
    await prisma.teams.deleteMany()
    await prisma.user.deleteMany()
}
