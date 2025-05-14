import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscriptions.model.js";
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;
  if (!channelId) {
    throw new ApiError(400, "Required channel Id");
  }

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

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "Required channel Id");
  }
  const subscriberList = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "userInfo",
        pipeline: [
          {
            $project: {
              userName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        userInfo: {
          $first: "$userInfo",
        },
      },
    },
    {
      $project: {
        userInfo: 1,
        channel: 1,
        subscriber: 1,
      },
    },
  ]);
  if (!subscriberList) {
    throw new ApiError(400, "Can't find subscriber list");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriberList,
        "Subscriber list fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers };
