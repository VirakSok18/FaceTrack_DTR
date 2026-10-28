class Employee {
  final String id;
  final String workplaceId;
  final String employeeId;
  final String name;
  final String role;
  final String? phone;
  final String? photoUrl;
  final String shiftStart;
  final String shiftEnd;
  final bool isRegistered;

  Employee({
    required this.id,
    required this.workplaceId,
    required this.employeeId,
    required this.name,
    this.role = 'Employee',
    this.phone,
    this.photoUrl,
    this.shiftStart = '09:00',
    this.shiftEnd = '18:00',
    this.isRegistered = false,
  });

  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      id: json['id']?.toString() ?? '',
      workplaceId: json['workplace_id']?.toString() ?? '',
      employeeId: json['employee_id']?.toString() ?? json['employeeId']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown Employee',
      role: json['role']?.toString() ?? 'Employee',
      phone: json['phone']?.toString(),
      photoUrl: json['photo_url']?.toString() ?? json['photo']?.toString(),
      shiftStart: json['shift_start']?.toString() ?? '09:00',
      shiftEnd: json['shift_end']?.toString() ?? '18:00',
      isRegistered: json['is_registered'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workplace_id': workplaceId,
      'employee_id': employeeId,
      'name': name,
      'role': role,
      'phone': phone,
      'photo_url': photoUrl,
      'shift_start': shiftStart,
      'shift_end': shiftEnd,
      'is_registered': isRegistered,
    };
  }
}
