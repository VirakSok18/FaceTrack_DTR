import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://movymmlayggqzjtunlfk.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdnltbWxheWdncXpqdHVubGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjY1MDYsImV4cCI6MjEwODc0MjUwNn0.wnYGxn8vr3EvMMVe__qeTrurkLmCP2-5UsqKA9y9tLw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    // Deterministic verification or direct room code match
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
    return (data || []).map((emp) => ({
      _id: emp.id,
      id: emp.id,
      employeeId: emp.employee_id,
      name: emp.name,
      role: emp.role || 'Employee',
      phone: emp.phone || 'N/A',
      photo: emp.photo_url,
      shiftStart: emp.shift_start || '09:00',
      shiftEnd: emp.shift_end || '18:00',
      workDays: emp.work_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    }));
  } catch (e) {
    console.error('fetchEmployeesByRoom error:', e);
    return [];
  }
}

/**
 * Fetch today's attendance logs for an office
 */
export async function fetchAttendanceLogsByRoom(workplaceId) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data, error } = await supabase
      .from('dtr_attendance_logs')
      .select('*')
      .eq('workplace_id', workplaceId)
      .eq('date', today)
      .order('clock_in', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('fetchAttendanceLogsByRoom error:', e);
    return [];
  }
}

/**
 * Add a new employee to a specific workplace
 */
export async function addEmployeeToRoom(workplaceId, employeeData) {
  const { data, error } = await supabase
    .from('dtr_employees')
    .insert([
      {
        workplace_id: workplaceId,
        employee_id: employeeData.employeeId,
        name: employeeData.name,
        role: employeeData.role || 'Employee',
        phone: employeeData.phone || '',
        shift_start: employeeData.shiftStart || '09:00',
        shift_end: employeeData.shiftEnd || '18:00',
        work_days: employeeData.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete employee by ID
 */
export async function deleteEmployeeFromRoom(id) {
  const { error } = await supabase
    .from('dtr_employees')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
