import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../../connection/firebase-admin';

const router = express.Router();

/* Add Product */
router.post(
  '/',
  body('title').isString().isLength({ min: 1 }),
  body('category').isString().isLength({ min: 1 }),
  body('description').isString().isLength({ min: 0 }),
  body('content').isString().isLength({ min: 0 }),
  body('unit').isString().isLength({ min: 1 }),
  body('origin_price').isInt({ min: 0 }).toInt(),
  body('price').isInt({ min: 0 }).toInt(),
  body('sales').isInt({ min: 0 }).toInt(),
  body('stock').isInt({ min: 0 }).toInt(),
  body('img_urls').isArray({ min: 1 }).toArray(),
  body('is_enabled').isBoolean().toBoolean(),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    // set product
    const product = {
      title: req.body.title,
      category: req.body.category,
      origin_price: req.body.origin_price,
      price: req.body.price,
      unit: req.body.unit,
      description: req.body.description,
      content: req.body.content,
      sales: req.body.sales,
      stock: req.body.stock,
      img_urls: req.body.img_urls,
      is_enabled: req.body.is_enabled,
      created_at: Date.now(),
    };
    try {
      // add product
      await db.ref('/products').push(product);
      // end
      return res.send({ success: true, message: '已新增商品' });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* Get Products */
router.get('/', async (req, res) => {
  try {
    // get products
    const products = (await db.ref('/products').once('value')).val() || {};
    // convert object to array
    const productsConvert = Object.keys(products).map((id) => {
      return { id, ...products[id] };
    });
    // end
    return res.send({ success: true, products: productsConvert });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

/* Edit Product */
router.patch(
  '/:id',
  param('id').isString().isLength({ min: 1 }),
  async (req, res) => {
    // check param
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { id } = req.params;
    const updateProduct = req.body;
    try {
      // check product
      const product = (await db.ref(`/products/${id}`).once('value')).val();
      if (!product) throw new Error('custom/product-not-found');
      // check payload
      const valid = Object.keys(updateProduct).every((key) => {
        return (
          product[key] &&
          typeof product[key] === typeof updateProduct[key] &&
          Array.isArray(product[key]) === Array.isArray(updateProduct[key])
        );
      });
      if (!valid) throw new Error('custom/invalid-property');
      // update product
      await db.ref(`/products/${id}`).update(updateProduct);
      // end
      return res.send({ success: true, message: '已修改商品' });
    } catch (error) {
      if (error.message === 'custom/product-not-found')
        return res.send({ success: false, message: '未找到商品' }); // product-not-found
      if (error.message === 'custom/invalid-property')
        return res.send({ success: false, message: '無效屬性' }); // invalid-property
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* Change Products Enabled Status */
router.patch(
  '/:ids/is_enabled',
  param('ids').isString().isLength({ min: 1 }),
  body('status').isBoolean().toBoolean(),
  async (req, res) => {
    // check param and body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const [{ ids }, { status }] = [req.params, req.body];
    // convert string to array
    const idsConvert = ids.split(',').map((id) => id.trim());
    try {
      // check ids exists
      const products = (await db.ref('/products').once('value')).val() || {};
      const exists = idsConvert.every((id) => products[id]);
      if (!exists) throw new Error('custom/product-not-found');
      // check ids length
      if (idsConvert.length >= 20) throw new Error('custom/over-length-limit');
      // change products enabled status
      const updateProducts = idsConvert.reduce((acc, id) => {
        return { ...acc, [`${id}/is_enabled`]: status };
      }, {});
      await db.ref('/products').update(updateProducts);
      // end
      return res.send({ success: true, message: '已修改商品狀態' });
    } catch (error) {
      if (error.message === 'custom/product-not-found')
        return res.send({ success: false, message: '找不到部分商品' });
      if (error.message === 'custom/over-length-limit')
        return res.send({ success: false, message: '超過批量處理上限' });
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* Delete Products */
router.delete(
  '/:ids',
  param('ids').isString().isLength({ min: 1 }),
  async (req, res) => {
    // check param
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { ids } = req.params;
    // convert string to array
    const idsConvert = ids.split(',').map((id) => id.trim());
    try {
      // check ids exists
      const products = (await db.ref('/products').once('value')).val() || {};
      const exists = idsConvert.every((id) => products[id]);
      if (!exists) throw new Error('custom/product-not-found');
      // check ids length
      if (idsConvert.length >= 20) throw new Error('custom/over-length-limit');
      // delete products
      const updateProducts = idsConvert.reduce((acc, id) => {
        return { ...acc, [`${id}`]: null };
      }, {});
      await db.ref('/products').update(updateProducts);
      // end
      return res.send({ success: true, message: '已刪除商品' });
    } catch (error) {
      if (error.message === 'custom/product-not-found')
        return res.send({ success: false, message: '找不到部分商品' });
      if (error.message === 'custom/over-length-limit')
        return res.send({ success: false, message: '超過批量處理上限' });
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

export default router;
