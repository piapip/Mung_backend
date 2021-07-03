const express = require('express');
const router = express.Router();
const { Audio } = require("../models/Audio");
const { User } = require("../models/User");
const { IntentRecord } = require("../models/IntentRecord");
const axios = require('axios');
const config = require('./../config/key');

const tmp = require("tmp");
const fs = require("fs");
const request = require('request');
const { getAudioDurationInSeconds } = require('get-audio-duration');

const mongoose = require("mongoose");
function uuidv4() {
  return mongoose.Types.ObjectId();
}

// ADD AUDIO TO DB'S RECORD
router.post("/", (req, res) => {

  const { userID, link } = req.body;

  Audio.create({
    user: userID,
    link: link,
    intent: null,
    revertable: false,
    transcript: " ",
    fixBy: null,
  }).then(audioCreated => {
    if (!audioCreated) {
      res.status(500).send({ success: false, error: "Can't save audio information to the db!"});
    } else {
      return res.status(201).send({
        audioID: audioCreated._id
      });
    }
  });
})

router.put("/transcript", (req, res) => {
  const { audioLink, audioID } = req.body;
  
  axios.get(`${config.TRANSCRIPT_API}/api/v1/stt?url=${audioLink}`, {
    headers: {
      Authorization: `Bearer ${config.TRANSCRIPT_API_KEY}`,
    },
  })
  .then(response => {
    const { result, status } = response.data;

    if (status === 1) {
      const { transcription } = result;
      console.log(result)
      console.log("audioID: ", audioID)
      Audio.findById(audioID)
      .then(audioFound => {
        if(!audioFound) {
          console.log("Can't find audio for transcript!");
          res.status(400).send("Can't update transcript");
          return
        } else {
          audioFound.googleTranscript = transcription;
          audioFound.save();
          res.status(200).send({ transcription });
          return
        }
      })
      .catch(err => {
        console.log(`Error while updating audio ${audioID} transcript... ${err}`)
        res.status(500).send("Can't update transcript");
        throw err
      })
    } else {
      console.log("Can't get transcript. Here's the error code: ", status);
      res.status(500).send("Can't get transcript");
    }
  })
})

router.put("/updateDuration", (req, res) => {
  Audio.find()
  .then(async batchAudioFound => {
    for await (let audioFound of batchAudioFound) {
      // let audioFound = batchAudioFound[i];
      // if (audio)
      if (audioFound.duration < 0) {
        await tmp.file(async function _tempFileCreated (err, path, fd, cleanupCallback) {
          if (err) {
            res.status(500).send({ success: false, message: "Can't create tmp file" });
            throw err;
          }
          await download(audioFound.link, path , async function(){
            await getAudioDurationInSeconds(path).then((duration) => {
              console.log(duration)
              audioFound.duration = duration
              audioFound.save()
              .catch(error => {
                res.status(200).send({ success: false, message: "Can't save audio after get duration" });
                throw error
              });
            })
          })
          cleanupCallback();
        })
      }
    }
    res.status(200).send({ success: true, message: "Update audio duration successfully" });
  })
})

router.put("/:audioID", (req, res) => {

  const audioID = req.params.audioID;
  const { transcript, userID } = req.body;
  Audio.findById(audioID)
  .then(audioFound => {
    
    if(!audioFound) {
      console.log("Can't find audio for transcript!");
      res.status(404).send({ success: false, message: "Audio not found" });
      throw "Can't find audio"
    } else {
      audioFound.transcript = transcript;
      audioFound.fixBy = userID;
      return audioFound.save();
    }
  })
  .then(audioUpdated => res.status(200).send({ success: true, audioUpdated }))
  .catch(err => {
    console.log(`Error while updating audio ${audioID} transcript... ${err}`)
    res.status(500).send({success: false, message: "Something's wrong internally, so sorry..."})
  })
})

let download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    if (err) throw "Something's wrong while uploading audio uri..."
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

