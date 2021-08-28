const mongoose = require("mongoose");

const playlistFollowersSchema = new mongoose.Schema(
  {
    playlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playlist",
      required: true,
    },
    spotifyId: {
      type: String,
      required: true,
    },
    followers: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const PlaylistFollowers = mongoose.model(
  "PlaylistFollowers",
  playlistFollowersSchema
);

module.exports = PlaylistFollowers;
