import dotenv from 'dotenv'

dotenv.config()

/**
 * Configuration interface for application settings.
 *
 * @property port - The port number the server will listen on.
 * @property nodEnv - The environment mode the application is running in (e.g., development, production).
 * @property mongoURI - The URI connection string for the MongoDB database.
 * @property jwtSecret - The secret key used for signing JSON Web Tokens.
 * @property jwtRefreshSecret - The secret key used for signing refresh tokens.
 */
interface Config {
	port: number
	nodEnv: string,
	mongoURI: string,
	jwtSecret: string,
	jwtRefreshSecret: string,
}

if (!process.env.MONGO_URI) {
	throw new Error('Missing required environment variable: MONGO_URI')
}

if (!process.env.JWT_SECRET) {
	throw new Error('Missing required environment variable: JWT_SECRET')
}

if (!process.env.JWT_REFRESH_SECRET) {
	throw new Error('Missing required environment variable: JWT_REFRESH_SECRET')
}

const config: Config = {
	port: Number(process.env.PORT) || 3000,
	nodEnv: process.env.NODE_ENV || 'development',
	mongoURI: process.env.MONGO_URI,
	jwtSecret: process.env.JWT_SECRET,
	jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
}

export default config

