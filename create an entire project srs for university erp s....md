# **Software Requirements Specification (SRS)**

## **University Enterprise Resource Planning (U-ERP) System**

**Document Version:** 1.0  
**Status:** Final Draft  
**Standard:** IEEE Std 830 / ISO/IEC/IEEE 29148

## **1\. Introduction**

### **1.1 Purpose**

This Software Requirements Specification (SRS) provides a complete architectural and functional specification for the **University Enterprise Resource Planning (U-ERP) System**. It defines the functional modules, database schemas, system constraints, security protocols, and performance benchmarks required to unify academic, administrative, and financial operations across a multi-department university environment. It serves as the primary reference for software engineers, system architects, QA testers, and university stakeholders.

### **1.2 Scope**

The U-ERP system is a centralized, three-tier client-server platform accessible via a responsive web portal and native mobile applications. It replaces fragmented legacy software across departments with a single source of truth. Core areas covered include:

* **Student Lifecycle Management:** Admissions, enrollment, credit registration, attendance, and alumni tracking.  
* **Academic & Examination Management:** Curriculum mapping, timetable generation, hall ticket issuance, grading, and CGPA calculation.  
* **Finance & Fee Accounting:** Automated invoicing, payment gateway integration, scholarship disbursement, and payroll.  
* **Human Resource Management (HRMS):** Faculty onboarding, leave workflows, workload allocation, and performance appraisal.  
* **Campus Infrastructure:** Library management (OPAC/RFID), hostel room allocation, and inventory tracking.

### **1.3 Definitions, Acronyms, and Abbreviations**

| Term / Acronym | Definition |
| :---- | :---- |
| **ERP** | Enterprise Resource Planning |
| **RBAC** | Role-Based Access Control |
| **SIS** | Student Information System |
| **CBCS** | Choice Based Credit System |
| **SGPA / CGPA** | Semester Grade Point Average / Cumulative Grade Point Average |
| **LMS** | Learning Management System |
| **OPAC** | Online Public Access Catalog (Library System) |
| **JWT** | JSON Web Token (Stateless Authentication) |
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **RPO / RTO** | Recovery Point Objective / Recovery Time Objective |

### **1.4 References**

* IEEE Std 830-1998: *IEEE Recommended Practice for Software Requirements Specifications*.  
* ISO/IEC/IEEE 29148:2018: *Systems and software engineering — Life cycle processes — Requirements engineering*.  
* OWASP Application Security Verification Standard (ASVS) v4.0.  
* University Grants Commission (UGC) / Academic Credit Framework Guidelines.

## **2\. Overall Description**

### **2.1 Product Perspective**

The U-ERP system operates as a modular, service-oriented three-tier architecture:

> 1. **Presentation Tier:** Responsive Web Portal (React/Next.js) and Mobile Client (Android/iOS) consuming RESTful APIs over HTTPS.  
> 2. **Application Tier:** Spring Boot / Java enterprise backend handling business logic, role-based authorization, automated cron jobs, and third-party API orchestration.  
> 3. **Data Tier:** Relational Database Management System (PostgreSQL/MySQL) for transactional ACID compliance, paired with an in-memory caching layer (Redis) for high-concurrency read operations (e.g., exam result publication) and object storage (S3-compatible) for documents.

\+-----------------------------------------------------------------------+  
|                           PRESENTATION TIER                           |  
|   \[Admin/Faculty Web Portal\]           \[Student Web & Mobile App\]     |  
\+-----------------------------------+-----------------------------------+  
                                    | HTTPS / REST API (JSON \+ JWT)  
                                    v  
\+-----------------------------------------------------------------------+  
|                           APPLICATION TIER                            |  
|                     \[API Gateway & Load Balancer\]                     |  
|                                   |                                   |  
|  \+----------------+  \+------------+-----------+  \+-----------------+  |  
|  | Academic Svc   |  | Finance & Fee Service  |  | Exam & Grading  |  |  
|  \+----------------+  \+------------+-----------+  \+-----------------+  |  
|  | HR & Payroll   |  | Hostel & Library Svc   |  | Notification Svc|  |  
|  \+----------------+  \+------------------------+  \+-----------------+  |  
\+-----------------------------------+-----------------------------------+  
                                    | JDBC / Connection Pool  
                                    v  
