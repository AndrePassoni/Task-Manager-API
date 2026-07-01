import request from "supertest"
import { app } from "@/app"
import { prisma, pool } from "@/database/prisma"
import { hash } from "bcrypt"
import { cleanDatabase } from "./clean-database"
import { sign } from "jsonwebtoken"
import { authConfig } from "@/configs/auth"

describe("Tasks Flow", () => {
    let adminToken: string
    let memberToken: string
    let memberToken2: string
    let adminUser: any
    let memberUser: any
    let memberUser2: any
    let team: any

    beforeEach(async () => {
        await cleanDatabase()

        // 1. Criar usuários
        adminUser = await prisma.user.create({
            data: {
                name: "Admin User",
                email: "admin@example.com",
                password: await hash("password123", 8),
                role: "admin",
            },
        })

        memberUser = await prisma.user.create({
            data: {
                name: "Member User",
                email: "member@example.com",
                password: await hash("password123", 8),
                role: "member",
            },
        })

        memberUser2 = await prisma.user.create({
            data: {
                name: "Member User 2",
                email: "member2@example.com",
                password: await hash("password123", 8),
                role: "member",
            },
        })

        // 2. Criar Tokens
        adminToken = sign({ role: "admin" }, authConfig.jwt.secret, {
            subject: adminUser.id,
            expiresIn: authConfig.jwt.expiresIn,
        })

        memberToken = sign({ role: "member" }, authConfig.jwt.secret, {
            subject: memberUser.id,
            expiresIn: authConfig.jwt.expiresIn,
        })

        memberToken2 = sign({ role: "member" }, authConfig.jwt.secret, {
            subject: memberUser2.id,
            expiresIn: authConfig.jwt.expiresIn,
        })

        // 3. Criar Time e adicionar o primeiro Member
        team = await prisma.teams.create({
            data: {
                name: "Development Team",
                description: "The core developer team",
            },
        })

        await prisma.teamMembers.create({
            data: {
                teamsId: team.id,
                userId: memberUser.id,
            },
        })
    })

    afterAll(async () => {
        await cleanDatabase()
        await prisma.$disconnect()
        await pool.end()
    })

    it("should allow admin to create a task and assign it to a team member", async () => {
        const response = await request(app)
            .post("/tasks")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Setup API Architecture",
                description: "Setup basic structure of Express and Prisma",
                status: "pending",
                priority: "high",
                assignedTo: memberUser.id,
                teamId: team.id,
            })

        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty("id")
        expect(response.body.title).toBe("Setup API Architecture")
        expect(response.body.assignedTo).toBe(memberUser.id)
    })

    it("should prevent member from creating a task in a team they don't belong to", async () => {
        const response = await request(app)
            .post("/tasks")
            .set("Authorization", `Bearer ${memberToken2}`)
            .send({
                title: "Rogue Task",
                description: "Trying to inject a task in other team",
                status: "pending",
                priority: "low",
                assignedTo: memberUser2.id, // not in the team either
                teamId: team.id,
            })

        expect(response.status).toBe(403)
        expect(response.body.message).toBe("You do not have permission to create a task for this team")
    })

    it("should allow team members to list tasks from their team", async () => {
        await prisma.tasks.create({
            data: {
                title: "Task 1",
                description: "Description 1",
                status: "pending",
                priority: "medium",
                assignedTo: memberUser.id,
                teamId: team.id,
            },
        })

        const response = await request(app)
            .get("/tasks")
            .set("Authorization", `Bearer ${memberToken}`)

        expect(response.status).toBe(200)
        expect(response.body.length).toBe(1)
        expect(response.body[0].title).toBe("Task 1")
    })

    it("should filter listed tasks by status and priority", async () => {
        await prisma.tasks.create({
            data: {
                title: "Completed Task",
                description: "Done",
                status: "completed",
                priority: "high",
                assignedTo: memberUser.id,
                teamId: team.id,
            },
        })

        await prisma.tasks.create({
            data: {
                title: "Pending Task",
                description: "Not Done",
                status: "pending",
                priority: "low",
                assignedTo: memberUser.id,
                teamId: team.id,
            },
        })

        const response = await request(app)
            .get("/tasks?status=completed&priority=high")
            .set("Authorization", `Bearer ${memberToken}`)

        expect(response.status).toBe(200)
        expect(response.body.length).toBe(1)
        expect(response.body[0].title).toBe("Completed Task")
    })

    it("should allow a member to update a task assigned to them and record status history", async () => {
        const task = await prisma.tasks.create({
            data: {
                title: "My Task",
                description: "Details",
                status: "pending",
                priority: "medium",
                assignedTo: memberUser.id,
                teamId: team.id,
            },
        })

        const response = await request(app)
            .put(`/tasks/${task.id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({
                status: "in_progress",
            })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe("in_progress")

        // Verificar histórico no banco
        const history = await prisma.tasksHistory.findFirst({
            where: { taskId: task.id },
        })

        expect(history).not.toBeNull()
        expect(history?.oldStatus).toBe("pending")
        expect(history?.newStatus).toBe("in_progress")
        expect(history?.changedBy).toBe(memberUser.id)
    })

    it("should prevent a member from updating a task not assigned to them", async () => {
        const task = await prisma.tasks.create({
            data: {
                title: "Admin Task",
                description: "Details",
                status: "pending",
                priority: "high",
                assignedTo: adminUser.id,
                teamId: team.id,
            },
        })

        const response = await request(app)
            .put(`/tasks/${task.id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({
                status: "completed",
            })

        expect(response.status).toBe(403)
        expect(response.body.message).toBe("You can only edit your own tasks")
    })

    it("should allow viewing task history", async () => {
        const task = await prisma.tasks.create({
            data: {
                title: "History Task",
                description: "Test history logs",
                status: "pending",
                priority: "medium",
                assignedTo: memberUser.id,
                teamId: team.id,
            },
        })

        // Simular mudança de status
        await request(app)
            .put(`/tasks/${task.id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({
                status: "in_progress",
            })

        const response = await request(app)
            .get(`/tasks/${task.id}/history`)
            .set("Authorization", `Bearer ${memberToken}`)

        expect(response.status).toBe(200)
        expect(response.body.length).toBe(1)
        expect(response.body[0].oldStatus).toBe("pending")
        expect(response.body[0].newStatus).toBe("in_progress")
        expect(response.body[0].user.name).toBe("Member User")
    })
})
