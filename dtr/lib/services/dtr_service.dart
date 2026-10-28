import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/api_config.dart';
import '../models/employee.dart';
import '../models/attendance_log.dart';

class ClockResult {
  final bool success;
  final String action; // 'Clock In' or 'Clock Out'
  final String employeeName;
  final String employeeId;
  final String message;
  final DateTime timestamp;
  final bool isDeniedWrongOffice;
  final String? assignedOfficeName;

  ClockResult({
    required this.success,
    required this.action,
    required this.employeeName,
    required this.employeeId,
    required this.message,
    DateTime? timestamp,
    this.isDeniedWrongOffice = false,
    this.assignedOfficeName,
  }) : timestamp = timestamp ?? DateTime.now();
}

class DtrService {
  static final DtrService _instance = DtrService._internal();
  factory DtrService() => _instance;
  DtrService._internal();

  SupabaseClient get _supabase => Supabase.instance.client;

  /// Fetch all employees for a specific room/office
  Future<List<Employee>> getEmployees(String workplaceId) async {
    try {
      final data = await _supabase
          .from('dtr_employees')
          .select('*')
          .eq('workplace_id', workplaceId)
          .order('name', ascending: true);

      return (data as List)
          .map((row) => Employee.fromJson(row as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[DtrService] getEmployees error: $e');
      return [];
    }
  }

  /// Check if employee belongs to the current room.
  /// If not, determines if they belong to another office.
  Future<Map<String, dynamic>> verifyRoomAccess({
    required String employeeId,
    required String currentWorkplaceId,
  }) async {
    try {
      // 1. Check if employee is registered in THIS office
      final inThisRoom = await _supabase
          .from('dtr_employees')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('workplace_id', currentWorkplaceId)
          .maybeSingle();

      if (inThisRoom != null) {
        return {
          'allowed': true,
          'employee': Employee.fromJson(inThisRoom),
        };
      }

      // 2. Check if employee belongs to ANOTHER office
      final otherRoomEmp = await _supabase
          .from('dtr_employees')
          .select('*, dtr_workplaces(name)')
          .eq('employee_id', employeeId)
          .maybeSingle();

      if (otherRoomEmp != null) {
        final workplace = otherRoomEmp['dtr_workplaces'] as Map<String, dynamic>?;
        final assignedName = workplace?['name']?.toString() ?? 'Another Office';
        return {
          'allowed': false,
          'reason': 'wrong_office',
          'employeeName': otherRoomEmp['name']?.toString() ?? employeeId,
          'assignedOfficeName': assignedName,
        };
      }

      return {
        'allowed': false,
        'reason': 'not_found',
      };
    } catch (e) {
      debugPrint('[DtrService] verifyRoomAccess error: $e');
      return {'allowed': false, 'reason': 'error'};
    }
  }

  /// Clock In or Clock Out an employee for a specific room
  Future<ClockResult> clockInOrOut({
    required String employeeId,
    required String workplaceId,
    required String currentOfficeName,
  }) async {
    // 1. Verify employee belongs to this room
    final access = await verifyRoomAccess(
      employeeId: employeeId,
      currentWorkplaceId: workplaceId,
    );

    if (access['allowed'] != true) {
      if (access['reason'] == 'wrong_office') {
        final empName = access['employeeName'] ?? employeeId;
        final assignedOffice = access['assignedOfficeName'] ?? 'their registered office';
        return ClockResult(
          success: false,
          action: 'Access Denied',
          employeeName: empName,
          employeeId: employeeId,
          isDeniedWrongOffice: true,
          assignedOfficeName: assignedOffice,
          message: 'Access Denied: $empName is assigned to "$assignedOffice". Clock-in is only permitted at your designated office.',
        );
      }
      return ClockResult(
        success: false,
        action: 'Denied',
        employeeName: employeeId,
        employeeId: employeeId,
        message: 'Employee ID "$employeeId" is not registered in this office.',
      );
    }

    final employee = access['employee'] as Employee;
    final today = DateTime.now().toIso8601String().split('T')[0];

    try {
      // 2. Check today's active attendance log for this office
      final existingLogs = await _supabase
          .from('dtr_attendance_logs')
          .select('*')
          .eq('workplace_id', workplaceId)
          .eq('employee_id', employeeId)
          .eq('date', today)
          .order('clock_in', ascending: false)
          .limit(1);

      if (existingLogs.isNotEmpty && existingLogs.first['clock_out'] == null) {
        // Clock Out action
        final log = existingLogs.first;
        final clockInTime = DateTime.parse(log['clock_in'].toString());
        final now = DateTime.now();
        final hours = now.difference(clockInTime).inMinutes / 60.0;

        await _supabase
            .from('dtr_attendance_logs')
            .update({
              'clock_out': now.toIso8601String(),
              'worked_hours': double.parse(hours.toStringAsFixed(2)),
            })
            .eq('id', log['id']);

        return ClockResult(
          success: true,
          action: 'Clock Out',
          employeeName: employee.name,
          employeeId: employeeId,
          timestamp: now,
          message: 'Clock Out recorded successfully for ${employee.name}',
        );
      } else {
        // Clock In action
        final now = DateTime.now();
        final shiftParts = employee.shiftStart.split(':');
        int lateMin = 0;
        String status = 'Present';

        if (shiftParts.length == 2) {
          final shiftHour = int.tryParse(shiftParts[0]) ?? 9;
          final shiftMinute = int.tryParse(shiftParts[1]) ?? 0;
          final expectedShift = DateTime(now.year, now.month, now.day, shiftHour, shiftMinute);
          if (now.isAfter(expectedShift.add(const Duration(minutes: 15)))) {
            lateMin = now.difference(expectedShift).inMinutes;
            status = 'Late';
          }
        }

        await _supabase.from('dtr_attendance_logs').insert({
          'workplace_id': workplaceId,
          'employee_id': employeeId,
          'clock_in': now.toIso8601String(),
          'date': today,
          'status': status,
          'late_minutes': lateMin,
          'verification_method': 'face_scan',
        });

        return ClockResult(
          success: true,
          action: 'Clock In',
          employeeName: employee.name,
          employeeId: employeeId,
          timestamp: now,
          message: 'Clock In recorded successfully for ${employee.name}',
        );
      }
    } catch (e) {
      debugPrint('[DtrService] clockInOrOut error: $e');
      return ClockResult(
        success: false,
        action: 'Error',
        employeeName: employee.name,
        employeeId: employeeId,
        message: 'Database error while recording timestamp: $e',
      );
    }
  }

  /// Find employee by ID in the specified office
  Future<Employee?> findEmployeeInRoom({
    required String workplaceId,
    required String employeeId,
  }) async {
    final cleanId = employeeId.trim();
    if (cleanId.isEmpty) return null;
    try {
      final data = await _supabase
          .from('dtr_employees')
          .select('*')
          .eq('workplace_id', workplaceId)
          .ilike('employee_id', cleanId)
          .maybeSingle();

      if (data == null) return null;
      return Employee.fromJson(data);
    } catch (e) {
      debugPrint('[DtrService] findEmployeeInRoom error: $e');
      return null;
    }
  }

  /// Link biometric face and photo to an existing employee created by HR on Web
  Future<bool> linkFaceToEmployee({
    required String workplaceId,
    required String employeeId,
    String? photoBase64,
  }) async {
    final cleanId = employeeId.trim();
    try {
      final updateData = <String, dynamic>{
        'is_registered': true,
        'updated_at': DateTime.now().toIso8601String(),
      };

      if (photoBase64 != null && photoBase64.isNotEmpty) {
        updateData['photo_url'] = photoBase64;
      }

      await _supabase
          .from('dtr_employees')
          .update(updateData)
          .eq('workplace_id', workplaceId)
          .ilike('employee_id', cleanId);

      // If photo provided and python face server reachable, send to register-face
      if (photoBase64 != null && photoBase64.isNotEmpty) {
        try {
          await http
              .post(
                Uri.parse(ApiConfig.registerFace),
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode({
                  'employeeId': cleanId,
                  'photo': photoBase64,
                }),
              )
              .timeout(const Duration(seconds: 5));
        } catch (_) {}
      }

      return true;
    } catch (e) {
      debugPrint('[DtrService] linkFaceToEmployee error: $e');
      return false;
    }
  }

  /// Register an employee and their face for a specific room
  Future<bool> registerEmployee({
    required String workplaceId,
    required String employeeId,
    required String name,
    String role = 'Employee',
    String? phone,
    String? photoBase64,
  }) async {
    try {
      // 1. Save or update employee in Supabase
      await _supabase.from('dtr_employees').upsert({
        'workplace_id': workplaceId,
        'employee_id': employeeId.trim(),
        'name': name.trim(),
        'role': role.trim(),
        'phone': phone?.trim(),
        'is_registered': true,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'workplace_id, employee_id');

      // 2. If photo provided and python face server reachable, send to register-face
      if (photoBase64 != null && photoBase64.isNotEmpty) {
        try {
          await http
              .post(
                Uri.parse(ApiConfig.registerFace),
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode({
                  'employeeId': employeeId.trim(),
                  'photo': photoBase64,
                }),
              )
              .timeout(const Duration(seconds: 8));
        } catch (_) {}
      }

      return true;
    } catch (e) {
      debugPrint('[DtrService] registerEmployee error: $e');
      return false;
    }
  }

  /// Fetch today's attendance logs for this room
  Future<List<AttendanceLog>> getTodayAttendance(String workplaceId) async {
    final today = DateTime.now().toIso8601String().split('T')[0];
    try {
      final data = await _supabase
          .from('dtr_attendance_logs')
          .select('*')
          .eq('workplace_id', workplaceId)
          .eq('date', today)
          .order('clock_in', ascending: false);

      return (data as List)
          .map((row) => AttendanceLog.fromJson(row as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[DtrService] getTodayAttendance error: $e');
      return [];
    }
  }
}
