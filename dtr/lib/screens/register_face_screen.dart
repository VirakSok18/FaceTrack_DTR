import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../models/employee.dart';
import '../models/workplace.dart';
import '../services/dtr_service.dart';
import '../services/face_recognition_service.dart';
import '../services/room_service.dart';

class RegisterFaceScreen extends StatefulWidget {
  final Workplace? workplace;

  const RegisterFaceScreen({Key? key, this.workplace}) : super(key: key);

  @override
  _RegisterFaceScreenState createState() => _RegisterFaceScreenState();
}

class _RegisterFaceScreenState extends State<RegisterFaceScreen> {
  CameraController? _controller;
  List<CameraDescription>? cameras;
  bool isCameraLoading = true;
  bool isLoading = false;
  String message = 'Align face within frame';
  String subMessage = 'Position face clearly with good lighting';

  final TextEditingController employeeIdController = TextEditingController();
  Employee? matchedEmployee;
  bool isSearchingEmployee = false;
  String? searchError;
  Timer? _debounceTimer;

  Workplace? _currentRoom;

  @override
  void initState() {
    super.initState();
    _initRoom();
  }

  Future<void> _initRoom() async {
    if (widget.workplace != null) {
      _currentRoom = widget.workplace;
    } else {
      _currentRoom = await RoomService().getActiveRoom();
    }
    initCamera();
  }

