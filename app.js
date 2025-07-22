const express =require('express')
const cors = require('cors')
const app =express()

app.use(cors())
app.use(express.json())

const attendanceLogRoutes = require('./app/routes/attendance.routes')


app.use("/api/attendance-logs", attendanceLogRoutes);

module.exports = app;