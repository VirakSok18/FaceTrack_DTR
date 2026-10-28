import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'dart:ui';
import '../models/workplace.dart';
import '../services/dtr_service.dart';
import '../services/face_recognition_service.dart';
import '../services/room_service.dart';
import 'rooms/room_list_screen.dart';
import 'register_face_screen.dart';

class ClockInOutScreen extends StatefulWidget {
  final Workplace? workplace;

  const ClockInOutScreen({Key? key, this.workplace}) : super(key: key);

  @override
  _ClockInOutScreenState createState() => _ClockInOutScreenState();
}

class _ClockInOutScreenState extends State<ClockInOutScreen> {
  CameraController? _controller;
  List<CameraDescription>? cameras;
  bool isProcessing = false;
  String message = 'Align your face within the frame';
  String subMessage = 'Ready for biometric verification';

  Workplace? _currentRoom;
  bool isCameraInitializing = false;

  @override
  void initState() {
    super.initState();
    _initRoomAndCamera();
  }

  Future<void> _initRoomAndCamera() async {
    if (widget.workplace != null) {
      _currentRoom = widget.workplace;
    } else {
      _currentRoom = await RoomService().getActiveRoom();
    }

    if (_currentRoom == null) {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const RoomListScreen()),
        );
      }
      return;
    }

    if (mounted) {
      setState(() {});
      initCamera();
    }
  }

  Future<void> initCamera() async {
    if (isCameraInitializing) return;
    isCameraInitializing = true;

    // Small delay to ensure OS has fully released camera hardware from previous screen
    await Future.delayed(const Duration(milliseconds: 600));

    if (_controller != null) {
      try {
        await _controller!.dispose();
      } catch (e) {
        debugPrint('Error disposing camera: $e');
      }
      _controller = null;
    }

    if (!mounted) {
      isCameraInitializing = false;
      return;
    }

    try {
      cameras = await availableCameras();
      if (cameras == null || cameras!.isEmpty) {
        if (mounted) {
          setState(() {
            subMessage = 'No camera modules available';
          });
        }
        isCameraInitializing = false;
        return;
      }

      // Default to front camera if available
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
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _controller!.initialize();

      if (mounted) {
        setState(() {
          subMessage = 'Ready for biometric verification';
        });
      }
    } catch (e) {
      debugPrint('Camera Initialization Error: $e');
      if (mounted) {
        setState(() {
          subMessage = 'Biometric sensor failure - Retrying...';
        });
        await Future.delayed(const Duration(seconds: 1));
        if (mounted) initCamera();
      }
    } finally {
      isCameraInitializing = false;
    }
  }

  Future<void> scanAndClock() async {
    if (isProcessing || _controller == null || !_controller!.value.isInitialized) return;
    if (_currentRoom == null) return;

    setState(() {
      isProcessing = true;
      message = 'Analyzing Biometrics';
      subMessage = 'Running MobileFaceNet on-device neural model...';
    });

    try {
      final image = await _controller!.takePicture();

      // 1. High-accuracy On-Device Face Recognition with MobileFaceNet & ML Kit
      final matchResult = await FaceRecognitionService().recognizeFace(
        workplaceId: _currentRoom!.id,
        imagePath: image.path,
      );

      if (!matchResult.isIdentified || matchResult.employeeId == null) {
        setState(() {
          message = 'Identity Unknown';
          subMessage = matchResult.message;
          isProcessing = false;
        });
        return;
      }

      final recognizedEmployeeId = matchResult.employeeId!;
      final confidence = matchResult.confidence;

      setState(() {
        message = 'Identity Verified';
        subMessage = 'Verifying office assignment & records...';
      });

      // 2. Room-Scoped Verification & Clock In/Out via Supabase
      final clockResult = await DtrService().clockInOrOut(
        employeeId: recognizedEmployeeId,
        workplaceId: _currentRoom!.id,
        currentOfficeName: _currentRoom!.name,
      );

      if (!mounted) return;

      if (!clockResult.success) {
        setState(() {
          isProcessing = false;
          message = clockResult.isDeniedWrongOffice ? 'ACCESS DENIED' : 'Verification Issue';
          subMessage = clockResult.message;
        });

        if (clockResult.isDeniedWrongOffice) {
          _showWrongOfficeDeniedSheet(clockResult);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(clockResult.message), backgroundColor: Colors.redAccent),
          );
        }
        return;
      }

      // Success!
      setState(() {
        message = 'Success';
        subMessage = '${clockResult.action} confirmed for ${clockResult.employeeName}';
        isProcessing = false;
      });

      _showSuccessSheet(clockResult.employeeName, clockResult.action, confidence);
    } catch (e) {
      debugPrint('[ClockInOut] scanAndClock error: $e');
      if (mounted) {
        setState(() {
          message = 'System Error';
          subMessage = 'Biometric processing interrupted: $e';
          isProcessing = false;
        });
      }
    }
  }

  /// ACCESS DENIED: Employee scanned in the wrong room/office
  void _showWrongOfficeDeniedSheet(ClockResult result) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(36)),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            padding: const EdgeInsets.fromLTRB(28, 20, 28, 36),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 48,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(height: 24),

                // Red Warning Icon
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(color: Colors.redAccent.withOpacity(0.3), width: 1.5),
                  ),
                  child: const Icon(Icons.block_rounded, color: Colors.redAccent, size: 44),
                ),
                const SizedBox(height: 20),

                const Text(
                  'ACCESS DENIED',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                    color: Colors.redAccent,
                  ),
                ),
                const SizedBox(height: 8),

                const Text(
                  'WRONG OFFICE LOCATION',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.5,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 18),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        result.employeeName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'This employee is assigned to "${result.assignedOfficeName ?? 'Another Office'}". Attendance can only be clocked in at your designated office location.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: const StadiumBorder(),
                      elevation: 0,
                    ),
                    child: const Text('DISMISS', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showSuccessSheet(String name, String action, double confidence) {
    final now = DateTime.now();
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";

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
              borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
            ),
            padding: const EdgeInsets.fromLTRB(32, 24, 32, 40),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 50,
                    height: 5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    action.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Colors.black,
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  // Room & Time info
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.location_on, size: 16, color: Colors.black),
                        const SizedBox(width: 6),
                        Text(
                          _currentRoom?.name ?? 'Office',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Icon(Icons.access_time_rounded, size: 16, color: Color(0xFF64748B)),
                        const SizedBox(width: 6),
                        Text(
                          timeStr,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: const StadiumBorder(),
                        elevation: 0,
                      ),
                      child: const Text(
                        'DONE',
                        style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1),
                      ),
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

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final roomName = _currentRoom?.name ?? 'Office';
    final roomCode = _currentRoom?.code ?? '';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.black),
          tooltip: 'Switch Office',
          onPressed: () async {
            if (_controller != null) {
              await _controller!.dispose();
              _controller = null;
            }
            if (mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const RoomListScreen()),
              );
            }
          },
        ),
        title: Column(
          children: [
            Text(
              roomName.toUpperCase(),
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
                color: Colors.black,
              ),
            ),
            if (roomCode.isNotEmpty)
              Text(
                'KIOSK • $roomCode',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                  color: Colors.black,
                ),
              ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: IconButton(
              icon: const Icon(Icons.person_add_rounded, color: Colors.black),
              tooltip: 'Register New Employee Face',
              onPressed: () async {
                if (_controller != null) {
                  await _controller!.dispose();
                  _controller = null;
                }

                if (mounted) {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => RegisterFaceScreen(workplace: _currentRoom),
                    ),
                  );

                  // Re-initialize camera on return
                  initCamera();
                }
              },
            ),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Column(
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(36),
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
                            color: Colors.black12,
                            child: const Center(child: CircularProgressIndicator(color: Colors.black)),
                          ),

                        // Glassmorphic Overlay
                        BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 0, sigmaY: 0),
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withOpacity(0.05),
                                  Colors.transparent,
                                  Colors.transparent,
                                  Colors.black.withOpacity(0.35),
                                ],
                                stops: const [0, 0.3, 0.7, 1],
                              ),
                            ),
                          ),
                        ),

                        // Frame corners
                        CustomPaint(
                          painter: FramePainter(
                            color: isProcessing ? Colors.white.withOpacity(0.3) : Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              Container(
                padding: const EdgeInsets.fromLTRB(32, 4, 32, 36),
                child: Column(
                  children: [
                    Text(
                      message.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2.0,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subMessage,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.black,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isProcessing ? null : scanAndClock,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFE2E8F0),
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          elevation: 0,
                          shape: const StadiumBorder(),
                        ),
                        child: isProcessing
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.face_unlock_rounded, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    'VERIFY IDENTITY',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.2),
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
    );
  }
}

