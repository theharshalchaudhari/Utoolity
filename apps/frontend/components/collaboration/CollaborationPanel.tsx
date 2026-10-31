"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Users, X, Check, XCircle, Eye, Pencil, LogOut } from "lucide-react";
import { getDeviceId } from "@/lib/api";
import { api } from "@/lib/api";

type Peer = { userId: string; displayName: string; role: string; online?: boolean };
type Member = { userId: string; displayName: string; permission: "view" | "editor" };
type ChatMessage = { id: string; userId: string; displayName: string; text: string; timestamp: number };
type Cursor = { userId: string; displayName: string; x: number; y: number; timestamp: number };
type SharedWorkspace = { openApps?: Array<{ app: string; filePath?: string; window?: unknown }> };

export default function CollaborationPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"people" | "chat">("people");
  const [users, setUsers] = useState<Peer[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [joinedUsers, setJoinedUsers] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [requests, setRequests] = useState<Peer[]>([]);
  const [permissionChoice, setPermissionChoice] = useState<Record<string, "view" | "editor">>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [joinedOwner, setJoinedOwner] = useState<{ userId: string; displayName: string; permission: "view" | "editor" } | null>(null);
  const [notice, setNotice] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  const send = useCallback((value: unknown) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
  }, []);

  const loadUsers = useCallback(() => {
    void api<{ users: Peer[] }>("/api/auth/collaboration/users")
      .then((result) => setUsers(result.users ?? []))
      .catch(() => setNotice("Unable to load profiles. Check your connection."));
  }, []);

  useEffect(() => {
    const openPanel = () => {
      setOpen(true);
      setTab("people");
      loadUsers();
    };
    window.addEventListener("utoolity:open-collaboration", openPanel);
    loadUsers();
    return () => window.removeEventListener("utoolity:open-collaboration", openPanel);
  }, [loadUsers]);

  useEffect(() => {
    let retry: number | undefined;
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.hostname}:4000/api/auth/socket`);
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        if (disposed) return socket.close();
        setConnected(true);
        socket.send(JSON.stringify({ type: "activity", deviceId: getDeviceId() }));
      });
      socket.addEventListener("message", (event) => {
        let data: Record<string, unknown>;
        try { data = JSON.parse(String(event.data)) as Record<string, unknown>; } catch { return; }
        if (data.type === "presence" && Array.isArray(data.users)) {
          const ids = new Set(data.users.flatMap((item) => item && typeof item === "object" && typeof (item as {userId?:unknown}).userId === "string" ? [(item as {userId:string}).userId] : []));
          setOnlineUsers(ids);
          loadUsers();
          return;
        }
        if (data.type === "join-request" && typeof data.fromUserId === "string") {
          const item = { userId: data.fromUserId, displayName: typeof data.fromDisplayName === "string" ? data.fromDisplayName : data.fromUserId, role: "intern" };
          setRequests((current) => current.some((request) => request.userId === item.userId) ? current : [...current, item]);
          setOpen(true);
          setTab("people");
          return;
        }
        if (data.type === "join-request-result") {
          setNotice(data.status === "pending" ? "Join request sent. Waiting for approval." : data.status === "not-found" ? "That profile no longer exists." : data.status === "already-in-session" ? "Leave your current session before requesting another." : data.status === "target-in-session" ? "That user is already sharing another desktop." : "That user is currently offline.");
          return;
        }
        if (data.type === "join-declined") {
          setNotice(`${String(data.ownerDisplayName ?? "User")} declined the join request.`);
          return;
        }
        if (data.type === "join-approved" && typeof data.ownerUserId === "string") {
          const permission = data.permission === "editor" ? "editor" : "view";
          const displayName = typeof data.ownerDisplayName === "string" ? data.ownerDisplayName : data.ownerUserId;
          setJoinedOwner({ userId: data.ownerUserId, displayName, permission });
          setNotice(`Joined ${displayName} in ${permission === "editor" ? "editor" : "view-only"} mode.`);
          window.dispatchEvent(new CustomEvent("utoolity:shared-session-changed", {
            detail: { ownerUserId: data.ownerUserId, ownerDisplayName: displayName, permission, workspace: data.workspace },
          }));
          return;
        }
        if (data.type === "join-left" || data.type === "shared-session-ended") {
          setJoinedOwner(null);
          setMembers([]);
          setJoinedUsers(new Set());
          setCursors({});
          window.dispatchEvent(new CustomEvent("utoolity:shared-session-ended"));
          setNotice(data.type === "shared-session-ended" ? "The host ended the shared session." : "You left the shared session.");
          return;
        }
        if (data.type === "shared-permission") {
          const permission = data.permission === "editor" ? "editor" : "view";
          setJoinedOwner((current) => current ? { ...current, permission } : current);
          window.dispatchEvent(new CustomEvent("utoolity:shared-permission-changed", { detail: { permission } }));
          return;
        }
        if (data.type === "shared-session-active" && typeof data.memberUserId === "string") {
          setMembers((current) => current.some((member) => member.userId === data.memberUserId)
            ? current.map((member) => member.userId === data.memberUserId
                ? { ...member, displayName: typeof data.memberDisplayName === "string" ? data.memberDisplayName : member.displayName, permission: data.permission === "editor" ? "editor" : "view" }
                : member)
            : [...current, {
                userId: data.memberUserId as string,
                displayName: typeof data.memberDisplayName === "string" ? data.memberDisplayName : data.memberUserId as string,
                permission: data.permission === "editor" ? "editor" : "view",
              }]);
          setJoinedUsers((current) => new Set(current).add(data.memberUserId as string));
          return;
        }
        if (data.type === "shared-members" && Array.isArray(data.members)) {
          const nextMembers = data.members as Member[];
          setMembers(nextMembers);
          setJoinedUsers(new Set(nextMembers.map((member) => member.userId)));
          return;
        }
        if (data.type === "shared-member-left" && typeof data.userId === "string") {
          setMembers((current) => current.filter((member) => member.userId !== data.userId));
          setJoinedUsers((current) => { const next = new Set(current); next.delete(data.userId as string); return next; });
          return;
        }
        if (data.type === "shared-workspace" && typeof data.ownerUserId === "string") {
          window.dispatchEvent(new CustomEvent("utoolity:shared-workspace", { detail: data }));
          return;
        }
        if (data.type === "shared-workspace-command" && typeof data.command === "string") {
          window.dispatchEvent(new CustomEvent("utoolity:shared-workspace-command", { detail: data }));
          return;
        }
        if (data.type === "cursor" && typeof data.userId === "string" && typeof data.x === "number" && typeof data.y === "number") {
          setCursors((current) => ({ ...current, [data.userId as string]: {
            userId: data.userId as string,
            displayName: typeof data.displayName === "string" ? data.displayName : "Collaborator",
            x: data.x as number, y: data.y as number, timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
          }}));
          return;
        }
        if (data.type === "annotation-state") {
          window.dispatchEvent(new CustomEvent("utoolity:annotation-state", { detail: data }));
          return;
        }
        if (data.type === "chat" && typeof data.text === "string") {
          setMessages((current) => [...current.slice(-99), data as unknown as ChatMessage]);
        }
      });
      socket.addEventListener("close", () => {
        if (socketRef.current === socket) socketRef.current = null;
        setConnected(false);
        if (!disposed) retry = window.setTimeout(connect, 3000);
      });
      socket.addEventListener("error", () => socket.close());
    };
    connect();
    return () => {
      disposed = true;
      if (retry !== undefined) window.clearTimeout(retry);
      socketRef.current?.close(1000, "Collaboration panel unmounted");
      socketRef.current = null;
    };
  }, [loadUsers]);

  useEffect(() => {
    const sendWorkspace = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!joinedOwner || joinedOwner.permission !== "editor") return;
      send({ type: "shared-workspace-state", workspace: detail, deviceId: getDeviceId() });
    };
    window.addEventListener("utoolity:workspace-state-changed", sendWorkspace);
    return () => window.removeEventListener("utoolity:workspace-state-changed", sendWorkspace);
  }, [joinedOwner, send]);

  useEffect(() => {
    const sendCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ command?: string; payload?: unknown }>).detail;
      if (!detail?.command || !joinedOwner) return;
      if (joinedOwner.permission !== "editor") return;
      send({ type: "shared-workspace-command", command: detail.command, payload: detail.payload, deviceId: getDeviceId() });
    };
    const leave = () => leaveSession();
    window.addEventListener("utoolity:shared-command-outgoing", sendCommand);
    window.addEventListener("utoolity:leave-shared-session", leave);
    return () => {
      window.removeEventListener("utoolity:shared-command-outgoing", sendCommand);
      window.removeEventListener("utoolity:leave-shared-session", leave);
    };
  }, [joinedOwner, send]);

  useEffect(() => {
    const cleanup = window.setInterval(() => {
      const now = Date.now();
      setCursors((current) => Object.fromEntries(Object.entries(current).filter(([, cursor]) => now - cursor.timestamp < 12000)));
    }, 3000);
    return () => window.clearInterval(cleanup);
  }, []);

  useEffect(() => {
    let lastSent = 0;
    const handlePointer = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastSent < 65) return;
      lastSent = now;
      send({ type: "cursor", x: event.clientX / Math.max(1, window.innerWidth), y: event.clientY / Math.max(1, window.innerHeight), deviceId: getDeviceId() });
    };
    window.addEventListener("mousemove", handlePointer, { passive: true });
    return () => window.removeEventListener("mousemove", handlePointer);
  }, [send]);

  const requestJoin = (user: Peer) => {
    setNotice("");
    send({ type: "join-request", targetUserId: user.userId, deviceId: getDeviceId() });
  };

  const respondToJoin = (user: Peer, approved: boolean) => {
    send({ type: "join-response", targetUserId: user.userId, approved, permission: permissionChoice[user.userId] ?? "view", deviceId: getDeviceId() });
    setRequests((current) => current.filter((item) => item.userId !== user.userId));
  };

  const leaveSession = () => {
    send({ type: "join-leave", deviceId: getDeviceId() });
    setJoinedOwner(null);
    setMembers([]);
    setJoinedUsers(new Set());
    setCursors({});
    window.dispatchEvent(new CustomEvent("utoolity:shared-session-ended"));
  };

  const setMemberPermission = (member: Member, permission: "view" | "editor") => {
    send({ type: "shared-permission", targetUserId: member.userId, permission, deviceId: getDeviceId() });
    setMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, permission } : item));
  };

  const publishAnnotationState = useCallback((payload: unknown) => {
    send({ type: "annotation-state", payload, deviceId: getDeviceId() });
  }, [send]);

  useEffect(() => {
    const publish = (event: Event) => {
      publishAnnotationState((event as CustomEvent<unknown>).detail);
    };
    window.addEventListener("utoolity:annotation-state-outgoing", publish);
    return () => window.removeEventListener("utoolity:annotation-state-outgoing", publish);
  }, [publishAnnotationState]);

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    send({ type: "chat", text, roomId: "global", deviceId: getDeviceId() });
    setDraft("");
  };

  return (
    <>
      {Object.values(cursors).map((cursor) => (
        <div key={cursor.userId} aria-hidden="true" className="pointer-events-none fixed z-1100 flex items-center gap-1.5 transition-[left,top] duration-75" style={{ left: `${cursor.x * 100}vw`, top: `${cursor.y * 100}vh` }}>
          <img src="/cursors/bibata-pointer.svg" alt="" className="h-8 w-8 object-contain drop-shadow-md" style={{ transform: "translate(-3px, -3px)", transformOrigin: "top left" }} />
          <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground shadow">{cursor.displayName}</span>
        </div>
      ))}
      {open && (
        <section className="fixed bottom-4 right-4 z-1200 w-[min(27rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4" /> Collaboration <span className={connected ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-destructive"} /></div>
            <button type="button" aria-label="Close collaboration" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted"><X className="size-4" /></button>
          </header>

          {notice && <p role="status" className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{notice}</p>}

          {requests.length > 0 && (
            <div className="space-y-2 border-b border-border bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Join requests</p>
              {requests.map((request) => (
                <div key={request.userId} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{request.displayName} wants to join your desktop.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <select aria-label={`Permission for ${request.displayName}`} value={permissionChoice[request.userId] ?? "view"} onChange={(event) => setPermissionChoice((current) => ({ ...current, [request.userId]: event.target.value as "view" | "editor" }))} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-xs">
                      <option value="view">View only</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button type="button" onClick={() => respondToJoin(request, true)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"><Check className="size-3.5" /> Allow</button>
                    <button type="button" onClick={() => respondToJoin(request, false)} className="rounded-lg border border-border p-2" aria-label="Decline join request"><XCircle className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!joinedOwner && (
            <div className="space-y-2 border-b border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In your session</p>
              {members.length === 0 && <p className="text-xs text-muted-foreground">No collaborators have joined yet.</p>}
              {members.map((member) => (
                <div key={member.userId} className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{member.displayName}</span>
                  <select aria-label={`Permission for ${member.displayName}`} value={member.permission} onChange={(event) => setMemberPermission(member, event.target.value as "view" | "editor")} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
                    <option value="view">View only</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {joinedOwner && (
            <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Joined {joinedOwner.displayName}</p>
                <p className="text-xs text-muted-foreground">{joinedOwner.permission === "editor" ? "Editor access" : "View only"}</p>
              </div>
              <button type="button" onClick={leaveSession} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs"><LogOut className="size-3.5" /> Leave</button>
            </div>
          )}

          <div className="flex border-b border-border p-1">
            <button type="button" onClick={() => setTab("people")} className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === "people" ? "bg-muted font-semibold" : "text-muted-foreground"}`}>Profiles ({users.length})</button>
            <button type="button" onClick={() => setTab("chat")} className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === "chat" ? "bg-muted font-semibold" : "text-muted-foreground"}`}>Chat</button>
          </div>
          {tab === "people" ? (
            <div className="max-h-64 space-y-2 overflow-y-auto p-3">
              {users.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No configured profiles found.</p>}
              {users.map((user) => (
                <div key={user.userId} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">{user.displayName.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.displayName}</p><p className="text-xs text-muted-foreground">{onlineUsers.has(user.userId) || user.online ? "Active now" : "Offline"}</p></div>
                  <span className={`size-2 rounded-full ${onlineUsers.has(user.userId) || user.online ? "bg-emerald-500" : "bg-muted-foreground/35"}`} />
                  <button type="button" onClick={() => requestJoin(user)} title={joinedUsers.has(user.userId) ? "Already in your session" : "Request to join this desktop"} disabled={!connected || !(onlineUsers.has(user.userId) || user.online) || Boolean(joinedOwner) || joinedUsers.has(user.userId)} className="rounded-lg border border-border p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><Eye className="size-4" /></button>
                </div>
              ))}
              <p className="px-1 text-xs text-muted-foreground">The host must approve every join and chooses view-only or editor access.</p>
            </div>
          ) : (
            <div className="flex h-64 flex-col">
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map((message) => <div key={message.id} className="rounded-xl bg-muted/70 px-3 py-2"><p className="text-xs font-semibold">{message.displayName}</p><p className="wrap-break-word text-sm">{message.text}</p></div>)}
                {messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>}
              </div>
              <form onSubmit={sendChat} className="flex gap-2 border-t border-border p-3">
                <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Message everyone…" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button type="submit" disabled={!draft.trim() || !connected} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Send</button>
              </form>
            </div>
          )}
        </section>
      )}
    </>
  );
}
