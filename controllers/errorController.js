const AppError = require("../utils/AppError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const string = Object.keys(err.keyValue)[0];
  const value = string.charAt(0).toUpperCase() + string.slice(1);

  const message = `${value} already exists!`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  res.status(err.statuscode).json({
    status: err.status,
    // errror: err,
    message: err.message,
    // stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statuscode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR 👿", err);
    res.status(500).json({
      status: "error",
      message: "something went wrong",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statuscode = err.statuscode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    let error = { ...err };
    console.log(err);
    error.message = err.message;
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "CastError") error = handleCastErrorDB(error);
    sendErrorDev(error, req, res);
  } else if (process.env.NODE_ENV === "production") {
    sendErrorProd(err, res);
  }
};
