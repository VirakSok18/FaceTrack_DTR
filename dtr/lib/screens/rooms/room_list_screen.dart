import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/api_config.dart';
import '../../models/workplace.dart';
import '../../services/dtr_auth_service.dart';
import '../../services/room_service.dart';
import '../../widgets/face_track_logo.dart';
import '../auth/sign_in_screen.dart';
import '../clock_in_out_screen.dart';

class RoomListScreen extends StatefulWidget {
  const RoomListScreen({Key? key}) : super(key: key);

  @override
  _RoomListScreenState createState() => _RoomListScreenState();
}

class _RoomListScreenState extends State<RoomListScreen> {
  final RoomService _roomService = RoomService();
  final DtrAuthService _authService = DtrAuthService();
  List<Workplace> _rooms = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadRooms();
  }

  Future<void> _loadRooms() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _roomService.fetchRooms();
      if (mounted) {
        setState(() {
          _rooms = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Could not load offices: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleSignOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: const Text(
          'Sign Out',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Are you sure you want to sign out of this account?',
          style: TextStyle(color: Color(0xFF64748B), height: 1.4),
        ),
        actionsPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              shape: const StadiumBorder(),
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            ),
            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _authService.signOut();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const SignInScreen()),
          (route) => false,
        );
      }
    }
  }

  Future<void> _enterRoom(Workplace room) async {
    await _roomService.setActiveRoom(room);
    if (mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ClockInOutScreen(workplace: room),
        ),
      );
    }
  }

  Future<void> _showCreateRoomDialog() async {
    final userRooms = _rooms.where((r) => r.adminEmail == _authService.userEmail).toList();

    // Enforce strict 3 rooms per account limit
    if (userRooms.length >= ApiConfig.maxRoomsPerAccount) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: Row(
            children: const [
              Icon(Icons.info_outline, color: Colors.black, size: 24),
              SizedBox(width: 10),
              Text(
                'Room Limit Reached',
                style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          content: Text(
            'Each account is limited to ${ApiConfig.maxRoomsPerAccount} offices.\n\nEach office supports up to 50 team members. Please select an existing office to scan or manage.',
            style: const TextStyle(color: Color(0xFF64748B), height: 1.4),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
              ),
              child: const Text('Got It'),
            ),
          ],
        ),
      );
      return;
    }

    final controller = TextEditingController(text: 'Office ${userRooms.length + 1}');
    bool isCreating = false;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: const Text(
            'Create Office Workspace',
            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Enter name for office (${userRooms.length + 1}/${ApiConfig.maxRoomsPerAccount}):',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                autofocus: true,
                maxLength: 50,
                style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: 'e.g. Headquarters, Phnom Penh Office',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  counterText: '',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: Colors.black, width: 1.5),
                  ),
                ),
              ),
            ],
          ),
          actionsPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          actions: [
            TextButton(
              onPressed: isCreating ? null : () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: isCreating
                  ? null
                  : () async {
                      // Sanitize office name
                      final name = controller.text.replaceAll(RegExp(r'[<>]'), '').trim();
                      if (name.isEmpty) return;

                      setDialogState(() => isCreating = true);
                      try {
                        final newRoom = await _roomService.createRoom(name);
                        Navigator.of(ctx).pop(); // close create dialog
                        await _loadRooms();
                        if (mounted) {
                          _showOneTimeHrLinkDialog(newRoom);
                        }
                      } catch (e) {
                        setDialogState(() => isCreating = false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Failed to create room: $e'),
                            backgroundColor: Colors.black,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        );
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
              ),
              child: isCreating
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Create Office', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  /// Show the secret HR Web Link dialog
  void _showOneTimeHrLinkDialog(Workplace room) {
    final hrLink = room.getHrWebLink(ApiConfig.hrWebPortalUrl);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        contentPadding: const EdgeInsets.all(24),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Icon(Icons.check_circle_outline, color: Colors.black, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Office Workspace Ready',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: Colors.black),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Office: ${room.name}',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      room.code,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', fontSize: 13, color: Colors.black),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text('Kiosk Room Code', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        hrLink,
                        style: const TextStyle(color: Colors.black87, fontSize: 11, fontFamily: 'monospace'),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy, color: Colors.black, size: 18),
                      tooltip: 'Copy Link',
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: hrLink));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Web Link copied to clipboard!'),
                            backgroundColor: Colors.black,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  _enterRoom(room);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  shape: const StadiumBorder(),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                child: const Text('ENTER OFFICE KIOSK', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showHrInfoSheet(Workplace room) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.apartment_rounded, color: Colors.black, size: 24),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      room.name,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black),
                    ),
                    Text(
                      'Kiosk Room Code: ${room.code}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontFamily: 'monospace'),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text(
              'Web Dashboard Portal Access',
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Text(
              'HR managers can log in securely to the web dashboard anytime at:\n${ApiConfig.hrWebPortalUrl}\n\nUsing your administrator account:\n${_authService.userEmail}',
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, height: 1.4),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
                padding: const EdgeInsets.symmetric(vertical: 14),
                elevation: 0,
              ),
              child: const Text('Close', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userRooms = _rooms.where((r) => r.adminEmail == _authService.userEmail).toList();
    final usedCount = userRooms.length;
    final maxRooms = ApiConfig.maxRoomsPerAccount;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        title: Row(
          children: const [
            FaceTrackLogo(size: 26, color: Colors.black),
            SizedBox(width: 10),
            Text(
              'FACETRACK',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: Colors.black,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.black87),
            tooltip: 'Refresh',
            onPressed: _loadRooms,
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.black87),
            tooltip: 'Sign Out',
            onPressed: _handleSignOut,
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Colors.black))
            : RefreshIndicator(
                onRefresh: _loadRooms,
                color: Colors.black,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 600),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // User Account & Limits Banner
                          Container(
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: Colors.black,
                                  child: Text(
                                    (_authService.displayName ?? 'U').substring(0, 1).toUpperCase(),
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _authService.displayName ?? 'Manager',
                                        style: const TextStyle(
                                          color: Colors.black,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                      Text(
                                        _authService.userEmail ?? '',
                                        style: const TextStyle(
                                          color: Color(0xFF64748B),
                                          fontSize: 11,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                // Limit Badge
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: const Color(0xFFCBD5E1)),
                                  ),
                                  child: Text(
                                    '$usedCount / $maxRooms Offices',
                                    style: const TextStyle(
                                      color: Colors.black,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Header + Add Office Button
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Your Offices',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              if (usedCount < maxRooms)
                                ElevatedButton.icon(
                                  onPressed: _showCreateRoomDialog,
                                  icon: const Icon(Icons.add, size: 16),
                                  label: const Text('Add Office'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.black,
                                    foregroundColor: Colors.white,
                                    shape: const StadiumBorder(),
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.red.withOpacity(0.3)),
                              ),
                              child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // EMPTY STATE
                          if (_rooms.isEmpty) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(28),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                children: [
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                    ),
                                    child: const Icon(Icons.apartment_rounded, color: Colors.black, size: 30),
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No Offices Created Yet',
                                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 17),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Offices are not created automatically. Create your first office to generate your biometric kiosk room code.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: Color(0xFF64748B), fontSize: 13, height: 1.4),
                                  ),
                                  const SizedBox(height: 24),
                                  ElevatedButton.icon(
                                    onPressed: _showCreateRoomDialog,
                                    icon: const Icon(Icons.add, size: 16),
                                    label: const Text('Create First Office'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.black,
                                      foregroundColor: Colors.white,
                                      shape: const StadiumBorder(),
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                                      textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ] else ...[
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _rooms.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 14),
                              itemBuilder: (context, index) {
                                final room = _rooms[index];

                                return Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(24),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.03),
                                        blurRadius: 12,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  padding: const EdgeInsets.all(20),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  room.name,
                                                  style: const TextStyle(
                                                    color: Colors.black,
                                                    fontSize: 17,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                const SizedBox(height: 6),
                                                Row(
                                                  children: [
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFFF1F5F9),
                                                        borderRadius: BorderRadius.circular(20),
                                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                                      ),
                                                      child: Text(
                                                        room.code,
                                                        style: const TextStyle(
                                                          color: Colors.black,
                                                          fontSize: 11,
                                                          fontWeight: FontWeight.bold,
                                                          fontFamily: 'monospace',
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    const Text(
                                                      'Up to 50 staff',
                                                      style: TextStyle(
                                                        color: Color(0xFF94A3B8),
                                                        fontSize: 11,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.info_outline, color: Color(0xFF64748B), size: 20),
                                            tooltip: 'HR Portal Info',
                                            onPressed: () => _showHrInfoSheet(room),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 16),
                                      // Action Button to Enter Room
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          onPressed: () => _enterRoom(room),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.black,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(vertical: 14),
                                            shape: const StadiumBorder(),
                                            elevation: 0,
                                          ),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: const [
                                              Icon(Icons.face_unlock_rounded, size: 18),
                                              SizedBox(width: 8),
                                              Text(
                                                'ENTER BIOMETRIC KIOSK',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: 0.8,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}
