const { startOfDay, endOfDay } = require("date-fns");
const PlaylistStreams = require("../models/PlaylistStreams");

class PlaylistStreamsService {
  static async getPlaylisStreamsBetweenDates(spotifyId, startDate, endDate) {
    const data = await PlaylistStreams.aggregate([
      {
        $match: {
          spotifyId,
          createdAt: {
            $gte: startOfDay(new Date(startDate)),
            $lte: endOfDay(new Date(endDate)),
          },
        },
      },
      {
        $group: {
          _id: {
            all: null,
            artistName: "$artistName",
          },
          streams: { $sum: "$streams" },
        },
      },
      {
        $group: {
          _id: "$_id.all",
          streams: { $sum: "$streams" },
          artists: {
            $push: {
              artistName: "$_id.artistName",
              streams: "$streams",
            },
          },
        },
      },
    ]);

    if (!data[0])
      return {
        streams: 0,
        artists: [],
      };
    delete data[0]._id;
    return data[0];
  }
}

module.exports = PlaylistStreamsService;
