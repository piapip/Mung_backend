const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const moment = require("moment");

const userSchema = mongoose.Schema({
    name: {
        type: String,
        maxlength:50
    },
    email: {
        type: String,
        trim:true,
        unique: 1,
    },
    device: {
        type: String,
        unique: 1 
    },
    password: {
        type: String,
        minglength: 5
    },
    role: {
        type:Number,
        default: 0 
    },
    birthYear: {
        type: Number,
        default: 0,
    },
    age: {
        type: Number,
        default: 0,
    },
    // 0 - UNK, 1 - neither male or female,  2 - male, 3 - female
    sex: {
        type: Number,
        min: 0,
        max: 3,
        default: 0,
    },
    // 0 - UNK, 1 - NORTH,  2 - MID, 3 - SOUTH, 4 - neither male or female
    accent: {
        type: Number,
        min: 0,
        max: 4,
        default: 0,
    },
    image: String,
    token: {
        type: String,
    },
    tokenExp: {
        type: Number
    },
    ssoUserId: {
        type: String,
        default: "",
    },
    soloCount: {
        type: Number,
        default: 0,
    },
    trashCount: {
        type: Number,
        default: 0,
    },
    verifyCount: {
        type: Number,
        default: 0,
    },
    roomDoneCount: {
        type: Number,
        default: 0,
    },
    passwordChanged: {
        type: Boolean,
        default: false,
    }
})


userSchema.pre('save', function( next ) {
    var user = this;
    
    if(user.isModified('password')){    
        // console.log('password changed')
        bcrypt.genSalt(saltRounds, function(err, salt){
            if(err) return next(err);
    
            bcrypt.hash(user.password, salt, function(err, hash){
                if(err) return next(err);
                user.password = hash 
                next()
            })
        })
    } else {
        next()
    }
});

userSchema.methods.comparePassword = function(plainPassword,cb){
    bcrypt.compare(plainPassword, this.password, function(err, isMatch){
        if (err) return cb(err);
        cb(null, isMatch)
    })
}

userSchema.methods.generateToken = function(cb) {
    var user = this;
    var token =  jwt.sign(user._id.toHexString(),'secret')
    var oneHour = moment().add(1, 'hour').valueOf();

    user.tokenExp = oneHour;
    user.token = token;
    user.save(function (err, user){
        if(err) return cb(err)
        cb(null, user);
    })
}

userSchema.statics.findByToken = function (token, cb) {
    var user = this;

    jwt.verify(token,'secret',function(err, decode){
        user.findOne({"_id":decode, "token":token}, function(err, user){
            if(err) return cb(err);
            cb(null, user);
        })
    })
}

const User = mongoose.model('User', userSchema);

module.exports = { User }
