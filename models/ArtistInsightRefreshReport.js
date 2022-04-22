const mongoose = require("mongoose");

const artistInsightRefreshReportSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    artistName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const ArtistInsightRefreshReport = mongoose.model(
  "ArtistInsightRefreshReport",
  artistInsightRefreshReportSchema
);

module.exports = ArtistInsightRefreshReport;
