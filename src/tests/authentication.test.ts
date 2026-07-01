import request from "supertest"
import { app } from "@/app"
import { cleanDatabase } from "./clean-database"
import { prisma, pool } from "@/database/prisma"

describe("Authentication Flow", () => {
    beforeEach(async () => {
        await cleanDatabase()
    })

    afterAll(async () => {
        await cleanDatabase()
        await prisma.$disconnect()
        await pool.end()
    })

    it("should be able to create a new user account", async () => {
        const response = await request(app)
            .post("/users")
            .send({
                name: "John Doe",
                email: "johndoe@example.com",
                password: "password123",
            })

        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty("id")
        expect(response.body.email).toBe("johndoe@example.com")
        expect(response.body).not.toHaveProperty("password")
    })

    it("should not be able to create a user with an existing email", async () => {
        await request(app)
            .post("/users")
            .send({
                name: "John Doe",
                email: "johndoe@example.com",
                password: "password123",
            })

        const response = await request(app)
            .post("/users")
            .send({
                name: "John Doe 2",
                email: "johndoe@example.com",
                password: "password456",
            })

        expect(response.status).toBe(400)
        expect(response.body.message).toBe("Email already in use")
    })

    it("should be able to login and receive a JWT token", async () => {
        await request(app)
            .post("/users")
            .send({
                name: "John Doe",
                email: "johndoe@example.com",
                password: "password123",
            })

        const response = await request(app)
            .post("/sessions")
            .send({
                email: "johndoe@example.com",
                password: "password123",
            })

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("token")
        expect(response.body).toHaveProperty("user")
        expect(response.body.user.email).toBe("johndoe@example.com")
    })

    it("should not be able to login with incorrect credentials", async () => {
        await request(app)
            .post("/users")
            .send({
                name: "John Doe",
                email: "johndoe@example.com",
                password: "password123",
            })

        const response = await request(app)
            .post("/sessions")
            .send({
                email: "johndoe@example.com",
                password: "wrongpassword",
            })

        expect(response.status).toBe(401)
        expect(response.body.message).toBe("Invalid email or password")
    })
})
