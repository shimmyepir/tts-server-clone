const axios = require("axios").default;
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const {
  getFollowersBetweenDates,
  followersDaily,
} = require("./playlistController");
const AppError = require("../utils/AppError");
const { format, sub } = require("date-fns");
const { formatDailySpendPerFollowers } = require("../utils/helpers");

const axiosClient = axios.create({
  baseURL: "https://ads.tiktok.com/open_api/v1.2/",
  headers: {
    "Access-Token": process.env.TIKTOK_ACCESS_TOKEN,
  },
});

exports.getCampaign = catchAsyncErrors(async (req, res, next) => {
  const { startDate, endDate, campaignId, spotifyId } = req.query;

  const { data } = await axiosClient.get("/reports/integrated/get", {
    params: {
      advertiser_id: process.env.TITOK_ADVERTISER_ID,
      report_type: "BASIC",
      dimensions: JSON.stringify(["campaign_id"]),
      data_level: "AUCTION_CAMPAIGN",
      lifetime: false,
      start_date: startDate,
      end_date: endDate,
      page: 1,
      page_size: 10,
      metrics: JSON.stringify([
        "spend",
        "cpc",
        "cpm",
        "impressions",
        "clicks",
        "ctr",
      ]),
      filters: JSON.stringify([
        {
          field_name: "campaign_ids",
          filter_type: "IN",
          filter_value: `[${campaignId}]`,
        },
      ]),
    },
  });
  const followers = await getFollowersBetweenDates(
    spotifyId,
    startDate,
    endDate
  );
  if (!data.data.list) return next(new AppError("invalid Id", 400));
  res.status(200).json({ metrics: data.data.list[0].metrics, followers });
});

exports.getDailyStats = catchAsyncErrors(async (req, res) => {
  const { campaignId, spotifyId } = req.query;
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(sub(new Date(endDate), { days: 26 }), "yyyy-MM-dd");

  const { data } = await axiosClient.get("/reports/integrated/get", {
    params: {
      advertiser_id: process.env.TITOK_ADVERTISER_ID,
      report_type: "BASIC",
      dimensions: JSON.stringify(["campaign_id", "stat_time_day"]),
      data_level: "AUCTION_CAMPAIGN",
      lifetime: false,
      start_date: startDate,
      end_date: endDate,
      page: 1,
      page_size: 30,
      metrics: JSON.stringify([
        "spend",
        "cpc",
        "cpm",
        "impressions",
        "clicks",
        "ctr",
      ]),
      filters: JSON.stringify([
        {
          field_name: "campaign_ids",
          filter_type: "IN",
          filter_value: `[${campaignId}]`,
        },
      ]),
    },
  });
  if (!data.data.list) return next(new AppError("Error fetching data", 500));
  const spends = [];
  data.data.list.forEach((item) => {
    spends.push({
      date: format(new Date(item.dimensions.stat_time_day), "yyyy-MM-dd"),
      spend: item.metrics.spend,
    });
  });
  const dailySpends = spends.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const followers = await followersDaily(spotifyId, false, 27);

  const dailySpendPerFollower = formatDailySpendPerFollowers(
    dailySpends,
    followers
  );
  res.status(200).json({ dailySpendPerFollower });
});
