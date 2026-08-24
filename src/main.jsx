import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";
import { apiFetch, isApiConfigured } from "./lib/api";
import {
  Building2,
  Users,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  MoreHorizontal,
  X,
  GripVertical,
  Loader2,
  Pencil,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import "./styles.css";

const defaultStages = [
  { id: "prospect", name: "Prospecting", color: "#6b7280" },
  { id: "contacted", name: "Contacted", color: "#3b82f6" },
  { id: "meeting", name: "Meeting Scheduled", color: "#8b5cf6" },
  { id: "proposal", name: "Proposal Sent", color: "#f59e0b" },
  { id: "won", name: "Closed Won", color: "#10b981" },
  { id: "lost", name: "Closed Lost", color: "#ef4444" },
];
const seedOrgs = [
  {
    id: 1,
    name: "Northstar Technologies",
    industry: "Technology",
    city: "Bengaluru",
    status: "active",
    website: "northstar.io",
  },
  {
    id: 2,
    name: "Meridian Health Group",
    industry: "Healthcare",
    city: "Hyderabad",
    status: "prospect",
    website: "meridian.health",
  },
  {
    id: 3,
    name: "Vertex Consulting",
    industry: "Consulting",
    city: "Pune",
    status: "active",
    website: "vertex.co",
  },
];
const seedContacts = [
  {
    id: 1,
    name: "Aarav Menon",
    designation: "Talent Acquisition Lead",
    organization_id: 1,
    email: "aarav@northstar.io",
    phone: "+91 98765 43210",
  },
  {
    id: 2,
    name: "Priya Shah",
    designation: "HR Manager",
    organization_id: 2,
    email: "priya@meridian.health",
    phone: "+91 99887 66554",
  },
];
const seedReports = [
  {
    id: 1,
    title: "Graduate hiring discussion",
    organization_id: 1,
    meeting_date: "2026-08-18",
    summary: "Discussed the Q4 campus hiring plan and assessment format.",
    action_items: "Share candidate cohort profile.",
    attendees: "Aarav Menon, Me",
  },
  {
    id: 2,
    title: "Introductory call",
    organization_id: 2,
    meeting_date: "2026-08-12",
    summary: "Introduced the placement program and understood current needs.",
    action_items: "Follow up next week.",
    attendees: "Priya Shah, Me",
  },
];
const seedCards = [
  {
    id: 1,
    title: "Northstar graduate cohort",
    stage_id: "proposal",
    organization_id: 1,
    priority: "high",
    due_date: "2026-09-01",
  },
  {
    id: 2,
    title: "Meridian first touch",
    stage_id: "prospect",
    organization_id: 2,
    priority: "medium",
    due_date: "2026-08-28",
  },
  {
    id: 3,
    title: "Vertex campus partnership",
    stage_id: "meeting",
    organization_id: 3,
    priority: "low",
    due_date: "2026-08-25",
  },
];
const seedManagers = [
  "Ananya Sharma",
  "Rahul Verma",
  "Meera Iyer",
  "Aditi Rao",
  "Vikram Singh",
].map((name, i) => ({
  id: i,
  name,
  email: name.toLowerCase().replace(" ", "@") + "@placement.org",
  status: i === 4 ? "inactive" : "active",
  created_at: `2026-08-${12 - i}`,
}));

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, ...p }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required {...p} />
    </label>
  );
}
function Select({ label, children, ...p }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select required {...p}>
        {children}
      </select>
    </label>
  );
}
function FormActions({ onClose, busy, onDelete }) {
  return (
    <div className={`form-actions ${onDelete ? "has-delete" : ""}`}>
      {onDelete && (
        <button type="button" className="btn danger-outline" onClick={onDelete}>
          Delete stage
        </button>
      )}
      <div className="form-actions-right">
        <button type="button" className="btn secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy}>
          {busy && <Loader2 size={15} className="spin" />}Save
        </button>
      </div>
    </div>
  );
}

