from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import base64
from io import BytesIO
from PIL import Image
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import cv2
from deepface import DeepFace
import traceback

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/employee_dtr')
client = MongoClient(MONGO_URI)
db = client['employee_dtr']
face_data_collection = db['face_data']

def decode_base64_image(base64_string):
    """Convert base64 string to image array"""
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_data))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_np = np.array(image)
        
        return image_np
    except Exception as e:
        raise Exception(f"Error decoding image: {str(e)}")

def extract_face_features(image):
    """Extract face features using DeepFace (ArcFace model)"""
    try:
        # We need ALIGNMENT for accuracy.
        # 'opencv' detector = No Alignment = Bad Accuracy (Everyone looks same).
        # 'mediapipe' = Good Alignment = High Accuracy + Fast.
        
        # We will try Mediapipe first.
        # If it fails, we assume rotation issue (common on mobile) and try ONE rotation.
        
        # We need coverage for mobile rotations (0, 90, -90).
        detectors_to_try = [
            # Mediapipe: Fast, good alignment
            ("mediapipe", 0, None),
            ("mediapipe", 90, cv2.ROTATE_90_CLOCKWISE),
            ("mediapipe", -90, cv2.ROTATE_90_COUNTERCLOCKWISE),
            
            # SSD: Slower but very robust
            ("ssd", 0, None),
            ("ssd", 90, cv2.ROTATE_90_CLOCKWISE),
            ("ssd", -90, cv2.ROTATE_90_COUNTERCLOCKWISE),
        ]

        embedding_objs = []
        used_detector = None
        used_rotation = 0
        
        for detector_name, rot_angle, rot_code in detectors_to_try:
            try:
                curr_img = image
                if rot_code is not None:
                    curr_img = cv2.rotate(image.copy(), rot_code)
                
                embedding_objs = DeepFace.represent(
                    img_path=curr_img,
                    model_name="ArcFace",
                    detector_backend=detector_name,
                    enforce_detection=True,
                    align=True 
                )
                
                if len(embedding_objs) > 0:
                    used_detector = detector_name
                    used_rotation = rot_angle
                    break
            except Exception as e:
                pass
        
        if not embedding_objs or len(embedding_objs) == 0:
            return None, "No face detected. Please ensure good lighting or try a different angle."
            
        print(f"✅ Faces detected: {len(embedding_objs)} ({used_detector} {used_rotation}°)")
        
        largest_face = max(embedding_objs, key=lambda x: x['facial_area']['w'] * x['facial_area']['h'])
        face_encoding = largest_face["embedding"]
        facial_area = largest_face["facial_area"]
        
        # Location logic simplified (returning unrotated coords for now)
        top = facial_area['y']
        right = facial_area['x'] + facial_area['w']
        bottom = facial_area['y'] + facial_area['h']
        left = facial_area['x']
        location = (top, right, bottom, left)
        
        face_data = {
            'encoding': face_encoding,
            'location': location,
            'model': 'ArcFace',
            'detector': used_detector
        }
        
        return face_data, None
        
    except Exception as e:
        print(f"❌ Error in extract_face_features: {str(e)}")
        traceback.print_exc()
        return None, f"Error processing face: {str(e)}"

def compare_faces(face_data1, face_data2, tolerance=0.6):
    """Compare two face encodings using Cosine Distance
    
    Args:
        face_data1: First face data with 'encoding'
        face_data2: Second face data with 'encoding'
        tolerance: Not used directly here, but for reference. 
                   ArcFace threshold is typically 0.68 (cosine distance).
                   We will return similarity score (1 - distance).
    
    Returns:
        similarity score (0-1, higher is more similar)
    """
    try:
        encoding1 = np.array(face_data1['encoding'])
        encoding2 = np.array(face_data2['encoding'])
        
        # Check compatibility
        if len(encoding1) != len(encoding2):
            print(f"⚠️ Dimension mismatch: {len(encoding1)} vs {len(encoding2)}. Incompatible models.")
            return 0.0
            
        # Calc Cosine Distance
        # dist = 1 - cos_sim
        # cos_sim = (a . b) / (norm(a) * norm(b))
        
        dot_product = np.dot(encoding1, encoding2)
        norm1 = np.linalg.norm(encoding1)
        norm2 = np.linalg.norm(encoding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        cosine_similarity = dot_product / (norm1 * norm2)
        
        # Ensure range -1 to 1 (numerical stability)
        cosine_similarity = max(-1.0, min(1.0, cosine_similarity))
        
        # DeepFace typically uses Distance.
        # Distance = 1 - CosineSimilarity (if normalized)
        # But we want to return "Success Score" for the existing logic which expects higher = match.
        # Let's return the Cosine Similarity directly?
        # If perfect match, sim = 1.0.
        # If opposite, sim = -1.0.
        # ArcFace Threshold for distance is 0.68.
        # Distance < 0.68 => Match.
        # 1 - Sim < 0.68 => Sim > 1 - 0.68 => Sim > 0.32.
        # Wait, that seems low.
        
        # Let's adhere to "Similarity" concept.
        # ArcFace matches are usually very close to 1.0 for same person (e.g. 0.8, 0.9).
        # Different people are usually < 0.2.
        
        return cosine_similarity
        
    except Exception as e:
        print(f"Error in comparison: {e}")
        return 0.0

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "face-recognition-deepface-arcface"}), 200

