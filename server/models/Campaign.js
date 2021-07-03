const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },

  campaignID: {
    type: String,
    unique: true,
  },

  quota: {
    type: Number,
    default: 120,
  }
});

const Campaign = mongoose.model('Campaign', campaignSchema);
module.exports = { Campaign };