import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/skinlink_theme.dart';
import '../widgets/skinlink_widgets.dart';
import 'submission_success_screen.dart';

const _angles = ['Overview', 'Close-up', 'Macro', 'Scale reference'];
const _stepLabels = ['Patient Info', 'Photos', 'Clinical Details', 'Submit'];

class NewReferralScreen extends StatefulWidget {
  const NewReferralScreen({super.key, this.draftId});

  final String? draftId;

  @override
  State<NewReferralScreen> createState() => _NewReferralScreenState();
}

class _NewReferralScreenState extends State<NewReferralScreen> {
  int _step = 0;
  late String _draftId;

  // Patient Info (Step 1)
  String _mode = 'new';
  String? _existingPatientId;
  final _fullName = TextEditingController();
  final _age = TextEditingController();
  String _ageRange = '25 - 35';
  String _gender = 'Female';
  final _village = TextEditingController();
  String _selectedLocation = 'Arusha';
  final _phone = TextEditingController();
  bool _consent = true;

  // Images (Step 2)
  final List<Map<String, dynamic>> _images = [];
  final _picker = ImagePicker();

  // Clinical (Step 3)
  final _concern = TextEditingController();
  final _clinicalNotes = TextEditingController();
  final _duration = TextEditingController();
  final _suspected = TextEditingController();
  final _bodySite = TextEditingController();
  final _prevTreatment = TextEditingController();
  String _priority = 'routine';
  bool _redFlag = false;

  final _locationsList = const ['Arusha', 'Mwanza', 'Kilimanjaro', 'Dar es Salaam', 'Dodoma', 'Tanga', 'Mbeya'];
  final _ageRanges = const ['0 - 12', '13 - 24', '25 - 35', '36 - 50', '51 - 65', '65+'];

  @override
  void initState() {
    super.initState();
    _draftId = widget.draftId ?? const Uuid().v4();
    _loadDraft();
  }

  void _loadDraft() {
    if (widget.draftId == null) return;
    final drafts = context.read<AppState>().localDrafts;
    final draft = drafts.cast<Map<String, dynamic>?>().firstWhere(
          (d) => d!['id'] == widget.draftId,
          orElse: () => null,
        );
    if (draft == null) return;
    setState(() {
      _step = draft['step'] as int? ?? 0;
      final patient = draft['patient'] as Map<String, dynamic>?;
      if (patient != null) {
        _mode = patient['mode'] as String? ?? 'new';
        _existingPatientId = patient['existingId'] as String?;
        _fullName.text = patient['fullName'] as String? ?? '';
        _age.text = '${patient['age'] ?? ''}';
        _gender = patient['gender'] as String? ?? 'Female';
        _village.text = patient['village'] as String? ?? '';
        _selectedLocation = _village.text.isNotEmpty ? _village.text : 'Arusha';
        _phone.text = patient['phone'] as String? ?? '';
        _consent = patient['consent'] as bool? ?? true;
      }
      _images.clear();
      _images.addAll((draft['images'] as List?)?.cast<Map<String, dynamic>>() ?? []);
      final clinical = draft['clinical'] as Map<String, dynamic>?;
      if (clinical != null) {
        _concern.text = clinical['primaryConcern'] as String? ?? '';
        _clinicalNotes.text = clinical['clinicalInfo'] as String? ?? '';
        _duration.text = '${clinical['durationDays'] ?? ''}';
        _suspected.text = clinical['suspectedCondition'] as String? ?? '';
        _bodySite.text = clinical['bodySite'] as String? ?? '';
        _prevTreatment.text = clinical['previousTreatment'] as String? ?? '';
        _priority = clinical['priority'] as String? ?? 'routine';
        _redFlag = clinical['redFlags'] != null && (clinical['redFlags'] as List).isNotEmpty;
      }
    });
  }

  @override
  void dispose() {
    _fullName.dispose();
    _age.dispose();
    _village.dispose();
    _phone.dispose();
    _concern.dispose();
    _clinicalNotes.dispose();
    _duration.dispose();
    _suspected.dispose();
    _bodySite.dispose();
    _prevTreatment.dispose();
    super.dispose();
  }

  bool get _patientValid =>
      _mode == 'existing'
          ? _existingPatientId != null
          : _fullName.text.trim().isNotEmpty && _consent;

