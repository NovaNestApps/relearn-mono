import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/models.dart';
import '../../auth/data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider));
});

class AuthState {
  final UserProfile? user;
  final bool ready;

  AuthState({required this.user, required this.ready});

  AuthState copyWith({UserProfile? user, bool? ready}) {
    return AuthState(user: user ?? this.user, ready: ready ?? this.ready);
  }
}

class AuthController extends StateNotifier<AuthState> {
  final Ref ref;
  AuthController(this.ref) : super(AuthState(user: null, ready: false)) {
    bootstrap();
  }

  Future<void> bootstrap() async {
    try {
      final user = await ref.read(authRepositoryProvider).me();
      state = AuthState(user: user, ready: true);
    } catch (_) {
      state = AuthState(user: null, ready: true);
    }
  }

  Future<void> login(String email, String password) async {
    final authRes =
        await ref.read(authRepositoryProvider).login(email, password);
    await ref
        .read(tokenStorageProvider)
        .saveTokens(authRes.accessToken, authRes.refreshToken);
    state = state.copyWith(user: authRes.user);
  }

  Future<void> register(String email, String password, String? name) async {
    final authRes =
        await ref.read(authRepositoryProvider).register(email, password, name);
    await ref
        .read(tokenStorageProvider)
        .saveTokens(authRes.accessToken, authRes.refreshToken);
    state = state.copyWith(user: authRes.user);
  }

  Future<void> logout() async {
    await ref.read(tokenStorageProvider).clear();
    state = state.copyWith(user: null);
  }

  Future<void> refreshProfile() async {
    final user = await ref.read(authRepositoryProvider).me();
    state = state.copyWith(user: user);
  }

  void setCurrentUser(UserProfile user) {
    state = state.copyWith(user: user);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref);
});
