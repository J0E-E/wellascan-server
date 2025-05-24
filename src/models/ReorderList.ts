import mongoose, { Document, model, Model, Schema } from 'mongoose'
import { z } from 'zod'

/**
 * Represents an interface for a product that supports reorder management.
 * Extends the Document interface.
 *
 * @interface
 * @property sku Unique identifier for the product.
 * @property name Name of the product.
 * @property reorderQuantity Quantity of the product to reorder.
 * @method adjustQuantity Adjusts the product's quantity based on the specified adjustment type and optional quantity.
 */
export interface IReorderProduct extends Document {
	sku: string
	name: string
	reorderQuantity: number
	listId: mongoose.Schema.Types.ObjectId
	adjustQuantity: (type: QuantityAdjustmentTypes, quantity?: number) => Promise<'deleted' | 'updated'>
}

/**
 * Schema definition for a product reorder.
 *
 * @constant {Schema} reorderProductSchema
 * @description Represents the structure for storing product reorder information including SKU, name, and reorder quantity.
 */
const reorderProductSchema = new Schema<IReorderProduct>({
	sku: {
		type: String,
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
	reorderQuantity: {
		type: Number,
		required: true,
	},
	listId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'ReorderList',
		required: true,
	},
})

reorderProductSchema.index({ listId: 1, sku: 1 }, { unique: true })

/**
 * Represents the types of quantity adjustments that can be applied.
 *
 * Possible values:
 * - 'increase': Indicates an increase in quantity.
 * - 'decrease': Indicates a decrease in quantity.
 * - 'set': Indicates setting the quantity to a specific value.
 */
export const QuantityAdjustmentTypes = z.enum(['increase', 'decrease', 'set'])

/**
 * Schema definition for quantity adjustment.
 * Validates the structure of objects adjusting quantities.
 * - `type`: Specifies the type of quantity adjustment.
 * - `quantity`: Represents the adjustment quantity, optional, must be a non-negative integer.
 */
export const QuantityAdjustmentSchema = z.object({
	type: QuantityAdjustmentTypes,
	quantity: z.number().int().nonnegative().optional(),
}).refine(
	(data) => data.type !== 'set' || data.quantity !== undefined,
	{ message: 'Quantity is required when type is "set"', path: ['quantity'] },
)

/**
 * Represents the types used for quantity adjustments in a system.
 * Derived from the QuantityAdjustmentTypes schema definition.
 */
type QuantityAdjustmentTypes = z.infer<typeof QuantityAdjustmentTypes>

/**
 * Adjusts the product quantity in the reorder schema.
 * Updates the quantity based on specific logic or input.
 */
reorderProductSchema.methods.adjustQuantity = async function(type: QuantityAdjustmentTypes, quantity?: number): Promise<'deleted' | 'updated'> {
	const deleteProduct = async () => {
		// Remove the product reference from any list that contains it
		await ReorderList.updateMany(
			{ productsToReorder: this._id },
			{ $pull: { productsToReorder: this._id } },
		)
		await this.deleteOne()
	}
	switch (type) {
		case 'increase':
			this.reorderQuantity += 1
			await this.save()
			return 'updated'
		case 'decrease':
			this.reorderQuantity = Math.max(0, this.reorderQuantity - 1)
			if (this.reorderQuantity === 0) {
				await deleteProduct()
				return 'deleted'
			}
			await this.save()
			return 'updated'
		case 'set':
			if (quantity !== undefined && Number.isInteger(quantity) && quantity >= 0) {
				if (quantity === 0) {
					await deleteProduct()
					return 'deleted'
				} else {
					this.reorderQuantity = quantity
					await this.save()
					return 'updated'
				}
			}
			throw new Error('Invalid quantity for set operation')
		default:
			throw new Error('Invalid quantity adjustment')
	}
}

/**
 * Interface representing a reorder list document.
 * Provides functionality to manage and reorder products.
 *
 * Properties:
 * - userId: Identifier of the user associated with the reorder list.
 * - listName: Name of the reorder list.
 * - productsToReorder: Collection of products to be reordered.
 *
 * Methods:
 * - addProduct: Adds a product to the reorder list with its SKU, name, and quantity.
 */
export interface IReorderList extends Document {
	_id: mongoose.Schema.Types.ObjectId
	userId: mongoose.Schema.Types.ObjectId
	listName: string
	productsToReorder: IReorderProduct[]
	addProduct: (sku: string, name: string, quantity: number, listId: mongoose.Schema.Types.ObjectId) => Promise<void>
}

/**
 * Schema for the Reorder List.
 *
 * Represents a user's shopping list with products marked for reordering.
 *
 * @param userId Identifier of the user to whom the list belongs.
 * @param listName Unique name of the reorder list.
 * @param productsToReorder Array of products associated with the reorder list.
 * @param timestamps Automatically managed creation and update timestamps.
 */
const reorderListSchema = new Schema<IReorderList>({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	listName: {
		type: String,
		required: true,
		unique: true,
	},
	productsToReorder: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'ReorderProduct',
	}],
}, { timestamps: true })

export const AddProductSchema = z.object({
	sku: z.string(),
	name: z.string(),
	quantity: z.number(),
	listId: z.string(),
})

/**
 * Adds a product to the reorder list.
 *
 * @param sku - The product sku.
 * @param name - The product name or description.
 * @param quantity - The quantity to add.
 * @param listId - The id for the list containing this product.
 * @returns Updated reorder list after adding the product.
 */
reorderListSchema.methods.addProduct = async function(
	sku: string,
	name: string,
	quantity: number,
	listId: string,
) {
	const productToReorder = new ReorderProduct({
		sku,
		name,
		reorderQuantity: quantity,
		listId,
	})
	await productToReorder.save()

	this.productsToReorder.push(productToReorder._id)

	await this.save()
}

export const ReorderList: Model<IReorderList> = model<IReorderList>('ReorderList', reorderListSchema)
export const ReorderProduct: Model<IReorderProduct> = model<IReorderProduct>('ReorderProduct', reorderProductSchema)