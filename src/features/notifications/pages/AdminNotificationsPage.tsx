import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Label } from "@shared/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import {
  useBroadcastNotificationMutation,
  type BroadcastTarget,
  type RoleCode,
} from "@features/notifications/api/broadcastApi";
import { UserMultiSelect } from "@features/users/components/UserMultiSelect";
import type { AdminUser } from "@features/users/types";
import { apiErrorMessage } from "@shared/lib/apiError";

const ROLE_OPTIONS: { value: RoleCode; label: string }[] = [
  { value: "USER", label: "İştirakçilər (participants)" },
  { value: "TUTOR", label: "Tutors" },
  { value: "ADMIN", label: "Admins" },
  { value: "SUPER_ADMIN", label: "Super admins" },
];

/**
 * Broadcast composer — fans out an in-app notification to a target audience via
 * `POST /api/admin/notifications/broadcast`. Titled "Broadcasts" like its menu
 * item; it used to call itself "Notifications", the name of the inbox page.
 */
export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<BroadcastTarget>("ALL");
  const [role, setRole] = useState<RoleCode>("USER");
  const [recipients, setRecipients] = useState<AdminUser[]>([]);

  const [broadcast, { isLoading }] = useBroadcastNotificationMutation();

  const userIds = recipients.map((u) => u.id);

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (target !== "USERS" || userIds.length > 0);

  const send = async () => {
    if (!canSend) return;
    try {
      const res = await broadcast({
        title: title.trim(),
        body: body.trim(),
        target,
        role: target === "ROLE" ? role : undefined,
        userIds: target === "USERS" ? userIds : undefined,
      }).unwrap();
      // Nobody matched (every picked account disabled, an empty role): the API
      // answers 200 with zero recipients, which used to read as a success and
      // clear the form. Keep the message so it can be retargeted.
      if (res.recipients === 0) {
        toast.warning("Nobody received it — no active account matches this audience.");
        return;
      }
      toast.success(`Broadcast sent to ${res.recipients.toLocaleString()} recipient${res.recipients === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
      setRecipients([]);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not send the broadcast"));
    }
  };

  return (
    <>
      <PageHeader
        title="Broadcasts"
        description="Send an in-app notification to everyone, a role, or chosen people."
      />

      <Card className="max-w-2xl">
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title">Title</Label>
            <Input
              id="bc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short headline"
              maxLength={160}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-body">Message</Label>
            <Textarea
              id="bc-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do you want to tell people?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as BroadcastTarget)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="ROLE">A specific role</SelectItem>
                  <SelectItem value="USERS">Specific users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {target === "ROLE" && (
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as RoleCode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {target === "USERS" && (
            <div className="space-y-1.5">
              <Label>Recipients</Label>
              <UserMultiSelect value={recipients} onChange={setRecipients} />
              <p className="text-xs text-gray-500">
                {userIds.length} {userIds.length === 1 ? "person" : "people"} selected.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
              <Megaphone className="size-3.5" />
              Recipients get an in-app notification immediately.
            </p>
            <Button leftIcon={<Send className="size-4" />} loading={isLoading} disabled={!canSend} onClick={send}>
              Send broadcast
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
