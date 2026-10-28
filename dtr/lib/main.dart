import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/api_config.dart';
import 'models/workplace.dart';
import 'services/dtr_auth_service.dart';
import 'services/face_recognition_service.dart';
import 'services/room_service.dart';
import 'screens/auth/sign_in_screen.dart';
import 'screens/rooms/room_list_screen.dart';
import 'screens/clock_in_out_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Supabase.initialize(
      url: ApiConfig.supabaseUrl,
      anonKey: ApiConfig.supabaseAnonKey,
    );
  } catch (e) {
    debugPrint('[Main] Supabase init warning: $e');
  }

  // Pre-warm on-device MobileFaceNet and ML Kit models
  FaceRecognitionService().initialize().catchError((e) {
    debugPrint('[Main] Face recognition model pre-load: $e');
  });

  await DtrAuthService().init();
  final activeRoom = await RoomService().getActiveRoom();
  final isAuthenticated = DtrAuthService().isAuthenticated;

  runApp(MyApp(
    isAuthenticated: isAuthenticated,
    activeRoom: activeRoom,
  ));
}

class MyApp extends StatelessWidget {
  final bool isAuthenticated;
  final Workplace? activeRoom;

  const MyApp({
    super.key,
    this.isAuthenticated = false,
    this.activeRoom,
  });

  @override
  Widget build(BuildContext context) {
    Widget initialScreen;
    if (!isAuthenticated) {
      initialScreen = const SignInScreen();
    } else if (activeRoom != null) {
      initialScreen = ClockInOutScreen(workplace: activeRoom);
    } else {
      initialScreen = const RoomListScreen();
    }

    return MaterialApp(
      title: 'FaceTrack DTR',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F172A), // Slate 900
          primary: const Color(0xFF0F172A),
          onPrimary: Colors.white,
          secondary: const Color(0xFF3B82F6), // Blue 500
          surface: Colors.white,
        ),
        fontFamily: 'Inter',
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          centerTitle: true,
          titleTextStyle: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: -0.5,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 4,
            shadowColor: const Color(0xFF0F172A).withValues(alpha: 0.2),
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ),
      home: initialScreen,
      debugShowCheckedModeBanner: false,
    );
  }
}
