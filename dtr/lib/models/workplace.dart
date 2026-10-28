import 'dart:convert';
import 'package:crypto/crypto.dart';

class Workplace {
  final String id;
  final String name;
  final String code;
  final String? adminEmail;
  final int maxFreeEmployees;
  final DateTime createdAt;

  Workplace({
    required this.id,
    required this.name,
    required this.code,
    this.adminEmail,
    this.maxFreeEmployees = 3,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory Workplace.fromJson(Map<String, dynamic> json) {
    return Workplace(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unnamed Room',
      code: json['code']?.toString() ?? '',
      adminEmail: json['admin_email']?.toString(),
      maxFreeEmployees: json['max_free_employees'] is int
          ? json['max_free_employees'] as int
          : int.tryParse(json['max_free_employees']?.toString() ?? '3') ?? 3,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'code': code,
      'admin_email': adminEmail,
      'max_free_employees': maxFreeEmployees,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Generate a deterministic secure token for this room for HR web link verification
  String get hrAccessToken {
    final raw = '$id:$code:dtr_secure_2026';
    return sha256.convert(utf8.encode(raw)).toString().substring(0, 24);
  }

  /// Generates the one-time shareable HR link
  String getHrWebLink(String baseUrl) {
    return '$baseUrl/hr?room=$code&token=$hrAccessToken';
  }
}
