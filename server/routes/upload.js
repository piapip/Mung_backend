const express = require('express');
const router = express.Router();
const uploadService = require('../services/upload');
const multer = require('multer');

const DOMAIN_NAME = 'http://localhost:5000';

const upload_local = uploadService.upload.single('file');

router.post('/', (req, res) => {
  upload_local(req, res, async err => {
    if (err) {
      if (err instanceof multer.MulterError) {
        let error;
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            error = new Error("Exceed file limit size");
            res.status(406).send({ success: false, error});
          default:
            error = new Error("Can't upload the file\n");
            res.status(500).send({ success: false, error});
        }
      } else if (!(err instanceof multer.MulterError)) {
        res.status(500).send({ success: false, err })
      }
    }

    try {
      let path_components = req.file.path.split('\\')
      let audio_link = `${DOMAIN_NAME}/${path_components[path_components.length-3]}/${path_components[path_components.length-2]}/${path_components[path_components.length-1]}`
  
      return res.status(200).send(
        {
          result: {
            link: audio_link
          },
          status: 1,
        }
      );
    } catch (error) {
      console.log("Dead: ", error)
      res.status(500).send({ success: false, error })
    }
  })
})

module.exports = router;