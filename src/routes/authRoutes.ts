import { Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { sendCaughtError, sendError, sendSuccess } from '../utils/responseUtils'
import User from '../models/User'
import config from '../config/config'
import { generateTokens, jwtVerifyAsync } from '../utils/authUtils'

const authRouter = Router()

// Sign-Up Route
authRouter.post('/signup', async (request: Request, response: Response) => {
	// Validate input
	const { email, password } = request.body
	if (!email || !password) return sendError(response, 'Must provide email and password.')

	try {
		// Verify unique email
		const existingUser = await User.findOne({ email })
		if (existingUser) return sendError(response, 'Sign-up failed. Please check your information and try again.')

		// Create User
		const user = new User({ email, password })
		await user.save()

		// Generate tokens
		const { token, refreshToken } = generateTokens({ userId: user._id })

		// Send response
		return sendSuccess<{ token: string, refreshToken: string }>(
			response,
			{ token, refreshToken },
			'Signup successful.',
			StatusCodes.CREATED,
		)

	} catch (error: unknown) {
		// Oops
		return sendCaughtError(response, error, 'Something went wrong with sign-up.')
	}
})

// Sign-In Route
authRouter.post('/signin', async (request: Request, response: Response) => {

	// Validate input
	const { email, password } = request.body
	if (!email || !password) return sendError(response, 'Must provide email and password.', StatusCodes.UNAUTHORIZED)

	try {
		// Lookup User
		const user = await User.findOne({ email })
		if (!user) return sendError(response, 'Incorrect email or password.', StatusCodes.UNAUTHORIZED)

		// Validate password
		const isLoginValid = await user.comparePasswords(password)
		if (!isLoginValid) return sendError(response, 'Incorrect email or password.', StatusCodes.UNAUTHORIZED)

		// Generate tokens
		const { token, refreshToken } = generateTokens({ userId: user._id })
		return sendSuccess<{ token: string, refreshToken: string }>(
			response,
			{ token, refreshToken },
			'Login successful.',
		)

	} catch (error: unknown) {
		// Something went wrong
		return sendCaughtError(response, error, 'Something went wrong at sign-in.')
	}
})

// Refresh Token Route
authRouter.post('/refreshtoken', async (request: Request, response: Response) => {
	// Validate input
	const { refreshToken } = request.body
	if (!refreshToken) return sendError(response, 'No refresh token provided', StatusCodes.BAD_REQUEST)

	try {
		// Validate decoded token
		const decodedToken = await jwtVerifyAsync(refreshToken, config.jwtRefreshSecret)
		const { userId } = decodedToken

		if (typeof decodedToken !== 'object' || decodedToken === null || !userId) {
			return sendError(response, 'Invalid token payload', StatusCodes.BAD_REQUEST)
		}

		// Lookup User
		const user = await User.findById(userId)
		if (!user) return sendError(response, 'No user found.', StatusCodes.BAD_REQUEST)

		// Generate new tokens
		const { token: newToken, refreshToken: newRefreshToken } = generateTokens({ userId: user._id })

		// Send token response
		return sendSuccess<{ token: string, refreshToken: string }>(
			response,
			{ token: newToken, refreshToken: newRefreshToken },
			'Token refresh successful.',
		)

	} catch (error: unknown) {
		// Oops
		return sendCaughtError(response, error, 'Something went wrong refreshing token')
	}
})

export default authRouter