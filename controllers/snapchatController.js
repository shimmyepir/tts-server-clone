const { startOfDay, add, format, sub } = require("date-fns");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const {
  getFollowersBetweenDates,
  followersDaily,
} = require("./playlistController");
const snapchat = require("../utils/snapchat");
const { formatDailySpendPerFollowers } = require("../utils/helpers");

exports.getCampaign = catchAsyncErrors(async (req, res) => {
  const { startDate, endDate, campaignId, spotifyId } = req.query;
  let reportEndDate = endDate;
  if (startDate === endDate) {
    reportEndDate = startOfDay(add(new Date(endDate), { days: 1 }));
  }
  const data = await snapchat.getCampaignStats(
    campaignId,
    startOfDay(new Date(startDate)),
    reportEndDate
  );
  const followers = await getFollowersBetweenDates(
    spotifyId,
    startDate,
    endDate
  );
  res
    .status(200)
    .json({ metrics: data.total_stats[0].total_stat.stats, followers });
});

exports.getDailyStats = catchAsyncErrors(async (req, res) => {
  const { campaignId, spotifyId } = req.query;
  const endDate = startOfDay(new Date());
  const startDate = startOfDay(sub(endDate, { days: 27 }));
  const data = await snapchat.getCampaignStats(
    campaignId,
    startDate,
    endDate,
    "DAY"
  );
  const dailySpends = [];
  data.timeseries_stats[0].timeseries_stat.timeseries.forEach((item) => {
    dailySpends.push({
      date: format(new Date(item.start_time), "yyyy-MM-dd"),
      spend: item.stats.spend,
    });
  });

  const followers = await followersDaily(spotifyId, false, 27);

  const dailySpendPerFollower = formatDailySpendPerFollowers(
    dailySpends,
    followers,
    1000000
  );
  res.status(200).json({ dailySpendPerFollower });
});
