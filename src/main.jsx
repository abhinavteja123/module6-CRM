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
  Sparkles,
  CalendarDays,
  AlertTriangle,
  ListChecks,
  ArrowUpRight,
  Target,
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
  ["in_talks", "In progress"],
  ["discussion", "Discussion"],
  ["proposal_shared", "Proposal shared"],
  ["negotiation", "Negotiation"],
  ["drive_scheduled", "Drive scheduled"],
  ["drive_ongoing", "Drive ongoing"],
  ["drive_completed", "Drive completed"],
  ["offer_stage", "Offer stage"],
  ["placed", "Placed"],
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
        onClose?.();
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

function Modal({ title, onClose, children, dismissible = true }) {
  const dialogRef = useRef(null);
  useDialogBehavior(dialogRef, dismissible ? onClose : null);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (dismissible && event.target === event.currentTarget) onClose?.(); }}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <h3 id="modal-title">{title}</h3>
          {dismissible && <button type="button" className="icon-btn" aria-label={`Close ${title}`} onClick={onClose}>
            <X size={18} />
          </button>}
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
function FormActions({ onClose, busy, onDelete, showCancel = true }) {
  return (
    <div className={`form-actions ${onDelete ? "has-delete" : ""}`}>
      {onDelete && (
        <button type="button" className="btn danger-outline" onClick={onDelete}>
          Delete stage
        </button>
      )}
      <div className="form-actions-right">
        {showCancel && <button type="button" className="btn secondary" onClick={onClose}>
          Cancel
        </button>}
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
  const [active, setActive] = useState(() => role === "data_analyst" ? "Analytics" : "Overview"),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState(profile?.must_change_password ? "password" : null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [duplicateContact, setDuplicateContact] = useState(null),
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
     [contracts, setContracts] = useState([]),
     [contractsUniversity, setContractsUniversity] = useState(null),
     [drillThrough, setDrillThrough] = useState(null),
    [teamSummary, setTeamSummary] = useState(null),
    [editingReport, setEditingReport] = useState(null),
    [editingOrg, setEditingOrg] = useState(null),
    [editingContact, setEditingContact] = useState(null),
    [editingCard, setEditingCard] = useState(null),
    [editingStage, setEditingStage] = useState(null),
    [editingUser, setEditingUser] = useState(null),
    [editingUniversity, setEditingUniversity] = useState(null),
    [placementData, setPlacementData] = useState({ seasons: [], categories: [], industries: [], cities: [], assignments: [], targets: [], metrics: [], analytics: null, contactApprovals: [], access: null, settings: { coordinator_target_entry_enabled: false } }),
    [loaded, setLoaded] = useState(false);
  const mode = "company";
  const copy = workspaceCopy.company;
  const analyticsViewer = universityAdmin || dataAnalyst;
  const organizationNav = "Organizations";
  const peopleNav = "Contacts";
  const visibleOrgs = orgs;
  const visibleContacts = contacts;
  const visibleReports = reports;
  const visibleCards = cards;
  const loadPlacementData = async () => {
    const [analytics, metrics, seasons, categories, industries, cities, assignments, targets, contactApprovals, access, settings] = await Promise.all([
      analyticsViewer ? apiFetch("/api/placement/analytics") : Promise.resolve(null),
      apiFetch("/api/placement/metrics"),
      apiFetch("/api/placement/seasons"),
      apiFetch("/api/placement/categories"),
      apiFetch("/api/placement/industries").catch(() => []),
      apiFetch("/api/placement/cities"),
      apiFetch("/api/placement/assignments"),
      apiFetch("/api/placement/targets"),
      universityAdmin ? apiFetch("/api/placement/contact-requests") : Promise.resolve([]),
      universityAdmin ? apiFetch("/api/placement/access") : supervisor ? apiFetch("/api/placement/access/me") : Promise.resolve(null),
      apiFetch("/api/placement/settings"),
    ]);
    setPlacementData((prev) => ({
      ...prev,
      analytics: analytics || null,
      metrics: metrics || [],
      seasons: seasons || [],
      categories: categories || [],
      industries: industries || [],
      cities: cities || [],
      assignments: assignments || [],
      targets: targets || [],
      contactApprovals: contactApprovals || [],
      access: access || null,
      settings: settings || { coordinator_target_entry_enabled: false },
    }));
  };
  const coordinatorHasAccess = (area) => supervisor && (placementData.access?.access_level === "full" || Boolean(placementData.access?.permissions?.[area]));
  const coordinatorNav = ["Overview", "Team", "Placement Tracker"];
  if (coordinatorHasAccess("organizations")) coordinatorNav.push(organizationNav);
  if (coordinatorHasAccess("contacts")) coordinatorNav.push(peopleNav);
  if (coordinatorHasAccess("meeting_reports")) coordinatorNav.push("Meeting Reports");
  const nav = superAdmin
    ? ["Overview", "Universities", "Contracts", "Users"]
      : universityAdmin
      ? ["Overview", "Team", "Direct Team", "Team Mapping", "Placement Setup", "Analytics", "Contact Approvals", organizationNav, peopleNav, "Meeting Reports"]
      : supervisor
        ? coordinatorNav
        : dataAnalyst
          ? ["Analytics"]
          : ["Overview", organizationNav, peopleNav, "Meeting Reports", "Kanban"];
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
  const openDrillThrough = (details) => {
    const organizationNames = new Map((orgs || []).map((item) => [String(item.id), item.name || item.organization_name]));
    const profileNames = new Map([
      ...(managers || []).map((item) => [String(item.id), item.full_name || item.name]),
      ...((teamSummary?.users || []).map((item) => [String(item.id), item.full_name || item.name])),
      ...((placementData.analytics?.by_manager || []).map((item) => [String(item.placement_manager_id), item.placement_manager_name])),
    ].filter(([, name]) => name));
    const categoryNames = new Map((placementData.categories || []).map((item) => [String(item.id), item.name]));
    const seasonNames = new Map((placementData.seasons || []).map((item) => [String(item.id), item.name || item.academic_year]));
    const rows = (details.rows || []).map((row) => ({
      ...row,
      ...(row.organization_name || !row.organization_id || !organizationNames.get(String(row.organization_id)) ? {} : { organization_name: organizationNames.get(String(row.organization_id)) }),
      ...(row.user_name || !row.user_id || !profileNames.get(String(row.user_id)) ? {} : { user_name: profileNames.get(String(row.user_id)) }),
      ...(row.category_name || !row.category_id || !categoryNames.get(String(row.category_id)) ? {} : { category_name: categoryNames.get(String(row.category_id)) }),
      ...(row.season_name || !row.season_id || !seasonNames.get(String(row.season_id)) ? {} : { season_name: seasonNames.get(String(row.season_id)) }),
    }));
    setDrillThrough({ ...details, rows, columns: details.columns || [] });
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
          if (universityAdmin || supervisor) {
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
        if (universityAdmin || supervisor) {
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
      category_id: f.get("category_id"),
      expected_ctc: f.get("expected_ctc"),
      industry_id: f.get("industry_id"),
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
        setModal(null);
        showSuccess("Organization added.");
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
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
    setBusy(true);
    apiFetch("/api/contacts", { method: "POST", body: JSON.stringify(payload) })
      .then((data) => {
        setContacts((prev) => [...prev, data]);
        setDuplicateContact(null);
        setModal(null);
        showSuccess("Contact added.");
      })
      .catch((err) => {
        if (err.status === 409 && err.payload?.code === "duplicate_contact_approval_required") {
          setDuplicateContact({ name: payload.name, requestId: err.payload?.request_id });
          setError("");
        } else setError(err.message);
      })
      .finally(() => setBusy(false));
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
      if (e.payload?.code === "COORDINATOR_REASSIGNMENT_REQUIRED") setActive("Team Mapping");
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
         <PlatformOverview universities={universities} users={managers} onDrillThrough={openDrillThrough} />
      ) : supervisor ? (
        <div className="role-dashboard coordinator-dashboard">
           <CoordinatorOverviewDashboard summary={teamSummary} organizations={orgs} contacts={contacts} reports={reports} cards={cards} excludeUserId={user?.id} onDrillThrough={openDrillThrough} />
        </div>
      ) : universityAdmin ? (
         <TeamDashboard summary={teamSummary} analytics={placementData.analytics} organizations={orgs} contacts={contacts} reports={reports} cards={cards} metrics={placementData.metrics} masked={false} excludeUserId={user?.id} onDrillThrough={openDrillThrough} />
      ) : dataAnalyst ? (
         <><CategoryReference categories={placementData.categories} /><PlacementAnalyticsCanvas analytics={placementData.analytics} data={placementData} role={role} onDrillThrough={openDrillThrough} /></>
      ) : (
        <div className="role-dashboard placement-manager-dashboard">
           <PlacementManagerOverviewDashboard orgs={visibleOrgs} contacts={visibleContacts} reports={visibleReports} cards={cards} stages={stages} metrics={placementData.metrics} onDrillThrough={openDrillThrough} />
        </div>
      )
     ) : superAdmin && active === "Universities" ? (
      <UniversityDirectory universities={universities} users={managers} onAdd={() => setModal("university")} onEdit={(university) => { setEditingUniversity(university); setModal("edit-university"); }} onToggleStatus={updateUniversity} />
    ) : superAdmin && active === "Contracts" ? (
      <UniversityContracts universities={universities} selectedUniversity={contractsUniversity} contracts={contracts} onSelectUniversity={async (university) => { setContractsUniversity(university); setBusy(true); try { setContracts(await apiFetch(`/api/admin/universities/${university.id}/contracts`)); } catch (err) { setError(err.message); } finally { setBusy(false); } }} onContractsChange={setContracts} onError={setError} onSuccess={showSuccess} />
    ) : superAdmin && active === "Users" ? (
      <RoleUsers users={managers} universities={universities} currentUserId={user?.id} superAdmin onAdd={() => setModal("user")} onDeactivate={deactivate} onReactivate={reactivate} onEditUniversity={(university) => { setEditingUniversity(university); setModal("edit-university"); }} />
    ) : (universityAdmin || supervisor) && active === "Team" ? (
      <RoleUsers users={teamSummary?.users || managers} currentUserId={user?.id} onAdd={universityAdmin || role === "coordinator" ? () => setModal("user") : undefined} onDeactivate={universityAdmin || role === "coordinator" ? deactivate : undefined} onReactivate={universityAdmin || role === "coordinator" ? reactivate : undefined} onEdit={universityAdmin || role === "coordinator" ? (member) => { setEditingUser(member); setModal("edit-user"); } : undefined} onRemove={role === "coordinator" ? removeManager : undefined} hierarchy={false} masked={supervisor} />
    ) : universityAdmin && active === "Direct Team" ? (
      <RoleUsers users={teamSummary?.users || managers} currentUserId={user?.id} directReportsTo={user?.id} onAdd={() => setModal("user")} onDeactivate={deactivate} onReactivate={reactivate} onEdit={(member) => { setEditingUser(member); setModal("edit-user"); }} hierarchy={false} />
    ) : universityAdmin && active === "Team Mapping" ? (
      <TeamMappingPanel users={teamSummary?.users || managers} universityAdminId={user?.id} universityAdminName={user?.full_name} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} />
    ) : active === "Placement Setup" ? (
      <PlacementSetupWizardV2 data={placementData} users={teamSummary?.users || managers} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} />
    ) : universityAdmin && active === "Targets" ? (
      <TargetEntryPanel data={placementData} users={teamSummary?.users || managers} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} />
       ) : active === "Analytics" && analyticsViewer ? (
       <><PlacementAnalyticsCanvas analytics={placementData.analytics} data={placementData} role={role} onDrillThrough={openDrillThrough} /></>
    ) : supervisor && (active === "Placement Tracker" || active === "Placement Progress" || active === "Placement Updates" || active === "Placement Metrics") ? (
      <><CategoryReference categories={placementData.categories} /><PlacementMetrics data={placementData} organizations={orgs} canEdit={supervisor} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} /></>
    ) : universityAdmin && active === "Contact Approvals" ? (
      <ContactApprovals requests={placementData.contactApprovals} onRefresh={refreshManagers} onError={setError} onSuccess={showSuccess} />
    ) : active === organizationNav ? (
      <Organizations
        orgs={visibleOrgs}
        categories={placementData.categories}
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
              {n === "Overview" || n === "Analytics" ? (
                <LayoutDashboard size={18} />
              ) : n === "Placement Managers" || n === "Users" || n === "Team" || n === "Direct Team" || n === "Team Mapping" ? (
                <Users size={18} />
              ) : n === "Organizations" || n === "Universities" ? (
                <Building2 size={18} />
              ) : n === "Contacts" || n === "Professors" ? (
                <Users size={18} />
              ) : n === "Meeting Reports" ? (
                <FileText size={18} />
              ) : n === "Kanban" || n === "Placement Tracker" || n === "Placement Updates" || n === "Placement Metrics" ? (
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
      {drillThrough && <DrillThroughDrawer {...drillThrough} onClose={() => setDrillThrough(null)} />}
      {modal === "org" && (
        <Modal title={editingOrg ? `Edit ${copy.organization.toLowerCase()}` : `Add ${copy.organization.toLowerCase()}`} onClose={() => { setModal(null); setEditingOrg(null); }}>
          <form key={editingOrg?.id || "new-org"} onSubmit={addOrg}>
            <Field
              label={`${copy.organization} name`}
              name="name"
              defaultValue={editingOrg?.name || ""}
              placeholder={copy.organizationPlaceholder}
            />
            <div className="form-grid">
              <Select
                label="Industry"
                name="industry_id"
                defaultValue={editingOrg?.industry_id || ""}
              >
                <option value="">Choose an industry set by your University Admin</option>
                {editingOrg?.industry && !editingOrg?.industry_id && <option value="">{editingOrg.industry} (legacy — choose a catalog value)</option>}
                {(placementData.industries || []).map((industry) => <option key={industry.id} value={industry.id}>{industry.name}</option>)}
              </Select>
              <Select label="City" name="city" defaultValue={editingOrg?.city || ""}>
                <option value="">Choose an allowed city</option>
                {editingOrg?.city && !(placementData.cities || []).some((item) => item.city === editingOrg.city) && <option value={editingOrg.city}>{editingOrg.city} (current)</option>}
                {(placementData.cities || []).map((item) => <option key={item.id} value={item.city}>{item.city}</option>)}
              </Select>
            </div>
            <Select label="Company category" name="category_id" defaultValue={editingOrg?.category_id || ""}>
              <option value="">Choose a category set by your University Admin</option>
              {(placementData.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
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
          <FormActions onClose={() => setModal(null)} busy={busy} />
          </form>
        </Modal>
      )}
      {modal === "contact" && (
        <Modal title={editingContact ? `Edit ${copy.person.toLowerCase()}` : `Add ${copy.person.toLowerCase()}`} onClose={() => { setModal(null); setEditingContact(null); setDuplicateContact(null); }}>
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
            {duplicateContact ? (
              <div className="warning-banner contact-approval-warning">
                <b>Contact approval request submitted</b>
                <p>{duplicateContact.name} already exists for this company. The contact was not added and has been sent to the University Admin for approval.</p>
                <div className="form-actions">
                  <button type="button" className="btn primary" onClick={() => { setDuplicateContact(null); setModal(null); }}>Done</button>
                </div>
              </div>
            ) : <FormActions onClose={() => setModal(null)} busy={busy} />}
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
        <Modal title="Change password" onClose={() => setModal(null)} dismissible={!profile?.must_change_password}>
          <form onSubmit={changePassword}>
            <Field label="Current password" type="password" name="current_password" autoComplete="current-password" />
            <Field label="New password" type="password" name="new_password" minLength="8" autoComplete="new-password" />
            <Field label="Confirm new password" type="password" name="confirm_password" minLength="8" autoComplete="new-password" />
            <FormActions onClose={() => setModal(null)} busy={busy} showCancel={!profile?.must_change_password} />
          </form>
        </Modal>
      )}
    </div>
  );
}

const EXPIRY_DAY_MS = 24 * 60 * 60 * 1000;

function planExpiryDetails(value) {
  if (!value) return { date: "Not configured", label: "No expiry date", daysRemaining: null, danger: false };
  const dateValue = String(value).slice(0, 10);
  const expiryDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(expiryDate.getTime())) return { date: "Invalid date", label: "Check expiry date", daysRemaining: null, danger: true };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.round((expiryDate.getTime() - today.getTime()) / EXPIRY_DAY_MS);
  const label = daysRemaining < 0 ? "Expired" : daysRemaining === 0 ? "Expires today" : `${daysRemaining} days to go`;
  return { date: dateValue, label, daysRemaining, danger: daysRemaining <= 30 };
}

function PlanExpiryDisplay({ value }) {
  const expiry = planExpiryDetails(value);
  return <span className={`expiry-countdown${expiry.danger ? " danger" : ""}`}><span className="expiry-countdown-date">{expiry.date}</span><small className="expiry-countdown-label">{expiry.label}</small></span>;
}

function PlatformOverview({ universities, users, onDrillThrough }) {
  const activeUniversities = universities.filter((item) => item.status === "active").length;
  const admins = users.filter((item) => item.role === "university_admin").length;
  const members = users.filter((item) => item.role !== "super_admin").length;
  const totalCapacity = universities.reduce((sum, item) => sum + Number(item.max_accounts || 100), 0);
  const usedCapacity = universities.reduce((sum, item) => sum + users.filter((user) => String(user.university_id) === String(item.id)).length, 0);
  const expiringUniversities = universities.filter((item) => planExpiryDetails(item.plan_expires_at).daysRemaining !== null && planExpiryDetails(item.plan_expires_at).daysRemaining <= 30).length;
  const capacityPercent = totalCapacity ? Math.min(100, Math.round((usedCapacity / totalCapacity) * 100)) : 0;
  const open = (title, subtitle, rows, columns) => onDrillThrough?.({ title, subtitle, rows, columns });
  const universityColumns = [{ key: "name", label: "University" }, { key: "city", label: "City" }, { key: "plan_name", label: "Plan" }, { key: "status", label: "Status" }, { key: "plan_expires_at", label: "Expiry", render: (row) => <PlanExpiryDisplay value={row.plan_expires_at} /> }];
  const accountColumns = [{ key: "full_name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }];
  const activeUsers = users.filter((item) => item.role !== "super_admin" && item.status === "active");
  const expiringRows = universities.filter((item) => planExpiryDetails(item.plan_expires_at).daysRemaining !== null && planExpiryDetails(item.plan_expires_at).daysRemaining <= 30);
  const nearestExpiry = universities.map((item) => ({ item, expiry: planExpiryDetails(item.plan_expires_at) })).filter(({ expiry }) => expiry.daysRemaining !== null).sort((a, b) => a.expiry.daysRemaining - b.expiry.daysRemaining)[0]?.expiry;
  const expiryKpiSubtitle = nearestExpiry ? `${expiringUniversities} warning${expiringUniversities === 1 ? "" : "s"} · nearest ${nearestExpiry.label}` : "No expiry dates configured";
  const kpis = [
    ["Universities", universities.length, `${activeUniversities} active`, "", () => open("Universities", "All university tenants", universities, universityColumns)],
    ["University admins", admins, "Assigned access", "", () => open("University administrators", "Administrator accounts across the network", users.filter((item) => item.role === "university_admin"), accountColumns)],
    ["Team accounts", members, "Managed by universities", "", () => open("Team accounts", "Accounts managed by universities", users.filter((item) => item.role !== "super_admin"), accountColumns)],
    ["Active accounts", activeUsers.length, "Current university access", "", () => open("Active accounts", "Active accounts with university access", activeUsers, accountColumns)],
    ["Account capacity", `${usedCapacity} / ${totalCapacity}`, `${capacityPercent}% allocated`, "", () => open("Account capacity", "University account usage", universities.map((item) => ({ ...item, accounts_used: users.filter((user) => String(user.university_id) === String(item.id)).length })), [{ key: "name", label: "University" }, { key: "accounts_used", label: "Used" }, { key: "max_accounts", label: "Allowed" }])],
    ["Expiry warnings", expiringUniversities, expiryKpiSubtitle, expiringUniversities ? "warning" : "success", () => open("Expiry warnings", "Universities expiring soon or already expired", expiringRows, universityColumns)],
  ];
  return <>
    <OverviewKpiGrid items={kpis} />
    <div className="toolbar"><div><p className="eyebrow">VEXTRA AI CONTROL PLANE</p><h2>University network</h2><p className="muted">Create university tenants and assign their administrators. Expiry is a warning only; it never blocks access.</p></div></div>
    <div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">SUBSCRIPTION & ACCOUNT USAGE</p><h3>University network</h3><span className="muted">Plan, account capacity, active team, and expiry information. Select a row for the underlying tenant details.</span></div><button type="button" className="text-btn" onClick={() => open("University network", "Subscription and account usage", universities, universityColumns)}>Open details <ArrowUpRight size={13} /></button></div><div className="team-table-scroll"><table><thead><tr><th>University</th><th>Plan</th><th>Accounts used</th><th>Allowed</th><th>Usage</th><th>Active team</th><th>Expiry</th></tr></thead><tbody>{universities.map((item) => { const tenantUsers = users.filter((user) => String(user.university_id) === String(item.id)); const used = tenantUsers.length; const max = Number(item.max_accounts || 100); return <tr key={item.id}><td><button type="button" className="table-drill-button" onClick={() => open(item.name, "University tenant details", [item], universityColumns)}><b>{item.name}</b><small>{item.city || "No city configured"}</small></button></td><td>{item.plan_name || "Standard"}</td><td>{used}</td><td>{max}</td><td><div className="usage-bar"><span style={{ width: `${Math.min(100, Math.round((used / max) * 100))}%` }} /></div><small>{Math.round((used / max) * 100)}% allocated</small></td><td>{tenantUsers.filter((user) => user.status === "active").length}</td><td><PlanExpiryDisplay value={item.plan_expires_at} /></td></tr>; })}</tbody></table></div></div>
  </>;
}

function formatOverviewDate(value) {
  if (!value) return "—";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString([], { day: "2-digit", month: "short" });
}

function OverviewKpiGrid({ items }) {
  return <div className="overview-kpi-grid">{items.map(([label, value, note, tone, onClick]) => { const content = <><span>{label}</span><strong>{value ?? 0}</strong><small>{note}</small>{onClick && <ArrowUpRight size={14} />}</>; return onClick ? <button type="button" className={`overview-kpi ${tone || ""} overview-kpi-button`} key={label} onClick={onClick}>{content}</button> : <div className={`overview-kpi ${tone || ""}`} key={label}>{content}</div>; })}</div>;
}

function PlacementManagerOverviewDashboard({ orgs = [], contacts = [], reports = [], cards = [], stages = [], metrics = [], onDrillThrough }) {
  const today = new Date().toISOString().slice(0, 10);
  const metricTotals = metrics.reduce((totals, item) => {
    ["companies_acquired", "drives_conducted", "offers_received", "students_placed"].forEach((key) => { totals[key] = (totals[key] || 0) + Number(item[key] || 0); });
    return totals;
  }, {});
  const dashboardStages = stages.length ? stages : defaultStages;
  const closedStageIds = new Set(dashboardStages.filter((stage) => /closed|done|completed/i.test(stage.name || "")).map((stage) => String(stage.id)));
  const openCards = cards.filter((card) => !card.completed_at && !closedStageIds.has(String(card.stage_id)));
  const overdueReports = reports.filter((report) => report.follow_up_date && String(report.follow_up_date).slice(0, 10) < today);
  const overdueCards = openCards.filter((card) => card.due_date && String(card.due_date).slice(0, 10) < today);
  const dueToday = openCards.filter((card) => String(card.due_date).slice(0, 10) === today);
  const pendingActions = reports.reduce((total, report) => total + (report.action_items_list || []).filter((item) => !item.is_completed).length, 0);
  const upcomingMeetings = [...reports].filter((report) => String(report.meeting_date || "") >= today).sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date))).slice(0, 5);
  const recentReports = [...reports].sort((a, b) => String(b.meeting_date || "").localeCompare(String(a.meeting_date || ""))).slice(0, 5);
  const attentionItems = [
    ...overdueReports.map((item) => ({ id: `report-${item.id}`, title: item.title || "Meeting follow-up", meta: item.organization_name || "Company", date: item.follow_up_date, tone: "danger", icon: <AlertTriangle size={14} /> })),
    ...overdueCards.map((item) => ({ id: `card-${item.id}`, title: item.title || "Kanban task", meta: item.organization_name || "Pipeline work", date: item.due_date, tone: "danger", icon: <AlertTriangle size={14} /> })),
    ...dueToday.map((item) => ({ id: `today-${item.id}`, title: item.title || "Task due today", meta: item.organization_name || "Pipeline work", date: item.due_date, tone: "warning", icon: <CalendarDays size={14} /> })),
  ].slice(0, 6);
  const stageRows = dashboardStages.slice(0, 8).map((stage) => ({ ...stage, count: openCards.filter((card) => String(card.stage_id) === String(stage.id)).length }));
  const maxStage = Math.max(1, ...stageRows.map((stage) => stage.count));
  const attentionColumns = [{ key: "title", label: "Item" }, { key: "organization_name", label: "Company" }, { key: "due_date", label: "Due date" }, { key: "priority", label: "Type" }];
  const open = (title, subtitle, rows, columns) => onDrillThrough?.({ title, subtitle, rows: title === "Needs attention" ? rows.map((item) => ({ ...item, due_date: item.due_date || item.follow_up_date, priority: item.priority || (item.follow_up_date ? "Follow-up" : "Kanban") })) : rows, columns: title === "Needs attention" ? attentionColumns : columns });
  const orgColumns = [{ key: "name", label: "Company" }, { key: "industry", label: "Industry" }, { key: "city", label: "City" }, { key: "status", label: "Status" }];
  const reportColumns = [{ key: "title", label: "Report" }, { key: "organization_name", label: "Company" }, { key: "meeting_date", label: "Meeting date" }, { key: "follow_up_date", label: "Follow-up" }];
  const cardColumns = [{ key: "title", label: "Work item" }, { key: "organization_name", label: "Company" }, { key: "due_date", label: "Due date" }, { key: "priority", label: "Priority" }];
  const kpis = [
    ["Companies tracked", orgs.length, "Current portfolio", "", () => open("Companies tracked", "Your complete company portfolio", orgs, orgColumns)],
    ["Contacts", contacts.length, "Relationship owners", "", () => open("Contacts", "Contacts linked to your companies", contacts, [{ key: "name", label: "Contact" }, { key: "organization_name", label: "Company" }, { key: "designation", label: "Designation" }, { key: "email", label: "Email" }])],
    ["Open pipeline", openCards.length, "Active work items", "", () => open("Open pipeline", "Open Kanban work items", openCards, cardColumns)],
    ["Students placed", metricTotals.students_placed, "Placement outcome", "", () => open("Placement outcomes", "Placement metric records behind this total", metrics.filter((item) => Number(item.students_placed || 0) > 0), [{ key: "organization_name", label: "Company" }, { key: "students_placed", label: "Placed" }])],
    ["Pending actions", pendingActions, "Across meeting reports", "", () => open("Pending actions", "Incomplete actions from meeting reports", reports.filter((report) => (report.action_items_list || []).some((item) => !item.is_completed)), reportColumns)],
    ["Needs attention", overdueReports.length + overdueCards.length, "Overdue work", overdueReports.length + overdueCards.length ? "danger" : "success", () => open("Needs attention", "Overdue follow-ups and Kanban work", [...overdueReports.map((item) => ({ ...item, title: item.title || "Meeting follow-up", priority: "Follow-up" })), ...overdueCards.map((item) => ({ ...item, title: item.title || "Kanban task", priority: "Kanban" }))], [...reportColumns.slice(0, 2), { key: "due_date", label: "Due date" }, { key: "priority", label: "Type" }])],
  ];
  return <div className="overview-dashboard"><div className="overview-dashboard-head"><div><p className="eyebrow">PLACEMENT MANAGER · OVERVIEW</p><h2>Current placement picture</h2></div><span className="overview-updated"><span className="status-dot" />Live workspace</span></div><OverviewKpiGrid items={kpis} /><div className="overview-dashboard-grid"><section className="panel overview-visual-panel"><div className="overview-panel-head"><div><p className="eyebrow">PIPELINE</p><h3>Open work by stage</h3></div><button type="button" className="count overview-drill-link" onClick={() => open("Open pipeline", "Open Kanban work items", openCards, cardColumns)}>{openCards.length} open <ArrowUpRight size={13} /></button></div><div className="overview-stage-chart">{stageRows.map((stage) => <button type="button" className="overview-stage-row overview-drill-row" key={stage.id} onClick={() => open(`${stage.name} pipeline`, `Open work in ${stage.name}`, openCards.filter((card) => String(card.stage_id) === String(stage.id)), cardColumns)}><span className="overview-stage-label"><i style={{ background: stage.color || "#4659d9" }} />{stage.name}</span><div className="overview-stage-track"><em style={{ width: `${Math.round((stage.count / maxStage) * 100)}%`, background: stage.color || "#4659d9" }} /></div><b>{stage.count}</b></button>)}{!stageRows.length && <div className="overview-empty">No pipeline stages configured.</div>}</div></section><section className="panel overview-list-panel"><div className="overview-panel-head"><div><p className="eyebrow">ACTION QUEUE</p><h3>Work needing attention</h3></div><button type="button" className="count overview-drill-link" onClick={() => open("Needs attention", "Overdue follow-ups and Kanban work", [...overdueReports, ...overdueCards], reportColumns)}>{attentionItems.length} <ArrowUpRight size={13} /></button></div>{attentionItems.length ? <div className="overview-list">{attentionItems.map((item) => <button type="button" className={`overview-list-item overview-drill-row ${item.tone}`} key={item.id} onClick={() => open(item.title, item.meta, reports.find((report) => `report-${report.id}` === item.id) ? [reports.find((report) => `report-${report.id}` === item.id)] : cards.filter((card) => `card-${card.id}` === item.id), reportColumns)}><span className="overview-list-icon">{item.icon}</span><div><b>{item.title}</b><small>{item.meta}</small></div><time>{formatOverviewDate(item.date)}</time></button>)}</div> : <div className="overview-empty success"><ListChecks size={19} /><b>All clear</b><span>No overdue work or tasks due today.</span></div>}</section></div><div className="overview-dashboard-grid"><section className="panel overview-list-panel"><div className="overview-panel-head"><div><p className="eyebrow">UPCOMING</p><h3>Next meetings</h3></div><button type="button" className="count overview-drill-link" onClick={() => open("Upcoming meetings", "Next scheduled company conversations", upcomingMeetings, reportColumns)}>{upcomingMeetings.length} <ArrowUpRight size={13} /></button></div>{upcomingMeetings.length ? <div className="overview-list">{upcomingMeetings.map((item) => <button type="button" className="overview-list-item overview-drill-row" key={item.id} onClick={() => open(item.title || "Upcoming meeting", item.organization_name || "Company", [item], reportColumns)}><span className="overview-date"><b>{new Date(`${item.meeting_date}T00:00:00`).getDate()}</b><small>{new Date(`${item.meeting_date}T00:00:00`).toLocaleDateString([], { month: "short" })}</small></span><div><b>{item.title || "Meeting report"}</b><small>{item.organization_name || "Company"}</small></div><time>{formatOverviewDate(item.meeting_date)}</time></button>)}</div> : <div className="overview-empty"><CalendarDays size={19} /><span>No upcoming meetings.</span></div>}</section><section className="panel overview-list-panel"><div className="overview-panel-head"><div><p className="eyebrow">RECENT UPDATES</p><h3>Latest meeting reports</h3></div><button type="button" className="count overview-drill-link" onClick={() => open("Recent meeting reports", "Latest company relationship updates", recentReports, reportColumns)}>{recentReports.length} <ArrowUpRight size={13} /></button></div>{recentReports.length ? <div className="overview-list">{recentReports.map((item) => <button type="button" className="overview-list-item overview-drill-row" key={item.id} onClick={() => open(item.title || "Meeting report", item.organization_name || "Company", [item], reportColumns)}><span className="overview-list-icon neutral"><FileText size={14} /></span><div><b>{item.title || "Meeting report"}</b><small>{item.organization_name || "Company"}</small></div><time>{formatOverviewDate(item.meeting_date)}</time></button>)}</div> : <div className="overview-empty"><FileText size={19} /><span>No meeting reports yet.</span></div>}</section></div></div>;
}

function CoordinatorOverviewDashboard({ summary, organizations = [], contacts = [], reports = [], cards = [], excludeUserId, onDrillThrough }) {
  const totals = summary?.totals || {};
  const users = (summary?.users || []).filter((item) => !excludeUserId || String(item.id) !== String(excludeUserId));
  const workloadRows = [...users].sort((a, b) => ((b.overdue_followups || 0) + (b.pending_actions || 0)) - ((a.overdue_followups || 0) + (a.pending_actions || 0)));
  const maxWorkload = Math.max(1, ...workloadRows.map((item) => (item.overdue_followups || 0) + (item.pending_actions || 0)));
  const attentionRows = workloadRows.filter((item) => (item.overdue_followups || 0) > 0 || (item.pending_actions || 0) > 0).slice(0, 6);
  const open = (title, subtitle, rows, columns) => onDrillThrough?.({ title, subtitle, rows, columns });
  const orgColumns = [{ key: "name", label: "Company" }, { key: "industry", label: "Industry" }, { key: "city", label: "City" }, { key: "owner_name", label: "Owner" }];
  const reportColumns = [{ key: "title", label: "Report" }, { key: "organization_name", label: "Company" }, { key: "meeting_date", label: "Meeting date" }, { key: "follow_up_date", label: "Follow-up" }];
  const cardColumns = [{ key: "title", label: "Work item" }, { key: "organization_name", label: "Company" }, { key: "due_date", label: "Due date" }, { key: "priority", label: "Priority" }];
  const kpis = [
    ["Team members", users.length, "Under your line", "", () => open("Team members", "People in your reporting scope", users, [{ key: "full_name", label: "Name" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }, { key: "report_status", label: "Reporting" }])],
    ["Organizations", totals.organizations, "Team portfolio", "", () => open("Team organizations", "Companies in your team portfolio", organizations, orgColumns)],
    ["Pipeline cards", totals.cards, "Team board", "", () => open("Team pipeline cards", "Kanban work in your reporting scope", cards, cardColumns)],
    ["Meeting reports", totals.reports, "Team updates", "", () => open("Team meeting reports", "Meeting updates in your reporting scope", reports, reportColumns)],
    ["Pending actions", totals.pending_actions, "Across the team", "", () => open("Pending team actions", "Meeting reports with incomplete actions", reports.filter((report) => (report.action_items_list || []).some((item) => !item.is_completed)), reportColumns)],
    ["Overdue follow-ups", totals.overdue_reports, "Needs attention", totals.overdue_reports ? "danger" : "success", () => open("Overdue follow-ups", "Reports with follow-ups past their due date", reports.filter((report) => report.follow_up_date && String(report.follow_up_date).slice(0, 10) < new Date().toISOString().slice(0, 10)), reportColumns)],
  ];
  return <div className="overview-dashboard"><div className="overview-dashboard-head"><div><p className="eyebrow">COORDINATOR · OVERVIEW</p><h2>Current team picture</h2></div><span className="overview-updated"><span className="status-dot" />Live team view</span></div><OverviewKpiGrid items={kpis} /><div className="overview-dashboard-grid coordinator-overview-grid"><section className="panel overview-visual-panel"><div className="overview-panel-head"><div><p className="eyebrow">TEAM WORKLOAD</p><h3>Pending and overdue work</h3></div><button type="button" className="count overview-drill-link" onClick={() => open("Team workload", "Pending and overdue work by team member", workloadRows, [{ key: "full_name", label: "Name" }, { key: "pending_actions", label: "Pending" }, { key: "overdue_followups", label: "Overdue" }, { key: "report_status", label: "Status" }])}>{users.length} members <ArrowUpRight size={13} /></button></div><div className="overview-workload-chart">{workloadRows.map((item) => { const pending = item.pending_actions || 0; const overdue = item.overdue_followups || 0; const total = pending + overdue; return <button type="button" className="overview-workload-row overview-drill-row" key={item.id} onClick={() => open(`${item.full_name} workload`, "Pending and overdue work for this team member", [item], [{ key: "full_name", label: "Name" }, { key: "pending_actions", label: "Pending" }, { key: "overdue_followups", label: "Overdue" }, { key: "report_status", label: "Status" }])}><div className="overview-workload-name"><b>{item.full_name}</b><small>{item.report_status || "Not tracked"}</small></div><div className="overview-workload-track"><em style={{ width: `${Math.round((total / maxWorkload) * 100)}%` }} /><i style={{ width: `${Math.round((overdue / Math.max(1, total)) * 100)}%` }} /></div><strong className={overdue ? "danger-number" : ""}>{total}</strong></button>; })}{!workloadRows.length && <div className="overview-empty">No team activity is available.</div>}</div><div className="overview-chart-legend"><span><i className="pending" />Pending</span><span><i className="overdue" />Overdue</span></div></section><section className="panel overview-list-panel"><div className="overview-panel-head"><div><p className="eyebrow">ATTENTION QUEUE</p><h3>Team members to check in with</h3></div><button type="button" className="count overview-drill-link" onClick={() => open("Team attention queue", "Team members with pending or overdue work", attentionRows, [{ key: "full_name", label: "Name" }, { key: "overdue_followups", label: "Overdue" }, { key: "pending_actions", label: "Pending" }, { key: "report_status", label: "Status" }])}>{attentionRows.length} <ArrowUpRight size={13} /></button></div>{attentionRows.length ? <div className="overview-list">{attentionRows.map((item) => <button type="button" className="overview-list-item overview-drill-row" key={item.id} onClick={() => open(`${item.full_name} attention`, "Work requiring follow-up", [item], [{ key: "full_name", label: "Name" }, { key: "overdue_followups", label: "Overdue" }, { key: "pending_actions", label: "Pending" }, { key: "report_status", label: "Status" }])}><span className={`overview-list-icon ${item.overdue_followups ? "danger" : "warning"}`}><AlertTriangle size={14} /></span><div><b>{item.full_name}</b><small>{item.overdue_followups || 0} overdue · {item.pending_actions || 0} pending</small></div><span className={`report-status ${String(item.report_status || "").toLowerCase().replaceAll(" ", "-")}`}>{item.report_status || "Not tracked"}</span></button>)}</div> : <div className="overview-empty success"><ListChecks size={19} /><b>Team is on track</b><span>No pending or overdue work is reported.</span></div>}</section></div><section className="panel table-panel overview-team-panel"><div className="overview-panel-head"><div><p className="eyebrow">TEAM ACTIVITY</p><h3>Current team activity</h3></div><button type="button" className="count overview-drill-link" onClick={() => open("Team activity", "Team activity records", users, [{ key: "full_name", label: "Name" }, { key: "role", label: "Role" }, { key: "organization_count", label: "Companies" }, { key: "report_count", label: "Reports" }, { key: "overdue_followups", label: "Overdue" }])}>{users.length} members <ArrowUpRight size={13} /></button></div><TeamTable users={users} masked /></section></div>;
}

function DashboardFlowHeader({ role, title, description, steps = [] }) {
  return <div className="dashboard-flow-header"><div className="dashboard-flow-copy"><p className="eyebrow">{role}</p><h2>{title}</h2><p>{description}</p></div><div className="dashboard-flow-steps" aria-label="Dashboard information flow">{steps.map((step, index) => <div className="dashboard-flow-step" key={step}><span>{index + 1}</span><b>{step}</b>{index < steps.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div></div>;
}

function TeamDashboard({ summary, analytics, organizations = [], contacts = [], reports = [], cards = [], metrics = [], masked, excludeUserId, onDrillThrough }) {
  const totals = summary?.totals || {};
  const placementTotals = analytics?.totals || {};
  const placementSummary = analytics?.summary || {};
  const users = (summary?.users || []).filter((item) => !excludeUserId || String(item.id) !== String(excludeUserId));
  const open = (title, subtitle, rows, columns) => onDrillThrough?.({ title, subtitle, rows, columns });
  const reportColumns = [{ key: "title", label: "Report" }, { key: "organization_name", label: "Company" }, { key: "meeting_date", label: "Meeting date" }, { key: "follow_up_date", label: "Follow-up" }];
  const teamColumns = [{ key: "full_name", label: "Name" }, { key: "role", label: "Role" }, { key: "organization_count", label: "Companies" }, { key: "report_count", label: "Reports" }, { key: "overdue_followups", label: "Overdue" }];
  const kpis = [
    ["Team members", users.length, "Under your reporting line", "", () => open("Team members", "People in your reporting scope", users, teamColumns)],
    ["Organizations", totals.organizations || 0, masked ? "Names protected" : "University total", "", () => open("Organizations", "Companies visible in this scope", organizations, [{ key: "name", label: "Company" }, { key: "industry", label: "Industry" }, { key: "city", label: "City" }, { key: "status", label: "Status" }])],
    ["Meeting reports", totals.reports || 0, `${totals.pending_actions || 0} pending actions`, "", () => open("Meeting reports", "Reports visible in this scope", reports, reportColumns)],
    ["Overdue follow-ups", totals.overdue_reports || 0, `${totals.cards || 0} pipeline cards`, totals.overdue_reports ? "danger" : "success", () => open("Overdue follow-ups", "Reports with follow-ups past their due date", reports.filter((report) => report.follow_up_date && String(report.follow_up_date).slice(0, 10) < new Date().toISOString().slice(0, 10)), reportColumns)],
  ];
  return <>
    <OverviewKpiGrid items={kpis} />
    <div className="panel analytics-pulse"><div><p className="eyebrow">PLACEMENT PULSE</p><h3>What is happening across the university</h3><p className="muted">Live pipeline signals from coordinator and placement-manager updates.</p></div><div className="analytics-pulse-grid"><button type="button" className="overview-pulse-button" onClick={() => open("Companies in pipeline", "Placement records currently in the pipeline", (analytics?.rows || []).filter((row) => !["joined", "cancelled"].includes(row.pipeline_status)), [{ key: "organization_name", label: "Company" }, { key: "pipeline_status_label", label: "Stage" }, { key: "placement_manager_name", label: "Owner" }])}><span>Companies in pipeline</span><strong>{placementSummary.companies_in_pipeline || 0}</strong><ArrowUpRight size={13} /></button><button type="button" className="overview-pulse-button" onClick={() => open("Drives completed", "Placement records with completed drives", (analytics?.rows || []).filter((row) => Number(row.drives_conducted || 0) > 0), [{ key: "organization_name", label: "Company" }, { key: "drives_conducted", label: "Drives" }, { key: "students_placed", label: "Placed" }])}><span>Drives completed</span><strong>{placementTotals.drives_conducted || 0}</strong><ArrowUpRight size={13} /></button><button type="button" className="overview-pulse-button" onClick={() => open("Students placed", "Placement records behind this outcome", (analytics?.rows || []).filter((row) => Number(row.students_placed || 0) > 0), [{ key: "organization_name", label: "Company" }, { key: "students_placed", label: "Placed" }])}><span>Students placed</span><strong>{placementTotals.students_placed || 0}</strong><ArrowUpRight size={13} /></button><button type="button" className="overview-pulse-button" onClick={() => open("Placement attention", "Negative outlook and overdue placement records", (analytics?.rows || []).filter((row) => row.outlook === "negative" || (row.next_follow_up_date && row.next_follow_up_date < new Date().toISOString().slice(0, 10))), [{ key: "organization_name", label: "Company" }, { key: "outlook_label", label: "Outlook" }, { key: "next_follow_up_date", label: "Follow-up" }])}><span>Needs attention</span><strong className={placementSummary.negative_outlook || placementSummary.overdue_followups ? "danger-number" : ""}>{(placementSummary.negative_outlook || 0) + (placementSummary.overdue_followups || 0)}</strong><ArrowUpRight size={13} /></button></div></div>
    <div className="panel table-panel">
      <div className="table-head"><h3>Team activity</h3><button type="button" className="text-btn" onClick={() => open("Team activity", "Team activity records", users, teamColumns)}>Open details <ArrowUpRight size={13} /></button><span className="muted">{masked ? "Organization and contact identities are masked." : "University-wide activity overview."}</span></div>
      <TeamTable users={users} masked={masked} />
    </div>
    <div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">WORKLOAD</p><h3>Overdue follow-up queue</h3></div><button type="button" className="text-btn" onClick={() => open("Overdue follow-up queue", "Team members with pending or overdue work", users.filter((item) => (item.overdue_followups || 0) > 0 || (item.pending_actions || 0) > 0), teamColumns)}>Open details <ArrowUpRight size={13} /></button></div><table><thead><tr><th>Team member</th><th>Pending</th><th>Overdue</th><th>Status</th></tr></thead><tbody>{users.filter((item) => (item.overdue_followups || 0) > 0 || (item.pending_actions || 0) > 0).map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.pending_actions || 0}</td><td className={item.overdue_followups ? "danger-number" : ""}>{item.overdue_followups || 0}</td><td>{item.report_status || "Not tracked"}</td></tr>)}</tbody></table>{!users.some((item) => (item.overdue_followups || 0) > 0 || (item.pending_actions || 0) > 0) && <div className="empty-state"><p className="muted">No overdue follow-ups.</p></div>}</div>
  </>;
}

function PlacementManagerWorkflow({ reports = [], cards = [], stages = [] }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...reports].filter((item) => item.meeting_date >= today).sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date))).slice(0, 6);
  const datedCards = cards.filter((item) => item.due_date && !item.completed_at).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const overdueReports = reports.filter((item) => item.follow_up_date && item.follow_up_date < today);
  const overdueCards = datedCards.filter((item) => item.due_date < today);
  const dueToday = datedCards.filter((item) => item.due_date === today);
  const focusItems = [
    ...overdueReports.slice(0, 3).map((item) => ({ id: `report-${item.id}`, type: "Meeting follow-up", title: item.title || "Meeting report", company: item.organization_name || "Company", date: item.follow_up_date, tone: "danger" })),
    ...overdueCards.slice(0, 3).map((item) => ({ id: `card-${item.id}`, type: "Kanban task", title: item.title, company: item.organization_name || "Pipeline work", date: item.due_date, tone: "danger" })),
    ...dueToday.slice(0, 3).map((item) => ({ id: `today-${item.id}`, type: "Due today", title: item.title, company: item.organization_name || "Pipeline work", date: item.due_date, tone: "warning" })),
  ].slice(0, 6);
  return <div className="pm-workflow"><div className="pm-focus-grid"><div className={`pm-focus-card ${overdueReports.length + overdueCards.length ? "danger" : "success"}`}><span className="pm-focus-icon"><AlertTriangle size={17} /></span><div><strong>{overdueReports.length + overdueCards.length}</strong><span>Overdue actions</span></div><small>{overdueReports.length ? `${overdueReports.length} meeting follow-up${overdueReports.length === 1 ? "" : "s"}` : "Nothing needs escalation"}</small></div><div className="pm-focus-card"><span className="pm-focus-icon"><CalendarDays size={17} /></span><div><strong>{dueToday.length}</strong><span>Due today</span></div><small>Kanban work items</small></div><div className="pm-focus-card"><span className="pm-focus-icon"><ListChecks size={17} /></span><div><strong>{datedCards.length}</strong><span>Open work items</span></div><small>With a tracked due date</small></div><div className="pm-focus-card"><span className="pm-focus-icon"><ArrowUpRight size={17} /></span><div><strong>{upcoming.length}</strong><span>Upcoming meetings</span></div><small>Next scheduled interactions</small></div></div><div className="pm-workflow-grid"><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">TODAY’S FOCUS</p><h3>Work that needs your attention</h3><span className="muted">Start here before adding a new company or updating the Kanban board.</span></div></div>{focusItems.length ? <div className="pm-focus-list">{focusItems.map((item) => <div className={`pm-focus-list-item ${item.tone}`} key={item.id}><span className="pm-focus-list-icon">{item.tone === "danger" ? <AlertTriangle size={14} /> : <CalendarDays size={14} />}</span><div><b>{item.title}</b><small>{item.type} · {item.company}</small></div><time>{item.date}</time></div>)}</div> : <div className="pm-empty"><ListChecks size={22} /><b>You’re clear for today</b><span>No overdue actions or tasks due today.</span></div>}</div><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">NEXT INTERACTIONS</p><h3>Upcoming meetings</h3><span className="muted">The next six scheduled relationship touchpoints.</span></div></div>{upcoming.length ? <div className="pm-meeting-list">{upcoming.map((item) => <div className="pm-meeting-item" key={item.id}><div className="pm-date"><b>{new Date(`${item.meeting_date}T00:00:00`).getDate()}</b><span>{new Date(`${item.meeting_date}T00:00:00`).toLocaleDateString([], { month: "short" })}</span></div><div><b>{item.title || "Meeting report"}</b><small>{item.organization_name || "Company"}</small></div><time>{item.meeting_date}</time></div>)}</div> : <div className="pm-empty"><CalendarDays size={22} /><b>No meetings scheduled</b><span>Log the next company conversation from Meeting Reports.</span></div>}</div></div></div>;
}