\+-----------------------------------------------------------------------+  
|                              DATA TIER                                |  
|   \[Primary RDBMS (MySQL/PostgreSQL)\]   \[Redis Cache\]   \[Doc Storage\]  |  
\+-----------------------------------------------------------------------+

### **2.2 User Classes and Characteristics**

| User Class | Access Channel | Core Responsibilities & Technical Proficiency |
| :---- | :---- | :---- |
| **Super Admin (IT Cell)** | Web Portal | System configuration, RBAC policy management, database backups, audit log monitoring. High technical proficiency. |
| **Registrar / Dean** | Web Portal | Academic calendar approval, curriculum freeze, degree auditing, institutional reporting. Moderate proficiency. |
| **Controller of Exams (CoE)** | Web Portal | Exam scheduling, seating allocation, marks moderation, result publication, transcript generation. Moderate proficiency. |
| **Faculty / HOD** | Web & Mobile | Attendance logging, internal assessment entry, course material upload, leave approvals, mentoring. Moderate proficiency. |
| **Finance Officer** | Web Portal | Fee structure setup, ledger reconciliation, scholarship verification, vendor & payroll processing. Moderate proficiency. |
| **Student** | Web & Mobile | Subject registration, timetable viewing, fee payment, attendance tracking, result download. Varied proficiency. |
| **Librarian / Warden** | Web Portal | Book circulation, fine calculation, hostel room allotment, mess billing. Basic to moderate proficiency. |

### **2.3 Operating Environment**

* **Server Environment:** Linux-based cloud or on-premise cluster (Ubuntu Server 24.04 LTS / RHEL), Docker/Kubernetes container orchestration.  
* **Application Runtime:** Java 21 LTS (Spring Boot 3.x), Node.js 20+ (Frontend build pipeline).  
* **Database:** MySQL 8.0+ or PostgreSQL 16+ with Master-Replica replication.  
* **Client Requirements:** Modern web browsers (Chrome 115+, Firefox 115+, Safari 16+, Edge) and Android 10.0+ / iOS 15.0+ for mobile clients.

### **2.4 Design and Implementation Constraints**

* **Concurrency Spikes:** The architecture must survive extreme traffic spikes during semester course registration (CBCS window) and exam result declarations without database deadlocks.  
* **Immutable Audit Trails:** Grade modifications, fee waivers, and attendance overrides must never overwrite records destructively; all mutations require append-only audit logs capturing user ID, timestamp, IP address, old value, and new value.  
* **Regulatory Compliance:** Financial records must adhere to standard double-entry accounting principles and statutory tax deduction rules.

### **2.5 Assumptions and Dependencies**

* The university has reliable campus-wide intranet/internet connectivity for real-time attendance entry.  
* Third-party payment gateways (e.g., Razorpay, Stripe, PayU) and SMS/Email gateways (e.g., AWS SES, Twilio) provide 99.9% uptime and webhook reliability.

## **3\. System Features & Functional Requirements**

### **3.1 Identity, Authentication & Role-Based Access Control (RBAC)**

**Description:** Central security module managing user identities, single sign-on (SSO), and granular permissions across all sub-modules. *(Priority: High)*

* **FR-AUTH-01:** The system shall authenticate users via unique institutional IDs (Enrollment No. / Employee ID) and salted, bcrypt-hashed passwords.  
* **FR-AUTH-02:** The system shall issue short-lived stateless JSON Web Tokens (JWT) alongside refresh tokens for session management across web and mobile clients.  
* **FR-AUTH-03:** The system shall enforce Multi-Factor Authentication (MFA) via OTP/Authenticator app for privileged roles (Super Admin, CoE, Finance Officer).  
* **FR-AUTH-04:** The system shall implement granular RBAC matrices mapping Roles \-\> Modules \-\> CRUD Permissions (Read, Write, Approve, Delete).  
* **FR-AUTH-05:** The system shall automatically lock an account for 30 minutes after 5 consecutive failed login attempts and log the source IP.

