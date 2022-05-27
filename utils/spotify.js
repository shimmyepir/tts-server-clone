exports = {};
const SpotifyWebApi = require("spotify-web-api-node");
const cron = require("node-cron");

const spotifyWebApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});


spotifyWebApi.setAccessToken(process.env.SPOTIFY_ACCESS_TOKEN);
spotifyWebApi.setRefreshToken(process.env.SPOTIFY_REFRESH_TOKEN);

// console.log(agenda);

// const refreshToken = agenda.create("refresh spotify_token");
// refreshToken.repeatEvery("45 minutes").save();
cron.schedule("0 */45 * * * *", async () => {
  try {
    const { body } = await spotifyWebApi.refreshAccessToken();
    spotifyWebApi.setAccessToken(body["access_token"]);
  } catch (err) {
    console.log(err);
  }
});

// 'https://github.com/farhan711/task-scheduling'

module.exports.spotifyWebApi = spotifyWebApi;
