const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const { Chatroom } = require("../models/Chatroom");
// const { Audio } = require("../models/Audio");
const axios = require("axios");
const fs = require("fs");
const intentSamplePool = require("./../config/intent");

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

// Count room done.
// Count room undone.
// Count approved audios with intent.
// Count intents distribution.
router.get("/statistic", async (req, res) => {
  let roomDoneCount = 0;
  let roomNotDoneCount = 0;
  let usableAudioCount = 0;
  let usableDuration = 0;
  let intentCount = {};
  for (let i = 0; i < intentSamplePool.INTENT.length; i++)
    intentCount[intentSamplePool.INTENT[i].name] = 0;
  for (let i = 0; i < intentSamplePool.GENERIC_INTENT.length; i++)
    intentCount[intentSamplePool.GENERIC_INTENT[i]] = 0;
  const roomList = await Chatroom.find({})
    .populate({
      path: "audioList",
      populate: {
        path: "intent",
      },
    })
    .populate({
      path: "audioList",
      populate: {
        path: "user",
      },
    });
  let userRecord = {};
  let durationRecord = {};
  let weirdStuff = [];

  for (let roomIndex = 0; roomIndex < roomList.length; roomIndex++) {
    const { audioList, done } = roomList[roomIndex];
    if (done) roomDoneCount++;
    else roomNotDoneCount++;
    for (let audioIndex = 0; audioIndex < audioList.length; audioIndex++) {
      const { name } = audioList[audioIndex].user;
      const { duration } = audioList[audioIndex];
      if (!userRecord.hasOwnProperty(name)) userRecord[name] = 1;
      else userRecord[name]++;
      if (!durationRecord.hasOwnProperty(name)) durationRecord[name] = duration;
      else durationRecord[name] = durationRecord[name] + duration;
      if (
        audioList[audioIndex].intent !== null &&
        audioList[audioIndex].intent !== undefined
      ) {
        const { intent, generic_intent } = audioList[audioIndex].intent;
        let count = 0;
        if (intent !== null && intent !== undefined) {
          count++;
          intentCount[intentSamplePool.INTENT[intent].name]++;
        }
        if (generic_intent !== null && generic_intent !== undefined) {
          count++;
          intentCount[intentSamplePool.GENERIC_INTENT[generic_intent]]++;
        }
        if (count !== 0) {
          usableAudioCount++;
          usableDuration = usableDuration + duration;
        }
      } else {
        weirdStuff.push(audioList[audioIndex]);
        // console.log("Weird stuff: ", audioList[audioIndex].intent);
      }
    }
  }
  res.status(200).send({
    success: true,
    roomDoneCount,
    roomNotDoneCount,
    usableAudioCount,
    usableDuration,
    intentCount,
    userRecord,
    durationRecord,
    weirdStuff,
  });
  // res.status(200).send("ok")
});

// count all accepted audio
router.get("/audio", (req, res) => {
  // Audio.estimatedDocumentCount((err, count) => {
  //   if (err) res.status(500).send({ success: false, err })
  //   return res.status(200).send({
  //     success: true,
  //     count
  //   })
  // })
  Chatroom.find({}, (err, allRoom) => {
    if (err) res.status(500).send({ success: false, err });
    let count = 0;
    allRoom.map((room) => {
      console.log(`Room ${room.name}: ${room.audioList.length}`);
      return (count = count + room.audioList.length);
    });
    return res.status(200).send({
      success: true,
      count,
    });
  });
});

router.get("/flatten", (req, res) => {
  Chatroom.findOne()
    .skip(1)
    .populate("currentIntent")
    .exec((err, roomFound) => {
      if (err) res.status(500).send({ success: false, err });
      const result = flattenIntent(roomFound.currentIntent);
      return res.status(200).send({
        success: true,
        result,
      });
    });
});

