import app from './app'
import config from './config/config'
import mongoose from 'mongoose'
import e from 'express'

const startServer = async () => {
	try {
		await mongoose.connect(config.mongoURI)
		console.log('MongoDb Connection Success')

		app.listen(config.port, () => {
			console.log(`Server running on port ${config.port}`)
		})
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.error('Server Failed:', error.message)
		} else {
			console.error(`ServerFailed with unknown error: ${error}`)
		}

		process.exit(1) // Exit process on failure
	}
}

startServer()