### **3.2 Student Admission & Enrollment Module**

**Description:** Manages the prospective applicant funnel from online application to final enrollment number generation. *(Priority: High)*

* **FR-ADM-01:** Prospective students shall submit online admission forms, upload KYC/academic documents (PDF/JPEG under 5 MB), and pay application fees online.  
* **FR-ADM-02:** The system shall compute merit lists automatically based on configurable entrance exam scores, category quotas, and qualifying marks.  
* **FR-ADM-03:** Admission officers shall verify uploaded documents via a split-screen verification queue and mark applications as *Approved*, *Provisionally Admitted*, or *Rejected with Reason*.  
* **FR-ADM-04:** Upon admission fee clearance, the system shall automatically generate a unique permanent Enrollment Number following the university schema (e.g., YYYY-DEPT-BATCH-SEQ), provision institutional email credentials, and migrate the applicant record to the active Student Master table.

### **3.3 Academic, Curriculum & Attendance Management**

**Description:** Governs degree programs, CBCS subject registration, conflict-free timetabling, and daily attendance tracking. *(Priority: High)*

* **FR-ACAD-01:** Deans/HODs shall define program structures, semester syllabi, course codes, L-T-P (Lecture-Tutorial-Practical) hours, and credit weights.  
* **FR-ACAD-02:** During the semester registration window, students shall select Core, Department Elective, and Open Elective courses subject to prerequisite validation and seat capacity caps.  
* **FR-ACAD-03:** The system shall generate conflict-free master timetables ensuring no faculty member, student batch, or physical classroom is double-booked within the same timeslot.  
* **FR-ACAD-04:** Faculty shall record lecture/lab attendance via web or mobile app within a configurable window (default: 24 hours from lecture completion); expired windows shall lock and require HOD override.  
* **FR-ACAD-05:** The system shall calculate real-time attendance percentages per subject and trigger automated warning notifications to students and parents if attendance falls below **75%**.

### **3.4 Examination & Grading Engine**

**Description:** Automates exam eligibility checks, hall ticket generation, confidential mark entry, and SGPA/CGPA computation. *(Priority: High)*

* **FR-EXAM-01:** The system shall generate examination eligibility lists by cross-verifying two criteria:  
  1. Zero pending tuition/exam fee dues.  
  2. Minimum **75%** attendance across registered courses (or approved medical condonation flag).  
* **FR-EXAM-02:** Eligible students shall download digitally signed PDF Hall Tickets containing QR codes for exam hall verification.  
* **FR-EXAM-03:** The system shall support anonymous answer script evaluation by generating randomized dummy barcodes mapped to actual student Enrollment Numbers in an encrypted lookup table.  
* **FR-EXAM-04:** Faculty shall input Continuous Internal Evaluation (CIE) marks, and examiners shall input Semester End Examination (SEE) marks; once submitted and locked by the HOD/CoE, grades cannot be altered without a dual-authorization workflow.  
* **FR-EXAM-05:** The system shall compute course grades, Semester Grade Point Average (SGPA), and Cumulative Grade Point Average (CGPA) using the standard credit-weighted formulas:

$$SGPA=\frac{\sum\limits_{i=1}^{n}({C}_{i}\times {G}_{i})}{\sum\limits_{i=1}^{n}{C}_{i}}$$

$$CGPA=\frac{\sum\limits_{j=1}^{m}(SGP{A}_{j}\times {S}_{j})}{\sum\limits_{j=1}^{m}{S}_{j}}$$

Where ${C}_{i}$ is the credit weight of course $i$, ${G}_{i}$ is the grade point earned in course $i$ (on a 10-point scale), and ${S}_{j}$ is the total credits registered in semester $j$.

* **FR-EXAM-06:** Students with failed courses (F grade) shall be able to register and pay for supplementary/backlog examinations in subsequent cycles.

### **3.5 Finance, Fee & Accounting Module**

**Description:** Handles student invoicing, online payment processing, scholarship adjustments, and automated ledger reconciliation. *(Priority: High)*

