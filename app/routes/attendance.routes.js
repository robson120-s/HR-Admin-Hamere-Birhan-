const express = require("express");
const router = express.Router();
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();


router.post("/", async (req, res) => {
  const {
    employeeId,
    date,
    sessionId,
    actualClockIn,
    actualClockOut,
    status,
  } = req.body;

  try {
    // Check if employee exists // and validate input
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    if (!employee) {
      return res.status(400).json({ error: "Employee does not exist." });
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
    console.error(error);
    res.status(500).json({ error: "Failed to create attendance record." });
  }
});

router.get('/', async (req,res) =>{
  try {
    const logs = await prisma.attendanceLog.findMany({
      include: {
        employee:{
          select:{
            id: true,
            firstName: true,
            lastName: true,

          }
        },
        session: {
          select:{
            id: true,
            sessionNumber: true,
            expectedClockIn: true,
            expectedClockOut: true,
          }
        }
      },
      orderBy: {
        date: 'desc',
      }
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attendance logs." });
  }

})
module.exports = router;
