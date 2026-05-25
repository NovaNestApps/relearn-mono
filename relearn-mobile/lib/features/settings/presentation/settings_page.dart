import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/models.dart';
import '../../auth/presentation/auth_controller.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _saving = false;
  final _timeController = TextEditingController();

  @override
  void dispose() {
    _timeController.dispose();
    super.dispose();
  }

  Future<void> _save(UserSettings settings) async {
    setState(() => _saving = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      final updated = await repo.updateSettings(settings);
      ref.read(authControllerProvider.notifier).setCurrentUser(updated);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Settings saved')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    if (user == null) {
      return const Scaffold(body: Center(child: Text('Not authenticated')));
    }
    if (!_timeController.text.isNotEmpty &&
        user.settings.notificationTime != null) {
      _timeController.text = user.settings.notificationTime!;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(user.name ?? 'No name',
                style: Theme.of(context).textTheme.titleMedium),
            Text(user.email),
            const SizedBox(height: 20),
            SwitchListTile(
              value: user.settings.spacedRepetitionEnabled,
              title: const Text('Spaced repetition'),
              onChanged: _saving
                  ? null
                  : (v) =>
                      _save(user.settings.copyWith(spacedRepetitionEnabled: v)),
            ),
            SwitchListTile(
              value: user.settings.notificationEnabled,
              title: const Text('Notifications'),
              onChanged: _saving
                  ? null
                  : (v) =>
                      _save(user.settings.copyWith(notificationEnabled: v)),
            ),
            TextField(
              decoration: const InputDecoration(
                  labelText: 'Notification time (e.g. 09:00)'),
              controller: _timeController,
              onSubmitted: _saving
                  ? null
                  : (v) => _save(user.settings
                      .copyWith(notificationTime: v.isEmpty ? null : v)),
            ),
          ],
        ),
      ),
    );
  }
}
