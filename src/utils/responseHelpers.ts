import { Response } from 'express'
import { StatusCodes } from 'http-status-codes'

export interface ApiResponse<T> {
	message?: string
	data?: T
	error?: string
}

export const sendSuccess = <T>(
	res: Response,
	data: T,
	message = 'Success',
	status: StatusCodes = StatusCodes.OK,
) => {
	res.status(status).json({ message, data } as ApiResponse<T>)
}

export const sendError = <T = undefined>(
	res: Response,
	error: string,
	status: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR,
) => {
	res.status(status).json({ error } as ApiResponse<T>)
}