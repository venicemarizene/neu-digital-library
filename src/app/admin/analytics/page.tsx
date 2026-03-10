import { PageHeader } from '@/components/layout/page-header';
import AnalyticsDashboard from './analytics-dashboard';

export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Analytics"
        description="Review download metrics and student activity."
      />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
