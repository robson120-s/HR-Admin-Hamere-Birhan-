const express = require("express");
const router = express.Router();
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { authenticate, authorize } = require("../middlewares/authMiddleware");


// GET /api/attendance/employees/:departmentId (for Dep head)
// Fetch employees by department ID
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

// GET /api/attendance/employees-scheduled?date=2025-08-04&departmentId=3
router.get('/employees-scheduled', authenticate, authorize('DepartmentHead'), async (req, res) => {
  const { date, departmentId } = req.query;

  if (!date || !departmentId) {
    return res.status(400).json({ error: "date and departmentId are required." });
  }

  const parsedDate = new Date(date);
  const dayOfWeek = parsedDate.getUTCDay(); // 0 = Sunday

  try {
    // 1. Check if it's a holiday
    const isHoliday = await prisma.holiday.findFirst({
      where: { date: parsedDate },
    });

    if (isHoliday) {
      return res.status(200).json({ message: "Holiday - No employees scheduled.", data: [] });
    }

    // 2. Skip weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(200).json({ message: "Weekend - No employees scheduled.", data: [] });
    }

    // 3. Fetch employees with active shift that day
    const employees = await prisma.employee.findMany({
      where: {
        departmentId: parseInt(departmentId),
        shifts: {
          some: {
            effectiveFrom: { lte: parsedDate },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: parsedDate } },
            ],
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: {
          select: { name: true },
        },
      },
    });

    res.status(200).json({ message: "Scheduled employees fetched.", data: employees });
  } catch (error) {
    console.error("Error fetching scheduled employees:", error);
    res.status(500).json({ error: "Failed to fetch scheduled employees." });
  }
});


// POST /api/attendance-logs (create attendance log) (Dep Head)
router.post("/", authenticate, authorize('DepartmentHead') ,async (req, res) => {
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
router.post('/bulk', authenticate, authorize('DepartmentHead'), async (req, res) => {
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
          status: log.status,
        }
      });
      results.push({ success: true, log: created });
    } catch (error) {
      results.push({ success: false, log, error: error.message });
    }
  }
  res.status(201).json({ message: "Attendance logs processed", data: results });
});


module.exports = router;