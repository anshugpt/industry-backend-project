import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscriptions.controllers.js";

const router = Router();

router
  .route("/:channelId/toggle-subscription")
  .post(verifyJWT, toggleSubscription);
router
  .route("/:channelId/subscribers")
  .get(verifyJWT, getUserChannelSubscribers);

export default router;
