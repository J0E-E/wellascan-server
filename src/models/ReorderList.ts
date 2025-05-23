import mongoose, { Document, model, Model, Schema } from 'mongoose'
import { z } from 'zod'

export interface IReorderProduct extends Document {
	sku: string
	name: string
	reorderQuantity: number
	adjustQuantity: (type: QuantityAdjustmentTypes, quantity?: number) => Promise<void>
}

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
})

export const QuantityAdjustmentTypes = z.enum(['increase', 'decrease', 'set'])

export const QuantityAdjustmentSchema = z.object({
	type: QuantityAdjustmentTypes,
	quantity: z.number().int().nonnegative().optional()
})

type QuantityAdjustmentTypes = z.infer<typeof QuantityAdjustmentTypes>

reorderProductSchema.methods.adjustQuantity = async function(type: QuantityAdjustmentTypes, quantity?: number) {
	if (type === 'increase') {
		this.reorderQuantity += 1
		await this.save()
	} else if (type === 'decrease') {
		this.reorderQuantity = Math.max(0, this.reorderQuantity - 1)
		await this.save()
	} else if (type === 'set' && quantity !== undefined && Number.isInteger(quantity) && quantity >= 0) {
		if (quantity === 0) {
			await this.deleteOne() // ✅ Delete this ReorderProduct document from the DB
		} else {
			this.reorderQuantity = quantity
			await this.save()
		}
	} else {
		throw new Error('Invalid quantity adjustment')
	}
}

export interface IReorderList extends Document {
	userId: mongoose.Schema.Types.ObjectId
	listName: string
	productsToReorder: IReorderProduct[]
	addProduct: (sku: string, name: string, quantity: number) => Promise<void>
}

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
		ref: 'ReorderProduct'
	}],
}, { timestamps: true })

reorderListSchema.methods.addProduct = async function(sku: string, name: string, quantity: number) {
	const productToReorder = new ReorderProduct({
		sku,
		name,
		reorderQuantity: quantity,
	})
	await productToReorder.save()

	this.productsToReorder.push(productToReorder._id)

	await this.save()
}

export const ReorderList: Model<IReorderList> = model<IReorderList>('ReorderList', reorderListSchema)
export const ReorderProduct: Model<IReorderProduct> = model<IReorderProduct>('ReorderProduct', reorderProductSchema)