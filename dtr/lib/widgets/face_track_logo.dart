import 'package:flutter/material.dart';

class FaceTrackLogo extends StatelessWidget {
  final double size;
  final Color color;

  const FaceTrackLogo({
    super.key,
    this.size = 32,
    this.color = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _FaceTrackLogoPainter(color),
    );
  }
}

class _FaceTrackLogoPainter extends CustomPainter {
  final Color color;

  _FaceTrackLogoPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 256.0;
    canvas.save();
    canvas.scale(scale, scale);

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // 1. Vertical Pillar
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(52, 44, 34, 168),
        const Radius.circular(17),
      ),
      paint,
    );

    // 2. Top Scanner Arm
    final topPath = Path()
      ..moveTo(72, 44)
      ..lineTo(190, 44)
      ..arcToPoint(const Offset(208, 62), radius: const Radius.circular(18))
      ..lineTo(208, 84)
      ..arcToPoint(const Offset(198, 94), radius: const Radius.circular(10))
      ..arcToPoint(const Offset(188, 84), radius: const Radius.circular(10))
      ..lineTo(188, 64)
      ..lineTo(72, 64)
      ..arcToPoint(const Offset(62, 54), radius: const Radius.circular(10))
      ..arcToPoint(const Offset(72, 44), radius: const Radius.circular(10))
      ..close();
    canvas.drawPath(topPath, paint);

    // 3. Middle Scan Beam
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(72, 112, 88, 32),
        const Radius.circular(16),
      ),
      paint,
    );

    // 4. Pulse Focal Node (with negative space core)
    final nodePath = Path()
      ..fillType = PathFillType.evenOdd
      ..addOval(Rect.fromCircle(center: const Offset(192, 128), radius: 16))
      ..addOval(Rect.fromCircle(center: const Offset(192, 128), radius: 6));
    canvas.drawPath(nodePath, paint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _FaceTrackLogoPainter oldDelegate) =>
      oldDelegate.color != color;
}
