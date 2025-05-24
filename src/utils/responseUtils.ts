import { Response } from 'express'
import { StatusCodes } from 'http-status-codes'

/**
 * Represents a standardized structure for API responses.
 *
 * @template T - The type of data contained in the response.
 *
 * @property {string} [message] - A descriptive message providing context about the response.
 * @property {T} [data] - The payload or data returned by the API.
 * @property {string} [error] - An error message, if the API call resulted in a failure.
 */
export interface ApiResponse<T> {
	message?: string
	data?: T
	error?: string
}

/**
 * Sends a successful HTTP response with the specified data, message, and status code.
 *
 * @param response The HTTP response object used to send the response.
 * @param data The data to be included in the response body. Generic type T allows flexibility in specifying the data type.
 * @param message An optional message to be included in the response body. Defaults to 'Success'.
 * @param status An optional HTTP status code to set for the response. Defaults to StatusCodes.OK.
 * @template T The type of the data being sent in the response.
 */
export const sendSuccess = <T>(
	response: Response,
	data: T,
	message = 'Success',
	status: StatusCodes = StatusCodes.OK,
) => {
	response.status(status).json({ message, data } as ApiResponse<T>)
}

/**
 * Sends an HTTP error response with a specified status code and error message.
 *
 * @param response The HTTP response object used to send the error response.
 * @param errorMessage A string representing the error message to include in the response body.
 * @param status The HTTP status code to set for the response. Defaults to internal server error (500).
 * @template T The optional type of the response object payload.
 */
export const sendError = <T = undefined>(
	response: Response,
	errorMessage: string,
	status: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR,
) => {
	response.status(status).json({ error: errorMessage } as ApiResponse<T>)
}

/**
 * Sends a caught error response to the client.
 *
 * Logs the provided error to the console for debugging purposes.
 * Determines the response message based on the provided error object:
 * - If the error is an object and contains a `message` property, it uses this property as the message.
 * - Otherwise, it falls back to the `backupMessage`.
 * Sends the determined response message to the client using the `sendError` function.
 *
 * @param response - The response object to send the error message.
 * @param error - The caught error, which can be an object, string, or Error instance.
 * @param backupMessage - A fallback message to send if the error does not contain a message.
 * @template T - The optional generic type parameter for the response.
 */
export const sendCaughtError = (
	response: Response,
	error: unknown,
	backupMessage: string
) => {
	console.error(error)
	const message =
		error && typeof error === 'object' && 'message' in error
			? (error as { message: string }).message
			: backupMessage

	sendError(response, message)
}