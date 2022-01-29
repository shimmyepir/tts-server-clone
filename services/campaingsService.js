const Playlist = require("../models/Playlist");

class CampaignsService {
  static async groupCampaignsByPlatform() {
    const playlists = await Playlist.find();

    const adsByPlatform = {
      snapchat: [],
      tiktok: [],
      facebook: [],
    };
    playlists.forEach((playlist) => {
      if (playlist.campaigns.length) {
        playlist.campaigns.forEach((campaign) => {
          const campaignsWithPlaylistId = {
            ...campaign.toObject(),
            spotify_id: playlist.spotifyId,
          };
          switch (campaign.platform) {
            case "snapchat":
              adsByPlatform.snapchat.push(campaignsWithPlaylistId);
              break;
            case "facebook":
              adsByPlatform.facebook.push(campaignsWithPlaylistId);
              break;
            case "tiktok":
              adsByPlatform.tiktok.push(campaignsWithPlaylistId);
              break;

            default:
              break;
          }
        });
      }
    });
    return adsByPlatform;
  }
}
module.exports = CampaignsService;
