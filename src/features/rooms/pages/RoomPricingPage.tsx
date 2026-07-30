import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card, CardContent } from "@shared/components/ui/Card";
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

      <div className="mb-4 max-w-sm">
        <Label>Room</Label>
        {roomsLoading ? (
          <div className="py-2"><Spinner size={4} /></div>
        ) : (
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger><SelectValue placeholder="Select a room" /></SelectTrigger>
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

      {!roomId ? (
        <EmptyState title="No room selected" description="Choose a room to manage its pricing rules." />
      ) : rulesLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (rules?.length ?? 0) === 0 ? (
        <EmptyState
          title="No pricing rules"
          description="This room falls back to its base hourly rate. Add a rule for time-bounded pricing."
          action={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>Add rule</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...(rules ?? [])]
            .sort((a, b) => b.priority - a.priority)
            .map((rule) => (
              <Card key={rule.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{rule.name}</p>
                      <p className="text-sm text-gray-500">
                        {rule.hourlyRate} {rule.currency} / hour
                      </p>
                    </div>
                    <span className="text-xs rounded-md bg-gray-100 dark:bg-white/5 px-2 py-1 text-gray-600 dark:text-gray-300">
                      priority {rule.priority}
                    </span>
                  </div>
                  <dl className="text-xs text-gray-500 space-y-1">
                    <Row label="Day" value={rule.dayOfWeek === undefined || rule.dayOfWeek === null ? "Any" : DAYS[rule.dayOfWeek]} />
                    <Row label="Time" value={rule.startTime || rule.endTime ? `${rule.startTime ?? "00:00"}–${rule.endTime ?? "23:59"}` : "All day"} />
                    <Row label="Valid" value={rule.validFrom || rule.validTo ? `${rule.validFrom ?? "—"} → ${rule.validTo ?? "—"}` : "Always"} />
                  </dl>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button variant="ghost" size="sm" leftIcon={<Pencil className="size-4" />} onClick={() => openEdit(rule)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 className="size-4" />} onClick={() => setToDelete(rule)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-gray-700 dark:text-gray-300">{value}</dd>
    </div>
  );
}
