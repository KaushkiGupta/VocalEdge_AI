import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDashboardData, getUserProfile, getFullPerformanceHistory } from "../lib/dbRepo.js";
import { getRecommendations } from "../lib/recommender.js";

const router = express.Router();

router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const data = await getDashboardData(req.user.userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const profile = await getUserProfile(req.user.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.get("/learning/recommendations", requireAuth, async (req, res, next) => {
  try {
    const { sessions, interviews } = await getFullPerformanceHistory(req.user.userId);
    const recommendations = getRecommendations(sessions, interviews);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

export default router;
