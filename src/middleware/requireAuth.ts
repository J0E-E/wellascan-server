import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { IUser } from '../models/User'
import { promisify } from 'node:util'
import User from '../models/User'
import config from '../config/config'

// add user key/value to Request object
export interface IAuthRequest extends Request {
	user: IUser
}

// promisify jwt.verify()
const verifyAsync = promisify(jwt.verify) as (
	token: string,
	secret: string,
) => Promise<jwt.JwtPayload>

// authorization middleware for logging in
const requireAuth = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
	// cast to allow for user.
	const authRequest = request as IAuthRequest

	// pull bearer token from headers
	const { authorization } = authRequest.headers

	if (!authorization) {
		response.status(401).send({ error: 'You must be logged in to perform this action.' })
		return
	}

	// remove the prefix to get just the JWT token
	const token = authorization.replace('Bearer ', '')

	let payload: jwt.JwtPayload

	try {
		payload = await verifyAsync(token, config.jwtSecret)
	} catch (error) {
		response.status(401).send({ error: 'You must be logged in to perform this action.' })
		return
	}

	if (typeof payload !== 'object' || payload === null || !('userId' in payload)) {
		response.status(401).send({ error: 'Invalid token payload' })
		return
	}

	const { userId } = payload as jwt.JwtPayload
	const user = await User.findById(userId) as IUser | null

	if (!user || !(user instanceof User)) {
		response.status(401).send({ error: 'You must be logged in to perform this action.' })
		return
	}

	authRequest.user = user
	next()
}

export default requireAuth