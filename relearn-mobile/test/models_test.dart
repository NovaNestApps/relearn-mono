import 'package:flutter_test/flutter_test.dart';
import 'package:webpage_reader_mobile/models/models.dart';

void main() {
  test('UserProfile parses settings defaults', () {
    final user = UserProfile.fromJson({'id': 'u1', 'email': 'a@b.com'});
    expect(user.settings.spacedRepetitionEnabled, true);
    expect(user.settings.notificationEnabled, false);
  });

  test('Summary parses nested page', () {
    final summary = Summary.fromJson({
      'id': 's1',
      'pageId': 'p1',
      'content': 'c',
      'type': 'default',
      'page': {'id': 'p1', 'title': 't', 'url': 'https://x.com'}
    });
    expect(summary.page?.title, 't');
  });
}