* **FR-FIN-01:** Finance administrators shall configure fee templates mapped by Program, Batch, Quota, and Hostel/Transport opt-in status.  
* **FR-FIN-02:** The system shall integrate with payment gateways via server-to-server webhooks to process UPI, NetBanking, Credit/Debit cards, and NEFT/RTGS challans.  
* **FR-FIN-03:** In the event of network drops during payment, an automated reconciliation cron job shall query the payment gateway status API every 15 minutes to resolve *Pending* transactions into *Success* or *Refund/Failed*.  
* **FR-FIN-04:** Upon successful payment, the system shall immediately update the student ledger, lift any fee-related academic holds, and generate a downloadable, tamper-proof PDF receipt.  
* **FR-FIN-05:** The system shall automatically apply late payment penalties based on configurable slab rules and adjust fee demands against verified government or institutional scholarships.

### **3.6 Human Resource Management & Payroll (HRMS)**

**Description:** Manages employee lifecycles, biometric attendance sync, leave routing, and monthly salary disbursement. *(Priority: Medium)*

* **FR-HR-01:** The system shall maintain comprehensive faculty and staff profiles, including academic qualifications, publications, patent records, pay scales, and bank details.  
* **FR-HR-02:** The system shall ingest daily check-in/check-out logs from campus biometric hardware via REST webhook or scheduled CSV/API sync.  
* **FR-HR-03:** Employees shall apply for Casual, Medical, Earned, or Academic Duty Leave; requests shall route through a multi-stage approval workflow (Faculty \-\> HOD \-\> Principal/Registrar) with automatic substitute faculty tagging for scheduled classes.  
* **FR-HR-04:** At month-end, the payroll engine shall calculate gross pay, Basic \+ DA \+ HRA, statutory deductions (PF, TDS, Professional Tax), and Loss of Pay (LoP) days to generate payslips and bank disbursement files.

### **3.7 Library & Hostel Management**

**Description:** Digitizes book cataloging, circulation fines, and residential room/mess management. *(Priority: Medium)*

* **FR-LIB-01:** The Library sub-module shall provide an Online Public Access Catalog (OPAC) searchable by ISBN, title, author, and subject availability.  
* **FR-LIB-02:** Barcode/RFID integration shall process book checkouts, renewals, reservations, and automated overdue fine calculations transferred directly to the student's finance ledger at semester end (No-Dues clearance).  
* **FR-HST-01:** The Hostel sub-module shall manage building blocks, room capacities, inventory assets, room allotment requests, and monthly mess attendance billing.  
* **FR-HST-02:** Hostel students shall apply for gate passes/out-passes via the mobile app, triggering automated SMS/push notifications to parents and digital verification tokens for campus security guards.

## **4\. External Interface Requirements**

### **4.1 User Interfaces (UI)**

* **Web Portal:** Responsive dashboard following WCAG 2.1 Level AA accessibility guidelines. Must include role-specific quick widgets (e.g., "Today's Lectures" for Faculty, "Attendance & Fee Summary" for Students), tabular data exports (CSV, XLSX, PDF), and dark/light mode support.  
* **Mobile Application:** Native/Cross-platform mobile client focused on high-frequency workflows: QR/Biometric attendance marking, push notifications, timetable viewing, gate-pass requests, and fee payments.

### **4.2 Hardware Interfaces**

* **Biometric Terminals:** Communication over TCP/IP (Port 4370 or HTTPS Push SDK) for real-time staff/student attendance ingestion.  
* **Barcode / RFID Scanners:** USB HID / Serial interface for Library checkouts and Examination script scanning.

### **4.3 Software Interfaces & APIs**

* **Payment Gateway API:** RESTful JSON webhooks with HMAC-SHA256 signature verification.  
* **Notification Gateways:** SMTP/API integration for transactional emails (AWS SES) and DLT-compliant SMS gateways for OTPs and emergency broadcasts.  
* **National Academic Depository (NAD / ABC):** Standardized XML/JSON data export schemas for uploading verified degree certificates and Academic Bank of Credits (ABC) records.

