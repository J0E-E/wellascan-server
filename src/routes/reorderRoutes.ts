import { Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import requireAuth from '../middleware/requireAuth'
import {
	AddProductSchema,
	IReorderList,
	IReorderProduct,
	ListSchema,
	QuantityAdjustmentSchema,
	ReorderList,
	ReorderProduct,
} from '../models/ReorderList'
import { sendCaughtError, sendError, sendSuccess } from '../utils/responseUtils'
import { getUserId } from '../utils/authUtils'

const reorderRoutes = Router()

reorderRoutes.use(requireAuth)

// Add new list
reorderRoutes.post('/list', async (request: Request, response: Response) => {
	// Get User information
	const userId = getUserId(request)

	// Validate request data
	const parsedBody = ListSchema.safeParse(request.body)
	if (!parsedBody.success) return sendError(response, 'Invalid request data.', StatusCodes.BAD_REQUEST)
	const { name } = parsedBody.data

	// Create List
	const reorderList = new ReorderList({ userId, name })

	try {
		// Save List and return success
		await reorderList.save()
		return sendSuccess<IReorderList>(response, reorderList, 'New list successfully created', StatusCodes.CREATED)
	} catch (error: unknown) {
		// Oops
		sendCaughtError(response, error, 'Something went wrong saving list.')
	}
})

// Get all lists
reorderRoutes.get('/list', async (request: Request, response: Response) => {
	try {
		const userId = getUserId(request)
		const reorderLists = await ReorderList.find({ userId })

		if (!reorderLists || reorderLists.length === 0) {
			return sendSuccess<[]>(response, [], 'No lists found')
		}
		return sendSuccess<IReorderList[]>(response, reorderLists, 'Lists successfully found.')

	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong fetching lists.')
	}
})

// Get list detail
reorderRoutes.get('/list/:id', async (request: Request, response: Response) => {

	const { id } = request.params

	try {
		// Validate list exists
		const reorderList = await ReorderList.findById(id)
		if (!reorderList) {
			return sendError(response, 'List not found.', StatusCodes.NOT_FOUND)
		}

		// Send list
		return sendSuccess<IReorderList>(response, reorderList, 'List successfully found.')
	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong fetching list.')
	}
})

// Change list name
reorderRoutes.patch('/list/:listId', async (request: Request, response: Response) => {
	try {
		//Validate list
		const { listId } = request.params
		const reorderList = await ReorderList.findById(listId)
		if (!reorderList) return sendError(response, 'List not found.', StatusCodes.NOT_FOUND)

		// Validate request data
		const parsedBody = ListSchema.safeParse(request.body)
		if (!parsedBody.success) return sendError(response, 'Invalid data in request.', StatusCodes.BAD_REQUEST)

		// Update list
		const { name } = parsedBody.data
		reorderList.name = name
		await reorderList.save()

		return sendSuccess<IReorderList>(response, reorderList, 'List updated.')
	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong updating list.')
	}
})

// Delete list
reorderRoutes.delete('/list/:listId', async (request: Request, response: Response) => {
	try {
		// Validate list
		const { listId } = request.params
		const reorderList = await ReorderList.findById(listId)
		if (!reorderList) return sendError(response, 'List not found.', StatusCodes.NOT_FOUND)

		// Delete list
		await reorderList.deleteOne()
		sendSuccess<null>(response, null, 'List successfully deleted.')
	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong deleting list.')
	}
})

// Add Product
reorderRoutes.post('/product/:listId', async (request: Request, response: Response) => {
	// Validate list exists
	const { listId } = request.params
	const reorderList = await ReorderList.findById(listId).populate('productsToReorder')
	if (!reorderList) {
		sendError(response, 'No list found by that ID.', StatusCodes.NOT_FOUND)
		return
	}
	// Validate request body
	const parseResult = AddProductSchema.safeParse({ ...request.body, listId })
	if (!parseResult.success) {
		return sendError(response, 'Invalid data sent in request body.')
	}

	const { sku, name, quantity } = request.body
	try {
		// Check if product exists
		const reorderProduct = reorderList.productsToReorder.find((reorderProduct: IReorderProduct) => {
			return reorderProduct.sku === sku
		})

		// Add Product or Adjust Quantity
		if (!reorderProduct) {
			await reorderList.addProduct(sku, name, quantity, reorderList._id)
		} else {
			await reorderProduct.adjustQuantity('increase')
		}

		// Save and send response
		await reorderList.save()
		await reorderList.populate('productsToReorder')
		return sendSuccess<IReorderList>(response, reorderList, 'Product successfully added.')
	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong adding product.')
	}
})

// Adjust product
reorderRoutes.patch('/product/:productId', async (request: Request, response: Response) => {
	try {
		// validate request body
		const parseResult = QuantityAdjustmentSchema.safeParse(request.body)
		if (!parseResult.success) {
			return sendError(response, 'Invalid request data.', StatusCodes.BAD_REQUEST)
		}

		// Validate product exists
		const { productId } = request.params
		const product = await ReorderProduct.findById(productId)
		if (!product) {
			return sendError(response, 'Product not found.', StatusCodes.NOT_FOUND)
		}

		// Adjust quantity
		const { type, quantity } = parseResult.data
		const updateAction = await product.adjustQuantity(type, quantity)

		const messages = {
			updated: 'Product successfully adjusted.',
			deleted: 'Product successfully deleted.',
		} as const

		return sendSuccess<IReorderProduct | null>(response, updateAction === 'deleted' ? null : product, messages[updateAction])

	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong adjusting product quantity.')
	}
})

// Delete product
reorderRoutes.delete('/product/:productId', async (request: Request, response: Response) => {
	try {
		// Validate list
		const { productId } = request.params
		const reorderProduct = await ReorderProduct.findById(productId)
		if (!reorderProduct) return sendError(response, 'Product not found.', StatusCodes.NOT_FOUND)

		// Delete list
		await reorderProduct.deleteOne()
		sendSuccess<null>(response, null, 'Product successfully deleted.')
	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong deleting product.')
	}
})

export default reorderRoutes