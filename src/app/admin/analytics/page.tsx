import { PageHeader } from '@/components/layout/page-header';
import AnalyticsDashboard from './analytics-dashboard';

export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Admin Dashboard"
        description="Overview of system activity and metrics."
      />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
