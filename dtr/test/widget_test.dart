import 'package:flutter_test/flutter_test.dart';
import 'package:dtr/main.dart';

void main() {
  testWidgets('App basic smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp(isAuthenticated: false));
    expect(find.byType(MyApp), findsOneWidget);
  });
}
