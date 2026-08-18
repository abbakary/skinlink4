import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/models.dart';

/// Generates a branded, printable patient treatment handout matching the
/// SkinLink "Treatment returned" prototype — suitable for handing to patients
/// at the village clinic.
class TreatmentPdfService {
  static const _primary = PdfColor.fromInt(0xFF1F7A8C);
  static const _navy = PdfColor.fromInt(0xFF0C2340);
  static const _teal = PdfColor.fromInt(0xFF0C6B58);
  static const _success = PdfColor.fromInt(0xFF16A34A);
  static const _successBg = PdfColor.fromInt(0xFFECFDF5);
  static const _warning = PdfColor.fromInt(0xFFD97706);
  static const _warningBg = PdfColor.fromInt(0xFFFFFBEB);
  static const _muted = PdfColor.fromInt(0xFF64748B);
  static const _border = PdfColor.fromInt(0xFFE2E8F0);
  static const _surface = PdfColor.fromInt(0xFFF8FAFC);
  static const _primaryLight = PdfColor.fromInt(0xFFE8F4F6);

  static Future<Uint8List> generate({
    required DermCase dermCase,
    required Map<String, dynamic> plan,
    Patient? patient,
    Tenant? tenant,
    String? specialistName,
  }) async {
    final regular = await PdfGoogleFonts.interRegular();
    final medium = await PdfGoogleFonts.interMedium();
    final bold = await PdfGoogleFonts.interBold();
    final heading = await PdfGoogleFonts.manropeBold();

    final diagnosis = plan['diagnosis'] as String? ?? 'Specialist assessment';
    final medications = (plan['medications'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final education = (plan['patientEducation'] as List?)?.cast<String>() ?? [];
    final avoidTriggers = (plan['avoidTriggers'] as List?)?.cast<String>() ?? [];
    final followUpDays = plan['followUpDays'] as int? ?? 14;
    final notes = plan['notes'] as String?;
    final createdAt = plan['createdAt'] as String?;
    final dateStr = createdAt != null
        ? DateFormat('d MMMM yyyy').format(DateTime.parse(createdAt))
        : DateFormat('d MMMM yyyy').format(DateTime.now());

    final doc = pw.Document(
      title: 'SkinLink Treatment — ${dermCase.ref}',
      author: 'SkinLink',
      subject: 'Dermatology treatment guidance',
    );

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(0),
        build: (context) => [
          _header(heading, bold, tenant?.name ?? 'Village Clinic'),
          pw.Padding(
            padding: const pw.EdgeInsets.fromLTRB(40, 28, 40, 40),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                _responseBanner(medium, bold, dateStr, specialistName ?? 'Dermatology Specialist'),
                pw.SizedBox(height: 24),
                _sectionTitle(heading, 'Patient information'),
                pw.SizedBox(height: 10),
                _patientCard(medium, bold, regular, dermCase, patient, tenant),
                pw.SizedBox(height: 24),
                _sectionTitle(heading, 'Specialist assessment'),
                pw.SizedBox(height: 10),
                _diagnosisCard(heading, medium, regular, diagnosis, dermCase.suspectedCondition),
                pw.SizedBox(height: 24),
                _sectionTitle(heading, 'Treatment plan'),
                pw.SizedBox(height: 6),
                pw.Text(
                  'Follow these steps as directed by your specialist. Contact the clinic if symptoms worsen.',
                  style: pw.TextStyle(font: regular, fontSize: 10, color: _muted),
                ),
                pw.SizedBox(height: 12),
                ...medications.asMap().entries.map((e) => _medicationCard(
                      medium,
                      regular,
                      e.key + 1,
                      e.value['name'] as String? ?? '',
                      e.value['instructions'] as String? ?? '',
                    )),
                if (avoidTriggers.isNotEmpty) ...[
                  pw.SizedBox(height: 16),
                  _warningBox(medium, regular, avoidTriggers),
                ],
                if (education.isNotEmpty) ...[
                  pw.SizedBox(height: 20),
                  _sectionTitle(heading, 'Patient education'),
                  pw.SizedBox(height: 10),
                  _bulletList(regular, education),
                ],
                pw.SizedBox(height: 20),
                if (dermCase.hasSpecialistFollowUpFeedback) ...[
                  _sectionTitle(heading, 'Specialist follow-up review'),
                  pw.SizedBox(height: 8),
                  pw.Container(
                    padding: const pw.EdgeInsets.all(14),
                    decoration: pw.BoxDecoration(
                      color: _surface,
                      borderRadius: pw.BorderRadius.circular(8),
                      border: pw.Border.all(color: _primary, width: 1),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'Action: ${(dermCase.specialistFollowUpAction ?? "continue").toUpperCase()}',
                          style: pw.TextStyle(font: medium, fontSize: 10, color: _primary),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          dermCase.specialistFollowUpFeedback!,
                          style: pw.TextStyle(font: regular, fontSize: 10, lineSpacing: 1.4),
                        ),
                      ],
                    ),
                  ),
                  pw.SizedBox(height: 16),
                ],
                _followUpBox(heading, medium, regular, followUpDays),
                if (notes != null && notes.isNotEmpty) ...[
                  pw.SizedBox(height: 20),
                  _sectionTitle(heading, 'Additional notes'),
                  pw.SizedBox(height: 8),
                  pw.Container(
                    padding: const pw.EdgeInsets.all(14),
                    decoration: pw.BoxDecoration(
                      color: _surface,
                      borderRadius: pw.BorderRadius.circular(8),
                      border: pw.Border.all(color: _border),
                    ),
                    child: pw.Text(notes, style: pw.TextStyle(font: regular, fontSize: 10, lineSpacing: 1.4)),
                  ),
                ],
                pw.SizedBox(height: 28),
                _footer(regular, medium, tenant, dermCase.ref),
              ],
            ),
          ),
        ],
      ),
    );

    return doc.save();
  }

  static pw.Widget _header(pw.Font heading, pw.Font bold, String clinicName) {
    return pw.Container(
      width: double.infinity,
      color: _navy,
      padding: const pw.EdgeInsets.fromLTRB(40, 32, 40, 28),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.center,
        children: [
          pw.Container(
            width: 44,
            height: 44,
            decoration: pw.BoxDecoration(
              color: _primary,
              borderRadius: pw.BorderRadius.circular(10),
            ),
            alignment: pw.Alignment.center,
            child: pw.Text('S', style: pw.TextStyle(font: heading, fontSize: 22, color: PdfColors.white)),
          ),
          pw.SizedBox(width: 14),
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('SkinLink', style: pw.TextStyle(font: heading, fontSize: 22, color: PdfColors.white)),
                pw.Text(
                  'Tele-Dermatology Treatment Guidance',
                  style: pw.TextStyle(font: bold, fontSize: 10, color: PdfColor.fromInt(0xFF94A3B8)),
                ),
              ],
            ),
          ),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text(clinicName, style: pw.TextStyle(font: bold, fontSize: 9, color: PdfColors.white)),
              pw.SizedBox(height: 2),
              pw.Text('Patient handout', style: pw.TextStyle(font: bold, fontSize: 8, color: _primary)),
            ],
          ),
        ],
      ),
    );
  }

  static pw.Widget _responseBanner(pw.Font medium, pw.Font bold, String date, String specialist) {
    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: pw.BoxDecoration(
        color: _successBg,
        borderRadius: pw.BorderRadius.circular(10),
        border: pw.Border.all(color: PdfColor.fromInt(0xFF86EFAC)),
      ),
      child: pw.Row(
        children: [
          pw.Container(
            width: 36,
            height: 36,
            decoration: const pw.BoxDecoration(color: _success, shape: pw.BoxShape.circle),
            alignment: pw.Alignment.center,
            child: pw.Text('✓', style: pw.TextStyle(font: bold, fontSize: 18, color: PdfColors.white)),
          ),
          pw.SizedBox(width: 14),
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  'Response received from specialist',
                  style: pw.TextStyle(font: bold, fontSize: 13, color: PdfColor.fromInt(0xFF166534)),
                ),
                pw.SizedBox(height: 3),
                pw.Text(
                  '$specialist · $date',
                  style: pw.TextStyle(font: medium, fontSize: 9, color: _muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _sectionTitle(pw.Font heading, String title) {
    return pw.Row(
      children: [
        pw.Container(width: 4, height: 18, color: _primary),
        pw.SizedBox(width: 10),
        pw.Text(title, style: pw.TextStyle(font: heading, fontSize: 14, color: _navy)),
      ],
    );
  }

  static pw.Widget _patientCard(
    pw.Font medium,
    pw.Font bold,
    pw.Font regular,
    DermCase c,
    Patient? p,
    Tenant? tenant,
  ) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(16),
      decoration: pw.BoxDecoration(
        color: _surface,
        borderRadius: pw.BorderRadius.circular(10),
        border: pw.Border.all(color: _border),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                _infoRow(bold, regular, 'Patient', p?.fullName ?? '—'),
                _infoRow(bold, regular, 'Age / Gender', p != null ? '${p.age} / ${p.gender}' : '—'),
                _infoRow(bold, regular, 'Location', p != null ? '${p.village}, ${p.region}' : tenant?.region ?? '—'),
              ],
            ),
          ),
          pw.SizedBox(width: 20),
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                _infoRow(bold, regular, 'Case reference', c.ref),
                _infoRow(bold, regular, 'Primary concern', c.primaryConcern),
                _infoRow(bold, regular, 'Body site', c.bodySite ?? '—'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _infoRow(pw.Font bold, pw.Font regular, String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(label, style: pw.TextStyle(font: bold, fontSize: 8, color: _muted)),
          pw.Text(value, style: pw.TextStyle(font: regular, fontSize: 10, color: _navy)),
        ],
      ),
    );
  }

  static pw.Widget _diagnosisCard(
    pw.Font heading,
    pw.Font medium,
    pw.Font regular,
    String diagnosis,
    String initialSuspicion,
  ) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(16),
      decoration: pw.BoxDecoration(
        color: PdfColors.white,
        borderRadius: pw.BorderRadius.circular(10),
        border: pw.Border.all(color: _primary, width: 1.5),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(diagnosis, style: pw.TextStyle(font: heading, fontSize: 18, color: _primary)),
          pw.SizedBox(height: 6),
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: pw.BoxDecoration(
              color: _primaryLight,
              borderRadius: pw.BorderRadius.circular(20),
            ),
            child: pw.Text(
              'Specialist-confirmed diagnosis',
              style: pw.TextStyle(font: medium, fontSize: 8, color: _primary),
            ),
          ),
          if (initialSuspicion.isNotEmpty) ...[
            pw.SizedBox(height: 10),
            pw.Text(
              'Initial clinic concern: $initialSuspicion',
              style: pw.TextStyle(font: regular, fontSize: 9, color: _muted),
            ),
          ],
        ],
      ),
    );
  }

  static pw.Widget _medicationCard(
    pw.Font medium,
    pw.Font regular,
    int index,
    String name,
    String instructions,
  ) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 10),
      decoration: pw.BoxDecoration(
        color: PdfColors.white,
        borderRadius: pw.BorderRadius.circular(10),
        border: pw.Border.all(color: _border),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          pw.Container(
            width: 5,
            decoration: const pw.BoxDecoration(
              color: _primary,
              borderRadius: pw.BorderRadius.only(
                topLeft: pw.Radius.circular(10),
                bottomLeft: pw.Radius.circular(10),
              ),
            ),
          ),
          pw.Expanded(
            child: pw.Padding(
              padding: const pw.EdgeInsets.fromLTRB(14, 12, 14, 12),
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(
                    width: 28,
                    height: 28,
                    decoration: pw.BoxDecoration(
                      color: _primaryLight,
                      borderRadius: pw.BorderRadius.circular(8),
                    ),
                    alignment: pw.Alignment.center,
                    child: pw.Text('$index', style: pw.TextStyle(font: medium, fontSize: 12, color: _primary)),
                  ),
                  pw.SizedBox(width: 12),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(name, style: pw.TextStyle(font: medium, fontSize: 12, color: _navy)),
                        if (instructions.isNotEmpty) ...[
                          pw.SizedBox(height: 4),
                          pw.Text(
                            instructions,
                            style: pw.TextStyle(font: regular, fontSize: 10, color: _muted, lineSpacing: 1.3),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _warningBox(pw.Font medium, pw.Font regular, List<String> triggers) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(14),
      decoration: pw.BoxDecoration(
        color: _warningBg,
        borderRadius: pw.BorderRadius.circular(10),
        border: pw.Border.all(color: PdfColor.fromInt(0xFFFCD34D)),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('⚠', style: pw.TextStyle(font: medium, fontSize: 16, color: _warning)),
          pw.SizedBox(width: 10),
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('Avoid triggers', style: pw.TextStyle(font: medium, fontSize: 11, color: _warning)),
                pw.SizedBox(height: 6),
                pw.Text(
                  triggers.join(' · '),
                  style: pw.TextStyle(font: regular, fontSize: 10, color: PdfColor.fromInt(0xFF92400E), lineSpacing: 1.3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _bulletList(pw.Font regular, List<String> items) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: items.map((item) {
        return pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 6),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Container(
                margin: const pw.EdgeInsets.only(top: 4),
                width: 6,
                height: 6,
                decoration: const pw.BoxDecoration(color: _teal, shape: pw.BoxShape.circle),
              ),
              pw.SizedBox(width: 10),
              pw.Expanded(
                child: pw.Text(item, style: pw.TextStyle(font: regular, fontSize: 10, lineSpacing: 1.3)),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  static pw.Widget _followUpBox(pw.Font heading, pw.Font medium, pw.Font regular, int days) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(16),
      decoration: pw.BoxDecoration(
        gradient: const pw.LinearGradient(
          colors: [_navy, _primary],
          begin: pw.Alignment.centerLeft,
          end: pw.Alignment.centerRight,
        ),
        borderRadius: pw.BorderRadius.circular(10),
      ),
      child: pw.Row(
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('Follow-up appointment', style: pw.TextStyle(font: heading, fontSize: 13, color: PdfColors.white)),
                pw.SizedBox(height: 4),
                pw.Text(
                  'Return to the clinic in $days days for progress review, or sooner if symptoms worsen.',
                  style: pw.TextStyle(font: regular, fontSize: 9, color: PdfColor.fromInt(0xFFCBD5E1), lineSpacing: 1.3),
                ),
              ],
            ),
          ),
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: pw.BoxDecoration(
              color: PdfColors.white,
              borderRadius: pw.BorderRadius.circular(8),
            ),
            child: pw.Column(
              children: [
                pw.Text('$days', style: pw.TextStyle(font: heading, fontSize: 22, color: _primary)),
                pw.Text('days', style: pw.TextStyle(font: medium, fontSize: 8, color: _muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _footer(pw.Font regular, pw.Font medium, Tenant? tenant, String ref) {
    return pw.Column(
      children: [
        pw.Divider(color: _border),
        pw.SizedBox(height: 12),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Expanded(
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    tenant?.name ?? 'SkinLink Clinic Network',
                    style: pw.TextStyle(font: medium, fontSize: 9, color: _navy),
                  ),
                  pw.Text(
                    tenant != null ? '${tenant.region}, ${tenant.country}' : 'Tele-dermatology referral platform',
                    style: pw.TextStyle(font: regular, fontSize: 8, color: _muted),
                  ),
                ],
              ),
            ),
            pw.Text(ref, style: pw.TextStyle(font: medium, fontSize: 9, color: _primary)),
          ],
        ),
        pw.SizedBox(height: 10),
        pw.Text(
          'This document contains confidential health information. Keep it secure and share only with authorised caregivers. '
          'Treatment guidance follows specialist assessment — contact your clinic immediately for worsening symptoms, allergic reactions, or emergency red flags.',
          style: pw.TextStyle(font: regular, fontSize: 7.5, color: _muted, lineSpacing: 1.4),
          textAlign: pw.TextAlign.center,
        ),
        pw.SizedBox(height: 6),
        pw.Text(
          'Generated by SkinLink · Secure tele-dermatology',
          style: pw.TextStyle(font: medium, fontSize: 7, color: _primary),
          textAlign: pw.TextAlign.center,
        ),
      ],
    );
  }

  /// Preview PDF in-app print/share dialog.
  static Future<void> previewAndShare({
    required DermCase dermCase,
    required Map<String, dynamic> plan,
    Patient? patient,
    Tenant? tenant,
    String? specialistName,
  }) async {
    final bytes = await generate(
      dermCase: dermCase,
      plan: plan,
      patient: patient,
      tenant: tenant,
      specialistName: specialistName,
    );
    await Printing.layoutPdf(
      onLayout: (_) async => bytes,
      name: 'SkinLink_Treatment_${dermCase.ref}.pdf',
    );
  }

  /// Share PDF via system share sheet (WhatsApp, email, save to files).
  static Future<void> sharePdf({
    required DermCase dermCase,
    required Map<String, dynamic> plan,
    Patient? patient,
    Tenant? tenant,
    String? specialistName,
  }) async {
    final bytes = await generate(
      dermCase: dermCase,
      plan: plan,
      patient: patient,
      tenant: tenant,
      specialistName: specialistName,
    );
    await Printing.sharePdf(
      bytes: bytes,
      filename: 'SkinLink_Treatment_${dermCase.ref}.pdf',
    );
  }
}
