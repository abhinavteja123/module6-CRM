import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  apiFetch,
  clearAuthTokens,
  getAccessToken,
  isApiConfigured,
  setAuthTokens,
} from "./lib/api";
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
  Bell,
  CheckCheck,
  ChevronRight,
  Clock3,
  Download,
  RefreshCw,
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
const commonPlacementCities = [
  "Ahmedabad", "Amritsar", "Aurangabad", "Bengaluru", "Bhopal", "Bhubaneswar", "Chandigarh", "Chennai", "Coimbatore", "Dehradun",
  "Delhi", "Faridabad", "Gandhinagar", "Ghaziabad", "Goa", "Gurugram", "Guwahati", "Hyderabad", "Indore", "Jaipur",
  "Jammu", "Jamshedpur", "Kanpur", "Kochi", "Kolkata", "Kota", "Lucknow", "Ludhiana", "Madurai", "Mangaluru",
  "Meerut", "Mohali", "Mumbai", "Mysuru", "Nagpur", "Nashik", "Navi Mumbai", "Noida", "Patna", "Pune",
  "Raipur", "Rajkot", "Ranchi", "Salem", "Surat", "Thane", "Thiruvananthapuram", "Udaipur", "Vadodara", "Visakhapatnam",
];
const placementPipelineStatuses = [
  ["prospect", "Prospect"],
  ["outreach", "Outreach"],
  ["in_talks", "In talks"],
  ["discussion", "Discussion"],
  ["proposal_shared", "Proposal shared"],
  ["negotiation", "Negotiation"],
  ["drive_scheduled", "Drive scheduled"],
  ["drive_completed", "Drive completed"],
  ["offer_stage", "Offer stage"],
  ["placed", "Placed"],
  ["joined", "Joined"],
  ["on_hold", "On hold"],
  ["cancelled", "Cancelled"],
];
const placementOutlooks = [["positive", "Positive"], ["neutral", "Neutral"], ["negative", "Negative"]];
const placementDriveStatuses = [["not_scheduled", "Not scheduled"], ["tentative", "Tentative"], ["scheduled", "Scheduled"], ["completed", "Completed"], ["cancelled", "Cancelled"]];
const workspaceCopy = {
  company: {
    toggle: "Companies",
    organization: "Organization",
    organizations: "Organizations",
    person: "Contact",
    people: "Contacts",
    role: "Designation",
    focus: "Industry",
    focusPlaceholder: "Technology",
    organizationPlaceholder: "e.g. Acme Corp",
  },
};
const seedOrgs = [
  {
    id: 1,
    name: "Northstar Technologies",
    industry: "Technology",
    city: "Bengaluru",
    status: "active",
    website: "northstar.io",
    relationship_type: "company",
    expected_ctc: "12 LPA",
  },
  {
    id: 2,
    name: "Meridian Health Group",
    industry: "Healthcare",
    city: "Hyderabad",
    status: "prospect",
    website: "meridian.health",
    relationship_type: "company",
    expected_ctc: "8 LPA",
  },
  {
    id: 3,
    name: "Vertex Consulting",
    industry: "Consulting",
    city: "Pune",
    status: "active",
    website: "vertex.co",
    relationship_type: "company",
    expected_ctc: "10 LPA",
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
    relationship_type: "company",
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

function useDialogBehavior(dialogRef, onClose) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const focusable = () => [...dialog.querySelectorAll("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((element) => !element.disabled);
    focusable()[0]?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);
  useDialogBehavior(dialogRef, onClose);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <h3 id="modal-title">{title}</h3>
          <button type="button" className="icon-btn" aria-label={`Close ${title}`} onClick={onClose}>
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

function Login({ onLogin, onReset, error, loading }) {
  return (
    <div className="login">
      <div className="login-card">
        <div className="brand centered">
          <div className="brand-mark">P</div>
          <div>
            <strong>
              Vextra<span>AI</span>
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
          <button type="button" className="text-btn full" onClick={() => onReset(document.querySelector('input[name="email"]')?.value || "")}>
            Request password change
          </button>
        </form>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return <div className="workspace-skeleton"><div className="skeleton-line skeleton-eyebrow" /><div className="skeleton-line skeleton-title" /><div className="skeleton-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton-card" key={item}><div className="skeleton-line" /><div className="skeleton-block" /></div>)}</div><div className="skeleton-table"><div className="skeleton-line" />{[1, 2, 3, 4, 5].map((item) => <div className="skeleton-row" key={item}><span /><span /><span /><span /></div>)}</div></div>;
}

function App() {
  const [role, setRole] = useState(null),
    [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const loadProfile = async () => {
    try {
      const data = await apiFetch("/api/me");
      if (!data) throw new Error("Profile not found");
      setProfile(data);
      setUser(data);
      setRole(data.role);
    } catch (e) {
      clearAuthTokens();
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (getAccessToken()) loadProfile();
    else setLoading(false);
  }, []);
  const login = async (value) => {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(value),
      });
      setAuthTokens(data);
      setUser(data.user);
      setProfile(data.profile);
      setRole(data.profile.role);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const requestPasswordReset = async (email) => {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    try {
      const data = await apiFetch("/api/auth/password-reset-request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setError(data.message);
    } catch (e) {
      setError(e.message);
    }
  };
  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // A local logout still clears the client session if the server is unavailable.
    }
    clearAuthTokens();
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
  if (!role) return <Login onLogin={login} onReset={requestPasswordReset} loading={loading} error={error} />;
  return (
    <Workspace role={role} user={user} profile={profile} onLogout={logout} />
  );
}

function Workspace({ role, user, profile, onLogout }) {
  const superAdmin = role === "super_admin";
  const universityAdmin = role === "university_admin";
  const supervisor = role === "coordinator";
  const placementManager = role === "placement_manager";
  const dataAnalyst = role === "data_analyst";
  const [active, setActive] = useState("Overview"),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState(profile?.must_change_password ? "password" : null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [duplicateOrg, setDuplicateOrg] = useState(null),
    [searchOpen, setSearchOpen] = useState(false),
    [searchQuery, setSearchQuery] = useState(""),
    [searchResults, setSearchResults] = useState([]),
    [searchLoading, setSearchLoading] = useState(false),
    [notifications, setNotifications] = useState([]),
    [notificationsLoaded, setNotificationsLoaded] = useState(false),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [lastUpdated, setLastUpdated] = useState(null),
    [selectedAccount, setSelectedAccount] = useState(null);
  const [orgs, setOrgs] = useState([]),
    [contacts, setContacts] = useState([]),
    [reports, setReports] = useState([]),
    [cards, setCards] = useState([]),
    [stages, setStages] = useState([]),
    [managers, setManagers] = useState([]),
    [universities, setUniversities] = useState([]),
    [teamSummary, setTeamSummary] = useState(null),
    [editingReport, setEditingReport] = useState(null),
    [editingOrg, setEditingOrg] = useState(null),
    [editingContact, setEditingContact] = useState(null),
    [editingCard, setEditingCard] = useState(null),
    [editingStage, setEditingStage] = useState(null),
    [editingUser, setEditingUser] = useState(null),
    [editingUniversity, setEditingUniversity] = useState(null),
    [placementData, setPlacementData] = useState({ seasons: [], categories: [], cities: [], assignments: [], targets: [], metrics: [], analytics: null, duplicates: [], settings: { coordinator_target_entry_enabled: false } }),
    [loaded, setLoaded] = useState(false);
  const mode = "company";
  const copy = workspaceCopy.company;
  const organizationNav = "Organizations";
  const peopleNav = "Contacts";
  const visibleOrgs = orgs;
  const visibleContacts = contacts;
  const visibleReports = reports;
  const visibleCards = cards;
  const loadPlacementData = async () => {
    const [analytics, metrics, seasons, categories, cities, assignments, targets, duplicates, access, settings] = await Promise.all([
      apiFetch("/api/placement/analytics"),
      apiFetch("/api/placement/metrics"),
      apiFetch("/api/placement/seasons"),
      apiFetch("/api/placement/categories"),
      apiFetch("/api/placement/cities"),
      apiFetch("/api/placement/assignments"),
      apiFetch("/api/placement/targets"),
      universityAdmin ? apiFetch("/api/placement/duplicate-requests") : Promise.resolve([]),
      universityAdmin ? apiFetch("/api/placement/access") : Promise.resolve([]),
      apiFetch("/api/placement/settings"),
    ]);
    setPlacementData((prev) => ({
      ...prev,
      analytics: analytics || null,
      metrics: metrics || [],
      seasons: seasons || [],
      categories: categories || [],
      cities: cities || [],
      assignments: assignments || [],
      targets: targets || [],
      duplicates: duplicates || [],
      access: access || [],
      settings: settings || { coordinator_target_entry_enabled: false },
    }));
  };
  const nav = superAdmin
    ? ["Overview", "Universities", "Users"]
      : universityAdmin
      ? ["Overview", "Team", "Direct Team", "Placement Setup", "Analytics", "Approvals", organizationNav, peopleNav, "Meeting Reports"]
      : supervisor
        ? ["Overview", "Team", "Placement Progress", "Placement Updates"]
        : dataAnalyst
          ? ["Analytics"]
          : ["Overview", "Placement Progress", organizationNav, peopleNav, "Meeting Reports", "Kanban", "Placement Metrics"];
  const refresh = async () => {
    if (!user) return;
    try {
      const requests = [apiFetch("/api/organizations"), apiFetch("/api/contacts"), apiFetch("/api/meeting-reports")];
      if (placementManager) requests.push(apiFetch("/api/kanban"));
      const [o, c, r, k] = await Promise.all(requests);
      setOrgs(o || []);
      setContacts(c || []);
      setReports(r || []);
      if (k) {
        setStages(k.stages || []);
        setCards(k.cards || []);
      }
      await loadPlacementData();
      setLastUpdated(new Date());
      setLoaded(true);
    } catch (e) {
      setError(e.message);
      setLoaded(true);
    }
  };
  const refreshManagers = async () => {
    try {
      if (superAdmin) {
        const [u, people] = await Promise.all([apiFetch("/api/admin/universities"), apiFetch("/api/admin/users")]);
        setUniversities(u || []);
        setManagers(people || []);
      } else if (supervisor || universityAdmin) {
        const teamRequests = [apiFetch("/api/team/users"), apiFetch("/api/team/overview")];
        if (universityAdmin || supervisor) {
          teamRequests.push(apiFetch("/api/organizations"));
          if (universityAdmin) {
            teamRequests.push(
              apiFetch("/api/contacts"),
              apiFetch("/api/meeting-reports"),
            );
          }
        }
        const [people, summary, universityOrgs, universityContacts, universityReports] = await Promise.all(teamRequests);
        setManagers(people || []);
        setTeamSummary(summary);
        if (universityAdmin || supervisor) {
          setOrgs(universityOrgs || []);
        }
        if (universityAdmin) {
          setContacts(universityContacts || []);
          setReports(universityReports || []);
        }
      }
      if (universityAdmin || supervisor || dataAnalyst) await loadPlacementData();
      setLastUpdated(new Date());
      setLoaded(true);
    } catch (e) {
      setError(e.message);
      setLoaded(true);
    }
  };
  useEffect(() => {
    if (superAdmin || supervisor || universityAdmin || dataAnalyst) refreshManagers();
    else if (placementManager) refresh();
  }, [role, user?.id]);
  const refreshNotifications = async () => {
    try {
      setNotifications(await apiFetch("/api/notifications?limit=8"));
      setNotificationsLoaded(true);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [user?.id]);
  useEffect(() => {
    if (notificationsOpen && !notificationsLoaded) refreshNotifications();
  }, [notificationsOpen, notificationsLoaded]);
  useEffect(() => {
    if (!searchOpen) return undefined;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await apiFetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`, { signal: controller.signal });
        setSearchResults(data.results || []);
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, searchOpen]);
  const showSuccess = (message) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3500);
  };
  const markNotificationRead = async (notification) => {
    try {
      if (!notification.is_read) await apiFetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
    } catch (e) {
      setError(e.message);
    }
  };
  const markAllNotificationsRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      showSuccess("Notifications marked as read.");
    } catch (e) {
      setError(e.message);
    }
  };
  const orgName = (id) =>
    orgs.find((o) => String(o.id) === String(id))?.name || "Unlinked";
  const save = async (table, payload, setter, prepend = false) => {
    setBusy(true);
    try {
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
      setModal(null);
      showSuccess("Saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const addOrg = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get("name"),
      expected_ctc: f.get("expected_ctc"),
      industry: f.get("industry"),
      city: f.get("city"),
      website: f.get("website"),
      status: f.get("status"),
      notes: f.get("notes"),
    };
    if (editingOrg) {
      setBusy(true);
      apiFetch(`/api/organizations/${editingOrg.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        .then((data) => {
          setOrgs((prev) => prev.map((item) => item.id === data.id ? data : item));
          setEditingOrg(null);
          setModal(null);
          showSuccess("Organization updated.");
        })
        .catch((err) => setError(err.message))
        .finally(() => setBusy(false));
      return;
    }
    setBusy(true);
    apiFetch("/api/organizations", { method: "POST", body: JSON.stringify(payload) })
      .then((data) => {
        setOrgs((prev) => [...prev, data]);
        setDuplicateOrg(null);
        setModal(null);
        showSuccess("Organization added.");
      })
      .catch((err) => {
        if (err.status === 409 && err.payload?.code === "duplicate_organization") {
          setDuplicateOrg(payload);
          setError("");
        } else setError(err.message);
      })
      .finally(() => setBusy(false));
  };
  const confirmDuplicateOrg = async () => {
    if (!duplicateOrg) return;
    setBusy(true);
    try {
      const data = await apiFetch("/api/organizations", {
        method: "POST",
        body: JSON.stringify({ ...duplicateOrg, allow_duplicate: true }),
      });
      setOrgs((prev) => [...prev, data]);
      setDuplicateOrg(null);
      setModal(null);
      showSuccess("Organization added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const addContact = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
        name: f.get("name"),
        designation: f.get("designation"),
        organization_id: f.get("organization_id"),
        email: f.get("email"),
        phone: f.get("phone"),
        linkedin_url: f.get("linkedin_url"),
        notes: f.get("notes"),
    };
    if (editingContact) {
      setBusy(true);
      apiFetch(`/api/contacts/${editingContact.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        .then((data) => {
          setContacts((prev) => prev.map((item) => item.id === data.id ? data : item));
          setEditingContact(null);
          setModal(null);
          showSuccess("Contact updated.");
        })
        .catch((err) => setError(err.message))
        .finally(() => setBusy(false));
      return;
    }
    save("contacts", payload, setContacts);
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
      const data = await apiFetch(`/api/meeting-reports/${editingReport.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setReports((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setModal(null);
      setEditingReport(null);
      showSuccess("Meeting report updated.");
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
      const data = await apiFetch(`/api/kanban/cards/${editingCard.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
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
      await apiFetch(`/api/organizations/${id}`, { method: "DELETE" });
      setOrgs((prev) => prev.filter((x) => x.id !== id));
      setContacts((prev) => prev.filter((contact) => String(contact.organization_id) !== String(id)));
      setReports((prev) => prev.filter((report) => String(report.organization_id) !== String(id)));
      setCards((prev) => prev.map((card) => (
        String(card.organization_id) === String(id)
          ? { ...card, organization_id: null }
          : card
      )));
      showSuccess("Organization deleted.");
    } catch (e) {
      setError(e.message);
    }
  };
  const deleteReport = async (id) => {
    if (!window.confirm("Delete this meeting report and its action items?"))
      return;
    try {
      await apiFetch(`/api/meeting-reports/${id}`, { method: "DELETE" });
      setReports((prev) => prev.filter((x) => x.id !== id));
      showSuccess("Meeting report deleted.");
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
      const data = await apiFetch(`/api/kanban/cards/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage_id }),
      });
      setCards((prev) => prev.map((card) => (card.id === data.id ? data : card)));
      showSuccess("Pipeline card updated.");
    } catch (e) {
      setError(e.message);
      refresh();
    }
  };
  const deleteCard = async (id) => {
    if (!window.confirm("Delete this pipeline card permanently?")) return;
    try {
      await apiFetch(`/api/kanban/cards/${id}`, { method: "DELETE" });
      setCards((prev) => prev.filter((card) => card.id !== id));
      showSuccess("Pipeline card deleted.");
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
      const data = await apiFetch(
        editingStage ? `/api/kanban/stages/${editingStage.id}` : "/api/kanban/stages",
        { method: editingStage ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setStages((prev) =>
        editingStage
          ? prev.map((stage) => (stage.id === data.id ? data : stage))
          : [...prev, data],
      );
      setModal(null);
      setEditingStage(null);
      showSuccess(editingStage ? "Stage updated." : "Stage added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteStage = async (stage) => {
    if (!window.confirm(`Delete the ${stage.name} stage? It must be empty.`)) return false;
    try {
      await apiFetch(`/api/kanban/stages/${stage.id}`, { method: "DELETE" });
      setStages((prev) => prev.filter((item) => item.id !== stage.id));
      showSuccess("Stage deleted.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };
  const deactivate = async (id) => {
    const target = managers.find((item) => String(item.id) === String(id));
    if (!window.confirm(`Deactivate ${target?.full_name || "this account"}? Active sessions will be revoked.`)) return;
    try {
      const path = superAdmin ? `/api/admin/users/${id}` : `/api/team/users/${id}`;
      await apiFetch(path, { method: "PATCH", body: JSON.stringify({ status: "inactive" }) });
      setManagers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "inactive" } : m)),
      );
      showSuccess("Account deactivated.");
    } catch (e) {
      setError(e.message);
    }
  };
  const reactivate = async (id) => {
    const target = managers.find((item) => String(item.id) === String(id));
    if (!window.confirm(`Reactivate ${target?.full_name || "this account"}?`)) return;
    try {
      const path = superAdmin ? `/api/admin/users/${id}` : `/api/team/users/${id}`;
      await apiFetch(path, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
      setManagers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "active" } : m)),
      );
      showSuccess("Account reactivated.");
    } catch (e) {
      setError(e.message);
    }
  };
  const deleteManager = async (id) => {
    await deactivate(id);
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
        role: f.get("role") || "placement_manager",
        university_id: f.get("university_id") || null,
      };
      const endpoint = superAdmin ? "/api/admin/users" : "/api/team/users";
      await apiFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
      await refreshManagers();
      setModal(null);
      showSuccess("Account created.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const updateManager = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const payload = {
        full_name: f.get("full_name"),
        email: f.get("email"),
      };
      if (f.get("password")) payload.password = f.get("password");
      await apiFetch(`/api/team/users/${editingUser.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      await refreshManagers();
      setModal(null);
      setEditingUser(null);
      showSuccess("Account updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const removeManager = async (user) => {
    if (!window.confirm(`Remove ${user.full_name} from your team?`)) return;
    try {
      await apiFetch(`/api/team/users/${user.id}`, { method: "DELETE" });
      setManagers((prev) => prev.filter((member) => member.id !== user.id));
      showSuccess("Account removed.");
    } catch (e) {
      setError(e.message);
    }
  };
  const addUniversity = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const data = await apiFetch("/api/admin/universities", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          code: f.get("code") || null,
          city: f.get("city"),
          plan_name: f.get("plan_name") || "Standard",
          plan_price: Number(f.get("plan_price") || 0),
          plan_expires_at: f.get("plan_expires_at") || null,
          max_accounts: Number(f.get("max_accounts") || 100),
        }),
      });
      setUniversities((prev) => [data, ...prev]);
      setModal(null);
      showSuccess("University added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const updateUniversity = async (university) => {
    const nextStatus = university.status === "active" ? "inactive" : "active";
    if (!window.confirm(`${nextStatus === "inactive" ? "Deactivate" : "Reactivate"} ${university.name}?`)) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/admin/universities/${university.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setUniversities((prev) => prev.map((item) => item.id === data.id ? data : item));
      showSuccess(`University ${nextStatus === "active" ? "reactivated" : "deactivated"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const saveUniversity = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const payload = {
        name: f.get("name"),
        code: f.get("code") || null,
        city: f.get("city"),
        plan_name: f.get("plan_name"),
        plan_price: Number(f.get("plan_price") || 0),
        plan_expires_at: f.get("plan_expires_at") || null,
        max_accounts: Number(f.get("max_accounts") || 100),
      };
      const data = await apiFetch(`/api/admin/universities/${editingUniversity.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setUniversities((prev) => prev.map((item) => item.id === data.id ? data : item));
      setEditingUniversity(null);
      setModal(null);
      showSuccess("University settings updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("new_password") !== f.get("confirm_password")) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: f.get("current_password"), new_password: f.get("new_password") }),
      });
      setModal(null);
      onLogout();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  if (!loaded) return <WorkspaceSkeleton />;
  const content =
    active === "Overview" ? (
      superAdmin ? (
        <PlatformOverview universities={universities} users={managers} />
      ) : supervisor || universityAdmin ? (
        <TeamDashboard summary={teamSummary} analytics={placementData.analytics} masked={supervisor} excludeUserId={user?.id} />
      ) : dataAnalyst ? (
        <><CategoryReference categories={placementData.categories} /><PlacementAnalytics analytics={placementData.analytics} data={placementData} role={role} /></>
      ) : (
        <><Overview
          admin={false}
          mode={mode}
          orgs={visibleOrgs}
          contacts={visibleContacts}
          reports={visibleReports}
          cards={cards}
          visibleCards={visibleCards}
          stages={stages}
          managers={managers}
        /><PlacementManagerWorkflow reports={reports} cards={cards} stages={stages} /></>
      )
    ) : superAdmin && active === "Universities" ? (
      <UniversityDirectory universities={universities} users={managers} onAdd={() => setModal("university")} onEdit={(university) => { setEditingUniversity(university); setModal("edit-university"); }} onToggleStatus={updateUniversity} />
    ) : superAdmin && active === "Users" ? (
      <RoleUsers users={managers} universities={universities} currentUserId={user?.id} superAdmin onAdd={() => setModal("user")} onDeactivate={deactivate} onReactivate={reactivate} />
    ) : (universityAdmin || supervisor) && active === "Team" ? (
      <RoleUsers users={teamSummary?.users || managers} currentUserId={user?.id} onAdd={universityAdmin || role === "coordinator" ? () => setModal("user") : undefined} onDeactivate={universityAdmin || role === "coordinator" ? deactivate : undefined} onReactivate={universityAdmin || role === "coordinator" ? reactivate : undefined} onEdit={universityAdmin || role === "coordinator" ? (member) => { setEditingUser(member); setModal("edit-user"); } : undefined} onRemove={role === "coordinator" ? removeManager : undefined} hierarchy={false} masked={supervisor} />
    ) : universityAdmin && active === "Direct Team" ? (
      <RoleUsers users={teamSummary?.users || managers} currentUserId={user?.id} directReportsTo={user?.id} onAdd={() => setModal("user")} onDeactivate={deactivate} onReactivate={reactivate} onEdit={(member) => { setEditingUser(member); setModal("edit-user"); }} hierarchy={false} />
    ) : active === "Placement Setup" ? (
      <PlacementSetupWizard data={placementData} users={teamSummary?.users || managers} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} />
    ) : universityAdmin && active === "Targets" ? (
      <TargetEntryPanel data={placementData} users={teamSummary?.users || managers} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} />
    ) : active === "Analytics" || active === "Placement Progress" ? (
      <>{role !== "data_analyst" && <TargetProgressPanel data={placementData} users={teamSummary?.users || [...managers, profile].filter(Boolean)} />}<CategoryReference categories={placementData.categories} /><PlacementAnalytics analytics={placementData.analytics} data={placementData} role={role} /></>
    ) : active === "Placement Updates" ? (
      <><CategoryReference categories={placementData.categories} /><PlacementMetrics data={placementData} organizations={orgs} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} /></>
    ) : active === "Approvals" ? (
      <DuplicateApprovals requests={placementData.duplicates} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} />
    ) : active === "Placement Metrics" ? (
      <><CategoryReference categories={placementData.categories} /><PlacementMetrics data={placementData} organizations={orgs} onRefresh={refresh} onError={setError} onSuccess={showSuccess} /></>
    ) : active === organizationNav ? (
      <Organizations
        orgs={visibleOrgs}
        mode={mode}
        query={query}
        setQuery={setQuery}
        onAdd={placementManager ? () => setModal("org") : undefined}
        onEdit={placementManager ? (organization) => { setEditingOrg(organization); setModal("org"); } : undefined}
        onDelete={deleteOrg}
        canEdit={placementManager}
      />
    ) : active === peopleNav ? (
      <Contacts
        contacts={visibleContacts}
        organizations={visibleOrgs}
        mode={mode}
        orgName={orgName}
        query={query}
        setQuery={setQuery}
        onAdd={placementManager ? () => setModal("contact") : undefined}
        onEdit={placementManager ? (contact) => { setEditingContact(contact); setModal("contact"); } : undefined}
        canEdit={placementManager}
      />
    ) : active === "Meeting Reports" ? (
      <Reports
        reports={visibleReports}
        mode={mode}
        orgName={orgName}
        organizations={visibleOrgs}
        onAdd={placementManager ? () => {
          setEditingReport(null);
          setModal("report");
        } : undefined}
        onEdit={placementManager ? (r) => {
          setEditingReport(r);
          setModal("report");
        } : undefined}
        onDelete={placementManager ? deleteReport : undefined}
        onToggleAction={placementManager ? toggleAction : undefined}
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
    <div className="app-shell workspace-company">
      <aside>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <strong>
              Vextra<span>AI</span>
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
              {n === "Overview" || n === "Analytics" || n === "Placement Progress" ? (
                <LayoutDashboard size={18} />
              ) : n === "Placement Managers" || n === "Users" || n === "Team" || n === "Direct Team" ? (
                <Users size={18} />
              ) : n === "Organizations" || n === "Universities" ? (
                <Building2 size={18} />
              ) : n === "Contacts" || n === "Professors" ? (
                <Users size={18} />
              ) : n === "Meeting Reports" ? (
                <FileText size={18} />
              ) : n === "Kanban" || n === "Placement Metrics" ? (
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
              {superAdmin ? "VEXTRA AI ADMIN" : universityAdmin ? "UNIVERSITY ADMIN" : dataAnalyst ? "PLACEMENT ANALYTICS" : supervisor ? "TEAM OPERATIONS" : "PLACEMENT MANAGER"}
            </p>
            <h1>{active}</h1>
          </div>
          <div className="header-actions">
            <button className="global-search-trigger" aria-label="Open global search" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search everything</span><kbd>Ctrl K</kbd></button>
            <div className="notification-wrap">
              <button className="icon-btn notification-button" aria-label="Open notifications" onClick={() => setNotificationsOpen((open) => !open)}><Bell size={19} />{notifications.some((item) => !item.is_read) && <span className="notification-dot" />}</button>
              {notificationsOpen && <div className="notification-popover"><div className="notification-head"><div><b>Notifications</b><small>{notifications.filter((item) => !item.is_read).length} unread</small></div><button className="text-btn" onClick={markAllNotificationsRead}><CheckCheck size={14} />Mark all read</button></div>{notifications.length ? notifications.slice(0, 8).map((notification) => <button className={`notification-item ${notification.is_read ? "read" : ""}`} key={notification.id} onClick={() => markNotificationRead(notification)}><span className="notification-icon"><Bell size={14} /></span><span><b>{notification.title}</b><small>{notification.message}</small><em>{new Date(notification.created_at).toLocaleString()}</em></span></button>) : <div className="notification-empty">You’re all caught up.</div>}</div>}
            </div>
            <div className="top-user">
              <div className="avatar">
                {(profile?.full_name || "EA")
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)}
              </div>
              <div>
                <b>
                  {profile?.full_name || "Vextra AI User"}
                </b>
                <small>{role.replaceAll("_", " ")}</small>
              </div>
              <button type="button" className="icon-btn" aria-label="Change password" title="Change password" onClick={() => setModal("password")}>
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>
        </header>
        <section className="content">
          {error && (
            <div className="error-banner">
              {error}
              <div className="error-actions"><button type="button" className="text-btn" onClick={() => { setError(""); if (superAdmin || supervisor || universityAdmin || dataAnalyst) refreshManagers(); else refresh(); }}>Retry</button><button type="button" aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button></div>
            </div>
          )}
          {success && <div className="success-banner"><CheckCheck size={15} />{success}<button type="button" aria-label="Dismiss success" onClick={() => setSuccess("")}><X size={15} /></button></div>}
          {lastUpdated && <div className="last-updated"><Clock3 size={13} />Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<button className="text-btn" onClick={() => { if (superAdmin || supervisor || universityAdmin || dataAnalyst) refreshManagers(); else refresh(); }}><RefreshCw size={13} />Refresh</button></div>}
          {content}
        </section>
      </main>
      {searchOpen && <GlobalSearch query={searchQuery} setQuery={setSearchQuery} results={searchResults} loading={searchLoading} onClose={() => setSearchOpen(false)} onSelect={(item) => { setSearchOpen(false); if (item.href && nav.includes(item.href)) setActive(item.href); }} />}
      {modal === "org" && (
        <Modal title={editingOrg ? `Edit ${copy.organization.toLowerCase()}` : `Add ${copy.organization.toLowerCase()}`} onClose={() => { setModal(null); setEditingOrg(null); setDuplicateOrg(null); }}>
          <form key={editingOrg?.id || "new-org"} onSubmit={addOrg}>
            <Field
              label={`${copy.organization} name`}
              name="name"
              defaultValue={editingOrg?.name || ""}
              placeholder={copy.organizationPlaceholder}
            />
            <div className="form-grid">
              <Field
                label={copy.focus}
                name="industry"
                defaultValue={editingOrg?.industry || ""}
                placeholder={copy.focusPlaceholder}
              />
              <Select label="City" name="city" defaultValue={editingOrg?.city || ""}>
                <option value="">Choose an allowed city</option>
                {editingOrg?.city && !(placementData.cities || []).some((item) => item.city === editingOrg.city) && <option value={editingOrg.city}>{editingOrg.city} (current)</option>}
                {(placementData.cities || []).map((item) => <option key={item.id} value={item.city}>{item.city}</option>)}
              </Select>
            </div>
            <Field
              label="Expected CTC"
              name="expected_ctc"
              defaultValue={editingOrg?.expected_ctc || ""}
              placeholder="e.g. 8 LPA or ₹8–10 LPA"
            />
            <div className="form-grid">
              <Field label="Website" name="website" defaultValue={editingOrg?.website || ""} placeholder="acme.com" />
              <Select label="Status" name="status" defaultValue={editingOrg?.status || ""}>
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
                defaultValue={editingOrg?.notes || ""}
                placeholder="Relationship context..."
              />
            </label>
            {duplicateOrg && (
              <div className="warning-banner">
                <b>Possible duplicate organization</b>
                <p>This organization already exists under your university. Coordinate with the existing team before continuing.</p>
                <div className="form-actions">
                  <button type="button" className="btn secondary" onClick={() => setDuplicateOrg(null)}>Review details</button>
                  <button type="button" className="btn primary" onClick={confirmDuplicateOrg} disabled={busy}>Continue anyway</button>
                </div>
              </div>
            )}
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "contact" && (
        <Modal title={editingContact ? `Edit ${copy.person.toLowerCase()}` : `Add ${copy.person.toLowerCase()}`} onClose={() => { setModal(null); setEditingContact(null); }}>
          <form key={editingContact?.id || "new-contact"} onSubmit={addContact}>
            <div className="form-grid">
              <Field label="Full name" name="name" defaultValue={editingContact?.name || ""} placeholder="Person name" />
              <Field
                label={copy.role}
                name="designation"
                defaultValue={editingContact?.designation || ""}
                placeholder="HR Manager"
              />
            </div>
            <Select label={copy.organization} name="organization_id" defaultValue={editingContact?.organization_id || ""}>
              <option value="">Choose {copy.organization.toLowerCase()}</option>
              {visibleOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <div className="form-grid">
              <Field label="Email" type="email" name="email" defaultValue={editingContact?.email || ""} />
              <Field label="Phone" name="phone" defaultValue={editingContact?.phone || ""} />
            </div>
            <Field
              label="LinkedIn URL"
              type="url"
              name="linkedin_url"
              defaultValue={editingContact?.linkedin_url || ""}
              placeholder="https://linkedin.com/in/name"
            />
            <label className="field">
              <span>Notes</span>
              <textarea
                required
                name="notes"
                defaultValue={editingContact?.notes || ""}
                placeholder="Contact context..."
              />
            </label>
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "report" && (
        <Modal
          title={editingReport ? `Edit ${copy.person.toLowerCase()} meeting report` : `New ${copy.person.toLowerCase()} meeting report`}
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
            <Select label={copy.organization} name="organization_id" defaultValue={editingReport?.organization_id || ""}>
              <option value="">Choose {copy.organization.toLowerCase()}</option>
              {visibleOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <Select label={copy.person} name="contact_id" defaultValue={editingReport?.contact_id || ""}>
              <option value="">Choose {copy.person.toLowerCase()}</option>
              {visibleContacts.map((c) => (
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
      {modal === "user" && (
        <Modal title="Add team member" onClose={() => setModal(null)}>
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
            <Select label="Role" name="role" defaultValue={superAdmin ? "university_admin" : supervisor ? "placement_manager" : "coordinator"}>
              {superAdmin ? (
                <option value="university_admin">University administrator</option>
              ) : (
                <>
                  {universityAdmin && <option value="coordinator">Coordinator</option>}
                  {universityAdmin && <option value="data_analyst">Data analyst</option>}
                  {(universityAdmin || role === "coordinator") && <option value="placement_manager">Placement manager</option>}
                  {role === "coordinator" && null}
                </>
              )}
            </Select>
            {superAdmin && (
              <Select label="University" name="university_id">
                <option value="">Choose university</option>
                {universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            )}
            <p className="muted">
              The account is created directly. No email is sent; share the initial password securely.
            </p>
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "edit-user" && editingUser && (
        <Modal title="Edit team member" onClose={() => { setModal(null); setEditingUser(null); }}>
          <form onSubmit={updateManager}>
            <Field label="Full name" name="full_name" defaultValue={editingUser.full_name} />
            <Field label="Email" type="email" name="email" defaultValue={editingUser.email} />
            <Field label="New password (optional)" type="password" name="password" minLength="8" required={false} placeholder="Leave blank to keep current password" />
            <FormActions onClose={() => { setModal(null); setEditingUser(null); }} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "university" && (
        <Modal title="Add university" onClose={() => setModal(null)}>
          <form onSubmit={addUniversity}>
            <Field label="University name" name="name" placeholder="VIT University" />
            <div className="form-grid">
              <Field label="University code" name="code" placeholder="VIT" required={false} />
              <Field label="City" name="city" placeholder="Vellore" />
            </div>
            <div className="form-grid">
              <Field label="Plan name" name="plan_name" defaultValue="Standard" />
              <Field label="Plan price" name="plan_price" type="number" min="0" step="0.01" defaultValue="0" />
            </div>
            <div className="form-grid">
              <Field label="Plan expiry (warning only)" name="plan_expires_at" type="date" required={false} />
              <Field label="Maximum accounts" name="max_accounts" type="number" min="1" defaultValue="100" />
            </div>
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "edit-university" && editingUniversity && (
        <Modal title={`Edit ${editingUniversity.name}`} onClose={() => { setModal(null); setEditingUniversity(null); }}>
          <form onSubmit={saveUniversity}>
            <Field label="University name" name="name" defaultValue={editingUniversity.name || ""} />
            <div className="form-grid">
              <Field label="University code" name="code" required={false} defaultValue={editingUniversity.code || ""} />
              <Field label="City" name="city" defaultValue={editingUniversity.city || ""} />
            </div>
            <div className="form-grid">
              <Field label="Plan name" name="plan_name" defaultValue={editingUniversity.plan_name || "Standard"} />
              <Field label="Plan price" name="plan_price" type="number" min="0" step="0.01" defaultValue={editingUniversity.plan_price || 0} />
            </div>
            <div className="form-grid">
              <Field label="Plan expiry (warning only)" name="plan_expires_at" type="date" required={false} defaultValue={editingUniversity.plan_expires_at || ""} />
              <Field label="Maximum accounts" name="max_accounts" type="number" min="1" defaultValue={editingUniversity.max_accounts || 100} />
            </div>
            <FormActions onClose={() => { setModal(null); setEditingUniversity(null); }} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "password" && (
        <Modal title="Change password" onClose={() => setModal(null)}>
          <form onSubmit={changePassword}>
            <Field label="Current password" type="password" name="current_password" autoComplete="current-password" />
            <Field label="New password" type="password" name="new_password" minLength="8" autoComplete="new-password" />
            <Field label="Confirm new password" type="password" name="confirm_password" minLength="8" autoComplete="new-password" />
            <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function PlatformOverview({ universities, users }) {
  const activeUniversities = universities.filter((item) => item.status === "active").length;
  const admins = users.filter((item) => item.role === "university_admin").length;
  const members = users.filter((item) => item.role !== "super_admin").length;
  const totalCapacity = universities.reduce((sum, item) => sum + Number(item.max_accounts || 100), 0);
  const usedCapacity = universities.reduce((sum, item) => sum + users.filter((user) => String(user.university_id) === String(item.id)).length, 0);
  const expiryCutoff = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const expiringUniversities = universities.filter((item) => item.plan_expires_at && new Date(`${item.plan_expires_at}T23:59:59`).getTime() <= expiryCutoff).length;
  const capacityPercent = totalCapacity ? Math.min(100, Math.round((usedCapacity / totalCapacity) * 100)) : 0;
  return <>
    <div className="report-stats">
      <div className="stat"><span>Universities</span><strong>{universities.length}</strong><small>{activeUniversities} active</small></div>
      <div className="stat"><span>University admins</span><strong>{admins}</strong><small>Assigned access</small></div>
      <div className="stat"><span>Team accounts</span><strong>{members}</strong><small>Managed by universities</small></div>
      <div className="stat"><span>Active accounts</span><strong>{users.filter((item) => item.role !== "super_admin" && item.status === "active").length}</strong><small>Current university access</small></div>
      <div className="stat"><span>Account capacity</span><strong>{usedCapacity} / {totalCapacity}</strong><small>{capacityPercent}% allocated</small></div>
      <div className="stat"><span>Expiry warnings</span><strong className={expiringUniversities ? "warning-number" : ""}>{expiringUniversities}</strong><small>Within 30 days or expired</small></div>
    </div>
    <div className="toolbar"><div><p className="eyebrow">VEXTRA AI CONTROL PLANE</p><h2>University network</h2><p className="muted">Create university tenants and assign their administrators. Expiry is a warning only; it never blocks access.</p></div></div>
    <div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">SUBSCRIPTION & ACCOUNT USAGE</p><h3>University network</h3><span className="muted">Plan, account capacity, active team, and expiry information. Expiry warnings never block access.</span></div></div><div className="team-table-scroll"><table><thead><tr><th>University</th><th>Plan</th><th>Accounts used</th><th>Allowed</th><th>Usage</th><th>Active team</th><th>Expiry</th></tr></thead><tbody>{universities.map((item) => { const tenantUsers = users.filter((user) => String(user.university_id) === String(item.id)); const used = tenantUsers.length; const max = Number(item.max_accounts || 100); const expiry = item.plan_expires_at ? new Date(`${item.plan_expires_at}T23:59:59`) : null; const expired = expiry && expiry.getTime() < Date.now(); const soon = expiry && !expired && expiry.getTime() <= expiryCutoff; return <tr key={item.id}><td><b>{item.name}</b><small>{item.city || "No city configured"}</small></td><td>{item.plan_name || "Standard"}</td><td>{used}</td><td>{max}</td><td><div className="usage-bar"><span style={{ width: `${Math.min(100, Math.round((used / max) * 100))}%` }} /></div><small>{Math.round((used / max) * 100)}% allocated</small></td><td>{tenantUsers.filter((user) => user.status === "active").length}</td><td><span className={expired ? "danger-number" : soon ? "warning-number" : ""}>{item.plan_expires_at || "Not configured"}</span>{(expired || soon) && <small>{expired ? "Expired — warning only" : "Expires soon"}</small>}</td></tr>; })}</tbody></table></div></div>
  </>;
}

function TeamDashboard({ summary, analytics, masked, excludeUserId }) {
  const totals = summary?.totals || {};
  const placementTotals = analytics?.totals || {};
  const placementSummary = analytics?.summary || {};
  const users = (summary?.users || []).filter((item) => !excludeUserId || String(item.id) !== String(excludeUserId));
  return <>
    <div className="report-stats">
      <div className="stat"><span>Team members</span><strong>{users.length}</strong><small>Under your reporting line</small></div>
      <div className="stat"><span>Organizations</span><strong>{totals.organizations || 0}</strong><small>{masked ? "Names protected" : "University total"}</small></div>
      <div className="stat"><span>Meeting reports</span><strong>{totals.reports || 0}</strong><small>{totals.pending_actions || 0} pending actions</small></div>
      <div className="stat"><span>Overdue follow-ups</span><strong className={totals.overdue_reports ? "danger-number" : ""}>{totals.overdue_reports || 0}</strong><small>{totals.cards || 0} pipeline cards</small></div>
    </div>
    <div className="panel analytics-pulse"><div><p className="eyebrow">PLACEMENT PULSE</p><h3>What is happening across the university</h3><p className="muted">Live pipeline signals from coordinator and placement-manager updates.</p></div><div className="analytics-pulse-grid"><div><span>Companies in pipeline</span><strong>{placementSummary.companies_in_pipeline || 0}</strong></div><div><span>Drives completed</span><strong>{placementTotals.drives_conducted || 0}</strong></div><div><span>Students placed</span><strong>{placementTotals.students_placed || 0}</strong></div><div><span>Needs attention</span><strong className={placementSummary.negative_outlook || placementSummary.overdue_followups ? "danger-number" : ""}>{(placementSummary.negative_outlook || 0) + (placementSummary.overdue_followups || 0)}</strong></div></div></div>
    <div className="panel table-panel">
      <div className="table-head"><h3>Team activity</h3><span className="muted">{masked ? "Organization and contact identities are masked." : "University-wide activity overview."}</span></div>
      <TeamTable users={users} masked={masked} />
    </div>
    <div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">WORKLOAD</p><h3>Overdue follow-up queue</h3></div></div><table><thead><tr><th>Team member</th><th>Pending</th><th>Overdue</th><th>Status</th></tr></thead><tbody>{users.filter((item) => (item.overdue_followups || 0) > 0 || (item.pending_actions || 0) > 0).map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.pending_actions || 0}</td><td className={item.overdue_followups ? "danger-number" : ""}>{item.overdue_followups || 0}</td><td>{item.report_status || "Not tracked"}</td></tr>)}</tbody></table>{!users.some((item) => (item.overdue_followups || 0) > 0 || (item.pending_actions || 0) > 0) && <div className="empty-state"><p className="muted">No overdue follow-ups.</p></div>}</div>
  </>;
}

function PlacementManagerWorkflow({ reports = [], cards = [], stages = [] }) {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const upcoming = [...reports].sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date))).filter((item) => item.meeting_date >= new Date().toISOString().slice(0, 10)).slice(0, 6);
  const dueCards = cards.filter((item) => item.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 6);
  const bulkMove = async () => { if (!selected.length || !stages.length) return; setBusy(true); try { await Promise.all(selected.map((id) => apiFetch(`/api/kanban/cards/${id}`, { method: "PATCH", body: JSON.stringify({ stage_id: stages[0].id }) }))); setSelected([]); } finally { setBusy(false); } };
  return <div className="two-column"><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">DRIVE CALENDAR</p><h3>Upcoming meetings and drives</h3></div></div><table><thead><tr><th>Date</th><th>Title</th><th>Company</th></tr></thead><tbody>{upcoming.map((item) => <tr key={item.id}><td>{item.meeting_date}</td><td>{item.title || "Meeting report"}</td><td>{item.organization_name || "Company"}</td></tr>)}</tbody></table>{!upcoming.length && <div className="empty-state"><p className="muted">No upcoming drives scheduled.</p></div>}</div><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">FOLLOW-UP REMINDERS</p><h3>Due pipeline work</h3></div><button className="btn secondary" disabled={!selected.length || busy} onClick={bulkMove}>Move selected to first stage</button></div><table><thead><tr><th /><th>Work item</th><th>Due</th><th>Priority</th></tr></thead><tbody>{dueCards.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} aria-label={`Select ${item.title}`} /></td><td>{item.title}</td><td className={item.due_date < new Date().toISOString().slice(0, 10) ? "danger-number" : ""}>{item.due_date}</td><td>{item.priority || "medium"}</td></tr>)}</tbody></table>{!dueCards.length && <div className="empty-state"><p className="muted">No dated follow-ups.</p></div>}</div></div>;
}

function TeamTable({ users, masked }) {
  return <div className="team-table-scroll" role="region" aria-label="Team activity table" tabIndex="0"><table className="team-activity-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Organizations</th><th>Contacts</th><th>Reports</th><th>Last report</th><th>Follow-ups</th><th>Report tracking</th><th>Pipeline</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td><b>{item.full_name}</b><small>{item.email}</small></td><td>{item.role.replaceAll("_", " ")}</td><td><span className={`badge ${item.status}`}>{item.status}</span></td><td>{item.organization_count ?? 0}{masked && <small> masked</small>}</td><td>{item.contact_count ?? 0}{masked && <small> masked</small>}</td><td>{item.report_count ?? 0}</td><td>{item.last_report_date ? new Date(item.last_report_date).toLocaleDateString() : "Never"}</td><td><span className={item.overdue_followups ? "danger-number" : ""}>{item.overdue_followups ?? 0} overdue</span><small>{item.pending_actions ?? 0} pending action{item.pending_actions === 1 ? "" : "s"}</small></td><td><span className={`report-status ${String(item.report_status || "").toLowerCase().replaceAll(" ", "-")}`}>{item.report_status || "Not tracked"}</span></td><td>{item.card_count ?? 0}</td></tr>)}</tbody></table></div>;
}

function RoleUsers({ users, universities = [], currentUserId, directReportsTo, onAdd, onDeactivate, onReactivate, onEdit, onRemove, superAdmin = false, hierarchy = false, masked = false }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [loginFilter, setLoginFilter] = useState("");
  const [expanded, setExpanded] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const names = new Map(users.map((item) => [String(item.id), item.full_name]));
  const universityNames = new Map(universities.map((item) => [String(item.id), item.name]));
  const directoryUsers = (superAdmin ? users.filter((item) => item.role !== "super_admin") : users).filter((item) => (!currentUserId || String(item.id) !== String(currentUserId)) && (directReportsTo === undefined || String(item.reports_to) === String(directReportsTo)));
  const canDeactivate = (item) => onDeactivate && (superAdmin || item.role !== "university_admin");
  const roleLabel = (role) => role.replaceAll("_", " ");
  const matches = (item) => {
    const term = search.trim().toLowerCase();
    const haystack = `${item.full_name || ""} ${item.email || ""} ${item.role || ""} ${universityNames.get(String(item.university_id)) || ""}`.toLowerCase();
    return (!term || haystack.includes(term))
      && (!roleFilter || item.role === roleFilter)
      && (!statusFilter || item.status === statusFilter)
      && (!universityFilter || String(item.university_id) === universityFilter)
      && (!loginFilter || (loginFilter === "never" ? !item.last_login_at : Boolean(item.last_login_at)))
      ;
  };
  const filteredUsers = directoryUsers.filter(matches);
  const accountActions = (item) => (
    <div className="actions">
      {onEdit && <button className="text-btn" onClick={() => onEdit(item)}><Pencil size={13} />Edit</button>}
      {item.status === "active" && item.role !== "super_admin" && canDeactivate(item) && <button className="delete-btn" onClick={() => onDeactivate(item.id)}>Deactivate</button>}
      {item.status === "inactive" && item.role !== "super_admin" && onReactivate && <button className="text-btn" onClick={() => onReactivate(item.id)}>Reactivate</button>}
      {item.status === "active" && onRemove && <button className="delete-btn" onClick={() => onRemove(item)}>Remove</button>}
    </div>
  );
  const roleOrder = { university_admin: 0, coordinator: 1, placement_manager: 2, data_analyst: 3 };
  const sortAccounts = (items) => [...items].sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || String(a.full_name || "").localeCompare(String(b.full_name || "")));
  const accountRow = (item, depth = 0) => <tr key={item.id}>
    <td><div className={depth ? "hierarchy-name hierarchy-child" : "hierarchy-name"} style={{ paddingLeft: `${depth * 24}px` }}>{superAdmin ? <button className="account-name-button" onClick={() => setSelectedAccount(item)}><b>{item.full_name}</b><small>{item.email}</small></button> : <><b>{item.full_name}</b><small>{item.email}</small></>}</div></td>
    <td>{roleLabel(item.role)}</td>
    <td><span className={`badge ${item.status}`}>{item.status}</span></td>
    <td>{item.reports_to_name || (item.reports_to ? names.get(String(item.reports_to)) || "Assigned manager" : "—")}</td>
    <td>{accountActions(item)}</td>
  </tr>;
  const universityGroups = [...universities].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))).map((university) => ({
    ...university,
    admin: filteredUsers.find((item) => String(item.university_id) === String(university.id) && item.role === "university_admin"),
    members: filteredUsers.filter((item) => String(item.university_id) === String(university.id) && item.role !== "university_admin"),
    totalMembers: directoryUsers.filter((item) => String(item.university_id) === String(university.id) && item.role !== "university_admin").length,
  })).filter((group) => group.admin || group.members.length || (!search && !roleFilter && !statusFilter && !universityFilter));
  const unassigned = filteredUsers.filter((item) => !item.university_id);
  const hierarchyChildren = new Map();
  const hasVisibleParent = (item) => {
    if (!item.reports_to) return false;
    const parent = filteredUsers.find((candidate) => String(candidate.id) === String(item.reports_to));
    if (!parent) return false;
    return !item.reports_to_name || String(item.reports_to_name).trim().toLowerCase() === String(parent.full_name || "").trim().toLowerCase();
  };
  filteredUsers.forEach((item) => {
    if (hasVisibleParent(item)) {
      const parentId = String(item.reports_to);
      hierarchyChildren.set(parentId, [...(hierarchyChildren.get(parentId) || []), item]);
    }
  });
  const hierarchyRoots = sortAccounts(filteredUsers.filter((item) => !hasVisibleParent(item)));
  const hierarchyDescendants = (item) => (hierarchyChildren.get(String(item.id)) || []).reduce((total, child) => total + 1 + hierarchyDescendants(child), 0);
  const hierarchyRows = (item, depth = 0) => <React.Fragment key={`${item.id}-${depth}`}>{accountRow(item, depth)}{sortAccounts(hierarchyChildren.get(String(item.id)) || []).map((child) => hierarchyRows(child, depth + 1))}</React.Fragment>;
  const exportAccounts = () => {
    const header = ["Name", "Email", "Role", "Status", "University", "Reports to", "Created", "Last login", "Password change required"];
    const rows = filteredUsers.map((item) => [item.full_name, item.email, roleLabel(item.role), item.status, universityNames.get(String(item.university_id)) || "", item.reports_to_name || names.get(String(item.reports_to)) || "", item.created_at || "", item.last_login_at || "", item.must_change_password ? "Yes" : "No"]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "vextra-accounts.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const clearFilters = () => { setSearch(""); setRoleFilter(""); setStatusFilter(""); setUniversityFilter(""); setLoginFilter(""); };
  return <>
    <div className="toolbar"><div><p className="eyebrow">ACCESS DIRECTORY</p><h2>{superAdmin ? "All accounts" : directReportsTo !== undefined ? "My direct team" : "Team members"}</h2><p className="muted">{masked ? "Progress is visible while organization identities remain protected." : directReportsTo !== undefined ? "Placement managers and coordinators who report directly to you." : "Manage access within your authorized scope."}</p></div>{onAdd && <button className="btn primary" onClick={onAdd}><Plus size={17}/> Add account</button>}</div>
    <div className="directory-toolbar panel">
      <div className="search directory-search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all accounts by name or email" aria-label="Search all accounts" /></div>
      <select className="filter" value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)} aria-label="Filter by university">
        <option value="">All universities</option>
        {universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <select className="filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
        <option value="">All roles</option>
        {["university_admin", "coordinator", "placement_manager", "data_analyst", ...(superAdmin ? [] : ["super_admin"])].map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
      </select>
      <select className="filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by account status">
        <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select>
      {superAdmin && <><select className="filter" value={loginFilter} onChange={(e) => setLoginFilter(e.target.value)} aria-label="Filter by last login"><option value="">Any login state</option><option value="never">Never logged in</option><option value="logged_in">Has logged in</option></select><button className="btn secondary" onClick={exportAccounts}><Download size={15} />Export CSV</button></>}
      {(search || roleFilter || statusFilter || universityFilter || loginFilter) && <button className="text-btn" onClick={clearFilters}>Clear filters</button>}
    </div>
    {superAdmin ? <div className="account-directory">
      {universityGroups.map((group) => {
        const isOpen = expanded[group.id];
        return <section className="university-account-group panel" key={group.id}>
          <div className="university-admin-row">
            <div><p className="eyebrow">UNIVERSITY ADMIN</p>{group.admin ? <button className="account-name-button admin-account-name" onClick={() => setSelectedAccount(group.admin)}><h3>{group.admin.full_name}</h3><p className="muted">{group.admin.email}</p></button> : <><h3>No administrator assigned</h3><p className="muted">Assign an administrator to manage this university</p></>}</div>
            <div className="university-admin-meta">{group.admin ? <><span className={`badge ${group.admin.status}`}>{group.admin.status}</span>{accountActions(group.admin)}</> : <span className="muted">{group.totalMembers} account{group.totalMembers === 1 ? "" : "s"}</span>}</div>
          </div>
          <div className="university-group-footer"><span>{group.members.length} team account{group.members.length === 1 ? "" : "s"}{group.members.length !== group.totalMembers && " matching filters"}</span><button className="text-btn" aria-expanded={Boolean(isOpen)} onClick={() => setExpanded((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}>{isOpen ? "Hide accounts" : "View accounts"}</button></div>
          {isOpen && <div className="directory-table"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Reports to</th><th /></tr></thead><tbody>{sortAccounts(group.members).map((item) => accountRow(item, 0))}</tbody></table>{!group.members.length && <div className="empty-state"><p className="muted">No team accounts match the current filters.</p></div>}</div>}
        </section>;
      })}
      {unassigned.length > 0 && <section className="university-account-group panel"><div className="university-admin-row"><div><p className="eyebrow">UNASSIGNED ACCOUNTS</p><h3>Platform accounts</h3><p className="muted">Accounts without a university assignment.</p></div></div><div className="directory-table"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Reports to</th><th /></tr></thead><tbody>{unassigned.map((item) => accountRow(item, 0))}</tbody></table></div></section>}
      {!universityGroups.length && !unassigned.length && <div className="empty-state panel"><h3>No accounts found</h3><p className="muted">Try changing your search or filters.</p></div>}
    </div> : hierarchy ? <div className="account-directory team-hierarchy">
      {hierarchyRoots.map((root) => {
        const key = `hierarchy-${root.id}`;
        const isOpen = expanded[key] !== false;
        const descendants = hierarchyDescendants(root);
        return <section className="university-account-group panel" key={root.id}>
          <div className="university-admin-row">
            <div><p className="eyebrow">{root.role === "coordinator" ? "COORDINATOR" : "DIRECT REPORT TO UNIVERSITY ADMIN"}</p><div className="account-name-button admin-account-name"><h3>{root.full_name}</h3><p className="muted">{root.email}</p></div></div>
            <div className="university-admin-meta"><span className={`badge ${root.status}`}>{root.status}</span>{accountActions(root)}</div>
          </div>
          <div className="university-group-footer"><span>{descendants} account{descendants === 1 ? "" : "s"} reporting below</span><button className="text-btn" aria-expanded={isOpen} onClick={() => setExpanded((prev) => ({ ...prev, [key]: !isOpen }))}>{isOpen ? "Hide accounts" : "View accounts"}</button></div>
          {isOpen && <div className="directory-table"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Reports to</th><th /></tr></thead><tbody>{(hierarchyChildren.get(String(root.id)) || []).map((child) => hierarchyRows(child, 1))}</tbody></table>{!descendants && <div className="empty-state"><p className="muted">No accounts report to this team member.</p></div>}</div>}
        </section>;
      })}
      {!hierarchyRoots.length && <div className="empty-state panel"><h3>No team accounts found</h3><p className="muted">Try changing your search or filters.</p></div>}
    </div> : <div className="panel table-panel"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Reports to</th><th /></tr></thead><tbody>{sortAccounts(filteredUsers).map((item) => <tr key={item.id}><td><b>{item.full_name}</b></td><td>{item.email}</td><td>{roleLabel(item.role)}</td><td><span className={`badge ${item.status}`}>{item.status}</span></td><td>{item.reports_to_name || (item.reports_to ? names.get(String(item.reports_to)) || "Assigned manager" : "—")}</td><td>{accountActions(item)}</td></tr>)}</tbody></table>{!filteredUsers.length && <div className="empty-state"><p className="muted">No accounts match the current filters.</p></div>}</div>}
    {superAdmin && selectedAccount && <AccountDetailDrawer account={selectedAccount} universities={universities} names={names} onClose={() => setSelectedAccount(null)} />}
  </>;
}

function AccountDetailDrawer({ account, universities, names, onClose }) {
  const drawerRef = useRef(null);
  useDialogBehavior(drawerRef, onClose);
  const university = universities.find((item) => String(item.id) === String(account.university_id));
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={drawerRef} className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="account-drawer-title"><div className="drawer-head"><div><p className="eyebrow">ACCOUNT DETAILS</p><h2 id="account-drawer-title">{account.full_name}</h2></div><button type="button" className="icon-btn" aria-label="Close account details" onClick={onClose}><X size={18} /></button></div><div className="drawer-status"><span className={`badge ${account.status}`}>{account.status}</span><span className="role-pill">{account.role.replaceAll("_", " ")}</span></div><dl className="detail-list"><div><dt>Email</dt><dd>{account.email}</dd></div><div><dt>University</dt><dd>{university?.name || "Platform account"}</dd></div><div><dt>Reports to</dt><dd>{account.reports_to_name || (account.reports_to ? names.get(String(account.reports_to)) : "—") || "—"}</dd></div><div><dt>Created</dt><dd>{account.created_at ? new Date(account.created_at).toLocaleString() : "—"}</dd></div><div><dt>Last login</dt><dd>{account.last_login_at ? new Date(account.last_login_at).toLocaleString() : "Never"}</dd></div><div><dt>Password state</dt><dd>{account.must_change_password ? "Initial password change required" : "Password updated"}</dd></div></dl></aside></div>;
}

function GlobalSearch({ query, setQuery, results, loading, onClose, onSelect }) {
  const [selected, setSelected] = useState(0);
  const grouped = results.reduce((groups, item) => {
    const label = item.type === "account" ? "Accounts" : item.type === "university" ? "Universities" : item.type === "organization" ? "Organizations" : item.type === "contact" ? "Contacts" : "Meeting reports";
    groups[label] = [...(groups[label] || []), item];
    return groups;
  }, {});
  const flatResults = Object.values(grouped).flat();
  useEffect(() => setSelected(0), [query]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((current) => Math.min(current + 1, Math.max(flatResults.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter" && flatResults[selected]) {
        event.preventDefault();
        onSelect(flatResults[selected]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flatResults, selected, onSelect]);
  return <div className="search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="global-search-dialog" role="dialog" aria-modal="true" aria-label="Global search">
      <div className="global-search-input"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts, universities, organizations, contacts, reports…" /><kbd>ESC</kbd></div>
      <div className="global-search-body">{loading ? <div className="search-state"><Loader2 className="spin" />Searching…</div> : flatResults.length ? Object.entries(grouped).map(([label, items]) => <div className="search-group" key={label}><p>{label}</p>{items.map((item) => { const index = flatResults.indexOf(item); return <button className={`search-result ${index === selected ? "selected" : ""}`} key={`${item.type}-${item.id}`} onClick={() => onSelect(item)}><span className="search-result-icon"><ChevronRight size={15} /></span><span><b>{item.title}</b><small>{item.subtitle}</small></span><em>{item.meta?.status || item.meta?.meeting_date || ""}</em></button>; })}</div>) : <div className="search-state"><Search size={18} /><span>{query ? "No permitted results found." : "Start typing to search your workspace."}</span></div>}</div>
      <div className="global-search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span></div>
    </div>
  </div>;
}

function UniversityDirectory({ universities, users, onAdd, onEdit, onToggleStatus }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState(null);
  const rows = universities.filter((item) => {
    const term = search.trim().toLowerCase();
    return (!term || `${item.name} ${item.code || ""} ${item.city || ""}`.toLowerCase().includes(term))
      && (!status || item.status === status)
      && (!city || item.city === city);
  });
  const cities = [...new Set(universities.map((item) => item.city).filter(Boolean))].sort();
  return <>
    <div className="toolbar"><div><p className="eyebrow">TENANT MANAGEMENT</p><h2>Universities</h2><p className="muted">Each university receives its own administrative scope.</p></div><button className="btn primary" onClick={onAdd}><Plus size={17}/> Add university</button></div>
    <div className="directory-toolbar panel"><div className="search directory-search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search universities" aria-label="Search universities" /></div><select className="filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter universities by status"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><select className="filter" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter universities by city"><option value="">All cities</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    <div className="panel table-panel"><div className="team-table-scroll"><table><thead><tr><th>University</th><th>Admin</th><th>Plan</th><th>Accounts used</th><th>Allowed accounts</th><th>Expiry</th><th>Code</th><th>City</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{rows.map((item) => { const admin = users.find((user) => String(user.university_id) === String(item.id) && user.role === "university_admin"); const accountCount = users.filter((user) => String(user.university_id) === String(item.id)).length; const expiry = item.plan_expires_at ? new Date(`${item.plan_expires_at}T23:59:59`) : null; const expired = expiry && expiry.getTime() < Date.now(); const soon = expiry && !expired && expiry.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000; return <tr key={item.id}><td><button className="account-name-button" onClick={() => setSelected(item)}><b>{item.name}</b></button></td><td>{admin?.full_name || <span className="muted">Unassigned</span>}</td><td>{item.plan_name || "Standard"}</td><td>{accountCount}</td><td>{item.max_accounts || 100}</td><td><span className={expired ? "danger-number" : soon ? "warning-number" : ""}>{item.plan_expires_at || "Not configured"}</span>{(expired || soon) && <small>{expired ? "Expired — warning only" : "Expires soon"}</small>}</td><td>{item.code || "—"}</td><td>{item.city}</td><td><span className={`badge ${item.status}`}>{item.status}</span></td><td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "Today"}</td><td><div className="actions"><button className="text-btn" onClick={() => onEdit(item)}><Pencil size={13} />Edit</button><button className={item.status === "active" ? "delete-btn" : "text-btn"} onClick={() => onToggleStatus(item)}>{item.status === "active" ? "Deactivate" : "Reactivate"}</button></div></td></tr>; })}</tbody></table></div>{!rows.length && <div className="empty-state"><h3>No universities found</h3><p className="muted">Try changing your search or filters.</p></div>}</div>
    {selected && <UniversityDetailDrawer university={selected} users={users} onClose={() => setSelected(null)} />}
  </>;
}

function UniversityDetailDrawer({ university, users, onClose }) {
  const drawerRef = useRef(null);
  useDialogBehavior(drawerRef, onClose);
  const accounts = users.filter((item) => String(item.university_id) === String(university.id));
  const admin = accounts.find((item) => item.role === "university_admin");
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={drawerRef} className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="university-drawer-title"><div className="drawer-head"><div><p className="eyebrow">UNIVERSITY DETAILS</p><h2 id="university-drawer-title">{university.name}</h2></div><button type="button" className="icon-btn" aria-label="Close university details" onClick={onClose}><X size={18} /></button></div><div className="drawer-status"><span className={`badge ${university.status}`}>{university.status}</span><span className="role-pill">{accounts.length}/{university.max_accounts || 100} accounts</span></div><dl className="detail-list"><div><dt>Code</dt><dd>{university.code || "—"}</dd></div><div><dt>City</dt><dd>{university.city || "—"}</dd></div><div><dt>Plan</dt><dd>{university.plan_name || "Standard"}</dd></div><div><dt>Plan expiry</dt><dd>{university.plan_expires_at || "Not configured"}</dd></div><div><dt>University admin</dt><dd>{admin ? `${admin.full_name} · ${admin.email}` : "Not assigned"}</dd></div><div><dt>Created</dt><dd>{university.created_at ? new Date(university.created_at).toLocaleString() : "—"}</dd></div></dl><div className="drawer-note"><Users size={16} /><span>{accounts.filter((item) => item.status === "active").length} active account(s) and {accounts.filter((item) => item.status === "inactive").length} inactive account(s).</span></div></aside></div>;
}

function Overview({ admin, mode, orgs, contacts, reports, cards, visibleCards, stages, managers }) {
  const copy = workspaceCopy[mode];
  const pendingActions = reports.reduce((sum, report) => sum + (report.action_items_list || []).filter((item) => !item.is_completed).length, 0);
  const overdueFollowUps = reports.filter((report) => report.follow_up_date && new Date(report.follow_up_date) < new Date()).length;
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
        [copy.organizations, orgs.length, `Your ${copy.organizations.toLowerCase()}`],
        [copy.people, contacts.length, `Across ${copy.organizations.toLowerCase()}`],
        ["Meeting reports", reports.length, `${pendingActions} pending actions`],
        [
          "Open opportunities",
          visibleCards.filter((c) => !closedStageIds.includes(String(c.stage_id))).length,
          `${overdueFollowUps} overdue follow-ups`,
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
              <TeamTable users={managers} masked={false} />
            ) : (
            <Pipeline cards={visibleCards} stages={stages} />
          )}
      </div>
    </>
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
function Organizations({ orgs, mode, query, setQuery, onAdd, onEdit, onDelete, canEdit = true }) {
  const copy = workspaceCopy[mode];
  const [status, setStatus] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [owner, setOwner] = useState("");
  const industries = [...new Set(orgs.map((item) => item.industry).filter(Boolean))].sort();
  const cities = [...new Set(orgs.map((item) => item.city).filter(Boolean))].sort();
  const owners = [...new Map(orgs.filter((item) => item.owner_name).map((item) => [item.placement_manager_id, item.owner_name])).entries()];
  const rows = orgs.filter(
    (o) =>
      (o.name || "").toLowerCase().includes(query.toLowerCase()) &&
      (!status || o.status === status) &&
      (!industry || o.industry === industry) &&
      (!city || o.city === city) &&
      (!owner || String(o.placement_manager_id) === owner),
  );
  return (
    <>
      <Toolbar
        query={query}
        setQuery={setQuery}
        button={canEdit ? `Add ${copy.organization.toLowerCase()}` : null}
        onAdd={onAdd}
      />
      {!canEdit && <div className="read-only-notice">Read-only university view. Organization records and activity can be reviewed, but only the owning placement manager can change them.</div>}
      <div className="panel table-panel">
        <div className="table-head">
          <h3>
            {copy.organizations} <span className="count">{rows.length}</span>
          </h3>
          <div className="table-head-actions">
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
            <select className="filter" value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Filter organizations by industry"><option value="">All industries</option>{industries.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select className="filter" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter organizations by city"><option value="">All cities</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            {owners.length > 0 && <select className="filter" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter organizations by owner"><option value="">All owners</option>{owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{copy.organization}</th>
              <th>{copy.focus}</th>
              {mode === "company" && <th>Expected CTC</th>}
              <th>Location</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Updated</th>
              {canEdit && <th />}
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
                {mode === "company" && <td>{o.expected_ctc || "-"}</td>}
                <td>{o.city}</td>
                <td>{o.owner_name || "—"}</td>
                <td>
                  <span className={`badge ${o.status}`}>{o.status}</span>
                </td>
                <td>
                  {o.updated_at
                    ? new Date(o.updated_at).toLocaleDateString()
                    : "Today"}
                </td>
                {canEdit && <td><div className="actions"><button className="text-btn" onClick={() => onEdit(o)}><Pencil size={13} />Edit</button><button className="delete-btn" onClick={() => onDelete(o.id)}>Delete</button></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Contacts({ contacts, organizations, mode, orgName, query, setQuery, onAdd, onEdit, canEdit = true }) {
  const copy = workspaceCopy[mode];
  const [organizationFilter, setOrganizationFilter] = useState("");
  const rows = contacts.filter(
    (contact) =>
      `${contact.name || ""} ${contact.organization_name || orgName(contact.organization_id)} ${contact.designation || ""}`.toLowerCase().includes(query.toLowerCase()) &&
      (!organizationFilter || String(contact.organization_id) === organizationFilter),
  );
  return (
    <>
      <Toolbar
        query={query}
        setQuery={setQuery}
        button={canEdit ? `Add ${copy.person.toLowerCase()}` : null}
        onAdd={onAdd}
      />
      {!canEdit && <div className="read-only-notice">Read-only university view. Personal contact identities and direct contact details are protected.</div>}
      <div className="panel table-panel">
        <div className="table-head">
          <h3>
            {copy.people} <span className="count">{rows.length}</span>
          </h3>
          <select
            className="filter"
            value={organizationFilter}
            onChange={(e) => setOrganizationFilter(e.target.value)}
          >
            <option value="">All {copy.organizations.toLowerCase()}</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>{copy.person}</th>
              <th>{copy.organization}</th>
              <th>{copy.role}</th>
              <th>Email</th>
              <th>Phone</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td>{orgName(c.organization_id)}</td>
                  <td>{c.designation}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  {canEdit && <td><button className="text-btn" onClick={() => onEdit(c)}><Pencil size={13} />Edit</button></td>}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Reports({ reports, mode, orgName, organizations, onAdd, onEdit, onDelete, onToggleAction }) {
  const copy = workspaceCopy[mode];
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
    {!onEdit && <div className="read-only-notice">Read-only university view. Report activity is visible while personal contact details remain protected.</div>}
    <div className="toolbar report-toolbar"><div className="search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${copy.person.toLowerCase()} meetings...`}/></div><select className="filter" value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}><option value="">All {copy.organizations.toLowerCase()}</option>{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><select className="filter" value={range} onChange={(e) => setRange(e.target.value)}><option value="all">All dates</option><option value="this_week">This week</option><option value="this_month">This month</option><option value="overdue">Overdue follow-ups</option></select><select className="filter" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>{onAdd && <button className="btn primary" onClick={onAdd}><Plus size={17}/> New report</button>}</div>
    <div className="reports">{filtered.map((r) => { const isOpen = expanded === r.id; const actionItems = r.action_items_list || []; const isOverdue = r.follow_up_date && new Date(r.follow_up_date) < start; return <article className={`report panel ${isOverdue ? "report-overdue" : ""}`} key={r.id}><div className="report-date"><b>{new Date(r.meeting_date).getDate()}</b><span>{new Date(r.meeting_date).toLocaleString("en", {month:"short"}).toUpperCase()}</span></div><div className="report-body"><div className="report-top"><div><h3>{r.title}</h3><p className="muted">{orgName(r.organization_id)} · {r.attendees}</p><div className="report-badges"><span className={`report-badge ${r.outcome || "neutral"}`}>{(r.outcome || "neutral").replaceAll("_", " ")}</span><span className="report-badge">{(r.meeting_type || "video_call").replaceAll("_", " ")}</span>{r.follow_up_date && <span className={`report-badge ${isOverdue ? "overdue" : ""}`}>Follow-up: {r.follow_up_date}</span>}</div></div><div className="report-actions"><button className="text-btn" onClick={() => setExpanded(isOpen ? null : r.id)}>{isOpen ? "Collapse" : "Details"}</button>{onEdit && <button className="text-btn" onClick={() => onEdit(r)}>Edit</button>}{onDelete && <button className="delete-btn" onClick={() => onDelete(r.id)}>Delete</button>}</div></div><p>{r.summary}</p>{isOpen && <div className="report-details"><div><b>Attendees</b><p>{r.attendees}</p></div><div><b>Action items</b>{actionItems.length ? actionItems.map((a) => <label className={`action-check ${a.is_completed ? "completed" : ""}`} key={a.id}><input type="checkbox" checked={a.is_completed} disabled={!onToggleAction} onChange={onToggleAction ? (e) => onToggleAction(r.id, a.id, e.target.checked) : undefined}/><span>{a.text}</span></label>) : <p>{r.action_items || "No action items."}</p>}</div></div>}<div className="action"><b>{actionItems.length ? `${actionItems.filter((a) => !a.is_completed).length} pending action${actionItems.filter((a) => !a.is_completed).length === 1 ? "" : "s"}` : "Next action"}</b><span>{r.action_items || "Open details to review action items."}</span></div></div></article>})}</div>{!filtered.length && <div className="empty-state panel"><h3>No meeting reports found</h3><p className="muted">Try changing your filters or create a new report.</p></div>}
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
                <button type="button" className="icon-btn" aria-label={`Edit ${stage.name}`} title={`Edit ${stage.name}`} onClick={() => onManageStage(stage)}><SlidersHorizontal size={15} /></button>
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
function Managers({ managers, onAdd, onDeactivate, onReactivate, onDelete }) {
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
                  {m.status === "inactive" && onReactivate && (
                    <button
                      className="text-btn"
                      onClick={() => onReactivate(m.id)}
                    >
                      Reactivate
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

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function CategoryReference({ categories = [] }) {
  return <div className="panel category-reference"><div className="panel-head"><div><p className="eyebrow">UNIVERSITY CATEGORIES</p><h3>Available company bands</h3><span className="muted">Defined by your University Admin</span></div></div>{categories.length ? <div className="category-reference-grid">{categories.map((item) => <div className="category-reference-item" key={item.id}><b>{item.name}</b><span>{item.min_ctc_lpa ?? 0}–{item.max_ctc_lpa ?? "No upper limit"} LPA</span>{item.description && <small>{item.description}</small>}</div>)}</div> : <p className="muted">No company categories have been configured by your University Admin yet.</p>}</div>;
}

function TargetProgressPanel({ data = {}, users = [] }) {
  const targets = data.targets || [];
  const metrics = data.metrics || [];
  const valueFor = (target, key) => metrics.filter((item) => String(item.season_id) === String(target.season_id) && String(item.placement_manager_id) === String(target.user_id) && String(item.category_id || "") === String(target.category_id || "")).reduce((total, item) => total + Number(item[key] || 0), 0);
  return <div className="panel table-panel target-progress-panel"><div className="panel-head"><div><p className="eyebrow">ADMIN-DECLARED TARGETS</p><h3>Your placement targets</h3><span className="muted">Targets are set by the University Admin. Update actual drives and placements in Placement Updates.</span></div></div><table><thead><tr><th>Season</th><th>Manager</th><th>Category</th><th>Company target</th><th>Companies</th><th>Drives</th><th>Placed</th><th>Joined</th></tr></thead><tbody>{targets.map((target) => <tr key={target.id}><td>{data.seasons?.find((item) => String(item.id) === String(target.season_id))?.name || "Season"}</td><td>{users.find((item) => String(item.id) === String(target.user_id))?.full_name || "Placement manager"}</td><td>{data.categories?.find((item) => String(item.id) === String(target.category_id))?.name || "Category"}</td><td><b>{target.companies_target || 0}</b></td><td>{valueFor(target, "companies_acquired")}</td><td>{valueFor(target, "drives_conducted")}</td><td>{valueFor(target, "students_placed")}</td><td>{valueFor(target, "students_joined")}</td></tr>)}</tbody></table>{!targets.length && <div className="empty-state"><p className="muted">No targets have been declared for your team yet.</p></div>}</div>;
}

function PlacementAnalytics({ analytics, data = {}, role }) {
  const [seasonFilter, setSeasonFilter] = useState(() => localStorage.getItem("placement-season-filter") || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [outlookFilter, setOutlookFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [search, setSearch] = useState("");
  const totals = analytics?.totals || {};
  const targetTotals = analytics?.target_totals || {};
  const summary = analytics?.summary || {};
  const rows = analytics?.rows || [];
  const statusCounts = analytics?.status_counts || {};
  const outlookCounts = analytics?.outlook_counts || {};
  const driveStatusCounts = analytics?.drive_status_counts || {};
  const managers = analytics?.by_manager || [];
  const cards = [
    ["Companies acquired", totals.companies_acquired],
    ["Drives conducted", totals.drives_conducted],
    ["Offers received", totals.offers_received],
    ["Students placed", totals.students_placed],
    ["Students joined", totals.students_joined],
    ["Company target", targetTotals.companies_target],
  ];
  const filteredRows = rows.filter((row) => {
    const text = `${row.organization_name || ""} ${row.city || ""} ${row.industry || ""} ${row.placement_manager_name || ""} ${row.category_name || ""}`.toLowerCase();
    return (!seasonFilter || String(row.season_id) === String(seasonFilter)) && (!statusFilter || row.pipeline_status === statusFilter) && (!outlookFilter || row.outlook === outlookFilter) && (!managerFilter || String(row.placement_manager_id) === String(managerFilter)) && (!search.trim() || text.includes(search.trim().toLowerCase()));
  });
  const exportRows = [["Company", "Manager", "Season", "Category", "Pipeline status", "Outlook", "Expected date", "Drive status", "Drive date", "Registered", "Selected", "Placed", "Joined", "Next follow-up", "Next action"], ...filteredRows.map((row) => [row.organization_name, row.placement_manager_name, row.season_name, row.category_name, row.pipeline_status_label, row.outlook_label, row.expected_date, row.drive_status_label, row.drive_date, row.students_registered, row.students_selected, row.students_placed, row.students_joined, row.next_follow_up_date, row.next_action])];
  const seasonRows = (analytics?.by_season || []).filter((row) => !seasonFilter || String(row.season_id) === String(seasonFilter));
  const categoryRows = analytics?.by_category || [];
  const cityRows = analytics?.by_city || [];
  const progress = targetTotals.companies_target ? Math.min(100, Math.round((Number(totals.companies_acquired || 0) / Number(targetTotals.companies_target)) * 100)) : 0;
  const labelFor = (options, value) => options.find(([key]) => key === value)?.[1] || value;
  const statusClass = (value) => String(value || "").replaceAll("_", "-");
  return <div className="dashboard"><div className="section-heading"><div><p className="eyebrow">{role === "data_analyst" ? "ANALYTICS WORKSPACE" : "PLACEMENT INTELLIGENCE"}</p><h2>Placement analytics</h2><p className="muted">A live university-wide view of targets, company pipeline, drives, outcomes, and follow-up health.</p></div><div className="actions"><select className="filter" value={seasonFilter} onChange={(e) => { setSeasonFilter(e.target.value); localStorage.setItem("placement-season-filter", e.target.value); }} aria-label="Filter by placement season"><option value="">All seasons</option>{(data.seasons || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="btn secondary" onClick={() => downloadCsv("vextra-placement-tracking.csv", exportRows)}><Download size={14} />Export grid</button><button className="btn secondary" onClick={() => window.print()}>Print / PDF</button></div></div><div className="report-stats analytics-stat-grid">{cards.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value || 0}</strong><small>{label === "Company target" ? `${progress}% acquired` : "Across current view"}</small></div>)}<div className="stat"><span>Active pipeline</span><strong>{summary.active_pipeline || 0}</strong><small>{summary.companies_in_pipeline || 0} total, excluding cancelled</small></div><div className="stat"><span>Overdue follow-ups</span><strong className={summary.overdue_followups ? "danger-number" : ""}>{summary.overdue_followups || 0}</strong><small>{summary.expected_next_30_days || 0} expected in 30 days</small></div></div><div className="analytics-overview-grid"><div className="panel analytics-distribution"><div className="panel-head"><div><p className="eyebrow">PIPELINE HEALTH</p><h3>Companies by stage</h3><span className="muted">Where every tracked company sits today.</span></div></div>{placementPipelineStatuses.map(([key, label]) => { const count = Number(statusCounts[key] || 0); const max = Math.max(1, ...Object.values(statusCounts).map(Number)); return <div className="distribution-row" key={key}><span>{label}</span><div className="distribution-bar"><i style={{ width: `${Math.round((count / max) * 100)}%` }} /></div><b>{count}</b></div>; })}</div><div className="panel analytics-signals"><div className="panel-head"><div><p className="eyebrow">SIGNALS</p><h3>Positive and negative outlook</h3><span className="muted">Coordinator-entered confidence indicators.</span></div></div>{placementOutlooks.map(([key, label]) => <div className={`signal-row ${key}`} key={key}><span>{label}</span><b>{outlookCounts[key] || 0}</b></div>)}<div className="signal-divider" /><p className="eyebrow">DRIVE READINESS</p>{placementDriveStatuses.map(([key, label]) => <div className="signal-row compact" key={key}><span>{label}</span><b>{driveStatusCounts[key] || 0}</b></div>)}</div></div><div className="panel target-health"><div><p className="eyebrow">TARGET DELIVERY</p><h3>Company acquisition against admin target</h3><p className="muted">{totals.companies_acquired || 0} acquired of {targetTotals.companies_target || 0} companies declared by the University Admin.</p></div><div className="target-health-value"><strong>{progress}%</strong><div className="target-health-bar"><i style={{ width: `${progress}%` }} /></div></div></div><div className="panel table-panel analytics-grid-panel"><div className="panel-head"><div><p className="eyebrow">PLACEMENT TRACKING GRID</p><h3>Company pipeline detail</h3><span className="muted">Read-only operational view for university admins and data analysts. Coordinators see only the identities permitted by their access policy.</span></div><span className="count">{filteredRows.length} of {rows.length}</span></div><div className="analytics-filter-bar"><div className="search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, manager, category, city…" aria-label="Search placement tracking grid" /></div><select className="filter" value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} aria-label="Filter by placement manager"><option value="">All managers</option>{managers.map((item) => <option key={item.placement_manager_id} value={item.placement_manager_id}>{item.placement_manager_name}</option>)}</select><select className="filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by pipeline status"><option value="">All pipeline stages</option>{placementPipelineStatuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select className="filter" value={outlookFilter} onChange={(e) => setOutlookFilter(e.target.value)} aria-label="Filter by outlook"><option value="">All outlooks</option>{placementOutlooks.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="analytics-grid-scroll" role="region" aria-label="Placement tracking grid" tabIndex="0"><table className="analytics-grid-table"><thead><tr><th>Company</th><th>Owner</th><th>Season</th><th>Category</th><th>Pipeline stage</th><th>Outlook</th><th>Probability</th><th>Expected date</th><th>Drive</th><th>Drive date</th><th>Registered</th><th>Selected</th><th>Offers</th><th>Placed</th><th>Joined</th><th>Follow-up</th><th>Next action</th><th>Updated</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id} className={row.outlook === "negative" || row.pipeline_status === "cancelled" ? "analytics-row-negative" : ""}><td><b>{row.organization_name || "Organization"}</b><small>{row.city || row.industry || "—"}</small></td><td>{row.placement_manager_name || "Placement manager"}</td><td>{row.season_name || "Season"}</td><td>{row.category_name || "Uncategorized"}</td><td><span className={`pipeline-status ${statusClass(row.pipeline_status)}`}>{row.pipeline_status_label || labelFor(placementPipelineStatuses, row.pipeline_status)}</span></td><td><span className={`outlook-pill ${row.outlook || "neutral"}`}>{row.outlook_label || labelFor(placementOutlooks, row.outlook)}</span></td><td>{row.company_probability || 0}%</td><td className={row.expected_date && row.expected_date < new Date().toISOString().slice(0, 10) && !["joined", "cancelled"].includes(row.pipeline_status) ? "danger-number" : ""}>{row.expected_date || "—"}</td><td><span className={`drive-pill ${statusClass(row.drive_status)}`}>{row.drive_status_label || labelFor(placementDriveStatuses, row.drive_status)}</span></td><td>{row.drive_date || "—"}</td><td>{row.students_registered || 0}</td><td>{row.students_selected || 0}</td><td>{row.offers_received || 0}</td><td>{row.students_placed || 0}</td><td>{row.students_joined || 0}</td><td className={row.next_follow_up_date && row.next_follow_up_date < new Date().toISOString().slice(0, 10) && row.pipeline_status !== "cancelled" ? "danger-number" : ""}>{row.next_follow_up_date || "—"}</td><td>{row.next_action || row.notes || "—"}</td><td>{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{!filteredRows.length && <div className="empty-state"><h3>No companies match this view</h3><p className="muted">Add or update placement tracking from Placement Updates.</p></div>}</div></div><div className="analytics-support-grid"><div className="panel table-panel"><div className="panel-head"><div><h3>Season comparison</h3><span className="muted">Cross-season placement outcomes</span></div></div><table><thead><tr><th>Season</th><th>Companies</th><th>Drives</th><th>Offers</th><th>Placed</th></tr></thead><tbody>{seasonRows.map((row) => <tr key={row.season_id}><td>{row.season_name}</td><td>{row.companies_acquired}</td><td>{row.drives_conducted}</td><td>{row.offers_received}</td><td>{row.students_placed}</td></tr>)}</tbody></table>{!seasonRows.length && <div className="empty-state"><p className="muted">No season comparison data yet.</p></div>}</div><div className="panel table-panel"><div className="panel-head"><div><h3>Category trends</h3><span className="muted">Company category performance</span></div></div><table><thead><tr><th>Category</th><th>Companies</th><th>Offers</th><th>Placed</th></tr></thead><tbody>{categoryRows.map((row) => <tr key={row.category_id || "uncategorized"}><td>{row.category_name}</td><td>{row.companies_acquired}</td><td>{row.offers_received}</td><td>{row.students_placed}</td></tr>)}</tbody></table>{!categoryRows.length && <div className="empty-state"><p className="muted">No category trend data yet.</p></div>}</div><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">CITY TRENDS</p><h3>Placement by city</h3></div></div><table><thead><tr><th>City</th><th>Companies</th><th>Drives</th><th>Placed</th></tr></thead><tbody>{cityRows.map((row) => <tr key={row.city}><td>{row.city}</td><td>{row.companies_acquired}</td><td>{row.drives_conducted}</td><td>{row.students_placed}</td></tr>)}</tbody></table>{!cityRows.length && <div className="empty-state"><p className="muted">No city trend data yet.</p></div>}</div><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">MANAGER COMPARISON</p><h3>Performance by placement manager</h3></div></div><table><thead><tr><th>Placement manager</th><th>Companies</th><th>Drives</th><th>Offers</th><th>Placed</th><th>Joined</th></tr></thead><tbody>{managers.map((row) => <tr key={row.placement_manager_id}><td><b>{row.placement_manager_name}</b></td><td>{row.companies_acquired || 0}</td><td>{row.drives_conducted || 0}</td><td>{row.offers_received || 0}</td><td>{row.students_placed || 0}</td><td>{row.students_joined || 0}</td></tr>)}</tbody></table>{!managers.length && <div className="empty-state"><p className="muted">No placement metrics yet.</p></div>}</div></div></div>;
}

function SeasonPeopleStep({ data, users, seasonId, setSeasonId, assignments, teamMembers, onRefresh, onError, onSuccess, onNext }) {
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const assignedIds = new Set(assignments.map((item) => String(item.user_id)));
  const available = teamMembers.filter((item) => !assignedIds.has(String(item.id)));
  const allSelected = available.length > 0 && selectedPeople.length === available.length;
  const toggleAll = () => setSelectedPeople(allSelected ? [] : available.map((item) => item.id));
  const assign = async (event) => { event.preventDefault(); if (!seasonId || !selectedPeople.length) return; setBusy(true); try { await apiFetch("/api/placement/assignments/bulk", { method: "POST", body: JSON.stringify({ season_id: seasonId, user_ids: selectedPeople }) }); await onRefresh(); onSuccess(`${selectedPeople.length} user${selectedPeople.length === 1 ? "" : "s"} added to this season.`); setSelectedPeople([]); } catch (error) { onError(error.message); } finally { setBusy(false); } };
  const remove = async (assignment) => { setRemovingId(assignment.id); try { await apiFetch(`/api/placement/assignments/${assignment.id}`, { method: "DELETE" }); await onRefresh(); setSelectedPeople((current) => current.filter((id) => String(id) !== String(assignment.user_id))); onSuccess("User removed from this season. Their account is unchanged."); } catch (error) { onError(error.message); } finally { setRemovingId(null); } };
  return <div className="setup-grid"><div className="panel form-card"><p className="eyebrow">STEP 2 OF 6</p><h3>Add people to this season</h3><p className="muted">Select one or more coordinators and placement managers. People already assigned to this cycle are hidden.</p><Select label="Season" name="season_id" value={seasonId} onChange={(event) => { setSeasonId(event.target.value); setSelectedPeople([]); }}><option value="">Choose season</option>{(data.seasons || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academic_year}</option>)}</Select><form onSubmit={assign}><div className="select-all-row"><label><input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!available.length || busy || removingId} /> Select all available</label><span>{selectedPeople.length} selected</span></div><div className="people-picker">{available.map((item) => <label className="people-picker-row" key={item.id}><input type="checkbox" checked={selectedPeople.includes(item.id)} onChange={(event) => setSelectedPeople((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><span><b>{item.full_name}</b><small>{item.role.replaceAll("_", " ")} · {item.email}</small></span></label>)}{!available.length && <p className="muted">All available users are already assigned to this season.</p>}</div><button className="btn primary" disabled={busy || removingId || !seasonId || !selectedPeople.length}>{busy ? "Adding users…" : "Add selected users"}</button></form><button type="button" className="btn secondary setup-next" onClick={onNext} disabled={!seasonId || busy || removingId}>Continue to categories</button></div><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">ASSIGNED PEOPLE</p><h3>{data.seasons?.find((item) => String(item.id) === String(seasonId))?.name || "Select a season"}</h3><span className="muted">Removing here only removes the season assignment.</span></div></div><table><thead><tr><th>Person</th><th>Role</th><th>Action</th></tr></thead><tbody>{assignments.map((item) => { const person = users.find((user) => String(user.id) === String(item.user_id)); return <tr key={item.id}><td>{person?.full_name || "Team member"}</td><td>{person?.role?.replaceAll("_", " ") || "—"}</td><td><button type="button" className="text-btn danger" onClick={() => remove(item)} disabled={Boolean(removingId)}>{removingId === item.id ? "Removing…" : "Remove"}</button></td></tr>; })}</tbody></table>{!assignments.length && <div className="empty-state"><p className="muted">No people assigned yet.</p></div>}</div></div>;
}

function CitySelectionStep({ data, onRefresh, onError, onSuccess, onNext }) {
  const [selectedCities, setSelectedCities] = useState([]);
  const [customCity, setCustomCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const existingCities = data.cities || [];
  const existingNames = new Set(existingCities.map((item) => String(item.city).trim().toLowerCase()));
  const options = [...new Map([...commonPlacementCities, ...existingCities.map((item) => item.city)].map((city) => [city.trim().toLowerCase(), city.trim()])).values()];
  const filteredOptions = options.filter((city) => city.toLowerCase().includes(citySearch.trim().toLowerCase()));
  const toggleCity = (city) => setSelectedCities((current) => current.some((item) => item.toLowerCase() === city.toLowerCase()) ? current.filter((item) => item.toLowerCase() !== city.toLowerCase()) : [...current, city]);
  const addCustomCity = () => {
    const value = customCity.trim();
    if (!value || existingNames.has(value.toLowerCase())) { setCustomCity(""); return; }
    setSelectedCities((current) => current.some((city) => city.toLowerCase() === value.toLowerCase()) ? current : [...current, value]);
    setCustomCity("");
  };
  const saveCities = async (event) => {
    event.preventDefault();
    if (!selectedCities.length) { onError("Choose at least one new city or enter a custom city."); return; }
    setBusy(true);
    try { await apiFetch("/api/placement/cities/bulk", { method: "POST", body: JSON.stringify({ cities: selectedCities }) }); await onRefresh(); onSuccess(`${selectedCities.length} ${selectedCities.length === 1 ? "city" : "cities"} added to your university list.`); setSelectedCities([]); } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  return <div className="setup-grid"><form className="panel form-card" onSubmit={saveCities}><p className="eyebrow">STEP 4 OF 6</p><h3>Configure allowed cities</h3><p className="muted">Choose multiple common cities with simple clicks. Add a custom city when it is not in the list.</p><div className="city-picker-field"><span>Common cities</span><div className="city-multi-picker"><button type="button" className="city-picker-toggle" onClick={() => setCityMenuOpen((open) => !open)} aria-expanded={cityMenuOpen}>{selectedCities.length ? `${selectedCities.length} cities selected` : "Choose cities"}<span>⌄</span></button>{cityMenuOpen && <div className="city-picker-menu"><input className="city-picker-search" value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="Search cities" autoFocus /><div className="city-picker-options">{filteredOptions.map((city) => { const alreadyAllowed = existingNames.has(city.toLowerCase()); return <label className={`city-option ${alreadyAllowed ? "already-allowed" : ""}`} key={city}><input type="checkbox" checked={selectedCities.some((item) => item.toLowerCase() === city.toLowerCase())} onChange={() => toggleCity(city)} disabled={alreadyAllowed} /><span>{city}</span>{alreadyAllowed && <small>Already allowed</small>}</label>; })}{!filteredOptions.length && <p className="muted city-picker-empty">No matching cities.</p>}</div></div>}</div></div><div className="custom-city-row"><label className="field"><span>Custom city</span><input value={customCity} onChange={(event) => setCustomCity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomCity(); } }} placeholder="e.g. Tirupati" /></label><button type="button" className="btn secondary" onClick={addCustomCity} disabled={!customCity.trim() || busy}>Add city</button></div><div className="selected-city-summary"><b>{selectedCities.length} new {selectedCities.length === 1 ? "city" : "cities"} selected</b>{selectedCities.length > 0 && <div className="city-chips">{selectedCities.map((city) => <button type="button" key={city} onClick={() => setSelectedCities((current) => current.filter((item) => item !== city))}>{city} ×</button>)}</div>}</div><button className="btn primary" disabled={busy || !selectedCities.length}>{busy ? "Saving cities…" : "Save selected cities"}</button><button type="button" className="btn secondary setup-next" onClick={onNext} disabled={busy}>Continue to targets</button></form><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">ALLOWED LOCATIONS</p><h3>Company city options</h3><span className="muted">These options are available when companies are added.</span></div></div><div className="allowed-city-list">{existingCities.map((item) => <span className="city-chip" key={item.id}>{item.city}</span>)}</div>{!existingCities.length && <div className="empty-state"><p className="muted">No cities added yet.</p></div>}</div></div>;
}

function PlacementSetupWizard({ data, users, onRefresh, onError, onSuccess }) {
  const [step, setStep] = useState(1);
  const [seasonId, setSeasonId] = useState(data.seasons?.[0]?.id || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!seasonId && data.seasons?.[0]?.id) setSeasonId(data.seasons[0].id); }, [data.seasons, seasonId]);
  const run = async (event, path, payload, nextStep) => {
    const form = event.currentTarget;
    event.preventDefault(); setBusy(true);
    try { const result = await apiFetch(path, { method: "POST", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Saved successfully."); if (result?.id && path.endsWith("/seasons")) setSeasonId(result.id); if (nextStep) setStep(nextStep); form.reset(); } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  const currentSeason = data.seasons?.find((item) => String(item.id) === String(seasonId));
  const assignments = (data.assignments || []).filter((item) => String(item.season_id) === String(seasonId));
  const teamMembers = (users || []).filter((item) => ["coordinator", "placement_manager"].includes(item.role));
  const coordinators = (users || []).filter((item) => item.role === "coordinator");
  const steps = [[1, "Season", "Create the placement cycle"], [2, "People", "Add users to the cycle"], [3, "Categories", "Define your CTC bands"], [4, "Cities", "Choose allowed locations"], [5, "Targets", "Set team goals"], [6, "Access", "Control visibility"]];
  return <div className="setup-wizard"><div className="section-heading"><div><p className="eyebrow">UNIVERSITY ADMIN SETUP</p><h2>Configure placements step by step</h2><p className="muted">Complete each step in order. Your university controls its own seasons, categories, cities, targets, and access.</p></div></div><div className="setup-steps">{steps.map(([number, label, hint]) => <button type="button" key={number} className={`setup-step ${step === number ? "active" : ""} ${step > number ? "complete" : ""}`} onClick={() => setStep(number)}><span>{step > number ? "✓" : number}</span><b>{label}</b><small>{hint}</small></button>)}</div><div className="setup-step-content">
    {step === 1 && <form className="panel form-card" onSubmit={(event) => run(event, "/api/placement/seasons", { name: new FormData(event.currentTarget).get("name"), academic_year: new FormData(event.currentTarget).get("academic_year"), start_date: new FormData(event.currentTarget).get("start_date"), end_date: new FormData(event.currentTarget).get("end_date"), status: new FormData(event.currentTarget).get("status") }, 2)}><p className="eyebrow">STEP 1 OF 6</p><h3>Create a placement season</h3><p className="muted">A season is an independent placement cycle. Multiple seasons can be active at the same time.</p><Field label="Season name" name="name" placeholder="Campus placements" /><div className="form-grid"><Field label="Academic year" name="academic_year" placeholder="2026–2027" /><Select label="Status" name="status" defaultValue="active"><option value="active">Active</option><option value="completed">Completed</option></Select></div><div className="form-grid"><Field label="Start date" name="start_date" type="date" /><Field label="End date" name="end_date" type="date" /></div><button className="btn primary" disabled={busy}>Create season and continue</button></form>}
    {step === 2 && <SeasonPeopleStep data={data} users={users} seasonId={seasonId} setSeasonId={setSeasonId} assignments={assignments} teamMembers={teamMembers} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} onNext={() => setStep(3)} />}
    {step === 3 && <div className="setup-grid"><form className="panel form-card" onSubmit={(event) => { const form = new FormData(event.currentTarget); return run(event, "/api/placement/categories", { name: form.get("name"), min_ctc_lpa: form.get("min_ctc_lpa") ? Number(form.get("min_ctc_lpa")) : null, max_ctc_lpa: form.get("max_ctc_lpa") ? Number(form.get("max_ctc_lpa")) : null, description: form.get("description") }); }}><p className="eyebrow">STEP 3 OF 6</p><h3>Define company categories</h3><p className="muted">There are no platform defaults. Create the category names and CTC ranges used by your university.</p><Field label="Category name" name="name" placeholder="e.g. Dream, Super Dream, Core" /><div className="form-grid"><Field label="Minimum CTC (LPA)" name="min_ctc_lpa" type="number" step="0.01" /><Field label="Maximum CTC (LPA)" name="max_ctc_lpa" type="number" step="0.01" /></div><Field label="What does this category mean?" name="description" placeholder="Optional explanation for your team" required={false} /><button className="btn primary" disabled={busy}>Add university category</button><button type="button" className="btn secondary setup-next" onClick={() => setStep(4)}>Continue to cities</button></form><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">YOUR CATEGORIES</p><h3>Visible to coordinators and placement managers</h3></div></div><table><thead><tr><th>Category</th><th>CTC range</th></tr></thead><tbody>{(data.categories || []).map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.description || "University-defined category"}</small></td><td>{item.min_ctc_lpa ?? 0}–{item.max_ctc_lpa ?? "No upper limit"} LPA</td></tr>)}</tbody></table>{!data.categories?.length && <div className="empty-state"><p className="muted">Add your first category.</p></div>}</div></div>}
    {step === 4 && <CitySelectionStep data={data} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} onNext={() => setStep(5)} />}
    {step === 5 && <div className="setup-grid"><form className="panel form-card" onSubmit={(event) => { const form = new FormData(event.currentTarget); return run(event, "/api/placement/targets", { season_id: form.get("season_id"), user_id: form.get("user_id"), category_id: form.get("category_id"), companies_target: Number(form.get("companies_target") || 0) }); }}><p className="eyebrow">STEP 5 OF 6</p><h3>Declare manager targets</h3><p className="muted">Set one measurable company target for each placement manager and category. Coordinators and managers record drives and student outcomes later.</p><Select label="Season" name="season_id" defaultValue={seasonId}><option value="">Choose season</option>{(data.seasons || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select label="Placement manager" name="user_id" required><option value="">Choose placement manager</option>{teamMembers.filter((item) => item.role === "placement_manager").map((item) => <option key={item.id} value={item.id}>{item.full_name} · placement manager</option>)}</Select><Select label="Company category" name="category_id" required><option value="">Choose category</option>{(data.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Field label="Company target" name="companies_target" type="number" min="0" defaultValue="0" /><small className="form-help">How many companies should this manager bring into this category for the selected season?</small><button className="btn primary" disabled={busy}>Save manager target</button><button type="button" className="btn secondary setup-next" onClick={() => setStep(6)}>Continue to access</button></form><div className="panel table-panel target-setup-table"><div className="panel-head"><div><p className="eyebrow">TARGETS SAVED</p><h3>Manager targets by category</h3><span className="muted">Declared by University Admin</span></div></div><table><thead><tr><th>Season</th><th>Manager</th><th>Category</th><th>Company target</th></tr></thead><tbody>{(data.targets || []).map((item) => <tr key={item.id}><td>{data.seasons?.find((season) => String(season.id) === String(item.season_id))?.name || "Season"}</td><td>{users.find((person) => String(person.id) === String(item.user_id))?.full_name || "Team member"}</td><td>{data.categories?.find((category) => String(category.id) === String(item.category_id))?.name || "Category"}</td><td><b>{item.companies_target || 0}</b></td></tr>)}</tbody></table>{!data.targets?.length && <div className="empty-state"><p className="muted">No manager targets saved yet.</p></div>}</div></div>}
    {step === 6 && <div className="setup-access-step"><div className="panel setup-access-intro"><p className="eyebrow">STEP 6 OF 6</p><h3>Set team access</h3><p className="muted">Choose exactly what each coordinator can see. Without a grant, company and contact details stay masked.</p><span className="access-flow-hint">Select coordinator → choose access level → select areas → save policy</span></div><AccessGrantPanel users={users} grants={data.access} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} /><div className="panel setup-complete"><span className="setup-complete-icon">✓</span><div><h3>Placement setup is ready</h3><p className="muted">You can return to any step at any time to update your university configuration.</p></div><button type="button" className="btn secondary" onClick={() => setStep(1)}>Review from the beginning</button></div></div>}
  </div></div>;
}

function PlacementSetup({ data, users, onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const submit = async (path, payload) => {
    setBusy(true);
    try { await apiFetch(path, { method: "POST", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Placement setup saved."); } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return <div className="dashboard"><div className="section-heading"><div><p className="eyebrow">UNIVERSITY CONFIGURATION</p><h2>Placement setup</h2><p className="muted">Manage independent seasons, salary categories, targets, access, and allowed cities.</p></div></div><div className="two-column"><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/seasons", { name: f.get("name"), academic_year: f.get("academic_year"), start_date: f.get("start_date"), end_date: f.get("end_date"), status: f.get("status") }); }}><h3>New placement season</h3><Field label="Season name" name="name" placeholder="Campus placements" /><Field label="Academic year" name="academic_year" placeholder="2026-2027" /><div className="form-grid"><Field label="Start date" name="start_date" type="date" /><Field label="End date" name="end_date" type="date" /></div><Select label="Status" name="status" defaultValue="active"><option value="active">Active</option><option value="completed">Completed</option></Select><button className="btn primary" disabled={busy}>Create season</button></form><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/categories", { name: f.get("name"), min_ctc_lpa: f.get("min_ctc_lpa") ? Number(f.get("min_ctc_lpa")) : null, max_ctc_lpa: f.get("max_ctc_lpa") ? Number(f.get("max_ctc_lpa")) : null, description: f.get("description") }); }}><h3>New company category</h3><Field label="Category name" name="name" placeholder="Dream" /><div className="form-grid"><Field label="Minimum CTC (LPA)" name="min_ctc_lpa" type="number" step="0.01" /><Field label="Maximum CTC (LPA)" name="max_ctc_lpa" type="number" step="0.01" /></div><Field label="Description" name="description" placeholder="Companies in this category" /><button className="btn primary" disabled={busy}>Create category</button></form><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/cities", { city: f.get("city") }); }}><h3>Add allowed city</h3><Field label="City" name="city" placeholder="Bengaluru" /><button className="btn primary" disabled={busy}>Add city</button></form><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/targets", { season_id: f.get("season_id"), user_id: f.get("user_id"), category_id: f.get("category_id") || null, companies_target: Number(f.get("companies_target") || 0), drives_target: Number(f.get("drives_target") || 0), offers_target: Number(f.get("offers_target") || 0), students_placed_target: Number(f.get("students_placed_target") || 0), students_joined_target: Number(f.get("students_joined_target") || 0) }); }}><h3>Set placement target</h3><Select label="Season" name="season_id"><option value="">Choose season</option>{(data.seasons || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Select label="Team member" name="user_id"><option value="">Choose member</option>{(users || []).filter((u) => ["coordinator", "placement_manager"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</Select><Select label="Category" name="category_id"><option value="">All categories</option>{(data.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><div className="form-grid">{[["companies_target", "Companies"], ["drives_target", "Drives"], ["offers_target", "Offers"], ["students_placed_target", "Placed students"], ["students_joined_target", "Joined students"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue="0" />)}</div><button className="btn primary" disabled={busy}>Save target</button></form></div><div className="panel table-panel"><h3>Configured seasons</h3><table><thead><tr><th>Name</th><th>Academic year</th><th>Dates</th><th>Status</th></tr></thead><tbody>{(data.seasons || []).map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.academic_year}</td><td>{s.start_date} – {s.end_date}</td><td><span className={`badge ${s.status}`}>{s.status}</span></td></tr>)}</tbody></table></div></div>;
}

function SeasonAssignmentPanel({ seasons = [], assignments = [], users = [], onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const assign = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await apiFetch("/api/placement/assignments", { method: "POST", body: JSON.stringify({ season_id: form.get("season_id"), user_id: form.get("user_id") }) });
      await onRefresh();
      onSuccess("Placement season assigned.");
      event.currentTarget.reset();
    } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  const names = new Map(users.map((item) => [String(item.id), item.full_name]));
  const seasonNames = new Map(seasons.map((item) => [String(item.id), `${item.name} · ${item.academic_year}`]));
  return <div className="two-column"><form className="panel form-card" onSubmit={assign}><h3>Assign placement season</h3><p className="muted form-help">Choose who owns each season’s placement work. A person can be assigned to multiple seasons.</p><Select label="Placement season" name="season_id"><option value="">Choose season</option>{seasons.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academic_year}</option>)}</Select><Select label="Coordinator or placement manager" name="user_id"><option value="">Choose team member</option>{users.filter((item) => ["coordinator", "placement_manager"].includes(item.role)).map((item) => <option key={item.id} value={item.id}>{item.full_name} · {item.role.replaceAll("_", " ")}</option>)}</Select><button className="btn primary" disabled={busy}>Assign season</button></form><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">CURRENT ASSIGNMENTS</p><h3>Season ownership</h3></div></div><table><thead><tr><th>Season</th><th>Assigned member</th></tr></thead><tbody>{assignments.map((item) => <tr key={item.id}><td>{seasonNames.get(String(item.season_id)) || "Season"}</td><td>{names.get(String(item.user_id)) || "Team member"}</td></tr>)}</tbody></table>{!assignments.length && <div className="empty-state"><p className="muted">No season assignments yet.</p></div>}</div></div>;
}

function TargetPermissionPanel({ enabled, onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const save = async (event) => { const value = event.target.checked; setBusy(true); try { await apiFetch("/api/placement/settings", { method: "PATCH", body: JSON.stringify({ coordinator_target_entry_enabled: value }) }); await onRefresh(); onSuccess(value ? "Coordinator target entry enabled." : "Coordinator target entry disabled."); } catch (error) { event.target.checked = !value; onError(error.message); } finally { setBusy(false); } };
  return <div className="panel settings"><div className="setting-row"><div><b>Allow coordinators to enter targets</b><small>When enabled, coordinators can set targets for their reporting scope. University Admin approval remains in control.</small></div><label className="switch"><input type="checkbox" checked={Boolean(enabled)} onChange={save} disabled={busy} /><span /></label></div></div>;
}

function TargetEntryPanel({ data, users, onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const save = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); try { await apiFetch("/api/placement/targets", { method: "POST", body: JSON.stringify({ season_id: form.get("season_id"), user_id: form.get("user_id"), category_id: form.get("category_id") || null, companies_target: Number(form.get("companies_target") || 0), drives_target: Number(form.get("drives_target") || 0), offers_target: Number(form.get("offers_target") || 0), students_placed_target: Number(form.get("students_placed_target") || 0), students_joined_target: Number(form.get("students_joined_target") || 0) }) }); await onRefresh(); onSuccess("Target saved."); event.currentTarget.reset(); } catch (error) { onError(error.message); } finally { setBusy(false); } };
  return <div className="dashboard"><div className="section-heading"><div><p className="eyebrow">COORDINATOR WORKSPACE</p><h2>Set placement targets</h2><p className="muted">Set targets for team members in your reporting scope by season and company category.</p></div></div><form className="panel form-card" onSubmit={save}><div className="form-grid"><Select label="Season" name="season_id"><option value="">Choose season</option>{(data.seasons || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academic_year}</option>)}</Select><Select label="Team member" name="user_id"><option value="">Choose team member</option>{(users || []).filter((item) => ["coordinator", "placement_manager"].includes(item.role)).map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</Select></div><Select label="Company category" name="category_id"><option value="">All categories</option>{(data.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><div className="form-grid">{[["companies_target", "Companies"], ["drives_target", "Drives"], ["offers_target", "Offers"], ["students_placed_target", "Placed students"], ["students_joined_target", "Joined students"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue="0" />)}</div><button className="btn primary" disabled={busy}>Save target</button></form></div>;
}

function DuplicateApprovals({ requests, onRefresh, onError, onSuccess }) {
  const review = async (id, status) => { try { await apiFetch(`/api/placement/duplicate-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await onRefresh(); onSuccess(`Request ${status}.`); } catch (e) { onError(e.message); } };
  return <div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">CONTROLLED COLLABORATION</p><h2>Duplicate company approvals</h2><p className="muted">Only a University Admin can approve a second company record.</p></div></div><table><thead><tr><th>Requested company</th><th>Requested by</th><th>Status</th><th>Actions</th></tr></thead><tbody>{(requests || []).map((request) => <tr key={request.id}><td><b>{request.requested_name}</b></td><td>{request.requested_by}</td><td><span className={`badge ${request.status}`}>{request.status}</span></td><td>{request.status === "pending" && <><button className="text-btn" onClick={() => review(request.id, "approved")}>Approve</button><button className="delete-btn" onClick={() => review(request.id, "rejected")}>Reject</button></>}</td></tr>)}</tbody></table>{!requests?.length && <div className="empty-state"><h3>No approval requests</h3><p className="muted">Duplicate company requests will appear here.</p></div>}</div>;
}

function AccessGrantPanel({ users, grants = [], onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const coordinators = (users || []).filter((u) => u.role === "coordinator");
  const areas = [["organizations", "Organizations", "Company names, owners, cities, and pipeline status"], ["contacts", "Contacts", "Contact names, email, phone, and relationship details"], ["meeting_reports", "Meeting reports", "Meeting outcomes, notes, and follow-up actions"]];
  const [selectedUser, setSelectedUser] = useState("");
  const [accessLevel, setAccessLevel] = useState("full");
  const [permissions, setPermissions] = useState(() => Object.fromEntries(areas.map(([key]) => [key, true])));
  useEffect(() => {
    const grant = grants.find((item) => String(item.granted_to) === String(selectedUser));
    if (!grant) { setAccessLevel("full"); setPermissions(Object.fromEntries(areas.map(([key]) => [key, true]))); return; }
    setAccessLevel(grant.access_level || "full");
    setPermissions(
      Object.fromEntries(
        areas.map(([key]) => [key, grant.access_level === "full" ? true : Boolean(grant.permissions?.[key])]),
      ),
    );
  }, [selectedUser, grants]);
  const selectUser = (event) => setSelectedUser(event.target.value);
  const save = async (event) => {
    event.preventDefault();
    if (!selectedUser) { onError("Choose a coordinator first."); return; }
    if (accessLevel === "partial" && !Object.values(permissions).some(Boolean)) { onError("Select at least one area for partial access."); return; }
    setBusy(true);
    try { await apiFetch("/api/placement/access", { method: "POST", body: JSON.stringify({ user_id: selectedUser, access_level: accessLevel, permissions }) }); await onRefresh(); onSuccess(`${accessLevel === "full" ? "Full" : "Partial"} access policy saved.`); } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  const grantLabel = (item) => item.access_level === "partial" ? areas.filter(([key]) => item.permissions?.[key]).map(([, label]) => label).join(", ") || "No areas selected" : "All CRM areas";
  return <div className="access-policy-layout"><form className="panel form-card access-policy-form" onSubmit={save}><div className="panel-head"><div><p className="eyebrow">ACCESS POLICY</p><h3>Choose what this coordinator can see</h3><span className="muted">Access changes are controlled by the University Admin.</span></div></div><Select label="Coordinator" name="user_id" value={selectedUser} onChange={selectUser}><option value="">Choose coordinator</option>{coordinators.map((u) => <option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}</Select><div className="access-level-options"><label className={`access-level-option ${accessLevel === "full" ? "selected" : ""}`}><input type="radio" name="access_level" value="full" checked={accessLevel === "full"} onChange={() => setAccessLevel("full")} /><span><b>Full access</b><small>Reveal all permitted organization, contact, report, and analytics details.</small></span></label><label className={`access-level-option ${accessLevel === "partial" ? "selected" : ""}`}><input type="radio" name="access_level" value="partial" checked={accessLevel === "partial"} onChange={() => setAccessLevel("partial")} /><span><b>Partial access</b><small>Reveal only the areas selected below. Everything else remains masked.</small></span></label></div>{accessLevel === "partial" && <div className="access-area-grid"><p className="form-help">Select one or more areas</p>{areas.map(([key, label, description]) => <label className="access-area-option" key={key}><input type="checkbox" checked={Boolean(permissions[key])} onChange={(event) => setPermissions((current) => ({ ...current, [key]: event.target.checked }))} /><span><b>{label}</b><small>{description}</small></span></label>)}</div>}<div className="access-policy-note">{selectedUser ? <span>{accessLevel === "full" ? "This coordinator will see all CRM details." : `${Object.values(permissions).filter(Boolean).length} of ${areas.length} areas selected.`}</span> : <span>Select a coordinator to create or edit their policy.</span>}</div><button className="btn primary" disabled={busy || !selectedUser}>{busy ? "Saving policy…" : "Save access policy"}</button></form><div className="panel table-panel access-history-panel"><div className="panel-head"><div><p className="eyebrow">CURRENT POLICIES</p><h3>Coordinator access</h3><span className="muted">Select a row to edit its policy.</span></div></div><table><thead><tr><th>Coordinator</th><th>Access</th><th>Areas</th><th>Granted</th><th>Action</th></tr></thead><tbody>{grants.map((item) => <tr key={item.id}><td><b>{coordinators.find((u) => String(u.id) === String(item.granted_to))?.full_name || "Coordinator"}</b></td><td><span className={`badge ${item.access_level === "partial" ? "prospect" : "active"}`}>{item.access_level || "full"}</span></td><td>{grantLabel(item)}</td><td>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td><td><button type="button" className="text-btn" onClick={() => setSelectedUser(item.granted_to)}>Edit</button></td></tr>)}</tbody></table>{!grants.length && <div className="empty-state"><p className="muted">No coordinator access policies configured.</p></div>}</div></div>;
}

function PlacementEditPanel({ data, users, onRefresh, onError, onSuccess }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const type = editing.type;
    const payload = type === "season"
      ? { name: f.get("name"), academic_year: f.get("academic_year"), start_date: f.get("start_date"), end_date: f.get("end_date"), status: f.get("status") }
      : type === "category"
        ? { name: f.get("name"), min_ctc_lpa: f.get("min_ctc_lpa") ? Number(f.get("min_ctc_lpa")) : null, max_ctc_lpa: f.get("max_ctc_lpa") ? Number(f.get("max_ctc_lpa")) : null, description: f.get("description") }
        : type === "city" ? { city: f.get("city") } : { season_id: f.get("season_id"), user_id: f.get("user_id"), category_id: f.get("category_id") || null, companies_target: Number(f.get("companies_target") || 0), drives_target: Number(f.get("drives_target") || 0), offers_target: Number(f.get("offers_target") || 0), students_placed_target: Number(f.get("students_placed_target") || 0), students_joined_target: Number(f.get("students_joined_target") || 0) };
    const path = type === "season" ? `/api/placement/seasons/${editing.item.id}` : type === "category" ? `/api/placement/categories/${editing.item.id}` : type === "city" ? `/api/placement/cities/${editing.item.id}` : "/api/placement/targets";
    setBusy(true);
    try { await apiFetch(path, { method: type === "target" ? "POST" : "PATCH", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Placement configuration updated."); setEditing(null); } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  if (editing) {
    const item = editing.item;
    return <form className="panel form-card" onSubmit={save}><div className="panel-head"><h3>Edit {editing.type}</h3><button type="button" className="text-btn" onClick={() => setEditing(null)}>Cancel</button></div>{editing.type === "season" && <><Field label="Season name" name="name" defaultValue={item.name} /><Field label="Academic year" name="academic_year" defaultValue={item.academic_year} /><div className="form-grid"><Field label="Start date" name="start_date" type="date" defaultValue={item.start_date} /><Field label="End date" name="end_date" type="date" defaultValue={item.end_date} /></div><Select label="Status" name="status" defaultValue={item.status}><option value="active">Active</option><option value="completed">Completed</option></Select></>}{editing.type === "category" && <><Field label="Category name" name="name" defaultValue={item.name} /><div className="form-grid"><Field label="Minimum CTC (LPA)" name="min_ctc_lpa" type="number" step="0.01" defaultValue={item.min_ctc_lpa ?? ""} /><Field label="Maximum CTC (LPA)" name="max_ctc_lpa" type="number" step="0.01" defaultValue={item.max_ctc_lpa ?? ""} /></div><Field label="Description" name="description" required={false} defaultValue={item.description || ""} /></>}{editing.type === "city" && <Field label="City" name="city" defaultValue={item.city} />}{editing.type === "target" && <><Select label="Season" name="season_id" defaultValue={item.season_id}>{(data.seasons || []).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</Select><Select label="Team member" name="user_id" defaultValue={item.user_id}>{(users || []).filter((u) => ["coordinator", "placement_manager"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</Select><Select label="Category" name="category_id" defaultValue={item.category_id || ""}><option value="">All categories</option>{(data.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><div className="form-grid">{[["companies_target", "Companies"], ["drives_target", "Drives"], ["offers_target", "Offers"], ["students_placed_target", "Placed students"], ["students_joined_target", "Joined students"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue={item[name] || 0} />)}</div></>}<button className="btn primary" disabled={busy}>Save changes</button></form>;
  }
  return <div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">CONFIGURATION RECORDS</p><h3>Edit placement setup</h3></div></div><div className="edit-record-grid"><div><b>Seasons</b>{(data.seasons || []).map((item) => <div className="record-row" key={item.id}><span>{item.name}</span><button className="text-btn" onClick={() => setEditing({ type: "season", item })}><Pencil size={13} />Edit</button></div>)}</div><div><b>Categories</b>{(data.categories || []).map((item) => <div className="record-row" key={item.id}><span>{item.name}</span><button className="text-btn" onClick={() => setEditing({ type: "category", item })}><Pencil size={13} />Edit</button></div>)}</div><div><b>Allowed cities</b>{(data.cities || []).map((item) => <div className="record-row" key={item.id}><span>{item.city}</span><button className="text-btn" onClick={() => setEditing({ type: "city", item })}><Pencil size={13} />Edit</button></div>)}</div><div><b>Targets</b>{(data.targets || []).map((item) => <div className="record-row" key={item.id}><span>{item.companies_target} companies · {item.students_placed_target} placed</span><button className="text-btn" onClick={() => setEditing({ type: "target", item })}><Pencil size={13} />Edit</button></div>)}</div></div></div>;
}

function PlacementMetricFields({ initial = {} }) {
  return <><div className="form-grid"><Select label="Pipeline status" name="pipeline_status" defaultValue={initial.pipeline_status || "prospect"}>{placementPipelineStatuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select><Select label="Outlook" name="outlook" defaultValue={initial.outlook || "neutral"}>{placementOutlooks.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div><div className="form-grid"><Select label="Drive status" name="drive_status" defaultValue={initial.drive_status || "not_scheduled"}>{placementDriveStatuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select><Field label="Company probability (%)" name="company_probability" type="number" min="0" max="100" defaultValue={initial.company_probability ?? 0} /></div><div className="form-grid"><Field label="Expected company date" name="expected_date" type="date" required={false} defaultValue={initial.expected_date || ""} /><Field label="Drive date" name="drive_date" type="date" required={false} defaultValue={initial.drive_date || ""} /></div><div className="form-grid"><Field label="Last contact date" name="last_contact_date" type="date" required={false} defaultValue={initial.last_contact_date || ""} /><Field label="Next follow-up date" name="next_follow_up_date" type="date" required={false} defaultValue={initial.next_follow_up_date || ""} /></div><div className="form-grid metric-number-grid">{[["companies_acquired", "Companies acquired"], ["drives_conducted", "Drives conducted"], ["offers_received", "Offers received"], ["students_registered", "Students registered"], ["students_selected", "Students selected"], ["students_placed", "Students placed"], ["students_joined", "Students joined"], ["students_rejected", "Students rejected"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue={initial[name] ?? 0} />)}</div><Field label="Next action" name="next_action" required={false} defaultValue={initial.next_action || ""} placeholder="e.g. Confirm hiring panel and drive slots" /><Field label="Notes" name="notes" required={false} defaultValue={initial.notes || ""} placeholder="Add context for the placement team" /></>;
}

function metricPayload(form) {
  const number = (name) => Number(form.get(name) || 0);
  const optional = (name) => form.get(name) || null;
  return { season_id: form.get("season_id"), organization_id: form.get("organization_id"), category_id: optional("category_id"), pipeline_status: form.get("pipeline_status") || "prospect", outlook: form.get("outlook") || "neutral", expected_date: optional("expected_date"), drive_date: optional("drive_date"), last_contact_date: optional("last_contact_date"), next_follow_up_date: optional("next_follow_up_date"), drive_status: form.get("drive_status") || "not_scheduled", company_probability: number("company_probability"), companies_acquired: number("companies_acquired"), drives_conducted: number("drives_conducted"), offers_received: number("offers_received"), students_registered: number("students_registered"), students_selected: number("students_selected"), students_placed: number("students_placed"), students_joined: number("students_joined"), students_rejected: number("students_rejected"), next_action: optional("next_action"), notes: optional("notes") };
}

function PlacementMetrics({ data, organizations, onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const saveMetric = async (e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy(true); try { await apiFetch("/api/placement/metrics", { method: "POST", body: JSON.stringify(metricPayload(f)) }); await onRefresh(); onSuccess("Placement tracking saved."); form.reset(); } catch (e2) { onError(e2.message); } finally { setBusy(false); } };
  return <div className="dashboard"><div className="section-heading"><div><p className="eyebrow">PLACEMENT MANAGER WORKFLOW</p><h2>Placement tracking updates</h2><p className="muted">Record pipeline movement, expected dates, drive readiness, student outcomes, and the next action for each company.</p></div></div><form className="panel form-card" onSubmit={saveMetric}><div className="form-grid"><Select label="Placement season" name="season_id"><option value="">Choose season</option>{(data.seasons || []).map((s) => <option value={s.id} key={s.id}>{s.name} · {s.academic_year}</option>)}</Select><Select label="Organization" name="organization_id"><option value="">Choose organization</option>{organizations.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</Select></div><Select label="Company category" name="category_id"><option value="">Uncategorized</option>{(data.categories || []).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</Select><PlacementMetricFields /><button className="btn primary" disabled={busy}>Save placement update</button></form><PlacementMetricEditorV2 metrics={data.metrics} seasons={data.seasons} organizations={organizations} categories={data.categories} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} /><PlacementAnalytics analytics={data.analytics} data={data} role="placement_manager" /></div>;
}

function PlacementMetricEditorV2({ metrics, seasons, organizations, categories, onRefresh, onError, onSuccess }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (event) => { event.preventDefault(); const payload = metricPayload(new FormData(event.currentTarget)); setBusy(true); try { await apiFetch("/api/placement/metrics", { method: "POST", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Placement tracking updated."); setEditing(null); } catch (error) { onError(error.message); } finally { setBusy(false); } };
  if (!metrics?.length) return null;
  return <div className="panel table-panel"><div className="panel-head"><h3>Saved placement tracking</h3></div>{editing ? <form className="form-card" onSubmit={save}><div className="form-grid"><Select label="Season" name="season_id" defaultValue={editing.season_id}>{(seasons || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Select label="Organization" name="organization_id" defaultValue={editing.organization_id}>{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></div><Select label="Category" name="category_id" defaultValue={editing.category_id || ""}><option value="">Uncategorized</option>{(categories || []).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</Select><PlacementMetricFields initial={editing} /><button className="btn primary" disabled={busy}>Save changes</button><button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button></form> : <div className="analytics-grid-scroll"><table><thead><tr><th>Organization</th><th>Season</th><th>Pipeline</th><th>Outlook</th><th>Expected date</th><th>Drive</th><th>Placed</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{metrics.map((item) => <tr key={item.id}><td>{organizations.find((o) => String(o.id) === String(item.organization_id))?.name || "Organization"}</td><td>{seasons.find((s) => String(s.id) === String(item.season_id))?.name || "Season"}</td><td>{placementPipelineStatuses.find(([key]) => key === item.pipeline_status)?.[1] || "Prospect"}</td><td>{placementOutlooks.find(([key]) => key === item.outlook)?.[1] || "Neutral"}</td><td>{item.expected_date || "—"}</td><td>{placementDriveStatuses.find(([key]) => key === item.drive_status)?.[1] || "Not scheduled"}</td><td>{item.students_placed || 0}</td><td>{item.students_joined || 0}</td><td><button className="text-btn" onClick={() => setEditing(item)}><Pencil size={13} />Edit</button></td></tr>)}</tbody></table></div>}</div>;
}

function PlacementMetricEditor({ metrics, seasons, organizations, categories, onRefresh, onError, onSuccess }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (event) => { event.preventDefault(); const f = new FormData(event.currentTarget); const payload = metricPayload(f); setBusy(true); try { await apiFetch("/api/placement/metrics", { method: "POST", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Placement tracking updated."); setEditing(null); } catch (error) { onError(error.message); } finally { setBusy(false); } };
  if (!metrics?.length) return null;
  return <div className="panel table-panel"><div className="panel-head"><h3>Saved metrics</h3></div>{editing ? <form className="form-card" onSubmit={save}><div className="form-grid"><Select label="Season" name="season_id" defaultValue={editing.season_id}>{(seasons || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Select label="Organization" name="organization_id" defaultValue={editing.organization_id}>{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></div><Select label="Category" name="category_id" defaultValue={editing.category_id || ""}><option value="">Uncategorized</option>{(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><div className="form-grid">{[["companies_acquired", "Companies acquired"], ["drives_conducted", "Drives conducted"], ["offers_received", "Offers received"], ["students_placed", "Students placed"], ["students_joined", "Students joined"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue={editing[name] || 0} />)}</div><button className="btn primary" disabled={busy}>Save changes</button><button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button></form> : <table><thead><tr><th>Organization</th><th>Season</th><th>Placed</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{metrics.map((item) => <tr key={item.id}><td>{organizations.find((o) => String(o.id) === String(item.organization_id))?.name || "Organization"}</td><td>{seasons.find((s) => String(s.id) === String(item.season_id))?.name || "Season"}</td><td>{item.students_placed}</td><td>{item.students_joined}</td><td><button className="text-btn" onClick={() => setEditing(item)}><Pencil size={13} />Edit</button></td></tr>)}</tbody></table>}</div>;
}
const root =
  globalThis.__placementCrmRoot || createRoot(document.getElementById("root"));
globalThis.__placementCrmRoot = root;
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
