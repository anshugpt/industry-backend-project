import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteImageOnCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user data from the frontend
  const { userName, fullName, email, password } = req.body;
  // validate data - check if it's not empty
  if (
    [userName, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(404, "All fields are required");
  }
  // check if user existed - username and email
  const validUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (validUser) {
    throw new ApiError(409, "User already existed");
  }
  // check for files - avatar, cover image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath || !coverImageLocalPath) {
    throw new ApiError(404, "Avatar or cover image is needed");
  }
  // upload to cloudinary - avatar, cover image
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(500, "Avatar did't get uploaded to cloud");
  }
  // make new entry in the db
  const newUser = await User.create({
    userName: userName.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url || "",
    coverImage: coverImage?.url || "",
  });
  // remove password and refresh token from the returned response
  const user = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );
  // check is user created or not
  if (!user) {
    throw new ApiError(500, "User not created");
  }
  // return the new response to the frontend
  return res
    .status(201)
    .json(new ApiResponse(200, user, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // get username, email and password -> req.body
  const { userName, email, password } = req.body;
  // check username and email
  if (!userName && !email) {
    throw new ApiError(400, "username and email is required");
  }
  // find user using username and email
  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  // check returned user
  if (!user) {
    throw new ApiError(404, "user not registered");
  }
  // password check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Incorrect password");
  }
  // generate accessToken and refreshToken
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  // get updated user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // options for cookie
  const options = {
    httpOnly: true,
    secure: true,
  };
  // return response with data and cookies
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refresh token
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  // check the token
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // verify token using jwt
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // get the user
    const user = await User.findById(decodedRefreshToken?._id);
    // check the user
    if (!user) {
      throw new ApiError(404, "Invalid token");
    }
    // match refresh token
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(404, "Refresh token used or expired");
    }
    // generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    // options for cookie
    const options = {
      httpOnly: true,
      secure: true,
    };
    // return the res
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // get the old and new password
  const { oldPassword, newPassword } = req.body;

  // get the user
  const user = await User.findById(req.user?._id);

  // check the old password
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect Old Password");
  }

  // change the password
  user.password = newPassword;

  // save the password
  await user.save({ validateBeforeSave: false });
  // return res
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // get the updated details
  const { fullName, email } = req.body;

  // check the details
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  // get the user and update it
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password");

  // return res
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // get the file
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Invalid Avatar local path");
  }

  // upload on cloud
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar on cloud");
  }

  // get the user for old image url and delete
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (user.avatar) {
    const publicId = user.avatar.split("/").pop().split(".")[0]; // Extract Cloudinary public ID
    await deleteImageOnCloudinary(publicId);
  }

  // get the user and update avatar path
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  // return res
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // get the file
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Invalid cover image path");
  }

  // upload on cloud
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image on cloud");
  }

  // get the user and update cover image path
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  // return res
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // get username
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username Invalid");
  }

  // write aggregation pipeline
  const channel = await User.aggregate([
    {
      $match: {
        userName: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  // return res
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel details fetched successfully")
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};
