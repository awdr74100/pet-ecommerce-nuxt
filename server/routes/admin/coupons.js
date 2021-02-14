import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../../connection/firebase-admin';

const router = express.Router();

/* Add Coupon */
router.post(
  '/',
  body('title').isString().isLength({ min: 1 }),
  body('code').isString().isLength({ min: 6, max: 10 }).isUppercase(),
  body('percent').isInt({ min: 0, max: 100 }).toInt(),
  body('effective_date').isInt({ min: 0 }).toInt(),
  body('due_date').isInt({ min: 0 }).toInt(),
  body('is_enabled').isBoolean().toBoolean(),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    // set coupon
    const coupon = {
      title: req.body.title,
      code: req.body.code,
      percent: req.body.percent,
      effective_date: req.body.effective_date,
      due_date: req.body.due_date,
      is_enabled: req.body.is_enabled,
      created_at: Date.now(),
    };
    try {
      // add coupon
      await db.ref('/coupons').push(coupon);
      // end
      return res.send({ success: true, message: '已新增優惠卷' });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* Get Coupons */
router.get('/', async (req, res) => {
  try {
    // get coupons
    const coupons = (await db.ref('/coupons').once('value')).val() || {};
    // convert object to array
    const couponsConvert = Object.keys(coupons).map((id) => {
      return { id, ...coupons[id] };
    });
    // end
    return res.send({ success: true, coupons: couponsConvert });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

/* Edit Coupon */
router.patch(
  '/:id',
  param('id').isString().isLength({ min: 1 }),
  async (req, res) => {
    // check param
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { id } = req.params;
    const updateCoupon = req.body;
    try {
      // check coupon
      const coupon = (await db.ref(`/coupons/${id}`).once('value')).val();
      if (!coupon) throw new Error('custom/coupon-not-found');
      // check payload
      const valid = Object.keys(updateCoupon).every((key) => {
        return (
          coupon[key] &&
          typeof coupon[key] === typeof updateCoupon[key] &&
          Array.isArray(coupon[key]) === Array.isArray(updateCoupon[key])
        );
      });
      if (!valid) throw new Error('custom/invalid-property');
      // update coupon
      await db.ref(`/coupons/${id}`).update(updateCoupon);
      // end
      return res.send({ success: true, message: '已修改優惠卷' });
    } catch (error) {
      if (error.message === 'custom/coupon-not-found')
        return res.send({ success: false, message: '未找到優惠卷' }); // coupon-not-found
      if (error.message === 'custom/invalid-property')
        return res.send({ success: false, message: '無效屬性' }); // invalid-property
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

export default router;
