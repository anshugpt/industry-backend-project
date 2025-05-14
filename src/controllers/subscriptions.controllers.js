import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscriptions.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;
  if (channelId === subscriberId) {
    throw new ApiError(400, "You can't subscribe to yourself");
  }

  const existing = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existing) {
    await existing.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, false, "Unsubscribed successfully"));
  } else {
    await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, true, "Subscribed successfully"));
  }
});

export { toggleSubscription };
