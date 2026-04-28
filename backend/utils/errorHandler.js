export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Mongoose bad object ID
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
