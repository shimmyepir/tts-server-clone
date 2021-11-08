const { startOfDay, add, format, sub } = require("date-fns");
const snapchat = require("../utils/snapchat");

exports.getCampaign = async (startDate, endDate, campaignId) => {
  const data = await snapchat.getCampaignStats(
    campaignId,
    startOfDay(new Date(startDate)),
    add(startOfDay(new Date(endDate)), { days: 1 })
  );
  return data.total_stats[0].total_stat.stats;
};

exports.getDailyStats = async (campaignId) => {
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
      spend: item.stats.spend / 1000000,
    });
  });

  return dailySpends;
};
