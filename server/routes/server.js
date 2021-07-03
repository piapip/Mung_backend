const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const config = require("./../config/key");
// const { Chatroom } = require("../models/Chatroom");
const { Audio } = require("../models/Audio");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");
// const intentSamplePool = require("./../config/intent");

// count user
router.get("/user", (req, res) => {
  User.estimatedDocumentCount((err, count) => {
    if (err) res.status(500).send({ success: false, err });
    return res.status(200).send({
      success: true,
      count,
    });
  });
});

router.get("/export-audio", async (req, res) => {
  const { destination, name } = req.body;

  if (!fs.existsSync(path.join(__dirname, "../..", destination))) {
    fs.mkdirSync(path.join(__dirname, "../..", destination));
  }

  // await Audio.find().populate("user").populate("intent")
  await Audio.find().populate("intent")
    .then(async (audioFound) => {
      await exportObject(
        `${path.join(__dirname, "../..", destination, name + ".json")}`,
        audioFound,
        () => {
          let formData = new FormData();
          formData.append("destination", destination);
          formData.append("name", name);
          formData.append(
            "file",
            fs.createReadStream(
              path.join(__dirname, "../..", destination, name + ".json")
            )
          );

          axios({
            method: "POST",
            url: `${config.UPLOAD_API}/api/v1/uploads/file`,
            data: formData,
            headers: {
              "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
              Authorization: `Bearer ${config.UPLOAD_API_KEY}`,
            },
            maxContentLength: "Infinity",
            maxBodyLength: "Infinity",
          })
            .then((response) => {
              res.status(200).send(response.data);
            })
            .catch((error) => res.status(500).send(error));
        }
      );
    })
    .catch((err) => {
      res
        .status(500)
        .send("Internal problem... Can't get User's information. Err:");
      throw err;
    });
})

router.get("/export-user", async (req, res) => {
  const { destination, name } = req.body;

  if (!fs.existsSync(path.join(__dirname, "../..", destination))) {
    fs.mkdirSync(path.join(__dirname, "../..", destination));
  }

  await User.find()
    .then(async (userFound) => {
      await exportObject(
        `${path.join(__dirname, "../..", destination, name + ".json")}`,
        userFound,
        () => {
          let formData = new FormData();
          formData.append("destination", destination);
          formData.append("name", name);
          formData.append(
            "file",
            fs.createReadStream(
              path.join(__dirname, "../..", destination, name + ".json")
            )
          );

          axios({
            method: "POST",
            url: `${config.UPLOAD_API}/api/v1/uploads/file`,
            data: formData,
            headers: {
              "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
              Authorization: `Bearer ${config.UPLOAD_API_KEY}`,
            },
            maxContentLength: "Infinity",
            maxBodyLength: "Infinity",
          })
            .then((response) => {
              res.status(200).send(response.data);
            })
            .catch((error) => res.status(500).send(error));
        }
      );
    })
    .catch((err) => {
      res
        .status(500)
        .send("Internal problem... Can't get User's information. Err:");
      throw err;
    });
});

router.get("/test", (req, res) => {
  res.status(200).send("ok");
});

const exportObject = (destination, object, callback) => {
  console.log("Destination: ", destination);
  fs.writeFile(destination, JSON.stringify(object), (err) => {
    // return doesn't work...
    if (err) {
      console.log(err);
    }
    if (callback) {
      callback();
    }
  });
};

// const flattenIntent = (currentIntent) => {
//   const {
//     intent,
//     loan_purpose,
//     loan_type,
//     card_type,
//     card_usage,
//     digital_bank,
//     card_activation_type,
//     district,
//     city,
//     name,
//     cmnd,
//     four_last_digits,
//     generic_intent,
//   } = currentIntent;
//   return `${intent}_${loan_purpose}_${loan_type}_${card_type}_${card_usage}_${digital_bank}_${card_activation_type}_${district}_${city}_${name}_${cmnd}_${four_last_digits}_${generic_intent}`;
// };

// const getLabel = (slot) => {
//   const slotIndex = intentSamplePool.SLOT_LABEL.findIndex((item) => {
//     return item.tag.toUpperCase() === slot.toUpperCase();
//   });

//   return slotIndex === -1 ? '' : intentSamplePool.SLOT_LABEL[slotIndex].name;
// };

module.exports = router;
