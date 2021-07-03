const mongoose = require('mongoose');

const audioSchema = new mongoose.Schema({

  // who created this audio
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  link: {
    type: String,
    required: true,
    unique: true,
  },

  intent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntentRecord',
    default: null,
  },

  // revertable: 
  //  TRUE - already checked and correct, 
  //  FALSE - not correct yet
  revertable: {
    type: Boolean,
    required: true,
    default: false,
  },

  googleTranscript: {
    type: String,
    default: " ",
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
  },

  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  },

  confidence: {
    type: Number,
    default: 0,
  },

  input_type: {
    type: String,
    default: "",
  },

  asr_provider: {
    type: String,
    default: "",
  }
}, {
  timestamps: true
})

const Audio = mongoose.model('Audio', audioSchema);

module.exports = { Audio }