'use client';
import { useState, useMemo, useEffect } from 'react';
import { query, where, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase';
import type { DownloadLog, Document as DocumentType, AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Users, HardDrive } from 'lucide-react';
import { subDays, startOfDay, format, endOfDay, addDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Period = 'day' | 'week' | 'month' | 'custom';

// Removed dependency on 'react-day-picker' by defining DateRange locally.
type DateRange = {
    from: Date;
    to?: Date;
};

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  // The isMounted state is used to prevent running date-dependent queries on the server,
  // which would cause a hydration mismatch with the client.
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // This effect runs once on the client, setting isMounted to true.
    // This signals that the component is ready for client-side-only logic.
    setIsMounted(true);
  }, []);

  // This effect updates the date range based on the selected period (Day, Week, Month).
  useEffect(() => {
    if (period === 'day') {
      setDate({ from: new Date(), to: new Date() });
    } else if (period === 'week') {
      setDate({ from: subDays(new Date(), 6), to: new Date() });
    } else if (period === 'month') {
      setDate({ from: subDays(new Date(), 29), to: new Date() });
    }
  }, [period]);

  // The Firestore query constraints are memoized to prevent re-running the query on every render.
  // It only re-calculates when the date range changes.
  // The query is skipped if the component is not yet mounted on the client.
  const logConstraints = useMemo(() => {
    if (!isMounted || !date?.from) return [];
    
    const startDate = startOfDay(date.from);
    const endDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
    
    // This creates a Firestore query to get logs within the selected date range.
    return [
      where('downloadedAt', '>=', startDate),
      where('downloadedAt', '<=', endDate),
      orderBy('downloadedAt', 'desc'),
    ];
  }, [date, isMounted]);

  const studentConstraints = useMemo(() => [where('isAdmin', '==', false)], []);

  const { data: documents, loading: docsLoading } = useCollection<DocumentType>('Documents');
  const { data: students, loading: studentsLoading } = useCollection<AppUser>('Users', { constraints: studentConstraints });
  // The useCollection hook for logs now uses the dynamic logConstraints
  // and skips the query entirely until the component is mounted.
  const { data: logs, loading: logsLoading } = useCollection<DownloadLog>('Logs', {
    constraints: logConstraints,
    listen: true,
    skip: !isMounted,
  });

  const loading = docsLoading || logsLoading || studentsLoading;

  // The analytics data is memoized and re-calculated whenever the logs or date range change.
  const analyticsData = useMemo(() => {
    if (!logs || !date?.from) {
      return { totalDownloads: 0, activeUsers: 0, activity: [], repositorySize: '1.2 GB' };
    }
    
    const activityByDate: { [key: string]: { date: string, downloads: number, users: Set<string> } } = {};
    
    // Initializes the chart data with empty values for each day in the range.
    let day = startOfDay(date.from);
    const end = endOfDay(date.to || date.from);
    while (day <= end) {
        const dateString = format(day, 'yyyy-MM-dd');
        activityByDate[dateString] = { date: dateString, downloads: 0, users: new Set() };
        day = addDays(day, 1);
    }
    
    // Populates the chart data with actual download and user activity from the logs.
    logs.forEach(log => {
      if (!log.downloadedAt) return;
      const dateString = format(new Date((log.downloadedAt as any).seconds * 1000), 'yyyy-MM-dd');
      if(activityByDate[dateString]) {
          activityByDate[dateString].downloads += 1;
          activityByDate[dateString].users.add(log.userId);
      }
    });
      
    const activity = Object.values(activityByDate)
        .map(item => ({ date: item.date, downloads: item.downloads, logins: item.users.size }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const totalUniqueUsers = new Set(logs.map(l => l.userId));

    // Returns the final data for rendering cards and the chart.
    return { totalDownloads: logs.length, activeUsers: totalUniqueUsers.size, activity, repositorySize: '1.2 GB' };
  }, [logs, date]);

  const chartConfig = {
    downloads: {
      label: "Doc Downloads",
      color: "hsl(var(--primary))",
    },
     logins: {
      label: "Student Logins",
      color: "hsl(var(--accent))",
    },
  };

  const handleDownloadCSV = () => {
    if (!analyticsData.activity || analyticsData.activity.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There is no data in the selected period to export.',
      });
      return;
    }

    const headers = ['Date', 'Doc Downloads', 'Student Logins'];
    const csvRows = [
      headers.join(','),
      ...analyticsData.activity.map((row) =>
        [row.date, row.downloads, row.logins].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    
    const fromDate = date?.from ? format(date.from, 'yyyy-MM-dd') : 'start';
    const toDate = date?.to ? format(date.to, 'yyyy-MM-dd') : fromDate;
    link.setAttribute('download', `cics-engagement-flow_${fromDate}_to_${toDate}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
       {/* Simplified UI for selecting the date range with simple date inputs. */}
       <div className="flex flex-col sm:flex-row justify-end items-end gap-4">
            <div className="grid gap-2 w-full sm:w-auto">
                <label htmlFor="start-date" className="text-sm font-medium text-muted-foreground">Start Date</label>
                <Input
                    id="start-date"
                    type="date"
                    value={date?.from ? format(date.from, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                        if(e.target.value) {
                            // Using new Date with a 'T00:00:00' suffix ensures the date is parsed in the user's local timezone.
                            const fromDate = new Date(e.target.value + 'T00:00:00');
                            setDate(prev => ({ from: fromDate, to: prev?.to }));
                            setPeriod('custom');
                        }
                    }}
                    className="w-full sm:w-auto"
                />
            </div>
            <div className="grid gap-2 w-full sm:w-auto">
                <label htmlFor="end-date" className="text-sm font-medium text-muted-foreground">End Date</label>
                <Input
                    id="end-date"
                    type="date"
                    value={date?.to ? format(date.to, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                        if(e.target.value) {
                             // Using new Date with a 'T00:00:00' suffix ensures the date is parsed in the user's local timezone.
                            const toDate = new Date(e.target.value + 'T00:00:00');
                            setDate(prev => ({ from: prev?.from, to: toDate }));
                            setPeriod('custom');
                        }
                    }}
                    className="w-full sm:w-auto"
                />
            </div>
            <Tabs value={period} onValueChange={(v) => { if (v !== 'custom') setPeriod(v as Period)}}>
                <TabsList className="w-full sm:w-auto grid grid-cols-3">
                    <TabsTrigger value="day">Daily</TabsTrigger>
                    <TabsTrigger value="week">Weekly</TabsTrigger>
                    <TabsTrigger value="month">Monthly</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      
      {/* Stat cards that display totals for the selected period */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeUsers}</div>
            <p className="text-xs text-muted-foreground">in the selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doc Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalDownloads}</div>
             <p className="text-xs text-muted-foreground">in the selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repository Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.repositorySize}</div>
             <p className="text-xs text-muted-foreground">Total storage used</p>
          </CardContent>
        </Card>
      </div>

        {/* The main chart displaying activity over the selected period */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                    <CardTitle>Engagement Flow</CardTitle>
                    <CardDescription>Comparing login frequency vs document retrieval.</CardDescription>
                </div>
                <Button variant="outline" onClick={handleDownloadCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                </Button>
            </div>
          </CardHeader>
          <CardContent>
             {analyticsData.activity.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.activity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => format(new Date(value + 'T00:00:00'), 'MM/dd')} />
                        <YAxis hide />
                        <ChartTooltip cursor={true} content={<ChartTooltipContent indicator="line" />} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px'}}/>
                        <Area type="monotone" dataKey="downloads" name="Doc Downloads" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorDownloads)" />
                        <Area type="monotone" dataKey="logins" name="Student Logins" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorLogins)" />
                    </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground py-10">No activity data for this period.</p>}
          </CardContent>
        </Card>
    </div>
  );
}
