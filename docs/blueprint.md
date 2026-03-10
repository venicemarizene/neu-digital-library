# **App Name**: CICS VaultConnect

## Core Features:

- Firebase Google Auth: Secure user authentication restricted to 'neu.edu.ph' domain using Firebase Authentication with Google as a provider.
- First-Time Login & Profile Check: Logic to check the Firestore 'Users' collection upon first login to determine if a user profile exists.
- Student Onboarding Flow: A dedicated screen for new students to input their undergraduate program, creating their initial user profile in Firestore.
- Firestore User Profile Management: Enable students to read and write only their own profile data (e.g., program information) in Firestore.
- Admin Role-Based Access: Implement checks based on custom claims or user document flags to restrict access to the Admin dashboard exclusively for administrators.
- Firestore Security Rules: Define and implement Firestore security rules to enforce role-based access for admin dashboards and user profile data.
- Intelligent Onboarding Resource Tool: Upon student onboarding completion, an AI tool provides initial personalized document recommendations relevant to their selected undergraduate program.
- Admin Document Upload: Functionality for administrators to upload PDF documents to Firebase Storage and store corresponding metadata (filename, upload date, category) in a Firestore 'Documents' collection.
- Student Document Search: Implementation of a search feature allowing students to query the Firestore 'Documents' collection by filename or category.
- Document Download & Logging: Enable students to download documents from Firebase Storage via a dedicated button, and log each download event (timestamp, user ID, document ID) into a 'Logs' collection in Firestore for analytics.
- Admin User Blocking: Admins can toggle an 'isBlocked' boolean on any user's document in the 'Users' collection in Firestore.
- Blocked User Handling: Upon login, the app checks a user's 'isBlocked' status; if true, the user is signed out and an 'Account Restricted' message is displayed.
- Admin Student List & Filter: Admins can view a list of all registered students, with the ability to filter by undergraduate program, from the 'Users' collection.
- Analytics Data Aggregation: Firestore queries to aggregate data from the 'Logs' collection for reporting.
- Period of Inquiry Filtering: Logic to filter log data by daily, weekly, and monthly periods.
- Key Metric Display: Calculate and display total logins, most downloaded documents, and student activity volume for selected periods.
- Firestore Index Optimization: Ensure Firestore queries for analytics are optimized using indexes for efficient handling of large datasets.

## Style Guidelines:

- Primary color: A vibrant, academic green (#26A85A) to signify growth, digital focus, and trust in a light color scheme.
- Background color: A subtle, light grey-green (#EBF3EC) to provide a clean and calming canvas.
- Accent color: A brighter, more yellow-green (#9EED5B) for highlights and interactive elements that require distinction.
- Headline and Body Font: 'Inter' (sans-serif) for its modern, clear, and objective aesthetic, ensuring optimal readability across all content.
- Utilize minimalist, modern outline icons to maintain a clean and contemporary digital feel.
- Implement a structured, card-based UI for information display and input forms, ensuring responsiveness across devices. A two-column layout with a side navigation for primary sections (Library, My Profile) and distinct panels for content.
- Subtle animations and transitions for form submissions, loading states, and page navigation to enhance user experience without distraction.