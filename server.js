const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: ".env" });

const app = require("./app");
const { NODE_ENV, PROD_DB_URI, DB_URI } = process.env
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`app running at port ${PORT}`));

const DB = NODE_ENV === 'production' ? PROD_DB_URI : DB_URI

mongoose
  .connect(DB, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log(NODE_ENV + " DB connected"))
  .catch((err) => console.log(err));
