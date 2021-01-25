const multer = require('multer');

module.exports = {
  upload: multer({
    storage: multer.memoryStorage(),
    fileFilter(req, file, cb) {
      const regex = /[/.](jpe?g|gif|png|webp)$/i;
      if (regex.test(file.mimetype)) return cb(null, true);
      return cb(new Error('Invalid image type'), false);
    },
    limits: { fileSize: 1024 * 1024 }, // 1MB (byte)
  }),
  // eslint-disable-next-line no-unused-vars
  errorHandle(err, req, res, next) {
    if (err.message === 'Invalid image type')
      return res.send({ success: false, message: '不支援的檔案格式' });
    if (err.message === 'File too large')
      return res.send({ success: false, message: '超過圖片限制大小' });
    if (err.code === 'LIMIT_UNEXPECTED_FILE' && err.field === 'images')
      return res.send({ success: false, message: '超過圖片上傳數量限制' });
    if (err.code === 'LIMIT_UNEXPECTED_FILE')
      return res.send({ success: false, message: '欄位名稱不正確' });
    return res.send({ success: false, message: err.message });
  },
};
