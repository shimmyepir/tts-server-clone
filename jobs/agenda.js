const { format } = require("date-fns");
// const { MongoClient } = require("mongodb");
const Agenda = require("agenda");
const { spotifyWebApi } = require("../utils/spotify");
const PlaylistFollowers = require("../models/PlaylistFollowers");

const agenda = new Agenda({
  db: {
    address: process.env.PROD_DB_URI_JOBS,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
});
// let jobTypes = ["updateFollower"];

// jobTypes.forEach((type) => {
//   const job = require("./" + type)[type];
//   console.log(job);
//   job(agenda);
// });

// if (jobTypes.length) {
//   // if there are jobs in the jobsTypes array set up
//   agenda.on("ready", async () => await agenda.start());
// }

// const graceful = () => {
//   agenda.stop(() => process.exit(0));
// };

agenda.define("update followers", async (job, done) => {
  const { spotifyId, playlistId } = job.attrs.data;
  console.log(`updating followers for ${spotifyId}`);
  try {
    const { body } = await spotifyWebApi.getPlaylist(spotifyId);
    await PlaylistFollowers.create({
      playlistId,
      spotifyId,
      followers: body.followers.total,
      date: format(new Date(), "yyyy-MM-dd"),
    });
    done();
  } catch (error) {
    if (error.statusCode && error.statusCode === 401) {
      const { body } = await spotifyWebApi.refreshAccessToken();
      spotifyWebApi.setAccessToken(body.access_token);
      const response = (await spotifyWebApi.getPlaylist(spotifyId)).body;
      await PlaylistFollowers.create({
        playlistId,
        spotifyId,
        followers: response.followers.total,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      done();
    } else {
      console.log(error, spotifyId);
    }
  }
});

if (process.env.NODE_ENV === "production")
  agenda.on("ready", async () => agenda.start());

module.exports = agenda;

// const updateTime = async () => {
//   const client = new MongoClient(process.env.DB_URI_JOBS);
//   await client.connect();
//   const db = client.db("db_jobs");
//   const collection = db.collection("agendaJobs");
//   const data = await collection.updateMany(
//     { name: "update followers" },
//     {
//       $set: { repeatInterval: "15 minutes" },
//     }
//   );

//   console.log(data);
// };

// updateTime().then(() => console.log("done"));
