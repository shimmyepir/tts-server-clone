const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  campaign_id: {
    type: String,
    required: true,
    unique: true,
  },
  platform: {
    type: String,
    required: true,
  },
  user: {
    type: String,
  },
  advertiser_id: {
    type: String,
  },
});

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
    country: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    campaigns: [campaignSchema],
  },
  { timestamps: true }
);

playlistSchema.index({ name: "text" });

const Playlist = mongoose.model("Playlist", playlistSchema);

module.exports = Playlist;
