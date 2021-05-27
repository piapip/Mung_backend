const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require("../models/User");
const redis_client = require("../redis-client");
const config = require("../config/key");

// const CLIENT_SECRET = "tjfjfL7BSIdCyUnuc6R15Q4qtzWMMyZ8";

// CREATE USER
router.post("/users", (req, res) => {
  // if (req.headers["client-secret"] !== CLIENT_SECRET) {
  //   res.status(405).send({ status: 0, error: "None of your business!" });
  //   return
  // }

  const userInfo = req.body.user;

  const user = new User({
    name: userInfo.name,
    email: userInfo.email,
    ssoUserId: userInfo.ssoUserId,
    password: "12345678",
    role: 0,
    sex: 0,
    image: userInfo.avatar,
  });

  user.save((err, doc) => {
    if (err) return res.status(500).send({ status: 0, error: err });
    return res.status(200).send({ status: 1 });
  });
})

// LOGIN
router.post("/users/token", (req, res) => {

  // if (req.headers["client-secret"] !== CLIENT_SECRET) {
  //   res.status(405).send({ status: 0, error: "None of your business!" });
  //   return
  // }
  
  const accessToken = req.body.accessToken;
  const decodeInfo = jwt.verify(accessToken, config.JWT_SECRET_KEY, (err, decode) => {
    if (err) {
      res.status(500).send({ status: 0, err: `Having problem decoding, ${err}` });
      throw err;
    }
    return decode;
  });

  const ssoUserId = decodeInfo.ssoUserId;

  User.find({ ssoUserId: ssoUserId })
  .then(userFound => {
    if (userFound.length === 0) {
      res.status(404).send({ status: 0, err: "User doesn't exist!" });
      return
    } else {
      const user = userFound[0];

      user.generateToken((err) => {
        if (err) return res.status(400).send({ status: 0, error: "Having problem recording user session!" });
      });

      // token, expire, 0 - offline, 1 - online
      redis_client.setex(accessToken, 4*3600, 1);
      res.status(200).send({ status: 1 });
    }
  })
})

// LOGOUT
router.post("/users/logout", (req, res) => {

  // if (req.headers["client-secret"] !== CLIENT_SECRET) {
  //   res.status(405).send({ status: 0, error: "None of your business!" });
  //   return
  // }

  const accessToken = req.body.accessToken;
  const decodeInfo = jwt.verify(accessToken, config.JWT_SECRET_KEY, (err, decode) => {
    if (err) {
      res.status(500).send({ status: 0, err: `Having problem decoding, ${err}` });
      throw err;
    }
    return decode;
  });

  redis_client.del(accessToken);

  const ssoUserId = decodeInfo.ssoUserId;

  User.find({ ssoUserId: ssoUserId })
  .then(userFound => {
    if (userFound.length === 0) {
      res.status(404).send({ status: 0, err: "User doesn't exist!" });
      return
    } else {
      const user = userFound[0]
      // console.log("User: ", user)
      if (user.tokenExp === null) {
        res.status(500).send({ status: 0, err: "The user is already logged out!" });
      } else {
        user.token = "";
        user.tokenExp = "";
        user.save();
        res.status(200).send({ status: 1 });
      }
    }
  })
  .catch(err => {
    res.status(500).send({ status: 0, error: err });
  });
})

module.exports = router;