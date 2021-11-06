const axios = require("axios");
// const { format, sub } = require("date-fns");

const axiosClient = axios.create({
  baseURL: "https://graph.facebook.com/v11.0",
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

exports.getDailyStats = async (campaignId) => {
  //   const endDate = format(new Date(), "yyyy-MM-dd");
  //   const startDate = format(sub(new Date(endDate), { days: 26 }), "yyyy-MM-dd");
  const { data } = await axiosClient.get(`/${campaignId}/insights`, {
    params: {
      access_token: process.env.FACEBOOK_ACCESS_TOKEN_LONG,
      fields: "clicks,cpc,impressions,objective,spend",
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
  return dailySpends;
};