function TeamTable({ users, masked }) {
  return <div className="team-table-scroll" role="region" aria-label="Team activity table" tabIndex="0"><table className="team-activity-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Organizations</th><th>Contacts</th><th>Reports</th><th>Last report</th><th>Follow-ups</th><th>Report tracking</th><th>Pipeline</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td><b>{item.full_name}</b><small>{item.email}</small></td><td>{item.role.replaceAll("_", " ")}</td><td><span className={`badge ${item.status}`}>{item.status}</span></td><td>{item.organization_count ?? 0}{masked && <small> masked</small>}</td><td>{item.contact_count ?? 0}{masked && <small> masked</small>}</td><td>{item.report_count ?? 0}</td><td>{item.last_report_date ? new Date(item.last_report_date).toLocaleDateString() : "Never"}</td><td><span className={item.overdue_followups ? "danger-number" : ""}>{item.overdue_followups ?? 0} overdue</span><small>{item.pending_actions ?? 0} pending action{item.pending_actions === 1 ? "" : "s"}</small></td><td><span className={`report-status ${String(item.report_status || "").toLowerCase().replaceAll(" ", "-")}`}>{item.report_status || "Not tracked"}</span></td><td>{item.card_count ?? 0}</td></tr>)}</tbody></table></div>;
}

