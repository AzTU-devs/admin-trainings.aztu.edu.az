import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CircleDollarSign, DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Badge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import { cn } from "@shared/lib/cn";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { useListRoomsQuery } from "@features/rooms/api/roomsApi";
import { RoomVisual } from "@features/rooms/components/RoomVisual";
import { CapacityPill } from "@features/rooms/components/CapacityPill";
import { RoomStatusBadge } from "@features/rooms/components/RoomStatusBadge";
import { formatAmount } from "@features/rooms/lib/money";
import { QUIET_DANGER } from "@features/users/components/IconAction";
import {
  useCreatePricingRuleMutation,
  useDeletePricingRuleMutation,
  useListPricingRulesQuery,
  useUpdatePricingRuleMutation,
  type RoomPricingRuleDto,
  type RoomPricingUpsert,
} from "@features/rooms/api/roomPricingApi";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Draft = RoomPricingUpsert & { dayOfWeekStr: string };

const emptyDraft: Draft = {
  name: "",
  hourlyRate: 0,
  currency: "AZN",
  dayOfWeekStr: "ANY",
  startTime: "",
  endTime: "",
  validFrom: "",
  validTo: "",
  priority: 0,
};

/**
 * Time-bounded room pricing rules — CRUD over
 * `/api/admin/rooms/{roomId}/pricing-rules`. Pick a room, then add / edit /
 * delete rules.
 */
