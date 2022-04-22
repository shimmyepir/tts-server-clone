const axios = require("axios").default;

class Snapchat {
  base_url = "https://adsapi.snapchat.com/v1";
  client_id = process.env.SNAPCHAT_APP_ID;
  client_secret = process.env.SNAPCHAT_SECRET;
  access_token = process.env.SNAPCHAT_ACCESS_TOKEN;
  refresh_token = process.env.SNAPCHAT_REFRESH_TOKEN;

  async refreshToken() {
    const response = await axios.post(
      `https://accounts.snapchat.com/login/oauth2/access_token`,
      {},
      {
        params: {
          client_id: this.client_id,
          client_secret: this.client_secret,
          grant_type: "refresh_token",
          refresh_token: this.refresh_token,
        },
      }
    );
    this.access_token = response.data.access_token;
  }

  async getCampaignStats(campaignId, startDate, endDate, granularity) {
    try {
      const response = await axios.get(
        `${this.base_url}/campaigns/${campaignId}/stats?fields=shares,saves,swipes,impressions,spend`,
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
          params: {
            end_time: endDate,
            start_time: startDate,
            granularity,
            report_dimension: "country",
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.status == 401) {
        await this.refreshToken();
        return await this.getCampaignStats(
          campaignId,
          startDate,
          endDate,
          granularity
        );
      } else {
        throw error;
      }
    }
  }
  async getCampaignsForAccount(adAccountId) {
    try {
      const response = await axios.get(
        `${this.base_url}/adaccounts/${adAccountId}/campaigns`,
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.status == 401) {
        await this.refreshToken();
        return await this.getCampaignsForAccount(adAccountId);
      } else {
        throw error;
      }
    }
  }
}

const snapchat = new Snapchat();
module.exports = snapchat;
