class AttendanceLog {
  final String id;
  final String workplaceId;
  final String employeeId;
  final DateTime clockIn;
  final DateTime? clockOut;
  final String date;
  final String status;
  final int lateMinutes;
  final double workedHours;
  final String verificationMethod;

  AttendanceLog({
    required this.id,
    required this.workplaceId,
    required this.employeeId,
    required this.clockIn,
    this.clockOut,
    required this.date,
    this.status = 'Present',
    this.lateMinutes = 0,
    this.workedHours = 0.0,
    this.verificationMethod = 'face_scan',
  });

  factory AttendanceLog.fromJson(Map<String, dynamic> json) {
    return AttendanceLog(
      id: json['id']?.toString() ?? '',
      workplaceId: json['workplace_id']?.toString() ?? '',
      employeeId: json['employee_id']?.toString() ?? '',
      clockIn: json['clock_in'] != null
          ? DateTime.tryParse(json['clock_in'].toString()) ?? DateTime.now()
          : DateTime.now(),
      clockOut: json['clock_out'] != null
          ? DateTime.tryParse(json['clock_out'].toString())
          : null,
      date: json['date']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Present',
      lateMinutes: (json['late_minutes'] as num?)?.toInt() ?? 0,
      workedHours: (json['worked_hours'] as num?)?.toDouble() ?? 0.0,
      verificationMethod: json['verification_method']?.toString() ?? 'face_scan',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workplace_id': workplaceId,
      'employee_id': employeeId,
      'clock_in': clockIn.toIso8601String(),
      'clock_out': clockOut?.toIso8601String(),
      'date': date,
      'status': status,
      'late_minutes': lateMinutes,
      'worked_hours': workedHours,
      'verification_method': verificationMethod,
    };
  }
}
