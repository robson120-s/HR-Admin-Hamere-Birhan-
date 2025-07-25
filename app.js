const express =require('express')
const cors = require('cors')
const app =express()

app.use(cors())
app.use(express.json())

const attendanceLogRoutes = require('./app/routes/attendance.routes')
const attendanceSummaryRoutes = require('./app/routes/attendanceSummary.routes');
// const loginRoutes =  require('./app/routes/login.routes')


app.use("/api/attendance-logs", attendanceLogRoutes);
app.use("/api/attendance-summaries", attendanceSummaryRoutes);

// app.use("/api/login",loginRoutes);

module.exports = app;