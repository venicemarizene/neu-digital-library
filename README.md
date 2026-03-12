# CICS DocHub

This is a Next.js application built with Firebase Studio, designed to be a secure document repository for the CICS department at NEU.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of your project and add the necessary Firebase configuration variables. You can use `.env.local.example` as a template.

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:9002`.

## Key Features

- Secure authentication using Firebase with Google, restricted to the `neu.edu.ph` domain.
- Role-based access control for students and administrators.
- A central document library with search and download capabilities.
- An admin dashboard for user management, document uploads, and download analytics.
- AI-powered document recommendations for new students during onboarding.