  bool get _clinicalValid => _concern.text.trim().isNotEmpty;

  bool get _canNext {
    if (_step == 0) return _patientValid;
    if (_step == 1) return true; // Photos optional or flexible for rapid clinic flow
    if (_step == 2) return _clinicalValid;
    return true;
  }

  Map<String, dynamic> _buildDraft() => {
        'id': _draftId,
        'step': _step,
        'patient': {
          'mode': _mode,
          'existingId': _existingPatientId,
          'fullName': _fullName.text.trim(),
          'age': int.tryParse(_age.text) ?? 28,
          'gender': _gender,
          'village': _selectedLocation,
          'phone': _phone.text.trim(),
          'consent': _consent,
        },
        'images': _images,
        'clinical': {
          'primaryConcern': _concern.text.trim(),
          'clinicalInfo': _clinicalNotes.text.trim(),
          'durationDays': int.tryParse(_duration.text) ?? 7,
          'suspectedCondition': _suspected.text.trim(),
          'bodySite': _bodySite.text.trim(),
          'previousTreatment': _prevTreatment.text.trim(),
          'priority': _priority,
          'redFlags': _redFlag ? ['Clinical red flag reported'] : [],
        },
      };

  Future<void> _saveDraft() async {
    await context.read<AppState>().saveLocalDraft(_buildDraft());
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Draft saved locally'),
          backgroundColor: SkinLinkColors.primary,
        ),
      );
    }
  }

  Future<void> _captureImage(ImageSource source) async {
    final file = await _picker.pickImage(source: source, imageQuality: 85);
    if (file == null) return;
    if (!mounted) return;
    final state = context.read<AppState>();
    final bytes = await file.readAsBytes();
    String url = file.path;
    if (state.online) {
      try {
        url = await state.api.uploadImage(file);
      } catch (_) {}
    }
    setState(() {
      _images.add({
        'url': url,
        'localPath': file.path,
        'bytes': bytes,
        'angle': _angles[_images.length % _angles.length],
      });
    });
  }

  Future<void> _submit() async {
    final state = context.read<AppState>();
    final region = state.tenant?.region ?? _selectedLocation;

    final ageVal = int.tryParse(_age.text) ?? 28;
    final durVal = int.tryParse(_duration.text) ?? 7;

    final payload = <String, dynamic>{
      'draftId': _draftId,
      'clinical': {
        'primaryConcern': _concern.text.trim().isEmpty ? 'Facial rash and redness' : _concern.text.trim(),
        'clinicalInfo': _clinicalNotes.text.trim().isEmpty ? _concern.text.trim() : _clinicalNotes.text.trim(),
        'durationDays': durVal,
        'suspectedCondition': _suspected.text.trim().isEmpty ? 'Contact Dermatitis' : _suspected.text.trim(),
        'bodySite': _bodySite.text.trim().isEmpty ? 'Face' : _bodySite.text.trim(),
        'previousTreatment': _prevTreatment.text.trim(),
        'priority': _priority,
        'redFlags': _redFlag ? ['Clinical red flag reported'] : [],
      },
      'images': _images.map((img) => {
            'url': img['url'],
            'angle': img['angle'],
            'qualityScore': 85,
          }).toList(),
    };

    if (_mode == 'existing') {
      payload['patientId'] = _existingPatientId;
    } else {
      payload['patient'] = {
        'fullName': _fullName.text.trim().isEmpty ? 'Janet Musa' : _fullName.text.trim(),
        'age': ageVal,
        'gender': _gender,
        'village': _selectedLocation,
        'region': region,
        'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'consentObtained': _consent,
      };
    }

    if (!state.online) {
      payload['pendingSync'] = true;
      payload['step'] = _step;
      payload['patient'] = payload['patient'] ?? {'existingId': _existingPatientId};
      await state.saveLocalDraft({..._buildDraft(), 'pendingSync': true});
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => SubmissionSuccessScreen(
            ref: 'DRAFT-${_draftId.substring(0, 8).toUpperCase()}',
            offline: true,
          ),
        ),
      );
      return;
    }

    final result = await state.submitReferral(payload);
    if (!mounted) return;
    if (result != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => SubmissionSuccessScreen(ref: result.ref, offline: false, caseId: result.id),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(state.error ?? 'Submission failed'),
          backgroundColor: SkinLinkColors.destructive,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final patients = context.watch<AppState>().patients;

    return Scaffold(
      backgroundColor: SkinLinkColors.background,
      appBar: AppBar(
        backgroundColor: SkinLinkColors.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () {
            if (_step > 0) {
              setState(() => _step--);
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        title: Text(
          'New Referral',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _saveDraft,
            child: Text(
              'Save Draft',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // 4-Step Horizontal Pill Stepper Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: StepProgressIndicator(
              currentStep: _step,
              steps: _stepLabels,
              onStepTapped: (i) {
                if (i <= _step || _canNext) {
                  setState(() => _step = i);
                }
              },
            ),
          ),

          // Main Step Form Body
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: _step == 0
                  ? _patientStep(patients)
                  : _step == 1
                      ? _imagesStep()
                      : _step == 2
                          ? _clinicalStep()
                          : _reviewStep(),
            ),
          ),

          // Bottom Action Row (Back & Next)
          _navBar(),
        ],
      ),
    );
  }

  // STEP 1: PATIENT INFO (MATCHES PROTOTYPE SCREEN 3 EXACTLY)
  Widget _patientStep(List<Patient> patients) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SkinLinkColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Patient Mode Selector (New / Existing)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: SkinLinkColors.background,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _mode = 'new'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _mode == 'new' ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: _mode == 'new'
                            ? [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.06),
                                  blurRadius: 4,
                                  offset: const Offset(0, 1),
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'New Patient',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: _mode == 'new' ? FontWeight.w700 : FontWeight.w500,
                          color: _mode == 'new' ? SkinLinkColors.primary : SkinLinkColors.textMuted,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _mode = 'existing'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _mode == 'existing' ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: _mode == 'existing'
                            ? [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.06),
                                  blurRadius: 4,
                                  offset: const Offset(0, 1),
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Existing',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: _mode == 'existing' ? FontWeight.w700 : FontWeight.w500,
                          color: _mode == 'existing' ? SkinLinkColors.primary : SkinLinkColors.textMuted,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_mode == 'existing') ...[
            _fieldLabel('Select Patient'),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: _existingPatientId,
              decoration: const InputDecoration(hintText: 'Choose existing patient'),
              items: patients
                  .map((p) => DropdownMenuItem<String>(value: p.id, child: Text('${p.fullName} · ${p.code}')))
                  .toList(),
              onChanged: (v) => setState(() => _existingPatientId = v),
            ),
          ] else ...[
            // Patient Name Field
            _fieldLabel('Patient Name'),
            const SizedBox(height: 6),
            TextField(
              controller: _fullName,
              style: GoogleFonts.inter(fontSize: 14, color: SkinLinkColors.textPrimary),
              decoration: const InputDecoration(
                hintText: 'Janet Musa',
              ),
            ),
            const SizedBox(height: 14),

            // Gender Dropdown Field
            _fieldLabel('Gender'),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: _gender,
              decoration: const InputDecoration(),
              items: ['Female', 'Male', 'Other']
                  .map((g) => DropdownMenuItem(value: g, child: Text(g, style: GoogleFonts.inter(fontSize: 14))))
                  .toList(),
              onChanged: (v) => setState(() => _gender = v ?? 'Female'),
            ),
            const SizedBox(height: 14),

            // Age & District Row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _fieldLabel('Age'),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        initialValue: _ageRange,
                        decoration: const InputDecoration(),
                        items: _ageRanges
                            .map((a) => DropdownMenuItem(value: a, child: Text(a, style: GoogleFonts.inter(fontSize: 13))))
                            .toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() {
                              _ageRange = v;
                              _age.text = v.split(' - ').first.trim();
                            });
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _fieldLabel('District / Sub-location'),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        initialValue: _selectedLocation,
                        decoration: const InputDecoration(),
                        items: _locationsList
                            .map((loc) => DropdownMenuItem(value: loc, child: Text(loc, style: GoogleFonts.inter(fontSize: 13))))
                            .toList(),
                        onChanged: (v) {
                          if (v != null) setState(() => _selectedLocation = v);
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Location Field
            _fieldLabel('Location'),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: _selectedLocation,
              decoration: const InputDecoration(),
              items: _locationsList
                  .map((loc) => DropdownMenuItem(value: loc, child: Text(loc, style: GoogleFonts.inter(fontSize: 14))))
                  .toList(),
              onChanged: (v) {
                if (v != null) {
                  setState(() {
                    _selectedLocation = v;
                    _village.text = v;
                  });
                }
              },
            ),
            const SizedBox(height: 14),

            // Symptoms / Chief Complaint Field
            _fieldLabel('Symptoms'),
            const SizedBox(height: 6),
            TextField(
              controller: _concern,
              maxLines: 2,
              style: GoogleFonts.inter(fontSize: 14, color: SkinLinkColors.textPrimary),
              decoration: const InputDecoration(
                hintText: 'Facial rash and redness',
              ),
            ),
            const SizedBox(height: 14),

            // Consent Checkbox
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: SkinLinkColors.background,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: SkinLinkColors.cardBorder),
              ),
              child: Row(
                children: [
                  Checkbox(
                    value: _consent,
                    activeColor: SkinLinkColors.primary,
                    onChanged: (v) => setState(() => _consent = v ?? false),
                  ),
                  Expanded(
                    child: Text(
                      'Patient consent obtained for clinical photography & remote evaluation.',
                      style: GoogleFonts.inter(fontSize: 11.5, color: SkinLinkColors.textMuted),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // STEP 2: PHOTOS CAPTURE
  Widget _imagesStep() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SkinLinkColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: SkinLinkColors.tealLight,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: SkinLinkColors.tealBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.photo_camera_outlined, color: SkinLinkColors.primary, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Capture 2 or more well-lit clinical photos (overview & close-up).',
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      color: SkinLinkColors.primaryDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Main Photo Preview
          if (_images.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 4 / 3,
                child: _buildImagePreview(_images.last),
              ),
            )
          else
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: SkinLinkColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: SkinLinkColors.cardBorder, style: BorderStyle.solid),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.add_a_photo_outlined, size: 44, color: SkinLinkColors.primary),
                  const SizedBox(height: 8),
                  Text(
                    'No photos added yet',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: SkinLinkColors.textMuted),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),

          // Thumbnail capture actions row
          SizedBox(
            height: 74,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _thumbActionBtn(Icons.camera_alt, 'Camera', () => _captureImage(ImageSource.camera)),
                const SizedBox(width: 8),
                _thumbActionBtn(Icons.photo_library_outlined, 'Gallery', () => _captureImage(ImageSource.gallery)),
                ..._images.asMap().entries.map((e) {
                  final img = e.value;
                  return Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: _buildImagePreview(img, width: 74, height: 74),
                        ),
                        Positioned(
                          right: 3,
                          top: 3,
                          child: GestureDetector(
                            onTap: () => setState(() => _images.removeAt(e.key)),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // STEP 3: CLINICAL ASSESSMENT
  Widget _clinicalStep() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SkinLinkColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _fieldLabel('Primary Complaint / Concern'),
          const SizedBox(height: 6),
          TextField(controller: _concern, decoration: const InputDecoration(hintText: 'Facial rash and redness')),
          const SizedBox(height: 14),

          _fieldLabel('Body Site / Distribution'),
          const SizedBox(height: 6),
          TextField(controller: _bodySite, decoration: const InputDecoration(hintText: 'Face / Cheeks')),
          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _fieldLabel('Duration (days)'),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _duration,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(hintText: '7'),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _fieldLabel('Urgency'),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _priority,
                      decoration: const InputDecoration(),
                      items: const [
                        DropdownMenuItem(value: 'routine', child: Text('Routine')),
                        DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                        DropdownMenuItem(value: 'emergency', child: Text('Emergency')),
                      ],
                      onChanged: (v) => setState(() => _priority = v ?? 'routine'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          _fieldLabel('Suspected Condition'),
          const SizedBox(height: 6),
          TextField(controller: _suspected, decoration: const InputDecoration(hintText: 'Contact Dermatitis')),
          const SizedBox(height: 14),

          _fieldLabel('Previous Treatments Tried'),
          const SizedBox(height: 6),
          TextField(controller: _prevTreatment, decoration: const InputDecoration(hintText: 'None / Over-the-counter cream')),
          const SizedBox(height: 14),

          _fieldLabel('Additional Clinical Notes'),
          const SizedBox(height: 6),
          TextField(
            controller: _clinicalNotes,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'Patient reports itching for 1 week...'),
          ),
          const SizedBox(height: 14),

          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Clinical Red Flag Present', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13.5)),
            subtitle: Text('Fast-tracks urgent specialist review (< 4 hrs SLA)', style: GoogleFonts.inter(fontSize: 11.5, color: SkinLinkColors.textMuted)),
            value: _redFlag,
            activeTrackColor: SkinLinkColors.orangeBadge,
            onChanged: (v) => setState(() {
              _redFlag = v;
              if (v) _priority = 'urgent';
            }),
          ),
        ],
      ),
    );
  }

  // STEP 4: REVIEW & SUBMIT
  Widget _reviewStep() {
    final state = context.read<AppState>();
    final region = state.tenant?.region ?? _selectedLocation;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SkinLinkColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Referral Summary',
            style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700, color: SkinLinkColors.textPrimary),
          ),
          const SizedBox(height: 12),
          _reviewRow('Patient', _mode == 'existing'
              ? (state.patientById(_existingPatientId ?? '')?.fullName ?? 'Selected Patient')
              : '${_fullName.text} ($_gender, $_ageRange)'),
          _reviewRow('Location', '$_selectedLocation, $region'),
          _reviewRow('Chief Complaint', _concern.text),
          _reviewRow('Duration', '${_duration.text} days'),
          _reviewRow('Suspected', _suspected.text),
          _reviewRow('Urgency', _priority.toUpperCase()),
          _reviewRow('Photos', '${_images.length} photos attached'),
          const SizedBox(height: 14),

          if (_images.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _images.map((img) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _buildImagePreview(img, width: 64, height: 64),
                );
              }).toList(),
            ),
          const SizedBox(height: 14),

          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: SkinLinkColors.tealLight,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: SkinLinkColors.tealBorder),
            ),
            child: Text(
              'A unique case ID will be created and routed immediately to available specialists.',
              style: GoogleFonts.inter(fontSize: 12, color: SkinLinkColors.primaryDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: GoogleFonts.inter(fontSize: 12, color: SkinLinkColors.textMuted, fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: SkinLinkColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _thumbActionBtn(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 74,
        height: 74,
        decoration: BoxDecoration(
          border: Border.all(color: SkinLinkColors.primary, width: 1.5),
          borderRadius: BorderRadius.circular(8),
          color: SkinLinkColors.primary.withValues(alpha: 0.05),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: SkinLinkColors.primary, size: 22),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: SkinLinkColors.primary)),
          ],
        ),
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: SkinLinkColors.textPrimary,
      ),
    );
  }

  // BOTTOM ACTION BUTTONS: "Back" & "Next" MATCHING PROTOTYPE EXACTLY
  Widget _navBar() {
    final isLastStep = _step == 3;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: SkinLinkColors.cardBorder)),
      ),
      child: Row(
        children: [
          // "Back" Button
          Expanded(
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    if (_step > 0) {
                      setState(() => _step--);
                    } else {
                      Navigator.of(context).pop();
                    }
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Center(
                    child: Text(
                      'Back',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: SkinLinkColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // "Next" Button with Vibrant Orange Gradient
          Expanded(
            child: SkinLinkGradientButton(
              text: isLastStep ? 'Submit' : 'Next',
              onPressed: _canNext
                  ? () {
                      if (_step < 3) {
                        setState(() => _step++);
                      } else {
                        _submit();
                      }
                    }
                  : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview(Map<String, dynamic> img, {double? width, double? height, BoxFit fit = BoxFit.cover}) {
    if (img['bytes'] != null) {
      return Image.memory(
        img['bytes'] as Uint8List,
        width: width,
        height: height,
        fit: fit,
      );
    }
    final path = (img['localPath'] ?? img['url'] ?? '') as String;
    if (kIsWeb || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return Image.network(
        path,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (context, error, stackTrace) => Container(
          width: width,
          height: height,
          color: Colors.grey.shade200,
          child: const Icon(Icons.broken_image, color: Colors.grey),
        ),
      );
    }
    return Image.file(
      File(path),
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (context, error, stackTrace) => Container(
        width: width,
        height: height,
        color: Colors.grey.shade200,
        child: const Icon(Icons.broken_image, color: Colors.grey),
      ),
    );
  }
}

