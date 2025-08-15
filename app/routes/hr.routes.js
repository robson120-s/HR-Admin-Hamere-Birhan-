const express = require("express");
const router = express.Router();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { authenticate, authorize } = require("../middlewares/authMiddleware");
const hrController = require("../controllers/hr.controller");

// router.get(
//   "/complaints",
//   hrController.getAllComplaints
// );

// router.patch(
//   "/complaints/:id",
//   hrController.respondToComplaint
// );

// GET /api/hr/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      totalDepartments,
      totalStaff,
      totalIntern,
      totalOnLeave,
      totalAbsentToday,
      totalWorkingDays,
      pendingLeaveApproval,
      todaysPresent,
      totalOpenComplaints,
      recentComplaints,
      presentPerDepartment,
    ] = await Promise.all([
      // 1. Total employees (non-HR, non-intern)
      prisma.employee.count({
        where: {
          user: {
            roles: {
              some: {
                role: {
                  name: { notIn: ["HR", "Intern"] },
                },
              },
            },
          },
        },
      }),

      // 2. Total departments
      prisma.department.count(),

      // 3. Total staff (non-HR, non-intern)
      prisma.employee.count({
        where: {
          user: {
            roles: {
              some: {
                role: {
                  name: "Staff",
                },
              },
            },
          },
        },
      }),

      // 4. Total interns
      prisma.employee.count({
        where: {
          user: {
            roles: {
              some: {
                role: {
                  name: "Intern",
                },
              },
            },
          },
        },
      }),

      // 5. Total on leave today (status approved, date range includes today)
      prisma.leave.count({
        where: {
          status: "approved",
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),

      // 6. Total absent today (attendanceSummary status = 'absent')
      prisma.attendanceSummary.count({
        where: {
          date: today,
          status: "absent",
        },
      }),

      // 7. Total working days (exclude Sundays, count from attendance logs)
      prisma.attendanceSummary
        .groupBy({
          by: ["date"],
          where: {
            date: {
              gte: new Date(today.getFullYear(), 0, 1), // from start of year
            },
          },
        })
        .then((days) => days.filter((d) => d.date.getDay() !== 0).length),

      // 8. Pending leave approvals
      prisma.leave.count({
        where: {
          status: "pending",
        },
      }),

      // 9. Today's Present
      prisma.attendanceSummary.count({
        where: {
          date: today,
          status: "present",
        },
      }),

      // 10. Total open complaints (status = open)
      prisma.complaint.count({
        where: { status: "open" },
      }),

      // 11. Recent complaints (day sent + description only)
      prisma.complaint.findMany({
        where: { status: "in_review" },
        select: {
          createdAt: true,
          description: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // 12. Chart: Present per department
      prisma.attendanceSummary.groupBy({
        by: ["departmentId"],
        where: {
          date: today,
          status: "present",
        },
        _count: { _all: true },
      }),
    ]);

    const presentPerDepartmentWithNames = await Promise.all(
      presentPerDepartment.map(async (item) => {
        const dept = await prisma.department.findUnique({
          where: { id: item.departmentId },
          select: { name: true },
        });
        return {
          departmentId: item.departmentId,
          departmentName: dept?.name || "Unknown",
          presentCount: item._count._all,
        };
      })
    );

    res.status(200).json({
      totalEmployees,
      totalDepartments,
      totalStaff,
      totalIntern,
      totalOnLeave,
      totalAbsentToday,
      totalWorkingDays,
      pendingLeaveApproval,
      todaysPresent,
      totalOpenComplaints,
      recentComplaints,
      presentPerDepartment: presentPerDepartmentWithNames,
    });
  } catch (error) {
    console.error("Error fetching HR dashboard data:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});
// In your HR routes file where the /dashboard route is
// In your backend hr.routes.js file

// GET /api/hr/meetings - Fetch all meetings
router.get("/meetings",  async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { date: "asc" },
    });
    res.status(200).json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

// POST /api/hr/meetings - Add a new meeting

router.post("/meetings", async (req, res) => {
  try {
    const { title, date, time } = req.body;
    if (!title || !date || !time) {
      return res.status(400).json({ error: "All fields are required" });
    }

 

    const newMeeting = await prisma.meeting.create({
      data: {
        title: title,
        date: date, // Your schema expects a String
        time: time, // Providing the required field
      },
    });
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

// DELETE /api/hr/meetings/:id - Delete a meeting
router.delete("/meetings/:id",  async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.meeting.delete({
      where: { id: parseInt(id) }, // Use parseInt since the ID in the URL is a string
    });
    res.status(204).send(); // 204 No Content is the correct response for a successful delete
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
});

// In your backend file: routes/hr.routes.js

// ... your existing router setup ...

// GET /api/hr/complaints - Fetch all complaints, ordered by newest first
// In your backend file: routes/hr.routes.js

// GET /api/hr/complaints - Fetch all complaints, ordered by newest first
router.get("/complaints", async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        employee: {
          // STEP 1: Select the correct fields from the database
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // STEP 2: Transform the data to create a 'name' field for the frontend
    const formattedComplaints = complaints.map(complaint => {
      return {
        ...complaint, // Copy all existing complaint properties (id, subject, etc.)
        employee: {
          // Overwrite the employee object with a new one that has the combined name
          name: `${complaint.employee.firstName} ${complaint.employee.lastName}`
        }
      };
    });

    // STEP 3: Send the newly formatted data to the frontend
    res.status(200).json(formattedComplaints);

  } catch (error) {
    console.error("Error fetching complaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints." });
  }
});

// PATCH /api/hr/complaints/:id - Update a complaint's status and add a response
router.patch("/complaints/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response } = req.body;

    // Basic validation
    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: {
        id: parseInt(id),
      },
      data: {
        status: status, // e.g., 'in_review', 'resolved'
        response: response, // Can be null or a string
      },
    });

    res.status(200).json(updatedComplaint);
  } catch (error) {
    console.error("Error updating complaint:", error);
    if (error.code === 'P2025') { // Prisma code for "Record not found"
        return res.status(404).json({ error: "Complaint not found." });
    }
    res.status(500).json({ error: "Failed to update complaint." });
  }
});

// In a backend routes file, e.g., routes/hr.routes.js


// ... your existing router setup ...

// POST /api/hr/employees - Create a new user and employee profile
router.post("/employees", async (req, res) => { // NOTE: Add 'authenticate, authorize("HR")' middleware back later
  const { employeeData, userData, roleId } = req.body;

  // --- 1. Basic Validation ---
  if (!employeeData || !userData || !roleId) {
    return res.status(400).json({ error: "Employee data, user data, and a role ID are required." });
  }
  if (!userData.username || !userData.email || !userData.password) {
    return res.status(400).json({ error: "Username, email, and password are required for the user account." });
  }
  if (!employeeData.firstName || !employeeData.lastName) {
    return res.status(400).json({ error: "First name and last name are required for the employee profile." });
  }

  try {
    // --- 2. Prisma Transaction: All operations succeed or none do ---
    const result = await prisma.$transaction(async (tx) => {
      // a. Hash the user's password for security
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // b. Create the User record
      const newUser = await tx.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
        },
      });

      // c. Link the new User to their specified Role
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: parseInt(roleId),
        },
      });

      // d. Prepare the data for the Employee record
      const employeeCreateData = {
        // Link to the user we just created
        user: {
          connect: { id: newUser.id }
        },

        // Direct string/enum fields
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        sex: employeeData.sex, // 'male', 'female', 'other'
        baptismalName: employeeData.baptismalName || null,
        nationality: employeeData.nationality || null,
        phone: employeeData.phone || null,
        address: employeeData.address || null,
        subCity: employeeData.subCity || null,
        emergencyContactName: employeeData.emergencyContactName || null,
        emergencyContactPhone: employeeData.emergencyContactPhone || null,
        repentanceFatherName: employeeData.repentanceFatherName || null,
        repentanceFatherChurch: employeeData.repentanceFatherChurch || null,
        repentanceFatherPhone: employeeData.repentanceFatherPhone || null,
        academicQualification: employeeData.academicQualification || null,
        educationalInstitution: employeeData.educationalInstitution || null,
        accountNumber: employeeData.accountNumber || null,
        photo: employeeData.photo, // This is the Base64 string from the frontend

        // Correctly formatted Date and Decimal fields
        dateOfBirth: employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : null,
        employmentDate: employeeData.employmentDate ? new Date(employeeData.employmentDate) : null,
        salary: employeeData.salary ? parseFloat(employeeData.salary) : 0.00,
        bonusSalary: employeeData.bonusSalary ? parseFloat(employeeData.bonusSalary) : 0.00,
      };

      // --- 3. Conditionally connect relationships using Prisma's 'connect' syntax ---
      if (employeeData.departmentId) {
        employeeCreateData.department = { connect: { id: parseInt(employeeData.departmentId) } };
      }
      if (employeeData.subDepartmentId) {
        // This is a direct field, not a relation on the Employee model itself.
        employeeCreateData.subDepartmentId = parseInt(employeeData.subDepartmentId);
      }
      if (employeeData.positionId) {
        employeeCreateData.position = { connect: { id: parseInt(employeeData.positionId) } };
      }
      if (employeeData.maritalStatusId) {
        employeeCreateData.maritalStatus = { connect: { id: parseInt(employeeData.maritalStatusId) } };
      }
      if (employeeData.employmentTypeId) {
        employeeCreateData.employmentType = { connect: { id: parseInt(employeeData.employmentTypeId) } };
      }
      if (employeeData.jobStatusId) {
        employeeCreateData.jobStatus = { connect: { id: parseInt(employeeData.jobStatusId) } };
      }
      if (employeeData.agreementStatusId) {
        employeeCreateData.agreementStatus = { connect: { id: parseInt(employeeData.agreementStatusId) } };
      }
      
      // e. Create the Employee record with the fully prepared data
      const newEmployee = await tx.employee.create({
        data: employeeCreateData,
      });
      
      // f. Fetch the full new employee with relations to return to the frontend for the UI update
      const fullNewEmployee = await tx.employee.findUnique({
          where: { id: newEmployee.id },
          include: { 
            department: { select: { name: true } }, 
            position: { select: { name: true } } 
          }
      });
      
      return fullNewEmployee;
    });

    // --- 4. Send Success Response ---
    res.status(201).json(result);

  } catch (error) {
    // --- 5. Handle Errors Gracefully ---
    console.error("Error creating employee:", error);

    // Specific error for duplicate username/email
    if (error.code === 'P2002') {
        const fields = error.meta.target.join(', ');
        return res.status(409).json({ error: `An account with this ${fields} already exists.` });
    }

    // Generic server error
    res.status(500).json({ error: "An internal server error occurred while creating the employee." });
  }
});

