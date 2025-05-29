import { Badge } from './badge';
import { ExerciseStatus } from '@/lib/models/exercise';

interface StatusBadgeProps {
  status: ExerciseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusInfo = (status: ExerciseStatus) => {
    switch (status) {
      case 'draft':
        return { label: 'Draft', className: 'bg-gray-100 text-gray-800 border-gray-300' };
      case 'submitted':
        return { label: 'Submitted', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'active':
        return { label: 'Active', className: 'bg-green-100 text-green-800 border-green-300' };
      case 'archived':
        return { label: 'Archived', className: 'bg-red-100 text-red-800 border-red-300' };
      default:
        return { label: 'Unknown', className: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <Badge 
      variant="outline" 
      className={`${statusInfo.className} ${className || ''}`}
    >
      {statusInfo.label}
    </Badge>
  );
} 