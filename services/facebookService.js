const axios = require("axios");
const { format, sub } = require("date-fns");
const util = require("util");

const axiosClient = axios.create({
  baseURL: "https://graph.facebook.com/v12.0",
});

const AD_ACCOUNT_IDS = [
  "act_196176962",
  "act_226786350772469",
  "act_3171502679774141",
];

const getCampaign = async (startDate, endDate, campaignId) => {
  const response = await axiosClient.get(`/${campaignId}/insights`, {
    params: {
      access_token: process.env.FACEBOOK_ACCESS_TOKEN_LONG,
      fields: "clicks,cpc,impressions,objective,spend,account_name",
      time_range: {
        since: startDate,
        until: endDate,
      },
    },
  });
  return response.data.data[0];
};

const getDailyStats = async (campaignId, days) => {
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(sub(new Date(endDate), { days }), "yyyy-MM-dd");
  const { data } = await axiosClient.get(`/${campaignId}/insights`, {
    params: {
      access_token: process.env.FACEBOOK_ACCESS_TOKEN_LONG,
      fields: "clicks,cpc,impressions,objective,spend",
      breakdowns: "country",
      time_increment: 1,
      limit: 500,
      time_range: {
        since: startDate,
        until: endDate,
      },
    },
  });
  const dailySpends = [];
  data.data.forEach((item) => {
    const { date_start, impressions, spend, clicks, cpc, country } = item;
    dailySpends.push({
      date: date_start,
      cpc: cpc ? Number(cpc) : 0,
      impressions: Number(impressions),
      clicks: Number(clicks),
      spend: Number(spend) || 0,
      country,
    });
  });
  return dailySpends;
};

const getAllCampaignsForArtist = async (artistName) => {
  const campaignIds = [];
  await Promise.all(
    AD_ACCOUNT_IDS.map(async (adAccountId) => {
      const { data } = await axiosClient.get(`/${adAccountId}/campaigns`, {
        params: {
          access_token: process.env.FACEBOOK_ACCESS_TOKEN_LONG,
          fields: "name",
          limit: 10000,
        },
      });
      data.data.forEach((campaign) => {
        if (campaign.name.toLowerCase().includes(artistName.toLowerCase())) {
          campaignIds.push(campaign.id);
        }
      });
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

  await Promise.all(
    campaignIds.map(async (campaignId) => {
      report.requested += 1;
      try {
        const data = await getDailyStats(campaignId, days);
        report.totalNumberOfEntriesToSave += data.length;
        report.successful += 1;
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
  return report;
};

module.exports = {
  getAllCampaignsForArtist,
  getDailyStats,
  getCampaign,
  getDailyStatsMultipleCampaigns,
};
