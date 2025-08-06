const express =require('express')
const cors = require('cors')
const app =express()

app.use(cors())
app.use(express.json())

// app.use(cors({
//   origin: 'http://localhost:3000', // Or frontend deployed URL
//   credentials: true // if using cookies or auth headers
// }));

//Attendance log routes (for the Department Head)
const attendanceLogRoutes = require('./app/routes/attendance.routes')
// Attendance summary routes(For the HR admin)
const attendanceSummaryRoutes = require('./app/routes/attendanceSummary.routes');
// Authentication routes (login)
const authRoutes = require('./app/routes/auth.routes');
// User routes (for HR admin to create users)
const userRoutes = require('./app/routes/user.routes');
// Staff routes (for employee dashboard)
const staffRoutes = require('./app/routes/staff.routes');
//Intern Routes (For Intern dashboard)
const internRoutes = require('./app/routes/intern.routes')


app.use("/api/attendance-logs", attendanceLogRoutes);
app.use("/api/attendance-summaries", attendanceSummaryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/intern", internRoutes)

module.exports = app;