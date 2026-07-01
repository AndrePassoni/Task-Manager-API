import { Router } from 'express'

import { UsersController } from '@/controllers/users-controller'

export const usersRoutes = Router()
const usersController = new UsersController()

usersRoutes.post("/", usersController.create)