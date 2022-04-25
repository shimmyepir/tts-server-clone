const { format } = require("date-fns");
const { CPM } = require("../utils/streams");
const { spawn } = require("child_process");
const StreamsRefreshRun = require("../models/StreamsRefreshRun");

const fetchProgress = (str) => {
  const progress = str
    .split("PROGRESSSTART")
    .pop()
    .split("PROGRESSEND")[0]
    .split("/");

  return {
    country: progress[2],
    progress: Math.round((Number(progress[0]) / Number(progress[1])) * 100),
  };
};

class StreamsService {
  static formatStreamsData(streamsData, spendsData) {
    const formattedStreams = {};

    // Add income and spend data to streams object for each country leaving out worldwide
    Object.keys(streamsData).forEach((key) => {
      formattedStreams[key] = streamsData[key].map((item) => {
        const [date, totalStreams] = item.split(", ");
        const streams = this.convertStringToNumber(totalStreams);
        let income = 0;
        if (key !== "Worldwide") {
          const earningsPerThousandStreams = CPM[key] || 0.1;
          income = (streams / 1000) * earningsPerThousandStreams;
        }
        return {
          date: format(new Date(date), "yyyy-MM-dd"),
          streams,
          income,
        };
      });
    });

    // Sum income for per day for all countries and add to worldwide income for that day
    Object.keys(formattedStreams)
      .filter((key) => key !== "Worldwide")
      .forEach((key) => {
        formattedStreams.Worldwide.forEach((item, index) => {
          const { date } = item;
          const incomeForDay =
            formattedStreams[key].find((stream) => stream.date === date)
              ?.income || 0;
          formattedStreams.Worldwide[index].income =
            formattedStreams.Worldwide[index].income + incomeForDay;
        });
      });

    // Create a new object for each country with the total income, streams and for that country
    const formattedSpendsIncome = {
      worldWide: [],
    };
    const worldWideSpend = spendsData.allCountries;
    formattedStreams.Worldwide.forEach((item) => {
      const { date, streams, income } = item;
      const daySpend = worldWideSpend.find((spend) => spend.date === date);
      formattedSpendsIncome.worldWide.push({
        date,
        streams,
        income,
        spend: daySpend?.spend || 0,
      });
    });

    const { spendPerDayPerCountry } = spendsData;
    Object.keys(spendPerDayPerCountry).forEach((key) => {
      const streamsForCountry = formattedStreams[key] || [];
      const spendsForCountry = spendPerDayPerCountry[key];
      const spendsStreamsForCountry = [];
      streamsForCountry.forEach((stream) => {
        const { date, streams, income } = stream;
        const spend = spendsForCountry.find((spend) => spend.date === date);
        spendsStreamsForCountry.push({
          date,
          streams,
          income,
          spend: spend?.spend || 0,
        });
      });
      if (spendsStreamsForCountry.length)
        formattedSpendsIncome[key] = spendsStreamsForCountry;
    });

    // sort object by income
    return Object.entries(formattedSpendsIncome)
      .sort(
        (a, b) =>
          b[1].reduce((acc, curr) => acc + curr.income, 0) -
          a[1].reduce((acc, curr) => acc + curr.income, 0)
      )
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  }

  static async refreshStreams(runReport) {
    const child = spawn("npm", ["run", "cypress"]);

    child.stdout.on("data", async (data) => {
      console.log(`stdout:\n${data}`);
      if (data.includes("PROGRESSSTART")) {
        const { country, progress } = fetchProgress(data.toString());
        console.log(country, progress);
        await StreamsRefreshRun.findByIdAndUpdate(runReport._id, {
          $set: { progress },
          $push: { countries: country },
        });
      }
    });

    let numSaved = 0;
    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      if (data.includes("ERR!")) {
        runReport.status = "failed";
        runReport.failedAt = new Date();
        if (numSaved < 1) runReport.save();
        numSaved++;
      }
    });

    child.on("error", (error) => {
      console.error(`error: ${error.message}`);
      runReport.update({ status: "failed", failedAt: new Date() });
    });

    child.on("exit", function (code, signal) {
      console.log(
        "child process exited with " + `code ${code} and signal ${signal}`
      );
    });
  }

  static convertStringToNumber(string) {
    string = string.toLowerCase().split(".");
    if (string[1].length === 3) {
      string[1] = string[1].replace("m", "0000").replace("k", "0");
    } else {
      string[1] = string[1].replace("m", "00000").replace("k", "00");
    }
    return Number(string.join("").replace("m", "000000").replace("k", "000"));
  }
}

module.exports = StreamsService;
