import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Search, ShieldOff, X } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { DataTable } from "@shared/components/tables/DataTable";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { CountPill } from "@shared/components/data-display/CountPill";
import { cn } from "@shared/lib/cn";
import { hueFor } from "@shared/lib/hue";
import { useDebouncedValue } from "@shared/lib/useDebouncedValue";
import { ViewProfileLink } from "@features/user-profile/components/ViewProfileLink";
import { formatDateTime } from "@features/user-profile/lib/format";
import { useListAccountApprovalsQuery } from "@features/account-approvals/api/accountApprovalsApi";
import { usePendingAccountCount } from "@features/account-approvals/hooks/usePendingAccountCount";
import {
  AccountDecisionDialog,
  type AccountDecision,
  type AccountDecisionKind,
} from "@features/account-approvals/components/AccountDecisionDialog";
import { applicantName, signUpMethodLabel } from "@features/account-approvals/lib/accounts";
import type { AccountApprovalDto, AccountApprovalStatus } from "@features/account-approvals/types";

type Tab = "pending" | "rejected";

const STATUS_OF: Record<Tab, AccountApprovalStatus> = {
  pending: "PENDING_APPROVAL",
  rejected: "REJECTED",
};

/** Seeded by e-mail like the Users table, so a person is the same colour on both. */
function ApplicantAvatar({ account }: { account: AccountApprovalDto }) {
  return (
    <Avatar size="md" className="shrink-0">
      <AvatarFallback
        name={applicantName(account)}
        hue={hueFor(account.email || applicantName(account))}
      />
    </Avatar>
  );
}

function ApplicantName({ account }: { account: AccountApprovalDto }) {
  return (
    <div className="flex min-w-[12rem] max-w-[22rem] items-center gap-3">
      <ApplicantAvatar account={account} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink" title={applicantName(account)}>
          {applicantName(account)}
        </p>
        {account.phone && (
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3 tabular-nums">{account.phone}</p>
        )}
      </div>
    </div>
  );
}

/** Whether the person has confirmed their address: what the approver checks first. */
function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge tone="success" size="sm">
      Verified
    </Badge>
  ) : (
    <Badge tone="warning" size="sm">
      Not verified
    </Badge>
  );
}

function Rejection({ account }: { account: AccountApprovalDto }) {
  return (
    <span className="block whitespace-nowrap text-[12.5px] leading-snug">
      <span className="block text-ink-2 tabular-nums">{formatDateTime(account.decidedAt)}</span>
      {account.decidedByName && (
        <span className="block text-ink-3">by {account.decidedByName}</span>
      )}
    </span>
  );
}

function Reason({ account, className }: { account: AccountApprovalDto; className?: string }) {
  const reason = account.rejectionReason?.trim();
  if (!reason) return <span className="text-ink-3">—</span>;
  return (
    <p
      className={cn(
        "whitespace-pre-line break-words text-[13px] leading-snug text-ink-2",
        className,
      )}
      title={reason}
    >
      {reason}
    </p>
  );
}

/**
 * The decision pair of the other approval queues: Approve carries the weight
 * (navy outline, green tick), Reject is quiet red text; each opens a dialog
 * that keeps the solid button for the decision itself.
 */
function DecisionButtons({
  account,
  tab,
  onDecide,
  className,
}: {
  account: AccountApprovalDto;
  tab: Tab;
  onDecide: (account: AccountApprovalDto, kind: AccountDecisionKind) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <Button
        size="sm"
        variant="outline"
        leftIcon={<Check className="size-4 text-ok" />}
        aria-label={`Approve ${applicantName(account)}`}
        onClick={() => onDecide(account, "approve")}
      >
        Approve
      </Button>
      {/* A rejected account can still be approved, not rejected again. */}
      {tab === "pending" && (
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger-tint hover:text-danger"
          leftIcon={<X className="size-4" />}
          aria-label={`Reject ${applicantName(account)}`}
          onClick={() => onDecide(account, "reject")}
        >
          Reject
        </Button>
      )}
    </div>
  );
}

/**
 * The super admin's queue of new İştirakçi accounts (`user:approve`). A
 * sign-up on the website, or a first Google / Apple sign-in, cannot sign in
 * until it is approved here. Pending ones come oldest first; rejected ones
 * stay listed with the reason, and can still be approved.
 *
 * The tab is in the URL (`?tab=rejected`), so the Users table and a profile
 * page can link straight to it.
 */
