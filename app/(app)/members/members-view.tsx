"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Mail,
  UserPlus,
  Loader2,
  Crown,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  type ActionState,
} from "../actions";
import type { Family, FamilyMember, UserRole } from "@/lib/types";

const initialState: ActionState = null;

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: "Full control — manages family, members, and content",
  editor: "Can add and edit memories, growth, feedings, sleep, milestones",
  viewer: "Can see everything but cannot make changes",
};

export function MembersView({
  family,
  members,
  tokenByEmail,
  currentUserId,
  myRole,
}: {
  family: Family;
  members: (FamilyMember & { profile: any })[];
  tokenByEmail: Record<string, string>;
  currentUserId: string;
  myRole: UserRole;
}) {
  const isOwner = myRole === "owner";
  const [state, formAction, pending] = useActionState(
    inviteMemberAction,
    initialState
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [newInviteLink, setNewInviteLink] = useState<{
    email: string;
    link: string;
  } | null>(null);
  const [copiedNew, setCopiedNew] = useState(false);

  const ok = state && "ok" in state && state.ok;

  // When an invite is created, capture the share link so the owner can copy
  // it without hunting through the member list. We pick the email off the
  // form so we know which token just got created.
  useEffect(() => {
    if (ok && state.token) {
      const form = document.querySelector<HTMLFormElement>('form[data-invite-form]');
      const email = form
        ? ((form.elements.namedItem("email") as HTMLInputElement)?.value ?? "")
        : "";
      setNewInviteLink({
        email,
        link: `${window.location.origin}/signup?invite=${state.token}`,
      });
      setCopiedNew(false);
    }
  }, [state]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-script text-3xl">Family</h1>
        <p className="text-sm text-[var(--foreground)]/60 mt-1">
          {family.name} · {members.length} member
          {members.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Members list */}
      <section className="space-y-2">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            isOwner={isOwner}
            isMe={m.user_id === currentUserId}
            token={m.user_id ? null : tokenByEmail[m.invited_email ?? ""] ?? null}
            busy={busy === m.id}
            setBusy={(b) => setBusy(b ? m.id : null)}
          />
        ))}
      </section>

      {/* Invite form (owner only) */}
      {isOwner && (
        <Card className="p-5">
          <h2 className="font-medium mb-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invite someone
          </h2>
          <p className="text-xs text-[var(--foreground)]/60 mb-4">
            They&apos;ll be added when they sign up with the same email.
          </p>

          <form action={formAction} className="space-y-3" data-invite-form>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="grandma@example.com"
                  className="pl-11"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select id="role" name="role" defaultValue="viewer">
                <option value="viewer">Viewer — can see everything</option>
                <option value="editor">
                  Editor — can add memories & content
                </option>
              </Select>
            </div>

            {ok && newInviteLink && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 space-y-2">
                <p className="text-sm text-green-800 font-medium">
                  Invitation ready for {newInviteLink.email || "them"}!
                </p>
                <p className="text-xs text-green-700/80 break-all font-mono">
                  {newInviteLink.link}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(newInviteLink.link);
                    setCopiedNew(true);
                    setTimeout(() => setCopiedNew(false), 2000);
                  }}
                >
                  {copiedNew ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedNew ? "Copied!" : "Copy invite link"}
                </Button>
              </div>
            )}
            {state && !state.ok && (
              <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Send invite
            </Button>
          </form>
        </Card>
      )}

      {/* Role legend */}
      <Card className="p-5 bg-[var(--muted)] border-0">
        <h3 className="font-medium mb-2 text-sm">Roles explained</h3>
        <div className="space-y-2 text-sm text-[var(--foreground)]/70">
          {(["owner", "editor", "viewer"] as UserRole[]).map((r) => (
            <div key={r} className="flex items-start gap-2">
              <span className="font-medium capitalize text-[var(--foreground)] mt-0.5">
                {r}:
              </span>
              <span>{ROLE_DESCRIPTIONS[r]}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  isOwner,
  isMe,
  token,
  busy,
  setBusy,
}: {
  member: FamilyMember & { profile: any };
  isOwner: boolean;
  isMe: boolean;
  token: string | null;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const joined = !!member.user_id;
  const [copied, setCopied] = useState(false);
  const label = joined
    ? member.profile?.display_name ||
      member.profile?.email?.split("@")[0] ||
      member.invited_email
    : member.invited_email;
  const sublabel = joined ? member.profile?.email : "Invitation pending";

  async function onRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setBusy(true);
    await updateMemberRoleAction(member.id, e.target.value as UserRole);
    setBusy(false);
  }

  async function onRemove() {
    if (!confirm("Remove this member?")) return;
    setBusy(true);
    await removeMemberAction(member.id, {
      pendingEmail: joined ? undefined : (member.invited_email ?? undefined),
    });
    setBusy(false);
  }

  function onCopyLink() {
    if (!token) return;
    const link = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4 flex items-center gap-3">
      <Avatar
        name={label || "?"}
        url={member.profile?.avatar_url}
        role={member.role as UserRole}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate flex items-center gap-1.5">
          {label}
          {isMe && (
            <span className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/50">
              (you)
            </span>
          )}
          {member.role === "owner" && (
            <Crown className="w-4 h-4 text-[var(--primary-dark)]" />
          )}
        </div>
        <div className="text-xs text-[var(--foreground)]/60 truncate">
          {sublabel}
        </div>
      </div>

      {isOwner && !isMe && joined ? (
        <div className="flex items-center gap-2">
          <select
            value={member.role}
            onChange={onRoleChange}
            disabled={busy}
            className="h-9 px-2 text-xs rounded-lg border border-[var(--border)] bg-white"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="owner">Owner</option>
          </select>
          <button
            onClick={onRemove}
            disabled={busy}
            className="w-9 h-9 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : isOwner && !joined ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyLink}
            disabled={!token}
            title={token ? "Copy invite link" : "No active invite link"}
            className="text-xs text-[var(--primary-dark)] hover:underline px-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={onRemove}
            disabled={busy}
            className="text-xs text-red-600 hover:underline px-2"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({
  name,
  url,
  role,
}: {
  name: string;
  url?: string | null;
  role: UserRole;
}) {
  const bg =
    role === "owner"
      ? "bg-[var(--primary)]"
      : role === "editor"
      ? "bg-[var(--accent)]"
      : "bg-[var(--accent-2)]";
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className={`w-10 h-10 rounded-full ${bg} text-white flex items-center justify-center font-medium overflow-hidden flex-shrink-0`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}