export default function RoomPricingPage() {
  const { data: rooms, isFetching: roomsLoading } = useListRoomsQuery({ size: 100 });
  const [roomId, setRoomId] = useState<string>("");

  // Default to the first room once loaded.
  useEffect(() => {
    if (!roomId && rooms?.content?.length) setRoomId(rooms.content[0].id);
  }, [rooms, roomId]);

  const { data: rules, isFetching: rulesLoading } = useListPricingRulesQuery(roomId, { skip: !roomId });

  const [createRule] = useCreatePricingRuleMutation();
  const [updateRule] = useUpdatePricingRuleMutation();
  const [deleteRule] = useDeletePricingRuleMutation();

  const [editing, setEditing] = useState<RoomPricingRuleDto | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [toDelete, setToDelete] = useState<RoomPricingRuleDto | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, currency: rooms?.content.find((r) => r.id === roomId)?.currency ?? "AZN" });
    setOpen(true);
  };

  const openEdit = (rule: RoomPricingRuleDto) => {
    setEditing(rule);
    setDraft({
      name: rule.name,
      hourlyRate: rule.hourlyRate,
      currency: rule.currency,
      dayOfWeekStr: rule.dayOfWeek === undefined || rule.dayOfWeek === null ? "ANY" : String(rule.dayOfWeek),
      startTime: rule.startTime ?? "",
      endTime: rule.endTime ?? "",
      validFrom: rule.validFrom ?? "",
      validTo: rule.validTo ?? "",
      priority: rule.priority,
    });
    setOpen(true);
  };

  const buildBody = (): RoomPricingUpsert => ({
    name: draft.name.trim(),
    hourlyRate: Number(draft.hourlyRate),
    currency: draft.currency.trim().toUpperCase(),
    dayOfWeek: draft.dayOfWeekStr === "ANY" ? undefined : Number(draft.dayOfWeekStr),
    // Backend expects LocalTime as HH:mm:ss; <input type="time"> can yield HH:mm.
    startTime: draft.startTime ? (draft.startTime.length === 5 ? draft.startTime + ":00" : draft.startTime) : undefined,
    endTime: draft.endTime ? (draft.endTime.length === 5 ? draft.endTime + ":00" : draft.endTime) : undefined,
    validFrom: draft.validFrom || undefined,
    validTo: draft.validTo || undefined,
    priority: draft.priority === undefined ? undefined : Number(draft.priority),
  });

  const save = async () => {
    if (!roomId || !draft.name.trim()) return;
    setSaving(true);
    try {
      const body = buildBody();
      if (editing) {
        await updateRule({ roomId, ruleId: editing.id, body }).unwrap();
        toast.success("Pricing rule updated");
      } else {
        await createRule({ roomId, body }).unwrap();
        toast.success("Pricing rule added");
      }
      setOpen(false);
    } catch {
      toast.error("Could not save rule");
    } finally {
      setSaving(false);
    }
  };

  const selected = rooms?.content.find((r) => r.id === roomId);

  // Highest priority first — the order in which the rules are matched.
  const sortedRules = useMemo(() => [...(rules ?? [])].sort((a, b) => b.priority - a.priority), [rules]);

  // Display-only columns (no accessors), so the table adds no sorting of its own.
  const columns: ColumnDef<RoomPricingRuleDto>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => <span className="block min-w-[10rem] font-semibold text-ink">{row.original.name}</span>,
    },
    { id: "rate", header: "Hourly rate", cell: ({ row }) => <RuleRate rule={row.original} /> },
    { id: "day", header: "Day", cell: ({ row }) => <RuleDay rule={row.original} /> },
    { id: "time", header: "Time", cell: ({ row }) => <RuleTime rule={row.original} /> },
    { id: "valid", header: "Valid", cell: ({ row }) => <RuleValid rule={row.original} /> },
    {
      id: "priority",
      header: "Priority",
      cell: ({ row }) => <PriorityPill>{row.original.priority}</PriorityPill>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RuleActions onEdit={() => openEdit(row.original)} onDelete={() => setToDelete(row.original)} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Room pricing"
        description="Time-bounded hourly-rate rules per room. The highest-priority matching rule applies."
        actions={
          <Button leftIcon={<Plus className="size-4" />} disabled={!roomId} onClick={openCreate}>
            Add rule
          </Button>
        }
      />

      <div className="space-y-5">
        {/* Room picker: the rules below belong to this room, so it reads as
            the table's subject — its picture, the select, and its facts. */}
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          {selected ? (
            <RoomVisual room={selected} thumb className="hidden size-16 rounded-[18px] sm:block" />
          ) : (
            <span aria-hidden className="icon-tile hidden size-16 rounded-[18px] sm:grid">
              <DoorOpen className="size-6" />
            </span>
          )}
          <div className="w-full min-w-0 sm:max-w-md">
            <Label htmlFor="pricing-room">Room</Label>
            {roomsLoading ? (
              <div className="py-2"><Spinner size={4} /></div>
            ) : (
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger id="pricing-room"><SelectValue placeholder="Select a room" /></SelectTrigger>
                <SelectContent>
                  {(rooms?.content ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.roomNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selected && (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
              <CapacityPill capacity={selected.capacity} />
              <RoomStatusBadge status={selected.status} />
              <p className="whitespace-nowrap pl-1 text-[13px] text-ink-3">
                <span className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-ink tabular-nums">
                  {formatAmount(selected.hourlyRate)} {selected.currency}
                </span>{" "}
                / hour
              </p>
            </div>
          )}
        </Card>

        {!roomId ? (
          <EmptyState Icon={DoorOpen} title="No room selected" description="Choose a room to manage its pricing rules." />
        ) : !rulesLoading && (rules?.length ?? 0) === 0 ? (
          // The header's "Add rule" is the page's one primary; this is the same
          // action repeated where the eye lands, so it stays secondary.
          <EmptyState
            Icon={CircleDollarSign}
            title="No pricing rules"
            description="This room falls back to its base hourly rate. Add a rule for time-bounded pricing."
            action={
              <Button variant="secondary" leftIcon={<Plus className="size-4" />} onClick={openCreate}>
                Add rule
              </Button>
            }
          />
        ) : (
          <>
            {/* Phones: each rule as a row with its facts labelled, like the
                old rule cards — seven columns do not fit 390px. */}
            <div className="md:hidden">
              {rulesLoading ? (
                <div className="rounded-2xl border border-line bg-surface px-6 py-16">
                  <Spinner className="mx-auto" />
                </div>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {sortedRules.map((rule) => (
                    <li key={rule.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{rule.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <RuleRate rule={rule} />
                            <PriorityPill>
                              <span className="font-sans font-semibold">priority</span>&nbsp;{rule.priority}
                            </PriorityPill>
                          </div>
                        </div>
                        <RuleActions
                          className="-mr-2 -mt-1.5"
                          onEdit={() => openEdit(rule)}
                          onDelete={() => setToDelete(rule)}
                        />
                      </div>
                      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-[14px] bg-paper-2 px-3.5 py-3 text-[13px]">
                        <dt className="text-ink-3">Day</dt>
                        <dd><RuleDay rule={rule} /></dd>
                        <dt className="text-ink-3">Time</dt>
                        <dd className="min-w-0 break-words"><RuleTime rule={rule} /></dd>
                        <dt className="text-ink-3">Valid</dt>
                        <dd className="min-w-0 break-words"><RuleValid rule={rule} /></dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <DataTable<RoomPricingRuleDto>
              className="hidden md:block"
              data={sortedRules}
              columns={columns}
              isLoading={rulesLoading}
              getRowId={(r) => r.id}
            />
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={<CircleDollarSign />}>
            <DialogTitle>{editing ? "Edit pricing rule" : "New pricing rule"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="pr-name" required>Name</Label>
              <Input id="pr-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Weekend evenings" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-rate" required>Hourly rate</Label>
              <Input id="pr-rate" type="number" step="0.01" value={draft.hourlyRate} onChange={(e) => setDraft((d) => ({ ...d, hourlyRate: e.target.value === "" ? 0 : Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-currency" required>Currency</Label>
              <Input id="pr-currency" maxLength={3} value={draft.currency} onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Day of week</Label>
              <Select value={draft.dayOfWeekStr} onValueChange={(v) => setDraft((d) => ({ ...d, dayOfWeekStr: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any day</SelectItem>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-priority">Priority</Label>
              <Input id="pr-priority" type="number" value={draft.priority ?? 0} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value === "" ? 0 : Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-start">Start time</Label>
              <Input id="pr-start" type="time" step="1" value={draft.startTime ?? ""} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-end">End time</Label>
              <Input id="pr-end" type="time" step="1" value={draft.endTime ?? ""} onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-from">Valid from</Label>
              <Input id="pr-from" type="date" value={draft.validFrom ?? ""} onChange={(e) => setDraft((d) => ({ ...d, validFrom: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-to">Valid to</Label>
              <Input id="pr-to" type="date" value={draft.validTo ?? ""} onChange={(e) => setDraft((d) => ({ ...d, validTo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" loading={saving} disabled={!draft.name.trim()} onClick={save}>
              {editing ? "Save changes" : "Add rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this pricing rule?"
        description={toDelete?.name}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete || !roomId) return;
          try {
            await deleteRule({ roomId, ruleId: toDelete.id }).unwrap();
            toast.success("Rule deleted");
            setToDelete(null);
          } catch {
            toast.error("Could not delete rule");
          }
        }}
      />
    </>
  );
}

/* ---- Rule facts, shared by the table cells and the phone rows ---- */

function RuleRate({ rule }: { rule: RoomPricingRuleDto }) {
  return (
    <span className="whitespace-nowrap text-[12.5px] text-ink-3">
      <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink tabular-nums">
        {formatAmount(rule.hourlyRate)} {rule.currency}
      </span>{" "}
      / hour
    </span>
  );
}

function RuleDay({ rule }: { rule: RoomPricingRuleDto }) {
  const any = rule.dayOfWeek === undefined || rule.dayOfWeek === null;
  return <Badge tone={any ? "neutral" : "brand"}>{any ? "Any" : DAYS[rule.dayOfWeek as number]}</Badge>;
}

/* Times and dates are technical values: mono, as the API sends them. */
function RuleTime({ rule }: { rule: RoomPricingRuleDto }) {
  return rule.startTime || rule.endTime ? (
    <span className="font-mono text-[12.5px] text-ink">{`${rule.startTime ?? "00:00"}–${rule.endTime ?? "23:59"}`}</span>
  ) : (
    <span className="text-ink-3">All day</span>
  );
}

function RuleValid({ rule }: { rule: RoomPricingRuleDto }) {
  return rule.validFrom || rule.validTo ? (
    <span className="font-mono text-[12.5px] text-ink">{`${rule.validFrom ?? "—"} → ${rule.validTo ?? "—"}`}</span>
  ) : (
    <span className="text-ink-3">Always</span>
  );
}

function PriorityPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 min-w-8 items-center justify-center whitespace-nowrap rounded-full bg-gold-tint px-2 font-mono text-[12px] text-gold-ink">
      {children}
    </span>
  );
}

/** The same quiet edit/delete pair as the rooms table: the bin turns red only on hover or focus. */
function RuleActions({ onEdit, onDelete, className }: { onEdit: () => void; onDelete: () => void; className?: string }) {
  return (
    <div className={cn("flex shrink-0 justify-end gap-1", className)}>
      <Button variant="ghost" size="sm" leftIcon={<Pencil className="size-4" />} onClick={onEdit}>
        Edit
      </Button>
      {/* The bin only turns red on hover or focus, so a column of rules is not a column of red. */}
      <Button variant="ghost" size="sm" className={QUIET_DANGER} leftIcon={<Trash2 className="size-4" />} onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
