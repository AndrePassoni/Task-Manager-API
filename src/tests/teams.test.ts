import request from "supertest"
import { app } from "@/app"
import { prisma, pool } from "@/database/prisma"
import { hash } from "bcrypt"
import { cleanDatabase } from "./clean-database"
import { sign } from "jsonwebtoken"
import { authConfig } from "@/configs/auth"

describe("Teams and Members Flow", () => {
    let adminToken: string
    let memberToken: string
    let adminUser: any
    let memberUser: any

    beforeEach(async () => {
        await cleanDatabase()

        // 1. Criar usuário Admin no banco
        adminUser = await prisma.user.create({
            data: {
                name: "Admin User",
                email: "admin@example.com",
                password: await hash("password123", 8),
                role: "admin",
            },
        })

        // 2. Criar usuário Member no banco
        memberUser = await prisma.user.create({
            data: {
                name: "Member User",
                email: "member@example.com",
                password: await hash("password123", 8),
                role: "member",
            },
        })

        // 3. Gerar tokens JWT
        adminToken = sign({ role: "admin" }, authConfig.jwt.secret, {
            subject: adminUser.id,
            expiresIn: authConfig.jwt.expiresIn,
        })

        memberToken = sign({ role: "member" }, authConfig.jwt.secret, {
            subject: memberUser.id,
            expiresIn: authConfig.jwt.expiresIn,
        })
    })

    afterAll(async () => {
        await cleanDatabase()
        await prisma.$disconnect()
        await pool.end()
    })

    it("should allow admin to create a new team", async () => {
        const response = await request(app)
            .post("/teams")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                name: "Development Team",
                description: "The core developer team",
            })

        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty("id")
        expect(response.body.name).toBe("Development Team")
    })

    it("should prevent member from creating a new team", async () => {
        const response = await request(app)
            .post("/teams")
            .set("Authorization", `Bearer ${memberToken}`)
            .send({
                name: "Intruder Team",
                description: "A team created by a member",
            })

        expect(response.status).toBe(403)
        expect(response.body.message).toBe("Forbidden")
    })

    it("should allow admin to list all teams", async () => {
        await prisma.teams.create({
            data: {
                name: "Development Team",
                description: "The core developer team",
            },
        })

        const response = await request(app)
            .get("/teams")
            .set("Authorization", `Bearer ${adminToken}`)

        expect(response.status).toBe(200)
        expect(response.body.length).toBe(1)
        expect(response.body[0].name).toBe("Development Team")
    })

    it("should allow admin to add a member to a team", async () => {
        const team = await prisma.teams.create({
            data: {
                name: "Development Team",
                description: "The core developer team",
            },
        })

        const response = await request(app)
            .post(`/teams/${team.id}/members`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                userId: memberUser.id,
            })

        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty("id")
        expect(response.body.teamsId).toBe(team.id)
        expect(response.body.userId).toBe(memberUser.id)
    })

    it("should allow authenticated users to list members of a team", async () => {
        const team = await prisma.teams.create({
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

        const response = await request(app)
            .get(`/teams/${team.id}/members`)
            .set("Authorization", `Bearer ${memberToken}`)

        expect(response.status).toBe(200)
        expect(response.body.length).toBe(1)
        expect(response.body[0].user.email).toBe("member@example.com")
    })

    it("should allow admin to remove a member from a team", async () => {
        const team = await prisma.teams.create({
            data: {
                name: "Development Team",
                description: "The core developer team",
            },
        })

        const member = await prisma.teamMembers.create({
            data: {
                teamsId: team.id,
                userId: memberUser.id,
            },
        })

        const response = await request(app)
            .delete(`/teams/${team.id}/members/${memberUser.id}`)
            .set("Authorization", `Bearer ${adminToken}`)

        expect(response.status).toBe(204)

        const memberInDb = await prisma.teamMembers.findFirst({
            where: { id: member.id },
        })
        expect(memberInDb).toBeNull()
    })
})
