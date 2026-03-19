# CICS DocHub — Digital Repository for CICS

A secure, web-based document repository for the College of Informatics and Computing Science (CICS) at New Era University. Built for students and administrators to manage, access, and distribute academic documents.

## 🔗 Live Demo
[https://neu-digital-library.vercel.app](https://neu-digital-library.vercel.app)

---

## Tech Stack
| | |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Authentication | Firebase Authentication (Google OAuth) |
| Database | Firebase Firestore |
| File Storage | Supabase Storage |
| Styling | Tailwind CSS, shadcn/ui |
| Deployment | Vercel |

---

## Features

### General
- Light and dark mode toggle on every page
- Responsive design for desktop, tablet, and mobile
- Google OAuth restricted to institutional `@neu.edu.ph` accounts

### Student Portal
- First-time users complete onboarding by selecting their undergraduate program
- Dashboard shows recently viewed and recently downloaded documents
- Library displays program-specific and general CICS documents with search, filter, sort, and grid/list views
- Documents show a "New" badge if uploaded within 7 days or not yet viewed
- Tooltip preview shows document description and upload date on hover
- Profile details (name, email, program) are read-only

### Admin Portal
- Dashboard shows active sessions, document downloads, and repository size — filterable by daily, weekly, monthly, or custom date range
- Engagement Flow chart compares login frequency vs document retrieval with CSV export
- Student Management — search, filter by program, and block/unblock student access
- Document Management — upload PDFs with category, description, and visibility (All CICS or Program-Specific); view, download, archive, and delete existing documents
- Archive page — manage archived documents, restore them, or permanently delete them

---

## User Roles

**Student** — Can view and download documents assigned to their program and general CICS documents. Cannot upload, edit, archive, or delete.

**Admin** — Full access to upload, manage, archive, and delete documents. Can monitor platform activity, export data, and manage student access. Access restricted to pre-approved institutional emails.


## License
Developed as an academic project for New Era University — CICS. All rights reserved.
