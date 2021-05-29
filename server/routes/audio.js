const express = require('express');
const router = express.Router();
const { Audio } = require("../models/Audio");
const { User } = require("../models/User");
const { Intent } = require("../models/Intent");
const axios = require('axios');
const config = require('./../config/key');
// const intentSamplePool = require("./../config/intent");

const tmp = require("tmp");
const fs = require("fs");
const request = require('request');
const { getAudioDurationInSeconds } = require('get-audio-duration');
// const { exec } = require('child_process');
// const auth = require("../middleware/auth");

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
  
  // getTranscript(audioLink, audioID);
  // getTranscriptWithGGAPI(audioLink, audioID);
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

// fix all servant's audio's revertable
router.put("/cleanse", async (req, res) => {
  Audio.find({ revertable: false }).populate('intent')
  .then(audioFound => {
    let count = 0;
    for (let i = 0; i < audioFound.length; i++) {
      const { intent } = audioFound[i];
      if (!testIntent(intent)) {
        count++;
        audioFound[i].revertable = true;
        audioFound[i].save();
      }
    }
    if (count === 0) res.status(200).send("All clean!");
    else res.status(200).send(`${count} audio fixed!`);
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

// Upload an audio for solo feature
router.post("/solo", async (req, res) => {
  const { userID, link, duration } = req.body;

  const { intent, description } = req.body.intent;
  const newIntent = await Intent.create({ intent, description });
  Audio.create({ 
    user: userID,
    link,
    intent: newIntent._id,
    duration,
  }).then(audioCreated => {
    if (!audioCreated) {
      res.status(500).send({ success: false, error: "Can't save audio information to the db!"});
    } else {
      User.findById(userID)
      .then(userFound => {
        if (!userFound) res.status(404).send("Can't find user!!!")
        else {
          userFound.soloCount++;
          return userFound.save();
        }
      })
        return res.status(200).send({
          audioID: audioCreated._id
        });
      }
    }
  );
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

router.post("/accept", (req, res) => {
  const { audioID, transcript, userID } = req.body;
  // console.log("Accepting... ", audioID)
  Audio.findById(audioID)
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

router.post("/reject", (req, res) => {
  const { audioID, transcript, userID } = req.body;
  // console.log("Rejecting... ", audioID)
  Audio.findById(audioID)
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
          if (!audioFound.rejectBy.includes(userID)) {
            audioFound.rejectBy.push(userID);
            if (audioFound.transcript !== transcript) {
              audioFound.transcript = transcript;
              audioFound.fixBy = userID;
            }
            audioFound.save();
            userFound.verifyCount++;
            userFound.save();
          }
          return res.status(200).send({ status: 1 });
        }
      })
    }
  })
})

// Get audio for testing - Solo feature
router.get("/sample/:userID", async (req, res) => {
  const { userID } = req.params;
  Audio.countDocuments({ 
    $and: [
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

// check if intent is a valid one or not (if it's not full of null)
const testIntent = (currentIntent) => {
  if (currentIntent === null || currentIntent === undefined) return false;
  const { intent, generic_intent } = currentIntent;
  return !((intent === null || intent === undefined) && (generic_intent === null || generic_intent === undefined));
}

// const getTranscript = (uri, audioID) => {

//   tmp.file(function _tempFileCreated (err, path, fd, cleanupCallback) {
//     if (err) throw err;
//     download(uri, path , function(){
//       exec(
//         `python ./server/routes/audio_transcript/main.py ${path}`,
//         (err, stdout, stderr) => {
//           if (err) {
//             console.error(`exec error: ${err}`);
//             return "";
//           }
          
//           Audio.findById(audioID)
//           .then(audioFound => {
//             if(!audioFound) {
//               console.log("Can't find audio for transcript!");
//               return null
//             } else {
//               audioFound.transcript = stdout;
//               return audioFound.save();
//             }
//           })
//           .then(audioUpdated => {})
//           .catch(err => {
//             console.log(`Error while updating audio ${audioID} transcript... ${err}`)
//           })
//         }
//       )
//     });

//     cleanupCallback();
//   })
// }

const getTranscriptWithGGAPI = (uri, audioID) => {
  axios.get(`${config.TRANSCRIPT_API}/api/v1/stt?url=${uri}`, {
    headers: {
      Authorization: `Bearer ${config.TRANSCRIPT_API_KEY}`,
    },
  })
  .then(response => {
    const { result, status } = response.data;

    if (status === 1) {
      const { transcription } = result;
      Audio.findById(audioID)
      .then(audioFound => {
        if(!audioFound) {
          console.log("Can't find audio for transcript!");
          return null
        } else {
          audioFound.transcript = transcription;
          return audioFound.save();
        }
      })
      .catch(err => {
        console.log(`Error while updating audio ${audioID} transcript... ${err}`)
      })
    } else {
      console.log("Can't get transcript. Here's the error code: ", status);
    }
  })
  
}

module.exports = router;