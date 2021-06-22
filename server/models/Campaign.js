const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  }
});

const Campaign = mongoose.model('Campaign', campaignSchema);
module.exports = { Campaign };