import Employee from '../models/Employee.js';
import { cloudinary } from '../config/cloudinary.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Helper to generate 8-digit Employee ID
const generateEmployeeId = async () => {
  let unique = false;
  let id = '';
  while (!unique) {
    id = crypto.randomInt(10000000, 99999999).toString();
    const existing = await Employee.findOne({ employeeId: id });
    if (!existing) unique = true;
  }
  return id;
};

export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    let employee = await Employee.findOne({ employeeId: id });

    if (!employee && id.match(/^[0-9a-fA-F]{24}$/)) {
      employee = await Employee.findById(id);
    }

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const employeeId = await generateEmployeeId();

    // Extract file info if present
    const photoFile = req.files?.photo?.[0];
    const cvFile = req.files?.cv?.[0];
    const nationalIdFile = req.files?.nationalIdFile?.[0];
    const passportFile = req.files?.passportFile?.[0];
    const nssfFile = req.files?.nssfFile?.[0];
    const contractFile = req.files?.contract?.[0];

    // ---------------------------------------------------------
    // HYBRID STORAGE LOGIC
    // ---------------------------------------------------------

    // 1. PHOTO: Upload to Cloudinary, then delete local file
    let photoData = { url: '', public_id: '' };
    if (photoFile) {
      try {
        const result = await cloudinary.uploader.upload(photoFile.path, {
          folder: 'employee_photos',
          resource_type: 'image'
        });
        photoData = {
          url: result.secure_url,
          public_id: result.public_id
        };
        // Clean up local photo
        fs.unlinkSync(photoFile.path);
      } catch (uploadError) {
        console.error("Photo upload failed:", uploadError);
        // Fallback: keep local if upload fails? Or just error out? 
        // For now, let's keep it local if cloud fails, or just throw.
        // Let's assume critical failure if photo doesn't upload.
        throw new Error('Failed to upload photo to cloud');
      }
    }

    // 2. CV and other documents: Keep Local
    const processLocalFile = (file) => {
      if (!file) return { url: '', public_id: '' };
      return {
        url: `/uploads/${file.filename}`,
        public_id: null
      };
    };

    let cvData = processLocalFile(cvFile);
    let nationalIdFileData = processLocalFile(nationalIdFile);
    let passportFileData = processLocalFile(passportFile);
    let nssfFileData = processLocalFile(nssfFile);
    let contractData = processLocalFile(contractFile);

    const employee = new Employee({
      employeeId,
      name: req.body.name,
      dateOfBirth: req.body.dateOfBirth,
      startDate: req.body.startDate,
      contact: req.body.contact,
      phone: req.body.phone,
      isForeigner: req.body.isForeigner === 'true' || req.body.isForeigner === true,
      nationalId: req.body.nationalId || '',
      passport: req.body.passport || '',
      nssf: req.body.nssf || '',
      role: req.body.role || 'Software Engineer',
      photo: photoData,
      cv: cvData,
      nationalIdFile: nationalIdFileData,
      passportFile: passportFileData,
      nssfFile: nssfFileData,
      contract: contractData,
      workDays: req.body.workDays ? JSON.parse(req.body.workDays) : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      shiftStart: req.body.shiftStart || '09:00',
      shiftEnd: req.body.shiftEnd || '18:00',
      requiredHours: req.body.requiredHours || 8
    });

    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    let employee = await Employee.findOne({ employeeId: id });

    if (!employee && id.match(/^[0-9a-fA-F]{24}$/)) {
      employee = await Employee.findById(id);
    }

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Handle new files
    // Handle new files
    if (req.files?.photo?.[0]) {
      // Delete old photo from Cloudinary if exists
      if (employee.photo?.public_id) {
        await cloudinary.uploader.destroy(employee.photo.public_id);
      }

      // Upload new photo
      const photoFile = req.files.photo[0];
      const result = await cloudinary.uploader.upload(photoFile.path, {
        folder: 'employee_photos',
        resource_type: 'image'
      });

      employee.photo = {
        url: result.secure_url,
        public_id: result.public_id
      };

      // Delete local temp file
      fs.unlinkSync(photoFile.path);
    }

    if (req.files?.cv?.[0]) {
      // Delete old local CV if exists
      if (employee.cv?.url && employee.cv.url.startsWith('/uploads/')) {
        const oldFileName = path.basename(employee.cv.url);
        const oldFilePath = path.join(process.cwd(), 'uploads', oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      // Also check if it was previously on cloud (legacy support)
      if (employee.cv?.public_id) {
        await cloudinary.uploader.destroy(employee.cv.public_id);
      }

      // Set new local CV
      employee.cv = {
        url: `/uploads/${req.files.cv[0].filename}`,
        public_id: null
      };
    }

    // Helper for other local document files
    const updateLocalFile = (fileObj, fieldName) => {
      if (fileObj) {
        if (employee[fieldName]?.url && employee[fieldName].url.startsWith('/uploads/')) {
          const oldFileName = path.basename(employee[fieldName].url);
          const oldFilePath = path.join(process.cwd(), 'uploads', oldFileName);
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }
        employee[fieldName] = { url: `/uploads/${fileObj.filename}`, public_id: null };
      }
    };

    if (req.files?.nationalIdFile?.[0]) updateLocalFile(req.files.nationalIdFile[0], 'nationalIdFile');
    if (req.files?.passportFile?.[0]) updateLocalFile(req.files.passportFile[0], 'passportFile');
    if (req.files?.nssfFile?.[0]) updateLocalFile(req.files.nssfFile[0], 'nssfFile');
    if (req.files?.contract?.[0]) updateLocalFile(req.files.contract[0], 'contract');

    // Update text fields
    const allowedUpdates = ['name', 'dateOfBirth', 'startDate', 'contact', 'phone', 'isForeigner', 'nationalId', 'passport', 'nssf', 'role', 'workDays', 'shiftStart', 'shiftEnd', 'requiredHours', 'isRegistered'];
    allowedUpdates.forEach(update => {
      if (req.body[update] !== undefined) {
        if (update === 'workDays' && typeof req.body[update] === 'string') {
          employee[update] = JSON.parse(req.body[update]);
        } else {
          employee[update] = req.body[update];
        }
      }
    });

    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    let employee = await Employee.findOne({ employeeId: id });

    if (!employee && id.match(/^[0-9a-fA-F]{24}$/)) {
      employee = await Employee.findById(id);
    }

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete files from Cloudinary
    // Delete files
    // 1. Photo (Cloudinary)
    if (employee.photo?.public_id) {
      await cloudinary.uploader.destroy(employee.photo.public_id);
    }

    // 2. Local documents (CV, IDs, Contract)
    const deleteLocalFile = (fileField) => {
      if (fileField?.public_id) {
        cloudinary.uploader.destroy(fileField.public_id).catch(e => console.error(e));
      } else if (fileField?.url && fileField.url.startsWith('/uploads/')) {
        const fileName = path.basename(fileField.url);
        const filePath = path.join(process.cwd(), 'uploads', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    };

    deleteLocalFile(employee.cv);
    deleteLocalFile(employee.nationalIdFile);
    deleteLocalFile(employee.passportFile);
    deleteLocalFile(employee.nssfFile);
    deleteLocalFile(employee.contract);

    // Delete entries from Python Face Server
    try {
      await fetch(`http://localhost:5001/delete-face/${employee.employeeId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete face data from Python server:', err.message);
    }

    await Employee.deleteOne({ _id: employee._id });
    res.json({ success: true, message: 'Employee, files, and face data deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};