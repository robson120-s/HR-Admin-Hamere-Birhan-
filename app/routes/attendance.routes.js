const express = require("express");
const router = express.Router();
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// GET /api/attendance/employees/:departmentId (for Dep head)
router.get('/employees/:departmentId', async (req, res) => {
  const departmentId = parseInt(req.params.departmentId);

  try {
    const employees = await prisma.employee.findMany({
      where: { departmentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: {
          select: { name: true }
        }
      }
    });

    res.status(200).json(employees);
  } catch (error) {
    console.error("Failed to fetch employees by department:", error);
    res.status(500).json({ error: "Failed to fetch employees." });
  }
});

// POST /api/attendance-logs (create attendance log) (Dep Head)
router.post("/", async (req, res) => {
  const {
    employeeId,
    date,
    sessionId,
    actualClockIn,
    actualClockOut,
    status,
    departmentId  // pass from frontend
  } = req.body;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(400).json({ error: "Employee does not exist." });
    }

    // Ensure the employee belongs to the department
    if (employee.departmentId !== departmentId) {
      return res.status(403).json({ error: "You are not allowed to mark attendance for this employee." });
    }

    const attendance = await prisma.attendanceLog.create({
      data: {
        employeeId,
        date: new Date(date),
        sessionId,
        actualClockIn: actualClockIn ? new Date(actualClockIn) : null,
        actualClockOut: actualClockOut ? new Date(actualClockOut) : null,
        status,
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error("Error creating attendance:", error);
    res.status(500).json({ error: "Failed to create attendance record." });
  }
});

// POST bulk attendance logs by department (Dep Head)
router.post('/bulk', async (req, res) => {
  const { logs } = req.body;
  const results = [];
  for (const log of logs) {
    try {
      // Check for existing log
      const existing = await prisma.attendanceLog.findUnique({
        where: {
          employeeId_date_sessionId: {
            employeeId: log.employeeId,
            date: new Date(log.date),
            sessionId: log.sessionId
          }
        }
      });
      if (existing) {
        throw new Error(`Attendance log already exists for employeeId ${log.employeeId}, date ${log.date}, sessionId ${log.sessionId}`);
      }
      // Insert new log
      const created = await prisma.attendanceLog.create({
        data: {
          employeeId: log.employeeId,
          date: new Date(log.date),
          sessionId: log.sessionId,
          actualClockIn: log.actualClockIn ? new Date(log.actualClockIn) : null,
          actualClockOut: log.actualClockOut ? new Date(log.actualClockOut) : null,
          status: log.status
        }
      });
      results.push({ success: true, log: created });
    } catch (error) {
      results.push({ success: false, log, error: error.message });
    }
  }
  res.status(201).json({ message: "Attendance logs processed", data: results });
});


// Bulk approve all summaries in a department for a specific date (HR admin)




module.exports = router;

