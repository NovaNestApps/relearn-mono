import 'package:dio/dio.dart';

import '../../../core/config/api_endpoints.dart';
import '../../../models/models.dart';

class AuthRepository {
  final Dio dio;
  AuthRepository(this.dio);

  Future<AuthResponse> login(String email, String password) async {
    final res = await dio.post(ApiEndpoints.authLogin,
        data: {'email': email, 'password': password});
    return AuthResponse.fromJson((res.data as Map).cast<String, dynamic>());
  }

  Future<AuthResponse> register(
      String email, String password, String? name) async {
    final res = await dio.post(ApiEndpoints.authRegister,
        data: {'email': email, 'password': password, 'name': name});
    return AuthResponse.fromJson((res.data as Map).cast<String, dynamic>());
  }

  Future<UserProfile> me() async {
    final res = await dio.get(ApiEndpoints.authMe);
    final json = (res.data as Map).cast<String, dynamic>();
    return UserProfile.fromJson(
        ((json['user'] as Map?) ?? json).cast<String, dynamic>());
  }

  Future<UserProfile> updateSettings(UserSettings settings) async {
    final res =
        await dio.patch(ApiEndpoints.authMeSettings, data: settings.toJson());
    final json = (res.data as Map).cast<String, dynamic>();
    return UserProfile.fromJson(
        ((json['user'] as Map?) ?? json).cast<String, dynamic>());
  }
}
