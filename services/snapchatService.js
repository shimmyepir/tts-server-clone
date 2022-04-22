const { startOfDay, add, format, sub } = require("date-fns");
const _ = require("lodash");
const snapchat = require("../utils/snapchat");
const util = require("util");
const { wait } = require("../utils/helpers");

const AD_ACCOUNT_IDS = [
  "6ce135e7-7032-4179-9f6d-a83a997b5110",
  "8edaa3ca-f0f8-4263-969b-77989ea1890a",
  "f9908371-ff7b-40b3-b875-c9deee4834b5",
  "5f11d61e-d71c-487a-aab7-0d59b5a1a0a2",
  "3ea7e490-da2f-4535-98b4-ad83165fc5d9",
  "4c254a3d-f399-4b91-876f-263ae0dc3b09",
  // "5ed03796-30c1-4fe3-8d66-7afe36228136",
];

const getCampaign = async (startDate, endDate, campaignId) => {
  const data = await snapchat.getCampaignStats(
    campaignId,
    startOfDay(new Date(startDate)),
    add(startOfDay(new Date(endDate)), { days: 1 })
  );
  return data.total_stats[0].total_stat.stats;
};

const getDailyStats = async (campaignId, days) => {
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
    if (item.dimension_stats && item.dimension_stats.length) {
      item.dimension_stats.forEach((stat) => {
        const { swipes, impressions, country } = stat;
        const spend = Number((stat.spend / 1000000).toFixed(2));
        const cpc = spend ? spend / swipes : 0;
        dailySpends.push({
          date: format(new Date(item.start_time), "yyyy-MM-dd"),
          spend,
          clicks: swipes,
          impressions,
          cpc: Number(cpc.toFixed(2)),
          country: country.toUpperCase(),
        });
      });
    }
  });

  return dailySpends;
};

const getAllCampaignsForArtist = async (artistName) => {
  const campaignIds = [];
  await Promise.all(
    AD_ACCOUNT_IDS.map(async (adAccountId) => {
      const data = await snapchat.getCampaignsForAccount(adAccountId);
      if (data.campaigns) {
        data.campaigns.forEach((campaign) => {
          if (
            campaign.campaign.name
              .toLowerCase()
              .includes(artistName.toLowerCase())
          ) {
            campaignIds.push(campaign.campaign.id);
          }
        });
      }
    })
  );
  return campaignIds;
};

const getDailyStatsMultipleCampaigns = async (campaignIds, days) => {
  const report = {
    total: campaignIds.length,
    requested: 0,
    successful: 0,
    failed: 0,
    totalNumberOfEntriesToSave: 0,
    data: [],
    errors: [],
  };

  if (!campaignIds.length) return report;

  const fetchCampaigns = async (campaignIdsBatch) => {
    await Promise.all(
      campaignIdsBatch.map(async (campaignId) => {
        report.requested += 1;
        try {
          const data = await getDailyStats(campaignId, days);
          report.successful += 1;
          report.totalNumberOfEntriesToSave += data.length;
          report.data = [...report.data, ...data];
        } catch (error) {
          report.failed += 1;
          report.errors.push({
            campaignId,
            error: util.format(error.response),
          });
        }
      })
    );
  };

  const snapchatBatches = _.chunk(campaignIds, 10);

  for (let i = 0; i < snapchatBatches.length; i++) {
    await wait(3000);
    await fetchCampaigns(snapchatBatches[i]);
  }
  return report;
};

module.exports = {
  getCampaign,
  getDailyStatsMultipleCampaigns,
  getDailyStats,
  getAllCampaignsForArtist,
};
