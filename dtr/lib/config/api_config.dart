class ApiConfig {
  // Supabase Configuration (FaceTrack DTR Master Database)
  static const String supabaseUrl = 'https://movymmlayggqzjtunlfk.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdnltbWxheWdncXpqdHVubGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjY1MDYsImV4cCI6MjEwODc0MjUwNn0.wnYGxn8vr3EvMMVe__qeTrurkLmCP2-5UsqKA9y9tLw';

  // Google OAuth Client ID (Mobile native Google Sign In)
  static const String googleWebClientId =
      '583980575924-q4ellmg3de7hibrhpo04alpr4rf2nm2b.apps.googleusercontent.com';

  // Email Relay for OTP verification (FaceTrack DTR native serverless function)
  static const String emailRelayUrl = 'https://facetrackdtr.vercel.app/api/send-email';

  // HR Web Dashboard Portal URL
  static const String hrWebPortalUrl = 'https://facetrackdtr.vercel.app';

  // Local AI Biometric Servers (optional / hybrid mode)
  static const String host = '10.0.2.2'; // default for Android emulator
  static const String nodePort = '5000';
  static const String pythonPort = '5001';

  static String get nodeApi => 'http://$host:$nodePort/api';
  static String get pythonApi => 'http://$host:$pythonPort';

  static String get employees => '$nodeApi/employees';
  static String get dtrClockin => '$nodeApi/dtr/clockin';
  static String get dtrClockout => '$nodeApi/dtr/clockout';

  static String get registerFace => '$pythonApi/register-face';
  static String get recognizeFace => '$pythonApi/recognize-face';
  static String get checkRegistration => '$pythonApi/check-registration';

  // Legacy uppercase aliases
  static String get NODE_API => nodeApi;
  static String get EMPLOYEES => employees;
  static String get DTR_CLOCKIN => dtrClockin;
  static String get DTR_CLOCKOUT => dtrClockout;
  static String get REGISTER_FACE => registerFace;
  static String get RECOGNIZE_FACE => recognizeFace;

  // Account limit: Each account is allowed a maximum of 3 rooms/offices
  static const int maxRoomsPerAccount = 3;
}
