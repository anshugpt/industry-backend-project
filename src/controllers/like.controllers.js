import mongoose, { isValidObjectId } from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Required valid video id");
  }

  const existing = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (existing) {
    // unlike
    await existing.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, false, "Unlike successfully"));
  } else {
    // like
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, true, "Liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Need valid comment Id");
  }

  const existing = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (existing) {
    // unlike
    await existing.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, false, "Unlike comment successfully"));
  } else {
    // like
    await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, true, "Liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Need valid tweet Id");
  }

  const existing = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (existing) {
    // unlike
    await existing.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, false, "Unlike tweet successfully"));
  } else {
    // like
    await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, true, "Tweet liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  // get all liked videos
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videosDetail",
      },
    },
    {
      $addFields: {
        videosDetail: {
          $first: "$videosDetail",
        },
      },
    },
  ]);
  if (likedVideos.length === 0) {
    throw new ApiError(404, "No liked video present");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
