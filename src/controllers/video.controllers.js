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

const getVideo = asyncHandler(async (req, res) => {
  // get video _id by params
  // write aggregation pipeline
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }
  const videoDetails = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner",
        foreignField: "channel",
        as: "channelSubscribers",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "channelDetails",
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
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
        pipeline: [
          {
            $sort: { createdAt: -1 },
          },
          {
            $lookup: {
              from: "likes",
              localField: "_id", // refers to the comment id
              foreignField: "comment",
              as: "likesOnComment",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
              pipeline: [{ $project: { userName: 1, avatar: 1 } }],
            },
          },
          {
            $addFields: {
              ownerDetails: { $first: "$ownerDetails" },
            },
          },

          {
            $addFields: {
              totalLikesOnComment: { $size: "$likesOnComment" },
            },
          },
          {
            $project: {
              content: 1,
              owner: 1,
              createdAt: 1,
              totalLikesOnComment: 1,
              ownerDetails: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
        pipeline: [
          {
            $project: {
              likedBy: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        channelSubscribers: { $size: "$channelSubscribers" },
        channelDetails: {
          $first: "$channelDetails",
        },
        totalComments: {
          $size: "$comments",
        },
        comments: "$comments",
        likes: {
          $size: "$likes",
        },
        likedBy: "$likes.likedBy",
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        channelSubscribers: 1,
        channelDetails: 1,
        totalComments: 1,
        comments: 1,
        likes: 1,
        likedBy: 1,
      },
    },
  ]);

  if (!videoDetails || videoDetails.length === 0) {
    throw new ApiError(404, "Video not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, videoDetails[0], "Video details fetched"));
});

export { uploadVideo, getVideo };
