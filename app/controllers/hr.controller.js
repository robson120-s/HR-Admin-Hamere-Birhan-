const express = require ('express');
const { PrismaClient } = require("../generated/prisma")
const prisma = new PrismaClient();


// get all complaints(for HR)
exports.getAllComplaints = async (req, res) => {
  const { status } = req.query;

  try {
    const complaints = await prisma.complaint.findMany({
      where: status ? { status } : {},
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(complaints);
  } catch (error) {
    console.error("Failed to fetch complaints:", error);
    res.status(500).json({ error: "Error fetching complaints" });
  }
};


// respond complaint
exports.respondToComplaint = async (req, res) => {
  const complaintId = parseInt(req.params.id);
  const { response, status } = req.body;

  try {
    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        response,
        status,
      },
    });

    res.status(200).json({ message: "Complaint updated", data: updatedComplaint });
  } catch (error) {
    console.error("Failed to update complaint:", error);
    res.status(500).json({ error: "Error updating complaint" });
  }
};
