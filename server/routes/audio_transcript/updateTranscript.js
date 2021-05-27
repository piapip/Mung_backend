var fs = require('fs');
const path = require("path");
const { Audio } = require("./../../models/Audio");

// const TRANSCRIPT_FOLDER = './server/transcript';
const TRANSCRIPT_FOLDER = './../../transcript';

// read all file in the transcript folder
fs.readdir(TRANSCRIPT_FOLDER, (err, files) => {
  if (err) {
    console.log(err);
    throw err;
  } else {
    files.forEach((file) => {
      let audioID = file.replace(".txt", "");
      fs.readFile(path.join(TRANSCRIPT_FOLDER, file), async (err, transcript) => {
        if (err) {
          console.log("Can't read transcript file! ",err);
          throw err;
        } else {
          console.log(`Transcript for audio ${audioID}: ${transcript}`);
          err = await updateAudioTranscript(audioID, transcript);
          if (err) {
            console.log("Can't update transcript for audio");
            throw err;
          }
        }
      })
    });
  }
});

const updateAudioTranscript = async (audioID, transcript) => {
  return Audio.findById(audioID)
  .then(audioFound => {
    console.log("got here!!!")
    if(!audioFound) {
      throw "Can't find audio!";
    } else {
      console.log("Here's the audio: ", audioFound);
      audioFound.transcript = transcript;
      return audioFound.save();
    }
  })
  .catch(err => console.log(`Error while updating audio ${audioID} transcript... ${err}`))
}