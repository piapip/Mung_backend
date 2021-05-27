var sockets = {}
const { User } = require("./../models/User");
const { Message } = require("./../models/Message");
const { Intent } = require("./../models/Intent");
const { Audio } = require("./../models/Audio");
const config = require("./../config/key");
const axios = require('axios');

sockets.init = function(server) {
  // socket.io setup
  const io = require('socket.io')(server, {cors: {origin: "http://localhost:3000"}});
  // const io = require('socket.io')(server, {
  //   path: '/socket',
  // });

  const jwt = require('jsonwebtoken');

  // socket logic go here
  io.use(async (socket, next) => {
    try {
      // Must be matched with the frontend.
      const token = socket.handshake.query.token;
      if (token !== "undefined" && token !== "null" && token !== "") {
        
        // await jwt.verify(token, 'secret', (err, decode) => {
        await jwt.verify(token, config.JWT_SECRET_KEY, (err, decode) => {
          if (err) console.log(err)
          else {
            const ssoUserId = decode.ssoUserId;
            User.findOne({ ssoUserId: ssoUserId })
            .then(userFound => {
              socket.userId = userFound._id;
              next()
            })
            // socket.userId = decode
            // next()
          }
        });
      }
    } catch (err) {
      console.log(err)
    }
  })
  let audioQueue = [];    // ready for audio room
  let textQueue = [];     // ready for text room
  let promptQueue = [];   // ready to join room
  let idle = [];          // not in queue
  let inRoom = [];
  // ^^^^^ server socket

  // vvvvv client socket
  io.on('connection', (socket) => {
    console.log("Connected: " + socket.id);

    if (!idle.includes(socket.id)) idle.push(socket.id);
    // io.to(socket.id).emit("refresh status", {
    //   idle: idle.length,
    //   inQueue: audioQueue.length,
    //   inRoom: inRoom.length,
    // })

    socket.on('disconnect', () => {
      console.log("Disconnected: " + socket.id)
      let indexQueue = audioQueue.findIndex(item => item.socketID === socket.id);
      if (indexQueue !== -1) {
        audioQueue.splice(indexQueue, 1);
      } else {
        indexQueue = textQueue.findIndex(item => item.socketID === socket.id);
        if (indexQueue !== -1) {
          textQueue.splice(indexQueue, 1);
        }
      }

      const indexIdle = idle.findIndex((item) => { return item === socket.id });
      if (indexIdle !== -1) idle.splice(indexIdle, 1);

      // Check room status too.
      const inRoomIndex = inRoom.findIndex((item) => {return item.socketID === socket.id});
      if (inRoomIndex !== -1) {
        kickUser(inRoom[inRoomIndex].roomID, inRoom[inRoomIndex].userID);
        io.to(inRoom[inRoomIndex].roomID).emit('leaveRoom announce', {
          username: inRoom[inRoomIndex].username,	
        });
        inRoom.splice(inRoomIndex, 1);
      }
    });

    // when receive ready signal from user
    socket.on('ready', ({ socketID, userID, username, inputType }) => {
      let userInfo = {
        socketID: socketID,
        userID: userID,
        username: username,
        inputType: inputType,
      }

      const indexIdle = idle.findIndex((item) => { return item === socket.id })
      if (indexIdle !== -1) idle.splice(indexIdle, 1);

      // put the user into the respective queue, "all" will put the user into both queues.
      if (inputType === "audio") {
        addToQueue(audioQueue, userInfo)
      } else if (inputType === "text") {
        addToQueue(textQueue, userInfo)
      } else {
        addToQueue(audioQueue, userInfo)
        addToQueue(textQueue, userInfo)
      }

      console.log(`At socket ${socketID} the user ${username} whose ID is ${userID} is ready to send ${inputType}`);

      // finding a partner
      let result = matching(audioQueue, textQueue, userInfo)

      // if found a matching partner
      if (result !== null) {
        console.log(`Client: ${result.client.username}, Servant: ${result.servant.username}, Room type: ${result.roomType}`)

        // result = { client: , servant: , roomType: , accepted: 0 }
        result.accepted = 0
        promptQueue.push(result)
        
        // send prompt to both users for confirm ready.
        io.to(result.client.socketID).emit('match', {
          client: result.client,
          servant: result.servant,
          roomType: result.roomType,
        })
        io.to(result.servant.socketID).emit('match', {
          client: result.client,
          servant: result.servant,
          roomType: result.roomType,
        })
      } 
    })

    // when both users confirm the second prompt, create a room and send them the information of the room.
    socket.on('confirm prompt', ({ socketID, userID, username, inputType, timer }) => {
      let userInfo = {
        socketID: socketID,
        userID: userID,
        username: username,
        inputType: inputType,
      }

      let promptQueueIndex = checkExist(promptQueue, userInfo)
      if (promptQueueIndex !== -1) {
        let pair = promptQueue[promptQueueIndex]
        if (pair.accepted === 0) {
          pair.accepted++
          // tell one of the user that need the other user's prompt to continue.
          io.to(socketID).emit('wait for other prompt', ({}))
          setTimeout(async () => {
            let promptQueueIndex = checkExist(promptQueue, userInfo);
            if (promptQueueIndex !== -1) {
              // remove those two mofo off the prompt queue
              let pairUser = promptQueue[promptQueueIndex]
              removeFromQueue(promptQueue, pairUser)

              // add the other user back to the HEAD of the queue
              let theOtherUser = pairUser.client.userID === userInfo.userID ? pairUser.servant : pairUser.client;
              if (userInfo.inputType === "audio") {
                addToQueue(audioQueue, userInfo)
              } else if (userInfo.inputType === "text") {
                addToQueue(textQueue, userInfo)
              } else {
                addToQueue(audioQueue, userInfo)
                addToQueue(textQueue, userInfo)
              }
              
              io.to(userInfo.socketID).emit('requeue', ({}));
              io.to(theOtherUser.socketID).emit('too late', ({}));
            }
          }, 10000 - timer*1000);
        } else {
          // create a room for two, send them id.
          createRoom(pair.client.userID, pair.servant.userID, pair.roomType)
          .then(roomID => {
            // tell both users that the room is ready
            io.to(pair.client.socketID).emit('prompt successful', ({
              roomID: roomID,
            }))
            io.to(pair.servant.socketID).emit('prompt successful', ({
              roomID: roomID,
            }))
          })
        }
      } else {
        // return error here!!! Need to handle error!!!
        console.log("Fail confirming prompt due to some shenanigan... can't find pair brrrrrrr");
      }
    })

    // when the user deny or miss the second ready prompt
    socket.on('cancel prompt', ({ socketID, userID, username, inputType }) => {
      let userInfo = {
        socketID: socketID,
        userID: userID,
        username: username,
        inputType: inputType,
      }

      // check if the pair exists in the prompt queue
      let promptQueueIndex = checkExist(promptQueue, userInfo)
      if (promptQueueIndex !== -1) {
        // remove those two mofo off the prompt queue
        let pair = promptQueue[promptQueueIndex]
        removeFromQueue(promptQueue, pair)

        // add the other user back to the HEAD of the queue
        let theOtherUser = pair.client.userID === userInfo.userID ? pair.servant : pair.client;
        if (theOtherUser.inputType === "audio") {
          addToQueue(audioQueue, theOtherUser)
        } else if (theOtherUser.inputType === "text") {
          addToQueue(textQueue, theOtherUser)
        } else {
          addToQueue(audioQueue, theOtherUser)
          addToQueue(textQueue, theOtherUser)
        }
        
        io.to(theOtherUser.socketID).emit('requeue', ({}))
      } else {
        // return error here!!! Need to handle error!!!
        console.log("Fail cancelling prompt due to some shenanigan... can't find pair brrrrrrr");
      }
    })

    // cancel ready status before the second confirmation (before "match" signal).
    socket.on('cancel ready', ({ socketID, userID, username, inputType }) => {
      let userInfo = {
        socketID: socketID,
        userID: userID,
        username: username,
        inputType: inputType,
      }
      removeFromQueue(audioQueue, userInfo);
      removeFromQueue(textQueue, userInfo);
      console.log(`The user ${username} whose ID is ${userID} has cancelled their ready status`);
    })

    // when an user enters the room, announce to everyone else in the room
    socket.on('joinRoom', async ({ socketID, chatroomID, userID, username }) => {
      
      const inRoomIndex = inRoom.findIndex((item) => {return item.socketID === socketID})
      if (inRoomIndex === -1) inRoom.push({
        roomID: chatroomID,
        userID: userID,
        username: username,
        socketID: socketID,
      });
      // -1 - no slot left  0 - already in room  1 - got in there successfully
      let status = await addSlot(chatroomID, userID);

      if (status === 1) {
        socket.join(chatroomID);
        console.log(`The user ${username} has joined chatroom: ${chatroomID}`);
        
        // sending to individual socketid (private message)	
        io.to(chatroomID).emit('joinRoom announce', {	
          username: username,	
          userID: userID,
        });
      } else if (status === -1) {
        io.to(socketID).emit('room full', {});
      } else if (status === 0) {
        socket.join(chatroomID);
        console.log(`The user ${username} has rejoined chatroom: ${chatroomID}`);

        io.to(chatroomID).emit('joinRoom announce', {
          username: username,
          userID: userID,
        });
      } else {
        console.log("how the fuck...??? joinRoom mainsocket.js")
      }
    });

    // when an user leaves the room, announce to everyone else in the room
    socket.on('leaveRoom', ({ chatroomID, userID, username }) => {

      // remember to remove user from the user slot. (set it to null)
      kickUser(chatroomID, userID)

      const inRoomIndex = inRoom.findIndex((item) => {return item.socketID === socket.id})
      if (inRoomIndex !== -1) inRoom.splice(inRoomIndex, 1);

      socket.leave(chatroomID);

      // sending to individual socketid (private message)
      io.to(chatroomID).emit('leaveRoom announce', {	
        username: username,	
      });
    });

    // Just receive a signal
    socket.on('chatroomAudio', ({ chatroomID, sender, link }) => {
      // sending to individual socketid (private message)
      io.to(chatroomID).emit('newAudioURL', {
        userID: socket.userId,
        sender: sender,
        audioLink: link,
      });
      console.log("Receive audio in chatroom " + chatroomID + " from " + sender + ". Here's the audio link: " +  link)
    });

    socket.on('client intent', async ({ roomID, audioID, intentDetailed }) => {
      
      // console.log("Receive client intent: " + JSON.stringify(intentDetailed) + " of audio " + audioID + " from room " + roomID);

      // parse the received intent
      if (intentDetailed === null) intentDetailed = {};
      const properties = ["intent", "loan_purpose", "loan_type", "card_type", "card_usage", "digital_bank", "card_activation_type", "district", "city", "name", "cmnd", "four_last_digits", "generic_intent"];
      for (let key in properties) {
        if(intentDetailed[properties[key]] === undefined || intentDetailed[properties[key]] === '') intentDetailed[properties[key]] = null
      }

      // check turn of the room. Throw a fit if it's not 1. If it's 1 then: 
      await Chatroom.findById(roomID)
      .populate('currentIntent')
      .then(async (roomFound) => {
        if (!roomFound) {
          console.log("... Some shenanigan.. Room doesn't even exist.");
          // IMPLEMENT SOME KIND OF ERROR!!!
          return null;
        } else {
          if (roomFound.turn !== 1) {
            console.log("... Some shenanigan.. It's not client's turn to send intent.");
            // IMPLEMENT SOME KIND OF ERROR!!!
            return null;
          } else {
            let newIntent;
            if (intentDetailed === null) newIntent = await Intent.create({})
            else {
              const { intent, loan_purpose, loan_type, card_type, card_usage, digital_bank, card_activation_type, district, city, name, cmnd, four_last_digits, generic_intent } = intentDetailed;
              newIntent = await Intent.create({
                intent, loan_purpose, loan_type, card_type, card_usage, digital_bank, card_activation_type, district, city, name, cmnd, four_last_digits, generic_intent
              });

              if (name && name.length !== 0 && !roomFound.cheat_sheet.includes(name)) roomFound.cheat_sheet.push(name);
              if (cmnd && cmnd.length !== 0 && !roomFound.cheat_sheet.includes(cmnd)) roomFound.cheat_sheet.push(cmnd);
              if (four_last_digits && four_last_digits.length !== 0 && !roomFound.cheat_sheet.includes(four_last_digits)) roomFound.cheat_sheet.push(four_last_digits);
            }

            // save intent to audio
            Audio.findById(audioID)
            .then(async (audioFound) => {
              if (!audioFound) {
                console.log("... Some shenanigan.. Audio doesn't even exist.");
                // IMPLEMENT SOME KIND OF ERROR!!!
                return null;
              } else {
                audioFound.intent = newIntent._id;
                audioFound.prevIntent = flattenIntent(roomFound.currentIntent);
                return audioFound.save();
              }
            })
            .catch(err => {
              // IMPLEMENT SOME KIND OF ERROR!!!
              console.log("Can't update audio's intent, ", err);
            })

            roomFound.turn = 2;
            return roomFound.save();
          }
        }
      })
      .catch(err => {
        // IMPLEMENT SOME KIND OF ERROR!!!
        console.log(err);
      })

      io.to(roomID).emit("refresh cheatsheet", {});

      setTimeout(async () => {
        let transcript = await Audio.findById(audioID)
        .then(audioFound => {
          if (!audioFound) {
            console.log("... Some shenanigan.. Audio doesn't even exist.");
            // IMPLEMENT SOME KIND OF ERROR!!!
            return null;
          } 
          
          return audioFound.transcript;
        })

        // console.log(`transcript: ${transcript}`)

        io.to(roomID).emit("update transcript", {
          // a very special case, because we don't have any way to retrieve newly uploaded audioID in the frontend.
          username: audioID,
          transcript: transcript,
          index: -1,
        });
      }, 4000);
    });

    socket.on('servant intent', async ({ roomID, intentDetailed }) => {
      
      // parse the received intent
      if (intentDetailed === null) intentDetailed = {};
      const properties = ["intent", "loan_purpose", "loan_type", "card_type", "card_usage", "digital_bank", "card_activation_type", "district", "city", "name", "cmnd", "four_last_digits", "generic_intent"];
      for (let key in properties) {
        if(intentDetailed[properties[key]] === undefined || intentDetailed[properties[key]] === '') intentDetailed[properties[key]] = null
      }

      // compare servant's intent and client's intent.
      const compare = await Chatroom.findById(roomID)
      .then(async (roomFound) => {
        // check room status.
        if (!roomFound) {
          console.log("... Some shenanigan.. Room doesn't even exist.");
          // IMPLEMENT SOME KIND OF ERROR!!!
          return null;
        } else {
          if (roomFound.turn !== 2) {
            console.log("... Some shenanigan.. It's not servant's turn to send intent.");
            // IMPLEMENT SOME KIND OF ERROR!!!
            return null;
          } else {
            
            // get latest audio.
            const latestAudioID = roomFound.audioList[roomFound.audioList.length - 1]
            return Audio.findById(latestAudioID)
            .populate('intent')

            // check intent against audio's intent.
            .then(audioFound => {
              const result = compareIntent(audioFound.intent, intentDetailed);
              // if the intent is an exact match to the audio's intent, update audio's revertable status to true in case if it's removed later on.
              if (result) {
                audioFound.revertable = true;
                // I'm so afraid of this shit... it may cause a lot of potential BUG!!!
                audioFound.save((err, audioUpdated) => {
                  if (err) return false;
                  return true;
                })
              }
              return result
            })
            .catch(err => console.log("Error: ", err))
          }
        }
      })
      .catch(err => console.log(err))

      // if correct, emit a signal, telling both of them that's it's okay. Update the current intent for the room and move turn to 3.
      if (compare) {
        // console.log("Update current intent: " + JSON.stringify(intentDetailed));
        await Chatroom.findById(roomID)
        .populate('intent')
        .then(async (roomFound) => {
          if (!roomFound) {
            console.log("... Some shenanigan.. Room doesn't even exist.");
            // IMPLEMENT SOME KIND OF ERROR!!!
            return null;
          } else {
            // already check up there but fuck it, just in case.
            if (roomFound.turn !== 2) {
              console.log("Saving intent... Some shenanigan.. It's not servant's turn to send intent.");
              // IMPLEMENT SOME KIND OF ERROR!!!
              return null;
            } else {
              // update currentIntent
              const newIntent = await Intent.findById(roomFound.currentIntent)
              .then(currentIntentFound => {
                if (!currentIntentFound) {
                  console.log("... Some shenanigan.. CurrentIntent doesn't even exist.");
                } else {
                  // no need to update if it's just a generic intent.
                  if (intentDetailed.generic_intent !== null) return currentIntentFound; 
                  else {
                    if (intentDetailed.intent !== null && intentDetailed.intent !== currentIntentFound.intent) {
                      currentIntentFound = transferObject(currentIntentFound, intentDetailed);
                    } else {
                      for (const property in intentDetailed) {
                        // special case where users have to type. The value is always not null but can be "", which is empty.
                        if(property === "cmnd" || property === "name" || property === "four_last_digits") {
                          if(intentDetailed[property] !== null) {
                            if(intentDetailed[property].replace(" ", "").length !== 0) {
                              currentIntentFound[property] = intentDetailed[property];  
                            }
                          }
                        } else {
                          if(intentDetailed[property] !== null) {
                            currentIntentFound[property] = intentDetailed[property];
                          }
                        }
                      }
                    }
                    return currentIntentFound.save();
                  }
                }
              })
              .catch(err => console.log("Having trouble updating currenting intent...",err));
              
              // Have to change this, since the definition of a finished room is different now.
              // remember that roomFound.intent.generic_intent will always be null because it doesn't really matter, so we need to create an alternative that also has such pattern.
              const alternativeIntent = newIntent;
              alternativeIntent.generic_intent = null;
              if (!roomFound.done) {
                if (compareIntent(alternativeIntent, roomFound.intent)) {
                  roomFound.done = true;
                  updateRoomDoneCount(roomFound.user1);
                  updateRoomDoneCount(roomFound.user2);
                }
              }

              // emit signal
              io.to(roomID).emit('intent correct', {
                roomDone: roomFound.done,
                newIntent: newIntent,
              });

              // update turn
              roomFound.turn = 3;
              return roomFound.save();
            }
          }
        })
        .catch(err => console.log(err))
        
        
      } else {
        // else emit a signal, telling the servant that he/she fucked up. Do it again, or press the godly "DELETE" button to remove the client's audio reverse the turn to 1.. 
        io.to(roomID).emit('intent incorrect', {});
      }
    });

    socket.on('servant audio', async ({ roomID, audioID }) => {      
      // update room turn
      Chatroom.findById(roomID)
      .populate('currentIntent')
      .then(async (roomFound) => {
        if (!roomFound) {
          console.log("... Some shenanigan.. Room doesn't even exist.");
          // IMPLEMENT SOME KIND OF ERROR!!!
          return null;
        } else {

          // create intent, servant intent is always null. Not having any intention is an intent.
          const newIntent = await Intent.create({});

          // save intent to audio
          Audio.findById(audioID)
          .then(async (audioFound) => {
            if (!audioFound) {
              console.log("... Some shenanigan.. Audio doesn't even exist.");
              // IMPLEMENT SOME KIND OF ERROR!!!
              return null;
            } else {
              audioFound.intent = newIntent._id;
              audioFound.prevIntent = flattenIntent(roomFound.currentIntent);
              return audioFound.save();
            }
          })
          .catch(err => {
            // IMPLEMENT SOME KIND OF ERROR!!!
            console.log("Can't update audio's intent, ", err);
          })

          roomFound.turn = 1;
          return roomFound.save();
        }
      })
      .catch(err => {
        // IMPLEMENT SOME KIND OF ERROR!!!
        console.log(err);
      })

      setTimeout(async () => {
        let transcript = await Audio.findById(audioID)
        .then(audioFound => {
          if (!audioFound) {
            console.log("... Some shenanigan.. Audio doesn't even exist.");
            // IMPLEMENT SOME KIND OF ERROR!!!
            return null;
          } 
          
          return audioFound.transcript;
        })
        console.log('transcript: ', transcript)

        io.to(roomID).emit("update transcript", {
          // a very special case, because we don't have any way to retrieve newly uploaded audioID in the frontend.
          username: audioID,
          transcript: transcript,
          index: -1,
        });
      }, 4000);
    });

    socket.on("remove audio", ({ roomID }) => {
      console.log("Removing audio in room ", roomID);
      io.to(roomID).emit('audio removed');
    });

    socket.on("Recording", ({ roomID }) => {
      io.to(roomID).emit("user recording", {});
    })

    socket.on("Done Recording", ({ roomID }) => {
      io.to(roomID).emit("user done recording", {});
    })
    
    socket.on("fix transcript", ({ roomID, username, editContent, index }) => {
      if (index !== -1) {
        io.to(roomID).emit("update transcript", {
          username: username,
          transcript: editContent,
          index: index,
        });
      } else {
        // DO I need to put a update transcript fail here?
      }
    })
    
    socket.on("get transcript", ({ audioID, audioURL, userID, chatroomID }) => {
      axios.get(`${config.TRANSCRIPT_API}/api/v1/stt?url=${audioURL}`, {
        headers: {
          Authorization: `Bearer ${config.TRANSCRIPT_API_KEY}`,
        },
      })
      .then(response => {
        const { result, status } = response.data;
    
        if (status === 1) {
          const { transcription } = result;
          io.to(chatroomID).emit("confirm transcript", {
            audioID,
            audioURL,
            transcription,
            userID,
          })  
        } else {
          io.to(chatroomID).emit("confirm transcript", {
            audioID,
            audioURL,
            transcription: "...",
            userID,
          })  
        }
      })
    })

    socket.on("transcript confirmed", ({ audioID, userID, newTranscript }) => {
      Audio.findById(audioID)
      .then(audioFound => {
        if(!audioFound) {
          console.log("Can't find audio to update transcript!");
          throw "Can't find audio"
        } else {
          audioFound.transcript = newTranscript;
          audioFound.fixBy = userID;
          return audioFound.save();
        }
      })
      .then(() => {})
      .catch(err => {
        console.log(`Error while updating audio ${audioID} transcript... ${err}`)
      })
    })

    // when receive a message
    socket.on("Input Chat message", msg => {
      try {
        var message = new Message({ message: msg.chatMes, sender:msg.userId,intent: msg.intent, chatroomID:msg.chatroomID });
        message.save(function (err,doc) {
          if(err) return console.error(doc)
          Message.find({"_id": doc._id})
              .populate("sender")
              .exec((err,doc)=>{
                return io.emit("Output Chat Message", doc);
              })
          console.log(doc)
        })
      } catch (error) {
        console.error(error);
      }
    });
  
  });

  // Create a log for the record so deleting audio won't be a problem.
  // Also create a log for those deleted record. So can pluck em out and put them into a trash folder
}

