import { Document, model, Model, Schema } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IUser extends Document {
	email: string
	password: string

	comparePasswords(candidatePassword: string): Promise<boolean>
}

const userSchema = new Schema<IUser>({
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
})

userSchema.methods.comparePasswords = async function(candidatePassword: string): Promise<boolean> {
	const user = this as IUser
	try {
		return await bcrypt.compare(candidatePassword, user.password)
	} catch (error) {
		throw error
	}
}

// pre-save function to check for password change and hash the value
userSchema.pre<IUser>('save', function(next) {
	const user = this

	// no need to do anything if no change detected.
	if (!user.isModified('password')) {
		return next()
	}

	// generate salt for the hashing algo.
	bcrypt.genSalt(10, (error, salt) => {
		if (error) next(error)

		// hash the password using the generated salt, and the user.password value.
		bcrypt.hash(user.password, salt, (error, hash) => {
			if (error) next(error)

			user.password = hash
			next()
		})
	})
})

const User: Model<IUser> = model<IUser>('User', userSchema)

export default User