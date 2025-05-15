import mongoose, { isValidObjectId } from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Need valid video id");
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  if (pageNum < 1 || limitNum < 1 || isNaN(pageNum) || isNaN(limitNum)) {
    throw new ApiError(400, "Page and limit must be valid positive numbers");
  }

  const commentDetails = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
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
        ownerDetails: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              content: 1,
              ownerDetails: 1,
              createdAt: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);
  if (commentDetails.length === 0) {
    throw new ApiError(404, "No comment found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, commentDetails, "Comment fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;
  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!newComment) {
    throw new ApiError(500, "Failed to create comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { updatedContent } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "A valid comment ID is required");
  }
  if (!updatedContent) {
    throw new ApiError(400, "Updated content is required");
  }

  const updatedComment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
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
  if (!updatedComment) {
    throw new ApiError(500, "Failed to update the comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

export { getVideoComments, addComment, updateComment };
