const express = require("express");
const app = express();
const path = require("path");
const cors = require('cors');
// const session = require('express-session');
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const config = require("./config/key");

const mongoose = require("mongoose");
mongoose.connect(config.mongoURI,
    {
      useNewUrlParser: true, useUnifiedTopology: true,
      useCreateIndex: true, useFindAndModify: false
    })
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));


app.use(cors())

//to not get any deprecation warning or error
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({extended: true}));
//to get json data
// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(cookieParser());

// app.use(session({
//   secret: "secret",
//   resave: true,
//   saveUninitialized: true,
//   cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
// }))


const port = process.env.PORT || 2000;

app.use("*", (req, res, next) => {
  // console.log(req)
  // console.log(`[${req.method}] ${req._parsedOriginalUrl ? req._parsedOriginalUrl.pathname : ""}`)
  console.log(`[${req.method}] ${req.baseUrl}`)
  next()
})

app.use('/api/users', require('./routes/users'));
app.use('/api/v1/uploads/file', require('./routes/upload'));
// app.use(config.uploadAPI, require('./routes/upload'));
app.use('/api/audio', require('./routes/audio'));
app.use('/api/intent', require('./routes/intent'));
app.use('/api/campaign', require('./routes/campaign'));
app.use('/api/aws/upload', require('./routes/upload_aws'));
app.use('/api/testing', require('./routes/audio_transcript/audio_transcript'));
app.use('/api/server', require('./routes/server'));
app.use('/api/sso', require('./routes/merge'));
//use this to show the image you have in node js server to client (react js)
//https://stackoverflow.com/questions/48914987/send-image-path-from-node-js-express-server-to-react-client
app.use('/uploads', express.static('uploads'));

app.use(express.static(__dirname))

// Serve static assets if in production
// if (process.env.NODE_ENV === "production") {

//   // Set static folder   
//   // All the javascript and css files will be read and served from this folder
//   app.use(express.static("client/build"));

//   // index.html for all page routes    html or routing and naviagtion
//   app.get("*", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "../client", "build", "index.html"));
//   });
// }

const server = app.listen(port, () => {
  console.log(`Server Listening on ${port}`)
});

// Generate Room ID
// function uuidv4() {
//   return mongoose.Types.ObjectId();
// }
