import multer from "multer";
const path = require("path");

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = file.originalname
    .toLowerCase()
    .match(/\.(jpeg|jpg|png|gif|webp)$/);
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|mov|avi|mkv/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"), false);
  }
};

const videoAndImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const videoAndImageFileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const videoTypes = /mp4|mov|avi|mkv/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (
    (file.fieldname === "image" &&
      imageTypes.test(ext) &&
      imageTypes.test(mime)) ||
    (file.fieldname === "video" &&
      videoTypes.test(ext) &&
      videoTypes.test(mime))
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
});
export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
});

export const uploadVideoAndImage = multer({
  storage: videoAndImageStorage,
  fileFilter: videoAndImageFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // optional: 100MB limit
});
