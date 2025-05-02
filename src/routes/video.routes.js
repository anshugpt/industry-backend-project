import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { uploadVideoAndImage } from "../middlewares/multer.middleware";
import { uploadVideo } from "../controllers/video.controllers";

const router = Router();

router.route("/upload").post(
  verifyJWT,
  uploadVideoAndImage.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  uploadVideo
);
