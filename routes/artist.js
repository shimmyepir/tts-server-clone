const router = require("express").Router();
const {
  getArtistEarningsSpends,
  updateArtistStreamsData,
  refreshArtistStreamsData,
  getLatestRefreshRun,
} = require("../controllers/artist");
const queryString = require("query-string");
const axios = require("axios");

router.get("/:artistId/earnings", getArtistEarningsSpends);
router
  .route("/:artistId/streams")
  .post(updateArtistStreamsData)
  .put(refreshArtistStreamsData);
router.get("/:artistId/streams/refresh-run", getLatestRefreshRun);

var client_id = process.env.SPOTIFY_CLIENT_ID;
var redirect_uri = "http://localhost:5000/api/v1/artists/callback";

router.get("/login", function (req, res) {
  var state = "asdfkjhfoiuyewqe";
  var scope = "user-read-private user-read-email";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      queryString.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

router.get("/callback", function (req, res) {
  console.log("querryyyyyyy", req.query);
  var code = req.query.code || null;
  var state = req.query.state || null;

  if (state === null) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      method: "POST",
      params: {
        code: code,
        redirect_uri: "http://localhost:5000/api/v1/artists/callback",
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      json: true,
    };
    axios.default
      .request(authOptions)
      .then((data) => console.log("dataaaaaaa\n\n", data.data))
      .catch((err) => console.log(err.response));
    console.log(authOptions);
  }
});
module.exports = router;
