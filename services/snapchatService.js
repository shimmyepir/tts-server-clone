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

exports.getDailyStats = async (campaignId, days) => {
  const endDate = startOfDay(add(new Date(), { days: 1 }));
  const startDate = startOfDay(sub(endDate, { days }));
  const data = await snapchat.getCampaignStats(
    campaignId,
    startDate,
    endDate,
    "DAY"
  );
  const dailySpends = [];
  data.timeseries_stats[0].timeseries_stat.timeseries.forEach((item) => {
    const { swipes, impressions } = item.stats;
    const spend = Number((item.stats.spend / 1000000).toFixed(2));
    const cpc = spend ? spend / swipes : 0;
    dailySpends.push({
      date: format(new Date(item.start_time), "yyyy-MM-dd"),
      spend,
      clicks: swipes,
      impressions,
      cpc: Number(cpc.toFixed(2)),
    });
  });

  return dailySpends;
};
