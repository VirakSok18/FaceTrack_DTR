import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/api_config.dart';
import '../models/workplace.dart';
import 'dtr_auth_service.dart';

class RoomService {
  static final RoomService _instance = RoomService._internal();
  factory RoomService() => _instance;
  RoomService._internal();

  SupabaseClient get _supabase => Supabase.instance.client;

  Workplace? _activeRoom;
  Workplace? get activeRoom => _activeRoom;

  /// Load persisted active room
  Future<Workplace?> getActiveRoom() async {
    if (_activeRoom != null) return _activeRoom;
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString('dtr_active_room_id');
    final code = prefs.getString('dtr_active_room_code');
    final name = prefs.getString('dtr_active_room_name');

    if (id != null && code != null && name != null) {
      _activeRoom = Workplace(id: id, code: code, name: name);
      return _activeRoom;
    }
    return null;
  }

  /// Set the current active room for face scanning and attendance
  Future<void> setActiveRoom(Workplace room) async {
    _activeRoom = room;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dtr_active_room_id', room.id);
    await prefs.setString('dtr_active_room_code', room.code);
    await prefs.setString('dtr_active_room_name', room.name);
  }

  /// Clear active room
  Future<void> clearActiveRoom() async {
    _activeRoom = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('dtr_active_room_id');
    await prefs.remove('dtr_active_room_code');
    await prefs.remove('dtr_active_room_name');
  }

  /// Fetch all rooms for current user
  Future<List<Workplace>> fetchRooms() async {
    final email = DtrAuthService().userEmail;
    try {
      var query = _supabase.from('dtr_workplaces').select('*');
      if (email != null && email.isNotEmpty) {
        query = query.eq('admin_email', email);
      }
      final data = await query.order('created_at', ascending: true);
      final list = (data as List)
          .map((row) => Workplace.fromJson(row as Map<String, dynamic>))
          .toList();

      // If user has no rooms yet, also check default demo room
      if (list.isEmpty) {
        final demo = await _supabase
            .from('dtr_workplaces')
            .select('*')
            .eq('code', 'DTR-1001')
            .maybeSingle();
        if (demo != null) {
          list.add(Workplace.fromJson(demo));
        }
      }
      return list;
    } catch (e) {
      debugPrint('[RoomService] fetchRooms error: $e');
      return [];
    }
  }

  /// Check if user can create a new room (max 3 rooms allowed)
  Future<bool> canCreateRoom() async {
    final rooms = await fetchRooms();
    final email = DtrAuthService().userEmail;
    final userRooms = rooms.where((r) => r.adminEmail == email).toList();
    return userRooms.length < ApiConfig.maxRoomsPerAccount;
  }

  /// Create a new room with 3-room limit check
  Future<Workplace> createRoom(String roomName) async {
    final email = DtrAuthService().userEmail;
    final existingRooms = await fetchRooms();
    final userRooms = existingRooms.where((r) => r.adminEmail == email).toList();

    if (userRooms.length >= ApiConfig.maxRoomsPerAccount) {
      throw 'Limit Reached: Each account is allowed a maximum of ${ApiConfig.maxRoomsPerAccount} offices/rooms.';
    }

    final code = _generateRoomCode();
    final cleanName = roomName.trim().isEmpty ? 'Office ${userRooms.length + 1}' : roomName.trim();

    final res = await _supabase.from('dtr_workplaces').insert({
      'name': cleanName,
      'code': code,
      'admin_email': email,
      'max_free_employees': 50, // High capacity per room as requested
    }).select().single();

    final newRoom = Workplace.fromJson(res);
    return newRoom;
  }

  /// Generate a unique room code e.g. "DTR-7B2K"
  String _generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    final random = Random();
    final buffer = StringBuffer('DTR-');
    for (int i = 0; i < 4; i++) {
      buffer.write(chars[random.nextInt(chars.length)]);
    }
    return buffer.toString();
  }
}
