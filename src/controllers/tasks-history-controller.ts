import { Request, Response } from "express"
import { prisma } from "@/database/prisma"
import { AppError } from "@/utils/AppError"

export class TasksHistoryController {
    async index(request: Request, response: Response) {
        const taskId = request.params.taskId as string

        const task = await prisma.tasks.findUnique({
            where: { id: taskId },
        })

        if (!task) {
            throw new AppError("Task not found", 404)
        }

        // Permissões: admin acessa tudo; member acessa se pertencer ao time da tarefa
        if (request.user!.role !== "admin") {
            const isMemberOfTeam = await prisma.teamMembers.findFirst({
                where: {
                    teamsId: task.teamId,
                    userId: request.user!.id,
                },
            })

            if (!isMemberOfTeam) {
                throw new AppError("You do not have permission to view this task's history", 403)
            }
        }

        const history = await prisma.tasksHistory.findMany({
            where: { taskId },
            orderBy: { changedAt: "asc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        return response.json(history)
    }
}
