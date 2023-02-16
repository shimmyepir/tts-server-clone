const mongoose = require("mongoose");

const REFRESH_RUN_STATUS = {
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
};
const REFRESH_RUN_TYPES = {
  PLAYLIST_STREAMS: "playlist_streams",
};

const refreshRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      default: "running",
      enum: Object.values(REFRESH_RUN_STATUS),
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(REFRESH_RUN_TYPES),
    },
    completedAt: Date,
    failedAt: Date,
  },
  { timestamps: true }
);

const RefreshRun = mongoose.model("RefreshRun", refreshRunSchema);

exports.RefreshRun = RefreshRun;
exports.REFRESH_RUN_STATUS = REFRESH_RUN_STATUS;
exports.REFRESH_RUN_TYPES = REFRESH_RUN_TYPES;