### **4.4 Communications Interfaces**

* All external client-to-server traffic must strictly enforce **TLS 1.3 (HTTPS)**.  
* Internal microservice communication shall utilize REST over HTTP/2 or gRPC within a private Virtual Private Cloud (VPC) subnet.  
* Standardized API response envelope:

JSON  
{  
  "status": "SUCCESS",  
  "code": 200,  
  "timestamp": "2026-10-20T16:13:00Z",  
  "data": { ... },  
  "errors": null  
}

## **5\. Non-Functional Requirements (NFRs)**

### **5.1 Performance Requirements**

* **Response Time:** 95% of standard CRUD API requests shall return within **300 ms** under normal load; complex reporting queries and transcript PDF generation shall complete within **2.5 seconds**.  
* **Throughput & Concurrency:** The system shall support at least **10,000 concurrent active users** during peak windows (course registration and exam result declaration) without degradation.  
* **Caching:** High-read, low-write entities (Timetables, Published Results, Course Catalogs) shall be served from Redis cache with automated cache invalidation on update.

### **5.2 Security Requirements**

* **Data Encryption:** Sensitive PII (Aadhaar/National ID, Bank Account Numbers, Exam Marks) must be encrypted at rest using **AES-256** and in transit via **TLS 1.3**.  
* **Vulnerability Protection:** All endpoints must enforce parameterized queries (JPA/Hibernate prepared statements) to prevent SQL Injection, strict input sanitization against XSS, CSRF tokens for state-changing web requests, and API rate limiting (100 requests/minute/IP) via API Gateway.  
* **Tamper Detection:** Published marksheets and fee receipts shall embed a cryptographic hash encoded in a QR code for instant public verification.

### **5.3 Reliability, Availability & Disaster Recovery**

* **Availability:** The system shall maintain **99.9% uptime** during the academic year, excluding scheduled maintenance windows between 02:00 AM and 04:00 AM local time.  
* **Database Replication:** Synchronous primary-replica database setup with automated failover.  
* **Backup Policy:** Automated daily incremental backups and weekly full snapshots retained across geographically separated cloud regions.  
* **RPO & RTO:** Recovery Point Objective (RPO) of **less than 15 minutes** (zero data loss for committed financial/grade transactions via WAL archiving) and Recovery Time Objective (RTO) of **less than 2 hours**.

### **5.4 Maintainability & Scalability**

* **Horizontal Scaling:** Stateless application servers allowing automatic horizontal pod autoscaling (HPA) when CPU utilization exceeds 70%.  
* **API Versioning:** All REST endpoints shall be versioned (/api/v1/...) to prevent breaking changes for older mobile app clients.

## **6\. Database Schema & Data Model**

### **6.1 Core Entity-Relationship Architecture**

The relational database schema is organized around six primary domain schemas to maintain clean foreign-key boundaries and high normalization (3NF):

\[USERS & RBAC\] 1 ────── 1 \[STUDENT\_MASTER\] 1 ────── \* \[ENROLLMENTS\]  
      │                         │                           │  
      │ 1                       │ 1                         │ \*  
      │                         ▼                           ▼  
\[FACULTY\_MASTER\] 1 ──── \* \[COURSE\_OFFERINGS\] 1 ──── \* \[ATTENDANCE\_LOGS\]  
                                │  
                                │ 1  
                                ▼  
                          \[EXAM\_MARKS\] \* ────────── 1 \[STUDENT\_MASTER\]

### **6.2 Core Relational Table Definitions**

