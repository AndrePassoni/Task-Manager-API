import { Request, Response, NextFunction } from "express"
import { AppError } from "@/utils/AppError"

export function verifyUserRole(roles: string[]) {
    return (request: Request, response: Response, next: NextFunction) => {
        if (!request.user) {
            throw new AppError("Unauthorized", 401)
        }

        if (!roles.includes(request.user.role)) {
            throw new AppError("Forbidden", 403)
        }

        return next()
    }
}