class FramePainter extends CustomPainter {
  final Color color;
  FramePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke;

    const cornerLength = 40.0;

    final paddingH = size.width * 0.15;
    final paddingV = size.height * 0.15;

    final rect = Rect.fromLTWH(paddingH, paddingV, size.width - paddingH * 2, size.height - paddingV * 2);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(30));

    // Top Left
    canvas.drawPath(
        Path()
          ..moveTo(rrect.left, rrect.top + cornerLength)
          ..lineTo(rrect.left, rrect.top + 30)
          ..arcToPoint(Offset(rrect.left + 30, rrect.top), radius: const Radius.circular(30))
          ..lineTo(rrect.left + cornerLength, rrect.top),
        paint);

    // Top Right
    canvas.drawPath(
        Path()
          ..moveTo(rrect.right - cornerLength, rrect.top)
          ..lineTo(rrect.right - 30, rrect.top)
          ..arcToPoint(Offset(rrect.right, rrect.top + 30), radius: const Radius.circular(30))
          ..lineTo(rrect.right, rrect.top + cornerLength),
        paint);

    // Bottom Left
    canvas.drawPath(
        Path()
          ..moveTo(rrect.left, rrect.bottom - cornerLength)
          ..lineTo(rrect.left, rrect.bottom - 30)
          ..arcToPoint(Offset(rrect.left + 30, rrect.bottom), radius: const Radius.circular(30), clockwise: false)
          ..lineTo(rrect.left + cornerLength, rrect.bottom),
        paint);

    // Bottom Right
    canvas.drawPath(
        Path()
          ..moveTo(rrect.right - cornerLength, rrect.bottom)
          ..lineTo(rrect.right - 30, rrect.bottom)
          ..arcToPoint(Offset(rrect.right, rrect.bottom - 30), radius: const Radius.circular(30), clockwise: false)
          ..lineTo(rrect.right, rrect.bottom - cornerLength),
        paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
