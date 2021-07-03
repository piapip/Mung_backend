const express = require("express");
const router = express.Router();

const { Campaign } = require("../models/Campaign");

router.get("/", (req, res) => {
  Campaign.find().then((campaignsFound) => {
    res.status(200).send(campaignsFound);
  });
});

// campaignID of the manager service, not from this VA service.
router.get("/:campaignID", (req, res) => {
  const { campaignID } = req.params;
  Campaign.find({ campaignID })
    .then((campaignFound) => {
      if (campaignFound.length === 0) {
        res.status(404).send({ success: false, message: "No campaign found!" });
      } else {
        res
          .status(200)
          .send({ success: true, campaignDetail: campaignFound[0] });
      }
    })
    .catch((error) => {
      res.status(500).send({ success: false, error });
    });
});

router.post("/createCampaign", (req, res) => {
  const { name, campaignID, quota } = req.body;

  Campaign.create({
    name,
    campaignID,
    quota,
  })
    .then((campaignCreated) => {
      if (!campaignCreated) {
        res.status(500).send({
          success: false,
          error: "Can't save campaign's information to the db!",
        });
      } else {
        return res.status(201).send({ success: true, campaignCreated });
      }
    })
    .catch((error) => {
      res.status(500).send({ success: false, error });
    });
});

router.put("/:campaignID", (req, res) => {
  const { campaignID } = req.params;
  const { quota, requireTranscript } = req.body;

  Campaign.findById(campaignID).then((campaignFound) => {
    if (!campaignFound) {
      res.status(404).send({ success: false, message: "No campaign found!" });
    } else {
      if (quota) {
        campaignFound.quota = quota;
      }
      if (requireTranscript) campaignFound.requireTranscript = requireTranscript;
      campaignFound
        .save()
        .then((newCampaign) => {
          res.status(200).send({ success: true, newCampaign });
        })
        .catch((error) => {
          res.status(500).send({ success: false, error });
        });
    }
  });
});

module.exports = router;
