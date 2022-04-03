const mongoose = require("mongoose");

const adDataSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: String,
      required: true,
    },
    spotify_id: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
    spend: {
      type: Number,
      required: true,
    },
    clicks: {
      type: Number,
      required: true,
    },
    impressions: {
      type: Number,
      required: true,
    },
    cpc: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    formated_date: {
      type: String,
    },
    country: String,
  },
  { timestamps: true }
);

const AdData = mongoose.model("AdData", adDataSchema);

module.exports = AdData;
