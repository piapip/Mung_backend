const express = require('express');
const router = express.Router();
const intentSamplePool = require("./../config/intent");
const namePool = require("./../config/name");

// const { Intent } = require("../models/Intent");

// create a random intent.
router.get("/random/:phase", (req, res) => {

  const { phase } = req.params;
  const baseIntent = createRandomBankIntent();
  const prevIntent = getPrevIntent(baseIntent, phase);
  const nextIntent = getNextIntent(baseIntent, prevIntent, phase);
  res.status(200).send({ prevIntent, nextIntent });
})

const getPrevIntent = (baseIntent, phase) => {
  // always return empty
  if (phase <= 9) return {};
  // 50% empty, 50% already have intent
  else if (phase > 9 && phase <= 29 ) {
    let num=Math.random();
    if(num < 0.5) return {}; 
    return {
      intent: baseIntent.intent
    };
  // always have intent, if there're more than one slots, add one of the slot.
  } else if (phase > 29 && phase <= 39 ) {
    return getRandomProperty(baseIntent, null);
  } else {
    const newIntent = createRandomBankIntent();
    if (intentSamplePool.INTENT[newIntent.intent].slot.length === 1) {
      return {
        intent: newIntent.intent,
      }
    } else return getRandomProperty(newIntent, {
      intent: newIntent.intent,
    });
  }
}

const getNextIntent = (baseIntent, prevIntent, phase) => {
  // always return intent only
  if (phase <= 9) return {
    intent: baseIntent.intent
  };
  // always return intent with one slot
  else if (phase > 9 && phase <= 29 ) {
    let temp = {
      intent: baseIntent.intent
    };
    return getRandomProperty(baseIntent, temp);
  // always have intent, if there're more than one slots, add one of the slot.
  } else {
    return getRandomProperty(baseIntent, prevIntent);
  }
}

const getRandomProperty = (baseIntent, prevIntent) => {

  const key = [];
  for (let k in baseIntent) {
    key.push(k);
  }

  const usedKey = [];
  for (let k in prevIntent) {
    usedKey.push(k);
    if (k !== "intent") {
      removeFromArrayByValue(key, k);
    }
  }

  let tempIntent = {
    intent: baseIntent.intent,
  }
  if (prevIntent === null && key.length === 2) {
    return tempIntent;
  }
  const randomProperty = key[1 + Math.floor(Math.random() * (key.length-1))];
  tempIntent[randomProperty] = baseIntent[randomProperty];

  return tempIntent;
}

const createRandomBankIntent = () => {
  // gen base intent
  const intentShowUpRate = [0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 0, 1, 2, 5, 6, 8, 9, 13, 14, 15, 7, 10, 11, 12, 16, 17, 3, 4, 3, 4];
  const intentIndex = intentShowUpRate[getRandomFromArray(intentShowUpRate)];
  // const intentIndex = getRandomFromArray(intentSamplePool.INTENT);
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
  return tempIntent;
}

// random between bank related intent and generic intent (rate 9 to 1)
// const randomIntentType = () => {
//   var num=Math.random();
//   if(num < 0.9) return 0; // bank related intent
//   return 1; // generic intent
// }


const getRandomFromArray = (arr) => {
  return Math.floor(Math.random() * arr.length);
}

const generateNumberWithLength = (length) => {
  let text = '';
  const possible = '0123456789';

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const removeFromArrayByValue = (array, value) => {
  let index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

module.exports = router;