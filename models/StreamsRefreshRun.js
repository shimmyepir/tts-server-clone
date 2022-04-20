const mongoose = require("mongoose");

const STREAM_REFRESH_RUN_STATUS = {
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
};

const streamsRefreshRunSchema = new mongoose.Schema(
  {
    artistName: { type: String, required: true },
    progress: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "running",
      enum: Object.values(STREAM_REFRESH_RUN_STATUS),
    },
    countries: {
      type: [String],
    },
    completedAt: Date,
    failedAt: Date,
  },
  { timestamps: true }
);

const StreamsRefreshRun = mongoose.model(
  "StreamsRefreshRun",
  streamsRefreshRunSchema
);

module.exports = StreamsRefreshRun;
