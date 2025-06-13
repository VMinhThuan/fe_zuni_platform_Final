const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: false,
    error: -1,
    message: "Lỗi server",
    data: null,
  });
};

module.exports = errorHandler;
