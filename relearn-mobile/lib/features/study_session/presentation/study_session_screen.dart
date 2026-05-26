import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../data/study_session_repository.dart';

class StudySessionScreen extends ConsumerStatefulWidget {
  const StudySessionScreen({super.key});

  @override
  ConsumerState<StudySessionScreen> createState() => _StudySessionScreenState();
}

class _StudySessionScreenState extends ConsumerState<StudySessionScreen> {
  late StudySessionRepository _repo;
  List<StudySessionCard> _cards = [];
  String? _sessionId;
  int _idx = 0;
  bool _flipped = false;
  bool _loading = false;
  bool _done = false;
  String? _error;
  int _correct = 0;
  DateTime _cardStartedAt = DateTime.now();
  final List<Map<String, dynamic>> _results = [];

  @override
  void initState() {
    super.initState();
    _repo = StudySessionRepository(ref.read(dioProvider));
    _loadSession();
  }

  Future<void> _loadSession() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final session = await _repo.createSession(cardCount: 20);
      setState(() {
        _sessionId = session.sessionId;
        _cards = session.cards;
        _idx = 0;
        _flipped = false;
        _cardStartedAt = DateTime.now();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load session';
        _loading = false;
      });
    }
  }

  void _recordOutcome(bool correct) {
    final card = _cards[_idx];
    final timeTaken = DateTime.now().difference(_cardStartedAt).inMilliseconds;

    _results.add({
      'flashcardId': card.id,
      'correct': correct,
      'timeTaken': timeTaken,
      'confidence': correct ? 3 : 1,
    });

    if (correct) _correct++;

    if (_idx + 1 >= _cards.length) {
      _finishSession();
    } else {
      setState(() {
        _idx++;
        _flipped = false;
        _cardStartedAt = DateTime.now();
      });
    }
  }

  Future<void> _finishSession() async {
    setState(() {
      _done = true;
    });
    if (_sessionId != null) {
      await _repo.completeSession(_sessionId!, _results).catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _loadSession, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    if (_done) {
      return Scaffold(
        appBar: AppBar(title: const Text('Session Complete')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Text(
                '$_correct/${_results.length} correct',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '${(_results.isEmpty ? 0 : (_correct / _results.length * 100)).round()}%',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _done = false;
                      _results.clear();
                      _correct = 0;
                    });
                    _loadSession();
                  },
                  child: const Text('New Session'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_cards.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Study Session')),
        body: const Center(
          child: Text('No flashcards found. Save some pages first.'),
        ),
      );
    }

    final card = _cards[_idx];

    return Scaffold(
      appBar: AppBar(title: Text('${_idx + 1} / ${_cards.length}')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Chip(
              label: Text(
                card.pageId,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() {
                  _flipped = !_flipped;
                }),
                child: Card(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        _flipped ? card.answer : card.question,
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (!_flipped)
              Text(
                'Tap card to reveal answer',
                style: TextStyle(color: Colors.grey.shade500),
              ),
            if (_flipped)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _recordOutcome(false),
                      style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red),
                      child: const Text("Didn't know"),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _recordOutcome(true),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green),
                      child: const Text('Got it'),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
