import epxress from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../../connection/firebase-admin';

const router = epxress.Router();

/* add product */
router.post(
  '/',
  body('title').notEmpty().isString(),
  body('category').notEmpty().isString(),
  body('origin_price').notEmpty().isInt().toInt(),
  body('price').notEmpty().isInt().toInt(),
  body('unit').notEmpty().isString(),
  body('description').notEmpty().isString(),
  body('content').notEmpty().isString(),
  body('is_enabled').notEmpty().isBoolean().toBoolean(),
  body('sales').notEmpty().isInt().toInt(),
  body('stock').notEmpty().isInt().toInt(),
  body('img_urls').notEmpty().isArray().toArray(),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    // create data
    const product = {
      title: req.body.title,
      category: req.body.category,
      origin_price: req.body.origin_price,
      price: req.body.price,
      unit: req.body.unit,
      description: req.body.description,
      content: req.body.content,
      is_enabled: req.body.is_enabled,
      sales: req.body.sales,
      stock: req.body.stock,
      img_urls: req.body.img_urls,
      created_at: Date.now(),
    };
    try {
      // add product
      await db.ref('/products').push(product);
      // end
      return res.send({ success: true, message: '已新增產品' });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* get products */
router.get('/', async (req, res) => {
  try {
    // get products
    const products = (await db.ref('/products').once('value')).val() || {};
    // convert from object to array
    const productsToArray = Object.keys(products).map((pId) => {
      return {
        id: pId,
        ...products[pId],
      };
    });
    // end
    return res.send({ success: true, products: productsToArray });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

/* edit product */
router.patch('/:id', param('id').notEmpty().isString(), async (req, res) => {
  // check param
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
  const { id } = req.params;
  const updateProduct = req.body;
  try {
    // check product
    const product = (await db.ref(`/products/${id}`).once('value')).val();
    if (!product) throw new Error('custom/product-not-found');
    // check body
    const valid = Object.keys(updateProduct).every((key) => {
      return product[key] && typeof product[key] === typeof updateProduct[key];
    });
    if (!valid) throw new Error('custom/invalid-property');
    // end
    await db.ref(`/products/${id}`).update(updateProduct);
    return res.send({ success: true, message: '已修改產品' });
  } catch (error) {
    if (error.message === 'custom/product-not-found')
      return res.send({ success: false, message: '未找到商品' }); // product-not-found
    if (error.message === 'custom/invalid-property')
      return res.send({ success: false, message: '無效屬性' }); // invalid-property
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

export default router;
