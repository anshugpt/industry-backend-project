import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  uploadImage,
  uploadVideoAndImage,
} from "../middlewares/multer.middleware";
import {
  uploadVideo,
  getVideo,
  deleteVideo,
  updateThumbnail,
  updateIsPublished,
} from "../controllers/video.controllers";

const router = Router();

router.route("/upload").post(
  verifyJWT,
  uploadVideoAndImage.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  uploadVideo
);

router.route("/:videoId").get(verifyJWT, getVideo);
router.route("/:videoDocumentId/delete").delete(verifyJWT, deleteVideo);
router
  .route("/:videoDocumentId/update-thumbnail")
  .patch(verifyJWT, uploadImage.single("image"), updateThumbnail);
router
  .route("/:videoDocumentId/update-is-published")
  .patch(verifyJWT, updateIsPublished);
