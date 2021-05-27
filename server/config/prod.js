module.exports = {
    mongoURI:process.env.MONGO_URI,
    uploadAPI:process.env.uploadAPI,
    JWT_SECRET_KEY:process.env.JWT_SECRET_KEY,
    TRANSCRIPT_API:process.env.TRANSCRIPT_API,
    TRANSCRIPT_API_KEY:process.env.TRANSCRIPT_API_KEY,
    // vvvvvvv doesn't need for now.
    awsAccessKeyId:process.env.awsAccessKeyId,
    awsSecretAccessKey:process.env.awsSecretAccessKey,
    awsSessionToken:process.env.awsSessionToken,
    awsBucketName:process.env.awsBucketName,
    awsRegion:process.env.awsRegion,
}