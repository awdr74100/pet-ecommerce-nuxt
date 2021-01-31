import multer from 'multer';
import convert from 'heic-convert';

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    const regex = /\.(jpe?g|gif|png|bmp|webp|heic)$/i;
    if (regex.test(file.originalname)) return cb(null, true);
    return cb(new Error('Invalid image type'), false);
  },
  limits: { fileSize: 1024 * 1024 }, // 1MB (byte)
});

export const convertHEIC = async (req, res, next) => {
  const heicIndexArray = req.files.reduce((arr, file, index) => {
    const regex = /\.(heic)$/i;
    return regex.test(file.originalname) ? [...arr, index] : arr;
  }, []);
  if (!heicIndexArray.length) return next();
  const buffers = await Promise.all(
    heicIndexArray.map((heicIndex) => {
      const { buffer } = req.files[heicIndex];
      return convert({ buffer, format: 'JPEG', quality: 0.75 });
    }),
  );
  buffers.forEach((buffer, index) => {
    const heicIndex = heicIndexArray[index];
    const { originalname } = req.files[heicIndex];
    req.files[heicIndex].originalname = `${originalname.split('.')[0]}.jpg`;
    req.files[heicIndex].mimetype = 'image/jpeg';
    req.files[heicIndex].buffer = buffer;
    req.files[heicIndex].size = buffer.byteLength;
  });
  const err = req.files.some((file) => file.size > 1024 * 1024); // 1MB (byte)
  if (err) return next(new Error('File too large'));
  return next();
};

// eslint-disable-next-line no-unused-vars
export const errorHandle = (err, req, res, next) => {
  if (err.message === 'Invalid image type')
    return res.send({ success: false, message: '不支援的檔案格式' });
  if (err.message === 'File too large')
    return res.send({ success: false, message: '超過圖片限制大小' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE' && err.field === 'images')
    return res.send({ success: false, message: '超過圖片數量限制' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE')
    return res.send({ success: false, message: '欄位名稱不正確' });
  return res.send({ success: false, message: err.message });
};
