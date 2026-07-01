import { Router } from "express"
import { TasksController } from "@/controllers/tasks-controller"
import { TasksHistoryController } from "@/controllers/tasks-history-controller"
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated"

export const tasksRoutes = Router()

const tasksController = new TasksController()
const tasksHistoryController = new TasksHistoryController()

// Todas as rotas de tarefas necessitam de autenticação
tasksRoutes.use(ensureAuthenticated)

// CRUD e atribuição de tarefas
tasksRoutes.post("/", tasksController.create)
tasksRoutes.get("/", tasksController.index)
tasksRoutes.put("/:id", tasksController.update)
tasksRoutes.delete("/:id", tasksController.delete)
tasksRoutes.patch("/:id/assign", tasksController.assign)

// Listagem de histórico de uma tarefa
tasksRoutes.get("/:taskId/history", tasksHistoryController.index)
