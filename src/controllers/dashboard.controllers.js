import mongoose, { isValidObjectId } from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // total views, subs, videos, likes
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "A valid channel id is required");
  }

  const result = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: "$owner",
        totalVideos: { $sum: 1 },
        totalViews: {
          $sum: "$views",
        },
        videosId: {
          $push: "$_id",
        },
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        let: { channelId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$channel", "$$channelId"],
              },
            },
          },
          {
            $count: "totalSubscribers",
          },
        ],
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "likes",
        let: { videosId: "$videosId" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$video", "$$videosId"] },
            },
          },
          {
            $group: {
              _id: null,
              totalLikes: { $sum: 1 },
            },
          },
        ],
        as: "likesStats",
      },
    },
    {
      $addFields: {
        totalSubscribers: {
          $cond: {
            if: { $gt: [{ $size: "$subscribers" }, 0] },
            then: { $arrayElemAt: ["$subscribers.totalSubscribers", 0] },
            else: 0,
          },
        },
        totalLikes: {
          $cond: {
            if: { $gt: [{ $size: "$likesStats" }, 0] },
            then: { $arrayElemAt: ["$likesStats.totalLikes", 0] },
            else: 0,
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalSubscribers: 1,
        totalVideos: 1,
        totalViews: 1,
        videosId: 0,
        totalLikes: 1,
      },
    },
  ]);
  if (result.length === 0) {
    throw new ApiError(500, "Failed to get channel stats");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result[0], "Stats fetched successfully"));
});

export { getChannelStats };
