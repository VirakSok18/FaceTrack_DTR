class ApiConfig {
  // IMPORTANT: Replace with your PC's IP address
  static const String NODE_API = 'http://YOUR_LOCAL_IP:5000/api';
  static const String PYTHON_API = 'http://YOUR_LOCAL_IP:5001';
  
  // API Endpoints
  static const String EMPLOYEES = '$NODE_API/employees';
  static const String DTR_CLOCKIN = '$NODE_API/dtr/clockin';
  static const String DTR_CLOCKOUT = '$NODE_API/dtr/clockout';
  
  static const String REGISTER_FACE = '$PYTHON_API/register-face';
  static const String RECOGNIZE_FACE = '$PYTHON_API/recognize-face';
  static const String CHECK_REGISTRATION = '$PYTHON_API/check-registration';
}