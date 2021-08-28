const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    spotifyId: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
    campaignId: {
      type: String,
    },
    adPlatform: {
      type: String,
    },
  },
  { timestamps: true }
);

playlistSchema.index({ name: "text" });

const Playlist = mongoose.model("Playlist", playlistSchema);

module.exports = Playlist;
