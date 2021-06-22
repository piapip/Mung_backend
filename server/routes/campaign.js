const express = require("express");
const router = express.Router();

const { Campaign } = require("../models/Campaign");

router.get("/", (req, res) => {
  Campaign.find().then((campaignsFound) => {
    res.status(200).send(campaignsFound)
  });
})

router.post("/createCampaign", (req, res) => {
  const { name } = req.body;

  Campaign.create({
    name,
  }).then((campaignCreated) => {
    if (!campaignCreated) {
      res
        .status(500)
        .send({
          success: false,
          error: "Can't save campaign's information to the db!",
        });
    } else {
      return res.status(201).send(campaignCreated);
    }
  });
});


module.exports = router;