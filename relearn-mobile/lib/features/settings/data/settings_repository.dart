import '../../../models/models.dart';
import '../../auth/data/auth_repository.dart';

class SettingsRepository {
  final AuthRepository authRepository;
  SettingsRepository(this.authRepository);

  Future<UserProfile> me() => authRepository.me();
  Future<UserProfile> update(UserSettings settings) =>
      authRepository.updateSettings(settings);
}
