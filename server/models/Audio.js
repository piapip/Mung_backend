const mongoose = require('mongoose');

const audioSchema = new mongoose.Schema({

  // who created this audio
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  prevIntent: {
    type: String,
    default: "",
  },

  link: {
    type: String,
    required: true,
    unique: true,
  },

  intent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intent',
    default: null,
  },

  // revertable means whether the room's currentIntent needs to be changed if the audio is deleted
  // false: audio gone and room's currentIntent stays the same.
  // true: audio gone and room's currentIntent will be changed. 
  revertable: {
    type: Boolean,
    required: true,
    default: false,
  },

  transcript: {
    type: String,
    default: " ",
  },

  fixBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  rejectBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],

  duration: {
    type: Number,
    default: -0.05,
  }
})

const Audio = mongoose.model('Audio', audioSchema);

module.exports = { Audio }