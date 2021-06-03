module.exports = {
    mongoURI:process.env.MONGO_URI,
    JWT_SECRET_KEY:process.env.JWT_SECRET_KEY,
    TRANSCRIPT_API:process.env.TRANSCRIPT_API,
    TRANSCRIPT_API_KEY:process.env.TRANSCRIPT_API_KEY,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    UPLOAD_API: process.env.UPLOAD_API,
    UPLOAD_API_KEY: process.env.UPLOAD_API_KEY,
    // vvvvvvv doesn't need for now.
    uploadAPI:process.env.uploadAPI,
    awsAccessKeyId:process.env.awsAccessKeyId,
    awsSecretAccessKey:process.env.awsSecretAccessKey,
    awsSessionToken:process.env.awsSessionToken,
    awsBucketName:process.env.awsBucketName,
    awsRegion:process.env.awsRegion,
}