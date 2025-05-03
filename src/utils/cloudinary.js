import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async function (localFilePath) {
  try {
    if (!localFilePath) return null;
    // upload to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the local file that is failed to upload to cloudinary.
    return null;
  }
};

const deleteImageOnCloudinary = async function (cloudFilePathToBeDeleted) {
  try {
    if (!cloudFilePathToBeDeleted) return null;

    const response = await cloudinary.uploader.destroy(
      cloudFilePathToBeDeleted
    );

    return response;
  } catch (error) {
    throw new ApiError(400, "Error deleting image");
  }
};

const deleteVideoOnCloudinary = async function (cloudFilePathToBeDeleted) {
  try {
    if (!cloudFilePathToBeDeleted) return null;

    const response = await cloudinary.uploader.destroy(
      cloudFilePathToBeDeleted,
      { resource_type: "video" }
    );

    return response;
  } catch (error) {
    throw new ApiError(400, "Error deleting video");
  }
};

export { uploadOnCloudinary, deleteImageOnCloudinary, deleteVideoOnCloudinary };
