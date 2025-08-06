const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Generate summaries for a specific date and department
// HR Attendance Summary Controller - Improved
exports.generateSummaries = async (req, res) => {
  const { date, departmentId } = req.body;

  if (!date || !departmentId) {
    return res.status(400).json({ error: "date and departmentId are required." });
  }

  const parsedDate = new Date(date);
  const dayOfWeek = parsedDate.getUTCDay(); // 0 = Sunday, 6 = Saturday

  try {
    // 1. Check if date is a holiday
    const isHoliday = await prisma.holiday.findFirst({
      where: {
        date: parsedDate,
      },
    });

    // 2. Get all employees in the department
    const employees = await prisma.employee.findMany({
      where: { departmentId },
      include: {
        shifts: {
          where: {
            effectiveFrom: { lte: parsedDate },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: parsedDate } },
            ],
          },
          include: {
            shift: true,
          },
        },
        attendanceLogs: {
          where: { date: parsedDate },
        },
        leaves: {
          where: {
            fromDate: { lte: parsedDate },
            toDate: { gte: parsedDate },
            status: "approved",
          },
        },
      },
    });

    const summaries = await Promise.all(employees.map(async (emp) => {
      const log = emp.attendanceLogs[0];
      const leave = emp.leaves[0];
      const shiftAssignment = emp.shifts[0];
      const shift = shiftAssignment?.shift;

      let summaryStatus = "absent";
      let totalWorkHours = null;
      let lateArrival = false;
      let earlyDeparture = false;
      let remarks = "";

      // Handle special cases first
      if (isHoliday) {
        summaryStatus = "holiday";
        remarks = isHoliday.name || "Holiday";
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        summaryStatus = "weekend";
      } else if (!shift) {
        // Employee not scheduled for the day
        return null;
      } else if (leave) {
        summaryStatus = "on_leave";
        remarks = leave.reason || "Leave";
      } else if (!log) {
        summaryStatus = "absent";
      } else {
        // Present or late
        summaryStatus = log.status || "present";

        if (log.actualClockIn && shift.startTime) {
          const lateMinutes = (new Date(log.actualClockIn) - new Date(shift.startTime)) / 60000;
          lateArrival = lateMinutes > 10;
        }

        if (log.actualClockIn && log.actualClockOut) {
          totalWorkHours = (new Date(log.actualClockOut) - new Date(log.actualClockIn)) / 3600000;
        }
      }

      // Upsert the attendance summary
      return prisma.attendanceSummary.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: parsedDate,
          },
        },
        update: {
          status: summaryStatus,
          totalWorkHours,
          lateArrival,
          earlyDeparture,
          remarks,
          unplannedAbsence: !log && !leave && !isHoliday,
          departmentId,
        },
        create: {
          employeeId: emp.id,
          date: parsedDate,
          status: summaryStatus,
          totalWorkHours,
          lateArrival,
          earlyDeparture,
          remarks,
          unplannedAbsence: !log && !leave && !isHoliday,
          departmentId,
        },
      });
    }));

    res.status(200).json({
      message: "Summaries generated.",
      data: summaries.filter(Boolean), // remove skipped
    });
  } catch (err) {
    console.error("Summary generation error:", err);
    res.status(500).json({ error: "Failed to generate attendance summaries." });
  }
};

// Get summaries by department and date
exports.getSummariesByDepartment = async (req, res) => {
  const { departmentId, date } = req.query;
  try {
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        departmentId: parseInt(departmentId),
        date: new Date(date),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        employeeId: "asc",
      },
    });
    res.status(200).json(summaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attendance summaries." });
  }
};

// Approve bulk summaries for a specific date and department (HR admin)
exports.approveBulkSummaries =  async (req, res) => {
  const { date, departmentId } = req.body;

  if (!date || !departmentId) {
    return res.status(400).json({ error: "date and departmentId are required." });
  }

  try {
    const result = await prisma.attendanceSummary.updateMany({
      where: {
        date: new Date(date),
        departmentId,
      },
      data: {
        status: "Approved",
      },
    });

    res.status(200).json({ message: `Approved ${result.count} summaries.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to approve attendance summaries." });
  }
};

// Approve a single employee’s summary (HR admin)
exports.approveSingleSummary = async (req, res) => {
  const summaryId = parseInt(req.params.id);

  try {
    const updated = await prisma.attendanceSummary.update({
      where: { id: summaryId },
      data: {
        status: "Approved",
      },
    });

    res.status(200).json({ message: "Summary approved", data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to approve attendance summary." });
  }
};
