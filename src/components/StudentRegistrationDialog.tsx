import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';

const studentSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gradeLevel: z.string().trim().max(50).optional(),
  schoolName: z.string().trim().max(200).optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentRegistrationDialogProps {
  onStudentAdded: () => void;
  children?: React.ReactNode;
}

const StudentRegistrationDialog = ({ onStudentAdded, children }: StudentRegistrationDialogProps) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gradeLevel: '',
      schoolName: '',
    },
  });

  const onSubmit = async (data: StudentFormData) => {
    if (!user) return;

    try {
      await api.post('/students', {
        parentId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gradeLevel: data.gradeLevel || null,
        schoolName: data.schoolName || null,
      });

      toast({
        title: 'Student registered',
        description: `${data.firstName} ${data.lastName} has been added successfully.`,
      });

      form.reset();
      setOpen(false);
      onStudentAdded();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Student</DialogTitle>
          <DialogDescription>
            Add your child's information to start uploading documents.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
            {form.formState.errors.dateOfBirth && (
              <p className="text-sm text-destructive">{form.formState.errors.dateOfBirth.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradeLevel">Grade Level (Optional)</Label>
            <Input id="gradeLevel" placeholder="e.g., Pre-K, Kindergarten" {...form.register('gradeLevel')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name (Optional)</Label>
            <Input id="schoolName" placeholder="e.g., Sunshine Preschool" {...form.register('schoolName')} />
          </div>

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Adding...' : 'Add Student'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentRegistrationDialog;
