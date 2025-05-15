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

export { toggleVideoLike };
