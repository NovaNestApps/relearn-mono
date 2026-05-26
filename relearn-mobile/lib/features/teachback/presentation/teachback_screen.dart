import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../data/teachback_repository.dart';

class TeachBackScreen extends ConsumerStatefulWidget {
  final String pageId;
  const TeachBackScreen({super.key, required this.pageId});

  @override
  ConsumerState<TeachBackScreen> createState() => _TeachBackScreenState();
}

class _TeachBackScreenState extends ConsumerState<TeachBackScreen> {
  late TeachBackRepository _repo;
  final _controller = TextEditingController();
  TeachBackResult? _result;
  bool _loading = false;
  String? _error;
  List<double> _history = [];

  @override
  void initState() {
    super.initState();
    _repo = TeachBackRepository(ref.read(dioProvider));
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final scores = await _repo.getHistory(widget.pageId);
      setState(() => _history = scores.reversed.toList());
    } catch (_) {}
  }

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.length < 30) {
      setState(() => _error = 'Write at least 30 characters.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _repo.submit(widget.pageId, text);
      setState(() {
        _result = result;
        _history = [result.score, ..._history];
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Evaluation failed. Check Ollama is running.';
        _loading = false;
      });
    }
  }

  Color _scoreColor(double score) {
    if (score >= 0.7) return Colors.green;
    if (score >= 0.4) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Teach-Back')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Explain this page in your own words without looking at it.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            if (_result == null) ...[
              TextField(
                controller: _controller,
                maxLines: 8,
                decoration: const InputDecoration(
                  hintText: 'Write your explanation here...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 8),
              if (_error != null)
                Text(_error!,
                    style: const TextStyle(color: Colors.red, fontSize: 12)),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Submit & Evaluate'),
                ),
              ),
            ] else ...[
              Row(
                children: [
                  Text(
                    '${(_result!.score * 100).round()}%',
                    style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: _scoreColor(_result!.score),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: Text(_result!.feedback)),
                ],
              ),
              const SizedBox(height: 16),
              if (_result!.gaps.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Gaps identified',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ..._result!.gaps.map((g) =>
                          Text('• $g', style: const TextStyle(fontSize: 13))),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              if (_result!.followUpQuestions.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Think about this',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ..._result!.followUpQuestions.map((q) =>
                          Text(q, style: const TextStyle(fontSize: 13))),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _result = null;
                      _controller.clear();
                    });
                  },
                  child: const Text('Try Again'),
                ),
              ),
            ],
            if (_history.length > 1) ...[
              const SizedBox(height: 24),
              const Text('Progress',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _history
                    .map((score) => Chip(
                          label: Text('${(score * 100).round()}%'),
                          backgroundColor:
                              _scoreColor(score).withOpacity(0.15),
                          labelStyle: TextStyle(
                              color: _scoreColor(score),
                              fontWeight: FontWeight.bold),
                        ))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
