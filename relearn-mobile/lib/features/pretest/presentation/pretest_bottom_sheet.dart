import 'package:flutter/material.dart';

import '../data/pretest_repository.dart';

enum _Step { idle, loading, quiz, result, error }

class PretestBottomSheet extends StatefulWidget {
  final PretestRepository repository;
  final String pageUrl;
  final String pageTitle;
  final String phase;

  const PretestBottomSheet({
    super.key,
    required this.repository,
    required this.pageUrl,
    required this.pageTitle,
    this.phase = 'before',
  });

  static Future<void> show(
    BuildContext context, {
    required PretestRepository repository,
    required String pageUrl,
    required String pageTitle,
    String phase = 'before',
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => PretestBottomSheet(
        repository: repository,
        pageUrl: pageUrl,
        pageTitle: pageTitle,
        phase: phase,
      ),
    );
  }

  @override
  State<PretestBottomSheet> createState() => _PretestBottomSheetState();
}

class _PretestBottomSheetState extends State<PretestBottomSheet> {
  _Step _step = _Step.idle;
  String _pretestId = '';
  List<PretestQuestion> _questions = [];
  List<String> _selected = [];
  int _current = 0;
  PretestSubmitResult? _result;
  String _errorMsg = '';

  Future<void> _start() async {
    setState(() => _step = _Step.loading);
    try {
      final res = await widget.repository.generate(
        url: widget.pageUrl,
        title: widget.pageTitle,
        phase: widget.phase,
      );
      setState(() {
        _pretestId = res.pretestId;
        _questions = res.questions;
        _selected = List.filled(res.questions.length, '');
        _current = 0;
        _step = _Step.quiz;
      });
    } catch (e) {
      setState(() {
        _errorMsg = 'Failed to load questions.';
        _step = _Step.error;
      });
    }
  }

  Future<void> _submit() async {
    setState(() => _step = _Step.loading);
    try {
      final res = await widget.repository.submit(
        pretestId: _pretestId,
        answers: _selected,
        phase: widget.phase,
      );
      setState(() {
        _result = res;
        _step = _Step.result;
      });
    } catch (e) {
      setState(() {
        _errorMsg = 'Failed to submit answers.';
        _step = _Step.error;
      });
    }
  }

  void _pick(String option) {
    setState(() {
      _selected[_current] = option;
    });
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.phase == 'before' ? 'Pre-read Quiz' : 'Post-read Quiz';
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.75,
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Flexible(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_step) {
      case _Step.idle:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.phase == 'before'
                  ? 'Answer 3 quick questions before reading to activate prior knowledge.'
                  : 'Test what you learned after reading.',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _start, child: const Text('Start Quiz')),
          ],
        );

      case _Step.loading:
        return const Center(child: CircularProgressIndicator());

      case _Step.quiz:
        final q = _questions[_current];
        final isLast = _current == _questions.length - 1;
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Question ${_current + 1} / ${_questions.length}',
                style: const TextStyle(fontSize: 12, color: Colors.black45),
              ),
              const SizedBox(height: 8),
              Text(
                q.question,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),
              ...q.options.map((opt) {
                final picked = _selected[_current] == opt;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      backgroundColor: picked ? const Color(0xFFEEF2FF) : null,
                      side: BorderSide(
                        color: picked
                            ? const Color(0xFF6366F1)
                            : Colors.grey.shade300,
                      ),
                      alignment: Alignment.centerLeft,
                    ),
                    onPressed: () => _pick(opt),
                    child: Text(
                      opt,
                      style: TextStyle(
                        color: picked
                            ? const Color(0xFF6366F1)
                            : Colors.black87,
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
              if (!isLast)
                ElevatedButton(
                  onPressed: _selected[_current].isNotEmpty
                      ? () => setState(() => _current++)
                      : null,
                  child: const Text('Next'),
                ),
              if (isLast)
                ElevatedButton(
                  onPressed: _selected.every((s) => s.isNotEmpty)
                      ? _submit
                      : null,
                  child: const Text('Submit'),
                ),
            ],
          ),
        );

      case _Step.result:
        final res = _result!;
        final pct = (res.score * 100).round();
        final numCorrect = res.correct.where((c) => c).length;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '$pct%',
              style: const TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: Color(0xFF6366F1),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$numCorrect / ${res.correct.length} correct',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: res.correct
                  .asMap()
                  .entries
                  .map(
                    (e) => Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: e.value ? Colors.green : Colors.redAccent,
                      ),
                      child: Center(
                        child: Text(
                          '${e.key + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text(widget.phase == 'before' ? 'Start Reading' : 'Done'),
            ),
          ],
        );

      case _Step.error:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_errorMsg, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => setState(() => _step = _Step.idle),
              child: const Text('Retry'),
            ),
          ],
        );
    }
  }
}
