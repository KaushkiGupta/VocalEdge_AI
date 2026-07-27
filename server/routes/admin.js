import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getAdminStats, getAdminUsers } from "../lib/dbRepo.js";

const router = express.Router();

// Apply requireAuth and requireAdmin to all routes in this router
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/stats
 * Returns database aggregate stats (total users, interviews, sessions)
 */
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users
 * Returns list of registered users with optional search query filter
 */
router.get("/users", async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const users = await getAdminUsers(search);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

export default router;
