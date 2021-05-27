const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// create a random intent.
router.get("/random", (req, res) => {

  fs.readFile(path.join(process.cwd(), "server", "config", "intent.json"), (err, data) => {
    if (err) throw err;
    let intentList = JSON.parse(data);
    const intentIndex = getRandomFromArray(intentList);
    res.status(200).send(intentList[intentIndex]);
  });
})


const getRandomFromArray = (arr) => {
  return Math.floor(Math.random() * arr.length);
}

module.exports = router;