const addToQueue = (queue, userInfo) => {
  let count = 0;
  for (let i = 0; i < queue.length; i++) {
    if (queue[i].userID === userInfo.userID) {
      count++;
      break;
    }
  }
  
  if (count === 0) queue.push(userInfo);
}

const removeFromQueue = (queue, target) => {
  // var index = queue.indexOf(target);
  var index = queue.findIndex(item => compareObject(item, target))
  if (index !== -1) {
    return queue.splice(index, 1);
  }
  return null;
}

const matching = (audioQueue, textQueue, userInfo) => {
  let matchingPartner;
  // check if there's someone in the queue
  if (audioQueue.length >= 2 && audioQueue.includes(userInfo)) {
    // if there's, create a room, then remove those two mofo out of the queue
    removeFromQueue(audioQueue, userInfo)
    removeFromQueue(textQueue, userInfo)
    
    matchingPartner = audioQueue.shift()
    removeFromQueue(textQueue, matchingPartner)

    // decide who's the client, who's the servant
    return {client: userInfo, servant: matchingPartner, roomType: "audio"}
  } else if (textQueue.length >= 2 && textQueue.includes(userInfo)) {
    // if there's, create a room, then remove those two mofo out of the queue
    removeFromQueue(audioQueue, userInfo)
    removeFromQueue(textQueue, userInfo)

    matchingPartner = textQueue.shift()
    removeFromQueue(audioQueue, matchingPartner)

    // decide who's the client, who's the servant
    return {client: userInfo, servant: matchingPartner, roomType: "text"}
  } else return null
}

