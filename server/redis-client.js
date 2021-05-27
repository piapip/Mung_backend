var redis = require('redis');
const config = require("./config/key");

module.exports = redis.createClient({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
});
