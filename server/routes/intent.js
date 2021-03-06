const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const { IntentRecord } = require("../models/IntentRecord");
const config = require("../config/key");

router.post("/", (req, res) => {
  const { campaignID, intent, description } = req.body;

  IntentRecord.create({
    intent,
    description,
    campaign: campaignID,
  })
    .then((intentCreated) => {
      res.status(200).send({ success: true, intentCreated });
    })
    .catch((error) => {
      res.status(500).send({ success: false, error });
    });
});

router.post("/import-with-file-and-campaign", (req, res) => {
  const { campaignID } = req.body;
  fs.readFile(
    path.join(process.cwd(), "server", "config", "intent_v3.json"),
    (err, data) => {
      if (err) throw err;
      let intentList = JSON.parse(data);
      let count = 0;
      console.log("Cleansing...");
      IntentRecord.deleteMany({}).then(() => {
        console.log("Done cleansing...");
        console.log("Importing...");
        for (let intentTag in intentList) {
          count++;
          IntentRecord.create(
            {
              intent: intentTag,
              description: intentList[intentTag],
              campaign: campaignID,
            },
            (err, createdIntent) => {
              if (err) {
                console.log(`${count}. Duplicated: ${intentTag}`);
              }
            }
          );
        }
        console.log("Import done.");
        res.status(200).send(`${count} imported`);
      });
    }
  );
});

const tmp = require("tmp");
const request = require("request");
let download = function (uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    if (err) throw "Something's wrong while uploading audio uri...";
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
};
router.post("/import-by-link", (req, res) => {
  const { link, campaignID } = req.body;
  tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
    if (err) throw err;

    download(link, path, () => {
      const rawdata = fs.readFileSync(path);
      const intentList = JSON.parse(rawdata);
      let count = 0;
      intentList.forEach((intentInfo) => {
        const { intent, description } = intentInfo;
        IntentRecord.create({
          intent: intent,
          description: description,
          campaign: campaignID,
        })
          .then(() => {
            count++;
            if (count === intentList.length)
              return res
                .status(200)
                .send({ success: true, message: `${count} intents created.` });
          })
          .catch((error) => {
            return res.status(500).send({ success: false, error });
          });
      });
    });
    cleanupCallback();
  });
});

router.delete("/delete-by-campaign/:campaignID", (req, res) => {
  const { campaignID } = req.params;
  IntentRecord.deleteMany({ campaign: campaignID })
    .then((deleteInfo) => {
      const { deletedCount } = deleteInfo;
      res.status(200).send({ success: true, message: `${deletedCount} intent records deleted successfully!` });
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send({ success: false, error });
    });
});

router.put("/update-description-by-intent", (req, res) => {
  const { intent, description, campaignID } = req.body;

  IntentRecord.find({ intent: intent, campaign: campaignID })
    .then((intentFound) => {
      if (intentFound.length === 0) {
        res.status(400).send({
          success: false,
          message: "No intent found in this campaign.",
        });
      } else {
        intentFound[0].description = description;
        intentFound[0]
          .save()
          .then((intentSaved) => {
            res.status(200).send({
              success: true,
              message: "Save intent successfully",
              newIntent: intentSaved,
            });
          })
          .catch((error) => {
            res
              .status(500)
              .send({ success: false, message: "Can't save intent.", error });
          });
      }
    })
    .catch((error) => {
      res.status(400).send(error);
    });
});

// create an amount of random intents.
router.get("/multi-random", async (req, res) => {
  const { choiceCount, campaign_id } = req.query;
  const campaignID = campaign_id;
  await IntentRecord.find({ campaign: campaignID })
    .sort({ count: 1 })
    .limit(parseInt(config.SAMPLE_POOL))
    .then((batchIntentFound) => {
      const batchIntent = getMultipleRandom(
        batchIntentFound,
        parseInt(choiceCount)
      );
      // const { intent, description } = batchIntentFound[intentIndex]
      res.status(200).send({ success: true, batchIntent });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send({ success: false, batchIntent: [], error });
    });
});

router.get("/:campaignID", (req, res) => {
  const { campaignID } = req.params;
  IntentRecord.find({ campaign: campaignID })
    .then((intentFound) => {
      res.status(200).send({
        success: true,
        message: `${intentFound.length} intents found`,
        intentFound,
      });
    })
    .catch((error) => {
      res.status(500).send({ success: false, error });
    });
});

// create a random intent.
router.get("/random/:campaignID", async (req, res) => {
  const { campaignID } = req.params;
  await IntentRecord.find({ campaign: campaignID })
    .sort({ count: 1 })
    .limit(40)
    .then((batchIntentFound) => {
      if (batchIntentFound.length === 0) {
        res
          .status(404)
          .send({ success: false, message: "No intent record found!" });
      } else {
        const intentIndex = getRandomFromArray(batchIntentFound);
        const { intent, description } = batchIntentFound[intentIndex];
        res.status(200).send({
          intent,
          description,
        });
      }
    });
});

const getRandomFromArray = (arr) => {
  return Math.floor(Math.random() * arr.length);
};

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
};

module.exports = router;
