const axios = require("axios");
const { format, sub } = require("date-fns");

const axiosClient = axios.create({
  baseURL: "https://business-api.tiktok.com/open_api/v1.2/",
  headers: {
    "Access-Token": process.env.TIKTOK_ACCESS_TOKEN,
  },
});

exports.getCampaign = async (startDate, endDate, campaignId, advertiserID) => {
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

exports.getDailyStats = async (campaignId, days, advertiserId) => {
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
