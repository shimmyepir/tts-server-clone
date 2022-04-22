const axios = require("axios");
const { format, sub } = require("date-fns");
const _ = require("lodash");
const { wait } = require("../utils/helpers");

const axiosClient = axios.create({
  baseURL: "https://business-api.tiktok.com/open_api/v1.2/",
  headers: {
    "Access-Token": process.env.TIKTOK_ACCESS_TOKEN,
  },
});

const AD_ACCOUNT_IDS = [
  "6926116980374142978",
  "6925850781983719425",
  "6945923808448479234",
];

const getCampaign = async (startDate, endDate, campaignId, advertiserID) => {
  const { data } = await axiosClient.get("/reports/integrated/get", {
    params: {
      advertiser_id: advertiserID,
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
  if (!data.data.list || !data.data.list[0]) return null;
  return data.data.list[0].metrics;
};

const getDailyStats = async (campaignId, days, advertiserId) => {
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(sub(new Date(endDate), { days }), "yyyy-MM-dd");
  const { data } = await axiosClient.get("/reports/integrated/get", {
    params: {
      advertiser_id: advertiserId,
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
  if (!Object.keys(data.data).length) throw data.message;
  if (!data.data.list) return [];
  const dailySpends = [];
  data.data.list.forEach((item) => {
    if (!item.metrics) return;
    const { spend, cpc, clicks, impressions } = item.metrics;
    dailySpends.push({
      date: format(new Date(item.dimensions.stat_time_day), "yyyy-MM-dd"),
      spend: Number(spend),
      cpc: Number(cpc),
      clicks: Number(clicks),
      impressions: Number(impressions),
    });
  });
  // const dailySpends = spends.sort(
  //   (a, b) => new Date(a.date) - new Date(b.date)
  // );
  return dailySpends;
};

const getAllCampaignsForArtist = async (artistName) => {
  const campaignIds = [];
  await Promise.all(
    AD_ACCOUNT_IDS.map(async (adAccountId) => {
      const { data } = await axiosClient.get(`campaign/get/`, {
        params: {
          advertiser_id: adAccountId,
          fields: JSON.stringify(["campaign_name", "campaign_id"]),
          page_size: 1000,
        },
      });
      if (data.data.list) {
        data.data.list.forEach((campaign) => {
          if (
            campaign.campaign_name
              .toLowerCase()
              .includes(artistName.toLowerCase())
          ) {
            campaignIds.push({
              id: campaign.campaign_id,
              advertiser_id: adAccountId,
            });
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
  const fetchCampaigns = async (batch) => {
    await Promise.all(
      batch.map(async (campaign) => {
        const { id, advertiser_id } = campaign;
        report.requested += 1;
        try {
          const data = await getDailyStats(id, days, advertiser_id);
          report.totalNumberOfEntriesToSave += data.length;
          report.successful += 1;
          report.data = [...report.data, ...data];
        } catch (error) {
          report.failed += 1;
          report.errors.push({
            campaignId: id,
            error,
          });
        }
      })
    );
  };

  const tiktokBatches = _.chunk(campaignIds, 6);
  for (let i = 0; i < tiktokBatches.length; i++) {
    await wait(2000);
    await fetchCampaigns(tiktokBatches[i]);
  }

  return report;
};

module.exports = {
  getDailyStatsMultipleCampaigns,
  getCampaign,
  getDailyStats,
  getAllCampaignsForArtist,
};