function Login({ onLogin, error, loading }) {
  return (
    <div className="login">
      <div className="login-card">
        <div className="brand centered">
          <div className="brand-mark">P</div>
          <div>
            <strong>
              Placement<span>CRM</span>
            </strong>
            <small>RELATIONSHIP OS</small>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to your placement workspace.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin({
              email: e.currentTarget.email.value,
              password: e.currentTarget.password.value,
            });
          }}
        >
          <Field
            label="Email"
            type="email"
            required
            name="email"
            autoComplete="email"
            placeholder="name@example.com"
          />
          <Field
            label="Password"
            type="password"
            required
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
          />
          {error && <div className="error">{error}</div>}
          <button className="btn primary full" disabled={loading}>
            {loading && <Loader2 size={15} className="spin" />}Sign in
          </button>
        </form>
        {!isSupabaseConfigured && (
          <>
            <div className="demo-hint">
              Demo mode: preview either role below.
            </div>
            <div className="role-toggle">
              <button type="button" onClick={() => onLogin("pm")}>
                Placement Manager
              </button>
              <button type="button" onClick={() => onLogin("admin")}>
                Admin
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [role, setRole] = useState(null),
    [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(isSupabaseConfigured),
    [error, setError] = useState("");
  const loadProfile = async (id) => {
    try {
      const data = isApiConfigured
        ? await apiFetch("/api/me")
        : (await supabase.from("profiles").select("*").eq("id", id).single())
            .data;
      if (!data) throw new Error("Profile not found");
      setProfile(data);
      setRole(data.role === "admin" ? "admin" : "pm");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live && data.session) {
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      } else if (live) setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!live) return;
      if (session) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  const login = async (value) => {
    setError("");
    if (!isSupabaseConfigured) {
      setRole(value);
      return;
    }
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword(value);
    if (e) {
      setError(e.message);
      setLoading(false);
    }
  };
  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setProfile(null);
  };
  if (loading)
    return (
      <div className="loading-screen">
        <Loader2 className="spin" /> Loading workspace…
      </div>
    );
  if (!role) return <Login onLogin={login} loading={loading} error={error} />;
  return (
    <Workspace role={role} user={user} profile={profile} onLogout={logout} />
  );
}

function Workspace({ role, user, profile, onLogout }) {
  const admin = role === "admin";
  const [active, setActive] = useState("Overview"),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [orgs, setOrgs] = useState(isSupabaseConfigured ? [] : seedOrgs),
    [contacts, setContacts] = useState(
      isSupabaseConfigured ? [] : seedContacts,
    ),
    [reports, setReports] = useState(isSupabaseConfigured ? [] : seedReports),
    [cards, setCards] = useState(isSupabaseConfigured ? [] : seedCards),
    [stages, setStages] = useState(isApiConfigured ? [] : defaultStages),
    [managers, setManagers] = useState(
      isSupabaseConfigured ? [] : seedManagers,
    ),
    [editingReport, setEditingReport] = useState(null),
    [editingCard, setEditingCard] = useState(null),
    [editingStage, setEditingStage] = useState(null),
    [loaded, setLoaded] = useState(!isSupabaseConfigured);
  const nav = admin
    ? ["Overview", "Placement Managers", "Settings"]
    : ["Overview", "Organizations", "Contacts", "Meeting Reports", "Kanban"];
  const refresh = async () => {
    if (!user) return;
    try {
      if (isApiConfigured) {
        const [o, c, r, k] = await Promise.all([
          apiFetch("/api/organizations"),
          apiFetch("/api/contacts"),
          apiFetch("/api/meeting-reports"),
          apiFetch("/api/kanban"),
        ]);
        setOrgs(o);
        setContacts(c);
        setReports(r);
        // API mode receives UUID-backed stages from FastAPI. Do not fall back
        // to demo IDs such as "proposal", because the database expects UUIDs.
        setStages(k.stages || []);
        setCards(k.cards || []);
      } else {
        if (!supabase) return;
        const results = await Promise.all([
          supabase
            .from("organizations")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("contacts")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("meeting_reports")
            .select("*")
            .order("meeting_date", { ascending: false }),
          supabase.from("kanban_stages").select("*").order("position"),
          supabase.from("kanban_cards").select("*").order("position"),
        ]);
        const failed = results.find((r) => r.error);
        if (failed) throw new Error(failed.error.message);
        setOrgs(results[0].data || []);
        setContacts(results[1].data || []);
        setReports(results[2].data || []);
        let dbStages = results[3].data || [];
        if (!dbStages.length) {
          const rows = defaultStages.map((s, i) => ({
            placement_manager_id: user.id,
            name: s.name,
            color: s.color,
            position: i,
          }));
          const created = await supabase
            .from("kanban_stages")
            .insert(rows)
            .select();
          dbStages = created.data || [];
        }
        setStages(dbStages);
        setCards(results[4].data || []);
      }
      setLoaded(true);
    } catch (e) {
      setError(e.message);
    }
  };
  const refreshManagers = async () => {
    try {
      if (isApiConfigured) setManagers(await apiFetch("/api/admin/managers"));
      else if (supabase) {
        const { data, error: e } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "placement_manager")
          .order("created_at", { ascending: false });
        if (e) throw new Error(e.message);
        setManagers(data || []);
      }
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    if (isSupabaseConfigured) {
      if (admin) refreshManagers();
      else refresh();
    }
  }, [admin, user?.id]);
  useEffect(() => {
    if (!supabase || admin || isApiConfigured) return;
    const ch = supabase
      .channel("kanban-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kanban_cards",
          filter: `placement_manager_id=eq.${user?.id}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [admin, user?.id]);
  const orgName = (id) =>
    orgs.find((o) => String(o.id) === String(id))?.name || "Unlinked";
  const save = async (table, payload, setter, prepend = false) => {
    setBusy(true);
    try {
      if (isApiConfigured) {
        const path = {
          organizations: "/api/organizations",
          contacts: "/api/contacts",
          meeting_reports: "/api/meeting-reports",
          kanban_cards: "/api/kanban/cards",
        }[table];
        const data = await apiFetch(path, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setter((prev) => (prepend ? [data, ...prev] : [...prev, data]));
      } else if (!supabase) {
        setter((prev) =>
          prepend
            ? [{ ...payload, id: Date.now() }, ...prev]
            : [...prev, { ...payload, id: Date.now() }],
        );
      } else {
        const { data, error: e } = await supabase
          .from(table)
          .insert({ ...payload, placement_manager_id: user.id })
          .select()
          .single();
        if (e) throw new Error(e.message);
        setter((prev) => (prepend ? [data, ...prev] : [...prev, data]));
      }
      setModal(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const addOrg = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save(
      "organizations",
      {
        name: f.get("name"),
        industry: f.get("industry"),
        city: f.get("city"),
        website: f.get("website"),
        status: f.get("status"),
        notes: f.get("notes"),
      },
      setOrgs,
    );
  };
  const addContact = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save(
      "contacts",
      {
        name: f.get("name"),
        designation: f.get("designation"),
        organization_id: f.get("organization_id"),
        email: f.get("email"),
        phone: f.get("phone"),
        linkedin_url: f.get("linkedin_url"),
        notes: f.get("notes"),
      },
      setContacts,
    );
  };
  const addReport = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      title: f.get("title"),
      organization_id: f.get("organization_id"),
      contact_id: f.get("contact_id"),
      meeting_date: f.get("meeting_date"),
      summary: f.get("summary"),
      action_items: f.get("action_items"),
      attendees: f.get("attendees"),
      outcome: f.get("outcome"),
      follow_up_date: f.get("follow_up_date"),
      meeting_type: f.get("meeting_type"),
    };
    if (!editingReport) {
      save("meeting_reports", payload, setReports, true);
      return;
    }
    setBusy(true);
    try {
      if (isApiConfigured) {
        const data = await apiFetch(
          `/api/meeting-reports/${editingReport.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setReports((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === editingReport.id ? { ...r, ...payload } : r,
          ),
        );
      }
      setModal(null);
      setEditingReport(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const addCard = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      title: f.get("title"),
      stage_id: f.get("stage_id"),
      organization_id: f.get("organization_id"),
      priority: f.get("priority"),
      due_date: f.get("due_date"),
      description: f.get("description"),
    };
    if (!editingCard) {
      save("kanban_cards", { ...payload, position: 0 }, setCards);
      return;
    }
    setBusy(true);
    try {
      let data = { ...editingCard, ...payload };
      if (isApiConfigured) {
        data = await apiFetch(`/api/kanban/cards/${editingCard.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else if (supabase) {
        const { data: updated, error: e } = await supabase
          .from("kanban_cards")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingCard.id)
          .select()
          .single();
        if (e) throw new Error(e.message);
        data = updated;
      }
      setCards((prev) => prev.map((card) => (card.id === data.id ? data : card)));
      setModal(null);
      setEditingCard(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteOrg = async (id) => {
    if (!window.confirm("Delete this organization and its linked contacts?"))
      return;
    try {
      if (isApiConfigured)
        await apiFetch(`/api/organizations/${id}`, { method: "DELETE" });
      else if (supabase) {
        const { error: e } = await supabase
          .from("organizations")
          .delete()
          .eq("id", id);
        if (e) throw new Error(e.message);
      }
      setOrgs((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };
  const deleteReport = async (id) => {
    if (!window.confirm("Delete this meeting report and its action items?"))
      return;
    try {
      if (isApiConfigured)
        await apiFetch(`/api/meeting-reports/${id}`, { method: "DELETE" });
      else if (supabase) {
        const { error: e } = await supabase
          .from("meeting_reports")
          .delete()
          .eq("id", id);
        if (e) throw new Error(e.message);
      }
      setReports((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };
  const toggleAction = async (reportId, actionId, is_completed) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              action_items_list: (r.action_items_list || []).map((a) =>
                a.id === actionId ? { ...a, is_completed } : a,
              ),
            }
          : r,
      ),
    );
    try {
      if (isApiConfigured)
        await apiFetch(`/api/meeting-reports/${reportId}/actions/${actionId}`, {
          method: "PATCH",
          body: JSON.stringify({ is_completed }),
        });
    } catch (e) {
      setError(e.message);
      refresh();
    }
  };
  const moveCard = async (id, stage_id) => {
    setCards((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, stage_id } : c)),
    );
    try {
      if (isApiConfigured) {
        const data = await apiFetch(`/api/kanban/cards/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ stage_id }),
        });
        setCards((prev) => prev.map((card) => (card.id === data.id ? data : card)));
      } else if (supabase) {
        const { error: e } = await supabase
          .from("kanban_cards")
          .update({ stage_id, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (e) throw new Error(e.message);
      }
    } catch (e) {
      setError(e.message);
      refresh();
    }
  };
  const deleteCard = async (id) => {
    if (!window.confirm("Delete this pipeline card permanently?")) return;
    try {
      if (isApiConfigured) {
        await apiFetch(`/api/kanban/cards/${id}`, { method: "DELETE" });
      } else if (supabase) {
        const { error: e } = await supabase
          .from("kanban_cards")
          .delete()
          .eq("id", id);
        if (e) throw new Error(e.message);
      }
      setCards((prev) => prev.filter((card) => card.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };
  const saveStage = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get("name"),
      color: f.get("color"),
      wip_limit: f.get("wip_limit") ? Number(f.get("wip_limit")) : null,
      position: editingStage?.position ?? stages.length,
    };
    setBusy(true);
    try {
      let data;
      if (isApiConfigured) {
        data = await apiFetch(
          editingStage
            ? `/api/kanban/stages/${editingStage.id}`
            : "/api/kanban/stages",
          { method: editingStage ? "PATCH" : "POST", body: JSON.stringify(payload) },
        );
      } else if (supabase) {
        const query = editingStage
          ? supabase
              .from("kanban_stages")
              .update(payload)
              .eq("id", editingStage.id)
              .select()
              .single()
          : supabase
              .from("kanban_stages")
              .insert({ ...payload, placement_manager_id: user.id })
              .select()
              .single();
        const result = await query;
        if (result.error) throw new Error(result.error.message);
        data = result.data;
      } else {
        data = { ...payload, id: editingStage?.id || Date.now() };
      }
      setStages((prev) =>
        editingStage
          ? prev.map((stage) => (stage.id === data.id ? data : stage))
          : [...prev, data],
      );
      setModal(null);
      setEditingStage(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteStage = async (stage) => {
    if (!window.confirm(`Delete the ${stage.name} stage? It must be empty.`)) return false;
    try {
      if (isApiConfigured) {
        await apiFetch(`/api/kanban/stages/${stage.id}`, { method: "DELETE" });
      } else if (supabase) {
        const { error: e } = await supabase
          .from("kanban_stages")
          .delete()
          .eq("id", stage.id);
        if (e) throw new Error(e.message);
      }
      setStages((prev) => prev.filter((item) => item.id !== stage.id));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };
  const deactivate = async (id) => {
    try {
      if (isApiConfigured)
        await apiFetch(`/api/admin/managers/${id}/deactivate`, {
          method: "PATCH",
        });
      else if (supabase) {
        const { error: e } = await supabase
          .from("profiles")
          .update({ status: "inactive" })
          .eq("id", id);
        if (e) throw new Error(e.message);
      }
      setManagers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "inactive" } : m)),
      );
    } catch (e) {
      setError(e.message);
    }
  };
  const deleteManager = async (id) => {
    if (
      !window.confirm(
        "Delete this placement manager and their account permanently?",
      )
    )
      return;
    try {
      if (isApiConfigured)
        await apiFetch(`/api/admin/managers/${id}`, { method: "DELETE" });
      else if (supabase) {
        const { error: e } = await supabase
          .from("profiles")
          .delete()
          .eq("id", id);
        if (e) throw new Error(e.message);
      }
      setManagers((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };
  const addManager = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const payload = {
        email: f.get("email"),
        full_name: f.get("full_name"),
        password: f.get("password"),
      };
      if (isApiConfigured) {
        await apiFetch("/api/admin/managers/invite", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshManagers();
      } else if (!supabase) {
        setManagers((prev) => [
          {
            id: Date.now(),
            name: payload.full_name,
            email: payload.email,
            status: "active",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        const { error: e2 } = await supabase.functions.invoke(
          "invite-placement-manager",
          { body: payload },
        );
        if (e2) throw new Error(e2.message);
        await refreshManagers();
      }
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  if (!loaded && !admin)
    return (
      <div className="loading-screen">
        <Loader2 className="spin" /> Loading workspace…
      </div>
    );
  const content =
    active === "Overview" ? (
      <Overview
        admin={admin}
        orgs={orgs}
        contacts={contacts}
        reports={reports}
        cards={cards}
        stages={stages}
        managers={managers}
      />
    ) : admin && active === "Placement Managers" ? (
      <Managers
        managers={managers}
        onAdd={() => setModal("manager")}
        onDeactivate={deactivate}
        onDelete={deleteManager}
      />
    ) : admin ? (
      <SettingsPage />
    ) : active === "Organizations" ? (
      <Organizations
        orgs={orgs}
        query={query}
        setQuery={setQuery}
        onAdd={() => setModal("org")}
        onDelete={deleteOrg}
      />
    ) : active === "Contacts" ? (
      <Contacts
        contacts={contacts}
        orgName={orgName}
        query={query}
        setQuery={setQuery}
        onAdd={() => setModal("contact")}
      />
    ) : active === "Meeting Reports" ? (
      <Reports
        reports={reports}
        orgName={orgName}
        organizations={orgs}
        onAdd={() => {
          setEditingReport(null);
          setModal("report");
        }}
        onEdit={(r) => {
          setEditingReport(r);
          setModal("report");
        }}
        onDelete={deleteReport}
        onToggleAction={toggleAction}
      />
    ) : (
      <Kanban
        cards={cards}
        moveCard={moveCard}
        stages={stages}
        organizations={orgs}
        orgName={orgName}
        onAdd={() => {
          setEditingCard(null);
          setModal("card");
        }}
        onEdit={(card) => {
          setEditingCard(card);
          setModal("card");
        }}
        onDelete={deleteCard}
        onManageStage={(stage) => {
          setEditingStage(stage);
          setModal("stage");
        }}
        onAddStage={() => {
          setEditingStage(null);
          setModal("stage");
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <strong>
              Placement<span>CRM</span>
            </strong>
            <small>RELATIONSHIP OS</small>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n}
              className={active === n ? "active" : ""}
              onClick={() => {
                setActive(n);
                setQuery("");
              }}
            >
              {n === "Overview" ? (
                <LayoutDashboard size={18} />
              ) : n === "Placement Managers" ? (
                <Users size={18} />
              ) : n === "Organizations" ? (
                <Building2 size={18} />
              ) : n === "Contacts" ? (
                <Users size={18} />
              ) : n === "Meeting Reports" ? (
                <FileText size={18} />
              ) : n === "Kanban" ? (
                <KanbanSquare size={18} />
              ) : (
                <Settings size={18} />
              )}
              <span>{n}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="logout" onClick={onLogout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">
              {admin ? "ADMIN CONSOLE" : "PLACEMENT MANAGER"}
            </p>
            <h1>{active}</h1>
          </div>
          <div className="top-user">
            <div className="avatar">
              {admin
                ? "AD"
                : (profile?.full_name || "PM")
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)}
            </div>
            <div>
              <b>
                {admin
                  ? profile?.full_name || "Admin User"
                  : profile?.full_name || "Placement Manager"}
              </b>
              <small>{admin ? "Administrator" : "Placement Manager"}</small>
            </div>
            <button className="icon-btn">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>
        <section className="content">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {content}
        </section>
      </main>
      {modal === "org" && (
        <Modal title="Add organization" onClose={() => setModal(null)}>
          <form onSubmit={addOrg}>
            <Field
              label="Organization name"
              name="name"
              placeholder="e.g. Acme Corp"
            />
            <div className="form-grid">
              <Field
                label="Industry"
                name="industry"
                placeholder="Technology"
              />
              <Field label="City" name="city" placeholder="Bengaluru" />
            </div>
            <div className="form-grid">
              <Field label="Website" name="website" placeholder="acme.com" />
              <Select label="Status" name="status">
                <option value="">Choose status</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <label className="field">
              <span>Notes</span>
              <textarea
                required
                name="notes"
                placeholder="Relationship context..."
              />
            </label>
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "contact" && (
        <Modal title="Add contact" onClose={() => setModal(null)}>
          <form onSubmit={addContact}>
            <div className="form-grid">
              <Field label="Full name" name="name" placeholder="Person name" />
              <Field
                label="Designation"
                name="designation"
                placeholder="HR Manager"
              />
            </div>
            <Select label="Organization" name="organization_id">
              <option value="">Choose organization</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <div className="form-grid">
              <Field label="Email" type="email" name="email" />
              <Field label="Phone" name="phone" />
            </div>
            <Field
              label="LinkedIn URL"
              type="url"
              name="linkedin_url"
              placeholder="https://linkedin.com/in/name"
            />
            <label className="field">
              <span>Notes</span>
              <textarea
                required
                name="notes"
                placeholder="Contact context..."
              />
            </label>
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "report" && (
        <Modal
          title={editingReport ? "Edit meeting report" : "New meeting report"}
          onClose={() => {
            setModal(null);
            setEditingReport(null);
          }}
        >
          <form key={editingReport?.id || "new-report"} onSubmit={addReport}>
            <div className="form-grid">
              <Field label="Title" name="title" defaultValue={editingReport?.title || ""} placeholder="Meeting title" />
              <Field label="Meeting date" type="date" name="meeting_date" defaultValue={editingReport?.meeting_date || ""} />
            </div>
            <Select label="Organization" name="organization_id" defaultValue={editingReport?.organization_id || ""}>
              <option value="">Choose organization</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <Select label="Contact" name="contact_id" defaultValue={editingReport?.contact_id || ""}>
              <option value="">Choose contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Field
              label="Attendees"
              name="attendees"
              defaultValue={editingReport?.attendees || ""}
              placeholder="Names separated by commas"
            />
            <div className="form-grid">
              <Select label="Outcome" name="outcome" defaultValue={editingReport?.outcome || "neutral"}>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
                <option value="follow_up_required">Follow-up required</option>
              </Select>
              <Select label="Meeting type" name="meeting_type" defaultValue={editingReport?.meeting_type || "video_call"}>
                <option value="in_person">In person</option>
                <option value="video_call">Video call</option>
                <option value="phone_call">Phone call</option>
              </Select>
            </div>
            <Field label="Next follow-up date" type="date" name="follow_up_date" defaultValue={editingReport?.follow_up_date || ""} />
            <label className="field">
              <span>Summary</span>
              <textarea
                required
                name="summary"
                defaultValue={editingReport?.summary || ""}
                placeholder="What was discussed?"
              />
            </label>
            <label className="field">
              <span>Action items (one per line)</span>
              <textarea
                required
                name="action_items"
                defaultValue={editingReport?.action_items || ""}
                placeholder="Next steps..."
              />
            </label>
            <FormActions onClose={() => { setModal(null); setEditingReport(null); }} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "card" && (
        <Modal
          title={editingCard ? "Edit pipeline card" : "Add pipeline card"}
          onClose={() => {
            setModal(null);
            setEditingCard(null);
          }}
        >
          <form onSubmit={addCard}>
            <Field
              label="Card title"
              name="title"
              placeholder="Opportunity name"
              defaultValue={editingCard?.title || ""}
            />
            <div className="form-grid">
              <Select
                label="Stage"
                name="stage_id"
                defaultValue={editingCard?.stage_id || stages[0]?.id || ""}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Priority"
                name="priority"
                defaultValue={editingCard?.priority || ""}
              >
                <option value="">Choose priority</option>
                <option>medium</option>
                <option>high</option>
                <option>low</option>
              </Select>
            </div>
            <Select
              label="Organization"
              name="organization_id"
              defaultValue={editingCard?.organization_id || ""}
            >
              <option value="">Choose organization</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <Field
              label="Due date"
              type="date"
              name="due_date"
              defaultValue={editingCard?.due_date || ""}
            />
            <label className="field">
              <span>Description</span>
              <textarea
                required
                name="description"
                defaultValue={editingCard?.description || ""}
              />
            </label>
            <FormActions
              onClose={() => {
                setModal(null);
                setEditingCard(null);
              }}
              busy={busy}
            />
          </form>
        </Modal>
      )}
      {modal === "stage" && (
        <Modal
          title={editingStage ? "Edit pipeline stage" : "Add pipeline stage"}
          onClose={() => {
            setModal(null);
            setEditingStage(null);
          }}
        >
          <form onSubmit={saveStage}>
            <Field
              label="Stage name"
              name="name"
              placeholder="For example: Negotiation"
              defaultValue={editingStage?.name || ""}
            />
            <div className="form-grid">
              <Field
                label="Color"
                type="color"
                name="color"
                defaultValue={editingStage?.color || "#4659d9"}
              />
              <Field
                label="WIP limit (optional)"
                type="number"
                name="wip_limit"
                required={false}
                min="1"
                placeholder="Unlimited"
                defaultValue={editingStage?.wip_limit || ""}
              />
            </div>
            <p className="muted">
              WIP limits prevent too many open opportunities from piling up in a stage.
            </p>
            <FormActions
              onClose={() => {
                setModal(null);
                setEditingStage(null);
              }}
              onDelete={
                editingStage
                  ? async () => {
                      const deleted = await deleteStage(editingStage);
                      if (deleted) {
                        setModal(null);
                        setEditingStage(null);
                      }
                    }
                  : undefined
              }
              busy={busy}
            />
          </form>
        </Modal>
      )}
      {modal === "manager" && (
        <Modal title="Add placement manager" onClose={() => setModal(null)}>
          <form onSubmit={addManager}>
            <Field
              label="Full name"
              name="full_name"
              placeholder="Manager name"
            />
            <Field
              label="Email"
              type="email"
              name="email"
              placeholder="manager@example.com"
            />
            <Field
              label="Password"
              type="password"
              name="password"
              minLength="8"
              placeholder="Minimum 8 characters"
            />
            <p className="muted">
              The account is created directly. No email is sent.
            </p>
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Overview({ admin, orgs, contacts, reports, cards, stages, managers }) {
  const closedStageIds = stages
    .filter((stage) => /closed|done|completed/i.test(stage.name || ""))
    .map((stage) => String(stage.id));
  const stats = admin
    ? [
        ["Total PMs", managers.length, "Roster accounts"],
        [
          "Active PMs",
          managers.filter((m) => m.status === "active").length,
          "Currently active",
        ],
        [
          "Inactive PMs",
          managers.filter((m) => m.status === "inactive").length,
          "Access disabled",
        ],
        [
          "Added this month",
          managers.filter(
            (m) => new Date(m.created_at).getMonth() === new Date().getMonth(),
          ).length,
          "New accounts",
        ],
      ]
    : [
        ["Organizations", orgs.length, "Your relationships"],
        ["Contacts", contacts.length, "Across organizations"],
        ["Meeting reports", reports.length, "Relationship history"],
        [
          "Open opportunities",
          cards.filter((c) => !closedStageIds.includes(String(c.stage_id))).length,
          "In your pipeline",
        ],
      ];
  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">{admin ? "ROSTER HEALTH" : "YOUR PIPELINE"}</p>
          <h2>
            {admin ? "A clear view of your team." : "Your placement workspace."}
          </h2>
          <p className="muted">
            {admin
              ? "Manage placement managers and keep the team moving."
              : "Here’s what is happening across your placement relationships."}
          </p>
        </div>
      </div>
      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s[0]}>
            <span>{s[0]}</span>
            <strong>{s[1]}</strong>
            <small>{s[2]}</small>
          </div>
        ))}
      </div>
      <div className="panel overview-panel">
          <div className="panel-head">
            <div>
              <h3>{admin ? "Placement managers" : "Pipeline snapshot"}</h3>
              <p className="muted">
                {admin
                  ? "Roster status at a glance."
                  : "Your opportunities by stage."}
              </p>
            </div>
          </div>
          {admin ? (
            <Activity managers={managers} />
          ) : (
            <Pipeline cards={cards} stages={stages} />
          )}
      </div>
    </>
  );
}
function Activity({ managers }) {
  return (
    <div className="activity">
      {managers.slice(0, 5).map((m) => (
        <div className="activity-row" key={m.id}>
          <div className="avatar mini">
            {(m.full_name || m.name || "PM")
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <b>{m.full_name || m.name}</b>
            <small>
              {m.status} · {m.email}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}
function Pipeline({ cards, stages = defaultStages }) {
  return (
    <div className="pipeline">
      {stages.slice(0, 6).map((s) => {
        const n = cards.filter((c) => String(c.stage_id) === String(s.id)).length;
        return (
          <div key={s.id} className="pipeline-row">
            <span className="stage-dot" style={{ background: s.color }} />
            <span>{s.name}</span>
            <b>{n}</b>
            <div className="bar">
              <i
                style={{
                  width: `${Math.max(n * 25, 8)}%`,
                  background: s.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Toolbar({ query, setQuery, button, onAdd }) {
  return (
    <div className="toolbar">
      <div className="search">
        <Search size={17} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
        />
      </div>
      {button && (
        <button className="btn primary" onClick={onAdd}>
          <Plus size={17} /> {button}
        </button>
      )}
    </div>
  );
}
function Organizations({ orgs, query, setQuery, onAdd, onDelete }) {
  const [status, setStatus] = useState("");
  const rows = orgs.filter(
    (o) =>
      (o.name || "").toLowerCase().includes(query.toLowerCase()) &&
      (!status || o.status === status),
  );
  return (
    <>
      <Toolbar
        query={query}
        setQuery={setQuery}
        button="Add organization"
        onAdd={onAdd}
      />
      <div className="panel table-panel">
        <div className="table-head">
          <h3>
            Organizations <span className="count">{rows.length}</span>
          </h3>
          <select
            className="filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Industry</th>
              <th>Location</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <b>{o.name}</b>
                  <small>{o.website}</small>
                </td>
                <td>{o.industry}</td>
                <td>{o.city}</td>
                <td>
                  <span className={`badge ${o.status}`}>{o.status}</span>
                </td>
                <td>
                  {o.updated_at
                    ? new Date(o.updated_at).toLocaleDateString()
                    : "Today"}
                </td>
                <td>
                  <button className="icon-btn" onClick={() => onDelete(o.id)}>
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Contacts({ contacts, orgName, query, setQuery, onAdd }) {
  return (
    <>
      <Toolbar
        query={query}
        setQuery={setQuery}
        button="Add contact"
        onAdd={onAdd}
      />
      <div className="panel table-panel">
        <div className="table-head">
          <h3>
            Contacts <span className="count">{contacts.length}</span>
          </h3>
          <button className="filter">All organizations ▾</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Contact</th>
              <th>Organization</th>
              <th>Designation</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {contacts
              .filter((c) =>
                (c.name || "").toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td>{orgName(c.organization_id)}</td>
                  <td>{c.designation}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Reports({ reports, orgName, organizations, onAdd, onEdit, onDelete, onToggleAction }) {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("newest");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const filtered = reports
    .filter((r) => {
      const haystack = `${r.title || ""} ${r.summary || ""} ${r.attendees || ""} ${orgName(r.organization_id)}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
      if (organizationFilter && String(r.organization_id) !== String(organizationFilter)) return false;
      if (range === "overdue") return r.follow_up_date && new Date(r.follow_up_date) < start;
      if (range === "this_month") return new Date(r.meeting_date).getMonth() === today.getMonth() && new Date(r.meeting_date).getFullYear() === today.getFullYear();
      if (range === "this_week") return new Date(r.meeting_date) >= new Date(start.getTime() - 6 * 86400000);
      return true;
    })
    .sort((a, b) => sort === "oldest" ? new Date(a.meeting_date) - new Date(b.meeting_date) : new Date(b.meeting_date) - new Date(a.meeting_date));
  const overdue = reports.filter((r) => r.follow_up_date && new Date(r.follow_up_date) < start).length;
  const pending = reports.reduce((sum, r) => sum + (r.action_items_list || []).filter((a) => !a.is_completed).length, 0);
  return <>
    <div className="report-stats">
      <div className="stat"><span>Total reports</span><strong>{reports.length}</strong><small>All relationship history</small></div>
      <div className="stat"><span>This month</span><strong>{reports.filter((r) => new Date(r.meeting_date).getMonth() === today.getMonth()).length}</strong><small>Conversations logged</small></div>
      <div className="stat"><span>Pending actions</span><strong>{pending}</strong><small>Items to complete</small></div>
      <div className="stat"><span>Overdue follow-ups</span><strong className={overdue ? "danger-number" : ""}>{overdue}</strong><small>Need attention</small></div>
    </div>
    <div className="toolbar report-toolbar"><div className="search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports..."/></div><select className="filter" value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}><option value="">All organizations</option>{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><select className="filter" value={range} onChange={(e) => setRange(e.target.value)}><option value="all">All dates</option><option value="this_week">This week</option><option value="this_month">This month</option><option value="overdue">Overdue follow-ups</option></select><select className="filter" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select><button className="btn primary" onClick={onAdd}><Plus size={17}/> New report</button></div>
    <div className="reports">{filtered.map((r) => { const isOpen = expanded === r.id; const actionItems = r.action_items_list || []; const isOverdue = r.follow_up_date && new Date(r.follow_up_date) < start; return <article className={`report panel ${isOverdue ? "report-overdue" : ""}`} key={r.id}><div className="report-date"><b>{new Date(r.meeting_date).getDate()}</b><span>{new Date(r.meeting_date).toLocaleString("en", {month:"short"}).toUpperCase()}</span></div><div className="report-body"><div className="report-top"><div><h3>{r.title}</h3><p className="muted">{orgName(r.organization_id)} · {r.attendees}</p><div className="report-badges"><span className={`report-badge ${r.outcome || "neutral"}`}>{(r.outcome || "neutral").replaceAll("_", " ")}</span><span className="report-badge">{(r.meeting_type || "video_call").replaceAll("_", " ")}</span>{r.follow_up_date && <span className={`report-badge ${isOverdue ? "overdue" : ""}`}>Follow-up: {r.follow_up_date}</span>}</div></div><div className="report-actions"><button className="text-btn" onClick={() => setExpanded(isOpen ? null : r.id)}>{isOpen ? "Collapse" : "Details"}</button><button className="text-btn" onClick={() => onEdit(r)}>Edit</button><button className="delete-btn" onClick={() => onDelete(r.id)}>Delete</button></div></div><p>{r.summary}</p>{isOpen && <div className="report-details"><div><b>Attendees</b><p>{r.attendees}</p></div><div><b>Action items</b>{actionItems.length ? actionItems.map((a) => <label className={`action-check ${a.is_completed ? "completed" : ""}`} key={a.id}><input type="checkbox" checked={a.is_completed} onChange={(e) => onToggleAction(r.id, a.id, e.target.checked)}/><span>{a.text}</span></label>) : <p>{r.action_items || "No action items."}</p>}</div></div>}<div className="action"><b>{actionItems.length ? `${actionItems.filter((a) => !a.is_completed).length} pending action${actionItems.filter((a) => !a.is_completed).length === 1 ? "" : "s"}` : "Next action"}</b><span>{r.action_items || "Open details to review action items."}</span></div></div></article>})}</div>{!filtered.length && <div className="empty-state panel"><h3>No meeting reports found</h3><p className="muted">Try changing your filters or create a new report.</p></div>}
  </>;
}
function Kanban({
  cards,
  moveCard,
  orgName,
  onAdd,
  onEdit,
  onDelete,
  stages,
  organizations,
  onManageStage,
  onAddStage,
}) {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [organization, setOrganization] = useState("");
  const [due, setDue] = useState("all");
  const [sort, setSort] = useState("position");
  const today = new Date().toISOString().slice(0, 10);
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const visibleCards = cards
    .filter((card) => {
      const text = `${card.title || ""} ${card.description || ""} ${orgName(card.organization_id)}`.toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
      if (priority && card.priority !== priority) return false;
      if (organization && String(card.organization_id) !== organization) return false;
      if (due === "overdue" && (!card.due_date || card.due_date >= today)) return false;
      if (due === "today" && card.due_date !== today) return false;
      if (due === "upcoming" && (!card.due_date || card.due_date <= today)) return false;
      if (due === "no_date" && card.due_date) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "priority") return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      if (sort === "due") return (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31");
      if (sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return (a.position || 0) - (b.position || 0);
    });
  const handleDrop = (e, stageId) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("id");
    if (id) moveCard(id, stageId);
  };
  return (
    <>
      <div className="kanban-toolbar">
        <div className="search">
          <Search size={17} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cards..." />
        </div>
        <select className="filter" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>
        <select className="filter" value={organization} onChange={(e) => setOrganization(e.target.value)}>
          <option value="">All organizations</option>
          {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="filter" value={due} onChange={(e) => setDue(e.target.value)}>
          <option value="all">All due dates</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Upcoming</option>
          <option value="no_date">No due date</option>
        </select>
        <select className="filter" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="position">Board order</option>
          <option value="priority">Priority</option>
          <option value="due">Due date</option>
          <option value="newest">Newest</option>
        </select>
        <button className="btn secondary" onClick={onAddStage}><SlidersHorizontal size={15} /> Add stage</button>
        <button className="btn primary" onClick={onAdd}><Plus size={17} /> Add card</button>
      </div>
      <p className="muted kanban-hint">Drag opportunities through your placement pipeline. {visibleCards.length} of {cards.length} cards shown.</p>
      <div className="kanban">
        {stages.map((stage) => {
          const stageCards = cards.filter((card) => String(card.stage_id) === String(stage.id));
          const shownCards = visibleCards.filter((card) => String(card.stage_id) === String(stage.id));
          const overLimit = stage.wip_limit && stageCards.length > stage.wip_limit;
          return (
            <div
              className={`kanban-col ${overLimit ? "wip-over" : ""}`}
              key={stage.id}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="col-head">
                <span className="stage-dot" style={{ background: stage.color }} />
                <b>{stage.name}</b>
                <span className={`count ${overLimit ? "wip-count" : ""}`}>{stageCards.length}{stage.wip_limit ? `/${stage.wip_limit}` : ""}</span>
                <button className="icon-btn" title={`Edit ${stage.name}`} onClick={() => onManageStage(stage)}><SlidersHorizontal size={15} /></button>
              </div>
              {overLimit && <div className="wip-warning">WIP limit exceeded</div>}
              <div className={`cards ${shownCards.length ? "" : "is-empty"}`}>
                {shownCards.map((card) => {
                  const overdue = card.due_date && card.due_date < today;
                  return (
                    <div
                      className={`k-card ${overdue ? "overdue-card" : ""}`}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(card.id)); e.dataTransfer.setData("id", String(card.id)); }}
                      onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
                      onDrag={(e) => e.currentTarget.classList.add("dragging")}
                      key={card.id}
                    >
                      <div className="k-title"><GripVertical size={15} /><b>{card.title}</b></div>
                      <p>{orgName(card.organization_id)}</p>
                      {card.description && <p className="k-description">{card.description}</p>}
                      <div className="k-foot"><span className={`priority ${card.priority}`}>{card.priority}</span><small className={overdue ? "due-overdue" : ""}>{card.due_date || "No due date"}</small></div>
                      <div className="k-card-actions">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(card); }}><Pencil size={13} /> Edit</button>
                        <button className="danger-action" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}><Trash2 size={13} /> Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="add-inline" onClick={onAdd}><Plus size={15} /> Add card</button>
              <div className="drop-zone" />
            </div>
          );
        })}
      </div>
    </>
  );
}
function Managers({ managers, onAdd, onDeactivate, onDelete }) {
  const [status, setStatus] = useState("");
  const rows = managers.filter((m) => !status || m.status === status);
  return (
    <>
      <div className="toolbar">
        <p className="muted">Manage private placement manager accounts.</p>
        <button className="btn primary" onClick={onAdd}>
          <Plus size={17} /> Add placement manager
        </button>
      </div>
      <div className="panel table-panel">
        <div className="table-head">
          <h3>
            Placement managers <span className="count">{rows.length}</span>
          </h3>
          <select
            className="filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Manager</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="person">
                    <div className="avatar mini">
                      {(m.full_name || m.name || "PM")
                        .split(" ")
                        .map((x) => x[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <b>{m.full_name || m.name}</b>
                      <small>{m.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${m.status}`}>{m.status}</span>
                </td>
                <td>
                  {m.created_at
                    ? new Date(m.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="actions">
                  {m.status === "active" && (
                    <button
                      className="text-btn"
                      onClick={() => onDeactivate(m.id)}
                    >
                      Deactivate
                    </button>
                  )}
                  <button className="delete-btn" onClick={() => onDelete(m.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function SettingsPage() {
  return (
    <div className="panel settings">
      <h3>Workspace settings</h3>
      <div className="setting-row">
        <div>
          <b>Realtime sync</b>
          <small>Kanban changes are synchronized across open sessions.</small>
        </div>
        <span className="badge active">Enabled</span>
      </div>
    </div>
  );
}
const root =
  globalThis.__placementCrmRoot || createRoot(document.getElementById("root"));
globalThis.__placementCrmRoot = root;
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
