import { NextFunction, Request, Response } from 'express'
import User, { IUser } from '../models/User'
import config from '../config/config'
import { AuthPayload, jwtVerifyAsync } from '../utils/authUtils'
import { sendCaughtError, sendError } from '../utils/responseUtils'
import { StatusCodes } from 'http-status-codes'


/**
 * Interface representing an authenticated request.
 * Extends the base Request object to include the authenticated user.
 *
 * @property user - The authenticated user associated with the request.
 */
export interface IAuthRequest extends Request {
	user: IUser
}


/**
 * Middleware function to enforce authentication on a route.
 * Validates the presence of an authorization header with a valid JWT token.
 * If valid, retrieves the user associated with the token and attaches it to the request object.
 * Calls the next middleware in the chain if authentication is successful.
 * Sends an error response if authentication fails.
 *
 * @param request - The incoming HTTP request object.
 * @param response - The HTTP response object.
 * @param next - A callback to pass control to the next middleware function.
 * @returns A promise that resolves to void.
 */
const requireAuth = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
	// Validate and clean auth header
	const { authorization } = request.headers
	if (!authorization) {
		return sendError(response, 'You must be logged in to perform this action.', StatusCodes.UNAUTHORIZED)
	}
	const token = authorization.replace('Bearer ', '')

	// Validate token
	let payload: AuthPayload
	try {
		payload = await jwtVerifyAsync(token, config.jwtSecret)
	} catch (error: unknown){
		if (
			typeof error === 'object' &&
			error !== null &&
			'name' in error &&
			(error as { name: string }).name === 'TokenExpiredError'
		) {
			return sendError(response, 'You must be logged in to perform this action.', StatusCodes.UNAUTHORIZED)
		}
		return sendCaughtError(response, error, 'Something went wrong validating token.')
	}

	// Look-up User
	const { userId } = payload
	const user = await User.findById(userId)
	if (!user) return sendError(response, 'You must be logged in to perform this action.', StatusCodes.UNAUTHORIZED)

	// Set user and move on.
	const authRequest = request as IAuthRequest
	authRequest.user = user
	next()
}

export default requireAuth