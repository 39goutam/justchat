const express = require('express');
const { body, validationResult } = require('express-validator');
const { generateGuestToken } = require('../utils/jwt');

const router = express.Router();

/**
 * POST /api/auth/guest
 * Generate guest token
 */
router.post('/guest',
  body('name').optional().trim().isLength({ min: 1, max: 50 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const name = req.body.name || 'Guest';
    const { token, userId } = generateGuestToken(name);

    res.json({
      token,
      userId,
      name,
      isGuest: true
    });
  }
);

/**
 * POST /api/auth/verify
 * Verify token (useful for debugging)
 */
router.post('/verify',
  body('token').notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { verifyToken } = require('../utils/jwt');
      const payload = verifyToken(req.body.token);
      res.json({ valid: true, payload });
    } catch (error) {
      res.status(401).json({ valid: false, error: error.message });
    }
  }
);

module.exports = router;const express = require('express');
const { body, validationResult } = require('express-validator');
const { generateGuestToken } = require('../utils/jwt');

const router = express.Router();

/**
 * POST /api/auth/guest
 * Generate guest token
 */
router.post('/guest',
  body('name').optional().trim().isLength({ min: 1, max: 50 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const name = req.body.name || 'Guest';
    const { token, userId } = generateGuestToken(name);

    res.json({
      token,
      userId,
      name,
      isGuest: true
    });
  }
);

/**
 * POST /api/auth/verify
 * Verify token (useful for debugging)
 */
router.post('/verify',
  body('token').notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { verifyToken } = require('../utils/jwt');
      const payload = verifyToken(req.body.token);
      res.json({ valid: true, payload });
    } catch (error) {
      res.status(401).json({ valid: false, error: error.message });
    }
  }
);

module.exports = router;