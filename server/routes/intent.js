const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { Intent } = require("../models/Intent");
const { IntentRecord } = require("../models/IntentRecord");
const config = require('../config/key')

// import intent to db
// router.post("/import", (req, res) => {
//   fs.readFile(path.join(process.cwd(), "server", "config", "intent_v2.json"), (err, data) => {
//     if (err) throw err;
//     let intentList = JSON.parse(data);
//     let count = 0;
//     console.log("Cleansing...")
//     IntentRecord.deleteMany({}).then(() => {
//       console.log("Done cleansing...")
//       console.log("Importing...")
//       intentList.forEach(intent => {
//         count++;
//         IntentRecord.create({
//           intent: intent.intent,
//           description: intent.question,
//         }, (err, createdIntent) => {
//           if (err) {
//             console.log("Duplicated: ", intent.intent)
//           }
//         })
//       })
//       console.log("Import done.")
//       res.status(200).send(`${count} imported`)
//     })
//   })
// })

// router.post("/import-with-campaign", (req, res) => {
//   const { campaignID } = req.body
//   fs.readFile(path.join(process.cwd(), "server", "config", "intent_v3.json"), (err, data) => {
//     if (err) throw err;
//     let intentList = JSON.parse(data);
//     let count = 0;
//     console.log("Cleansing...")
//     IntentRecord.deleteMany({}).then(() => {
//       console.log("Done cleansing...")
//       console.log("Importing...")
//       for (let intentTag in intentList) {
//         count++;
//         IntentRecord.create({
//           intent: intentTag,
//           description: intentList[intentTag],
//           campaign: campaignID,
//         }, (err, createdIntent) => {
//           if (err) {
//             console.log(`${count}. Duplicated: ${intentTag}`)
//           }
//         })
//       }
//       console.log("Import done.")
//       res.status(200).send(`${count} imported`)
//     })
//   })
// })

// router.put("/update-description-by-file", (req, res) => {
//   const { campaignID } = req.body;
//   fs.readFile(path.join(process.cwd(), "server", "config", "intent_v3.json"), (err, data) => {
//     if (err) throw err;
//     let newIntentList = JSON.parse(data);
//     let countCheck = 0;
//     let countUpdate = 0;
//     console.log("Updating...");
//     IntentRecord.find({campaign: campaignID}).then(async batchIntentFound => {
//       // console.log("Intent Tag: ")

//       await batchIntentFound.forEach(oldIntent => {
//         countCheck++;
//         if (oldIntent.intent in newIntentList) {
//           if (oldIntent.description !== newIntentList[oldIntent.intent]) countUpdate++;
//           oldIntent.description = newIntentList[oldIntent.intent];
//           oldIntent.save();
//         }
//       });

//       if (countCheck === batchIntentFound.length) {
//         console.log("Done updating!")
//         res.status(200).send({success: true, message: `${countCheck} intent checked, ${countUpdate} intent updated`});
//       }
//     })
//   })
// });

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

// update intent with null campaignID with some ID
// router.put("/fix-intent", (req, res) => {
//   const { campaignID } = req.body;

//   let count = 0;
//   console.log("Fixing...")
//   Intent.find({campaign: null})
//   .then(batchIntentFound => {
//     batchIntentFound.forEach(intent => {
//       count++;
//       intent.campaign = campaignID;
//       intent.save() 
//     })
//   })
//   console.log("Fixed done.")
//   res.status(200).send(`${count} records fixed!`)
// })

// create a random intent.
router.get("/random", async (req, res) => {
  await IntentRecord.find().sort({ count: 1 }).limit(40)
  .then(batchIntentFound => {
    const intentIndex = getRandomFromArray(batchIntentFound);
    const { intent, description } = batchIntentFound[intentIndex]
    res.status(200).send({
      intent,
      description,
    });
  })
})

// create an amount of random intents.
// router.get("/multi-random/:choiceCount/:campaignID", async (req, res) => {
//   const { choiceCount, campaignID } = req.params;
//   await IntentRecord.find({ campaign: campaignID }).sort({ count: 1 }).limit(parseInt(config.SAMPLE_POOL))
//   .then(batchIntentFound => {
//     const batchIntent = getMultipleRandom(batchIntentFound, parseInt(choiceCount));
//     // const { intent, description } = batchIntentFound[intentIndex]
//     res.status(200).send({success: true, batchIntent}); 
//   })
//   .catch(error => {
//     console.log(error)
//     res.status(500).send({success: false, batchIntent: []})
//   })
// })

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

router.get("/test", (req, res) => {
  fs.readFile(path.join(process.cwd(), "server", "config", "test.json"), (err, data) => {
    if (err) throw err;
    let intentList = JSON.parse(data);
    const intentIndex = getRandomFromArray(intentList);
    // const { intent, question } = intentList[intentIndex]
    intentList.forEach(intent => {
      if (!("count" in intent)) {
        intent.count = 0;
      }
    })
    intentList[intentIndex].count++;
    const result = intentList[intentIndex];
    intentList.sort((x, y) => {
      if (x.count < y.count) return -1;
      else if (x.count > y.count) return 1;
      else return 0;
    });
    let newJSON = JSON.stringify(intentList);
    fs.writeFile(path.join(process.cwd(), "server", "config", "test.json"), newJSON, 'utf8', () => {
      res.status(200).send(result);
    });
  });
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