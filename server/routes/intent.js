const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// create a random intent.
router.get("/random", (req, res) => {

  fs.readFile(path.join(process.cwd(), "server", "config", "intent_v2.json"), (err, data) => {
    if (err) throw err;
    let intentList = JSON.parse(data);
    const intentIndex = getRandomFromArray(intentList);
    const { intent, question } = intentList[intentIndex]
    res.status(200).send({
      intent,
      description: question,
    });
  });
})


const getRandomFromArray = (arr) => {
  return Math.floor(Math.random() * arr.length);
}

module.exports = router;