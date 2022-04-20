const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");
const { spotifyWebApi } = require("./utils/spotify");
const playlistRoutes = require("./routes/playlistRoutes");
const artistsRoutes = require("./routes/artist");
const facebookRoutes = require("./routes/facebookRoutes");
const {
  schedulePlaylistFollowersCheck,
  schedulePlaylistsCount,
} = require("./services/cronService");

/*
////////////////////
APP
///////////////////
 */

const app = express();

/*
////////////////////
MIDDLEWARES
///////////////////
 */

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));

/*
////////////////////
ROUTES
///////////////////
 */
app.get("/api/v1", (req, res) => {
  res.status(200).send("welcome to TTS REST API");
});

(async () => {
  try {
    const { body } = await spotifyWebApi.refreshAccessToken();
    spotifyWebApi.setAccessToken(body.access_token);
  } catch (err) {
    console.log(err);
  }
})();

app.use("/api/v1/playlists", playlistRoutes);
app.use("/api/v1/artists", artistsRoutes);

// app.get("/api/v1/test", (req, res) => {
//   spotifyWebApi.getPlaylist('6QyGXdRpyIpm32ypGbL7M5').then((result)=> {
//     console.log(result.body)
//   }).catch(err => console.log(err))
//   res.send('thank you')
// });

// app.get("/api/v1/spotify-callback", (req, res) => {
//   console.log(req.query, 'get')
// });

// app.post("/api/v1/spotify-callback", (req, res) => {
//   console.log(req.query, 'post')
// });

/*
////////////////////
 UNHADLED ROUTES
///////////////////
 */
app.use("*", (req, res, next) => {
  next(new AppError(` can not find ${req.originalUrl} on this server`, 404));
});

/*
////////////////////
 GLOBAL ERROR HANDLER
///////////////////
 */
app.use(globalErrorHandler);

if (process.env.NODE_ENV === "production") {
  schedulePlaylistFollowersCheck();
  schedulePlaylistsCount();
}

module.exports = app;
