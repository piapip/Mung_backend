const mongoose = require('mongoose');

const intentSchema = new mongoose.Schema({
  intent: {
    type: String,
    default: '',
  },

  description: {
    type: String,
    default: '',
  },

  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  }
});

const Intent = mongoose.model('Intent', intentSchema);
module.exports = { Intent };