router.get("/export-user", async (req, res) => {
  const { destination, name } = req.body;

  await User.find()
    .then(async (userFound) => {
      await exportObject(
        `${path.join(process.cwd(), '..', destination, name + ".json")}`,
        userFound,
        () => {
          let formData = new FormData();
          formData.append("destination", destination);
          formData.append("name", name);
          formData.append(
            "file",
            fs.createReadStream(
              path.join(process.cwd(), '..', destination, name + ".json")
            )
          );

          axios({
            method: "POST",
            url: `https://asr.vbeecore.com/api/v1/uploads/file`,
            data: formData,
            headers: {
              "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
              Authorization: `Bearer zyvZQGPrr6qdbHLTuzqpCmuBgW3TjTxGKEEIFCiy1lCAOzTBtrqPYdPdZ1AtMxU2`,
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

const FormData = require("form-data");
const path = require("path");

// count main intent for rooms
router.get("/export-conversation", async (req, res) => {
  const { destination, name } = req.body;

  const rooms = await Chatroom.find()
    .populate({
      path: "audioList",
      populate: {
        path: "intent",
      },
    })
    .exec();
  let result = [];
  rooms.forEach((room) => {
    let conversation = {};
    conversation.id = room.name;
    conversation.turns = [];
    const { audioList } = room;

    if (audioList.length > 0) {
      audioList.forEach((audio, audioIndex) => {
        const frames = {};
        const { prevIntent, user, intent, transcript, link } = audio;

        frames.path = link;
        frames.prevIntent = prevIntent;
        frames.speaker = user;
        frames.turn_id = audioIndex;
        frames.transcript = transcript;
        frames.active_intent =
          intent["intent"] !== null
            ? intentSamplePool["INTENT"][intent["intent"]].name
            : intent["generic_intent"] !== null
            ? intentSamplePool["GENERIC_INTENT"][intent["generic_intent"]]
            : "";
        frames.slot_values = {};

        const properties = [
          "loan_purpose",
          "loan_type",
          "card_type",
          "card_usage",
          "digital_bank",
          "card_activation_type",
          "district",
          "city",
          "name",
          "cmnd",
          "four_last_digits",
        ];
        for (let key in properties) {
          if (intent[properties[key]] !== null) {
            const slot = properties[key];

            switch (slot) {
              case "city":
              case "district":
                frames.slot_values[slot] = intent[slot];
                break;
              default:
                if (
                  intentSamplePool[slot.toUpperCase()] === undefined ||
                  intent[slot] === -1
                ) {
                  frames.slot_values[slot] = intent[slot];
                } else {
                  if (
                    intentSamplePool[slot.toUpperCase()][intent[slot]] !==
                    undefined
                  ) {
                    // normally
                    frames.slot_values[slot] =
                      intentSamplePool[slot.toUpperCase()][intent[slot]].name;
                  } else {
                    // probably forgot that the intent file has been changed, need to recover the old version for this to be recorded correctly.
                    res
                      .status(500)
                      .send(
                        "You probably forgot that the intent file in the config folder has been changed, need to recover the old version for this to be recorded correctly."
                      );
                  }
                }
            }
          }
        }

        conversation.turns.push(frames);
      });
    }
    result.push(conversation);
  });

  exportObject(
    `${path.join(process.cwd(), '..', destination, name + ".json")}`,
    result,
    () => {
      let formData = new FormData();
      formData.append("destination", destination);
      formData.append("name", name);
      formData.append(
        "file",
        fs.createReadStream(
          path.join(process.cwd(), '..', destination, name + ".json")
        )
      );

      axios({
        method: "POST",
        url: `https://asr.vbeecore.com/api/v1/uploads/file`,
        data: formData,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
          Authorization: `Bearer zyvZQGPrr6qdbHLTuzqpCmuBgW3TjTxGKEEIFCiy1lCAOzTBtrqPYdPdZ1AtMxU2`,
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

const flattenIntent = (currentIntent) => {
  const {
    intent,
    loan_purpose,
    loan_type,
    card_type,
    card_usage,
    digital_bank,
    card_activation_type,
    district,
    city,
    name,
    cmnd,
    four_last_digits,
    generic_intent,
  } = currentIntent;
  return `${intent}_${loan_purpose}_${loan_type}_${card_type}_${card_usage}_${digital_bank}_${card_activation_type}_${district}_${city}_${name}_${cmnd}_${four_last_digits}_${generic_intent}`;
};

// const getLabel = (slot) => {
//   const slotIndex = intentSamplePool.SLOT_LABEL.findIndex((item) => {
//     return item.tag.toUpperCase() === slot.toUpperCase();
//   });

//   return slotIndex === -1 ? '' : intentSamplePool.SLOT_LABEL[slotIndex].name;
// };

module.exports = router;
