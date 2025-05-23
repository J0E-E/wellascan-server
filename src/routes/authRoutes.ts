import { NextFunction, Request, Response, Router } from 'express'
import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'

import { sendSuccess } from '../utils/responseHelpers'
import User, { IUser } from '../models/User'
import config from '../config/config'

const authRouter = Router()

// Sign-Up Route
authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
	const { email, password } = req.body

	try {
		const user = new User({ email, password }) as IUser
		await user.save()

		const token = jwt.sign({ userId: user._id }, config.jwtSecret)

		sendSuccess<{ token: string }>(res, { token }, 'Signup successful.', StatusCodes.CREATED)
		return
	} catch (error: any) {
		res.status(StatusCodes.BAD_REQUEST).send({ error: 'Something went wrong with sign-up.' })
	}
})

authRouter.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
	const { email, password } = req.body

	if (!email || !password) {
		res.status(StatusCodes.BAD_REQUEST).send({ error: 'Must provide email and password.' })
		return
	}

	const user = await User.findOne({ email }) as IUser

	if (!user) {
		res.status(StatusCodes.UNAUTHORIZED).send({ error: 'Incorrect email or password.' })
		return
	}

	try {
		await user.comparePasswords(password)
		const token = jwt.sign({ userId: user._id }, config.jwtSecret)
		res.status(StatusCodes.OK).send({ message: 'Login successful', token })
		return
	} catch (error: any) {
		next(error)
	}
})

export default authRouter