  Future<void> initCamera() async {
    setState(() => isCameraLoading = true);
    // Allow previous screen to release camera hardware
    await Future.delayed(const Duration(milliseconds: 500));

    if (_controller != null) {
      try {
        await _controller!.dispose();
      } catch (_) {}
      _controller = null;
    }

    try {
      cameras = await availableCameras();
      if (cameras == null || cameras!.isEmpty) {
        setState(() {
          message = 'Camera Unavailable';
          subMessage = 'No camera modules detected';
          isCameraLoading = false;
        });
        return;
      }

      int cameraIndex = 0;
      for (int i = 0; i < cameras!.length; i++) {
        if (cameras![i].lensDirection == CameraLensDirection.front) {
          cameraIndex = i;
          break;
        }
      }

      _controller = CameraController(
        cameras![cameraIndex],
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _controller!.initialize();
      if (mounted) setState(() => isCameraLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          message = 'Camera Init Failed';
          subMessage = 'Check system camera permissions';
          isCameraLoading = false;
        });
      }
    }
  }

  void _onIdChanged(String value) {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();

    final cleanId = value.trim();
    if (cleanId.isEmpty) {
      setState(() {
        matchedEmployee = null;
        searchError = null;
        isSearchingEmployee = false;
      });
      return;
    }

    setState(() {
      isSearchingEmployee = true;
      searchError = null;
    });

    _debounceTimer = Timer(const Duration(milliseconds: 300), () async {
      if (_currentRoom == null) return;
      final emp = await DtrService().findEmployeeInRoom(
        workplaceId: _currentRoom!.id,
        employeeId: cleanId,
      );

      if (!mounted) return;
      setState(() {
        isSearchingEmployee = false;
        if (emp != null) {
          matchedEmployee = emp;
          searchError = null;
        } else {
          matchedEmployee = null;
          searchError = 'Code "$cleanId" not found in this office.';
        }
      });
    });
  }

  Future<void> registerFace() async {
    final rawInput = employeeIdController.text.trim();

    if (rawInput.isEmpty && matchedEmployee == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your Employee Code')),
      );
      return;
    }

    if (matchedEmployee == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid Employee Code from HR')),
      );
      return;
    }

    if (_currentRoom == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active office selected')),
      );
      return;
    }

    // Dismiss keyboard before taking photo
    FocusScope.of(context).unfocus();

    setState(() {
      isLoading = true;
      message = 'Processing Biometrics';
      subMessage = 'Extracting facial feature vector...';
    });

    try {
      if (_controller == null || !_controller!.value.isInitialized) {
        throw 'Camera is not ready. Please try again.';
      }

      final XFile image = await _controller!.takePicture();

      // Convert image to base64 data URL so HR on web sees the photo immediately
      String? photoBase64;
      try {
        final bytes = await File(image.path).readAsBytes();
        photoBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
      } catch (_) {}

      // 1. Extract and store MobileFaceNet embedding in Supabase using the matched employee's exact database ID
      await FaceRecognitionService().enrollFace(
        workplaceId: _currentRoom!.id,
        employeeId: matchedEmployee!.employeeId,
        imagePath: image.path,
      );

      // 2. Link face & photo directly to existing HR employee record
      final linked = await DtrService().linkFaceToEmployee(
        workplaceId: _currentRoom!.id,
        employeeId: matchedEmployee!.employeeId,
        photoBase64: photoBase64,
      );

      if (!linked) {
        throw 'Failed to update employee status in database';
      }

      setState(() => isLoading = false);
      if (mounted) {
        _showSuccessSheet(matchedEmployee!.name, matchedEmployee!.employeeId);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          message = 'Enrollment Failed';
          subMessage = '$e';
          isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$e'),
            backgroundColor: Colors.black,
          ),
        );
      }
    }
  }

  void _showSuccessSheet(String empName, String empId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(36)),
            ),
            padding: const EdgeInsets.fromLTRB(32, 24, 32, 36),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(height: 28),
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(26),
                  ),
                  child: const Icon(Icons.check_rounded, color: Colors.white, size: 36),
                ),
                const SizedBox(height: 20),
                const Text(
                  'FACE ENROLLED SUCCESSFULLY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  empName,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Colors.black,
                    letterSpacing: -0.5,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  'ID: $empId • Ready for Biometric Face Scan',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (_controller != null) {
                        await _controller!.dispose();
                        _controller = null;
                      }
                      if (mounted) {
                        Navigator.pop(context); // Close sheet
                        Navigator.pop(context); // Return to scanner
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: const StadiumBorder(),
                      elevation: 0,
                    ),
                    child: const Text(
                      'RETURN TO SCANNER',
                      style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.0),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller?.dispose();
    employeeIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      resizeToAvoidBottomInset: true, // Pushes up gracefully when keyboard opens!
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        centerTitle: true,
        title: Column(
          children: [
            const Text(
              'REGISTER FACE',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.black, letterSpacing: 0.5),
            ),
            if (_currentRoom != null)
              Text(
                _currentRoom!.name.toUpperCase(),
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
              ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.black),
          onPressed: () async {
            if (_controller != null) {
              await _controller!.dispose();
              _controller = null;
            }
            if (mounted) Navigator.pop(context);
          },
        ),
      ),
      // Tap outside anywhere to immediately close the keyboard
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 550),
              child: Column(
                children: [
                  // 1. Camera Viewport: Expanded so it flexes and shrinks when keyboard pushes up
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (_controller != null && _controller!.value.isInitialized)
                              FittedBox(
                                fit: BoxFit.cover,
                                child: SizedBox(
                                  width: _controller!.value.previewSize?.height ?? 1,
                                  height: _controller!.value.previewSize?.width ?? 1,
                                  child: CameraPreview(_controller!),
                                ),
                              )
                            else
                              Container(
                                color: const Color(0xFFF1F5F9),
                                child: Center(
                                  child: isCameraLoading
                                      ? const CircularProgressIndicator(color: Colors.black, strokeWidth: 2.5)
                                      : const Icon(Icons.camera_alt_outlined, color: Color(0xFF94A3B8), size: 48),
                                ),
                              ),

                            // Face framing corner brackets
                            CustomPaint(
                              painter: FramePainter(
                                color: Colors.white.withOpacity(0.85),
                              ),
                            ),

                            // Top Guidance Pill
                            Positioned(
                              top: 14,
                              left: 14,
                              right: 14,
                              child: Center(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withOpacity(0.65),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    message.toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.0,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // 2. Control Panel: Employee ID Code Input, Live Verification Chip & Action Button
                  // Automatically pushed up by keyboard, and button remains perfectly positioned
                  Container(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Employee ID Input (User only needs to enter the code digits!)
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: matchedEmployee != null
                                  ? Colors.black
                                  : searchError != null
                                  ? Colors.redAccent.withOpacity(0.5)
                                  : const Color(0xFFE2E8F0),
                              width: matchedEmployee != null ? 1.5 : 1.0,
                            ),
                          ),
                          child: TextField(
                            controller: employeeIdController,
                            onChanged: _onIdChanged,
                            onSubmitted: (_) => FocusScope.of(context).unfocus(),
                            textInputAction: TextInputAction.done,
                            keyboardType: TextInputType.text,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                              color: Colors.black,
                              letterSpacing: 0.5,
                            ),
                            decoration: InputDecoration(
                              labelText: 'EMPLOYEE CODE',
                              labelStyle: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                                color: Color(0xFF64748B),
                              ),
                              hintText: 'e.g. 1001',
                              hintStyle: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 14),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              prefixIcon: Container(
                                padding: const EdgeInsets.only(left: 14, right: 6),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Icon(Icons.badge_rounded, color: Colors.black, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'EMP - ',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFF0F172A),
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              suffixIcon: isSearchingEmployee
                                  ? const Padding(
                                      padding: EdgeInsets.all(12.0),
                                      child: SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                                      ),
                                    )
                                  : matchedEmployee != null
                                  ? const Icon(Icons.check_circle_rounded, color: Colors.black, size: 22)
                                  : null,
                            ),
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Live Verified Employee Name Chip / Error Note
                        if (matchedEmployee != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.black,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.person_rounded, color: Colors.white, size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '${matchedEmployee!.name} • ${matchedEmployee!.role}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (matchedEmployee!.isRegistered)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.white24,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'UPDATE',
                                      style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                              ],
                            ),
                          )
                        else if (searchError != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 14),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    searchError!,
                                    style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            child: Text(
                              'Enter only the code digits (e.g. 1001) from your HR profile',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),

                        const SizedBox(height: 14),

                        // Register Face Button (Always visible at the bottom)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: (isLoading || matchedEmployee == null) ? null : registerFace,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.black,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: const Color(0xFFE2E8F0),
                              disabledForegroundColor: const Color(0xFF94A3B8),
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              elevation: 0,
                              shape: const StadiumBorder(),
                            ),
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.camera_alt_rounded, size: 20),
                                      const SizedBox(width: 8),
                                      Text(
                                        matchedEmployee == null
                                            ? 'ENTER VALID CODE FIRST'
                                            : 'REGISTER BIOMETRIC FACE',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 0.8),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Custom painter for camera target corner brackets
