import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import '../config/api_config.dart';

class RegisterFaceScreen extends StatefulWidget {
  @override
  _RegisterFaceScreenState createState() => _RegisterFaceScreenState();
}

class _RegisterFaceScreenState extends State<RegisterFaceScreen> {
  CameraController? _controller;
  List<CameraDescription>? cameras;
  bool isLoading = false;
  String message = 'System ready for registration';
  String subMessage = 'Align face to capture biometric data';
  TextEditingController employeeIdController = TextEditingController();

  @override
  void initState() {
    super.initState();
    initCamera();
  }

  Future<void> initCamera() async {
    // Small delay to let ClockInOutScreen dispose its camera
    await Future.delayed(const Duration(milliseconds: 500));
    
    if (_controller != null) {
      await _controller!.dispose();
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
      
      int cameraIndex = cameras!.length > 1 ? 1 : 0;
      
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
        subMessage = 'Check system permissions';
      });
    }
  }

  Future<void> registerFace() async {
    final empId = employeeIdController.text.trim();
    if (empId.isEmpty) {
      setState(() {
        message = 'Instruction Required';
        subMessage = 'Please enter a valid Employee ID';
      });
      return;
    }

    setState(() {
      isLoading = true;
      message = 'Processing Biometrics';
      subMessage = 'Uploading vector data to server...';
    });

    try {
      final XFile image = await _controller!.takePicture();
      final bytes = await File(image.path).readAsBytes();
      final base64Image = base64Encode(bytes);

      final response = await http.post(
        Uri.parse(ApiConfig.REGISTER_FACE),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode({
          'employeeId': empId,
          'photo': base64Image,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() => isLoading = false);
        
        if (mounted) {
          _showSuccessSheet(
            data['message'] ?? 'Identity successfully enrolled',
          );
        }
      } else {
        final error = json.decode(response.body);
        setState(() {
          message = 'Registration Failed';
          subMessage = error['error'] ?? 'Biometric enrollment rejected';
          isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        message = 'Connection Interrupted';
        subMessage = 'Verify network stability';
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
                  const Text(
                    'ENROLLMENT SUCCESSFUL',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                      color: Color(0xFF64748B), // Slate 500
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subText,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
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
                          Navigator.pop(context); // Go back to portal
                        }
                      },
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
    employeeIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('FACE ENROLLMENT'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
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
          child: Column(
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
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
                          Container(color: Colors.black12, child: const Center(child: CircularProgressIndicator())),
                        
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
              
              Container(
                padding: const EdgeInsets.fromLTRB(32, 4, 32, 40),
                child: Column(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 15,
                            offset: const Offset(0, 5),
                          )
                        ],
                      ),
                      child: TextField(
                        controller: employeeIdController,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        decoration: const InputDecoration(
                          labelText: 'EMPLOYEE ID',
                          labelStyle: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: Color(0xFF64748B)),
                          hintText: 'Enter ID',
                          hintStyle: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.all(18),
                          prefixIcon: Padding(
                            padding: EdgeInsets.only(left: 4.0),
                            child: Icon(Icons.badge_rounded, color: Color(0xFF0F172A), size: 20),
                          ),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 20),
                    
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isLoading ? null : registerFace,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F172A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          elevation: 4,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: isLoading
                          ? const SizedBox(
                              height: 20, 
                              width: 20, 
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.camera_alt_rounded, size: 20),
                                SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'ENROLL BIOMETRICS',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.0),
                                    overflow: TextOverflow.ellipsis,
                                  ),
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