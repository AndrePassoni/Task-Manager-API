import { Request, Response } from "express"
import { prisma } from "@/database/prisma"
import { AppError } from "@/utils/AppError"
import { z } from "zod"

export class TeamMembersController {
    async create(request: Request, response: Response) {
        const teamId = request.params.teamId as string

        const bodySchema = z.object({
            userId: z.string().uuid(),
        })

        const { userId } = bodySchema.parse(request.body)

        const teamExists = await prisma.teams.findUnique({
            where: { id: teamId },
        })

        if (!teamExists) {
            throw new AppError("Team not found", 404)
        }

        const userExists = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!userExists) {
            throw new AppError("User not found", 404)
        }

        const alreadyMember = await prisma.teamMembers.findFirst({
            where: {
                teamsId: teamId,
                userId: userId,
            },
        })

        if (alreadyMember) {
            throw new AppError("User is already a member of this team", 400)
        }

        const member = await prisma.teamMembers.create({
            data: {
                teamsId: teamId,
                userId: userId,
            },
            include: {
                teams: {
                    select: {
                        name: true,
                    },
                },
            },
        })

        return response.status(201).json({
            id: member.id,
            userId: member.userId,
            teamsId: member.teamsId,
            teamName: member.teams.name,
            createdAt: member.createdAt,
        })
    }

    async delete(request: Request, response: Response) {
        const teamId = request.params.teamId as string
        const userId = request.params.userId as string

        const memberExists = await prisma.teamMembers.findFirst({
            where: {
                teamsId: teamId,
                userId: userId,
            },
        })

        if (!memberExists) {
            throw new AppError("Member not found in this team", 404)
        }

        await prisma.teamMembers.delete({
            where: {
                id: memberExists.id,
            },
        })

        return response.status(204).send()
    }

    async index(request: Request, response: Response) {
        const teamId = request.params.teamId as string

        const teamExists = await prisma.teams.findUnique({
            where: { id: teamId },
        })

        if (!teamExists) {
            throw new AppError("Team not found", 404)
        }

        const members = await prisma.teamMembers.findMany({
            where: { teamsId: teamId },
            include: {
                teams: {
                    select: {
                        name: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        })

        const formattedMembers = members.map((member) => ({
            id: member.id,
            createdAt: member.createdAt,
            team: {
                name: member.teams.name,
            },
            user: member.user,
        }))

        return response.json(formattedMembers)
    }
}
