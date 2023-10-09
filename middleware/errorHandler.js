import Constant from "../constants.js";

/**
 * Handle the error from every async routes using the Constants
 */

const errorHandler = (err, req, res, next) => {

    const statusCode = res.statusCode ? res.statusCode : 500;

    switch (statusCode) {
        case Constant.VALIDATION_ERROR :
            res.status(statusCode || 500).json({
                title: "Validation failed",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.NOT_FOUND :
            res.status(statusCode || 500).json({
                title: "Not found",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.UNAUTHORIZED :
            res.status(statusCode || 500).json({
                title: "Unauthorized",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.FORBIDDEN :
            res.status(statusCode || 500).json({
                title: "Forbidden",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.SERVER_ERROR :
            res.status(statusCode || 500).json({
                title: "Server error",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        default:
            break;
    }
}

export default errorHandler;