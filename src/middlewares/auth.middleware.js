import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // get the token
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    // check the token
    if (!token) {
      throw new ApiError(404, "Unauthorized request");
    }
    // verify the token with jwt
    const decodedTokenInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // get the user
    const user = await User.findById(decodedTokenInfo?._id).select(
      "-password -refreshToken"
    );
    // check user
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    // set user in req
    req.user = user;
    // call next
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
