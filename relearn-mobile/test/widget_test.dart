import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:webpage_reader_mobile/app/app.dart';

void main() {
  testWidgets('app boots', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: ReaderMobileApp()));
    expect(find.text('Relearn'), findsNothing);
  });
}
