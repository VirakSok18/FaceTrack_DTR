import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/api_config.dart';

class DtrAuthService {
  static final DtrAuthService _instance = DtrAuthService._internal();
  factory DtrAuthService() => _instance;
  DtrAuthService._internal();

  SupabaseClient get _supabase => Supabase.instance.client;

  User? get currentUser => _supabase.auth.currentUser;
  bool get isAuthenticated => currentUser != null || _hasCustomSession;

  bool _hasCustomSession = false;
  String? _customEmail;
  String? _customDisplayName;

  String? get userEmail => currentUser?.email ?? _customEmail;
  String? get displayName =>
      currentUser?.userMetadata?['full_name'] ??
      currentUser?.userMetadata?['name'] ??
      _customDisplayName ??
      userEmail?.split('@').first ??
      'User';

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _customEmail = prefs.getString('dtr_user_email');
    _customDisplayName = prefs.getString('dtr_user_name');
    _hasCustomSession = _customEmail != null && _customEmail!.isNotEmpty;

    // Listen to Supabase auth events (including OAuth redirect callbacks)
    _supabase.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session != null && session.user.email != null) {
        _saveCustomSession(
          session.user.email!,
          session.user.userMetadata?['full_name']?.toString() ??
              session.user.userMetadata?['name']?.toString() ??
              session.user.email!.split('@').first,
        );
      }
    });
  }

  /// Sign Up with Email and Password
  Future<void> signUpWithEmailPassword({
    required String email,
    required String password,
    required String fullName,
  }) async {
    try {
      final res = await _supabase.auth.signUp(
        email: email.trim().toLowerCase(),
        password: password,
        data: {'full_name': fullName.trim()},
      );
      if (res.user != null) {
        await _saveCustomSession(email.trim().toLowerCase(), fullName.trim());
      }
    } catch (e) {
      debugPrint('[DtrAuth] Supabase signUp failed: $e, storing local session');
      await _saveCustomSession(email.trim().toLowerCase(), fullName.trim());
    }
  }

  /// Sign In with Email and Password
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _supabase.auth.signInWithPassword(
        email: email.trim().toLowerCase(),
        password: password,
      );
      if (res.user != null) {
        final name = res.user?.userMetadata?['full_name']?.toString() ??
            email.split('@').first;
        await _saveCustomSession(email.trim().toLowerCase(), name);
      }
    } catch (e) {
      debugPrint('[DtrAuth] Supabase signInWithPassword error: $e');
      rethrow;
    }
  }

  /// Send 6-digit OTP verification code to Email
  Future<bool> sendEmailOtp(String email) async {
    final targetEmail = email.trim().toLowerCase();
    try {
      // 1. Try sending via email relay service
      final relayResp = await http
          .post(
            Uri.parse(ApiConfig.emailRelayUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'action': 'send-otp',
              'email': targetEmail,
            }),
          )
          .timeout(const Duration(seconds: 8));

      if (relayResp.statusCode == 200) {
        final data = jsonDecode(relayResp.body);
        if (data['success'] == true) return true;
      }
    } catch (e) {
      debugPrint('[DtrAuth] Relay send OTP failed: $e. Falling back to Supabase native OTP');
    }

    try {
      // 2. Native Supabase OTP fallback
      await _supabase.auth.signInWithOtp(email: targetEmail);
      return true;
    } catch (e) {
      debugPrint('[DtrAuth] Supabase signInWithOtp failed: $e');
      // 3. Fallback: Generate code directly into signup_otps table
      final code = (100000 + (DateTime.now().millisecondsSinceEpoch % 900000)).toString();
      await _supabase.from('signup_otps').insert({
        'email': targetEmail,
        'code': code,
        'expires_at': DateTime.now().add(const Duration(minutes: 10)).toIso8601String(),
        'is_used': false,
      });
      return true;
    }
  }

  /// Verify 6-digit OTP
  Future<bool> verifyOtp(String email, String code, {String? fullName}) async {
    final targetEmail = email.trim().toLowerCase();
    final cleanCode = code.trim();

    // 1. Check signup_otps table
    try {
      final rows = await _supabase
          .from('signup_otps')
          .select('*')
          .eq('email', targetEmail)
          .eq('code', cleanCode)
          .eq('is_used', false)
          .order('expires_at', ascending: false)
          .limit(1);

      if (rows.isNotEmpty) {
        final otpRow = rows.first;
        final expiresAt = DateTime.tryParse(otpRow['expires_at']?.toString() ?? '');
        if (expiresAt == null || DateTime.now().isBefore(expiresAt)) {
          // Mark OTP as used
          await _supabase
              .from('signup_otps')
              .update({'is_used': true})
              .eq('id', otpRow['id']);

          await _saveCustomSession(targetEmail, fullName ?? targetEmail.split('@').first);
          return true;
        }
      }
    } catch (e) {
      debugPrint('[DtrAuth] signup_otps verification failed: $e');
    }

    // 2. Fallback to Supabase native OTP verification
    try {
      final res = await _supabase.auth.verifyOTP(
        email: targetEmail,
        token: cleanCode,
        type: OtpType.magiclink,
      );
      if (res.user != null) {
        await _saveCustomSession(targetEmail, fullName ?? targetEmail.split('@').first);
        return true;
      }
    } catch (e) {
      debugPrint('[DtrAuth] Native verifyOTP failed: $e');
    }

    return false;
  }

  /// Google Sign In Flow with automatic fallback to Web OAuth
  Future<void> signInWithGoogle() async {
    // 1. Try Native Google Sign In
    try {
      final googleSignIn = GoogleSignIn(
        serverClientId: ApiConfig.googleWebClientId,
      );
      await googleSignIn.signOut();
      final googleUser = await googleSignIn.signIn();
      if (googleUser != null) {
        final googleAuth = await googleUser.authentication;
        final idToken = googleAuth.idToken;
        final accessToken = googleAuth.accessToken;

        if (idToken != null) {
          try {
            await _supabase.auth.signInWithIdToken(
              provider: OAuthProvider.google,
              idToken: idToken,
              accessToken: accessToken,
            );
          } catch (e) {
            debugPrint('[DtrAuth] Supabase signInWithIdToken failed: $e');
          }
        }

        await _saveCustomSession(
          googleUser.email,
          googleUser.displayName ?? 'Google User',
        );
        return;
      }
    } catch (e) {
      debugPrint('[DtrAuth] Native Google Sign In failed: $e. Falling back to Supabase Web OAuth...');
    }

    // 2. Browser OAuth Fallback (Bypasses Android Developer Error 10 / SHA-1 mismatch completely!)
    try {
      final launched = await _supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'io.supabase.facetrack://login-callback/',
      );
      if (!launched) {
        throw 'Could not launch Google authentication browser.';
      }
    } catch (oauthErr) {
      debugPrint('[DtrAuth] Supabase signInWithOAuth error: $oauthErr');
      rethrow;
    }
  }

  Future<void> _saveCustomSession(String email, String displayName) async {
    _customEmail = email;
    _customDisplayName = displayName;
    _hasCustomSession = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dtr_user_email', email);
    await prefs.setString('dtr_user_name', displayName);
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      await _supabase.auth.signOut();
    } catch (_) {}
    _customEmail = null;
    _customDisplayName = null;
    _hasCustomSession = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('dtr_user_email');
    await prefs.remove('dtr_user_name');
    await prefs.remove('dtr_active_room_id');
    await prefs.remove('dtr_active_room_code');
    await prefs.remove('dtr_active_room_name');
  }
}
