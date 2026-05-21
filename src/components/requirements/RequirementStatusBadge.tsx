import { Badge } from '@/components/ui/badge';
import type { DocumentReviewStatus, RequirementStatus } from '@/types/api';

const REQUIREMENT_VARIANT: Record<
  RequirementStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'outline',
  SUBMITTED: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  EXPIRED: 'destructive',
  WAIVED: 'secondary',
};

const DOCUMENT_VARIANT: Record<
  DocumentReviewStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const REQUIREMENT_LABEL: Record<RequirementStatus, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  WAIVED: 'Waived',
};

const DOCUMENT_LABEL: Record<DocumentReviewStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

type Props =
  | { kind: 'requirement'; status: RequirementStatus; className?: string }
  | { kind: 'document'; status: DocumentReviewStatus; className?: string };

export default function RequirementStatusBadge(props: Props) {
  if (props.kind === 'requirement') {
    return (
      <Badge variant={REQUIREMENT_VARIANT[props.status]} className={props.className}>
        {REQUIREMENT_LABEL[props.status]}
      </Badge>
    );
  }
  return (
    <Badge variant={DOCUMENT_VARIANT[props.status]} className={props.className}>
      {DOCUMENT_LABEL[props.status]}
    </Badge>
  );
}
