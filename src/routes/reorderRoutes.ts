import { Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import requireAuth, { IAuthRequest } from '../middleware/requireAuth'
import {
	IReorderList,
	IReorderProduct,
	QuantityAdjustmentSchema,
	ReorderList,
	ReorderProduct,
} from '../models/ReorderList'
import { sendCaughtError, sendError, sendSuccess } from '../utils/responseUtils'

const reorderRoutes = Router()

reorderRoutes.use(requireAuth)

// Add New List Route
reorderRoutes.post('/addlist', async (request: Request, response: Response) => {
	// Get User information
	const authRequest = request as IAuthRequest
	const { _id: userId } = authRequest.user

	// Get payload information
	const { listName } = request.body
	if (!listName) {
		sendError(response, 'Missing required field: listName')
	}

	// Create List
	const reorderList = new ReorderList({ userId, listName })

	try {
		// Save List and return success
		await reorderList.save()
		return sendSuccess<IReorderList>(response, reorderList, 'New list successfully created', StatusCodes.CREATED)
	} catch (error: unknown) {
		// Oops
		sendCaughtError(response, error, 'Something went wrong saving list.')
	}
})

// Get Lists Route
reorderRoutes.get('/lists', async (request: Request, response: Response) => {
	try {
		const reorderLists = await ReorderList.find()

		if (!reorderLists || reorderLists.length === 0) {
			return sendSuccess(response, [], 'No lists found', StatusCodes.NOT_FOUND)
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

// Add Product to list
reorderRoutes.post('/addproduct/:listId', async (request: Request, response: Response) => {
	// Validate request body
	const { listId } = request.params
	const parseResult = QuantityAdjustmentSchema.safeParse(request.body)
	if (!parseResult.success) {
		return sendError(response, 'Invalid data send in request body.')
	}

	// Validate list exists
	const reorderList = await ReorderList.findById(listId).populate('productsToReorder')
	if (!reorderList) {
		sendError(response, 'No list found by that ID.', StatusCodes.NOT_FOUND)
		return
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

// Adjust product on list
reorderRoutes.post('/adjustProductQuantity/:productId', async (request: Request, response: Response) => {
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
			deleted: 'Product successfully deleted.'
		} as const

		return sendSuccess(response, updateAction === 'deleted' ? [] : product, messages[updateAction])

	} catch (error) {
		sendCaughtError(response, error, 'Something went wrong adjusting product quantity.')
	}
})

// Delete product
// Delete list

export default reorderRoutes