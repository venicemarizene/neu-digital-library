'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import type { DownloadLog, Document as DocumentType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Download, Users } from 'lucide-react';
import { subDays, startOfDay, format } from 'date-fns';

type Period = 'day' | 'week' | 'month';

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [startDate, setStartDate] = useState<Date | undefined>();

  useEffect(() => {
    const now = new Date();
    if (period === 'day') {
      setStartDate(startOfDay(now));
    } else {
      setStartDate(subDays(now, period === 'week' ? 7 : 30));
    }
  }, [period]);

  const { data: documents, loading: docsLoading } = useCollection<DocumentType>('Documents');
  const logConstraints = useMemo(() => {
    if (!startDate) return undefined; // Return undefined to stop the query
    return [
      where('downloadedAt', '>=', startDate),
      orderBy('downloadedAt', 'desc')
    ]
  }, [startDate]);
  const { data: logs, loading: logsLoading } = useCollection<DownloadLog>('Logs', {
    constraints: logConstraints,
    listen: true
  });


  const loading = !startDate || docsLoading || logsLoading;

  const analyticsData = useMemo(() => {
    if (!logs || logs.length === 0) {
      return { totalDownloads: 0, activity: [] };
    }
    
    const activityCounts: { [key: string]: { date: string, downloads: number } } = {};

    logs.forEach(log => {
      const dateString = format(new Date(log.downloadedAt.seconds * 1000), 'yyyy-MM-dd');
      if(!activityCounts[dateString]) {
          activityCounts[dateString] = { date: dateString, downloads: 0 };
      }
      activityCounts[dateString].downloads += 1;
    });
      
    const activity = Object.values(activityCounts).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { totalDownloads: logs.length, activity };
  }, [logs]);

  const chartConfig = {
    downloads: {
      label: "Downloads",
      color: "hsl(var(--primary))",
    },
     users: {
      label: "Users",
      color: "hsl(var(--accent))",
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
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="week">Last 7 Days</TabsTrigger>
            <TabsTrigger value="month">Last 30 Days</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,204</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length ?? 0}</div>
             <p className="text-xs text-muted-foreground">Total documents in library</p>
          </CardContent>
        </Card>
        <Card className="bg-foreground text-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-background/80">Pro Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-background">Use the Student Management tab to block or unblock users from downloading files.</p>
          </CardContent>
        </Card>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Plot</CardTitle>
            <CardDescription>A plot of user engagement over the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
             {analyticsData.activity.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={analyticsData.activity}>
                        <defs>
                            <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => format(new Date(value), 'MM/dd')} />
                        <YAxis hide />
                        <ChartTooltip cursor={true} content={<ChartTooltipContent indicator="line" />} />
                        <Area type="monotone" dataKey="downloads" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorDownloads)" />
                    </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground py-10">No activity data for this period.</p>}
          </CardContent>
        </Card>
    </div>
  );
}
