const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: ".env" });

const app = require("./app");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`app running at port ${PORT}`));

mongoose
  .connect(process.env.DB_URI, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connected"))
  .catch((err) => console.log(err));
