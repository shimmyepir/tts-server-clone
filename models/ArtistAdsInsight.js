const mongoose = require("mongoose");

const artistAdsInsightSchema = new mongoose.Schema(
  {
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    artistName: {
      type: String,
      required: true,
    },
    formatedDate: {
      type: String,
      required: true,
    },
    spend: {
      type: Number,
      required: true,
    },
    impressions: {
      type: Number,
      required: true,
    },
    clicks: {
      type: Number,
      required: true,
    },
    cpc: {
      type: Number,
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
    country: String,
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const ArtistAdsInsight = mongoose.model(
  "ArtistAdsInsight",
  artistAdsInsightSchema
);

module.exports = ArtistAdsInsight;
