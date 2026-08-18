import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/skinlink_theme.dart';
import '../widgets/skinlink_widgets.dart';
import 'guidance_screen.dart';
import 'follow_up_record_screen.dart';

class CaseDetailScreen extends StatefulWidget {
  const CaseDetailScreen({super.key, required this.caseId});

  final String caseId;

  @override
  State<CaseDetailScreen> createState() => _CaseDetailScreenState();
}

class _CaseDetailScreenState extends State<CaseDetailScreen> {
  DermCase? _case;
  bool _loading = true;
  final _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final state = context.read<AppState>();
    try {
      _case = await state.api.getCase(widget.caseId);
    } catch (_) {
      _case = state.cases.cast<DermCase?>().firstWhere(
            (c) => c?.id == widget.caseId,
            orElse: () => null,
          );
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _addNoteDialog() async {
    _noteController.clear();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Add Clarification Note',
          style: GoogleFonts.manrope(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Send additional clinical details or answer a question from the reviewing specialist.',
              style: GoogleFonts.inter(fontSize: 12.5, color: SkinLinkColors.textMuted),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'e.g. Patient returned with worsening redness on day 3...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final text = _noteController.text.trim();
              if (text.isEmpty) return;
              Navigator.of(ctx).pop();
              final state = context.read<AppState>();
              try {
                final updated = await state.api.addCaseNote(widget.caseId, text);
                if (mounted) setState(() => _case = updated);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Note sent to specialist'),
                      backgroundColor: SkinLinkColors.primary,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to send note: $e')),
                  );
                }
              }
            },
            child: const Text('Send Note'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final patient = _case != null ? state.patientById(_case!.patientId) : null;

    final patientName = patient?.fullName ?? (_case != null ? 'Patient' : 'Unknown Patient');
    final diagnosis = (_case?.suspectedCondition.isNotEmpty ?? false)
        ? _case!.suspectedCondition
        : 'Under Evaluation';
    final submittedTime = _case != null ? timeAgo(_case!.createdAt) : 'Recently';
    final hasGuidance = _case != null && _case!.hasGuidance;

    final List<String> treatmentItems = (hasGuidance &&
            _case!.treatmentPlan!['instructions'] != null)
        ? List<String>.from(_case!.treatmentPlan!['instructions'] as List)
        : (hasGuidance && _case!.treatmentPlan!['medications'] != null)
            ? (_case!.treatmentPlan!['medications'] as List)
                .map((m) => '${m['name']} — ${m['instructions'] ?? ''}')
                .toList()
            : [];

    return Scaffold(
      backgroundColor: SkinLinkColors.background,
      appBar: AppBar(
        backgroundColor: SkinLinkColors.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Referral Case Details',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        centerTitle: true,
        actions: [
          if (hasGuidance)
            IconButton(
              icon: const Icon(Icons.picture_as_pdf_outlined, color: Colors.white, size: 22),
              tooltip: 'Patient Treatment Handout',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => GuidanceScreen(caseId: _case!.id)),
                );
              },
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: SkinLinkColors.primary))
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              children: [
                // 1. Patient Header Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: SkinLinkColors.cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 26,
                        backgroundColor: SkinLinkColors.tealLight,
                        child: Text(
                          patientName.isNotEmpty ? patientName[0] : 'P',
                          style: GoogleFonts.manrope(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: SkinLinkColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    patientName,
                                    style: GoogleFonts.manrope(
                                      fontSize: 16.5,
                                      fontWeight: FontWeight.w800,
                                      color: SkinLinkColors.textPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (_case != null)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: _case!.priority == 'urgent' || _case!.priority == 'emergency'
                                          ? SkinLinkColors.orangeLight
                                          : SkinLinkColors.tealLight,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      _case!.priority.toUpperCase(),
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: _case!.priority == 'urgent' || _case!.priority == 'emergency'
                                            ? SkinLinkColors.orangeBadge
                                            : SkinLinkColors.primaryDark,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              patient != null
                                  ? '${patient.code} · ${patient.age} yrs / ${patient.gender} · ${patient.village}'
                                  : (_case != null ? _case!.ref : ''),
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: SkinLinkColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Submitted: $submittedTime · ${_case?.ref ?? ""}',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: SkinLinkColors.textLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Status Milestone Tracker (Figure 1 & 5 Clinical Workflow)
                _buildMilestonesCard(_case?.status ?? 'new', hasGuidance),
                const SizedBox(height: 14),

                // 3. Specialist Response to Follow-Up (if specialist responded)
                if (_case != null && _case!.hasSpecialistFollowUpFeedback) ...[
                  _buildSpecialistResponseCard(context, _case!),
                  const SizedBox(height: 14),
                ],

                // 4. Worker/Nurse Follow-Up Report Recorded (if submitted by worker)
                if (_case != null && _case!.hasFollowUpReport) ...[
                  _buildFollowUpReportCard(context, _case!),
                  const SizedBox(height: 14),
                ],

                // 5. Specialist Guidance Banner / Review Awaiting Notice
                if (hasGuidance)
                  _buildGuidanceReceivedCard(context, _case!)
                else
                  _buildAwaitingReviewCard(context, _case),
                const SizedBox(height: 14),

                // 4. Clinical Photos Section
                Text(
                  'Clinical Lesion Photos',
                  style: GoogleFonts.manrope(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                    color: SkinLinkColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                if (_case != null && _case!.images.isNotEmpty)
                  SizedBox(
                    height: 130,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _case!.images.length,
                      separatorBuilder: (context, index) => const SizedBox(width: 10),
                      itemBuilder: (ctx, idx) {
                        final img = _case!.images[idx];
                        final rawUrl = (img['url'] ?? img['localPath'] ?? '') as String;
                        final url = state.formatImageUrl(rawUrl);
                        final angle = (img['angle'] ?? 'Lesion') as String;
                        return Container(
                          width: 130,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: SkinLinkColors.cardBorder),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Stack(
                              children: [
                                Positioned.fill(
                                  child: Image.network(
                                    url,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) => _buildPlaceholderPhoto(label: angle),
                                  ),
                                ),
                                Positioned(
                                  bottom: 4,
                                  left: 4,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.black87,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      angle,
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  )
                else
                  Row(
                    children: [
                      Expanded(child: _buildPlaceholderPhoto(label: 'Overview Angle')),
                      const SizedBox(width: 10),
                      Expanded(child: _buildPlaceholderPhoto(label: 'Close-up Angle')),
                    ],
                  ),
                const SizedBox(height: 18),

                // 5. Clinical Assessment Checklist Summary
                Text(
                  'Structured Clinical Assessment',
                  style: GoogleFonts.manrope(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                    color: SkinLinkColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: SkinLinkColors.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _detailRow('Primary Concern', _case?.primaryConcern ?? 'Not specified'),
                      const Divider(height: 16),
                      _detailRow('Duration', _case != null ? '${_case!.durationDays} days' : 'Not specified'),
                      const Divider(height: 16),
                      _detailRow('Suspected by Clinic', diagnosis),
                      if (_case?.bodySite != null) ...[
                        const Divider(height: 16),
                        _detailRow('Body Site', _case!.bodySite!),
                      ],
                      if (_case?.clinicalInfo != null && _case!.clinicalInfo.isNotEmpty) ...[
                        const Divider(height: 16),
                        _detailRow('Clinical Notes', _case!.clinicalInfo),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 6. Actionable Guidance & Follow-Up Section
                if (hasGuidance) ...[
                  Text(
                    'Prescribed Treatment Regimen',
                    style: GoogleFonts.manrope(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      color: SkinLinkColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: SkinLinkColors.cardBorder),
                    ),
                    child: Column(
                      children: treatmentItems.isNotEmpty
                          ? treatmentItems.map((item) => TreatmentChecklistItem(text: item)).toList()
                          : [
                              Padding(
                                padding: const EdgeInsets.all(8.0),
                                child: Text(
                                  'See specialist guidance for detailed treatment instructions.',
                                  style: GoogleFonts.inter(fontSize: 13, color: SkinLinkColors.textMuted),
                                ),
                              ),
                            ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => GuidanceScreen(caseId: _case!.id)),
                          ),
                          icon: const Icon(Icons.description_outlined, size: 18),
                          label: const Text('Patient Handout'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: SkinLinkColors.teal),
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => FollowUpRecordScreen(caseId: _case!.id)),
                          ),
                          icon: const Icon(Icons.assignment_turned_in_outlined, size: 18),
                          label: const Text('Record Follow-Up'),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 24),
              ],
            ),
      // Bottom Action Bar: Clear clinic worker actions
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: SkinLinkColors.cardBorder)),
        ),
        child: SafeArea(
          child: hasGuidance
              ? SkinLinkGradientButton(
                  text: 'View Specialist Guidance & Handout',
                  onPressed: () {
                    if (_case != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => GuidanceScreen(caseId: _case!.id)),
                      );
                    }
                  },
                )
              : Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _addNoteDialog,
                        icon: const Icon(Icons.chat_bubble_outline, size: 18),
                        label: const Text('Add Clarification Note'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: SkinLinkColors.primary),
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back, size: 18),
                        label: const Text('Back to Queue'),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildMilestonesCard(String status, bool hasGuidance) {
    int currentStep = 1;
    if (status == 'in_review') currentStep = 2;
    if (hasGuidance || status == 'reviewed') currentStep = 3;
    if (status == 'follow_up' || status == 'closed') currentStep = 4;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: SkinLinkColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Referral Status Milestones',
            style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700, color: SkinLinkColors.textPrimary),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _milestoneStep(1, 'Submitted', currentStep >= 1, isCurrent: currentStep == 1),
              _milestoneLine(currentStep >= 2),
              _milestoneStep(2, 'In Review', currentStep >= 2, isCurrent: currentStep == 2),
              _milestoneLine(currentStep >= 3),
              _milestoneStep(3, 'Guidance', currentStep >= 3, isCurrent: currentStep == 3),
              _milestoneLine(currentStep >= 4),
              _milestoneStep(4, 'Follow-Up', currentStep >= 4, isCurrent: currentStep == 4),
            ],
          ),
        ],
      ),
    );
  }

  Widget _milestoneStep(int num, String label, bool isDone, {bool isCurrent = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isDone ? SkinLinkColors.primary : Colors.grey.shade200,
            border: isCurrent ? Border.all(color: SkinLinkColors.orangeBadge, width: 2) : null,
          ),
          child: Center(
            child: isDone
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : Text('$num', style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
            color: isCurrent ? SkinLinkColors.primaryDark : SkinLinkColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _milestoneLine(bool isDone) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 14),
        color: isDone ? SkinLinkColors.primary : Colors.grey.shade300,
      ),
    );
  }

  Widget _buildGuidanceReceivedCard(BuildContext context, DermCase dermCase) {
    final diagnosis = dermCase.treatmentPlan?['diagnosis'] ?? 'Dermatitis';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 20),
              const SizedBox(width: 8),
              Text(
                'Specialist Guidance Ready',
                style: GoogleFonts.manrope(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF15803D),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Specialist Diagnosis: $diagnosis',
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: SkinLinkColors.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            'The reviewing dermatologist has provided diagnostic guidance, treatment plan, and follow-up advice.',
            style: GoogleFonts.inter(fontSize: 12, color: SkinLinkColors.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildAwaitingReviewCard(BuildContext context, DermCase? dermCase) {
    final isUrgent = dermCase?.priority == 'urgent' || dermCase?.priority == 'emergency';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isUrgent ? const Color(0xFFFFF7ED) : const Color(0xFFF0F9FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isUrgent ? const Color(0xFFFED7AA) : const Color(0xFFBAE6FD)),
      ),
      child: Row(
        children: [
          Icon(
            isUrgent ? Icons.error_outline : Icons.access_time_rounded,
            color: isUrgent ? SkinLinkColors.orangeBadge : SkinLinkColors.primary,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isUrgent ? 'Urgent Queue — Specialist Alerted' : 'Awaiting Specialist Review',
                  style: GoogleFonts.manrope(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: isUrgent ? const Color(0xFFC2410C) : const Color(0xFF0369A1),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isUrgent
                    ? 'Target response: < 4 hours. Specialists at referral hospital have been notified.'
                    : 'Target response: < 24 hours. Routine queue assignment.',
                  style: GoogleFonts.inter(fontSize: 11.5, color: SkinLinkColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600, color: SkinLinkColors.textMuted),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: SkinLinkColors.textPrimary),
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholderPhoto({String label = 'Clinical Lesion Photo'}) {
    return Container(
      height: 130,
      decoration: BoxDecoration(
        color: const Color(0xFF334155),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.camera_alt_outlined, color: Colors.white70, size: 28),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFollowUpReportCard(BuildContext context, DermCase dermCase) {
    final report = dermCase.followUpReport!;
    final state = context.watch<AppState>();
    final responseStr = report['response'] as String? ?? 'recorded';
    final adherenceStr = report['adherence'] as String? ?? 'full';
    final symptomsStr = report['symptoms'] as String? ?? '';
    final notesStr = report['notes'] as String? ?? '';
    final photoUrl = report['progressPhotoUrl'] as String?;
    final worsening = report['worsening'] == true;
    final submittedAt = report['submittedAt'] as String?;
    final submittedByName = report['submittedByName'] as String? ?? 'Clinical Worker';
    final hasFeedback = dermCase.hasSpecialistFollowUpFeedback;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: worsening ? SkinLinkColors.orangeBadge : SkinLinkColors.cardBorder, width: worsening ? 1.5 : 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: SkinLinkColors.teal.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.assignment_turned_in, color: SkinLinkColors.teal, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Worker Follow-Up Report Recorded',
                      style: GoogleFonts.manrope(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: SkinLinkColors.textPrimary,
                      ),
                    ),
                    Text(
                      'Submitted by $submittedByName · ${submittedAt != null ? timeAgo(submittedAt) : "Recently"}',
                      style: GoogleFonts.inter(fontSize: 11.5, color: SkinLinkColors.textMuted),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: hasFeedback ? SkinLinkColors.successLight : SkinLinkColors.warningLight,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  hasFeedback ? 'SPECIALIST REVIEWED' : 'SENT TO SPECIALIST',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: hasFeedback ? SkinLinkColors.success : SkinLinkColors.warning,
                  ),
                ),
              ),
            ],
          ),
          if (worsening) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: SkinLinkColors.orangeLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: SkinLinkColors.orangeBadge.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: SkinLinkColors.orangeBadge, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Deterioration / Worsening Flagged for Urgent Re-Triage',
                      style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w700, color: SkinLinkColors.orangeBadge),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Patient Response', style: GoogleFonts.inter(fontSize: 11, color: SkinLinkColors.textMuted)),
                    const SizedBox(height: 2),
                    Text(
                      responseStr.toUpperCase(),
                      style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w700, color: SkinLinkColors.textPrimary),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Adherence Level', style: GoogleFonts.inter(fontSize: 11, color: SkinLinkColors.textMuted)),
                    const SizedBox(height: 2),
                    Text(
                      adherenceStr.toUpperCase(),
                      style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w700, color: SkinLinkColors.textPrimary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (symptomsStr.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('Reported Symptoms:', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: SkinLinkColors.textMuted)),
            const SizedBox(height: 2),
            Text(symptomsStr, style: GoogleFonts.inter(fontSize: 12.5, color: SkinLinkColors.textPrimary)),
          ],
          if (notesStr.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Worker Notes: $notesStr', style: GoogleFonts.inter(fontSize: 12, fontStyle: FontStyle.italic, color: SkinLinkColors.textMuted)),
          ],
          if (photoUrl != null && photoUrl.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Follow-Up Progress Photo:', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: SkinLinkColors.textMuted)),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                state.formatImageUrl(photoUrl),
                height: 120,
                width: 160,
                fit: BoxFit.cover,
                errorBuilder: (ctx, err, st) => Container(
                  height: 60,
                  width: 160,
                  color: Colors.grey.shade200,
                  child: const Center(child: Icon(Icons.broken_image, color: Colors.grey)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSpecialistResponseCard(BuildContext context, DermCase dermCase) {
    final feedback = dermCase.specialistFollowUpFeedback ?? '';
    final action = dermCase.specialistFollowUpAction ?? 'continue';
    final respondedAt = dermCase.specialistFollowUpRespondedAt;

    String actionLabel = 'Continue Current Regimen';
    Color actionBg = SkinLinkColors.tealLight;
    Color actionColor = SkinLinkColors.primaryDark;
    IconData actionIcon = Icons.check_circle_outline;

    if (action == 'discharge') {
      actionLabel = 'Discharge / Cleared';
      actionBg = SkinLinkColors.successLight;
      actionColor = SkinLinkColors.success;
      actionIcon = Icons.task_alt;
    } else if (action == 'adjust_regimen') {
      actionLabel = 'Adjust Treatment Regimen';
      actionBg = const Color(0xFFEFF6FF);
      actionColor = const Color(0xFF1D4ED8);
      actionIcon = Icons.tune;
    } else if (action == 'escalate') {
      actionLabel = 'Escalate for In-Person Specialist Visit';
      actionBg = SkinLinkColors.orangeLight;
      actionColor = SkinLinkColors.orangeBadge;
      actionIcon = Icons.warning_amber_rounded;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF86EFAC), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF16A34A).withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF16A34A).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.medical_services_outlined, color: Color(0xFF15803D), size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Specialist Response to Follow-Up',
                      style: GoogleFonts.manrope(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF14532D),
                      ),
                    ),
                    if (respondedAt != null)
                      Text(
                        'Received ${timeAgo(respondedAt)}',
                        style: GoogleFonts.inter(fontSize: 11.5, color: const Color(0xFF166534)),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: actionBg,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(actionIcon, size: 16, color: actionColor),
                const SizedBox(width: 6),
                Text(
                  actionLabel.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: actionColor),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Specialist Clinical Instructions & Feedback:',
            style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w700, color: const Color(0xFF14532D)),
          ),
          const SizedBox(height: 4),
          Text(
            feedback,
            style: GoogleFonts.inter(
              fontSize: 13,
              height: 1.4,
              fontWeight: FontWeight.w500,
              color: SkinLinkColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
