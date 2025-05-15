import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscriptions.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Required valid channel Id");
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
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Required valid channel Id");
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
  if (subscriberList.length === 0) {
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

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Need valid subscriber Id");
  }
  const listOfSubscribedChannel = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelInfo",
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
        channelInfo: {
          $first: "$channelInfo",
        },
      },
    },
    {
      $project: {
        channelInfo: 1,
        channel: 1,
        subscriber: 1,
      },
    },
  ]);
  if (listOfSubscribedChannel.length === 0) {
    throw new ApiError(400, "No list of subscribed channel found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        listOfSubscribedChannel,
        "List of subscribed channel fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
