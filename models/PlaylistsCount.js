const mongoose = require("mongoose");

const playlistsCountSchema = new mongoose.Schema(
  {
    count: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const PlaylistsCount = mongoose.model("PlaylistsCount", playlistsCountSchema);

module.exports = PlaylistsCount;