export default function AccountApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "rejected" ? "rejected" : "pending";
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const [decision, setDecision] = useState<AccountDecision | null>(null);

  const pendingCount = usePendingAccountCount();
  const { data, isFetching, error } = useListAccountApprovalsQuery({
    status: STATUS_OF[tab],
    q: q || undefined,
    page,
    size: 10,
  });

  const decide = useCallback(
    (account: AccountApprovalDto, kind: AccountDecisionKind) => setDecision({ account, kind }),
    [],
  );

  const changeTab = (next: string) => {
    setParams(next === "rejected" ? { tab: "rejected" } : {}, { replace: true });
    setPage(0);
  };

  const columns = useMemo<ColumnDef<AccountApprovalDto>[]>(
    () => [
      { header: "Name", cell: ({ row }) => <ApplicantName account={row.original} /> },
      {
        header: "E-mail",
        cell: ({ row }) => (
          <span className="block max-w-[18rem] truncate text-ink-2" title={row.original.email}>
            {row.original.email}
          </span>
        ),
      },
      {
        header: "Verified",
        cell: ({ row }) => <VerifiedBadge verified={row.original.emailVerified} />,
      },
      {
        header: "Method",
        meta: { hideBelow: "xl" },
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{signUpMethodLabel(row.original.signUpMethod)}</span>
        ),
      },
      {
        header: "Signed up",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-ink-2">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      ...(tab === "rejected"
        ? ([
            { header: "Rejected", cell: ({ row }) => <Rejection account={row.original} /> },
            {
              header: "Reason",
              cell: ({ row }) => (
                <Reason
                  account={row.original}
                  className="line-clamp-3 min-w-[12rem] max-w-[20rem]"
                />
              ),
            },
          ] satisfies ColumnDef<AccountApprovalDto>[])
        : []),
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {/* Everything about the account (super admins only, as is this page). */}
            <ViewProfileLink userId={row.original.userId} />
            <DecisionButtons account={row.original} tab={tab} onDecide={decide} />
          </div>
        ),
      },
    ],
    [tab, decide],
  );

  const forbidden = (error as { status?: number } | undefined)?.status === 403;
  const filtered = !!q;

  return (
    <>
      <PageHeader
        title="Account approvals"
        description="New İştirakçi accounts — website sign-ups and first Google or Apple sign-ins — can't sign in until you approve them. They are e-mailed either way."
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label="Sign-ups">
            <TabsTrigger value="pending">
              Pending
              <CountPill count={pendingCount} />
            </TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search by name or e-mail…"
            aria-label="Search sign-ups"
            leftIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="sm:max-w-xs"
          />
        </div>
        <TabsContent value={tab} className="mt-0">
          {forbidden ? (
            <EmptyState
              tone="danger"
              Icon={ShieldOff}
              title="No access to account approvals"
              description="Approving sign-ups needs the user:approve permission, which only super admins hold."
            />
          ) : (
            <DataTable<AccountApprovalDto>
              data={data?.content ?? []}
              columns={columns}
              isLoading={isFetching}
              emptyTitle={
                filtered
                  ? "No matching sign-ups"
                  : tab === "pending"
                    ? "No sign-ups waiting"
                    : "No rejected sign-ups"
              }
              emptyDescription={
                filtered
                  ? "Try another name or e-mail."
                  : tab === "pending"
                    ? "New İştirakçi accounts appear here until you approve or reject them."
                    : "Sign-ups you reject are kept here, and can still be approved."
              }
              pagination={
                data
                  ? {
                      page: data.page,
                      size: data.size,
                      totalElements: data.totalElements,
                      totalPages: data.totalPages,
                    }
                  : undefined
              }
              onPageChange={setPage}
              getRowId={(r) => r.userId}
              renderMobileRow={(a) => <ApplicantPhoneRow account={a} tab={tab} onDecide={decide} />}
            />
          )}
        </TabsContent>
      </Tabs>

      <AccountDecisionDialog decision={decision} onClose={() => setDecision(null)} />
    </>
  );
}

/**
 * A sign-up on a phone (below md): who, then the facts the table spreads over
 * its columns on one meta line, the reason of a rejected one, and the
 * decision buttons across the full width.
 */
function ApplicantPhoneRow({
  account: a,
  tab,
  onDecide,
}: {
  account: AccountApprovalDto;
  tab: Tab;
  onDecide: (account: AccountApprovalDto, kind: AccountDecisionKind) => void;
}) {
  return (
    <div className="space-y-3 text-sm text-ink-2">
      <div className="flex items-center gap-3">
        <ApplicantAvatar account={a} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{applicantName(a)}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{a.email}</p>
        </div>
        <ViewProfileLink userId={a.userId} className="-mr-2" />
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-ink-3">
        <VerifiedBadge verified={a.emailVerified} />
        <span>{signUpMethodLabel(a.signUpMethod)}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">Signed up {formatDateTime(a.createdAt)}</span>
      </div>
      {tab === "rejected" && (
        <div className="rounded-[14px] bg-paper-2 px-3.5 py-2.5">
          <p className="text-[12.5px] text-ink-3">
            Rejected {formatDateTime(a.decidedAt)}
            {a.decidedByName ? ` by ${a.decidedByName}` : ""}
          </p>
          <Reason account={a} className="mt-1" />
        </div>
      )}
      <DecisionButtons account={a} tab={tab} onDecide={onDecide} className="justify-start" />
    </div>
  );
}
