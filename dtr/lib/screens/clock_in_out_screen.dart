import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:ui';
import '../config/api_config.dart';
import 'register_face_screen.dart';

class ClockInOutScreen extends StatefulWidget {
  @override
  _ClockInOutScreenState createState() => _ClockInOutScreenState();
}

class _ClockInOutScreenState extends State<ClockInOutScreen> {
  CameraController? _controller;
  List<CameraDescription>? cameras;
  bool isProcessing = false;
  String message = 'Align your face within the frame';
  String subMessage = 'Ready for biometric verification';

  @override
  void initState() {
    super.initState();
    initCamera();
  }

  bool isCameraInitializing = false;

  Future<void> initCamera() async {
    if (isCameraInitializing) return;
    isCameraInitializing = true;

    // Increased delay to ensure OS has fully released camera hardware from previous screen
    await Future.delayed(const Duration(milliseconds: 800));
    
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

      int cameraIndex = cameras!.length > 1 ? 1 : 0;
      
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
        // Optional: retry once
        await Future.delayed(const Duration(seconds: 1));
        if (mounted) initCamera();
      }
    } finally {
      isCameraInitializing = false;
    }
  }

  Future<void> scanAndClock() async {
    if (isProcessing) return;
    
    setState(() {
      isProcessing = true;
      message = 'Analyzing Biometrics';
      subMessage = 'Connecting to verification server...';
    });

    try {
      final image = await _controller!.takePicture();
      final bytes = await image.readAsBytes();
      final base64Image = base64Encode(bytes);

      final recognizeResponse = await http.post(
        Uri.parse(ApiConfig.RECOGNIZE_FACE),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'photo': 'data:image/jpeg;base64,$base64Image',
        }),
      );

      if (recognizeResponse.statusCode != 200) {
        final error = json.decode(recognizeResponse.body);
        setState(() {
          message = 'Verification Failed';
          subMessage = error['error'] ?? 'Identity not recognized';
          isProcessing = false;
        });
        return;
      }

      final recognizeData = json.decode(recognizeResponse.body);
      final employeeId = recognizeData['employeeId'];
      final confidence = recognizeData['confidence'];

      setState(() {
        message = 'Identity Verified';
        subMessage = 'Retreiving shift records...';
      });

      final employeeResponse = await http.get(
        Uri.parse('${ApiConfig.EMPLOYEES}/$employeeId'),
      );

      if (employeeResponse.statusCode != 200) {
        setState(() {
          message = 'System Error';
          subMessage = 'Employee records not found';
          isProcessing = false;
        });
        return;
      }

      final employee = json.decode(employeeResponse.body);
      final employeeName = employee['name'];

      final today = DateTime.now().toIso8601String().split('T')[0];
      final dtrResponse = await http.get(
        Uri.parse('${ApiConfig.NODE_API}/dtr/$employeeId'),
      );

      final dtrRecords = json.decode(dtrResponse.body);
      bool isClockedIn = false;

      for (var record in dtrRecords) {
        if (record['date'] == today && record['clockOut'] == null) {
          isClockedIn = true;
          break;
        }
      }

      String endpoint = isClockedIn ? ApiConfig.DTR_CLOCKOUT : ApiConfig.DTR_CLOCKIN;
      String action = isClockedIn ? 'Clock Out' : 'Clock In';

      final clockResponse = await http.post(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'employeeId': employeeId}),
      );

      if (clockResponse.statusCode == 200) {
        setState(() {
          message = 'Success';
          subMessage = '$action confirmed for $employeeName';
          isProcessing = false;
        });

        _showSuccessSheet(employeeName, action, confidence);
      } else {
        final error = json.decode(clockResponse.body);
        setState(() {
          message = 'Clocking Failed';
          subMessage = error['error'] ?? 'Could not record timestamp';
          isProcessing = false;
        });
      }
    } catch (e) {
      setState(() {
        message = 'Connection Lost';
        subMessage = 'Please verify server status';
        isProcessing = false;
      });
    }
  }

  void _showSuccessSheet(String name, String action, double confidence) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
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
                      color: const Color(0xFFE2E8F0), // Slate 200
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    action.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                      color: Color(0xFF64748B), // Slate 500
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      letterSpacing: -1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('PORTAL ACCESS'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: IconButton(
              icon: const Icon(Icons.person_add_rounded, color: Color(0xFF0F172A)),
              onPressed: () async {
                // Dispose camera before navigating to free up hardware
                if (_controller != null) {
                  await _controller!.dispose();
                  _controller = null;
                }
                
                if (mounted) {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => RegisterFaceScreen()),
                  );
                  
                  // Re-initialize camera when returning
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
                  padding: const EdgeInsets.all(24.0),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(40),
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
                          Container(color: Colors.black12, child: const Center(child: CircularProgressIndicator())),
                        
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
                                  Colors.black.withOpacity(0.3),
                                ],
                                stops: const [0, 0.3, 0.7, 1],
                              ),
                            ),
                          ),
                        ),
    
                        // Frame corners
                        CustomPaint(painter: FramePainter(color: isProcessing ? Colors.white.withOpacity(0.3) : Colors.white)),
                      ],
                    ),
                  ),
                ),
              ),
              
              Container(
                padding: const EdgeInsets.fromLTRB(32, 4, 32, 40),
                child: Column(
                   children: [
                    Text(
                      message.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2.0,
                        color: Color(0xFF64748B), // Slate 500
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subMessage,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                      ),
                      textAlign: TextAlign.center,
                    ),
                    
                    const SizedBox(height: 32),
                    
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isProcessing ? null : scanAndClock,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F172A),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFE2E8F0), // Slate 200
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          elevation: 4,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        child: isProcessing 
                          ? const SizedBox(
                              height: 20, 
                              width: 20, 
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)
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
    
    // Better frame sizing for responsiveness
    final paddingH = size.width * 0.15;
    final paddingV = size.height * 0.15;
    
    final rect = Rect.fromLTWH(paddingH, paddingV, size.width - paddingH * 2, size.height - paddingV * 2);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(30));

    // Top Left
    canvas.drawPath(Path()
      ..moveTo(rrect.left, rrect.top + cornerLength)
      ..lineTo(rrect.left, rrect.top + 30)
      ..arcToPoint(Offset(rrect.left + 30, rrect.top), radius: const Radius.circular(30))
      ..lineTo(rrect.left + cornerLength, rrect.top), paint);

    // Top Right
    canvas.drawPath(Path()
      ..moveTo(rrect.right - cornerLength, rrect.top)
      ..lineTo(rrect.right - 30, rrect.top)
      ..arcToPoint(Offset(rrect.right, rrect.top + 30), radius: const Radius.circular(30))
      ..lineTo(rrect.right, rrect.top + cornerLength), paint);

    // Bottom Left
    canvas.drawPath(Path()
      ..moveTo(rrect.left, rrect.bottom - cornerLength)
      ..lineTo(rrect.left, rrect.bottom - 30)
      ..arcToPoint(Offset(rrect.left + 30, rrect.bottom), radius: const Radius.circular(30), clockwise: false)
      ..lineTo(rrect.left + cornerLength, rrect.bottom), paint);

    // Bottom Right
    canvas.drawPath(Path()
      ..moveTo(rrect.right - cornerLength, rrect.bottom)
      ..lineTo(rrect.right - 30, rrect.bottom)
      ..arcToPoint(Offset(rrect.right, rrect.bottom - 30), radius: const Radius.circular(30), clockwise: false)
      ..lineTo(rrect.right, rrect.bottom - cornerLength), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}