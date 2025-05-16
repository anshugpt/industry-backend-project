import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Requires a valid tweet id");
  }

  const userTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { updatedContent } = req.body;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Requires a valid tweet id");
  }

  const updatedTweet = await Tweet.findOneAndUpdate(
    {
      _id: tweetId,
      owner: req.user?._id,
    },
    {
      $set: {
        content: updatedContent,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Required a valid tweet id");
  }

  const deletedTweetDetails = await Tweet.deleteOne({
    _id: tweetId,
    owner: req.user?._id,
  });

  if (deletedTweetDetails.deletedCount === 0) {
    throw new ApiError(404, "Tweet not found or not authorized to delete");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deleted: true }, "Tweet deleted successfully")
    );
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
