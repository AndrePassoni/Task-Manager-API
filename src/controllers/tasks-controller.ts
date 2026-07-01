import { Request, Response } from "express"
import { prisma } from "@/database/prisma"
import { AppError } from "@/utils/AppError"
import { z } from "zod"

const TaskStatusEnum = z.enum(["pending", "in_progress", "completed"])
const TaskPriorityEnum = z.enum(["high", "medium", "low"])

export class TasksController {
    async create(request: Request, response: Response) {
        const bodySchema = z.object({
            title: z.string().trim().min(2),
            description: z.string().trim().min(2),
            status: TaskStatusEnum.default("pending"),
            priority: TaskPriorityEnum,
            assignedTo: z.string().uuid(),
            teamId: z.string().uuid(),
        })

        const { title, description, status, priority, assignedTo, teamId } = bodySchema.parse(request.body)

        const teamExists = await prisma.teams.findUnique({
            where: { id: teamId },
        })

        if (!teamExists) {
            throw new AppError("Team not found", 404)
        }

        const userExists = await prisma.user.findUnique({
            where: { id: assignedTo },
        })

        if (!userExists) {
            throw new AppError("Assigned user not found", 404)
        }

        // Se for member, verificar se ele pertence ao time
        if (request.user!.role !== "admin") {
            const isMember = await prisma.teamMembers.findFirst({
                where: {
                    teamsId: teamId,
                    userId: request.user!.id,
                },
            })

            if (!isMember) {
                throw new AppError("You do not have permission to create a task for this team", 403)
            }
        }

        // Verificar se o usuário atribuído é membro do time
        const isAssignedMember = await prisma.teamMembers.findFirst({
            where: {
                teamsId: teamId,
                userId: assignedTo,
            },
        })

        if (!isAssignedMember) {
            throw new AppError("Assigned user is not a member of this team", 400)
        }

        const task = await prisma.tasks.create({
            data: {
                title,
                description,
                status,
                priority,
                assignedTo,
                teamId,
            },
        })

        return response.status(201).json(task)
    }

    async index(request: Request, response: Response) {
        const querySchema = z.object({
            status: TaskStatusEnum.optional(),
            priority: TaskPriorityEnum.optional(),
        })

        const { status, priority } = querySchema.parse(request.query)

        const whereClause: any = {}

        if (request.user!.role !== "admin") {
            const userTeams = await prisma.teamMembers.findMany({
                where: { userId: request.user!.id },
            })
            const teamIds = userTeams.map((ut) => ut.teamsId)
            whereClause.teamId = { in: teamIds }
        }

        if (status) {
            whereClause.status = status
        }

        if (priority) {
            whereClause.priority = priority
        }

        const tasks = await prisma.tasks.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                teams: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        return response.json(tasks)
    }

    async update(request: Request, response: Response) {
        const id = request.params.id as string

        const bodySchema = z.object({
            title: z.string().trim().min(2).optional(),
            description: z.string().trim().min(2).optional(),
            status: TaskStatusEnum.optional(),
            priority: TaskPriorityEnum.optional(),
            assignedTo: z.string().uuid().optional(),
        })

        const data = bodySchema.parse(request.body)

        const task = await prisma.tasks.findUnique({
            where: { id },
        })

        if (!task) {
            throw new AppError("Task not found", 404)
        }

        // Permissões: admin atualiza tudo; member apenas se a tarefa for dele
        if (request.user!.role !== "admin" && task.assignedTo !== request.user!.id) {
            throw new AppError("You can only edit your own tasks", 403)
        }

        if (data.assignedTo) {
            // Verificar se o novo usuário faz parte do mesmo time da tarefa
            const isMember = await prisma.teamMembers.findFirst({
                where: {
                    teamsId: task.teamId,
                    userId: data.assignedTo,
                },
            })

            if (!isMember) {
                throw new AppError("Assigned user is not a member of the task's team", 400)
            }
        }

        // Se mudar o status, salva no histórico
        if (data.status && data.status !== task.status) {
            await prisma.tasksHistory.create({
                data: {
                    taskId: task.id,
                    changedBy: request.user!.id,
                    oldStatus: task.status,
                    newStatus: data.status,
                },
            })
        }

        const updatedTask = await prisma.tasks.update({
            where: { id },
            data,
        })

        return response.json(updatedTask)
    }

    async delete(request: Request, response: Response) {
        const id = request.params.id as string

        const task = await prisma.tasks.findUnique({
            where: { id },
        })

        if (!task) {
            throw new AppError("Task not found", 404)
        }

        if (request.user!.role !== "admin" && task.assignedTo !== request.user!.id) {
            throw new AppError("You can only delete your own tasks", 403)
        }

        // Deletar dependências de histórico primeiro
        await prisma.$transaction([
            prisma.tasksHistory.deleteMany({ where: { taskId: id } }),
            prisma.tasks.delete({ where: { id } }),
        ])

        return response.status(204).send()
    }

    async assign(request: Request, response: Response) {
        const id = request.params.id as string

        const bodySchema = z.object({
            assignedTo: z.string().uuid(),
        })

        const { assignedTo } = bodySchema.parse(request.body)

        const task = await prisma.tasks.findUnique({
            where: { id },
        })

        if (!task) {
            throw new AppError("Task not found", 404)
        }

        if (request.user!.role !== "admin" && task.assignedTo !== request.user!.id) {
            throw new AppError("You can only reassign tasks that are assigned to you", 403)
        }

        const isMember = await prisma.teamMembers.findFirst({
            where: {
                teamsId: task.teamId,
                userId: assignedTo,
            },
        })

        if (!isMember) {
            throw new AppError("Assigned user is not a member of the task's team", 400)
        }

        const updatedTask = await prisma.tasks.update({
            where: { id },
            data: {
                assignedTo,
            },
        })

        return response.json(updatedTask)
    }
}
