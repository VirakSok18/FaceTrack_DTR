import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeController.js';

const router = express.Router();

import upload from '../config/multer.js';

router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.post('/', upload.fields([
  { name: 'photo' },
  { name: 'cv' },
  { name: 'nationalIdFile' },
  { name: 'passportFile' },
  { name: 'nssfFile' },
  { name: 'contract' }
]), createEmployee);
router.put('/:id', upload.fields([
  { name: 'photo' },
  { name: 'cv' },
  { name: 'nationalIdFile' },
  { name: 'passportFile' },
  { name: 'nssfFile' },
  { name: 'contract' }
]), updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;