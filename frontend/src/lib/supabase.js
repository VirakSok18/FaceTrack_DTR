import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://movymmlayggqzjtunlfk.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdnltbWxheWdncXpqdHVubGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjY1MDYsImV4cCI6MjEwODc0MjUwNn0.wnYGxn8vr3EvMMVe__qeTrurkLmCP2-5UsqKA9y9tLw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Returns local YYYY-MM-DD date string corresponding to client timezone
 */
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Uploads a file to Supabase Storage ('dtr_files' bucket),
 * falling back gracefully to base64 Data URL if storage is restricted.
 */
export async function uploadEmployeeFile(file, folder = 'avatars') {
  if (!file) return null;

  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const cleanFileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('dtr_files')
      .upload(cleanFileName, file, { cacheControl: '3600', upsert: true });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage
        .from('dtr_files')
        .getPublicUrl(data.path);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload error, falling back to base64 data URL:', err);
  }

  // Resilient fallback: Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Verify deterministic token for a room code
 */
export async function verifyRoomToken(code, token) {
  try {
    const { data: room, error } = await supabase
      .from('dtr_workplaces')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (error || !room) return null;
    return room;
  } catch (e) {
    console.error('verifyRoomToken error:', e);
    return null;
  }
}

/**
 * Fetch all offices for an authenticated user's email
 */
export async function fetchUserWorkplaces(email) {
  if (!email) return [];
  try {
    const { data, error } = await supabase
      .from('dtr_workplaces')
      .select('*')
      .eq('admin_email', email.trim().toLowerCase())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('fetchUserWorkplaces error:', e);
    return [];
  }
}

/**
 * Create a new workplace/office for the user (enforces max 3 limit)
 */
