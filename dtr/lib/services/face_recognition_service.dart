import 'dart:io';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

class FaceRecognitionResult {
  final bool isIdentified;
  final String? employeeId;
  final double confidence;
  final double distance;
  final String message;

  FaceRecognitionResult({
    required this.isIdentified,
    this.employeeId,
    this.confidence = 0.0,
    this.distance = 999.0,
    required this.message,
  });
}

class FaceRecognitionService {
  static final FaceRecognitionService _instance = FaceRecognitionService._internal();
  factory FaceRecognitionService() => _instance;
  FaceRecognitionService._internal();

  SupabaseClient get _supabase => Supabase.instance.client;

  Interpreter? _interpreter;
  FaceDetector? _faceDetector;
  bool _isInitialized = false;

  // Cached enrolled embeddings per workplace: workplaceId -> List<{employeeId, embedding}>
  final Map<String, List<Map<String, dynamic>>> _embeddingCache = {};

  // MobileFaceNet standard input dimensions
  static const int inputSize = 112;
  // Threshold: L2 distance <= 0.82 is considered a verified match (equivalent to ~99.55% accuracy)
  static const double matchThreshold = 0.82;

  /// Initialize the TFLite MobileFaceNet model and ML Kit detector
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // 1. Initialize TFLite Interpreter
      final options = InterpreterOptions()..threads = 4;
      _interpreter = await Interpreter.fromAsset(
        'assets/models/mobilefacenet.tflite',
        options: options,
      );

      // 2. Initialize Google ML Kit Face Detector with high accuracy settings
      final detectorOptions = FaceDetectorOptions(
        performanceMode: FaceDetectorMode.accurate,
        enableLandmarks: true,
        enableClassification: false,
        minFaceSize: 0.15,
      );
      _faceDetector = FaceDetector(options: detectorOptions);

