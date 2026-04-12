# SCP Backup Strategy & Data Retention Policy

## Overview

This document outlines the backup strategy and data retention policies for SCP's preschool compliance management platform. Given the sensitive nature of student records, staff credentials, and compliance documentation, this policy ensures data integrity, availability, and regulatory compliance.

---

## 1. Backup Strategy

### 1.1 Database Backups (Lovable Cloud / Supabase)

| Backup Type | Frequency | Retention | Recovery Time |
|-------------|-----------|-----------|---------------|
| Point-in-Time Recovery (PITR) | Continuous | 7 days | Minutes |
| Daily Snapshots | Daily at 2 AM UTC | 30 days | 1-2 hours |
| Weekly Archives | Sundays | 90 days | 2-4 hours |
| Monthly Archives | 1st of month | 1 year | 4-8 hours |

**Automatic Features:**
- Supabase provides automatic PITR for the last 7 days
- All backups are encrypted at rest using AES-256
- Backups are stored in geographically separate regions

### 1.2 Document Storage Backups

| Storage Bucket | Content | Backup Frequency | Retention |
|----------------|---------|------------------|-----------|
| `documents` | Student enrollment docs | Daily incremental | 7 years |
| `teacher-documents` | Staff credentials | Daily incremental | 7 years post-employment |
| `staff-resumes` | Staff resumes | Weekly | 3 years |
| `document-templates` | Form templates | Weekly | Indefinite |

**Storage Features:**
- All files stored with versioning enabled
- Cross-region replication for disaster recovery
- Signed URLs prevent unauthorized access

### 1.3 School Data Export

Schools can export their data at any time via:
- **Edge Function:** `export-school-data` - Exports all school data as JSON
- **Rate Limited:** 5 exports per hour per school
- **Includes:** Students, teachers, documents metadata, compliance records, configurations

---

## 2. Data Retention Policy

### 2.1 Student Records

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Enrollment documents | 7 years after disenrollment | State childcare regulations |
| Immunization records | 7 years after disenrollment | NYC DOH requirements |
| Medical records | 7 years after disenrollment | HIPAA compliance |
| Emergency contact info | Duration of enrollment + 1 year | Operational necessity |
| Attendance records | 5 years | State requirements |

### 2.2 Staff Records

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Employment documents | 7 years post-employment | IRS/labor law requirements |
| Background checks | 7 years post-employment | Licensing requirements |
| Certifications/credentials | 7 years post-employment | State licensing |
| Training records | 7 years post-employment | OSHA/licensing |
| Performance reviews | 5 years post-employment | HR best practices |

### 2.3 Compliance Records

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| DOH inspection reports | Indefinite | Regulatory requirement |
| Fire inspection records | Indefinite | Regulatory requirement |
| Compliance evidence | 7 years | Audit requirements |
| Certification records | 7 years | Licensing |

### 2.4 System/Operational Data

| Data Type | Retention Period | Purpose |
|-----------|------------------|---------|
| Audit logs | 3 years | Security/compliance |
| Error logs | 90 days | Debugging |
| Authentication logs | 1 year | Security |
| API access logs | 90 days | Performance monitoring |

---

## 3. Data Deletion Procedures

### 3.1 Soft Delete (Default)

All user-facing deletions use soft delete:
- Records marked with `deleted_at` timestamp and `deleted_by` user ID
- Data remains in database for retention period
- Excluded from normal queries via RLS policies

### 3.2 Hard Delete (Scheduled)

Automated purge jobs run monthly:
- Remove soft-deleted records past retention period
- Remove orphaned storage files
- Anonymize PII in archived records

### 3.3 Right to Deletion Requests

For CCPA/GDPR compliance:
1. Parent submits deletion request
2. School admin reviews request
3. Platform admin processes within 30 days
4. Non-legally-required data permanently deleted
5. Legally-required data retained but anonymized

---

## 4. Disaster Recovery

### 4.1 Recovery Point Objective (RPO)

- **Database:** 5 minutes (PITR)
- **Documents:** 24 hours (daily incremental)
- **Configurations:** Real-time (version controlled)

### 4.2 Recovery Time Objective (RTO)

- **Critical systems:** 1 hour
- **Full platform:** 4 hours
- **Historical data:** 24 hours

### 4.3 Recovery Procedures

1. **Database Corruption:**
   - Restore from PITR to specific timestamp
   - Verify data integrity with checksums
   - Notify affected schools

2. **Storage Failure:**
   - Failover to replica region
   - Restore from incremental backup
   - Re-sync missing documents

3. **Complete System Failure:**
   - Deploy to backup region
   - Restore database from latest snapshot
   - Restore storage from cross-region replica
   - Update DNS and notify users

---

## 5. Security Measures

### 5.1 Backup Encryption

- All backups encrypted with AES-256
- Encryption keys managed via Supabase Vault
- Keys rotated quarterly

### 5.2 Access Control

- Backup access restricted to platform admins only
- All backup access logged in audit trail
- Multi-factor authentication required

### 5.3 Testing

- Monthly backup restoration tests
- Quarterly disaster recovery drills
- Annual third-party audit

---

## 6. Compliance Requirements

### 6.1 NYC DOH Childcare Regulations
- Maintain all required records for duration of enrollment + 7 years
- Records must be readily accessible for inspection
- Must provide records to parents upon request

### 6.2 HIPAA (Health Records)
- Medical records encrypted at rest and in transit
- Access logged and auditable
- Breach notification within 60 days

### 6.3 FERPA (Educational Records)
- Parents have right to access student records
- Records not disclosed without consent
- Annual notification of rights

---

## 7. Contact Information

**Data Protection Inquiries:**
- Email: privacy@SCP.com

**Technical Support:**
- Email: support@SCP.com

**Emergency Recovery:**
- Contact platform administrator immediately

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Next Review:** March 2025  
**Approved By:** SCP Operations Team
