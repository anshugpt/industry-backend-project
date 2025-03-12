import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  if (!avatarLocalPath) {
    throw new ApiError(404, "Avatar is needed");
  }
  // upload to cloudinary - avatar, cover image
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(500, "Avatar did't get uploaded to cloud");
  }
  // make new entry in the db\
  const newUser = await User.create({
    userName: userName.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url,
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

export { registerUser, loginUser, logoutUser };
