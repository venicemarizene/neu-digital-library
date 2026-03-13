'use client';
import { useState, useMemo, useEffect } from 'react';
import { query, where, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase';
import type { DownloadLog, Document as DocumentType, AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Download, Users, Calendar as CalendarIcon, HardDrive } from 'lucide-react';
import { subDays, startOfDay, format, endOfDay, addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';


type Period = 'day' | 'week' | 'month' | 'custom';

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (period === 'day') {
      setDate({ from: new Date(), to: new Date() });
    } else if (period === 'week') {
      setDate({ from: subDays(new Date(), 6), to: new Date() });
    } else if (period === 'month') {
      setDate({ from: subDays(new Date(), 29), to: new Date() });
    }
  }, [period]);

  const logConstraints = useMemo(() => {
    if (!isMounted || !date?.from) return [];
    
    const startDate = startOfDay(date.from);
    const endDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
    
    return [
      where('downloadedAt', '>=', startDate),
      where('downloadedAt', '<=', endDate),
      orderBy('downloadedAt', 'desc'),
    ];
  }, [date, isMounted]);

  const studentConstraints = useMemo(() => [where('isAdmin', '==', false)], []);

  const { data: documents, loading: docsLoading } = useCollection<DocumentType>('Documents');
  const { data: students, loading: studentsLoading } = useCollection<AppUser>('Users', { constraints: studentConstraints });
  const { data: logs, loading: logsLoading } = useCollection<DownloadLog>('Logs', {
    constraints: logConstraints,
    listen: true,
    skip: !isMounted,
  });

  const loading = docsLoading || logsLoading || studentsLoading;

  const analyticsData = useMemo(() => {
    if (!logs || !date?.from) {
      return { totalDownloads: 0, activeUsers: 0, activity: [], repositorySize: '1.2 GB' };
    }
    
    const activityByDate: { [key: string]: { date: string, downloads: number, users: Set<string> } } = {};
    
    let day = startOfDay(date.from);
    const end = endOfDay(date.to || date.from);
    while (day <= end) {
        const dateString = format(day, 'yyyy-MM-dd');
        activityByDate[dateString] = { date: dateString, downloads: 0, users: new Set() };
        day = addDays(day, 1);
    }
    
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full sm:w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                            <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                            </>
                            ) : (
                            format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(range) => {
                            setDate(range);
                            setPeriod('custom');
                        }}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
            <Tabs value={period} onValueChange={(v) => { if (v !== 'custom') setPeriod(v as Period)}}>
                <TabsList className="w-full sm:w-auto grid grid-cols-3">
                    <TabsTrigger value="day">Daily</TabsTrigger>
                    <TabsTrigger value="week">Weekly</TabsTrigger>
                    <TabsTrigger value="month">Monthly</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeUsers}</div>
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
             <p className="text-xs text-muted-foreground">in library</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Engagement Flow</CardTitle>
            <CardDescription>A comparison of student logins versus document retrieval over the selected period.</CardDescription>
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
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => format(new Date(value), 'MM/dd')} />
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
