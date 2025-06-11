import express from "express";
import { accessDashboard } from "../controllers/admin-controller";

const router = express.Router();

router.get("/admin/dashboard", accessDashboard);

export default router;