@app.route('/register-face', methods=['POST'])
def register_face():
    """Register a new face for an employee (first time only)"""
    try:
        data = request.json
        
        # Debug logging
        print("=" * 50)
        print("📥 Received register-face request")
        print(f"📄 Request has data: {data is not None}")
        
        if data:
            print(f"🔑 Data keys: {list(data.keys())}")
            print(f"👤 Employee ID present: {'employeeId' in data}")
            print(f"📸 Photo present: {'photo' in data}")
            
            if 'employeeId' in data:
                print(f"👤 Employee ID value: {data.get('employeeId')}")
            if 'photo' in data:
                photo_data = data.get('photo')
                print(f"📸 Photo data type: {type(photo_data)}")
                print(f"📸 Photo data length: {len(photo_data) if photo_data else 0}")
        else:
            print("❌ No JSON data received")
            return jsonify({"error": "No data received"}), 400
        
        employee_id = data.get('employeeId')
        photo_base64 = data.get('photo')
        
        if not employee_id:
            print("❌ Missing employeeId")
            return jsonify({"error": "Missing employeeId"}), 400
            
        if not photo_base64:
            print("❌ Missing photo")
            return jsonify({"error": "Missing photo"}), 400
        
        print(f"✅ Starting face detection...")
        
        # Decode image
        image = decode_base64_image(photo_base64)
        print(f"✅ Image decoded successfully, shape: {image.shape}")
        
        # Extract face features
        face_data, error = extract_face_features(image)
        
        if error:
            print(f"❌ Face detection error: {error}")
            return jsonify({"error": error}), 400
        
        print(f"✅ Face features extracted")
        
        # Check if employee already has a face registered
        existing = face_data_collection.find_one({"employeeId": employee_id})
        
        if existing:
            print(f"⚠️ Face already registered for employee {employee_id}")
            return jsonify({
                "error": "Face already registered for this employee. Use update-face endpoint to change it."
            }), 409  # 409 Conflict
        
        # Insert new face registration
        face_data_collection.insert_one({
            "employeeId": employee_id,
            "faceData": face_data
        })
        print(f"✅ Face registered for employee {employee_id}")
        print("=" * 50)
        
        return jsonify({
            "success": True,
            "message": "Face registered successfully",
            "employeeId": employee_id
        }), 200
        
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        print(f"❌ Exception type: {type(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/recognize-face', methods=['POST'])
def recognize_face():
    try:
        data = request.json
        
        print("=" * 50)
        print("📥 Received recognize-face request")
        
        photo_base64 = data.get('photo')
        
        if not photo_base64:
            print("❌ Missing photo")
            return jsonify({"error": "Missing photo"}), 400
        
        print(f"✅ Starting face recognition...")
        
        image = decode_base64_image(photo_base64)
        print(f"✅ Image decoded successfully")
        
        captured_face_data, error = extract_face_features(image)
        
        if error:
            print(f"❌ Face detection error: {error}")
            return jsonify({"error": error}), 400
        
        print(f"✅ Face features extracted")
        
        all_faces = list(face_data_collection.find())
        print(f"📊 Total registered faces: {len(all_faces)}")
        
        if len(all_faces) == 0:
            print("❌ No registered faces in database")
            return jsonify({"error": "No registered faces in database"}), 404
        
        best_match_id = None
        best_score = 0
        # Increased threshold for "Ultra-Strict" recognition.
        # ArcFace Cosine Similarity:
        # Same person: typically 0.75 - 0.95
        # Different person: typically < 0.30
        # 0.65 is very strict and will significantly reduce false positives.
        threshold = 0.55

        for record in all_faces:
            stored_face_data = record['faceData']
            score = compare_faces(captured_face_data, stored_face_data)
            print(f"🔍 Comparing with {record['employeeId']}: score = {score:.3f}")
            
            if score > threshold:
                print(f"🔥 Potential match: {record['employeeId']} (Score: {score:.3f} > Threshold: {threshold})")
                if score > best_score:
                    best_score = score
                    best_match_id = record['employeeId']
            else:
                print(f"◽ Nomatch: {record['employeeId']} (Score: {score:.3f})")
        
        if best_match_id:
            print(f"✅ Match found: {best_match_id} with confidence {best_score:.3f}")
            print("=" * 50)
            return jsonify({
                "success": True,
                "employeeId": best_match_id,
                "confidence": float(best_score)
            }), 200
        else:
            print(f"❌ No match found (best score: {best_score:.3f}, threshold: {threshold})")
            print("=" * 50)
            return jsonify({
                "error": "Face not recognized. Please register first."
            }), 404
        
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/delete-face/<employee_id>', methods=['DELETE'])
def delete_face(employee_id):
    try:
        result = face_data_collection.delete_one({"employeeId": employee_id})
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "Face data deleted"}), 200
        else:
            return jsonify({"error": "Face data not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/check-registration/<employee_id>', methods=['GET'])
def check_registration(employee_id):
    try:
        existing = face_data_collection.find_one({"employeeId": employee_id})
        return jsonify({"isRegistered": existing is not None, "employeeId": employee_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Face Recognition Server Starting (DeepFace ArcFace)...")
    print("📍 Server will run on http://localhost:5001")
    print("🔗 MongoDB:", MONGO_URI)
    print("✅ Ready to register and recognize faces!")
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)