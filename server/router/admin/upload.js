const router = require('express').Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { bucket } = require('../../connection/firebase-admin');
const {
  upload,
  convertHEIC,
  errorHandle,
} = require('../../middleware/uploadHandle');

// upload images
router.post(
  '/',
  upload.array('images', 5),
  convertHEIC,
  errorHandle,
  async (req, res) => {
    // check empty files
    const errs = !req.files || !req.files.length;
    if (errs) return res.send({ success: false, message: '禁止欄位為空' });
    // save url
    const imgUrls = [];
    // generate unique filename
    const generateFilename = () => {
      const hash = crypto.randomBytes(20).toString('hex');
      return `products/pet-${hash}`;
    };
    // generate unique options
    const generateOptions = (mimetype) => {
      const uuid = uuidv4();
      return {
        gzip: true,
        contentType: mimetype,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: uuid,
          },
        },
      };
    };
    try {
      // parallel request
      await Promise.all(
        req.files.map((file) => {
          const filename = generateFilename();
          const options = generateOptions(file.mimetype);
          // generate imgUrl
          const encode = encodeURIComponent(filename);
          const uuid = options.metadata.metadata.firebaseStorageDownloadTokens;
          const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encode}?alt=media&token=${uuid}`;
          imgUrls.push(imgUrl);
          return bucket.file(filename).save(file.buffer, options);
        }),
      );
      return res.send({ success: true, imgUrls });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

module.exports = router;