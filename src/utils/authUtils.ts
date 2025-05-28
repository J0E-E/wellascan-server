import { z } from 'zod'
import jwt from 'jsonwebtoken'
import config from '../config/config'
import { IAuthRequest } from '../middleware/requireAuth'
import {Request} from 'express'


/**
 * Schema definition for authentication payload.
 *
 * Represents the structure of the authentication payload containing
 * user identification information.
 */
export const AuthPayloadSchema = z.object({
	userId: z.string(),
})

/**
 * Represents the authentication payload inferred from the AuthPayloadSchema.
 */
export type AuthPayload = z.infer<typeof AuthPayloadSchema>

/**
 * Verifies a JSON Web Token (JWT) asynchronously.
 *
 * @param token The JWT to be verified.
 * @param secret The secret key to verify the token.
 * @returns A promise that resolves with the decoded and validated payload or rejects with an error.
 */
export const jwtVerifyAsync = (token: string, secret: string): Promise<AuthPayload> => {

	return new Promise((resolve, reject) => {
		jwt.verify(token, secret, (err, decoded) => {
			if (err) return reject(err)

			const parsed = AuthPayloadSchema.safeParse(decoded)
			if (parsed.success) return resolve(parsed.data)

			return reject(new Error('Invalid token'))
		})
	})
}

/**
 * Generates authentication and refresh tokens based on the provided payload.
 *
 * @param payload The data used to generate the tokens.
 * @returns An object containing the token and refreshToken.
 */
export const generateTokens = (payload: AuthPayload): { token: string, refreshToken: string } => {
	const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1m' })
	const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '3d' })

	return { token, refreshToken }
}

/**
 * Retrieves the user ID from the given request object.
 *
 * @param request - The request object containing user authentication details.
 * @returns The user ID extracted from the request.
 */
export const getUserId = (request: Request) => (request as IAuthRequest).user._id