      _isInitialized = true;
      debugPrint('[FaceRecognitionService] MobileFaceNet & ML Kit initialized successfully');
    } catch (e) {
      debugPrint('[FaceRecognitionService] Init error: $e');
    }
  }

  /// Extract 192-dimensional L2-normalized face vector from an image file
  Future<List<double>?> extractFaceEmbedding(String imagePath) async {
    if (!_isInitialized) await initialize();
    if (_interpreter == null || _faceDetector == null) return null;

    try {
      // 1. Detect Face with Google ML Kit
      final inputImage = InputImage.fromFilePath(imagePath);
      final faces = await _faceDetector!.processImage(inputImage);

      if (faces.isEmpty) {
        debugPrint('[FaceRecognitionService] No face detected by ML Kit');
        return null;
      }

      // Select the largest/most prominent face in frame
      Face bestFace = faces.first;
      for (final face in faces) {
        final currentArea = face.boundingBox.width * face.boundingBox.height;
        final bestArea = bestFace.boundingBox.width * bestFace.boundingBox.height;
        if (currentArea > bestArea) {
          bestFace = face;
        }
      }

      // 2. Read and decode original image
      final bytes = await File(imagePath).readAsBytes();
      final originalImage = img.decodeImage(bytes);
      if (originalImage == null) return null;

      // 3. Crop face with 12% padding to preserve chin, forehead, and contour
      final box = bestFace.boundingBox;
      final padW = (box.width * 0.12).toInt();
      final padH = (box.height * 0.12).toInt();

      final cropX = max(0, box.left.toInt() - padW);
      final cropY = max(0, box.top.toInt() - padH);
      final cropW = min(originalImage.width - cropX, box.width.toInt() + (padW * 2));
      final cropH = min(originalImage.height - cropY, box.height.toInt() + (padH * 2));

      if (cropW <= 0 || cropH <= 0) return null;

      final croppedFace = img.copyCrop(
        originalImage,
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
      );

      // 4. Resize to 112x112 (MobileFaceNet input tensor)
      final resizedFace = img.copyResize(
        croppedFace,
        width: inputSize,
        height: inputSize,
      );

      // 5. Preprocess to Float32 tensor: (pixel - 127.5) / 128.0
      // Shape: [1, 112, 112, 3]
      var input = List.generate(
        1,
        (_) => List.generate(
          inputSize,
          (y) => List.generate(
            inputSize,
            (x) {
              final pixel = resizedFace.getPixel(x, y);
              return [
                (pixel.r - 127.5) / 128.0,
                (pixel.g - 127.5) / 128.0,
                (pixel.b - 127.5) / 128.0,
              ];
            },
          ),
        ),
      );

      // 6. Run Inference
      // Output shape: [1, 192]
      var output = List.filled(1 * 192, 0.0).reshape([1, 192]);
      _interpreter!.run(input, output);

      final rawVector = List<double>.from(output[0] as List);

      // 7. L2 Normalization
      return _l2Normalize(rawVector);
    } catch (e) {
      debugPrint('[FaceRecognitionService] Error extracting face embedding: $e');
      return null;
    }
  }

  /// L2-normalize a feature vector for accurate distance calculation
  List<double> _l2Normalize(List<double> vector) {
    double sumSquares = 0.0;
    for (final val in vector) {
      sumSquares += val * val;
    }
    final norm = sqrt(sumSquares);
    if (norm == 0.0) return vector;
    return vector.map((val) => val / norm).toList();
  }

  /// Calculate Euclidean distance between two L2-normalized vectors
  double calculateDistance(List<double> v1, List<double> v2) {
    if (v1.length != v2.length) return 999.0;
    double sum = 0.0;
    for (int i = 0; i < v1.length; i++) {
      final diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return sqrt(sum);
  }

  /// Save face embedding to Supabase for a specific room/office
  Future<bool> enrollFace({
    required String workplaceId,
    required String employeeId,
    required String imagePath,
  }) async {
    final embedding = await extractFaceEmbedding(imagePath);
    if (embedding == null) {
      throw 'No face detected in the photo. Please align your face clearly with good lighting.';
    }

    try {
      await _supabase.from('dtr_face_embeddings').upsert({
        'workplace_id': workplaceId,
        'employee_id': employeeId.trim(),
        'embedding': embedding,
        'model_name': 'mobilefacenet',
        'registered_at': DateTime.now().toIso8601String(),
      }, onConflict: 'workplace_id, employee_id');

      // Invalidate cache for this room so fresh embedding is fetched immediately
      _embeddingCache.remove(workplaceId);
      return true;
    } catch (e) {
      debugPrint('[FaceRecognitionService] enrollFace error: $e');
      throw 'Database error storing face embedding: $e';
    }
  }

  /// Recognize a face by comparing against all enrolled employees in this specific office
  Future<FaceRecognitionResult> recognizeFace({
    required String workplaceId,
    required String imagePath,
  }) async {
    final liveEmbedding = await extractFaceEmbedding(imagePath);
    if (liveEmbedding == null) {
      return FaceRecognitionResult(
        isIdentified: false,
        message: 'No clear face detected in the frame. Please look directly at the camera.',
      );
    }

    // 1. Fetch or use cached enrolled embeddings for this office
    List<Map<String, dynamic>> enrolledList = _embeddingCache[workplaceId] ?? [];
    if (enrolledList.isEmpty) {
      try {
        final data = await _supabase
          .from('dtr_face_embeddings')
          .select('employee_id, embedding')
          .eq('workplace_id', workplaceId);

        enrolledList = List<Map<String, dynamic>>.from(data as List);
        _embeddingCache[workplaceId] = enrolledList;
      } catch (e) {
        debugPrint('[FaceRecognitionService] Error fetching embeddings: $e');
      }
    }

    if (enrolledList.isEmpty) {
      return FaceRecognitionResult(
        isIdentified: false,
        message: 'No employee faces are enrolled in this office yet. Please enroll staff first.',
      );
    }

    // 2. Find closest matching face embedding (minimum Euclidean distance)
    double minDistance = 999.0;
    String? matchedEmployeeId;

    for (final record in enrolledList) {
      final empId = record['employee_id']?.toString();
      final dynamic rawEmb = record['embedding'];
      if (empId == null || rawEmb == null) continue;

      List<double> enrolledVector = [];
      if (rawEmb is List) {
        enrolledVector = rawEmb.map((e) => (e as num).toDouble()).toList();
      }

      if (enrolledVector.length == liveEmbedding.length) {
        final dist = calculateDistance(liveEmbedding, enrolledVector);
        if (dist < minDistance) {
          minDistance = dist;
          matchedEmployeeId = empId;
        }
      }
    }

    // 3. Evaluate Match against MobileFaceNet standard threshold
    if (minDistance <= matchThreshold && matchedEmployeeId != null) {
      // Calculate realistic percentage confidence based on distance
      // Distance 0.0 -> 100%, Distance 0.82 -> ~80%
      final confidence = max(0.70, min(0.99, 1.0 - (minDistance * 0.25)));

      return FaceRecognitionResult(
        isIdentified: true,
        employeeId: matchedEmployeeId,
        confidence: confidence,
        distance: minDistance,
        message: 'Identity Verified (Confidence ${(confidence * 100).toStringAsFixed(1)}%)',
      );
    } else {
      return FaceRecognitionResult(
        isIdentified: false,
        distance: minDistance,
        message: 'Face not recognized in this office records (Score: ${minDistance.toStringAsFixed(2)})',
      );
    }
  }

  void dispose() {
    _faceDetector?.close();
    _interpreter?.close();
  }
}
