const express = require('express');
const router = express.Router();
const { Chatroom } = require("../models/Chatroom");

// GET ALL
router.get("/", (req, res) => {

  Chatroom.find({})
    // .populate('user1') //not use this yet... populate will bring every information of 'user1' to the table, instead of just the id.
    .exec((err, roomFound) => {
      // .send() lets the browser automatically assign Content-Type 
      // whereas .json() specifies Content-Type as json type.
      if (err) res.status(500).send({ success: false, err })
      return res.status(200).send({
        success: true,
        roomFound
      })
    });
    
})

// GET RANDOM
router.get("/random/:userID", (req, res) => {

  const userID = req.params.userID

  // Get the count of all records
  Chatroom.countDocuments({
    $or: [
    {
      $and: [
        {done: 0},
        {$or: [
          {user1: userID},
          {user2: userID},
        ]},
      ]
    },
    {
      $and: [
        {done: 0},
        {$or: [
          {
            $and: [
              {user1: null},
              {client: userID},
            ]
          },
          {
            $and: [
              {user2: null},
              {servant: userID},
            ]
          }
        ]}
      ]
    },
    {
      $and: [
        {done: 0},
        {$or: [
          {
            $and: [
              {user1: null},
              {servant: {
                $ne: userID
              }}
            ]
          },
          {
            $and: [
              {user2: null},
              {client: {
                $ne: userID
              }}
            ]
          }
        ]},
      ]
    },
    ]
  }).exec((err, count) => {
    if (err) res.status(500).send({ success: false, message: "Can't estimate room document count", err })
    // Get a random entry 
    var random = Math.floor(Math.random() * count)
    Chatroom.findOne({
      $or: [
        {
          $and: [
            {done: 0},
            {$or: [
              {user1: userID},
              {user2: userID},
            ]},
          ]
        },
        {
          $and: [
            {done: 0},
            {$or: [
              {
                $and: [
                  {user1: null},
                  {client: userID},
                ]
              },
              {
                $and: [
                  {user2: null},
                  {servant: userID},
                ]
              }
            ]}
          ]
        },
        {
          $and: [
            {done: 0},
            {$or: [
              {
                $and: [
                  {user1: null},
                  {servant: {
                    $ne: userID
                  }}
                ]
              },
              {
                $and: [
                  {user2: null},
                  {client: {
                    $ne: userID
                  }}
                ]
              }
            ]},
          ]
        },
        ]
    }).skip(random)
    // .populate('intent')
    .exec((err, roomFound) => {
      if (err) res.status(500).send({ success: false, message: "Can't proceed to find any room", err })
      return res.status(200).send({
        success: true,
        roomFound
      })
    })
  })
})

router.get("/getRoomByUserID/:userID", (req, res) => {
  const { userID } = req.params;

  Chatroom.find({
    $or: [
      {client: userID},
      {servant: userID},
    ],
  })
  .then(batchRoomFound => {
    let result = []
    let count = 0;
    for (room of batchRoomFound) {
      let roomMetadata = {}
      count++;
      roomMetadata.index = count;
      roomMetadata.id = room._id;
      roomMetadata.audioCount = room.audioList.length;
      result.push(roomMetadata)
    }
    res.status(200).send(result)
  })
  .catch(err => {
    res.status(500).send(err)
    throw err
  })
})

// GET BY NAME
router.get("/name/:roomName", (req, res) => {
  Chatroom.find({name: req.params.roomName})
  .populate('intent')
  .populate('currentIntent')
  .populate('user1')
  .populate('user2')
  .populate({
    path: 'audioList',
    populate: {
      path: 'fixBy',
    }
  })
  .exec((err, roomFound) => {
    if (err) res.status(500).send({ success: false, err })
    else if (!roomFound) res.status(404).send({ success: false, message: "Room not found" })
    else res.status(200).send({ success: true, roomFound })
  })
})

// GET ONE
router.get("/:roomID", (req, res) => {
  Chatroom.findById(req.params.roomID)
  .populate('intent')
  .populate('currentIntent')
  .populate({
    path: 'audioList',
    populate: {
      path: 'intent',
    }
  })
  .exec((err, roomFound) => {
    if (err) res.status(500).send({ success: false, err })
    else if (!roomFound) res.status(404).send({ success: false, message: "Room not found" })
    else res.status(200).send({ success: true, roomFound })
  })
})

