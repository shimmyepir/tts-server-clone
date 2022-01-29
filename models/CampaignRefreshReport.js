const mongoose = require("mongoose");

const campaignRefreshReportSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const CampaignRefreshReport = mongoose.model(
  "CampaignRefreshReport",
  campaignRefreshReportSchema
);

module.exports = CampaignRefreshReport;