| Table Name | Primary Key | Foreign Keys | Key Attributes & Constraints |
| :---- | :---- | :---- | :---- |
| users | user\_id (UUID) | role\_id | username (UNIQUE), email (UNIQUE), password\_hash, mfa\_secret, is\_active, last\_login |
| students | student\_id (UUID) | user\_id, program\_id, batch\_id | enrollment\_no (UNIQUE), first\_name, last\_name, dob, category, current\_semester, cgpa, status |
| faculty | faculty\_id (UUID) | user\_id, dept\_id | employee\_code (UNIQUE), designation, joining\_date, qualification, pan\_encrypted |
| courses | course\_id (UUID) | dept\_id | course\_code (UNIQUE), title, credits, lecture\_hrs, lab\_hrs, course\_type (CORE/ELECTIVE) |
| course\_registrations | reg\_id (BIGINT) | student\_id, course\_id, semester\_id | academic\_year, registration\_date, status (APPROVED/DROPPED), UNIQUE(student\_id, course\_id, semester\_id) |
| attendance\_logs | attendance\_id (BIGINT) | reg\_id, faculty\_id, slot\_id | lecture\_date, status (PRESENT/ABSENT/ON\_DUTY), recorded\_at, is\_locked |
| exam\_results | result\_id (BIGINT) | reg\_id, exam\_session\_id | cie\_marks, see\_marks, total\_marks, grade\_letter, grade\_points, is\_published, verified\_by |
| fee\_ledgers | ledger\_id (UUID) | student\_id, semester\_id | total\_demand, scholarship\_adj, amount\_paid, late\_fine, balance\_due, due\_date, clearance\_flag |
| payment\_transactions | txn\_id (UUID) | ledger\_id | gateway\_ref\_id (UNIQUE), amount, payment\_mode, txn\_status (INITIATED/SUCCESS/FAILED), webhook\_payload (JSON) |
| audit\_logs | log\_id (BIGINT) | actor\_user\_id | entity\_name, entity\_id, action\_type, old\_value (JSON), new\_value (JSON), ip\_address, created\_at |

## **7\. Verification & Acceptance Criteria Matrix**

| Req ID | Test Scenario | Expected Outcome |
| :---- | :---- | :---- |
| **FR-ACAD-03** | Attempt to assign Faculty A to two different classrooms on Monday at 10:00 AM. | System rejects the timetable commit with a 409 Conflict error detailing the slot collision. |
| **FR-EXAM-01** | Attempt to generate a Hall Ticket for a student with 68% attendance and no medical condonation flag. | System blocks Hall Ticket download and displays "Detained: Attendance Shortage (\<75%)". |
| **FR-EXAM-04** | Faculty attempts to modify internal marks after the CoE has frozen the grading window. | API returns 403 Forbidden; modification requires initiating a formal Grade Revision Request workflow. |
| **FR-FIN-03** | Student's browser closes mid-payment after bank deduction but before redirect. | Background reconciliation job queries the gateway within 15 minutes, marks transaction SUCCESS, and updates ledger balance to 0\. |
| **NFR-5.1** | Simulate 10,000 concurrent students querying semester exam results simultaneously. | Redis cache serves result payloads with 95th percentile latency under 300 ms and zero database connection pool exhaustion. |

## **8\. Appendices**

### **8.1 Standard 10-Point Grading Scale (CBCS Reference)**

| Letter Grade | Classification | Grade Points (Gi​) | Marks Range (%) |
| :---- | :---- | :---- | :---- |
| **O** | Outstanding | 10 | 90 – 100 |
| **A+** | Excellent | 9 | 80 – 89 |
| **A** | Very Good | 8 | 70 – 79 |
| **B+** | Good | 7 | 60 – 69 |
| **B** | Above Average | 6 | 55 – 59 |
| **C** | Average | 5 | 50 – 54 |
| **P** | Pass | 4 | 40 – 49 |
| **F** | Fail | 0 | Less than 40 |
| **Ab** | Absent | 0 | — |

### **8.2 Phased Implementation Roadmap**

> 1. **Phase 1 (Core Foundation — Months 1–3):** Identity/RBAC, Student Master, Admission Portal, Department/Course Setup, and Fee Payment Gateway Integration.  
> 2. **Phase 2 (Academic Operations — Months 4–6):** Timetable Engine, Daily Attendance (Web/Mobile), CIE Marks Entry, and LMS Resource Sharing.  
> 3. **Phase 3 (Examination & Ancillary Services — Months 7–9):** End-Semester Exam Automation, SGPA/CGPA Transcripts, HRMS/Payroll, Library OPAC, and Hostel Modules.