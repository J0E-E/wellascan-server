import { Document, model, Model, Schema } from 'mongoose'
import bcrypt from 'bcrypt'

/**
 * Represents a user entity.
 * Extends the Document interface.
 *
 * Properties:
 * - _id: Unique identifier for the user.
 * - email: Email address of the user.
 * - password: Hashed password of the user.
 *
 * Methods:
 * - comparePasswords: Compares a given password with the user's stored password.
 */
export interface IUser extends Document {
	_id: string
	email: string
	password: string

	comparePasswords(candidatePassword: string): Promise<boolean>
}

/**
 * Defines the schema for a user entity.
 *
 * Represents the structure for user data, including email and password fields.
 * - `email`: Stores the user's email address. Must be unique and is required.
 * - `password`: Stores the user's password. It is required.
 */
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

/**
 * Compares the provided password with the stored hashed password.
 *
 * @param candidatePassword - The plain text password to compare.
 * @returns A promise that resolves to a boolean indicating whether the passwords match.
 */
userSchema.methods.comparePasswords = async function(candidatePassword: string): Promise<boolean> {
	const user = this as IUser
	return await bcrypt.compare(candidatePassword, user.password)
}


/**
 *  A pre-save hook to hash the password value before storing to the DB.
 */
userSchema.pre<IUser>('save', function(next) {
	// no need to do anything if no change detected.
	if (!this.isModified('password')) {
		return next()
	}

	// generate salt for the hashing algo.
	bcrypt.genSalt(10, (error, salt) => {
		if (error) next(error)

		// hash the password using the generated salt, and the user.password value.
		bcrypt.hash(this.password, salt, (error, hash) => {
			if (error) next(error)

			this.password = hash
			next()
		})
	})
})

const User: Model<IUser> = model<IUser>('User', userSchema)

export default User