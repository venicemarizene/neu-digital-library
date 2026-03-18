'use client';
import { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Users, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const programOptions = [
  { label: 'All Programs', value: 'All Programs' },
  { label: 'BSLIS', value: 'Bachelor of Library and Information Science (BSLIS)' },
  { label: 'BSCS', value: 'Bachelor of Science in Computer Science (BSCS)' },
  { label: 'BSEMC-DAT', value: 'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology (BSEMC-DAT)' },
  { label: 'BSEMC-GD', value: 'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development (BSEMC-GD)' },
  { label: 'BSIT', value: 'Bachelor of Science in Information Technology (BSIT)' },
  { label: 'BSIS', value: 'Bachelor of Science in Information System (BSIS)' },
];

const getInitials = (name: string | null | undefined) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function StudentTable() {
  const db = useFirestore();
  const { toast } = useToast();
  const userConstraints = useMemo(() => [where('isAdmin', '==', false)], []);
  const { data: users, loading } = useCollection<AppUser>('Users', {
      constraints: userConstraints
  });
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [sectionFilter, setSectionFilter] = useState('All Sections');
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleBlockToggle = (uid: string, isBlocked: boolean) => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Database not available.' });
      return;
    }
    
    const userDocRef = doc(db, 'Users', uid);
    const updateData = { isBlocked: isBlocked };

    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: 'Success',
          description: `User has been ${isBlocked ? 'blocked' : 'unblocked'}.`,
        });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const sectionOptions = useMemo(() => {
    if (!users) return [];
    const sections = [...new Set(users.map(u => u.section).filter(Boolean) as string[])];
    sections.sort();
    return ['All Sections', ...sections];
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = users;

    if (programFilter !== 'All Programs') {
        filtered = filtered.filter(user => user.program === programFilter);
    }

    if (sectionFilter !== 'All Sections') {
        filtered = filtered.filter(user => user.section === sectionFilter);
    }
    
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(user => 
            user.displayName?.toLowerCase().includes(lowercasedTerm) ||
            user.email?.toLowerCase().includes(lowercasedTerm)
        );
    }

    return filtered;
  }, [users, programFilter, sectionFilter, searchTerm]);

  return (
    <Card className="rounded-lg">
      <CardContent className="pt-6">
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Filter by program..." />
            </SelectTrigger>
            <SelectContent>
              {programOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={sectionOptions.length <= 1}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by section..." />
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          {loading ? (
              <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Program</TableHead>
                  <TableHead className="hidden md:table-cell">Section</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'user'} />
                          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{user.program?.match(/\(([^)]+)\)/)?.[1] || user.program}</TableCell>
                    <TableCell className="hidden md:table-cell">{user.section || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={user.isBlocked ? 'destructive' : 'secondary'}>
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={!!user.isBlocked}
                        onCheckedChange={(checked) => handleBlockToggle(user.uid, checked)}
                        aria-label={`Toggle block for ${user.displayName}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Students Found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                      {searchTerm || programFilter !== 'All Programs' ? 'Try adjusting your search or filters.' : 'No students have registered yet.'}
                  </p>
              </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
