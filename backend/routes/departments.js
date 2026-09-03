import express from 'express';
import { Department } from '../models/Department.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const departments = await Department.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: departments });
  } catch (error) {
    logger.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
