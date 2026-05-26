import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/signup_page.dart';
import '../features/flashcards/presentation/flashcards_page.dart';
import '../features/quizzes/presentation/quiz_page.dart';
import '../features/settings/presentation/settings_page.dart';
import '../features/concepts/data/concepts_repository.dart';
import '../features/concepts/presentation/concept_detail_screen.dart';
import '../features/concepts/presentation/concepts_screen.dart';
import '../features/summaries/presentation/summaries_page.dart';
import '../features/summaries/presentation/summary_details_page.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/summaries',
    redirect: (context, state) {
      if (!authState.ready) return null;
      final isAuth = authState.user != null;
      final authPath =
          state.uri.path == '/login' || state.uri.path == '/signup';
      if (!isAuth && !authPath) return '/login';
      if (isAuth && authPath) return '/summaries';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupPage()),
      GoRoute(path: '/summaries', builder: (_, __) => const SummariesPage()),
      GoRoute(
          path: '/summary/:id',
          builder: (_, s) =>
              SummaryDetailsPage(summaryId: s.pathParameters['id']!)),
      GoRoute(
          path: '/summary/:id/flashcards',
          builder: (_, s) =>
              FlashcardsPage(summaryId: s.pathParameters['id']!)),
      GoRoute(
          path: '/summary/:id/quiz',
          builder: (_, s) => QuizPage(summaryId: s.pathParameters['id']!)),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsPage()),
      GoRoute(path: '/concepts', builder: (_, __) => const ConceptsScreen()),
      GoRoute(
        path: '/concepts/:id',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          final node = extra['node'] as ConceptNode?;
          final graph = extra['graph'] as ConceptGraph?;
          if (node == null) {
            return const Scaffold(
              body: Center(child: Text('Concept not found.')),
            );
          }
          return ConceptDetailScreen(node: node, graph: graph);
        },
      ),
    ],
  );
});

class AppScaffold extends StatelessWidget {
  final String title;
  final Widget child;
  const AppScaffold({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: child,
    );
  }
}
