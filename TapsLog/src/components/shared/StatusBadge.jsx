/**
 * StatusBadge — consistent pill badge for attendance status
 */
import { cn } from '../../lib/utils';

const VARIANTS = {
  PRESENT:           'badge-present',
  LATE:              'badge-late',
  COMPLETED:         'badge-completed',
  STUDENT_TIME_IN:   'badge-present',
  STUDENT_TIME_OUT:  'badge-completed',
  SESSION_ACTIVATED: 'badge-present',
  SESSION_CLOSED:    'badge-idle',
  ACTIVE:            'badge-present',
  PENDING:           'badge-idle',
  CLOSED:            'badge-idle',
  ABSENT:            'badge-error',
  ERROR:             'badge-error',
};

export function StatusBadge({ status, className }) {
  const variant = VARIANTS[status] || 'badge-idle';
  return (
    <span className={cn(variant, className)}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
