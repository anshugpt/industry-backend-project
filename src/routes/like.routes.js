import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  toggleCommentLike,
  toggleVideoLike,
} from "../controllers/like.controllers";

const router = Router();

router.use(verifyJWT); // to use this middleware in all routes

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);

export default router;
