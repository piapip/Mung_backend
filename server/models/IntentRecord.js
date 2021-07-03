const mongoose = require('mongoose');

const intentRecordSchema = new mongoose.Schema({
  intent: {
    type: String,
  },

  description: {
    type: String,
  },

  count: {
    type: Number,
    default: 0,
  },

  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  }

});

const IntentRecord = mongoose.model('IntentRecord', intentRecordSchema);
module.exports = { IntentRecord };