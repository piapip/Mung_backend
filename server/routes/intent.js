const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { IntentRecord } = require("../models/IntentRecord");
const config = require('../config/key')

router.post("/import-with-file-and-campaign", (req, res) => {
  const { campaignID } = req.body
  fs.readFile(path.join(process.cwd(), "server", "config", "intent_v3.json"), (err, data) => {
    if (err) throw err;
    let intentList = JSON.parse(data);
    let count = 0;
    console.log("Cleansing...")
    IntentRecord.deleteMany({}).then(() => {
      console.log("Done cleansing...")
      console.log("Importing...")
      for (let intentTag in intentList) {
        count++;
        IntentRecord.create({
          intent: intentTag,
          description: intentList[intentTag],
          campaign: campaignID,
        }, (err, createdIntent) => {
          if (err) {
            console.log(`${count}. Duplicated: ${intentTag}`)
          }
        })
      }
      console.log("Import done.")
      res.status(200).send(`${count} imported`)
    })
  })
})

router.post("/", (req, res) => {
  const { campaignID, intent, description } = req.body;

  IntentRecord.create({
    intent, 
    description,
    campaign: campaignID,
  }).then(intentCreated => {
    res.status(200).send({ success: true, intentCreated })
  }).catch(error => {
    res.status(500).send({ success: true, intentCreated })
  })
})

router.put("/update-description-by-intent", (req, res) => {
  const { intent, description, campaignID } = req.body;

  IntentRecord.find({intent: intent, campaign: campaignID}).then(intentFound => {
    if (intentFound.length === 0) {
      res.status(400).send({success: false, message: "No intent found in this campaign."})
    } else {
      intentFound[0].description = description;
      intentFound[0].save().then(intentSaved => {
        res.status(200).send({success: true, message: "Save intent successfully", newIntent: intentSaved})
      }).catch(error => {
        res.status(500).send({success: false, message: "Can't save intent."})
      })
    }
  }).catch(error => {
    res.status(400).send(error)
  })
});

// create a random intent.
router.get("/random/:campaignID", async (req, res) => {
  const { campaignID } = req.params;
  await IntentRecord.find({ campaign: campaignID }).sort({ count: 1 }).limit(40)
  .then(batchIntentFound => {
    if (batchIntentFound.length === 0) {
      res.status(404).send({success: false, message: "No intent record found!"})
    } else {
      const intentIndex = getRandomFromArray(batchIntentFound);
      const { intent, description } = batchIntentFound[intentIndex]
      res.status(200).send({
        intent,
        description,
      });
    }
  })
})

// create an amount of random intents.
router.get("/multi-random", async (req, res) => {
  const { choiceCount, campaign_id } = req.query;
  const campaignID = campaign_id;
  await IntentRecord.find({ campaign: campaignID }).sort({ count: 1 }).limit(parseInt(config.SAMPLE_POOL))
  .then(batchIntentFound => {
    const batchIntent = getMultipleRandom(batchIntentFound, parseInt(choiceCount));
    // const { intent, description } = batchIntentFound[intentIndex]
    res.status(200).send({success: true, batchIntent}); 
  })
  .catch(error => {
    console.log(error)
    res.status(500).send({success: false, batchIntent: []})
  })
})

router.get("/:campaignID", (req, res) => {
  const { campaignID } = req.params;
  IntentRecord.find({campaign: campaignID})
  .then(intentFound => {
    res.status(200).send({ 
      success: true, 
      message: `${intentFound.length} intents found`, 
      intentFound, 
    })
  })
  .catch(error => {
    res.status(500).send({ success: false, error })
  })
})

const getRandomFromArray = (arr) => {
  return Math.floor(Math.random() * arr.length);
}

// partial fisher-yates shuffle
const getMultipleRandom = (arr, n) => {
  let result = new Array(n);
  let len = arr.length;
  let taken = new Array(len);
  
  if (n > len)
    throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
    let x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

module.exports = router;