function RoleUsers({ users, universities = [], currentUserId, directReportsTo, onAdd, onDeactivate, onReactivate, onEdit, onEditUniversity, onRemove, superAdmin = false, hierarchy = false, masked = false }) {
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
  const sortAdministrators = (items) => [...items].sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime() || String(a.full_name || "").localeCompare(String(b.full_name || "")));
  const accountRow = (item, depth = 0) => <tr key={item.id}>
    <td><div className={depth ? "hierarchy-name hierarchy-child" : "hierarchy-name"} style={{ paddingLeft: `${depth * 24}px` }}>{superAdmin ? <button className="account-name-button" onClick={() => setSelectedAccount(item)}><b>{item.full_name}</b><small>{item.email}</small></button> : <><b>{item.full_name}</b><small>{item.email}</small></>}</div></td>
    <td>{roleLabel(item.role)}</td>
    <td><span className={`badge ${item.status}`}>{item.status}</span></td>
    <td>{item.reports_to_name || (item.reports_to ? names.get(String(item.reports_to)) || "Assigned manager" : "—")}</td>
    <td>{accountActions(item)}</td>
  </tr>;
  const universityGroups = [...universities].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))).map((university) => ({
    ...university,
    admin: sortAdministrators(filteredUsers.filter((item) => String(item.university_id) === String(university.id) && item.role === "university_admin"))[0],
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
            <div><p className="eyebrow">UNIVERSITY</p><h3>{group.name}</h3>{group.admin ? <button className="account-name-button admin-account-name" onClick={() => setSelectedAccount(group.admin)}><p className="muted"><b>{group.admin.full_name}</b></p><p className="muted">{group.admin.email}</p></button> : <p className="muted">No administrator assigned</p>}</div>
            <div className="university-admin-meta">{group.admin ? <><span className={`badge ${group.admin.status}`}>{group.admin.status}</span>{onEditUniversity && <button className="text-btn" onClick={() => onEditUniversity(group)}><Pencil size={13} />Edit university</button>}{accountActions(group.admin)}</> : <><span className="muted">{group.totalMembers} account{group.totalMembers === 1 ? "" : "s"}</span>{onEditUniversity && <button className="text-btn" onClick={() => onEditUniversity(group)}><Pencil size={13} />Edit university</button>}</>}</div>
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

function TeamMappingPanel({ users, universityAdminId, universityAdminName, onRefresh, onError, onSuccess }) {
  const coordinators = users.filter((item) => item.role === "coordinator");
  const placementManagers = users.filter((item) => item.role === "placement_manager");
  const directAdmin = { id: universityAdminId, full_name: universityAdminName || "University Admin", role: "university_admin", status: "active" };
  const activeCoordinators = coordinators.filter((item) => item.status === "active");
  const reportingTargets = [directAdmin, ...activeCoordinators];
  const reportingNames = new Map(reportingTargets.map((item) => [String(item.id), item.full_name]));
  const [assignments, setAssignments] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    setAssignments(Object.fromEntries(placementManagers.map((manager) => [String(manager.id), String(manager.reports_to || "")])));
  }, [users]);

  const saveMapping = async (manager) => {
    const reportsTo = assignments[String(manager.id)];
    if (!reportsTo) {
      onError("Choose the university administrator or an active coordinator before saving the mapping.");
      return;
    }
    setSavingId(manager.id);
    try {
      await apiFetch(`/api/team/users/${manager.id}/reporting-line`, {
        method: "PATCH",
        body: JSON.stringify({ reports_to: reportsTo }),
      });
      await onRefresh();
      onSuccess(`${manager.full_name} is now mapped to ${reportingNames.get(String(reportsTo)) || "the selected reporting manager"}.`);
    } catch (error) {
      onError(error.message);
    } finally {
      setSavingId(null);
    }
  };

  const needsMapping = placementManagers.filter((manager) => {
    const target = reportingTargets.find((item) => String(item.id) === String(manager.reports_to));
    return !target || target.status !== "active";
  }).length;

  return <div className="dashboard"><div className="toolbar"><div><p className="eyebrow">TEAM STRUCTURE</p><h2>Coordinator mapping</h2><p className="muted">Choose whether each placement manager reports directly to the university administrator or to an active coordinator. CRM records and placement history remain with the manager.</p></div></div><div className="panel mapping-summary"><div><b>{activeCoordinators.length} active coordinators</b><span>available for assignment</span></div><div><b>{needsMapping} managers need attention</b><span>under an inactive or missing reporting manager</span></div></div><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">PLACEMENT MANAGERS</p><h3>Reporting lines</h3><span className="muted">Direct assignment to the university administrator is allowed. Reassign managers before removing a coordinator.</span></div></div><div className="team-table-scroll"><table><thead><tr><th>Placement manager</th><th>Status</th><th>Current reporting line</th><th>Assign under</th><th>Action</th></tr></thead><tbody>{placementManagers.map((manager) => { const currentTarget = reportingTargets.find((item) => String(item.id) === String(manager.reports_to)) || coordinators.find((item) => String(item.id) === String(manager.reports_to)); const selectedTarget = assignments[String(manager.id)] || ""; const changed = selectedTarget !== String(manager.reports_to || ""); return <tr key={manager.id}><td><b>{manager.full_name}</b><small>{manager.email}</small></td><td><span className={`badge ${manager.status}`}>{manager.status}</span></td><td>{currentTarget ? <span>{currentTarget.full_name}<small>{currentTarget.role === "university_admin" ? "University administrator" : currentTarget.status === "active" ? "Active coordinator" : "Inactive coordinator"}</small></span> : <span className="danger-number">Not mapped</span>}</td><td><select className="filter mapping-select" value={selectedTarget} onChange={(event) => setAssignments((current) => ({ ...current, [String(manager.id)]: event.target.value }))} disabled={!reportingTargets.length || savingId === manager.id} aria-label={`Reporting line for ${manager.full_name}`}><option value="">Choose reporting line</option>{reportingTargets.map((target) => <option key={target.id} value={target.id}>{target.full_name}{target.role === "university_admin" ? " · University Admin" : " · Coordinator"}</option>)}{currentTarget && currentTarget.status !== "active" && <option value={currentTarget.id} disabled>{currentTarget.full_name} · inactive</option>}</select></td><td><button className="btn primary" onClick={() => saveMapping(manager)} disabled={!changed || savingId === manager.id || !selectedTarget}>{savingId === manager.id ? "Saving…" : "Save mapping"}</button></td></tr>; })}</tbody></table></div>{!placementManagers.length && <div className="empty-state"><h3>No placement managers found</h3><p className="muted">Create a placement manager account first.</p></div>}</div></div>;
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
    <div className="panel table-panel"><div className="team-table-scroll"><table><thead><tr><th>University</th><th>Admin</th><th>Plan</th><th>Accounts used</th><th>Allowed accounts</th><th>Expiry</th><th>Code</th><th>City</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{rows.map((item) => { const admin = users.find((user) => String(user.university_id) === String(item.id) && user.role === "university_admin"); const accountCount = users.filter((user) => String(user.university_id) === String(item.id)).length; return <tr key={item.id}><td><button className="account-name-button" onClick={() => setSelected(item)}><b>{item.name}</b></button></td><td>{admin?.full_name || <span className="muted">Unassigned</span>}</td><td>{item.plan_name || "Standard"}</td><td>{accountCount}</td><td>{item.max_accounts || 100}</td><td><PlanExpiryDisplay value={item.plan_expires_at} /></td><td>{item.code || "—"}</td><td>{item.city}</td><td><span className={`badge ${item.status}`}>{item.status}</span></td><td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "Today"}</td><td><div className="actions"><button className="text-btn" onClick={() => onEdit(item)}><Pencil size={13} />Edit</button><button className={item.status === "active" ? "delete-btn" : "text-btn"} onClick={() => onToggleStatus(item)}>{item.status === "active" ? "Deactivate" : "Reactivate"}</button></div></td></tr>; })}</tbody></table></div>{!rows.length && <div className="empty-state"><h3>No universities found</h3><p className="muted">Try changing your search or filters.</p></div>}</div>
    {selected && <UniversityDetailDrawer university={selected} users={users} onClose={() => setSelected(null)} />}
  </>;
}

