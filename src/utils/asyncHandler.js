// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     return await fn(req, res, next)
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: `${error.message}`,
//     });
//   }
// };

const asyncHandler = (requestHandler) => {
  return async (req, res, next) => {
    return await Promise.resolve(requestHandler(req, res, next)).catch(
      (error) => next(error)
    );
  };
};

export { asyncHandler };
