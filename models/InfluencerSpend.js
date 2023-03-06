const mongoose = require("mongoose");

const influencerSpendSchema = new mongoose.Schema(
  {
    influencerName: {
      type: String,
      required: true,
    },
    spend: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    formattedDate: {
      type: String,
    },
    spotifyId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const InfluencerSpend = mongoose.model(
  "InfluencerSpend",
  influencerSpendSchema
);

module.exports = InfluencerSpend;
