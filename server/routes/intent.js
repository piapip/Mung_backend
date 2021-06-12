const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// create a random intent.
router.get("/random", (req, res) => {

  fs.readFile(path.join(process.cwd(), "server", "config", "intent_v2.json"), (err, data) => {
    if (err) throw err;
    let intentList = JSON.parse(data);
    const intentIndex = getRandomFromArray(intentList.slice(0, 40));
    const { intent, question } = intentList[intentIndex]
    res.status(200).send({
      intent,
      description: question,
    });
  });
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