import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/api_endpoints.dart';
import '../storage/token_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

String _short(dynamic value, {int max = 400}) {
  final text = value?.toString() ?? '';
  if (text.length <= max) return text;
  return '${text.substring(0, max)}...';
}

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  final dio = Dio(BaseOptions(baseUrl: ApiEndpoints.baseUrl));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      final hasAuth =
          (options.headers['Authorization']?.toString().isNotEmpty ?? false);
      debugPrint(
        '[API][REQ] ${options.method} ${options.baseUrl}${options.path} '
        'auth=$hasAuth data=${_short(options.data)} query=${_short(options.queryParameters)}',
      );
      handler.next(options);
    },
    onResponse: (response, handler) {
      debugPrint(
        '[API][RES] ${response.statusCode} '
        '${response.requestOptions.method} ${response.requestOptions.baseUrl}${response.requestOptions.path} '
        'data=${_short(response.data)}',
      );
      handler.next(response);
    },
    onError: (error, handler) async {
      debugPrint(
        '[API][ERR] ${error.response?.statusCode} '
        '${error.requestOptions.method} ${error.requestOptions.baseUrl}${error.requestOptions.path} '
        'message=${_short(error.message)} data=${_short(error.response?.data)}',
      );
      if (error.response?.statusCode == 401 &&
          error.requestOptions.path != ApiEndpoints.authRefresh) {
        final refreshToken = await storage.getRefreshToken();
        if (refreshToken == null) return handler.next(error);

        try {
          debugPrint('[API][AUTH] Access token expired, attempting refresh');
          final refreshDio = Dio(BaseOptions(baseUrl: ApiEndpoints.baseUrl));
          final refreshRes = await refreshDio.post(ApiEndpoints.authRefresh,
              data: {'refreshToken': refreshToken});
          final data = refreshRes.data as Map<String, dynamic>;
          await storage.saveTokens(
              data['accessToken'] as String, data['refreshToken'] as String);

          final retryReq = error.requestOptions;
          retryReq.headers['Authorization'] = 'Bearer ${data['accessToken']}';
          debugPrint(
              '[API][AUTH] Refresh succeeded, retrying ${retryReq.method} ${retryReq.path}');
          final retryRes = await dio.fetch(retryReq);
          return handler.resolve(retryRes);
        } catch (refreshError) {
          debugPrint('[API][AUTH] Refresh failed: ${_short(refreshError)}');
          await storage.clear();
        }
      }
      handler.next(error);
    },
  ));

  return dio;
});
