const mongoose = require('mongoose');

const intentSchema = new mongoose.Schema({
  intent: {
    type: String,
    default: '',
  },

  description: {
    type: String,
    default: '',
  }
});

const Intent = mongoose.model('Intent', intentSchema);
module.exports = { Intent };