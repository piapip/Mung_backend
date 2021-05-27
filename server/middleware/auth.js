const { User } = require('../models/User');
const redis_client = require("../redis-client");
const jwt = require('jsonwebtoken');
const config = require('../config/key');

let auth = (req, res, next) => {
  // let token = req.cookies.w_auth;
  let accessToken = req.cookies.accessToken;
  if (accessToken === null || accessToken === undefined) return res.json({
    isAuth: false,  
    error: true,
  });

  redis_client.get(accessToken, (err, data) => {
    if (err) throw err;
    if (data === null || data === 0 || data === undefined) return res.json({
      isAuth: false,  
      error: true,
    });
    
    const decodeInfo = jwt.verify(accessToken, config.JWT_SECRET_KEY, (err, decode) => {
      if (err) {
        res.status(500).json({ isAuth: false, error: true });
        throw err;
      }
      return decode;
    });

    const ssoUserId = decodeInfo.ssoUserId;

    User.find({ ssoUserId: ssoUserId })
    .then(userFound => {
      if (userFound.length === 0) {
        res.status(404).json({ isAuth: false, error: true });
        return
      } else {
        const user = userFound[0];
        req.user = user;
        next();
      }
    })
  })
};

module.exports = { auth };
