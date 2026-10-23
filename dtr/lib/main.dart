import 'package:flutter/material.dart';
import 'screens/clock_in_out_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Employee DTR',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F172A), // Slate 900
          primary: const Color(0xFF0F172A),
          onPrimary: Colors.white,
          secondary: const Color(0xFF64748B), // Slate 500
          surface: Colors.white,
          background: const Color(0xFFF8FAFC), // Slate 50
        ),
        fontFamily: 'Inter', // Assuming Inter is default or similar
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          centerTitle: true,
          titleTextStyle: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: -0.5,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 8,
            shadowColor: const Color(0xFF0F172A).withOpacity(0.2),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
          ),
        ),
      ),
      home: ClockInOutScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}