class FramePainter extends CustomPainter {
  final Color color;

  FramePainter({this.color = Colors.white});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromLTWH(24, 24, size.width - 48, size.height - 48);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(28));

    const cornerLength = 36.0;

    // Top Left
    canvas.drawPath(
      Path()
        ..moveTo(rrect.left, rrect.top + cornerLength)
        ..lineTo(rrect.left, rrect.top + 28)
        ..arcToPoint(Offset(rrect.left + 28, rrect.top), radius: const Radius.circular(28))
        ..lineTo(rrect.left + cornerLength, rrect.top),
      paint,
    );

    // Top Right
    canvas.drawPath(
      Path()
        ..moveTo(rrect.right - cornerLength, rrect.top)
        ..lineTo(rrect.right - 28, rrect.top)
        ..arcToPoint(Offset(rrect.right, rrect.top + 28), radius: const Radius.circular(28))
        ..lineTo(rrect.right, rrect.top + cornerLength),
      paint,
    );

    // Bottom Left
    canvas.drawPath(
      Path()
        ..moveTo(rrect.left, rrect.bottom - cornerLength)
        ..lineTo(rrect.left, rrect.bottom - 28)
        ..arcToPoint(Offset(rrect.left + 30, rrect.bottom), radius: const Radius.circular(28), clockwise: false)
        ..lineTo(rrect.left + cornerLength, rrect.bottom),
      paint,
    );

    // Bottom Right
    canvas.drawPath(
      Path()
        ..moveTo(rrect.right - cornerLength, rrect.bottom)
        ..lineTo(rrect.right - 28, rrect.bottom)
        ..arcToPoint(Offset(rrect.right, rrect.bottom - 28), radius: const Radius.circular(28), clockwise: false)
        ..lineTo(rrect.right, rrect.bottom - cornerLength),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