const checkExist = (queue, userInfo) => {
  let result = -1
  queue.map((pair, index) => {
    if(compareObject(pair.client, userInfo) || compareObject(pair.servant, userInfo)) {
      result = index
      // PROBLEM!!! how to break from this (map) loop?
    } 
  })

  return result
}

const compareObject = (obj1, obj2) => {
  // This is the lazy way. 
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

const compareIntent = (intent1, intent2) => {
  if ((intent1 === null && intent2 !== null) || (intent1 !== null && intent2 === null)) return false;
  if (intent1 === null && intent2 === null) return true;

  const properties = ["intent", "loan_purpose", "loan_type", "card_type", "card_usage", "digital_bank", "card_activation_type", "district", "city", "name", "cmnd", "four_last_digits", "generic_intent"];
  let count = 0;
  for (let key in properties) {
    if(intent1[properties[key]] === "-1" || intent1[properties[key]] === -1) {
      if(intent2[properties[key]] === null) count++;
    } else if(intent2[properties[key]] === "-1" || intent2[properties[key]] === -1) {
      if(intent1[properties[key]] === null) count++;
    } else {
      if(properties[key]==="name") {
        if (intent1["name"] === null && (intent2["name"] !== null && intent2["name"] !== '')) count++;
        else if ((intent1["name"] !== null && intent1["name"] !== '') && intent2["name"] === null) count++
        else if (intent1["name"] !== null && intent2["name"] !== null) {
          if (intent1["name"].toLowerCase() !== intent2["name"].toLowerCase()) count++;
        } else {}
      } else {
        if(intent1[properties[key]] !== intent2[properties[key]]) count++;
      }
    }
    
  }

  if (count !== 0) return false;
  return true;
}

const { Chatroom } = require("./../models/Chatroom");

const createRoom = async (userID1, userID2, roomType) => {
  // user1 - client, user2 - servant
  let content_type = roomType === "audio" ? 0 : 1;
  // const randomValue = randomGenerator();
  const name = await generateName(4);
  let intent = await createRandomIntent()
  let currentIntent = await Intent.create({});
  const chatroom = await Chatroom.create({
    name: name,
    // name: "Room R" + randomValue,
    task: generateTask(),
    content_type: content_type,
    user1: userID1,
    user2: userID2,
    client: [userID1],
    servant: [userID2],
    cheat_sheet: [],
    intent: intent._id,
    currentIntent: currentIntent._id,
    turn: 1,
  })
  .catch(async err => {
    if (err.name === "MongoError") {
      if (err.code === 11000) {
        return await Chatroom.create({
          name: await generateName(6),
          task: generateTask(),
          content_type: content_type,
          user1: userID1,
          user2: userID2,
          client: [userID1],
          servant: [userID2],
          cheat_sheet: [],
          intent: intent._id,
          currentIntent: currentIntent._id,
          turn: 1,
        })
      }
    } else {
      console.log(err);
      return null;
    }
  });

  return chatroom._id;
}

// const randomGenerator = () => {
//   return Math.floor(Math.random() * 1000000000);
// }

const generateName = async (length) => {

  const name = `Room ${generateRandomString(length)}`;

  return name;
  // // PROBLEM!!! Both users will fire this function... fuck... and it doesn't always work...
  // // Here's the idea: count how many Chatroom documents there are, then increase by 1 then make it as the name
  // let roomName = "";
  // await Chatroom.estimatedDocumentCount(async (err, count) => {
  //   if (err) {
  //     console.log("Can't count chatroom documents, ", err);
  //   } else {
  //     roomName = "Room R" + count;
  //     console.log("roomName: ", roomName);
  //     // await Chatroom.find({ name: roomName })
  //     // .then(async roomFound => {
  //     //   // console.log(roomFound.);
  //     //   if (roomFound && roomFound.user1 !== userID1 && roomFound.user2 !== userID2) {
  //     //     roomName = await generateName(userID1, userID2);
  //     //   }
  //     // });
  //   }
  // })

  // return roomName;
}

const generateTask = () => {
  // IMPLEMENT!!!
  return `A random task name`
}

const intentSamplePool = require("./../config/intent");
const namePool = require("./../config/name");

const createRandomIntent = () => {
  // gen base intent
  const intentShowUpRate = [0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 7, 10, 11, 12, 16, 17, 3, 4, 3, 4];
  const intentIndex = intentShowUpRate[getRandomFromArray(intentShowUpRate)];
  // const intentIndex = getRandomFromArray(intentSamplePool.INTENT);
  // const intentIndex = 7;
  const slots = intentSamplePool.INTENT[intentIndex].slot;

  let tempIntent = {
    intent: intentIndex,
  }

  // gen slot required for intent.
  slots.map(slot => {
    const slotPool = intentSamplePool[slot.toUpperCase()];
    if (slot === "city") {
      const slotIndex = getRandomFromArray(slotPool);
      return tempIntent[slot] = slotPool[slotIndex];
    }
    else if (slot === "district") {
      const districtPool = slotPool[tempIntent["city"]];
      const slotIndex = getRandomFromArray(districtPool);
      return tempIntent[slot] = districtPool[slotIndex];
    }
    else if (intentSamplePool[slot.toUpperCase()] === undefined) {
      if (slot === 'name') {
        return tempIntent[slot] = namePool.NAME[getRandomFromArray(namePool.NAME)];
      } else if (slot === 'cmnd') {
        return tempIntent[slot] = generateNumberWithLength(9);
      } else if (slot === 'four_last_digits') {
        return tempIntent[slot] = generateNumberWithLength(4);
      }
      return tempIntent[slot] = -1;
    } else {
      const slotIndex = getRandomFromArray(slotPool);
      return tempIntent[slot] = slotIndex;
    }
  })

  const { intent, loan_purpose, loan_type, card_type, card_usage, digital_bank, card_activation_type, district, city, name, cmnd, four_last_digits } = tempIntent;
  // I can still put this lil piece of crap in the {} up there, but who knows what magic it might hold, so better safe than sorry.
  const generic_intent = null;
  return Intent.create({
    intent, loan_purpose, loan_type, card_type, card_usage, digital_bank, card_activation_type, district, city, name, cmnd, four_last_digits, generic_intent
  })
}

// transfer information from newObject to the originalObject
const transferObject = (originalObject, newObject) => {
  for (let key in newObject) {
    if (newObject.hasOwnProperty(key)) {
      originalObject[key] = newObject[key];
    }
  }

  return originalObject;
}

const getRandomFromArray = (arr) => {
  return Math.floor(Math.random() * arr.length);
}

// const genRandomInt = (min, max) => {
//   min = Math.ceil(min);
//   max = Math.floor(max);
//   return Math.floor(Math.random() * (max - min + 1)) + min;
// }

const kickUser = (roomID, userID) => {

  Chatroom.findById(roomID)
  .then(roomFound => {
    if (!roomFound) {
      console.log("... Some shenanigan.. Room doesn't even exist.");
      // IMPLEMENT SOME KIND OF ERROR!!!
      return null;
    } else {
      // special treatment for those who has completed the room.
      if (roomFound.done) return null;

      // check if the room has the user and remove them. Otherwise it's aight, don't fret.
      let count = 0;
      // lol mongoose is unique really
      if (roomFound.user1 !== null && roomFound.user1.equals(userID)) {
        roomFound.user1 = null;
        count++;
      }
      if (roomFound.user2 !== null && roomFound.user2.equals(userID)) {
        roomFound.user2 = null;
        count++;
      }

      if (count !== 0) return roomFound.save();
      else return null;
    }
  })
  .catch(err => console.log("Kicking user: ", err))
}

// -1 - no slot left
//  0 - already in room
//  1 - got in there successfully
const addSlot = async (roomID, userID) => {
  return await Chatroom.findById(roomID)
  .then(async (roomFound) => {
    if (!roomFound) {
      console.log("... Some shenanigan.. Room doesn't even exist.");
      // IMPLEMENT SOME KIND OF ERROR!!!
      return null;
    } else {
      if (roomFound.done) {
        if ((roomFound.user1 !== null && roomFound.user1.equals(userID)) || 
          (roomFound.user2 !== null && roomFound.user2.equals(userID))) { 
          return 0;
        }
        else return -1;
      }

      // check if the room has that user already.
      if ((roomFound.user1 !== null && roomFound.user1.equals(userID)) || 
          (roomFound.user2 !== null && roomFound.user2.equals(userID))) {
        // IMPLEMENT ANNOUNCEMENT!
        return 0;
      }

      // check if the room has any slot left 
      if (roomFound.user1 === null || roomFound.user2 === null) {
        // check the room record of client and servant if the user has been here before

        // if they have been here before
        if (roomFound.client.includes(userID)) {
          if (roomFound.user1 === null) {
            roomFound.user1 = userID;
            roomFound.save();
            return 1;
          } else return -1;
        } else if (roomFound.servant.includes(userID)) {
          if (roomFound.user2 === null) {
            roomFound.user2 = userID;
            roomFound.save();
            return 1;
          } else return -1;
        } else {
          // if they have NOT been here before
          // check if the room has any slot left (order based on turn)
          if (roomFound.turn === 1) {
            if (roomFound.user1 === null) {
              roomFound.user1 = userID;
              roomFound.client.push(userID);
              roomFound.save();
              return 1;
            } else if (roomFound.user2 === null) {
              roomFound.user2 = userID;
              roomFound.servant.push(userID);
              roomFound.save();
              return 1;
            } else {
              // IMPLEMENT ANNOUNCEMENT!
              return -1;
            }
          } else {
            if (roomFound.user2 === null) {
              roomFound.user2 = userID;
              roomFound.servant.push(userID);
              roomFound.save();
              return 1;
            } else if (roomFound.user1 === null) {
              roomFound.user1 = userID;
              roomFound.client.push(userID);
              roomFound.save();
              return 1;
            } else {
              // IMPLEMENT ANNOUNCEMENT!
              return -1;
            }
          }
        }
      } else return -1;
    }
  })
  .catch(err => console.log("Adding user to slot: ", err))
}

const generateRandomString = (length, allowedChars) => {
  let text = '';
  const possible =
    allowedChars ||
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const generateNumberWithLength = (length) => {
  let text = '';
  const possible = '0123456789';

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const flattenIntent = (currentIntent) => {
  // const { intent, loan_purpose, loan_type, card_type, card_usage, digital_bank, card_activation_type, district, city, name, cmnd, four_last_digits, generic_intent } = currentIntent;
  // return `${intent}_${loan_purpose}_${loan_type}_${card_type}_${card_usage}_${digital_bank}_${card_activation_type}_${district}_${city}_${name}_${cmnd}_${four_last_digits}_${generic_intent}`;
  const properties = ["intent", "generic_intent", "loan_purpose", "loan_type", "card_type", "card_usage", "digital_bank", "card_activation_type", "district", "city", "name", "cmnd", "four_last_digits"];
  let result = '';
  for (let key in properties) {
    if(currentIntent[properties[key]] !== null && currentIntent[properties[key]] !== undefined) {
      const slot = properties[key];
      
      switch(slot) {
        case "city":
        case "district":
          result = result + `'${getLabel(slot)}': '${currentIntent[slot]}', `
          break;
        case "generic_intent":
          result = result + `'${getLabel(slot)}': '${intentSamplePool["GENERIC_INTENT"][currentIntent[slot]]}', `
          break;
        default:
          if (intentSamplePool[slot.toUpperCase()] === undefined || currentIntent[slot] === -1) {
            result = result + `'${getLabel(slot)}': '${currentIntent[slot]}', `
          } else {
            result = result + `'${getLabel(slot)}': '${intentSamplePool[slot.toUpperCase()][currentIntent[slot]].name}', `
          }
      }
    }
  }
  result = "{" + result.substring(0, result.length - 2) + "}";
  return result;
}

const getLabel = (slot) => {
  const slotIndex = intentSamplePool.SLOT_LABEL.findIndex((item) => {
    return item.tag.toUpperCase() === slot.toUpperCase();
  });

  return slotIndex === -1 ? '' : intentSamplePool.SLOT_LABEL[slotIndex].name;
};

const updateRoomDoneCount = (userID) => {
  if (userID !== null) {
    User.findById(userID)
    .then(userFound => {
      if (!userFound) throw "Can't find user"
      else {
        userFound.roomDoneCount++;
        return userFound.save();
      }
    })
  }
}

module.exports = sockets;