function UniversityDetailDrawer({ university, users, onClose }) {
  const drawerRef = useRef(null);
  useDialogBehavior(drawerRef, onClose);
  const accounts = users.filter((item) => String(item.university_id) === String(university.id));
  const admin = accounts.find((item) => item.role === "university_admin");
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={drawerRef} className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="university-drawer-title"><div className="drawer-head"><div><p className="eyebrow">UNIVERSITY DETAILS</p><h2 id="university-drawer-title">{university.name}</h2></div><button type="button" className="icon-btn" aria-label="Close university details" onClick={onClose}><X size={18} /></button></div><div className="drawer-status"><span className={`badge ${university.status}`}>{university.status}</span><span className="role-pill">{accounts.length}/{university.max_accounts || 100} accounts</span></div><dl className="detail-list"><div><dt>Code</dt><dd>{university.code || "—"}</dd></div><div><dt>City</dt><dd>{university.city || "—"}</dd></div><div><dt>Plan</dt><dd>{university.plan_name || "Standard"}</dd></div><div><dt>Plan expiry</dt><dd><PlanExpiryDisplay value={university.plan_expires_at} /></dd></div><div><dt>University admin</dt><dd>{admin ? `${admin.full_name} · ${admin.email}` : "Not assigned"}</dd></div><div><dt>Created</dt><dd>{university.created_at ? new Date(university.created_at).toLocaleString() : "—"}</dd></div></dl><div className="drawer-note"><Users size={16} /><span>{accounts.filter((item) => item.status === "active").length} active account(s) and {accounts.filter((item) => item.status === "inactive").length} inactive account(s).</span></div></aside></div>;
}

function DrillThroughDrawer({ title, subtitle, rows = [], columns = [], onClose }) {
  const drawerRef = useRef(null);
  useDialogBehavior(drawerRef, onClose);
  const resolvedColumns = columns.length ? columns : Object.keys(rows[0] || {}).filter((key) => !["id", "documents"].includes(key)).slice(0, 6).map((key) => ({ key, label: key.replaceAll("_", " ") }));
  const displayValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    return String(value).replaceAll("_", " ");
  };
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={drawerRef} className="detail-drawer drill-through-drawer" role="dialog" aria-modal="true" aria-labelledby="drill-through-title"><div className="drawer-head"><div><p className="eyebrow">DRILL-THROUGH</p><h2 id="drill-through-title">{title}</h2><p className="muted">{subtitle}</p></div><button type="button" className="icon-btn" aria-label="Close drill-through details" onClick={onClose}><X size={18} /></button></div><div className="drill-through-count"><strong>{rows.length}</strong><span>matching record{rows.length === 1 ? "" : "s"}</span></div>{rows.length ? <div className="drill-through-scroll"><table><thead><tr>{resolvedColumns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || `${row.name || row.title || "row"}-${index}`}>{resolvedColumns.map((column) => <td key={column.key}>{column.render ? column.render(row) : displayValue(row[column.key])}</td>)}</tr>)}</tbody></table></div> : <div className="empty-state"><ListChecks size={21} /><h3>No matching records</h3><p className="muted">There are no records behind this result in your current scope.</p></div>}</aside></div>;
}

