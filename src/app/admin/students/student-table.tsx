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
import { Loader2, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { where } from 'firebase/firestore';

const programs = [
  'All Programs',
  'Bachelor of Library and Information Science (BSLIS)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology (BSEMC-DAT)',
  'Bachelor of Science in Computer Science (BSCS)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development (BSEMC-GD)',
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Information System (BSIS)',
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
  const [filter, setFilter] = useState('All Programs');
  
  const handleBlockToggle = async (uid: string, isBlocked: boolean) => {
    try {
      const userDocRef = doc(db, 'Users', uid);
      await updateDoc(userDocRef, { isBlocked: isBlocked });
      toast({
        title: 'Success',
        description: `User has been ${isBlocked ? 'blocked' : 'unblocked'}.`,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update user status.' });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (filter === 'All Programs') return users;
    return users.filter(user => user.program === filter);
  }, [users, filter]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Filter by program..." />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
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
                    <TableCell className="hidden sm:table-cell">{user.program}</TableCell>
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
                      {filter === 'All Programs' ? 'No students have registered yet.' : 'No students found for this program.'}
                  </p>
              </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