router.get("/employees", async (req, res) => { // Add auth middleware back later
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: "desc", // Show the newest employees first
      },
      // Include the data needed for the employee card
      include: {
        department: { select: { name: true } },
        position: { select: { name: true } },
      },
    });
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employee list." });
  }
});
router.get("/employees/:id", async (req, res) => { // Add auth middleware later
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: { // Include all related data for a rich profile view
        user: { select: { username: true, email: true, isActive: true } },
        department: { select: { name: true } },
        position: { select: { name: true } },
        maritalStatus: { select: { status: true } },
        employmentType: { select: { type: true } },
        jobStatus: { select: { status: true } },
        agreementStatus: { select: { status: true } },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }
    res.status(200).json(employee);
  } catch (error) {
    console.error(`Error fetching employee with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch employee details." });
  }
});

// PATCH /api/hr/employees/:id - Update an employee's details
router.patch("/employees/:id", async (req, res) => { // Add auth middleware later
  try {
    const { id } = req.params;
    const employeeData = req.body;

    // Use the same conditional connect logic as the create route
    const employeeUpdateData = {
        // Direct fields
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        phone: employeeData.phone,
        // ... add any other fields from your form
    };
    
    // Conditionally connect relations if their IDs are provided
    if (employeeData.departmentId) {
        employeeUpdateData.department = { connect: { id: parseInt(employeeData.departmentId) } };
    }
    if (employeeData.positionId) {
        employeeUpdateData.position = { connect: { id: parseInt(employeeData.positionId) } };
    }
    // ... add more conditional connects for other relations

    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: employeeUpdateData,
    });

    res.status(200).json(updatedEmployee);
  } catch (error) {
    console.error(`Error updating employee with ID ${req.params.id}:`, error);
    if (error.code === 'P2025') {
        return res.status(404).json({ error: "Employee to update not found." });
    }
    res.status(500).json({ error: "Failed to update employee." });
  }
});

module.exports = router;
