import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
