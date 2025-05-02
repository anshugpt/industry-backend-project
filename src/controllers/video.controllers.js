import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
const uploadVideo = asyncHandler(async (req, res) => {
  // get the data
  const videoLocalPath = req.files?.video[0]?.path;
  const imageLocalPath = req.files?.image[0]?.path;
  const { title, description } = req.body;

  // check if video and image are present
  if (!videoLocalPath || !imageLocalPath) {
    throw new ApiError(400, "Video and image are required");
  }

  // check title and description are present
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  // upload video and image to cloudinary
  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(imageLocalPath);

  // check if video and image are uploaded
  if (!video || !thumbnail) {
    throw new ApiError(500, "Video and image upload failed");
  }

  // Make new entry in the database
  const newVideo = await Video.create({
    videoFile: video?.url,
    thumbnail: thumbnail?.url,
    title,
    description,
    duration: video?.duration,
    owner: req.user._id,
  });

  // check if video is created
  if (!newVideo) {
    throw new ApiError(500, "Video creation failed");
  }
  // return the video
  res
    .status(200)
    .json(new ApiResponse(200, newVideo, "Video uploaded successfully"));
});

export { uploadVideo };
