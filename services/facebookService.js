const axios = require("axios");
const { format, sub } = require("date-fns");

const axiosClient = axios.create({
  baseURL: "https://graph.facebook.com/v12.0",
});

exports.getCampaign = async (startDate, endDate, campaignId) => {
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

exports.getDailyStats = async (campaignId, days) => {
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(sub(new Date(endDate), { days }), "yyyy-MM-dd");
  const { data } = await axiosClient.get(`/${campaignId}/insights`, {
    params: {
      access_token: process.env.FACEBOOK_ACCESS_TOKEN_LONG,
      fields: "clicks,cpc,impressions,objective,spend",
      time_increment: 1,
      limit: 30,
      time_range: {
        since: startDate,
        until: endDate,
      },
    },
  });
  const dailySpends = [];
  data.data.forEach((item) => {
    const { date_start, impressions, spend, clicks, cpc } = item;
    dailySpends.push({
      date: date_start,
      cpc: cpc ? Number(cpc) : 0,
      impressions: Number(impressions),
      clicks: Number(clicks),
      spend: Number(spend),
    });
  });
  return dailySpends;
};
