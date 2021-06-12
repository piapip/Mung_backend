const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { IntentRecord } = require("../models/IntentRecord");

// import intent to db
router.post("/import", (req, res) => {
  fs.readFile(path.join(process.cwd(), "server", "config", "intent_v2.json"), (err, data) => {
    if (err) throw err;
    let intentList = JSON.parse(data);
    let count = 0;
    console.log("Importing...")
    intentList.forEach(intent => {
      count++;
      IntentRecord.create({
        intent: intent.intent,
        description: intent.question,
      }, (err, createdIntent) => {
        if (err) {
          console.log("Duplicated: ", intent.intent)
        }
      })
    })
    console.log("Import done.")
    res.status(200).send(`${count} imported`)
  })
})

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

module.exports = router;