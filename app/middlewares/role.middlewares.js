const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();


// Middleware to check if user has any of the required roles
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id; // This must come from a verified JWT token in future

      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const userWithRoles = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      const userRoles = userWithRoles?.roles.map((ur) => ur.role.name) || [];

      const isAuthorized = allowedRoles.some((role) => userRoles.includes(role));

      if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ error: "Role validation failed." });
    }
  };
};

module.exports = { authorizeRoles };
