const AdDataService = require("../services/adsDataService");
const CampaignsService = require("../services/campaingsService");
const catchAsyncErrors = require("../utils/catchAsyncErrors");

exports.groupCampaignsByPlatform = catchAsyncErrors(async (req, res) => {
  const { days, platform } = req.body;
  // const adsByPlatform = await CampaignsService.groupCampaignsByPlatform();
  // // await AdDataService.updateManyCampaignsDataForLastDays(
  // //   adsByPlatform,
  // //   days,
  // //   platform
  // // );
  res.status(200).json({ status: "success" });
});
