import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  UserCog,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface DirectoryCardProps {
  type: 'students' | 'parents' | 'staff' | 'documents';
  total: number;
  alertCount?: number;
  alertLabel?: string;
  route: string;
  onClick?: () => void;
}

const config = {
  students: {
    icon: GraduationCap,
    label: 'Students',
    color: 'text-primary',
    bgColor: 'bg-primary/8',
  },
  parents: {
    icon: Users,
    label: 'Parents',
    color: 'text-info',
    bgColor: 'bg-info/8',
  },
  staff: {
    icon: UserCog,
    label: 'Staff',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/8',
  },
  documents: {
    icon: FileText,
    label: 'Documents',
    color: 'text-warning-foreground',
    bgColor: 'bg-warning/8',
  },
};

export function DirectoryCard({
  type,
  total,
  alertCount,
  alertLabel,
  route,
  onClick,
}: DirectoryCardProps) {
  const navigate = useNavigate();
  const { icon: Icon, label, color, bgColor } = config[type];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(route);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors group"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums leading-none">{total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
        
        {alertCount !== undefined && alertCount > 0 && alertLabel && (
          <Badge variant="warning" className="mt-3">
            {alertCount} {alertLabel}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
