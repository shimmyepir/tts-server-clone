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
  baseURL: "https://graph.facebook.com/v11.0",
});

exports.getCampaign = catchAsyncErrors(async (req, res, next) => {
  const { startDate, endDate, campaignId, spotifyId } = req.query;
  const response = await axiosClient.get(`/${campaignId}/insights`, {
    params: {
      access_token: process.env.FACEBOOK_ACCESS_TOKEN_LONG,
      fields: `clicks,cpc,impressions,objective,spend,account_name`,
      time_range: {
        since: startDate,
        until: endDate,
      },
    },
  });

  const followers = await getFollowersBetweenDates(
    spotifyId,
    startDate,
    endDate
  );
  res.status(200).json({ metrics: response.data.data[0], followers });
});

exports.getDailyStats = catchAsyncErrors(async (req, res, next) => {
  const { campaignId, spotifyId } = req.query;
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(sub(new Date(endDate), { days: 26 }), "yyyy-MM-dd");
  const { data } = await axiosClient.get(`/${campaignId}/insights`, {
    params: {
      access_token: process.env.FACEBOOK_ACCESS_TOKEN_LONG,
      fields: `clicks,cpc,impressions,objective,spend`,
      time_increment: 1,
      limit: 30,
      date_preset: "last_28d",
      // time_range: {
      //   since: startDate,
      //   until: endDate,
      // },
    },
  });

  const dailySpends = [];
  if (data.data.length > 27) {
    data.data.splice(0, 1);
    data.data.forEach((item) => {
      dailySpends.push({
        date: item.date_start,
        spend: item.spend,
      });
    });
  } else {
    data.data.forEach((item) => {
      dailySpends.push({
        date: item.date_start,
        spend: item.spend,
      });
    });
  }

  const followers = await followersDaily(spotifyId, false, 27);

  const dailySpendPerFollower = formatDailySpendPerFollowers(
    dailySpends,
    followers
  );

  res.status(200).json({ dailySpends, dailySpendPerFollower });
});