// GET ALL AUDIOS OF ONE ROOM
router.get("/:roomID/history", (req, res) => {
  Chatroom.findById(req.params.roomID, (err, roomFound) => {
    let history = roomFound.audioList;
    if (err) res.status(500).send({ success: false, err })
    else if (!roomFound) res.status(404).send({ success: false, message: "Room not found" })
    else res.status(200).send({ success: true, history })
  })
})

// GET THE CHEAT_SHEET OF THE ROOM
router.get("/:roomID/cheat", (req, res) => {
  Chatroom.findById(req.params.roomID, (err, roomFound) => {
    let cheat_sheet = roomFound.cheat_sheet;
    if (err) res.status(500).send({ success: false, err })
    else if (!roomFound) res.status(404).send({ success: false, message: "Room not found" })
    else res.status(200).send({ success: true, cheat_sheet })
  })
})

// CREATE A ROOM
router.post("/", async (req, res) => {

  const { name, task, content_type } = req.body;

  Chatroom.create({ name, task, content_type })
  .then(roomCreated => {
    if (!roomCreated) {
      res.status(500).send({ success: false, error: "Can't create room!"});
    } else {
      return res.status(201).send({
        success: false,
        roomCreated: roomCreated,
      });
    }
  })
  .catch(err => {
    if (err.name === "MongoError") {
      if (err.code === 11000) {
        Chatroom.create({ name: `${name}_1`, task, content_type })
        .then(roomCreated => {
          res.status(201).send({ success: true, roomCreated: roomCreated});
        })
        .catch (err => {
          res.status(500).send({ success: false, error: "Can't create room! Please try again after 2 seconds!!"})
        })
        
      }
      
      throw err
    } else {
      res.status(500).send({ success: false, error: "Can't create room!"});
    }
    throw err;
  })
  // .finally(() => {
  //   console.log("Let's do this!");
  // });

  // chatroom.save((err, roomCreated) => {
  //   if (err) return res.json({ success: false, err});
  //   return res.status(201).json({
  //     success: true,
  //     roomCreated
  //   });
  // });
})

// Update room Status with given information
router.put("/", (req, res) => {
  const { roomID, audioID } = req.body;

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
      res.status(500).send({ success: false, message: "Can't update room information after upload audio!!!" })
    }
    else res.status(200).send({ success: true })
  })
  .catch(err => {
    res.status(500).send({ success: false, message: "Unable to update audio information to room" })
    console.log(err)
    throw err
  });
})

router.delete("/delete/:roomID", (req, res) => {
  const { roomID } = req.params;
  Chatroom.findByIdAndDelete(roomID)
  .then((roomFound) => {
    if (!roomFound) res.status(404).send({ success: false, message: "Room not found" });
    else res.status(201).send({ success: true, message: "Room deleted!", roomFound });
  })
})

router.put("/finish/:roomID", (req, res) => {
  const { roomID } = req.params;
  Chatroom.findById(roomID)
  .then((roomFound) => {
    if (!roomFound) res.status(404).send({ success: false, message: "Room not found" });
    else {
      roomFound.done = true;
      roomFound.save();
      return res.status(200).send({ success: true });
    }
  })
})

// REMOVE AUDIO
router.put("/:roomID/:userRole", (req, res) => {
  const roomID = req.params.roomID;
  const userRole = req.params.userRole;
  Chatroom.findById(roomID)
  .then( async (roomFound) => {
    if (!roomFound) res.status(404).send({ success: false, message: "Room not found" });
    else {

      // check turn
      if (!((userRole === "client" && roomFound.turn === 1) || (userRole === "servant" && roomFound.turn === 2))) {
        res.status(409).send({ success: 0, message: "You have to wait for your turn!" });
        return
      } 

      // check if there's anything to delete
      if (roomFound.audioList.length === 0) {
        res.status(406).send({ success: -1, message: "There's nothing to delete!" });
        return
      }

      // remove the latest audio and get its ID (OPTIONAL: Log it to a file)
      // const latestAudioID = roomFound.audioList.pop();
      roomFound.audioList.pop();

      // LOG TO A FILE!!!
      
      // update turn
      if (roomFound.turn === 1) {
        roomFound.turn = 3;
      } else if (roomFound.turn === 2) {
        roomFound.turn = 1;
      } else {
        // If somehow they can bypass the "check turn" floodgate, it will lead to this message. How to prevent that though :/
        res.status(200).send({ success: 0, message: "How did you even do this...? Removing audio... Update room turn... " });
        return
      }

      return roomFound.save((err, roomUpdated) => {
        if (err) res.status(500).send({ success: -3, message: err});
        return res.status(200).send({ success: 1, message: 'Remove audio successfully!' });
      })
    }
  });
})

module.exports = router;