router.put("/:audioID/:userID", (req, res) => {

  const audioID = req.params.audioID;
  const userID = req.params.userID;
  const { transcript } = req.body;
  Audio.findById(audioID)
  .then(audioFound => {
    
    if(!audioFound) {
      console.log("Can't find audio to update transcript!");
      res.status(404).send({ success: false, message: "Audio not found" });
      throw "Can't find audio"
    } else {
      audioFound.transcript = transcript;
      audioFound.fixBy = userID;
      return audioFound.save();
    }
  })
  .then(audioUpdated => res.status(200).send({ success: true, audioUpdated }))
  .catch(err => {
    console.log(`Error while updating audio ${audioID} transcript... ${err}`)
    res.status(500).send({success: false, message: "Something's wrong internally, so sorry..."})
  })
})

const updateJSONCount = (target, callback400, callback500, callback200) => {
  IntentRecord.find({intent: target})
  .then(intentFound => {
    if (intentFound.length === 0) {
      callback400();
    }
    else {
      intentFound[0].count++;
      intentFound[0].save();
      callback200();
    }
  })
  .catch(error => {
    if (error) {
      callback500();
    }
  })
}

// Upload an audio for solo feature
router.post("/solo", async (req, res) => {
  const { userID, link, duration, campaignID } = req.body;

  const { intent, description } = req.body.intent;
  const targetIntent = await IntentRecord.find({ intent, description, campaign: campaignID });
  if (targetIntent.length === 0) 
    return res.status(500).send({success: false, message: "Can't find the intent for this audio..."})
  Audio.create({ 
    user: userID,
    link,
    intent: targetIntent[0]._id,
    duration,
    campaign: campaignID,
  }).then(audioCreated => {
    if (!audioCreated) {
      res.status(500).send({ success: false, error: "Can't save audio information to the db!"});
    } else {
      targetIntent[0].count++;
      targetIntent[0].save().then(() => {
        User.findById(userID)
        .then(userFound => {
          if (!userFound) 
            res.status(404).send({ success: false, error: "Can't find user!!!" })
          else {
            userFound.soloCount++;
            return userFound.save();
          }
        })

        return res.status(200).send({
          success: true,
          audioID: audioCreated._id,
        });
      });
    }
  }).catch(error => {
    console.log(error)
    res.status(500).send({
      success: false,
      error,
    });
  });
})

router.post("/saveTestIntent", async (req, res) => {
  const { campaign_id, device_id, transcript, post_process_text, input_type, predicted_intent , confidence, asr_provider } = req.body;
  let { asr_audio_link } = req.body;

  let targetIntent = await IntentRecord.find({ intent: predicted_intent, campaign: campaign_id })
  .then(batchIntentFound => {
    if (batchIntentFound.length === 0) {
      return IntentRecord.create({
        intent: predicted_intent, 
        campaign: campaign_id,
      })
    } else {
      return batchIntentFound[0]
    }
  });
  const targetUser = await User.find({ device: device_id })
  .then(batchUserFound => {
    if (batchUserFound.length === 0) {
      return User.create({ email: device_id, device: device_id })
    } else {
      return batchUserFound[0]
    }
  })

  if (!asr_audio_link || asr_audio_link.length === 0) {
    asr_audio_link = "No audio " + targetUser.soloCount + " " + uuidv4()
  }

  Audio.create({
    user: targetUser._id,
    link: asr_audio_link,
    intent: targetIntent._id,
    confidence,
    googleTranscript: transcript,
    transcript: post_process_text,
    input_type,
    asr_provider,
  }).then(audioCreated => {
    if (!audioCreated) {
      res.status(500).send({ success: false, error: "Can't save audio information to the db!"});
    } else {
      User.findById(targetUser._id)
      .then(userFound => {
        userFound.soloCount++;
        return userFound.save();
      })
      targetIntent.count++;
      targetIntent.save().then(() => {
        return res.status(200).send({
          audioCreated
        });
      })
      .catch(error => {
        if (error) {
          console.log(error)
          res.status(500).send("Internal problem :<");
        }
      });
    }
  }).catch(error => {
    if (error) {
      console.log(error)
      res.status(400).send({message: "Can't create record for audio. Probably duplicate audio's upload link", error});
    }
  })
})

router.post("/trash", async (req, res) => {
  const { userID } = req.body;

  User.findById(userID)
  .then(userFound => {
    if (!userFound) res.status(404).send({ status: 0 });
    else {
      userFound.trashCount++;
      userFound.save();
      res.status(200).send({ status: 1 });
    }
  })
})

