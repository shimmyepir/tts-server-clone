const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const FacebookService = require("./facebookService");
const TiktokService = require("./tiktokService");
const SnapchatService = require("./snapchatService");
const ArtistAdsInsight = require("../models/ArtistAdsInsight");
const ArtistInsightRefreshReport = require("../models/ArtistInsightRefreshReport");

class ArtisteAdsInsightService {
  static async refreshAdsInsight(artistName, days) {
    const allCampaignsForArtist = {
      facebook: await FacebookService.getAllCampaignsForArtist(artistName),
      snapchat: await SnapchatService.getAllCampaignsForArtist(artistName),
      tiktok: await TiktokService.getAllCampaignsForArtist(artistName),
    };

    const report = {
      artistName,
      date: new Date(),
      totalCampaings: [
        ...allCampaignsForArtist.facebook,
        ...allCampaignsForArtist.snapchat,
        ...allCampaignsForArtist.tiktok,
      ].length,
      totalNumberOfEntriesToSave: 0,
    };

    const facebookReport = await FacebookService.getDailyStatsMultipleCampaigns(
      allCampaignsForArtist.facebook,
      days
    );
    report.totalNumberOfEntriesToSave +=
      facebookReport.totalNumberOfEntriesToSave;
    report.facebook = { ...facebookReport };

    const snapchatReport = await SnapchatService.getDailyStatsMultipleCampaigns(
      allCampaignsForArtist.snapchat,
      days
    );
    report.totalNumberOfEntriesToSave +=
      snapchatReport.totalNumberOfEntriesToSave;
    report.snapchat = { ...snapchatReport };

    const tiktokReport = await TiktokService.getDailyStatsMultipleCampaigns(
      allCampaignsForArtist.tiktok,
      days
    );
    report.totalNumberOfEntriesToSave +=
      tiktokReport.totalNumberOfEntriesToSave;
    report.tiktok = { ...tiktokReport };

    const dataTobeSaved = {
      facebook: facebookReport.data.map((item) => ({
        ...item,
        platform: "facebook",
        artistName,
      })),
      tiktok: tiktokReport.data.map((item) => ({
        ...item,
        platform: "tiktok",
        artistName,
      })),
      snapchat: snapchatReport.data.map((item) => ({
        ...item,
        platform: "snapchat",
        artistName,
      })),
    };

    // fs.writeFileSync(
    //   path.join(__dirname, "../artistAdsInsightsALL.txt"),
    //   JSON.stringify({
    //     data: dataTobeSaved,
    //   })
    // );

    delete report.facebook.data;
    delete report.tiktok.data;
    delete report.snapchat.data;
    await ArtistInsightRefreshReport.create({ artistName, report });
    await this.saveAdsInsightToDb(dataTobeSaved);

    return { report };
  }

  static async saveAdsInsightToDb(adsInsights) {
    const allInsights = [
      ...adsInsights.facebook,
      ...adsInsights.tiktok,
      ...adsInsights.snapchat,
    ];
    if (!allInsights.length) return;
    await Promise.all(
      allInsights.map(async (item) => {
        const {
          spend,
          impressions,
          date,
          cpc,
          clicks,
          country,
          artistName,
          platform,
        } = item;

        const artistAdsInsight = await ArtistAdsInsight.findOne({
          formatedDate: date,
          platform,
          artistName,
          country,
        });

        if (artistAdsInsight) {
          console.log("updating");
          await ArtistAdsInsight.findByIdAndUpdate(artistAdsInsight._id, {
            spend,
            clicks,
            impressions,
            cpc,
          });
        } else {
          console.log("creating");
          await ArtistAdsInsight.create({
            platform,
            spend,
            clicks,
            impressions,
            cpc,
            formatedDate: date,
            date: new Date(`${date} 10:00`),
            country,
            artistName,
          });
        }
      })
    );
    return { status: "done" };
  }
}

module.exports = ArtisteAdsInsightService;