function UniversityContracts({ universities = [], selectedUniversity, contracts = [], onSelectUniversity, onContractsChange, onError, onSuccess }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewingDocument, setViewingDocument] = useState("");
  const selected = selectedUniversity || universities[0];
  useEffect(() => {
    if (!selectedUniversity && universities[0]) onSelectUniversity(universities[0]);
  }, [selectedUniversity, universities]);
  const money = (value, currency = "INR") => `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const dateLabel = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const loadContracts = async (university) => {
    if (!university) return;
    await onSelectUniversity(university);
    setEditing(null);
  };
  const save = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const valueOrNull = (name) => form.get(name) || null;
    const payload = {
      contract_reference: valueOrNull("contract_reference"),
      status: form.get("status"),
      total_contract_value: Number(form.get("total_contract_value") || 0),
      currency: String(form.get("currency") || "INR").toUpperCase(),
      work_order_date: valueOrNull("work_order_date"),
      contract_start_date: valueOrNull("contract_start_date"),
      contract_end_date: valueOrNull("contract_end_date"),
      invoice_number: valueOrNull("invoice_number"),
      invoice_date: valueOrNull("invoice_date"),
      payment_status: form.get("payment_status"),
      payment_received_date: valueOrNull("payment_received_date"),
      notes: valueOrNull("notes"),
    };
    setBusy(true);
    try {
      const endpoint = editing ? `/api/admin/university-contracts/${editing.id}` : `/api/admin/universities/${selected.id}/contracts`;
      const saved = await apiFetch(endpoint, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      const files = [["work_order_file", "work_order"], ["invoice_file", "invoice"], ["supporting_file", "supporting"]];
      for (const [field, documentType] of files) {
        const file = form.get(field);
        if (file && file.name) {
          const document = new FormData();
          document.append("document_type", documentType);
          document.append("file", file);
          await apiFetch(`/api/admin/university-contracts/${saved.id}/documents`, { method: "POST", body: document });
        }
      }
      await loadContracts(selected);
      onSuccess(editing ? "Contract record updated." : "Contract record added.");
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteContract = async (contract) => {
    if (!window.confirm(`Delete ${contract.contract_reference || "this contract record"}? Its documents will also be removed.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/university-contracts/${contract.id}`, { method: "DELETE" });
      await loadContracts(selected);
      onSuccess("Contract record deleted.");
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteDocument = async (document) => {
    if (!window.confirm(`Delete ${document.original_name || "this document"}?`)) return;
    setViewingDocument(document.id);
    try {
      await apiFetch(`/api/admin/university-contract-documents/${document.id}`, { method: "DELETE" });
      await loadContracts(selected);
      onSuccess("Document deleted.");
    } catch (error) {
      onError(error.message);
    } finally {
      setViewingDocument("");
    }
  };
  const openDocument = async (document) => {
    setViewingDocument(document.id);
    try {
      const result = await apiFetch(`/api/admin/university-contract-documents/${document.id}/url`);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      onError(error.message);
    } finally {
      setViewingDocument("");
    }
  };
  const existingDocuments = (documentType) => (editing?.documents || []).filter((document) => document.document_type === documentType);
  const renderExistingDocuments = (documentType) => {
    if (!editing) return null;
    const documents = existingDocuments(documentType);
    return <div className="existing-document-panel"><span className="existing-document-label">{documents.length ? "Currently uploaded" : "No document uploaded yet"}</span>{documents.map((document) => <div className="existing-document-row" key={document.id}><div className="existing-document-name"><FileText size={14} /><span><strong title={document.original_name || "Uploaded document"}>{document.original_name || "Uploaded document"}</strong><small>{dateLabel(document.created_at)}</small></span></div><div className="existing-document-actions"><button type="button" className="text-btn" disabled={viewingDocument === document.id} onClick={() => openDocument(document)}>{viewingDocument === document.id ? "Opening…" : "Open"}</button><button type="button" className="text-btn danger" disabled={viewingDocument === document.id} onClick={() => deleteDocument(document)}>Remove</button></div></div>)}</div>;
  };
  const totalValue = contracts.reduce((sum, item) => sum + Number(item.total_contract_value || 0), 0);
  return <div className="dashboard contracts-dashboard"><div className="section-heading"><div><p className="eyebrow">VEXTRA AI CONTROL PLANE</p><h2>University contracts</h2><p className="muted">Keep work orders, invoices, contract value, payment status, and document history connected to each university.</p></div></div><div className="contract-university-picker panel"><label><span>University</span><select value={selected?.id || ""} onChange={(event) => loadContracts(universities.find((item) => String(item.id) === String(event.target.value)))}><option value="">Choose university</option>{universities.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><div className="contract-picker-context">{selected ? <><strong>{selected.name}</strong><span>{contracts.length} contract record{contracts.length === 1 ? "" : "s"} · {money(totalValue)}</span></> : <span>Select a university to manage its commercial history.</span>}</div></div>{selected && <><form className="panel form-card contract-form" key={editing?.id || `new-${selected.id}`} onSubmit={save}><div className="panel-head"><div><p className="eyebrow">{editing ? "EDIT CONTRACT RECORD" : "NEW CONTRACT RECORD"}</p><h3>{editing ? "Update university agreement" : "Add university agreement"}</h3><span className="muted">Files are private and can be opened only by Super Admins.</span></div></div><div className="form-grid"><Field label="Contract / work order reference" name="contract_reference" required={false} defaultValue={editing?.contract_reference || ""} placeholder="WO-2026-001" /><Select label="Record status" name="status" defaultValue={editing?.status || "active"}><option value="draft">Draft</option><option value="active">Active</option><option value="renewed">Renewed</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></Select></div><div className="form-grid"><Field label="Total contract value" name="total_contract_value" type="number" min="0" step="0.01" defaultValue={editing?.total_contract_value || 0} /><Field label="Currency" name="currency" defaultValue={editing?.currency || "INR"} maxLength="3" /></div><div className="form-grid"><Field label="Work order date" name="work_order_date" type="date" required={false} defaultValue={editing?.work_order_date || ""} /><Field label="Contract start date" name="contract_start_date" type="date" required={false} defaultValue={editing?.contract_start_date || ""} /><Field label="Contract end date" name="contract_end_date" type="date" required={false} defaultValue={editing?.contract_end_date || ""} /></div><div className="form-grid"><Field label="Invoice number" name="invoice_number" required={false} defaultValue={editing?.invoice_number || ""} /><Field label="Invoice date" name="invoice_date" type="date" required={false} defaultValue={editing?.invoice_date || ""} /><Select label="Payment status" name="payment_status" defaultValue={editing?.payment_status || "not_received"}><option value="not_received">Not received</option><option value="partial">Partially received</option><option value="received">Received</option><option value="overdue">Overdue</option></Select></div><Field label="Payment received date" name="payment_received_date" type="date" required={false} defaultValue={editing?.payment_received_date || ""} /><div className="contract-file-grid"><label className="file-field"><span>Work order document</span>{renderExistingDocuments("work_order")}<input type="file" name="work_order_file" accept="application/pdf,image/*" /><small>{editing ? "Choose another PDF or image to upload; the existing file remains in history." : "PDF or image, maximum 20 MB"}</small></label><label className="file-field"><span>Invoice document</span>{renderExistingDocuments("invoice")}<input type="file" name="invoice_file" accept="application/pdf,image/*" /><small>{editing ? "Choose another PDF or image to upload; the existing file remains in history." : "PDF or image, maximum 20 MB"}</small></label><label className="file-field"><span>Supporting document</span>{renderExistingDocuments("supporting")}<input type="file" name="supporting_file" accept="application/pdf,image/*" /><small>{editing ? "Choose another PDF or image to upload; the existing file remains in history." : "Optional PDF or image"}</small></label></div><label className="field"><span>Notes</span><textarea name="notes" defaultValue={editing?.notes || ""} placeholder="Payment terms, renewal context, or internal notes" /></label><div className="form-actions"><button className="btn primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save contract" : "Add contract"}</button>{editing && <button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>}</div></form><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">CONTRACT HISTORY</p><h3>{selected.name}</h3><span className="muted">Every agreement remains available for audit and payment follow-up.</span></div><span className="count">{contracts.length} records</span></div><div className="team-table-scroll"><table><thead><tr><th>Reference</th><th>Value</th><th>Contract period</th><th>Invoice</th><th>Payment</th><th>Documents</th><th>Action</th></tr></thead><tbody>{contracts.map((item) => <tr key={item.id}><td><b>{item.contract_reference || "Unreferenced agreement"}</b><small><span className={`badge ${item.status}`}>{item.status}</span></small></td><td>{money(item.total_contract_value, item.currency)}</td><td>{dateLabel(item.contract_start_date)} – {dateLabel(item.contract_end_date)}</td><td>{item.invoice_number || "—"}<small>{dateLabel(item.invoice_date)}</small></td><td><span className={`badge ${item.payment_status}`}>{String(item.payment_status || "").replaceAll("_", " ")}</span><small>{dateLabel(item.payment_received_date)}</small></td><td><div className="contract-document-list">{(item.documents || []).map((document) => <div className="contract-document-entry" key={document.id}><button type="button" className="text-btn" disabled={viewingDocument === document.id} onClick={() => openDocument(document)}><FileText size={13} />{viewingDocument === document.id ? "Opening…" : document.document_type.replaceAll("_", " ")}</button><button type="button" className="icon-btn contract-document-delete" disabled={viewingDocument === document.id} onClick={() => deleteDocument(document)} aria-label={`Delete ${document.original_name || "document"}`}><Trash2 size={13} /></button></div>)}{!item.documents?.length && <span className="muted">None</span>}</div></td><td><div className="actions"><button type="button" className="text-btn" onClick={() => setEditing(item)}><Pencil size={13} />Edit</button><button type="button" className="delete-btn" onClick={() => deleteContract(item)}><Trash2 size={13} />Delete</button></div></td></tr>)}</tbody></table></div>{!contracts.length && <div className="empty-state"><FileText size={21} /><h3>No contract history yet</h3><p className="muted">Add the first work order or university agreement above.</p></div>}</div></>}</div>;
}

function Overview({ admin, mode, orgs, contacts, reports, cards, visibleCards, stages, managers }) {
  const copy = workspaceCopy[mode];
  const today = new Date().toISOString().slice(0, 10);
  const pendingActions = reports.reduce((sum, report) => sum + (report.action_items_list || []).filter((item) => !item.is_completed).length, 0);
  const overdueFollowUps = reports.filter((report) => report.follow_up_date && report.follow_up_date < today).length;
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
              : "Keep company relationships moving with a clear view of your pipeline, meetings, and next actions."}
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
                  width: `${Math.min(100, Math.max(n * 25, 8))}%`,
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
function Organizations({ orgs, categories = [], mode, query, setQuery, onAdd, onEdit, onDelete, canEdit = true }) {
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
              {mode === "company" && <th>Category</th>}
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
                {mode === "company" && <td>{categories.find((category) => String(category.id) === String(o.category_id))?.name || "—"}</td>}
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
  const formatRange = (item) => {
    const minimum = item.min_ctc_lpa != null ? `${item.min_ctc_lpa} LPA` : "";
    const maximum = item.max_ctc_lpa != null ? `${item.max_ctc_lpa} LPA` : "No upper limit";
    if (minimum && item.max_ctc_lpa != null) return `${minimum} – ${maximum}`;
    if (minimum) return `${minimum}+`;
    if (item.max_ctc_lpa != null) return `Up to ${maximum}`;
    return "Range not set";
  };
  return <div className="panel category-reference"><div className="panel-head"><div><p className="eyebrow">UNIVERSITY CATEGORIES</p><h3>Category and CTC guide</h3><span className="muted">Read-only ranges declared by your University Admin. Use these bands when adding or updating companies.</span></div><span className="count">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</span></div>{categories.length ? <div className="category-reference-grid">{categories.map((item) => <div className="category-reference-item" key={item.id}><b>{item.name}</b><span>{formatRange(item)}</span>{item.description && <small>{item.description}</small>}</div>)}</div> : <p className="muted">No company categories have been configured by your University Admin yet.</p>}</div>;
}

function TargetProgressPanel({ data = {}, users = [] }) {
  const targets = data.targets || [];
  const metrics = data.metrics || [];
  const valueFor = (target, key) => metrics.filter((item) => String(item.season_id) === String(target.season_id) && String(item.placement_manager_id) === String(target.user_id) && String(item.category_id || "") === String(target.category_id || "")).reduce((total, item) => total + Number(item[key] || 0), 0);
  return <div className="panel table-panel target-progress-panel"><div className="panel-head"><div><p className="eyebrow">ADMIN-DECLARED TARGETS</p><h3>Your placement targets</h3><span className="muted">Targets are set by the University Admin. Update actual drives and placements in Placement Updates.</span></div></div><table><thead><tr><th>Season</th><th>Manager</th><th>Category</th><th>Company target</th><th>Companies</th><th>Drives</th><th>Placed</th></tr></thead><tbody>{targets.map((target) => <tr key={target.id}><td>{data.seasons?.find((item) => String(item.id) === String(target.season_id))?.name || "Season"}</td><td>{users.find((item) => String(item.id) === String(target.user_id))?.full_name || "Placement manager"}</td><td>{data.categories?.find((item) => String(item.id) === String(target.category_id))?.name || "Category"}</td><td><b>{target.companies_target || 0}</b></td><td>{valueFor(target, "companies_acquired")}</td><td>{valueFor(target, "drives_conducted")}</td><td>{valueFor(target, "students_placed")}</td></tr>)}</tbody></table>{!targets.length && <div className="empty-state"><p className="muted">No targets have been declared for your team yet.</p></div>}</div>;
}

function PlacementManagerTargets({ data = {} }) {
  const targets = data.targets || [];
  const metrics = data.metrics || [];
  const actualFor = (target, key) => metrics
    .filter((item) => String(item.season_id) === String(target.season_id) && String(item.category_id || "") === String(target.category_id || ""))
    .reduce((total, item) => total + Number(item[key] || 0), 0);
  return <div className="panel table-panel manager-target-panel"><div className="panel-head"><div><p className="eyebrow">ADMIN-DECLARED TARGETS</p><h3>My targets by category</h3><span className="muted">A quick view of what the University Admin expects and what coordinators have updated.</span></div><span className="count">{targets.length} target{targets.length === 1 ? "" : "s"}</span></div><table><thead><tr><th>Season</th><th>Category</th><th>Company progress</th><th>Drives</th><th>Offers</th><th>Placed</th></tr></thead><tbody>{targets.map((target) => { const companies = actualFor(target, "companies_acquired"); const progress = target.companies_target ? Math.min(100, Math.round((companies / target.companies_target) * 100)) : 0; return <tr key={target.id}><td>{data.seasons?.find((season) => String(season.id) === String(target.season_id))?.name || "Season"}</td><td><b>{data.categories?.find((category) => String(category.id) === String(target.category_id))?.name || "All categories"}</b></td><td><div className="pm-target-progress"><span><b>{companies}</b> / {target.companies_target || 0}</span><i><em style={{ width: `${progress}%` }} /></i><small>{target.companies_target ? `${progress}% of target` : "No company target"}</small></div></td><td>{actualFor(target, "drives_conducted")}</td><td>{actualFor(target, "offers_received")}</td><td>{actualFor(target, "students_placed")}</td></tr>; })}</tbody></table>{!targets.length && <div className="pm-empty"><Target size={22} /><b>No targets assigned yet</b><span>Your University Admin has not declared a category target for you.</span></div>}</div>;
}

function PlacementCategorySummary({ analytics }) {
  const categories = analytics?.by_category || [];
  const statusColumns = placementPipelineStatuses;
  return <div className="panel table-panel analytics-category-panel"><div className="panel-head"><div><p className="eyebrow">CATEGORY CONTROL TABLE</p><h3>Targets and pipeline by category</h3><span className="muted">Admin-declared targets compared with coordinator-updated company stages.</span></div></div><div className="analytics-grid-scroll" role="region" aria-label="Placement category target and status table" tabIndex="0"><table className="analytics-category-table"><thead><tr><th>Category</th><th>Target</th><th>Tracked</th>{statusColumns.map(([, label]) => <th key={label}>{label}</th>)}<th>Drives</th><th>Offers</th><th>Students placed</th></tr></thead><tbody>{categories.map((category) => <tr key={category.category_id || "uncategorized"}><td><b>{category.category_name || "Uncategorized"}</b></td><td>{category.companies_target || 0}</td><td>{category.organizations_tracked || 0}</td>{statusColumns.map(([key]) => <td key={key}>{category.status_counts?.[key] || 0}</td>)}<td>{category.drives_conducted || 0}</td><td>{category.offers_received || 0}</td><td>{category.students_placed || 0}</td></tr>)}</tbody></table>{!categories.length && <div className="empty-state"><p className="muted">No categories or placement updates are available yet.</p></div>}</div></div>;
}

function PlacementNlpInsights({ seasonId }) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(() => seasonId || localStorage.getItem("placement-season-filter") || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedSeasonId(seasonId || localStorage.getItem("placement-season-filter") || "");
  }, [seasonId]);

  useEffect(() => {
    const handleSeasonFilterChange = (event) => setSelectedSeasonId(event.detail || "");
    window.addEventListener("placement-season-filter-change", handleSeasonFilterChange);
    return () => window.removeEventListener("placement-season-filter-change", handleSeasonFilterChange);
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    setError("");
    try {
      const query = selectedSeasonId ? `?season_id=${encodeURIComponent(selectedSeasonId)}` : "";
      setResult(await apiFetch(`/api/placement/analytics/insights${query}`));
    } catch (requestError) {
      setError(requestError.message || "Insights could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [selectedSeasonId]);

  const providerLabel = result?.provider === "groq" ? "Groq analysis" : "Rules-based analysis";
  return <div className="panel nlp-insights-panel"><div className="panel-head"><div><p className="eyebrow"><Sparkles size={12} /> DASHBOARD NLP</p><h3>Placement signals and recommended follow-ups</h3><span className="muted">Read-only summary of pipeline health, notes, risks, and next actions for the current placement portfolio.</span></div><div className="nlp-panel-actions">{result && <span className={`nlp-provider ${result.provider}`}>{providerLabel}</span>}<button type="button" className="btn secondary" onClick={loadInsights} disabled={loading}><RefreshCw size={13} />{loading ? "Analyzing…" : "Refresh insights"}</button></div></div>{loading ? <div className="nlp-loading" aria-label="Loading dashboard insights"><span /><span /><span /></div> : error ? <div className="nlp-error"><span>{error}</span><button type="button" className="text-btn" onClick={loadInsights}>Try again</button></div> : <><div className="nlp-summary"><Sparkles size={16} /><p>{result?.summary || "No narrative summary is available yet."}</p></div><div className="nlp-insight-grid">{(result?.insights || []).map((insight, index) => <article className={`nlp-insight ${insight.severity || "info"}`} key={`${insight.title}-${index}`}><div className="nlp-insight-top"><span className="nlp-insight-type">{insight.type || "status"}</span><span className="nlp-insight-severity">{insight.severity || "info"}</span></div><h4>{insight.title}</h4><p>{insight.detail}</p>{insight.company_labels?.length > 0 && <div className="nlp-company-list">{insight.company_labels.map((company) => <span key={company}>{company}</span>)}</div>}{insight.recommended_action && <div className="nlp-action"><b>Recommended next step</b><span>{insight.recommended_action}</span></div>}</article>)}</div><small className="nlp-disclaimer">{result?.provider === "groq" ? `Generated with ${result.model || "Groq"} from redacted CRM context.` : "Generated locally from placement stages, dates, outcomes, and follow-up signals."} Insights are advisory; coordinators and placement managers remain responsible for verifying the underlying record.</small></>}</div>;
}

function AnalyticsCanvasSection({ eyebrow, title, description, children, defaultOpen = true, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  const displayedEyebrow = { "6 · COMPARISONS": "1 · COMPARISONS", "1 · TARGET DELIVERY": "2 · TARGET DELIVERY", "2 · CATEGORY PIPELINE": "3 · CATEGORY PIPELINE", "3 · CRITICAL WORK": "4 · CRITICAL WORK", "4 · PIPELINE HEALTH": "5 · PIPELINE HEALTH", "5 · OUTCOMES": "6 · OUTCOMES", "7 · DETAIL": "7 · DETAIL" }[eyebrow] || eyebrow;
  return <details className={`analytics-canvas-section panel ${className}`} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>
      <div><p className="eyebrow">{displayedEyebrow}</p><h3>{title}</h3>{description && <span className="muted">{description}</span>}</div>
      <ChevronRight size={18} aria-hidden="true" />
    </summary>
    <div className="analytics-canvas-section-body">{children}</div>
  </details>;
}

function PlacementAnalyticsCanvas({ analytics, data = {}, role, onDrillThrough }) {
  const [cycleFilter, setCycleFilter] = useState(() => localStorage.getItem("placement-season-filter") || "");
  const [managerFilter, setManagerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [outlookFilter, setOutlookFilter] = useState("");
  const [driveFilter, setDriveFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [focusFilter, setFocusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState("canvas");
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const allRows = (analytics?.rows || []).filter((row) => row.pipeline_status !== "joined");
  const seasons = data.seasons || [];
  const targets = data.targets || [];
  const categories = data.categories || [];
  const industries = data.industries || [];
  const today = new Date().toISOString().slice(0, 10);
  const inNext30Days = (value) => value && today <= value && value <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const managerOptions = [...new Map(allRows.filter((row) => row.placement_manager_id).map((row) => [String(row.placement_manager_id), { id: row.placement_manager_id, name: row.placement_manager_name || "Placement manager" }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const categoryOptions = [...new Map([...categories.map((item) => [String(item.id), { id: item.id, name: item.name }]), ...allRows.filter((row) => row.category_id).map((row) => [String(row.category_id), { id: row.category_id, name: row.category_name || "Category" }])]).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const cityOptions = [...new Set(allRows.map((row) => row.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const industryOptions = [...new Map([...industries.map((item) => [String(item.id), { id: item.id, name: item.name }]), ...allRows.filter((row) => row.industry).map((row) => [String(row.industry_id || row.industry), { id: row.industry_id || row.industry, name: row.industry }])]).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const matchesDate = (row) => {
    if (dateFilter === "next_30") return inNext30Days(row.expected_date);
    if (dateFilter === "overdue") return row.next_follow_up_date && row.next_follow_up_date < today && row.pipeline_status !== "cancelled";
    if (dateFilter === "last_30") return row.last_contact_date && row.last_contact_date >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return true;
  };
  const rowMatches = (row) => {
    const text = `${row.organization_name || ""} ${row.city || ""} ${row.industry || ""} ${row.placement_manager_name || ""} ${row.category_name || ""} ${row.next_action || ""}`.toLowerCase();
    if (cycleFilter && String(row.season_id) !== String(cycleFilter)) return false;
    if (managerFilter && String(row.placement_manager_id) !== String(managerFilter)) return false;
    if (categoryFilter && String(row.category_id || "") !== String(categoryFilter)) return false;
    if (industryFilter && String(row.industry_id || row.industry || "") !== String(industryFilter)) return false;
    if (cityFilter && String(row.city || "") !== String(cityFilter)) return false;
    if (statusFilter && String(row.pipeline_status || "prospect") !== String(statusFilter)) return false;
    if (outlookFilter && String(row.outlook || "neutral") !== String(outlookFilter)) return false;
    if (driveFilter && String(row.drive_status || "not_scheduled") !== String(driveFilter)) return false;
    if (!matchesDate(row)) return false;
    if (focusFilter === "missing_action" && (row.next_action || row.notes)) return false;
    if (focusFilter === "stalled" && row.pipeline_status !== "on_hold") return false;
    return !search.trim() || text.includes(search.trim().toLowerCase());
  };
  const rows = allRows.filter(rowMatches);
  const analyticsManagerNames = new Map((analytics?.by_manager || []).map((item) => [String(item.placement_manager_id), item.placement_manager_name || "Placement manager"]));
  const filteredTargets = targets.filter((row) => (!cycleFilter || String(row.season_id) === String(cycleFilter)) && (!managerFilter || String(row.user_id) === String(managerFilter)) && (!categoryFilter || String(row.category_id || "") === String(categoryFilter))).map((row) => ({
    ...row,
    user_name: analyticsManagerNames.get(String(row.user_id)) || row.user_name || "Placement manager",
    category_name: row.category_id ? categories.find((item) => String(item.id) === String(row.category_id))?.name || row.category_name || "Category" : "All categories",
    season_name: seasons.find((item) => String(item.id) === String(row.season_id))?.name || row.season_name || "Season",
  }));
  const metricKeys = ["companies_acquired", "drives_conducted", "offers_received", "students_placed"];
  const targetKeys = ["companies_target"];
  const totals = Object.fromEntries(metricKeys.map((key) => [key, rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)]));
  const targetTotals = Object.fromEntries(targetKeys.map((key) => [key, filteredTargets.reduce((sum, row) => sum + Number(row[key] || 0), 0)]));
  const statusCounts = Object.fromEntries(placementPipelineStatuses.map(([key]) => [key, rows.filter((row) => (row.pipeline_status || "prospect") === key).length]));
  const outlookCounts = Object.fromEntries(placementOutlooks.map(([key]) => [key, rows.filter((row) => (row.outlook || "neutral") === key).length]));
  const driveCounts = Object.fromEntries(placementDriveStatuses.map(([key]) => [key, rows.filter((row) => (row.drive_status || "not_scheduled") === key).length]));
  const conversionRate = (from, to) => totals[from] ? Math.round((totals[to] / totals[from]) * 100) : 0;
  const progress = targetTotals.companies_target ? Math.min(100, Math.round((totals.companies_acquired / targetTotals.companies_target) * 100)) : 0;
  const targetProgress = (actual, target) => target ? Math.round((Number(actual || 0) / Number(target)) * 100) : null;
  const summary = {
    active: rows.filter((row) => !["cancelled", "placed", "joined"].includes(row.pipeline_status)).length,
    overdue: rows.filter((row) => row.next_follow_up_date && row.next_follow_up_date < today && row.pipeline_status !== "cancelled").length,
    upcoming: rows.filter((row) => inNext30Days(row.expected_date) && row.pipeline_status !== "cancelled").length,
    negative: rows.filter((row) => row.outlook === "negative").length,
    missingAction: rows.filter((row) => !row.next_action && !row.notes && !["joined", "cancelled"].includes(row.pipeline_status)).length,
    stalled: rows.filter((row) => row.pipeline_status === "on_hold").length,
  };
  const activeFilterCount = [cycleFilter, managerFilter, categoryFilter, industryFilter, cityFilter, statusFilter, outlookFilter, driveFilter, dateFilter, focusFilter, search.trim()].filter(Boolean).length;
  const cycleName = seasons.find((item) => String(item.id) === String(cycleFilter))?.name || "All cycles";
  const labelFor = (options, value) => options.find(([key]) => key === value)?.[1] || value;
  const statusClass = (value) => String(value || "").replaceAll("_", "-");
  const filterNames = { cycle: cycleFilter ? cycleName : "", manager: managerOptions.find((item) => String(item.id) === String(managerFilter))?.name, category: categoryOptions.find((item) => String(item.id) === String(categoryFilter))?.name, industry: industryOptions.find((item) => String(item.id) === String(industryFilter))?.name || industryFilter, city: cityFilter, status: labelFor(placementPipelineStatuses, statusFilter), outlook: labelFor(placementOutlooks, outlookFilter), drive: labelFor(placementDriveStatuses, driveFilter), date: dateFilter === "next_30" ? "Expected next 30 days" : dateFilter === "overdue" ? "Overdue follow-ups" : dateFilter === "last_30" ? "Contacted in last 30 days" : "", focus: focusFilter === "missing_action" ? "Missing next action" : focusFilter === "stalled" ? "On hold" : "", search: search.trim() };
  const resetFilters = () => { setCycleFilter(""); setManagerFilter(""); setCategoryFilter(""); setIndustryFilter(""); setCityFilter(""); setStatusFilter(""); setOutlookFilter(""); setDriveFilter(""); setDateFilter(""); setFocusFilter(""); setSearch(""); localStorage.removeItem("placement-season-filter"); };
  const removeFilter = (key) => ({ cycle: () => setCycleFilter(""), manager: () => setManagerFilter(""), category: () => setCategoryFilter(""), industry: () => setIndustryFilter(""), city: () => setCityFilter(""), status: () => setStatusFilter(""), outlook: () => setOutlookFilter(""), drive: () => setDriveFilter(""), date: () => setDateFilter(""), focus: () => setFocusFilter(""), search: () => setSearch("") }[key]?.());
  const setCycle = (value) => { setCycleFilter(value); if (value) localStorage.setItem("placement-season-filter", value); else localStorage.removeItem("placement-season-filter"); };
  const suggestedQuestions = [
    "What needs attention right now?",
    "Are we on track against targets?",
    "Which manager is leading on placements?",
    "Where is the pipeline strongest?",
  ];
  const askAnalytics = async (questionOverride) => {
    const questionText = String(questionOverride ?? query).trim();
    if (!questionText) return;
    setQuery(questionText);
    setQueryLoading(true);
    setQueryError("");
    try {
      const result = await apiFetch("/api/placement/analytics/query", {
        method: "POST",
        body: JSON.stringify({
          question: questionText,
          season_id: cycleFilter || null,
          filters: {
            manager: managerFilter,
            category: categoryFilter,
            industry: industryFilter,
            city: cityFilter,
            status: statusFilter,
            outlook: outlookFilter,
            drive: driveFilter,
            date: dateFilter,
            focus: focusFilter,
            search: search.trim(),
          },
        }),
      });
      setQueryResult(result);
    } catch (requestError) {
      setQueryResult(null);
      setQueryError(requestError.message || "The analytics answer could not be generated.");
    } finally {
      setQueryLoading(false);
    }
  };
  useEffect(() => {
    if (cycleFilter && seasons.length && !seasons.some((season) => String(season.id) === String(cycleFilter))) setCycle("");
  }, [seasons, cycleFilter]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("placement-season-filter-change", { detail: cycleFilter }));
  }, [cycleFilter]);
  useEffect(() => {
    setQueryResult(null);
    setQueryError("");
  }, [cycleFilter, managerFilter, categoryFilter, industryFilter, cityFilter, statusFilter, outlookFilter, driveFilter, dateFilter, focusFilter, search]);
  const aggregate = (key, labelKey) => {
    const map = new Map();
    rows.forEach((row) => {
      const id = String(row[key] || "unspecified");
      const item = map.get(id) || { id, label: row[labelKey] || "Unspecified", companies_acquired: 0, drives_conducted: 0, offers_received: 0, students_placed: 0 };
      metricKeys.forEach((metric) => { item[metric] += Number(row[metric] || 0); });
      map.set(id, item);
    });
    return [...map.values()].sort((a, b) => b.students_placed - a.students_placed);
  };
  const managerRows = aggregate("placement_manager_id", "placement_manager_name");
  const categoryRows = aggregate("category_id", "category_name");
  const cityRows = aggregate("city", "city");
  const industryRows = aggregate("industry", "industry");
  const categoryMatrix = (() => {
    const matrix = new Map();
    const createRow = (id, label) => ({ id, label: label || "Uncategorized", companies_target: 0, companies_acquired: 0, drives_conducted: 0, offers_received: 0, students_placed: 0, tracked: 0, trackedIds: new Set(), statusCounts: Object.fromEntries(placementPipelineStatuses.map(([key]) => [key, 0])) });
    const ensure = (id, label) => {
      const key = String(id || "uncategorized");
      if (!matrix.has(key)) matrix.set(key, createRow(key, label));
      return matrix.get(key);
    };
    categories.filter((item) => !categoryFilter || String(item.id) === String(categoryFilter)).forEach((item) => ensure(item.id, item.name));
    filteredTargets.forEach((target) => {
      const item = ensure(target.category_id || "all-categories", target.category_id ? categories.find((category) => String(category.id) === String(target.category_id))?.name : "All categories");
      targetKeys.forEach((key) => { item[key] += Number(target[key] || 0); });
    });
    rows.forEach((row) => {
      const item = ensure(row.category_id || "uncategorized", row.category_name || "Uncategorized");
      metricKeys.forEach((key) => { item[key] += Number(row[key] || 0); });
      if (row.organization_id) item.trackedIds.add(String(row.organization_id));
      const status = row.pipeline_status || "prospect";
      item.statusCounts[status] = (item.statusCounts[status] || 0) + 1;
    });
    return [...matrix.values()].map((item) => ({ ...item, tracked: item.trackedIds.size })).sort((a, b) => (b.students_placed + b.companies_acquired) - (a.students_placed + a.companies_acquired));
  })();
  const funnel = [["students_registered", "Registered", rows.reduce((sum, row) => sum + Number(row.students_registered || 0), 0)], ["students_selected", "Selected", rows.reduce((sum, row) => sum + Number(row.students_selected || 0), 0)], ["offers_received", "Offers", totals.offers_received], ["students_placed", "Placed", totals.students_placed]];
  const maxStage = Math.max(1, ...funnel.map(([, , value]) => value));
  const toggleRow = (id) => setExpandedRows((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const exportRows = [["Company", "Manager", "Cycle", "Category", "Industry", "Pipeline stage", "Outlook", "Expected date", "Drive status", "Registered", "Selected", "Offers", "Placed", "Follow-up", "Next action"], ...rows.map((row) => [row.organization_name, row.placement_manager_name, row.season_name, row.category_name, row.industry, row.pipeline_status_label, row.outlook_label, row.expected_date, row.drive_status_label, row.students_registered, row.students_selected, row.offers_received, row.students_placed, row.next_follow_up_date, row.next_action])];
  const open = (title, subtitle, drillRows, columns) => onDrillThrough?.({ title, subtitle, rows: drillRows, columns });
  const placementColumns = [{ key: "organization_name", label: "Company" }, { key: "placement_manager_name", label: "Owner" }, { key: "pipeline_status_label", label: "Stage" }, { key: "students_placed", label: "Placed" }];
  const attentionRows = { overdue: rows.filter((row) => row.next_follow_up_date && row.next_follow_up_date < today && row.pipeline_status !== "cancelled"), upcoming: rows.filter((row) => inNext30Days(row.expected_date) && row.pipeline_status !== "cancelled"), negative: rows.filter((row) => row.outlook === "negative"), missing_action: rows.filter((row) => !row.next_action && !row.notes && row.pipeline_status !== "cancelled"), stalled: rows.filter((row) => row.pipeline_status === "on_hold") };
  const outcomeRows = (key) => rows.filter((row) => Number(row[key] || 0) > 0);
  const comparisonRecords = (label, item) => label === "Manager" ? rows.filter((row) => String(row.placement_manager_id || "") === String(item.id)) : label === "Category" ? rows.filter((row) => String(row.category_id || "") === String(item.id)) : label === "Industry" ? rows.filter((row) => String(row.industry_id || row.industry || "") === String(item.id)) : rows.filter((row) => String(row.city || "") === String(item.id));
  const kpis = [["Companies acquired", totals.companies_acquired, `${progress}% of target`, "", () => open("Companies acquired", "Filtered placement records behind this KPI", rows.filter((row) => Number(row.companies_acquired || 0) > 0), placementColumns)], ["Company target", targetTotals.companies_target, `${progress}% acquired`, "", () => open("Company target delivery", "Target records in the current filter context", filteredTargets, [{ key: "user_name", label: "Owner" }, { key: "category_name", label: "Category" }, { key: "companies_target", label: "Target" }])], ["Drives completed", totals.drives_conducted, `${driveCounts.completed || 0} completed`, "", () => open("Drives completed", "Placement records with completed drives", rows.filter((row) => Number(row.drives_conducted || 0) > 0), placementColumns)], ["Offers received", totals.offers_received, `${conversionRate("students_selected", "offers_received")}% of selected`, "", () => open("Offers received", "Placement records behind offer outcomes", rows.filter((row) => Number(row.offers_received || 0) > 0), placementColumns)], ["Students placed", totals.students_placed, `${conversionRate("offers_received", "students_placed")}% of offers`, "", () => open("Students placed", "Placement records behind placed outcomes", rows.filter((row) => Number(row.students_placed || 0) > 0), placementColumns)], ["Active pipeline", summary.active, `${rows.length} tracked records`, "", () => open("Active pipeline", "Open placement records in the current filter context", rows.filter((row) => row.pipeline_status !== "cancelled"), placementColumns)], ["Needs attention", summary.overdue + summary.negative, `${summary.overdue} overdue · ${summary.negative} negative`, summary.overdue + summary.negative ? "danger" : "success", () => open("Placement attention", "Overdue and negative-outlook records", rows.filter((row) => (row.next_follow_up_date && row.next_follow_up_date < today) || row.outlook === "negative"), placementColumns)]];
  return <div className="dashboard analytics-canvas">
    <div className="analytics-canvas-hero"><div><p className="eyebrow">{role === "data_analyst" ? "ANALYTICS WORKSPACE" : "PLACEMENT INTELLIGENCE"}</p><h2>Placement analytics</h2><p className="muted">A decision-ready view of targets, pipeline health, outcomes, and follow-through for {cycleName.toLowerCase()}.</p></div><div className="analytics-hero-actions"><div className="analytics-view-toggle" role="tablist" aria-label="Analytics view"><button type="button" className={viewMode === "canvas" ? "active" : ""} role="tab" aria-selected={viewMode === "canvas"} onClick={() => setViewMode("canvas")}><LayoutDashboard size={13} />Canvas</button><button type="button" className={viewMode === "query" ? "active" : ""} role="tab" aria-selected={viewMode === "query"} onClick={() => setViewMode("query")}><Sparkles size={13} />Ask analytics</button></div><span className="analytics-view-badge"><span className="status-dot" />Live university view</span><button className="btn secondary" onClick={() => downloadCsv("vextra-placement-analytics.csv", exportRows)}><Download size={14} />Export CSV</button><button className="btn secondary" onClick={() => window.print()}>Print / PDF</button></div></div>
    {viewMode === "query" && <section className="panel analytics-query-panel" aria-labelledby="analytics-query-title"><div className="analytics-query-heading"><div><p className="eyebrow"><Sparkles size={12} /> ASK ANALYTICS</p><h3 id="analytics-query-title">Ask a question about this placement view</h3><p className="muted">Get a plain-language answer grounded in the current slicers, targets, pipeline, outcomes, and follow-up data.</p></div><span className="analytics-query-scope"><span className="status-dot" />{rows.length} records in this view</span></div><form className="analytics-query-form" onSubmit={(event) => { event.preventDefault(); askAnalytics(); }}><div className="analytics-query-input"><Sparkles size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Which companies need attention before the next drive?" aria-label="Ask a question about analytics" /><button type="submit" className="btn primary" disabled={queryLoading || !query.trim()}>{queryLoading ? <><Loader2 size={14} className="spin" />Thinking…</> : <>Ask question <ArrowUpRight size={14} /></>}</button></div></form><div className="analytics-query-suggestions"><span>Try asking</span>{suggestedQuestions.map((question) => <button type="button" key={question} onClick={() => askAnalytics(question)}>{question}</button>)}</div>{queryLoading && <div className="analytics-query-loading" aria-label="Generating analytics answer"><span /><span /><span /></div>}{queryError && !queryLoading && <div className="analytics-query-error"><span>{queryError}</span><button type="button" className="text-btn" onClick={() => askAnalytics()}>Try again</button></div>}{queryResult && !queryLoading && !queryError && <div className="analytics-query-answer" aria-live="polite"><div className="analytics-query-answer-top"><span className="analytics-query-label"><Sparkles size={14} />{queryResult.provider === "groq" ? "AI answer" : "Rules-based answer"}</span><span className="muted">Based on {queryResult.scope?.records ?? rows.length} filtered records</span></div><p>{queryResult.answer}</p>{queryResult.references?.length > 0 && <div className="analytics-query-references"><span>References</span>{queryResult.references.map((reference) => <span className="analytics-query-reference" key={reference}>{reference}</span>)}</div>}<small>{queryResult.provider === "groq" ? `Generated with ${queryResult.model || "the configured AI model"}.` : "AI service unavailable, so this answer was generated locally from the same analytics data."} Answers are advisory; verify the underlying record before taking action.</small></div>}{!queryResult && !queryLoading && !queryError && <div className="analytics-query-empty"><Sparkles size={19} /><span>Ask about targets, risks, managers, industries, cities, pipeline stages, or outcomes.</span></div>}</section>}
    <div className="analytics-slicer-shell panel"><div className="analytics-slicer-head"><div><p className="eyebrow">GLOBAL SLICERS</p><h3>Choose the view you want to analyse</h3><span className="muted">Cycle controls the whole canvas. The remaining slicers refine every KPI, visual, alert, and record below.</span></div><div className="analytics-slicer-actions"><span className="count">{activeFilterCount} active</span><button type="button" className="text-btn" onClick={resetFilters} disabled={!activeFilterCount}>Reset all</button><button type="button" className="icon-btn analytics-filter-toggle" onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen} aria-controls="analytics-slicers">{filtersOpen ? "Hide filters" : "Show filters"}<ChevronRight size={15} className={filtersOpen ? "is-open" : ""} /></button></div></div>{filtersOpen && <div id="analytics-slicers" className="analytics-slicers"><label className="analytics-slicer primary"><span>Cycle / season</span><select value={cycleFilter} onChange={(event) => setCycle(event.target.value)}><option value="">All cycles</option>{seasons.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.academic_year}</option>)}</select></label><label className="analytics-slicer search-slicer"><span>Search records</span><div className="search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Company, manager, industry, city, action…" /></div></label><label className="analytics-slicer"><span>Manager</span><select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)}><option value="">All managers</option>{managerOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="analytics-slicer"><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categoryOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="analytics-slicer"><span>Industry</span><select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}><option value="">All industries</option>{industryOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="analytics-slicer"><span>City</span><select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option value="">All cities</option>{cityOptions.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label className="analytics-slicer"><span>Pipeline stage</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All stages</option>{placementPipelineStatuses.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="analytics-slicer"><span>Outlook</span><select value={outlookFilter} onChange={(event) => setOutlookFilter(event.target.value)}><option value="">All outlooks</option>{placementOutlooks.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="analytics-slicer"><span>Drive status</span><select value={driveFilter} onChange={(event) => setDriveFilter(event.target.value)}><option value="">All drive statuses</option>{placementDriveStatuses.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="analytics-slicer"><span>Date focus</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="">All dates</option><option value="next_30">Expected next 30 days</option><option value="overdue">Overdue follow-ups</option><option value="last_30">Contacted in last 30 days</option></select></label></div>}{activeFilterCount > 0 && <div className="analytics-filter-chips">{Object.entries(filterNames).filter(([, value]) => value).map(([key, value]) => <button type="button" className="analytics-filter-chip" key={key} onClick={() => removeFilter(key)}>{key === "cycle" ? "Cycle" : key === "date" ? "Date" : key === "focus" ? "Focus" : key[0].toUpperCase() + key.slice(1)}: {value}<X size={12} /></button>)}</div>}</div>
    <AnalyticsCanvasSection eyebrow="6 · COMPARISONS" title="What patterns should an analyst investigate?" description="These tables use the same active filter context and are intentionally limited to decision-useful comparisons." className="comparison-canvas-section"><div className="analytics-comparison-grid">{[["Placement managers", managerRows, "Manager"], ["Categories", categoryRows, "Category"], ["Industries", industryRows, "Industry"], ["Cities", cityRows, "City"]].map(([title, comparisonRows, label]) => <div className="analytics-comparison-card" key={title}><div className="analytics-subhead"><div><b>{title}</b><span>Ranked by students placed</span></div><span className="count">{comparisonRows.length}</span></div><div className="analytics-comparison-table"><div className="analytics-comparison-header"><span>{label}</span><span>Companies</span><span>Placed</span></div>{comparisonRows.slice(0, 8).map((row) => <div className="analytics-comparison-row" key={row.id}><span title={row.label}>{row.label}</span><b>{row.companies_acquired || 0}</b><b>{row.students_placed || 0}</b></div>)}{!comparisonRows.length && <p className="muted analytics-no-data">No comparison data in this view.</p>}</div></div>)}</div></AnalyticsCanvasSection>
    <div className="analytics-context-line"><span><b>{rows.length}</b> of {allRows.length} placement records shown</span><span>Targets respect cycle, manager, and category filters</span><span>Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
    <div className="report-stats analytics-stat-grid analytics-canvas-kpis">{kpis.map(([label, value, note, tone, action]) => <button type="button" className={`stat analytics-kpi analytics-kpi-button ${tone || ""}`} key={label} onClick={action}><span>{label}</span><strong>{value || 0}</strong><small>{note}</small><ArrowUpRight size={14} /></button>)}</div>
    <AnalyticsCanvasSection eyebrow="1 · TARGET DELIVERY" title="Are we on track against the declared target?" description="Company targets are declared by the University Admin. Drives, offers, and placements are shown as actual operational outcomes." className="target-canvas-section"><div className="analytics-target-summary"><div><span>Company acquisition</span><strong>{progress}%</strong><small>{totals.companies_acquired || 0} acquired of {targetTotals.companies_target || 0} target companies</small></div><div className="analytics-progress-track"><i style={{ width: `${progress}%` }} /></div><div className="analytics-target-summary-meta"><span><b>{targetTotals.companies_target || 0}</b> company target</span><span><b>{totals.drives_conducted || 0}</b> drives completed</span><span><b>{totals.offers_received || 0}</b> offers received</span><span><b>{totals.students_placed || 0}</b> placed</span></div></div><div className="analytics-mini-grid">{[["Companies", totals.companies_acquired, targetTotals.companies_target], ["Drives", totals.drives_conducted, null], ["Offers", totals.offers_received, null], ["Placed", totals.students_placed, null]].map(([label, actual, target]) => { const hasTarget = label === "Companies" && Number(target || 0) > 0; const completion = hasTarget ? targetProgress(actual, target) : null; return <div className={hasTarget && completion >= 100 ? "met" : ""} key={label}><span>{label}</span><b>{actual || 0}{hasTarget && <small> / {target} target</small>}</b><div className="analytics-mini-meta"><span>{hasTarget ? `${completion}%` : "Actual only"}</span>{hasTarget && completion > 100 && <em>+{Number(actual || 0) - Number(target || 0)} over</em>}</div><i><em style={{ width: `${hasTarget ? Math.min(100, completion) : 0}%` }} /></i></div>; })}</div></AnalyticsCanvasSection>
    <AnalyticsCanvasSection eyebrow="2 · CATEGORY PIPELINE" title="Where is each category in the pipeline?" description="Company targets, stage distribution, and operational outcomes in one filtered matrix." className="category-matrix-canvas-section"><div className="analytics-category-matrix-scroll" role="region" aria-label="Category pipeline matrix" tabIndex="0"><table className="analytics-category-matrix"><thead><tr><th>Category</th><th>Company target</th><th>Tracked</th>{placementPipelineStatuses.map(([key, label]) => <th key={key}>{label}</th>)}<th>Drives</th><th>Offers</th><th>Placed</th></tr></thead><tbody>{categoryMatrix.map((row) => <tr key={row.id} className="analytics-drill-table-row" role="button" tabIndex="0" onClick={() => open(`${row.label} category`, "Placement records in this category", rows.filter((item) => String(item.category_id || "") === String(row.id)), placementColumns)}><td><b>{row.label}</b></td><td><strong>{row.companies_target || 0}</strong></td><td>{row.tracked || 0}</td>{placementPipelineStatuses.map(([key]) => <td key={key}>{row.statusCounts[key] || 0}</td>)}<td>{row.drives_conducted || 0}</td><td>{row.offers_received || 0}</td><td>{row.students_placed || 0}</td></tr>)}</tbody></table>{!categoryMatrix.length && <div className="empty-state"><p className="muted">No category pipeline data is available in this view.</p></div>}</div></AnalyticsCanvasSection>
    <AnalyticsCanvasSection eyebrow="3 · CRITICAL WORK" title="What needs attention next?" description="Select a signal to focus the entire canvas on the records behind it." className="critical-work-section"><div className="analytics-alert-grid">{[["overdue", "Overdue follow-ups", summary.overdue, "Follow-ups past their due date", "danger", () => setDateFilter("overdue")], ["upcoming", "Upcoming activity", summary.upcoming, "Expected within 30 days", "info", () => setDateFilter("next_30")], ["negative", "Negative outlook", summary.negative, "Companies needing a recovery plan", "danger", () => setOutlookFilter("negative")], ["missing_action", "Missing next action", summary.missingAction, "Records without a clear next step", "warning", () => setFocusFilter("missing_action")], ["stalled", "On hold", summary.stalled, "Pipeline records temporarily paused", "warning", () => setFocusFilter("stalled")]].map(([key, label, count, note, tone, action]) => <button type="button" className={`analytics-alert-card ${tone} ${focusFilter === key || (key === "overdue" && dateFilter === "overdue") || (key === "upcoming" && dateFilter === "next_30") || (key === "negative" && outlookFilter === "negative") ? "selected" : ""}`} key={key} onClick={() => { action(); open(label, note, attentionRows[key], placementColumns); }}><span>{label}</span><strong>{count}</strong><small>{note}</small><ArrowUpRight size={15} /></button>)}</div></AnalyticsCanvasSection>
    <div className="analytics-visual-grid"><AnalyticsCanvasSection eyebrow="4 · PIPELINE HEALTH" title="Where are companies in the journey?" description="Click a stage to filter the canvas and open its records." className="pipeline-canvas-section"><div className="analytics-bar-list">{placementPipelineStatuses.map(([key, label]) => { const count = statusCounts[key] || 0; return <button type="button" className={`analytics-bar-row ${statusFilter === key ? "selected" : ""}`} key={key} onClick={() => { setStatusFilter(statusFilter === key ? "" : key); open(`${label} pipeline`, `Placement records in ${label}`, rows.filter((row) => (row.pipeline_status || "prospect") === key), placementColumns); }}><span>{label}</span><i><em style={{ width: `${Math.round((count / Math.max(1, ...Object.values(statusCounts))) * 100)}%` }} /></i><b>{count}</b></button>; })}</div></AnalyticsCanvasSection><AnalyticsCanvasSection eyebrow="5 · OUTCOMES" title="How is the funnel converting?" description="Click an outcome to open the companies behind that volume." className="outcomes-canvas-section"><div className="analytics-funnel">{funnel.map(([key, label, value], index) => <button type="button" className="analytics-funnel-row" key={key} onClick={() => open(label, "Placement records behind this outcome", outcomeRows(key), placementColumns)}><span>{label}</span><i><em style={{ width: `${Math.round((value / maxStage) * 100)}%` }} /></i><b>{value || 0}</b>{index > 0 && <small>{funnel[index - 1][2] ? `${Math.round((value / funnel[index - 1][2]) * 100)}%` : "0%"}</small>}</button>)}</div></AnalyticsCanvasSection></div>
    <AnalyticsCanvasSection eyebrow="7 · DETAIL" title="Which records make up this result?" description="Review the filtered companies without letting a wide table expand the whole page." className="detail-canvas-section"><div className="analytics-detail-toolbar"><span><b>{rows.length}</b> records in current view</span><span className="muted">Expand a row for registration, selection, offer, and follow-up detail.</span></div><div className="analytics-detail-scroll" role="region" aria-label="Filtered placement records" tabIndex="0"><table className="analytics-detail-table"><thead><tr><th aria-label="Expand" /><th>Company</th><th>Owner</th><th>Cycle</th><th>Category</th><th>Stage</th><th>Outlook</th><th>Expected</th><th>Drive</th><th>Placed</th></tr></thead><tbody>{rows.map((row) => { const expanded = expandedRows.has(row.id); return <React.Fragment key={row.id}><tr className={row.outlook === "negative" || row.pipeline_status === "cancelled" ? "analytics-row-negative" : ""}><td><button type="button" className="analytics-expand-btn" aria-label={`${expanded ? "Collapse" : "Expand"} ${row.organization_name || "company"}`} aria-expanded={expanded} onClick={() => toggleRow(row.id)}><ChevronRight size={15} className={expanded ? "is-open" : ""} /></button></td><td><b>{row.organization_name || "Organization"}</b><small>{row.city || row.industry || "—"}</small></td><td>{row.placement_manager_name || "Placement manager"}</td><td>{row.season_name || "Cycle"}</td><td>{row.category_name || "Uncategorized"}</td><td><span className={`pipeline-status ${statusClass(row.pipeline_status)}`}>{row.pipeline_status_label || labelFor(placementPipelineStatuses, row.pipeline_status)}</span></td><td><span className={`outlook-pill ${row.outlook || "neutral"}`}>{row.outlook_label || labelFor(placementOutlooks, row.outlook)}</span></td><td className={row.expected_date && row.expected_date < today && row.pipeline_status !== "cancelled" ? "danger-number" : ""}>{row.expected_date || "—"}</td><td><span className={`drive-pill ${statusClass(row.drive_status)}`}>{row.drive_status_label || labelFor(placementDriveStatuses, row.drive_status)}</span></td><td>{row.students_placed || 0}</td></tr>{expanded && <tr className="analytics-detail-expanded"><td colSpan="10"><div><span><b>Registered</b>{row.students_registered || 0}</span><span><b>Selected</b>{row.students_selected || 0}</span><span><b>Offers</b>{row.offers_received || 0}</span><span><b>Follow-up</b>{row.next_follow_up_date || "—"}</span><span><b>Next action</b>{row.next_action || row.notes || "No next action recorded"}</span></div></td></tr>}</React.Fragment>})}</tbody></table>{!rows.length && <div className="empty-state"><h3>No records match this view</h3><p className="muted">Reset a filter or choose a broader cycle to see placement records.</p></div>}</div></AnalyticsCanvasSection>
  </div>;
}

function PlacementAnalytics({ analytics, data = {}, role }) {
  const [seasonFilter, setSeasonFilter] = useState(() => localStorage.getItem("placement-season-filter") || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [outlookFilter, setOutlookFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [search, setSearch] = useState("");
  const allRows = analytics?.rows || [];
  const rows = seasonFilter ? allRows.filter((row) => String(row.season_id) === String(seasonFilter)) : allRows;
  const targetRows = (data.targets || []).filter((row) => !seasonFilter || String(row.season_id) === String(seasonFilter));
  const metricKeys = ["companies_acquired", "drives_conducted", "offers_received", "students_placed", "students_joined"];
  const targetKeys = ["companies_target"];
  const totals = metricKeys.reduce((result, key) => ({ ...result, [key]: rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) }), {});
  const targetTotals = targetKeys.reduce((result, key) => ({ ...result, [key]: targetRows.reduce((sum, row) => sum + Number(row[key] || 0), 0) }), {});
  const statusCounts = Object.fromEntries(placementPipelineStatuses.map(([key]) => [key, rows.filter((row) => (row.pipeline_status || "prospect") === key).length]));
  const outlookCounts = Object.fromEntries(placementOutlooks.map(([key]) => [key, rows.filter((row) => (row.outlook || "neutral") === key).length]));
  const driveStatusCounts = Object.fromEntries(placementDriveStatuses.map(([key]) => [key, rows.filter((row) => (row.drive_status || "not_scheduled") === key).length]));
  const today = new Date().toISOString().slice(0, 10);
  const summary = {
    companies_in_pipeline: rows.filter((row) => row.pipeline_status !== "cancelled").length,
    active_pipeline: rows.filter((row) => !["cancelled", "joined", "placed"].includes(row.pipeline_status)).length,
    cancelled: statusCounts.cancelled || 0,
    overdue_followups: rows.filter((row) => row.next_follow_up_date && row.next_follow_up_date < today && row.pipeline_status !== "cancelled").length,
    expected_next_30_days: rows.filter((row) => row.expected_date && today <= row.expected_date && row.expected_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) && row.pipeline_status !== "cancelled").length,
    positive_outlook: outlookCounts.positive || 0,
    negative_outlook: outlookCounts.negative || 0,
  };
  const managerNames = new Map((analytics?.by_manager || []).map((row) => [String(row.placement_manager_id), row.placement_manager_name]));
  const managersById = new Map();
  rows.forEach((row) => {
    const id = String(row.placement_manager_id);
    const item = managersById.get(id) || { placement_manager_id: id, placement_manager_name: managerNames.get(id) || "Placement manager", ...Object.fromEntries(metricKeys.map((key) => [key, 0])) };
    metricKeys.forEach((key) => { item[key] += Number(row[key] || 0); });
    managersById.set(id, item);
  });
  targetRows.forEach((row) => {
    const id = String(row.user_id);
    const item = managersById.get(id) || { placement_manager_id: id, placement_manager_name: managerNames.get(id) || "Placement manager", ...Object.fromEntries(metricKeys.map((key) => [key, 0])) };
    targetKeys.forEach((key) => { item[key] = (item[key] || 0) + Number(row[key] || 0); });
    managersById.set(id, item);
  });
  const managers = [...managersById.values()];
  const categoryNames = new Map((data.categories || []).map((row) => [String(row.id), row.name]));
  const categoryMap = new Map();
  const categoryItem = (id) => {
    const key = id || "uncategorized";
    if (!categoryMap.has(key)) categoryMap.set(key, { category_id: key === "uncategorized" ? null : key, category_name: categoryNames.get(key) || (key === "uncategorized" ? "Uncategorized" : "Category"), organizations_tracked: new Set(), status_counts: Object.fromEntries(placementPipelineStatuses.map(([status]) => [status, 0])), ...Object.fromEntries([...metricKeys, ...targetKeys].map((field) => [field, 0])) });
    return categoryMap.get(key);
  };
  (data.categories || []).forEach((category) => categoryItem(String(category.id)));
  rows.forEach((row) => {
    const item = categoryItem(row.category_id);
    metricKeys.forEach((key) => { item[key] += Number(row[key] || 0); });
    item.status_counts[row.pipeline_status || "prospect"] = (item.status_counts[row.pipeline_status || "prospect"] || 0) + 1;
    if (row.organization_id) item.organizations_tracked.add(String(row.organization_id));
  });
  targetRows.forEach((row) => {
    const item = categoryItem(row.category_id);
    targetKeys.forEach((key) => { item[key] += Number(row[key] || 0); });
  });
  const categoryRows = [...categoryMap.values()].map((row) => ({ ...row, organizations_tracked: row.organizations_tracked.size }));
  const cityMap = new Map();
  rows.forEach((row) => {
    const city = row.city || "Unspecified";
    const item = cityMap.get(city) || { city, ...Object.fromEntries(metricKeys.map((key) => [key, 0])) };
    metricKeys.forEach((key) => { item[key] += Number(row[key] || 0); });
    cityMap.set(city, item);
  });
  const cityRows = [...cityMap.values()];
  const seasonMap = new Map();
  rows.forEach((row) => {
    const id = String(row.season_id || "unspecified");
    const item = seasonMap.get(id) || { season_id: id, season_name: row.season_name || "Season", ...Object.fromEntries(metricKeys.map((key) => [key, 0])) };
    metricKeys.forEach((key) => { item[key] += Number(row[key] || 0); });
    seasonMap.set(id, item);
  });
  const seasonRows = [...seasonMap.values()];
  useEffect(() => {
    if (seasonFilter && data.seasons?.length && !data.seasons.some((season) => String(season.id) === String(seasonFilter))) {
      setSeasonFilter("");
      localStorage.removeItem("placement-season-filter");
    }
  }, [data.seasons, seasonFilter]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("placement-season-filter-change", { detail: seasonFilter }));
  }, [seasonFilter]);
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

function IndustryCatalogPanel({ data, onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const save = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { name: form.get("name"), description: form.get("description") || null };
    setBusy(true);
    try {
      await apiFetch(editing ? `/api/placement/industries/${editing.id}` : "/api/placement/industries", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await onRefresh();
      onSuccess(editing ? "Industry updated." : "Industry added.");
      setEditing(null);
      event.currentTarget.reset();
    } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  return <div className="panel industry-catalog-panel"><div className="panel-head"><div><p className="eyebrow">STEP 4 OF 7 · EMPLOYER CLASSIFICATION</p><h3>Set the industry list</h3><span className="muted">Placement Managers can only choose from this list when adding a company. Keep names consistent for reliable analytics.</span></div></div><form key={editing?.id || "new-industry"} className="industry-catalog-form" onSubmit={save}><Field label="Industry name" name="name" defaultValue={editing?.name || ""} placeholder="e.g. Information Technology" /><Field label="Description" name="description" required={false} defaultValue={editing?.description || ""} placeholder="Optional reporting definition" /><div className="industry-catalog-actions"><button className="btn primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save industry" : "Add industry"}</button>{editing && <button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>}</div></form><div className="industry-catalog-list">{(data.industries || []).map((item) => <div className="record-row" key={item.id}><span><b>{item.name}</b><small>{item.description || "Available to placement managers and analytics"}</small></span><button type="button" className="text-btn" onClick={() => setEditing(item)}><Pencil size={13} />Edit</button></div>)}{!data.industries?.length && <div className="empty-state"><p className="muted">Add the first industry to enable employer classification.</p></div>}</div></div>;
}

function PlacementSetupWizardV2({ data, users, onRefresh, onError, onSuccess }) {
  const [step, setStep] = useState(1);
  const [seasonId, setSeasonId] = useState(data.seasons?.[0]?.id || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!seasonId && data.seasons?.[0]?.id) setSeasonId(data.seasons[0].id); }, [data.seasons, seasonId]);
  const save = async (event, path, payload, nextStep) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await apiFetch(path, { method: "POST", body: JSON.stringify(payload) });
      await onRefresh();
      if (result?.id && path.endsWith("/seasons")) setSeasonId(result.id);
      onSuccess("Saved successfully.");
      if (nextStep) setStep(nextStep);
      event.currentTarget.reset();
    } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  const assignments = (data.assignments || []).filter((item) => String(item.season_id) === String(seasonId));
  const teamMembers = (users || []).filter((item) => ["coordinator", "placement_manager"].includes(item.role));
  const steps = [[1, "Season", "Create the placement cycle"], [2, "People", "Add users to the cycle"], [3, "Categories", "Define your CTC bands"], [4, "Industries", "Classify employers"], [5, "Cities", "Choose allowed locations"], [6, "Targets", "Set team goals"], [7, "Access", "Control visibility"]];
  return <div className="setup-wizard"><div className="section-heading"><div><p className="eyebrow">UNIVERSITY ADMIN SETUP</p><h2>Configure placements step by step</h2><p className="muted">Complete each step in order. Your university controls seasons, categories, industries, cities, targets, and access.</p></div></div><div className="setup-steps">{steps.map(([number, label, hint]) => <button type="button" key={number} className={`setup-step ${step === number ? "active" : ""} ${step > number ? "complete" : ""}`} onClick={() => setStep(number)}><span>{step > number ? "✓" : number}</span><b>{label}</b><small>{hint}</small></button>)}</div><div className="setup-step-content">
    {step === 1 && <form className="panel form-card" onSubmit={(event) => { const form = new FormData(event.currentTarget); return save(event, "/api/placement/seasons", { name: form.get("name"), academic_year: form.get("academic_year"), start_date: form.get("start_date"), end_date: form.get("end_date"), status: form.get("status") }, 2); }}><p className="eyebrow">STEP 1 OF 7</p><h3>Create a placement season</h3><p className="muted">A season is an independent placement cycle. Multiple seasons can be active at the same time.</p><Field label="Season name" name="name" placeholder="Campus placements" /><div className="form-grid"><Field label="Academic year" name="academic_year" placeholder="2026–2027" /><Select label="Status" name="status" defaultValue="active"><option value="active">Active</option><option value="completed">Completed</option></Select></div><div className="form-grid"><Field label="Start date" name="start_date" type="date" /><Field label="End date" name="end_date" type="date" /></div><button className="btn primary" disabled={busy}>Create season and continue</button></form>}
    {step === 2 && <SeasonPeopleStep data={data} users={users} seasonId={seasonId} setSeasonId={setSeasonId} assignments={assignments} teamMembers={teamMembers} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} onNext={() => setStep(3)} />}
    {step === 3 && <div className="setup-grid"><form className="panel form-card" onSubmit={(event) => { const form = new FormData(event.currentTarget); return save(event, "/api/placement/categories", { name: form.get("name"), min_ctc_lpa: form.get("min_ctc_lpa") ? Number(form.get("min_ctc_lpa")) : null, max_ctc_lpa: form.get("max_ctc_lpa") ? Number(form.get("max_ctc_lpa")) : null, description: form.get("description") }); }}><p className="eyebrow">STEP 3 OF 7</p><h3>Define company categories</h3><p className="muted">Create the CTC bands used by your university.</p><Field label="Category name" name="name" placeholder="e.g. Dream, Super Dream, Core" /><div className="form-grid"><Field label="Minimum CTC (LPA)" name="min_ctc_lpa" type="number" step="0.01" /><Field label="Maximum CTC (LPA)" name="max_ctc_lpa" type="number" step="0.01" /></div><Field label="Description" name="description" placeholder="Optional explanation for your team" required={false} /><button className="btn primary" disabled={busy}>Add university category</button><button type="button" className="btn secondary setup-next" onClick={() => setStep(4)}>Continue to industries</button></form><div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">YOUR CATEGORIES</p><h3>Available to the placement team</h3></div></div><table><thead><tr><th>Category</th><th>CTC range</th></tr></thead><tbody>{(data.categories || []).map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.description || "University-defined category"}</small></td><td>{item.min_ctc_lpa ?? 0}–{item.max_ctc_lpa ?? "No upper limit"} LPA</td></tr>)}</tbody></table>{!data.categories?.length && <div className="empty-state"><p className="muted">Add your first category.</p></div>}</div></div>}
    {step === 4 && <div><IndustryCatalogPanel data={data} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} /><button type="button" className="btn secondary setup-next" onClick={() => setStep(5)}>Continue to cities</button></div>}
    {step === 5 && <CitySelectionStep data={data} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} onNext={() => setStep(6)} />}
    {step === 6 && <div className="setup-grid"><form className="panel form-card" onSubmit={(event) => { const form = new FormData(event.currentTarget); return save(event, "/api/placement/targets", { season_id: form.get("season_id"), user_id: form.get("user_id"), category_id: form.get("category_id") || null, companies_target: Number(form.get("companies_target") || 0) }); }}><p className="eyebrow">STEP 6 OF 7</p><h3>Declare company targets</h3><p className="muted">Set the company acquisition goal for each placement manager and category. Drives, offers, placements, and joining are tracked as actual outcomes.</p><Select label="Season" name="season_id" defaultValue={seasonId}><option value="">Choose season</option>{(data.seasons || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select label="Placement manager" name="user_id"><option value="">Choose placement manager</option>{teamMembers.filter((item) => item.role === "placement_manager").map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</Select><Select label="Company category" name="category_id"><option value="">Choose category</option>{(data.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Field label="Company target" name="companies_target" type="number" min="0" defaultValue="0" /><small className="form-help">How many companies should this manager bring into this category for the selected season?</small><button className="btn primary" disabled={busy}>Save company target</button><button type="button" className="btn secondary setup-next" onClick={() => setStep(7)}>Continue to access</button></form><div className="panel table-panel target-setup-table"><div className="panel-head"><div><p className="eyebrow">TARGETS SAVED</p><h3>Manager targets by category</h3></div></div><table><thead><tr><th>Season</th><th>Manager</th><th>Category</th><th>Company target</th></tr></thead><tbody>{(data.targets || []).map((item) => <tr key={item.id}><td>{data.seasons?.find((season) => String(season.id) === String(item.season_id))?.name || "Season"}</td><td>{users.find((person) => String(person.id) === String(item.user_id))?.full_name || "Team member"}</td><td>{data.categories?.find((category) => String(category.id) === String(item.category_id))?.name || "Category"}</td><td><b>{item.companies_target || 0}</b></td></tr>)}</tbody></table>{!data.targets?.length && <div className="empty-state"><p className="muted">No company targets saved yet.</p></div>}</div></div>}
    {step === 7 && <div className="setup-access-step"><div className="panel setup-access-intro"><p className="eyebrow">STEP 7 OF 7</p><h3>Set team access</h3><p className="muted">Choose exactly what each coordinator can see.</p><span className="access-flow-hint">Select coordinator → choose access level → select areas → save policy</span></div><AccessGrantPanel users={users} grants={data.access} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} /><div className="panel setup-complete"><span className="setup-complete-icon">✓</span><div><h3>Placement setup is ready</h3><p className="muted">You can return to any step at any time.</p></div><button type="button" className="btn secondary" onClick={() => setStep(1)}>Review from the beginning</button></div></div>}
  </div></div>;
}

function PlacementSetup({ data, users, onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const submit = async (path, payload) => {
    setBusy(true);
    try { await apiFetch(path, { method: "POST", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Placement setup saved."); } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return <div className="dashboard"><div className="section-heading"><div><p className="eyebrow">UNIVERSITY CONFIGURATION</p><h2>Placement setup</h2><p className="muted">Manage independent seasons, salary categories, targets, access, and allowed cities.</p></div></div><div className="two-column"><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/seasons", { name: f.get("name"), academic_year: f.get("academic_year"), start_date: f.get("start_date"), end_date: f.get("end_date"), status: f.get("status") }); }}><h3>New placement season</h3><Field label="Season name" name="name" placeholder="Campus placements" /><Field label="Academic year" name="academic_year" placeholder="2026-2027" /><div className="form-grid"><Field label="Start date" name="start_date" type="date" /><Field label="End date" name="end_date" type="date" /></div><Select label="Status" name="status" defaultValue="active"><option value="active">Active</option><option value="completed">Completed</option></Select><button className="btn primary" disabled={busy}>Create season</button></form><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/categories", { name: f.get("name"), min_ctc_lpa: f.get("min_ctc_lpa") ? Number(f.get("min_ctc_lpa")) : null, max_ctc_lpa: f.get("max_ctc_lpa") ? Number(f.get("max_ctc_lpa")) : null, description: f.get("description") }); }}><h3>New company category</h3><Field label="Category name" name="name" placeholder="Dream" /><div className="form-grid"><Field label="Minimum CTC (LPA)" name="min_ctc_lpa" type="number" step="0.01" /><Field label="Maximum CTC (LPA)" name="max_ctc_lpa" type="number" step="0.01" /></div><Field label="Description" name="description" placeholder="Companies in this category" /><button className="btn primary" disabled={busy}>Create category</button></form><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/cities", { city: f.get("city") }); }}><h3>Add allowed city</h3><Field label="City" name="city" placeholder="Bengaluru" /><button className="btn primary" disabled={busy}>Add city</button></form><form className="panel form-card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit("/api/placement/targets", { season_id: f.get("season_id"), user_id: f.get("user_id"), category_id: f.get("category_id") || null, companies_target: Number(f.get("companies_target") || 0), drives_target: Number(f.get("drives_target") || 0), offers_target: Number(f.get("offers_target") || 0), students_placed_target: Number(f.get("students_placed_target") || 0) }); }}><h3>Set placement target</h3><Select label="Season" name="season_id"><option value="">Choose season</option>{(data.seasons || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Select label="Team member" name="user_id"><option value="">Choose member</option>{(users || []).filter((u) => ["coordinator", "placement_manager"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</Select><Select label="Category" name="category_id"><option value="">All categories</option>{(data.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><div className="form-grid">{[["companies_target", "Companies"], ["drives_target", "Drives"], ["offers_target", "Offers"], ["students_placed_target", "Placed students"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue="0" />)}</div><button className="btn primary" disabled={busy}>Save target</button></form></div><div className="panel table-panel"><h3>Configured seasons</h3><table><thead><tr><th>Name</th><th>Academic year</th><th>Dates</th><th>Status</th></tr></thead><tbody>{(data.seasons || []).map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.academic_year}</td><td>{s.start_date} – {s.end_date}</td><td><span className={`badge ${s.status}`}>{s.status}</span></td></tr>)}</tbody></table></div></div>;
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
  const save = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); try { await apiFetch("/api/placement/targets", { method: "POST", body: JSON.stringify({ season_id: form.get("season_id"), user_id: form.get("user_id"), category_id: form.get("category_id") || null, companies_target: Number(form.get("companies_target") || 0) }) }); await onRefresh(); onSuccess("Company target saved."); event.currentTarget.reset(); } catch (error) { onError(error.message); } finally { setBusy(false); } };
  return <div className="dashboard"><div className="section-heading"><div><p className="eyebrow">UNIVERSITY ADMIN TARGETS</p><h2>Set company targets</h2><p className="muted">Declare the company acquisition target for each placement manager and category. Drives, offers, placements, and joining are tracked as actual outcomes.</p></div></div><form className="panel form-card" onSubmit={save}><div className="form-grid"><Select label="Season" name="season_id"><option value="">Choose season</option>{(data.seasons || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academic_year}</option>)}</Select><Select label="Team member" name="user_id"><option value="">Choose team member</option>{(users || []).filter((item) => ["coordinator", "placement_manager"].includes(item.role)).map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</Select></div><Select label="Company category" name="category_id"><option value="">All categories</option>{(data.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Field label="Company target" name="companies_target" type="number" min="0" defaultValue="0" /><button className="btn primary" disabled={busy}>Save company target</button></form></div>;
}

function ContactApprovals({ requests, onRefresh, onError, onSuccess }) {
  const review = async (id, status) => { try { await apiFetch(`/api/placement/contact-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await onRefresh(); onSuccess(`Contact request ${status}.`); } catch (e) { onError(e.message); } };
  return <div className="panel table-panel duplicate-approvals-panel contact-approvals-panel"><div className="panel-head"><div><p className="eyebrow">CONTACT COLLABORATION</p><h2>Contact approvals</h2><p className="muted">A contact already linked to this company requires University Admin approval. One pending request is kept per existing contact and requested company.</p></div></div><table className="duplicate-approvals-table contact-approvals-table"><thead><tr><th>Requested contact</th><th>Existing contact</th><th>Existing owner</th><th>Requested company</th><th>Requested by</th><th>Status</th><th>Actions</th></tr></thead><tbody>{(requests || []).map((request) => <tr key={request.id}><td><b>{request.requested_name}</b><small>{request.requested_payload?.email || "Contact details submitted"}</small></td><td><b>{request.existing_contact_name || "Existing contact"}</b><small>{request.existing_contact_email || "Contact details protected"}</small></td><td>{request.existing_organization_owner_name || "Placement manager"}</td><td>{request.requested_organization_name || request.existing_organization_name || "Company"}</td><td>{request.requested_by_name || request.requested_by}</td><td><span className={`badge ${request.status}`}>{request.status}</span></td><td>{request.status === "pending" && <div className="approval-actions"><button className="text-btn" onClick={() => review(request.id, "approved")}>Approve</button><button className="delete-btn" onClick={() => review(request.id, "rejected")}>Reject</button></div>}</td></tr>)}</tbody></table>{!requests?.length && <div className="empty-state"><h3>No contact approval requests</h3><p className="muted">Duplicate contact requests will appear here.</p></div>}</div>;
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
  return <div className="access-policy-layout"><form className="panel form-card access-policy-form" onSubmit={save}><div className="panel-head"><div><p className="eyebrow">ACCESS POLICY</p><h3>Choose what this coordinator can see</h3><span className="muted">Access changes are controlled by the University Admin.</span></div></div><Select label="Coordinator" name="user_id" value={selectedUser} onChange={selectUser}><option value="">Choose coordinator</option>{coordinators.map((u) => <option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}</Select><div className="access-level-options"><label className={`access-level-option ${accessLevel === "full" ? "selected" : ""}`}><input type="radio" name="access_level" value="full" checked={accessLevel === "full"} onChange={() => setAccessLevel("full")} /><span><b>Full CRM access</b><small>Reveal all permitted company, contact, and meeting-report details. Analytics remains restricted to University Admin and Data Analyst.</small></span></label><label className={`access-level-option ${accessLevel === "partial" ? "selected" : ""}`}><input type="radio" name="access_level" value="partial" checked={accessLevel === "partial"} onChange={() => setAccessLevel("partial")} /><span><b>Partial CRM access</b><small>Reveal only the areas selected below. Everything else remains masked.</small></span></label></div>{accessLevel === "partial" && <div className="access-area-grid"><p className="form-help">Select one or more areas</p>{areas.map(([key, label, description]) => <label className="access-area-option" key={key}><input type="checkbox" checked={Boolean(permissions[key])} onChange={(event) => setPermissions((current) => ({ ...current, [key]: event.target.checked }))} /><span><b>{label}</b><small>{description}</small></span></label>)}</div>}<div className="access-policy-note">{selectedUser ? <span>{accessLevel === "full" ? "This coordinator will see all CRM details, but not analytics." : `${Object.values(permissions).filter(Boolean).length} of ${areas.length} areas selected. Analytics remains restricted.`}</span> : <span>Select a coordinator to create or edit their policy.</span>}</div><button className="btn primary" disabled={busy || !selectedUser}>{busy ? "Saving policy…" : "Save access policy"}</button></form><div className="panel table-panel access-history-panel"><div className="panel-head"><div><p className="eyebrow">CURRENT POLICIES</p><h3>Coordinator access</h3><span className="muted">Select a row to edit its policy.</span></div></div><table><thead><tr><th>Coordinator</th><th>Access</th><th>Areas</th><th>Granted</th><th>Action</th></tr></thead><tbody>{grants.map((item) => <tr key={item.id}><td><b>{coordinators.find((u) => String(u.id) === String(item.granted_to))?.full_name || "Coordinator"}</b></td><td><span className={`badge ${item.access_level === "partial" ? "prospect" : "active"}`}>{item.access_level || "full"}</span></td><td>{grantLabel(item)}</td><td>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td><td><button type="button" className="text-btn" onClick={() => setSelectedUser(item.granted_to)}>Edit</button></td></tr>)}</tbody></table>{!grants.length && <div className="empty-state"><p className="muted">No coordinator access policies configured.</p></div>}</div></div>;
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
        : type === "city" ? { city: f.get("city") } : { season_id: f.get("season_id"), user_id: f.get("user_id"), category_id: f.get("category_id") || null, companies_target: Number(f.get("companies_target") || 0), drives_target: Number(f.get("drives_target") || 0), offers_target: Number(f.get("offers_target") || 0), students_placed_target: Number(f.get("students_placed_target") || 0) };
    const path = type === "season" ? `/api/placement/seasons/${editing.item.id}` : type === "category" ? `/api/placement/categories/${editing.item.id}` : type === "city" ? `/api/placement/cities/${editing.item.id}` : "/api/placement/targets";
    setBusy(true);
    try { await apiFetch(path, { method: type === "target" ? "POST" : "PATCH", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Placement configuration updated."); setEditing(null); } catch (error) { onError(error.message); } finally { setBusy(false); }
  };
  if (editing) {
    const item = editing.item;
    return <form className="panel form-card" onSubmit={save}><div className="panel-head"><h3>Edit {editing.type}</h3><button type="button" className="text-btn" onClick={() => setEditing(null)}>Cancel</button></div>{editing.type === "season" && <><Field label="Season name" name="name" defaultValue={item.name} /><Field label="Academic year" name="academic_year" defaultValue={item.academic_year} /><div className="form-grid"><Field label="Start date" name="start_date" type="date" defaultValue={item.start_date} /><Field label="End date" name="end_date" type="date" defaultValue={item.end_date} /></div><Select label="Status" name="status" defaultValue={item.status}><option value="active">Active</option><option value="completed">Completed</option></Select></>}{editing.type === "category" && <><Field label="Category name" name="name" defaultValue={item.name} /><div className="form-grid"><Field label="Minimum CTC (LPA)" name="min_ctc_lpa" type="number" step="0.01" defaultValue={item.min_ctc_lpa ?? ""} /><Field label="Maximum CTC (LPA)" name="max_ctc_lpa" type="number" step="0.01" defaultValue={item.max_ctc_lpa ?? ""} /></div><Field label="Description" name="description" required={false} defaultValue={item.description || ""} /></>}{editing.type === "city" && <Field label="City" name="city" defaultValue={item.city} />}{editing.type === "target" && <><Select label="Season" name="season_id" defaultValue={item.season_id}>{(data.seasons || []).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</Select><Select label="Team member" name="user_id" defaultValue={item.user_id}>{(users || []).filter((u) => ["coordinator", "placement_manager"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</Select><Select label="Category" name="category_id" defaultValue={item.category_id || ""}><option value="">All categories</option>{(data.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><div className="form-grid">{[["companies_target", "Companies"], ["drives_target", "Drives"], ["offers_target", "Offers"], ["students_placed_target", "Placed students"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue={item[name] || 0} />)}</div></>}<button className="btn primary" disabled={busy}>Save changes</button></form>;
  }
  return <div className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">CONFIGURATION RECORDS</p><h3>Edit placement setup</h3></div></div><div className="edit-record-grid"><div><b>Seasons</b>{(data.seasons || []).map((item) => <div className="record-row" key={item.id}><span>{item.name}</span><button className="text-btn" onClick={() => setEditing({ type: "season", item })}><Pencil size={13} />Edit</button></div>)}</div><div><b>Categories</b>{(data.categories || []).map((item) => <div className="record-row" key={item.id}><span>{item.name}</span><button className="text-btn" onClick={() => setEditing({ type: "category", item })}><Pencil size={13} />Edit</button></div>)}</div><div><b>Allowed cities</b>{(data.cities || []).map((item) => <div className="record-row" key={item.id}><span>{item.city}</span><button className="text-btn" onClick={() => setEditing({ type: "city", item })}><Pencil size={13} />Edit</button></div>)}</div><div><b>Targets</b>{(data.targets || []).map((item) => <div className="record-row" key={item.id}><span>{item.companies_target} companies · {item.students_placed_target} placed</span><button className="text-btn" onClick={() => setEditing({ type: "target", item })}><Pencil size={13} />Edit</button></div>)}</div></div></div>;
}

function PlacementMetricFields({ initial = {} }) {
  return <><div className="form-grid"><Select label="Pipeline status" name="pipeline_status" defaultValue={initial.pipeline_status || "prospect"}>{placementPipelineStatuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select><Select label="Outlook" name="outlook" defaultValue={initial.outlook || "neutral"}>{placementOutlooks.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div><div className="form-grid"><Select label="Drive status" name="drive_status" defaultValue={initial.drive_status || "not_scheduled"}>{placementDriveStatuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select><Field label="Company probability (%)" name="company_probability" type="number" min="0" max="100" defaultValue={initial.company_probability ?? 0} /></div><div className="form-grid"><Field label="Expected company date" name="expected_date" type="date" required={false} defaultValue={initial.expected_date || ""} /><Field label="Drive date" name="drive_date" type="date" required={false} defaultValue={initial.drive_date || ""} /></div><div className="form-grid"><Field label="Last contact date" name="last_contact_date" type="date" required={false} defaultValue={initial.last_contact_date || ""} /><Field label="Next follow-up date" name="next_follow_up_date" type="date" required={false} defaultValue={initial.next_follow_up_date || ""} /></div><div className="form-grid metric-number-grid">{[["companies_acquired", "Companies acquired"], ["drives_conducted", "Drives conducted"], ["offers_received", "Offers received"], ["students_registered", "Students registered"], ["students_selected", "Students selected"], ["students_placed", "Students placed"], ["students_rejected", "Students rejected"]].map(([name, label]) => <Field key={name} label={label} name={name} type="number" min="0" defaultValue={initial[name] ?? 0} />)}</div><Field label="Next action" name="next_action" required={false} defaultValue={initial.next_action || ""} placeholder="e.g. Confirm hiring panel and drive slots" /><Field label="Notes" name="notes" required={false} defaultValue={initial.notes || ""} placeholder="Add context for the placement team" /></>;
}

function metricPayload(form) {
  const number = (name) => Number(form.get(name) || 0);
  const optional = (name) => form.get(name) || null;
  return { season_id: form.get("season_id"), organization_id: form.get("organization_id"), category_id: optional("category_id"), pipeline_status: form.get("pipeline_status") || "prospect", outlook: form.get("outlook") || "neutral", expected_date: optional("expected_date"), drive_date: optional("drive_date"), last_contact_date: optional("last_contact_date"), next_follow_up_date: optional("next_follow_up_date"), drive_status: form.get("drive_status") || "not_scheduled", company_probability: number("company_probability"), companies_acquired: number("companies_acquired"), drives_conducted: number("drives_conducted"), offers_received: number("offers_received"), students_registered: number("students_registered"), students_selected: number("students_selected"), students_placed: number("students_placed"), students_rejected: number("students_rejected"), next_action: optional("next_action"), notes: optional("notes") };
}

function PlacementMetrics({ data, organizations, canEdit = true, onRefresh, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const saveMetric = async (e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy(true); try { await apiFetch("/api/placement/metrics", { method: "POST", body: JSON.stringify(metricPayload(f)) }); await onRefresh(); onSuccess("Placement tracking saved."); form.reset(); } catch (e2) { onError(e2.message); } finally { setBusy(false); } };
  return <div className="dashboard"><div className="section-heading"><div><p className="eyebrow">{canEdit ? "PLACEMENT UPDATES" : "PLACEMENT TRACKER"}</p><h2>{canEdit ? "Update company placement progress" : "Track company placement progress"}</h2><p className="muted">{canEdit ? "Keep each company’s stage, drive readiness, student outcomes, expected dates, and next action up to date. University Admin and Data Analyst reporting updates automatically from these records." : "Review the latest company stages, drive readiness, student outcomes, dates, and follow-up status. Coordinators maintain these records after Placement Managers add company details."}</p></div></div>{canEdit && <form className="panel form-card" onSubmit={saveMetric}><div className="form-grid"><Select label="Placement season" name="season_id"><option value="">Choose season</option>{(data.seasons || []).map((s) => <option value={s.id} key={s.id}>{s.name} · {s.academic_year}</option>)}</Select><Select label="Organization" name="organization_id"><option value="">Choose organization</option>{organizations.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</Select></div><Select label="Company category" name="category_id" required={false}><option value="">Use organization category / Uncategorized</option>{(data.categories || []).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</Select><PlacementMetricFields /><button className="btn primary" disabled={busy}>Save placement update</button></form>}<PlacementMetricEditorV2 metrics={data.metrics} seasons={data.seasons} organizations={organizations} categories={data.categories} canEdit={canEdit} onRefresh={onRefresh} onError={onError} onSuccess={onSuccess} /></div>;
}

function PlacementMetricEditorV2({ metrics, seasons, organizations, categories, canEdit = true, onRefresh, onError, onSuccess }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (event) => { event.preventDefault(); const payload = metricPayload(new FormData(event.currentTarget)); setBusy(true); try { await apiFetch("/api/placement/metrics", { method: "POST", body: JSON.stringify(payload) }); await onRefresh(); onSuccess("Placement tracking updated."); setEditing(null); } catch (error) { onError(error.message); } finally { setBusy(false); } };
  if (!metrics?.length) return null;
  return <div className="panel table-panel"><div className="panel-head"><div><h3>{canEdit ? "Saved placement updates" : "Current placement tracker"}</h3><span className="muted">{canEdit ? "Select any row to correct or extend the latest company update." : "Read-only view. Placement Managers own company status and outcome updates."}</span></div></div>{canEdit && editing ? <form className="form-card" onSubmit={save}><div className="form-grid"><Select label="Season" name="season_id" defaultValue={editing.season_id}>{(seasons || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Select label="Organization" name="organization_id" defaultValue={editing.organization_id}>{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></div><Select label="Category" name="category_id" required={false} defaultValue={editing.category_id || ""}><option value="">Use organization category / Uncategorized</option>{(categories || []).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</Select><PlacementMetricFields initial={editing} /><button className="btn primary" disabled={busy}>Save changes</button><button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button></form> : <div className="analytics-grid-scroll"><table><thead><tr><th>Organization</th><th>Season</th><th>Pipeline</th><th>Outlook</th><th>Expected date</th><th>Drive</th><th>Placed</th>{canEdit && <th>Actions</th>}</tr></thead><tbody>{metrics.map((item) => <tr key={item.id}><td>{organizations.find((o) => String(o.id) === String(item.organization_id))?.name || "Organization"}</td><td>{seasons.find((s) => String(s.id) === String(item.season_id))?.name || "Season"}</td><td>{placementPipelineStatuses.find(([key]) => key === item.pipeline_status)?.[1] || "Prospect"}</td><td>{placementOutlooks.find(([key]) => key === item.outlook)?.[1] || "Neutral"}</td><td>{item.expected_date || "—"}</td><td>{placementDriveStatuses.find(([key]) => key === item.drive_status)?.[1] || "Not scheduled"}</td><td>{item.students_placed || 0}</td>{canEdit && <td><button className="text-btn" onClick={() => setEditing(item)}><Pencil size={13} />Edit</button></td>}</tr>)}</tbody></table></div>}</div>;
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
