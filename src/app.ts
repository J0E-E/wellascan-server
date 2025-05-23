import express from 'express'
import authRoutes from './routes/authRoutes'
import reorderRoutes from './routes/reorderRoutes'

const app = express()

//Middleware
app.use(express.json())


// Routes
app.use('/auth', authRoutes)
app.use('/reorder', reorderRoutes)

export default app