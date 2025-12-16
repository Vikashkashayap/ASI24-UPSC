import express from "express";
import { mentorChat } from "../controllers/mentorController.js";

const router = express.Router();

router.post("/chat", mentorChat);

export default router;
