const { spotifyWebApi } = require("../utils/spotify");

// module.exports = (agenda) => {
//   agenda.define("refresh spotify_token", async (job, done) => {
//     try {
//       const { body } = await spotifyWebApi.refreshAccessToken();
//       spotifyWebApi.setAccessToken(body["access_token"]);
//     } catch (err) {
//       console.log(err);
//     }
//     done();
//   });
// };

exports.refreshSpotifyAccessToken = async () => {
  try {
    const { body } = await spotifyWebApi.refreshAccessToken();
    spotifyWebApi.setAccessToken(body["access_token"]);
  } catch (err) {
    console.log(err);
  }
};
