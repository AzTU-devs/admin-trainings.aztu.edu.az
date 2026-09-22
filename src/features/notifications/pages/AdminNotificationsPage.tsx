import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card, CardContent, CardFooter } from "@shared/components/ui/Card";
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
import { Svg } from "@shared/components/bright";
import { tileSvg } from "@shared/lib/art";
import { cn } from "@shared/lib/cn";
import {
  useBroadcastNotificationMutation,
  type BroadcastTarget,
  type RoleCode,
} from "@features/notifications/api/broadcastApi";

const ROLE_OPTIONS: { value: RoleCode; label: string }[] = [
  { value: "USER", label: "Students" },
  { value: "TUTOR", label: "Tutors" },
  { value: "ADMIN", label: "Admins" },
  { value: "SUPER_ADMIN", label: "Super admins" },
];

const TARGET_OPTIONS: { value: BroadcastTarget; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "ROLE", label: "A specific role" },
  { value: "USERS", label: "Specific users" },
];

/*
 * The panel beside the form: the website's discipline mosaic in miniature,
 * with the megaphone where the shield sits. Decorative — the tiles stand for
 * the whole portal being reached, not for any particular subject.
 */
const PANEL_TILES: ({ k: string; motif: string; shape?: string } | "CENTER")[] = [
  { k: "k-data", motif: "dots", shape: "round" },
  { k: "k-eng", motif: "rings" },
  { k: "k-res", motif: "book", shape: "arch" },
  { k: "k-build", motif: "arch" },
  "CENTER",
  { k: "k-it", motif: "window" },
  { k: "k-biz", motif: "bars" },
  { k: "k-energy", motif: "wave", shape: "round" },
  { k: "k-gold", motif: "star", shape: "gold" },
];

function BroadcastPanel() {
  return (
    <div aria-hidden className="k-navy relative hidden flex-col justify-center bg-k-100 p-6 md:flex">
      <div className="mosaic mx-auto w-full max-w-[232px] grid-cols-3 gap-2.5 xl:max-w-[288px] xl:gap-3">
        {PANEL_TILES.map((t, i) =>
          t === "CENTER" ? (
            <div key="center" className="mo navy mo-in" style={{ "--i": i } as React.CSSProperties}>
              {/* Wrapped: a bare <svg> child of .mo is stretched to fill the tile. */}
              <span className="absolute inset-0 grid place-items-center text-white">
                <Megaphone className="size-[44%]" strokeWidth={1.75} />
              </span>
              <span className="absolute right-[16%] top-[16%] size-2 rounded-full bg-gold" />
            </div>
          ) : (
            <div key={i} className={cn("mo mo-in", t.k, t.shape)} style={{ "--i": i } as React.CSSProperties}>
              <Svg markup={tileSvg(t.motif)} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Broadcast composer — fans out an in-app notification to a target audience via
 * `POST /api/admin/notifications/broadcast`.
 */
export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<BroadcastTarget>("ALL");
  const [role, setRole] = useState<RoleCode>("USER");
  const [userIdsRaw, setUserIdsRaw] = useState("");

  const [broadcast, { isLoading }] = useBroadcastNotificationMutation();

  const userIds = userIdsRaw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

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
      toast.success(`Broadcast sent to ${res.recipients.toLocaleString()} recipient(s)`);
      setTitle("");
      setBody("");
      setUserIdsRaw("");
    } catch {
      toast.error("Could not send broadcast");
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Broadcast an in-app notification to a target audience."
      />

      {/* The full content column, like the page header and every other page:
          from xl the mosaic panel takes the extra width (2 : 3), so the form
          keeps a comfortable line length instead of stopping short. */}
      <Card className="grid overflow-hidden md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <BroadcastPanel />

        <div className="flex min-w-0 flex-col">
          <CardContent className="space-y-5 p-5 sm:p-7">
            <div>
              <Label htmlFor="bc-title">Title</Label>
              <Input
                id="bc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short headline"
                maxLength={160}
              />
            </div>

            <div>
              <Label htmlFor="bc-body">Message</Label>
              <Textarea
                id="bc-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What do you want to tell people?"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="bc-audience">Audience</Label>
                <Select value={target} onValueChange={(v) => setTarget(v as BroadcastTarget)}>
                  <SelectTrigger id="bc-audience"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {target === "ROLE" && (
                <div>
                  <Label htmlFor="bc-role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as RoleCode)}>
                    <SelectTrigger id="bc-role"><SelectValue /></SelectTrigger>
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
              <div>
                <Label htmlFor="bc-users">User IDs</Label>
                <Textarea
                  id="bc-users"
                  rows={3}
                  value={userIdsRaw}
                  onChange={(e) => setUserIdsRaw(e.target.value)}
                  placeholder="Comma- or newline-separated user UUIDs"
                  className="font-mono text-[13px] tracking-normal"
                />
                <p className="mt-1.5 text-[12.5px] text-ink-3">
                  <span className="font-mono font-medium tracking-normal text-ink-2">{userIds.length}</span> user(s) targeted.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="mt-auto flex-col items-stretch gap-3 bg-paper-2/60 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="inline-flex items-center gap-2 text-[12.5px] text-ink-3">
              <Megaphone className="size-4 shrink-0 text-gold-ink" />
              Recipients get an in-app notification immediately.
            </p>
            <Button leftIcon={<Send className="size-4" />} loading={isLoading} disabled={!canSend} onClick={send}>
              Send broadcast
            </Button>
          </CardFooter>
        </div>
      </Card>
    </>
  );
}
