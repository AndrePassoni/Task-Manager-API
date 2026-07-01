import { Request, Response } from "express"
import { prisma } from "@/database/prisma"
import { AppError } from "@/utils/AppError"
import { z } from "zod"

export class TeamsController {
    async create(request: Request, response: Response) {
        const bodySchema = z.object({
            name: z.string().trim().min(2),
            description: z.string().trim().min(2),
        })

        const { name, description } = bodySchema.parse(request.body)

        const team = await prisma.teams.create({
            data: {
                name,
                description,
            },
        })

        return response.status(201).json(team)
    }

    async index(request: Request, response: Response) {
        const teams = await prisma.teams.findMany()
        return response.json(teams)
    }

    async update(request: Request, response: Response) {
        const id = request.params.id as string

        const bodySchema = z.object({
            name: z.string().trim().min(2).optional(),
            description: z.string().trim().min(2).optional(),
        })

        const { name, description } = bodySchema.parse(request.body)

        const teamExists = await prisma.teams.findUnique({
            where: { id },
        })

        if (!teamExists) {
            throw new AppError("Team not found", 404)
        }

        const team = await prisma.teams.update({
            where: { id },
            data: {
                name,
                description,
            },
        })

        return response.json(team)
    }

    async delete(request: Request, response: Response) {
        const id = request.params.id as string

        const teamExists = await prisma.teams.findUnique({
            where: { id },
        })

        if (!teamExists) {
            throw new AppError("Team not found", 404)
        }

        await prisma.$transaction([
            prisma.teamMembers.deleteMany({ where: { teamsId: id } }),
            prisma.tasks.deleteMany({ where: { teamId: id } }),
            prisma.teams.delete({ where: { id } }),
        ])

        return response.status(204).send()
    }
}
