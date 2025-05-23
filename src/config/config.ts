import dotenv from 'dotenv'

dotenv.config()

interface Config {
	port: number
	nodEnv: string,
	mongoURI: string,
	jwtSecret: string,
}

if (!process.env.MONGO_URI) {
	throw new Error('Missing required environment variable: MONGO_URI')
}

if (!process.env.JWT_SECRET) {
	throw new Error('Missing required environment variable: JWT_SECRET')
}

const config: Config = {
	port: Number(process.env.PORT) || 3000,
	nodEnv: process.env.NODE_ENV || 'development',
	mongoURI: process.env.MONGO_URI,
	jwtSecret: process.env.JWT_SECRET,
}

export default config