// fix this api so it works with IntentRecord instead of Intent
router.post("/accept", (req, res) => {
  const { audioID, transcript, userID } = req.body;
  // console.log("Accepting... ", audioID)
  Audio.findById(audioID)
  .populate("intent")
  .then((audioFound) => {
    if (!audioFound) {
      res.status(404).send({ status: 0 })
      return console.log("Can't find audio");
    }
    else {
      User.findById(userID)
      .then(userFound => {
        if (!userFound) res.status(404).send({ status: 0 })
        else {
          if (audioFound.rejectBy.length !== 0 && !audioFound.revertable) {
            audioFound.intent.count++;
            audioFound.intent.save();
          }
          audioFound.revertable = true;
          if (audioFound.transcript !== transcript) {
            audioFound.transcript = transcript;
            audioFound.fixBy = userID;
          }
          audioFound.save();
          userFound.verifyCount++;
          userFound.save();
          return res.status(200).send({ status: 1 });
        }
      })
    }
  })
})

// fix this api so it works with IntentRecord instead of Intent
router.post("/reject", (req, res) => {
  const { audioID, transcript, userID } = req.body;
  // console.log("Rejecting... ", audioID)
  Audio.findById(audioID)
  .populate("intent")
  .then((audioFound) => {
    if (!audioFound) {
      res.status(404).send({ status: 0 })
      return console.log("Can't find audio");
    }
    else {
      User.findById(userID)
      .then(userFound => {
        if (!userFound) res.status(404).send({ status: 0 })
        else {
          if (audioFound.rejectBy.length === 0 || (audioFound.rejectBy.length !== 0 && audioFound.revertable)) {
            audioFound.intent.count--;
            audioFound.intent.save();
          }
          if (!audioFound.rejectBy.includes(userID)) {
            audioFound.rejectBy.push(userID);
            userFound.verifyCount++;
            userFound.save();
          }
          if (audioFound.transcript !== transcript) {
            audioFound.transcript = transcript;
            audioFound.fixBy = userID;
          }
          audioFound.revertable = false;
          audioFound.save();
          return res.status(200).send({ status: 1 });
        }
      })
    }
  })
})

router.get("/:audioID", (req, res) => {
  const { audioID } = req.params;
  Audio.findById(audioID).populate("intent")
  .then(audioFound => {
    if (!audioFound) res.status(400).send({success: false, message: "No audio found"})
    else res.status(200).send({success: true, audioFound})
  })
})

router.get("/findByEmail/:usermail", (req, res) => {
  const { usermail } = req.params;
  console.log("Targetting: ", usermail)
  User.find({email: usermail})
  .then(userFound => {
    if (userFound.length === 0) {
      res.status(404).send("Can't find user!!!")
      throw "Can't find user!!!"
    }
    else {
      Audio.find({user: userFound[0]._id}).populate("intent")
      .then(audioFound => {
        return res.status(200).send({ audioFound })
      })
    }
  })
})

// TODO: Add campaign to this thing
// Get audio for testing - Solo feature
router.get("/sample/:userID/:campaignID", async (req, res) => {
  const { userID, campaignID } = req.params;
  Audio.countDocuments({ 
    $and: [
      {campaign: campaignID},
      {user: { $ne: userID }},
      {revertable: false},
      {rejectBy: {
        $size: 0,
      }}
    ],
  }).exec(async (err, count) =>{
    if (err) {
      res.status(500).send({ success: false, message: "Can't estimate audio document count", err })
      throw err
    }
    const random = Math.floor(Math.random() * count);
    Audio.findOne({
      $and: [
        {campaign: campaignID},
        {user: { $ne: userID }},
        {revertable: false},
        {rejectBy: {
          $size: 0,
        }}
      ],
    }).skip(random).populate('intent')
    .exec((err, audioFound) => {
      if (err) res.status(500).send({ success: false, message: "Can't proceed to find any audio", err })
      else if (!audioFound) {
        return res.status(404).send({ status: -1, error: "Hiện tại mình không có audio nào để bạn kiểm tra :<" });
      } else {
        const { intent, link, transcript, googleTranscript } = audioFound;
        const confirmedTranscript = transcript !== " " ? transcript : googleTranscript;
        return res.status(200).send({ status: 1, audioID: audioFound._id, intent, link, transcript: confirmedTranscript });
      }
    })
  });
})

module.exports = router;