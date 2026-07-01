import { Router } from "express"
import { TeamsController } from "@/controllers/teams-controller"
import { TeamMembersController } from "@/controllers/team-members-controller"
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated"
import { verifyUserRole } from "@/middlewares/verify-user-role"

export const teamsRoutes = Router()

const teamsController = new TeamsController()
const teamMembersController = new TeamMembersController()

// Todas as rotas de times necessitam de autenticação
teamsRoutes.use(ensureAuthenticated)

// CRUD do Time (Apenas Admin)
teamsRoutes.post("/", verifyUserRole(["admin"]), teamsController.create)
teamsRoutes.get("/", verifyUserRole(["admin"]), teamsController.index)
teamsRoutes.put("/:id", verifyUserRole(["admin"]), teamsController.update)
teamsRoutes.delete("/:id", verifyUserRole(["admin"]), teamsController.delete)

// Gerenciamento de Membros (Apenas Admin para adicionar/remover)
teamsRoutes.post("/:teamId/members", verifyUserRole(["admin"]), teamMembersController.create)
teamsRoutes.delete("/:teamId/members/:userId", verifyUserRole(["admin"]), teamMembersController.delete)

// Listagem de Membros (Qualquer usuário autenticado)
teamsRoutes.get("/:teamId/members", teamMembersController.index)
