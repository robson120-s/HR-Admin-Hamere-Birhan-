const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Generate summaries for a specific date and department
exports.generateSummaries = async (req, res) => {
  const { date, departmentId } = req.body;

  if (!date || !departmentId) {
    return res.status(400).json({ error: "date and departmentId are required." });
  }

  try {
    // Get all employees in the department
    const employees = await prisma.employee.findMany({
      where: { departmentId },
      include: {
        attendanceLogs: {
          where: {
            date: new Date(date),
          },
        },
      },
    });

    const summaries = await Promise.all(
      employees.map(async (emp) => {
        const log = emp.attendanceLogs[0];

        // Calculate work hours if clockIn/out exist
        let totalWorkHours = null;
        if (log?.actualClockIn && log?.actualClockOut) {
          const diffMs = new Date(log.actualClockOut) - new Date(log.actualClockIn);
          totalWorkHours = diffMs / 1000 / 60 / 60; // in hours
        }

        return prisma.attendanceSummary.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: new Date(date),
            },
          },
          update: {
            totalWorkHours,
            lateArrival: false, 
            earlyDeparture: false, 
            unplannedAbsence: !log,
            status: log?.status || "absent",
            remarks: "",
            departmentId,
          },
          create: {
            employeeId: emp.id,
            date: new Date(date),
            totalWorkHours,
            lateArrival: false,
            earlyDeparture: false,
            unplannedAbsence: !log,
            status: log?.status || "absent",
            remarks: "",
            departmentId,
          },
        });
      })
    );

    res.status(200).json({ message: "Summaries created.", data: summaries });
  } catch (err) {
    console.error(err);
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
exports.approveBulkSummaries = async (req, res) => {
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
