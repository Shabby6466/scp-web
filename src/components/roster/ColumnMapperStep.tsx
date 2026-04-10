import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Users, GraduationCap } from 'lucide-react';
import type { ColumnMapping, RosterRow } from './RosterImportWizard';

interface ColumnMapperStepProps {
  headers: string[];
  sampleRows: RosterRow[];
  importType: 'students' | 'parents' | 'both';
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

interface FieldConfig {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  aliases: string[];
}

const STUDENT_FIELDS: FieldConfig[] = [
  {
    key: 'studentFirstName',
    label: 'Student First Name',
    required: true,
    aliases: ['student first name', 'first name', 'firstname', 'student_first_name', 'child first name', 'child_first_name'],
  },
  {
    key: 'studentLastName',
    label: 'Student Last Name',
    required: true,
    aliases: ['student last name', 'last name', 'lastname', 'student_last_name', 'child last name', 'child_last_name'],
  },
  {
    key: 'studentDob',
    label: 'Date of Birth',
    required: false,
    aliases: ['dob', 'date of birth', 'birth date', 'birthdate', 'birthday', 'student_dob'],
  },
  {
    key: 'gradeLevel',
    label: 'Grade/Program',
    required: false,
    aliases: ['grade', 'grade level', 'program', 'class level', 'grade_level'],
  },
  {
    key: 'classroom',
    label: 'Class/Room',
    required: false,
    aliases: ['class', 'classroom', 'room', 'class_room', 'homeroom'],
  },
  {
    key: 'branchName',
    label: 'Branch/Location',
    required: false,
    aliases: ['branch', 'location', 'site', 'campus', 'branch_name'],
  },
  {
    key: 'studentId',
    label: 'Student ID',
    required: false,
    aliases: ['student id', 'student_id', 'id', 'student number'],
  },
];

const PARENT_FIELDS: FieldConfig[] = [
  {
    key: 'parent1Email',
    label: 'Parent 1 Email',
    required: true,
    aliases: ['parent email', 'parent 1 email', 'guardian email', 'mother email', 'father email', 'email', 'parent_email'],
  },
  {
    key: 'parent1FirstName',
    label: 'Parent 1 First Name',
    required: false,
    aliases: ['parent first name', 'parent 1 first name', 'guardian first name', 'parent_first_name'],
  },
  {
    key: 'parent1LastName',
    label: 'Parent 1 Last Name',
    required: false,
    aliases: ['parent last name', 'parent 1 last name', 'guardian last name', 'parent_last_name'],
  },
  {
    key: 'parent1Phone',
    label: 'Parent 1 Phone',
    required: false,
    aliases: ['parent phone', 'parent 1 phone', 'guardian phone', 'phone', 'contact phone', 'parent_phone'],
  },
  {
    key: 'parent2Email',
    label: 'Parent 2 Email',
    required: false,
    aliases: ['parent 2 email', 'secondary email', 'parent2_email'],
  },
  {
    key: 'parent2FirstName',
    label: 'Parent 2 First Name',
    required: false,
    aliases: ['parent 2 first name', 'parent2_first_name'],
  },
  {
    key: 'parent2LastName',
    label: 'Parent 2 Last Name',
    required: false,
    aliases: ['parent 2 last name', 'parent2_last_name'],
  },
  {
    key: 'parent2Phone',
    label: 'Parent 2 Phone',
    required: false,
    aliases: ['parent 2 phone', 'parent2_phone'],
  },
  {
    key: 'familyId',
    label: 'Family/Household ID',
    required: false,
    aliases: ['family id', 'household id', 'family_id', 'household_id'],
  },
];

export default function ColumnMapperStep({
  headers,
  sampleRows,
  importType,
  mapping,
  onMappingChange,
}: ColumnMapperStepProps) {
  // Auto-detect mappings on mount
  useEffect(() => {
    const newMapping = { ...mapping };
    let changed = false;

    const allFields = [
      ...(importType !== 'parents' ? STUDENT_FIELDS : []),
      ...(importType !== 'students' ? PARENT_FIELDS : []),
    ];

    allFields.forEach((field) => {
      if (!newMapping[field.key]) {
        const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
        const matchIndex = normalizedHeaders.findIndex((h) =>
          field.aliases.some((alias) => h === alias || h.includes(alias))
        );
        if (matchIndex !== -1) {
          newMapping[field.key] = headers[matchIndex];
          changed = true;
        }
      }
    });

    if (changed) {
      onMappingChange(newMapping);
    }
  }, [headers]);

  const handleMappingChange = (key: keyof ColumnMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [key]: value === '_none_' ? '' : value,
    });
  };

  const renderFieldSelector = (field: FieldConfig) => (
    <div key={field.key} className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-[200px]">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
      <Select
        value={mapping[field.key] || '_none_'}
        onValueChange={(value) => handleMappingChange(field.key, value)}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none_">-- Not mapped --</SelectItem>
          {headers.map((header) => (
            <SelectItem key={header} value={header}>
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const showStudentFields = importType === 'students' || importType === 'both';
  const showParentFields = importType === 'parents' || importType === 'both';

  return (
    <div className="space-y-6">
      {/* Column mapping */}
      <div className="grid gap-6 md:grid-cols-2">
        {showStudentFields && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Student Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {STUDENT_FIELDS.map(renderFieldSelector)}
            </CardContent>
          </Card>
        )}

        {showParentFields && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Parent/Guardian Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PARENT_FIELDS.map(renderFieldSelector)}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Preview (First 5 rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => {
                    const isMapped = Object.values(mapping).includes(header);
                    return (
                      <TableHead key={header} className="whitespace-nowrap">
                        {header}
                        {isMapped && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Mapped
                          </Badge>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.map((row, index) => (
                  <TableRow key={index}>
                    {headers.map((header) => (
                      <TableCell key={header} className="whitespace-nowrap">
                        {row[header] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
