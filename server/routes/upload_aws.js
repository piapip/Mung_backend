const express = require('express');
const router = express.Router();
const multer = require('multer');
const AWS = require('aws-sdk');
const config = require("./../config/key");
const mongoose = require("mongoose");
const tmp = require("tmp");
const fs = require("fs");
const request = require('request');
const { exec } = require('child_process');

AWS.config.update({region: config.awsRegion});

const s3 = new AWS.S3({
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
    sessionToken: config.awsSessionToken,
  }
})

const storage = multer.memoryStorage({
  destination: (req, file, callback) => {
    callback(null, '')
  }
})

const upload = multer({ storage }).single('file');

// save those blob to the server
router.post('/', upload, async (req, res) => {

  // get the soundData and relevant data
  const soundData = req.file.buffer;
  let myFile = req.file.originalname.split(".");
  const key = uuidv4();
  const fileType = myFile[myFile.length - 1];
  const filename = req.file.originalname.replace(`.${fileType}`, "") + `_${key}`;
  const userID = req.body.userID;
  const roomID = req.body.roomID;

  const params = {
    Bucket: config.awsBucketName, 
    Key: `${filename}.wav`,
    // Key: req.file.originalname,
    Body: soundData,
  }

  s3.upload(params, async (err, data) => {
    if (err) throw err
    
    const audioID = await saveAudioMongo(userID, data.Location)
    err = updateRoomInfo(roomID, audioID)
    if (err) {
      res.status(500).send(err)
      throw err 
    }

    res.status(200).send({data, audioID: audioID})
  })
})

const { Audio } = require("./../models/Audio");
const { Chatroom } = require("./../models/Chatroom");

const saveAudioMongo = async (userID, link) => {

  const audio = await Audio.create({
    user: userID,
    link: link,
    intent: null,
    revertable: false,
    transcript: " ",
    fixBy: null,
  })

  getTranscript(link, audio._id)

  return audio._id
}

const updateRoomInfo = (roomID, audioID) => {
  
  Chatroom.findById(roomID)
  .then(roomFound => {
    if(!roomFound) {
      console.log("Room not found!!!")
      // IMPLEMENT ERROR HANDLING HERE!!
      return "Room not found!"
    } else {
      roomFound.audioList.push(audioID);
      return roomFound.save();
    }
  })
  .then((roomUpdated) => {
    if (!roomUpdated) {
      console.log("Can't update room information after upload audio!!!")
      return
    }
  })
  .catch(err => {
    console.log("Unable to update audio information to room")
    console.log(err)
    return err
  });
}

let download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    if (err) throw "Something's wrong while uploading audio uri..."
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

const getTranscript = (uri, audioID) => {

  tmp.file(function _tempFileCreated (err, path, fd, cleanupCallback) {
    if (err) throw err;

    download(uri, path , function(){
      exec(
        `python ./server/routes/audio_transcript/main.py ${path}`,
        (err, stdout, stderr) => {
          if (err) {
            console.error(`exec error: ${err}`);
            return "";
          }
          
          Audio.findById(audioID)
          .then(audioFound => {
            if(!audioFound) {
              console.log("Can't find audio for transcript!");
              return null
            } else {
              audioFound.transcript = stdout;
              return audioFound.save();
            }
          })
          .then(audioUpdated => {})
          .catch(err => {
            console.log(`Error while updating audio ${audioID} transcript... ${err}`)
          })
        }
      )
    });

    cleanupCallback();
  })
}


// Generate random ID
function uuidv4() {
  return mongoose.Types.ObjectId();
}

module.exports = router;