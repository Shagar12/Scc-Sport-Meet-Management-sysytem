import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { DobStatus, HOUSES, HouseId, PlayerAuditStatus, TeamCardStatus } from '../types/sports';

export const HouseTag: React.FC<{ house: HouseId | null; size?: 'sm' | 'md' }> = ({
  house,
  size = 'sm',
}) => {
  if (!house) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 text-xs font-medium text-zinc-400 whitespace-nowrap">
        Unassigned
      </span>
    );
  }
  const meta = HOUSES[house];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border ${meta.borderClass} ${meta.softBgClass} ${meta.textClass} ${
        size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'
      } font-medium whitespace-nowrap`}
    >
      <span
        className="h-2 w-2 rounded-xs shrink-0"
        style={{ backgroundColor: meta.colorHex }}
        aria-hidden="true"
      />
      {meta.name}
    </span>
  );
};

export const DobVerificationBadge: React.FC<{
  status: DobStatus;
  category: string | null;
  reason?: string;
}> = ({ status, category, reason }) => {
  if (status === 'verified' && category) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        DOB Verified: {category}
      </span>
    );
  }
  return (
    <span
      title={reason}
      className="inline-flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300 whitespace-nowrap"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {status === 'out_of_range' ? 'DOB Out of Range' : 'Invalid DOB'}
    </span>
  );
};

export const TeamCardStatusBadge: React.FC<{ status: TeamCardStatus }> = ({ status }) => {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 whitespace-nowrap">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Valid to Play (Confirmed)
        </span>
      );
    case 'pending_review':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Pending Admin Review
        </span>
      );
    case 'revision_requested':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Returned for Revision
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800/70 px-2.5 py-1 text-xs font-medium text-zinc-300 whitespace-nowrap">
          Draft In Progress
        </span>
      );
  }
};

export const PlayerAuditBadge: React.FC<{ status: PlayerAuditStatus }> = ({ status }) => {
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
        Valid to Play (Confirmed)
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300 whitespace-nowrap">
        <XCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
        Ineligible / Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-xs font-medium text-zinc-300 whitespace-nowrap">
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      Awaiting Audit
    </span>
  );
};
