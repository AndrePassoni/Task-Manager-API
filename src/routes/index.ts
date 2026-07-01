import { Router } from "express"

import { usersRoutes } from "./users-routes"
import { sessionsRoutes } from "./sessions-routes"

export const routes = Router()
routes.use("/users", usersRoutes)
routes.use("/sessions", sessionsRoutes)