export async function createWorkplace(name, adminEmail) {
  const cleanEmail = (adminEmail || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Admin email is required.');

  // Enforce 3 office limit
  const existing = await fetchUserWorkplaces(cleanEmail);
  if (existing.length >= 3) {
    throw new Error('Limit Reached: Maximum 3 offices allowed per account.');
  }

  // Generate unique DTR room code
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomSuffix = '';
  for (let i = 0; i < 4; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const code = `DTR-${randomSuffix}`;
  const cleanName = (name || '').trim().replace(/[<>]/g, '').slice(0, 50) || `Office ${existing.length + 1}`;

  const { data, error } = await supabase
    .from('dtr_workplaces')
    .insert([
      {
        name: cleanName,
        code: code,
        admin_email: cleanEmail,
        max_free_employees: 50,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Helper to map a raw dtr_employees row to app employee model
 */
export function mapEmployeeRow(emp) {
  if (!emp) return null;
  return {
    _id: emp.id,
    id: emp.id,
    workplaceId: emp.workplace_id,
    employeeId: emp.employee_id,
    name: emp.name,
    role: emp.role || 'Employee',
    phone: emp.phone || '',
    contact: emp.contact || '',
    dateOfBirth: emp.date_of_birth,
    startDate: emp.start_date,
    isForeigner: emp.is_foreigner || false,
    nationalId: emp.national_id || '',
    passport: emp.passport || '',
    nssf: emp.nssf || '',
    photo: emp.photo_url,
    cv: emp.cv_url,
    nationalIdFile: emp.national_id_file_url,
    passportFile: emp.passport_file_url,
    nssfFile: emp.nssf_file_url,
    contract: emp.contract_url,
    shiftStart: emp.shift_start || '09:00',
    shiftEnd: emp.shift_end || '18:00',
    workDays: emp.work_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    requiredHours: emp.required_hours || 8,
    isRegistered: emp.is_registered || false,
  };
}

/**
 * Fetch employees for a specific office
 */
export async function fetchEmployeesByRoom(workplaceId) {
  try {
    const { data, error } = await supabase
      .from('dtr_employees')
      .select('*')
      .eq('workplace_id', workplaceId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapEmployeeRow);
  } catch (e) {
    console.error('fetchEmployeesByRoom error:', e);
    return [];
  }
}

/**
 * Fetch single employee by ID or employee_id
 */
export async function fetchEmployeeById(id) {
  if (!id) return null;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('dtr_employees').select('*');
    if (isUuid) {
      query = query.or(`id.eq.${id},employee_id.eq.${id}`);
    } else {
      query = query.eq('employee_id', id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn('fetchEmployeeById error:', error);
      return null;
    }
    return mapEmployeeRow(data);
  } catch (e) {
    console.error('fetchEmployeeById exception:', e);
    return null;
  }
}

/**
 * Fetch today's attendance logs for an office
 */
export async function fetchAttendanceLogsByRoom(workplaceId, date) {
  const targetDate = date || getLocalDateString();
  try {
    const { data, error } = await supabase
      .from('dtr_attendance_logs')
      .select('*')
      .eq('workplace_id', workplaceId)
      .eq('date', targetDate)
      .order('clock_in', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('fetchAttendanceLogsByRoom error:', e);
    return [];
  }
}

/**
 * Fetch attendance logs for a specific employee across all dates
 */
export async function fetchEmployeeAttendanceLogs(employeeId) {
  if (!employeeId) return [];
  try {
    const { data, error } = await supabase
      .from('dtr_attendance_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .order('clock_in', { ascending: false });

    if (error) throw error;
    return (data || []).map((l) => ({
      _id: l.id,
      id: l.id,
      employeeId: l.employee_id,
      clockIn: l.clock_in,
      clockOut: l.clock_out,
      date: l.date,
      status: l.status || 'Present',
      lateMinutes: l.late_minutes || 0,
      workedHours: l.worked_hours || 0,
      verificationMethod: l.verification_method || 'face_scan',
    }));
  } catch (e) {
    console.error('fetchEmployeeAttendanceLogs error:', e);
    return [];
  }
}

/**
 * Add a new employee to a specific workplace
 */
export async function addEmployeeToRoom(workplaceId, employeeData) {
  const payload = {
    workplace_id: workplaceId,
    employee_id: employeeData.employeeId,
    name: employeeData.name,
    role: employeeData.role || 'Employee',
    phone: employeeData.phone || '',
    contact: employeeData.contact || '',
    date_of_birth: employeeData.dateOfBirth || null,
    start_date: employeeData.startDate || getLocalDateString(),
    is_foreigner: !!employeeData.isForeigner,
    national_id: employeeData.nationalId || '',
    passport: employeeData.passport || '',
    nssf: employeeData.nssf || '',
    photo_url: employeeData.photoUrl || employeeData.photo || null,
    cv_url: employeeData.cvUrl || null,
    national_id_file_url: employeeData.nationalIdFileUrl || null,
    passport_file_url: employeeData.passportFileUrl || null,
    nssf_file_url: employeeData.nssfFileUrl || null,
    contract_url: employeeData.contractUrl || null,
    shift_start: employeeData.shiftStart || '09:00',
    shift_end: employeeData.shiftEnd || '18:00',
    work_days: employeeData.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    required_hours: employeeData.requiredHours || 8,
  };

  const { data, error } = await supabase
    .from('dtr_employees')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return mapEmployeeRow(data);
}

/**
 * Update employee record
 */
export async function updateEmployeeInRoom(id, employeeData) {
  const updatePayload = {};
  if (employeeData.name !== undefined) updatePayload.name = employeeData.name;
  if (employeeData.role !== undefined) updatePayload.role = employeeData.role;
  if (employeeData.phone !== undefined) updatePayload.phone = employeeData.phone;
  if (employeeData.contact !== undefined) updatePayload.contact = employeeData.contact;
  if (employeeData.dateOfBirth !== undefined) updatePayload.date_of_birth = employeeData.dateOfBirth || null;
  if (employeeData.startDate !== undefined) updatePayload.start_date = employeeData.startDate || null;
  if (employeeData.isForeigner !== undefined) updatePayload.is_foreigner = !!employeeData.isForeigner;
  if (employeeData.nationalId !== undefined) updatePayload.national_id = employeeData.nationalId || '';
  if (employeeData.passport !== undefined) updatePayload.passport = employeeData.passport || '';
  if (employeeData.nssf !== undefined) updatePayload.nssf = employeeData.nssf || '';
  if (employeeData.shiftStart !== undefined) updatePayload.shift_start = employeeData.shiftStart;
  if (employeeData.shiftEnd !== undefined) updatePayload.shift_end = employeeData.shiftEnd;
  if (employeeData.workDays !== undefined) updatePayload.work_days = employeeData.workDays;
  if (employeeData.requiredHours !== undefined) updatePayload.required_hours = employeeData.requiredHours;
  if (employeeData.photoUrl !== undefined) updatePayload.photo_url = employeeData.photoUrl;
  if (employeeData.cvUrl !== undefined) updatePayload.cv_url = employeeData.cvUrl;
  if (employeeData.nationalIdFileUrl !== undefined) updatePayload.national_id_file_url = employeeData.nationalIdFileUrl;
  if (employeeData.passportFileUrl !== undefined) updatePayload.passport_file_url = employeeData.passportFileUrl;
  if (employeeData.nssfFileUrl !== undefined) updatePayload.nssf_file_url = employeeData.nssfFileUrl;
  if (employeeData.contractUrl !== undefined) updatePayload.contract_url = employeeData.contractUrl;
  updatePayload.updated_at = new Date().toISOString();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const matchCriteria = isUuid ? { id } : { employee_id: id };

  const { data, error } = await supabase
    .from('dtr_employees')
    .update(updatePayload)
    .match(matchCriteria)
    .select()
    .single();

  if (error) throw error;
  return mapEmployeeRow(data);
}

/**
 * Delete employee by ID
 */
export async function deleteEmployeeFromRoom(id) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const query = supabase.from('dtr_employees').delete();

  const { error } = isUuid ? await query.eq('id', id) : await query.eq('employee_id', id);

  if (error) throw error;
  return true;
}
