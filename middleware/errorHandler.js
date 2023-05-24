import Constant from "../constants";

/**
 * Handle the error from every async routes using the Constants
 */

const errorHandler = (err, req, res, next) => {

    const statusCode = res.statusCode ? res.statusCode : 500;

    switch (statusCode) {
        case Constant.VALIDATION_ERROR :
            res.json({
                title: "Validation failed",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.NOT_FOUND :
            res.json({
                title: "Not found",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.UNAUTHORIZED :
            res.json({
                title: "Unauthorized",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.FORBIDDEN :
            res.json({
                title: "Forbidden",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.SERVER_ERROR :
            res.json({
                title: "Server error",
                message: err.message,
                stackTrace: err.stack
            });
            break;

        default:
            console.log('No error');
            break;
    }
}

export default errorHandler;