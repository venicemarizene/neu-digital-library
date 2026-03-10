'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import type { DownloadLog, Document as DocumentType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Download } from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';

type Period = 'day' | 'week' | 'month';

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));

  useEffect(() => {
    const now = new Date();
    setStartDate(period === 'day' ? startOfDay(now) : subDays(now, period === 'week' ? 7 : 30));
  }, [period]);

  const { data: documents, loading: docsLoading } = useCollection<DocumentType>('Documents');
  const { data: logs, loading: logsLoading } = useCollection<DownloadLog>('Logs', {
    constraints: [
        where('downloadedAt', '>=', startDate),
        orderBy('downloadedAt', 'desc')
    ]
  });

  const documentsMap = useMemo(() => {
    const docMap = new Map<string, DocumentType>();
    documents?.forEach(doc => docMap.set(doc.id, doc));
    return docMap;
  }, [documents]);

  const loading = docsLoading || logsLoading;

  const analyticsData = useMemo(() => {
    if (!logs || logs.length === 0 || documentsMap.size === 0) {
      return { totalDownloads: 0, mostDownloaded: [], activity: [] };
    }

    const downloadCounts: { [key: string]: { name: string, downloads: number } } = {};
    const activityCounts: { [key: string]: { date: string, downloads: number } } = {};

    logs.forEach(log => {
      const doc = documentsMap.get(log.documentId);
      if (doc) {
        if (!downloadCounts[doc.id]) {
          downloadCounts[doc.id] = { name: doc.filename, downloads: 0 };
        }
        downloadCounts[doc.id].downloads += 1;
      }
      
      const dateString = new Date(log.downloadedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if(!activityCounts[dateString]) {
          activityCounts[dateString] = { date: dateString, downloads: 0 };
      }
      activityCounts[dateString].downloads += 1;
    });

    const mostDownloaded = Object.values(downloadCounts)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5);
      
    const activity = Object.values(activityCounts).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).reverse();

    return { totalDownloads: logs.length, mostDownloaded, activity };
  }, [logs, documentsMap]);

  const chartConfig = {
    downloads: {
      label: "Downloads",
      color: "hsl(var(--primary))",
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="day">Today</TabsTrigger>
          <TabsTrigger value="week">Last 7 Days</TabsTrigger>
          <TabsTrigger value="month">Last 30 Days</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">in the selected period</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Documents Downloaded</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.mostDownloaded.length}</div>
             <p className="text-xs text-muted-foreground">in the selected period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Downloaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData.mostDownloaded.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.mostDownloaded} layout="vertical" margin={{ right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={150} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="downloads" fill="var(--color-downloads)" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground py-10">No download data for this period.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Download Activity</CardTitle>
          </CardHeader>
          <CardContent>
             {analyticsData.activity.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.activity}>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis hide />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Bar dataKey="downloads" fill="var(--color-downloads)" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground py-10">No activity data for this period.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
