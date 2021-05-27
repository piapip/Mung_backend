const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema({
  name: {
    type:String,
    maxlength:50,
    default: 'An unnamed room',
    unique: true,
  },
  task: {
    type:String,
    maxlength:50
  },
  // user1 gives command
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // user2 receive command and shoot back response.
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null    
  },
  // store who has been client of the room.
  client: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  // store who has been servant of the room.
  servant: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  // content_type decides the input type that users will provide 0 - audio, 1 - message
  content_type: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  audioList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Audio',
    default: [],
  }],
  // detailed of the final result
  intent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intent',
    required: 'Intent ID is required',
  },
  // currentIntent will show the current state of the dialogue so far.
  currentIntent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intent',
    default: null,
  },
  cheat_sheet: [{
    type: String,
    default: [],
  }],
  // 1 - client - 2 - servant send intent - 3 - servant send audio
  turn: {
    type: Number,
    min: 1,
    max: 3,
    default: 1,
    required: "Need to decide whose turn of this room is",
  },
  done: {
    type: Boolean,
    required: "Need done status for chatroom",
    default: false,
  }
})

const Chatroom = mongoose.model('Chatroom', chatroomSchema);

module.exports = { Chatroom }
