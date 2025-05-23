import { Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import requireAuth, { IAuthRequest } from '../middleware/requireAuth'
import { IUser } from '../models/User'
import {
	IReorderList,
	IReorderProduct,
	QuantityAdjustmentSchema,
	ReorderList,
	ReorderProduct,
} from '../models/ReorderList'
import { sendError, sendSuccess } from '../utils/responseHelpers'

const reorderRoutes = Router()

reorderRoutes.use(requireAuth)

// Add new list
reorderRoutes.post('/addlist', async (request: Request, response: Response) => {

	const authRequest = request as IAuthRequest
	const { _id: userId } = authRequest.user as IUser

	// get payload information
	const { listName } = request.body
	if (!listName) {
		sendError(response, 'Missing required field: listName')
	}

	// Save List
	const reorderList = new ReorderList({ userId, listName })
	try {
		await reorderList.save()
		return sendSuccess<IReorderList>(response, reorderList, 'New list successfully created', StatusCodes.CREATED)
	} catch (error: unknown) {
		console.error(error)
		const message =
			error && typeof error === 'object' && 'message' in error
				? (error as { message: string }).message
				: 'Something went wrong adding list.'

		return sendError(response, message)
	}
})

// Get lists
reorderRoutes.get('/lists', async (request: Request, response: Response) => {
	try {
		const reorderLists = await ReorderList.find()

		if (!reorderLists || reorderLists.length === 0) {
			return sendSuccess(response, [], 'No lists found', StatusCodes.NOT_FOUND)
		}
		return sendSuccess<IReorderList[]>(response, reorderLists, 'Lists successfully found.')

	} catch (error) {
		console.error(error)
		const message =
			error && typeof error === 'object' && 'message' in error
				? (error as { message: string }).message
				: 'Something went wrong getting lists.'

		return sendError(response, message)
	}
})

// Get list detail
reorderRoutes.get('/list/:id', async (request: Request, response: Response) => {
	const { id } = request.params

	try {
		const reorderList = await ReorderList.findById(id)

		if (!reorderList) {
			return sendError(response, 'List not found.', StatusCodes.NOT_FOUND)
		}

		return sendSuccess<IReorderList>(response, reorderList, 'List successfully found.')
	} catch (error) {
		console.error(error)
		const message =
			error && typeof error === 'object' && 'message' in error
				? (error as { message: string }).message
				: 'Something went wrong getting list.'

		return sendError(response, message)
	}
})

// Add Product to list
reorderRoutes.post('/addproduct/:listId', async (request: Request, response: Response) => {
	const { listId } = request.params
	const { sku, name, quantity } = request.body

	const reorderList = await ReorderList.findById(listId).populate('productsToReorder')

	if (!reorderList) {
		sendError(response, 'No list found by that ID.', StatusCodes.NOT_FOUND)
		return
	}

	try {
		const reorderProduct = reorderList.productsToReorder.find((reorderProduct: IReorderProduct) => {
			return reorderProduct.sku === sku
		})

		if (!reorderProduct) {
			await reorderList.addProduct(sku, name, quantity)
		} else {
			await reorderProduct.adjustQuantity('increase')
		}
		await reorderList.save()
		await reorderList.populate('productsToReorder')
		return sendSuccess<IReorderList>(response, reorderList, 'Product successfully added.')
	} catch (error) {
		console.error(error)
		const message =
			error && typeof error === 'object' && 'message' in error
				? (error as { message: string }).message
				: 'Something went wrong adding product.'

		return sendError(response, message)
	}
})

// Adjust product on list
reorderRoutes.post('/adjustProductQuantity/:productId', async (request: Request, response: Response) => {
	try {
		const parseResult = QuantityAdjustmentSchema.safeParse(request.body)

		if (!parseResult.success) {
			return sendError(response, 'Invalid request data.', StatusCodes.BAD_REQUEST)
		}

		const { type, quantity } = parseResult.data
		const { productId } = request.params
		const product = await ReorderProduct.findById(productId)

		if (!product) {
			return sendError(response, 'Product not found.', StatusCodes.NOT_FOUND)
		}

		await product.adjustQuantity(type, quantity)

		if (type === 'set' && quantity === 0) {
			// Remove the product reference from any list that contains it
			await ReorderList.updateMany(
				{ productsToReorder: product._id },
				{ $pull: { productsToReorder: product._id } }
			)

			return sendSuccess(response, [], 'Product successfully deleted.')
		}

		return sendSuccess(response, product, 'Product successfully adjusted.')

	} catch (error) {
		console.error(error)
		const message =
			error && typeof error === 'object' && 'message' in error
				? (error as { message: string }).message
				: 'Something went wrong adjusting product.'

		return sendError(response, message)
	}
})

// Delete product
// Delete list

export default reorderRoutes