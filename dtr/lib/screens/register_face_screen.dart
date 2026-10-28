import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
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
  bool isLoading = false;
  String message = 'System ready for registration';
  String subMessage = 'Align face to capture biometric data';

  final TextEditingController employeeIdController = TextEditingController();
  final TextEditingController nameController = TextEditingController();
  final TextEditingController roleController = TextEditingController(text: 'Employee');

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
    // Delay to let previous screen release camera hardware
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
          message = 'Hardware Error';
          subMessage = 'No camera modules detected';
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
      if (mounted) setState(() {});
    } catch (e) {
      setState(() {
        message = 'Camera Initialization Failed';
        subMessage = 'Check system camera permissions';
      });
    }
  }

  Future<void> registerFace() async {
    final empId = employeeIdController.text.trim();
    final name = nameController.text.trim();
    final role = roleController.text.trim();

    if (empId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an Employee ID')),
      );
      return;
    }
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter Employee Full Name')),
      );
      return;
    }
    if (_currentRoom == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active office selected')),
      );
      return;
    }

    setState(() {
      isLoading = true;
      message = 'Processing Biometrics';
      subMessage = 'Extracting MobileFaceNet feature vectors...';
    });

    try {
      if (_controller == null || !_controller!.value.isInitialized) {
        throw 'Camera is not initialized. Please retry.';
      }

      final XFile image = await _controller!.takePicture();

      // 1. Save employee profile in Supabase
      final success = await DtrService().registerEmployee(
        workplaceId: _currentRoom!.id,
        employeeId: empId,
        name: name,
        role: role.isEmpty ? 'Employee' : role,
      );

      if (!success) {
        throw 'Could not save employee to office database';
      }

      // 2. Extract and enroll on-device MobileFaceNet embedding in Supabase
      await FaceRecognitionService().enrollFace(
        workplaceId: _currentRoom!.id,
        employeeId: empId,
        imagePath: image.path,
      );

      setState(() => isLoading = false);
      if (mounted) {
        _showSuccessSheet('$name ($empId) enrolled with MobileFaceNet biometrics');
      }
    } catch (e) {
      setState(() {
        message = 'Enrollment Failed';
        subMessage = '$e';
        isLoading = false;
      });
    }
  }

  void _showSuccessSheet(String subText) {
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
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'ENROLLMENT SUCCESSFUL',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subText,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.black,
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 36),
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
                          Navigator.pop(context); // Go back to kiosk
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
    employeeIdController.dispose();
    nameController.dispose();
    roleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        title: Column(
          children: [
            const Text(
              'FACE ENROLLMENT',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.black),
            ),
            if (_currentRoom != null)
              Text(
                'OFFICE: ${_currentRoom!.name.toUpperCase()}',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
              ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Colors.black),
          onPressed: () async {
            if (_controller != null) {
              await _controller!.dispose();
              _controller = null;
            }
            if (mounted) Navigator.pop(context);
          },
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: SingleChildScrollView(
            child: Column(
              children: [
                // Camera Preview Container
                Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: AspectRatio(
                    aspectRatio: 3 / 4,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(32),
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
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.white24, width: 1.0),
                              borderRadius: BorderRadius.circular(32),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Inputs Container
                Container(
                  padding: const EdgeInsets.fromLTRB(28, 4, 28, 40),
                  child: Column(
                    children: [
                      // Employee ID
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          controller: employeeIdController,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Colors.black),
                          decoration: const InputDecoration(
                            labelText: 'EMPLOYEE ID',
                            labelStyle: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: Color(0xFF64748B),
                            ),
                            hintText: 'e.g. EMP-001',
                            hintStyle: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.all(16),
                            prefixIcon: Icon(Icons.badge_rounded, color: Colors.black, size: 20),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Full Name
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          controller: nameController,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Colors.black),
                          decoration: const InputDecoration(
                            labelText: 'FULL NAME',
                            labelStyle: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: Color(0xFF64748B),
                            ),
                            hintText: 'e.g. Sarah Jenkins',
                            hintStyle: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.all(16),
                            prefixIcon: Icon(Icons.person_outline_rounded, color: Colors.black, size: 20),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Role
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          controller: roleController,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Colors.black),
                          decoration: const InputDecoration(
                            labelText: 'POSITION / ROLE',
                            labelStyle: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: Color(0xFF64748B),
                            ),
                            hintText: 'e.g. Senior Designer',
                            hintStyle: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.all(16),
                            prefixIcon: Icon(Icons.work_outline_rounded, color: Colors.black, size: 20),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: isLoading ? null : registerFace,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
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
                                  children: const [
                                    Icon(Icons.camera_alt_rounded, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'ENROLL IN THIS OFFICE',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.0),
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
    );
  }
}
