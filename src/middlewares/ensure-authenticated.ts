import { Request, Response, NextFunction } from "express"
import { verify } from "jsonwebtoken"
import { authConfig } from "@/configs/auth"
import { AppError } from "@/utils/AppError"

interface TokenPayload {
    role: string
    sub: string
}

export function ensureAuthenticated(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const authHeader = request.headers.authorization

    if (!authHeader) {
        throw new AppError("JWT token is missing", 401)
    }

    const [, token] = authHeader.split(" ")

    try {
        const decoded = verify(token, authConfig.jwt.secret)

        const { sub, role } = decoded as TokenPayload

        request.user = {
            id: sub,
            role,
        }

        return next()
    } catch {
        throw new AppError("Invalid JWT token", 401)
    }
}
