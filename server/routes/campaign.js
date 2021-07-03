const express = require("express");
const router = express.Router();

const { Campaign } = require("../models/Campaign");
const { Intent } = require("../models/Intent");
const { IntentRecord } = require("../models/IntentRecord");

router.get("/", (req, res) => {
  Campaign.find().then((campaignsFound) => {
    res.status(200).send(campaignsFound)
  });
})

router.get("/statistic", (req, res) => {
  Campaign.find().then(async campaignsFound => {
    let result = {}
    let count = 0;
    await campaignsFound.forEach(async campaign => {
      const audioCount = await Intent.countDocuments({campaign: campaign._id}).then((recordCount) => {
        count++;
        return recordCount;
      });
      const intentRecordCount = await IntentRecord.countDocuments({campaign: campaign._id}).then((recordCount) => {
        count++;
        return recordCount;
      });
      result[campaign.name] = {
        audioCount,
        intentRecordCount,
      };
      if (count === campaignsFound.length * 2) {
        res.status(200).send(result)
      }
    })
  });
})

router.post("/createCampaign", (req, res) => {
  const { name, campaignID, quota } = req.body;

  Campaign.create({
    name,
    campaignID,
    quota,
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