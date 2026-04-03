const {
  useState,
  useRef
} = React;

/* ─── DESIGN TOKENS ─── */
const C = {
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceHover: "#F3F0EB",
  border: "#E8E2D9",
  text: "#2C2418",
  textMuted: "#9C8E7C",
  accent: "#4A3F35",
  accentSoft: "rgba(74,63,53,0.08)",
  green: "#2D9D78",
  greenSoft: "rgba(45,157,120,0.10)",
  orange: "#D4793A",
  orangeSoft: "rgba(212,121,58,0.10)",
  pink: "#C75489",
  pinkSoft: "rgba(199,84,137,0.10)",
  purple: "#7C5CBF",
  purpleSoft: "rgba(124,92,191,0.10)",
  blue: "#3B82C4",
  blueSoft: "rgba(59,130,196,0.10)",
  dayOff: "#F0EDE8",
  dayOffBorder: "#DDD7CC",
  red: "#D94040",
  redSoft: "rgba(217,64,64,0.10)"
};
const F = {
  display: "'DM Sans',sans-serif",
  body: "'DM Sans',sans-serif",
  mono: "'JetBrains Mono',monospace"
};
const gc = c => C[c] || C.accent;
const gs = c => C[c + "Soft"] || C.accentSoft;

/* ─── DATA ─── */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const TIME_SLOTS = [];
for (let h = 6; h <= 20; h++) for (let m = 0; m < 60; m += 15) TIME_SLOTS.push(h + m / 60);
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fh = h => {
  const hr = Math.floor(h);
  const mn = Math.round((h - hr) * 60);
  const suffix = hr >= 12 ? "p" : "a";
  const display = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return mn === 0 ? `${display}${suffix}` : `${display}:${mn.toString().padStart(2, "0")}${suffix}`;
};

/* Date helpers */
const getMonday = d => {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
const getWeekNum = d => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7);
  const w1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
};
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y, m) => {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
};
const TODAY = new Date(2026, 3, 2);
const THIS_MONDAY = getMonday(TODAY);
const eventToDate = (ev, weekMonday) => addDays(weekMonday, ev.day);
const DEFAULT_TAGS = [{
  id: "client",
  label: "Client",
  color: "blue"
}, {
  id: "meeting",
  label: "Meeting",
  color: "accent"
}, {
  id: "personal",
  label: "Personal",
  color: "pink"
}, {
  id: "admin",
  label: "Admin",
  color: "accent"
}, {
  id: "integration",
  label: "Integration",
  color: "green"
}, {
  id: "deploy",
  label: "Deploy",
  color: "orange"
}, {
  id: "focus",
  label: "Focus",
  color: "purple"
}];
const TAG_COLORS = [{
  id: "blue",
  label: "Blue"
}, {
  id: "accent",
  label: "Charcoal"
}, {
  id: "pink",
  label: "Pink"
}, {
  id: "green",
  label: "Green"
}, {
  id: "orange",
  label: "Orange"
}, {
  id: "purple",
  label: "Purple"
}, {
  id: "red",
  label: "Red"
}];
const SPAN_TYPES = [{
  id: "holiday",
  label: "Holiday",
  icon: "🎉",
  defaultColor: "green"
}, {
  id: "trip",
  label: "Trip",
  icon: "✈️",
  defaultColor: "pink"
}, {
  id: "conference",
  label: "Conference",
  icon: "🎤",
  defaultColor: "purple"
}, {
  id: "blockout",
  label: "Block Out",
  icon: "🚫",
  defaultColor: "orange"
}];
const SOURCES = {
  google: {
    label: "Google",
    bg: "#4285F418",
    color: "#4285F4"
  },
  apple: {
    label: "Apple",
    bg: "#6B6B6F18",
    color: "#6B6B6F"
  },
  shopify: {
    label: "Shopify",
    bg: "#5E7A1E18",
    color: "#5E7A1E"
  },
  netlify: {
    label: "Netlify",
    bg: "#00947E18",
    color: "#00947E"
  },
  manual: {
    label: "Manual",
    bg: C.accentSoft,
    color: C.accent
  }
};
const ICON_OPTIONS = ["💪", "📋", "🎯", "☕", "🥗", "📞", "🧘", "💻", "✏️", "📦", "🔧", "🎨"];
const defaultTemplates = [{
  id: "gym",
  icon: "💪",
  name: "Gym Session",
  duration: 90,
  tag: "personal",
  color: "pink",
  conflicts: "auto-decline"
}, {
  id: "admin",
  icon: "📋",
  name: "Admin Hour",
  duration: 60,
  tag: "admin",
  color: "accent",
  conflicts: "can be bumped"
}, {
  id: "focus",
  icon: "🎯",
  name: "Deep Focus",
  duration: 120,
  tag: "focus",
  color: "purple",
  conflicts: "auto-decline"
}, {
  id: "standup",
  icon: "☕",
  name: "Standup",
  duration: 30,
  tag: "meeting",
  color: "blue",
  conflicts: "show warning"
}, {
  id: "lunch",
  icon: "🥗",
  name: "Lunch Break",
  duration: 45,
  tag: "personal",
  color: "green",
  conflicts: "show warning"
}];
const initEvents = [{
  id: 1,
  title: "Client Call – Jane",
  hour: 9,
  duration: 60,
  day: 0,
  tag: "client",
  color: "blue",
  source: "google"
}, {
  id: 2,
  title: "Shopify Sync",
  hour: 10.5,
  duration: 45,
  day: 0,
  tag: "integration",
  color: "green",
  source: "shopify"
}, {
  id: 3,
  title: "Design Review",
  hour: 14,
  duration: 60,
  day: 1,
  tag: "meeting",
  color: "purple",
  source: "google"
}, {
  id: 4,
  title: "Deploy v2.4",
  hour: 11,
  duration: 30,
  day: 1,
  tag: "deploy",
  color: "orange",
  source: "netlify"
}, {
  id: 5,
  title: "Client Call – Mark",
  hour: 15.5,
  duration: 45,
  day: 2,
  tag: "client",
  color: "blue",
  source: "google"
}, {
  id: 6,
  title: "Sprint Planning",
  hour: 9,
  duration: 90,
  day: 2,
  tag: "meeting",
  color: "accent",
  source: "google"
}, {
  id: 7,
  title: "DB Migration",
  hour: 13,
  duration: 60,
  day: 3,
  tag: "deploy",
  color: "orange",
  source: "netlify"
}, {
  id: 8,
  title: "Google Cal Sync",
  hour: 10,
  duration: 30,
  day: 3,
  tag: "integration",
  color: "green",
  source: "google"
}, {
  id: 9,
  title: "1:1 with Sarah",
  hour: 11.5,
  duration: 30,
  day: 4,
  tag: "meeting",
  color: "pink",
  source: "google"
}, {
  id: 10,
  title: "Webhook Test",
  hour: 16,
  duration: 45,
  day: 4,
  tag: "integration",
  color: "green",
  source: "shopify"
}, {
  id: 11,
  title: "Retro",
  hour: 14,
  duration: 60,
  day: 4,
  tag: "meeting",
  color: "purple",
  source: "google"
}, {
  id: 12,
  title: "Yoga Class",
  hour: 7,
  duration: 60,
  day: 5,
  tag: "personal",
  color: "pink",
  source: "apple"
}];

/* ─── SMALL COMPONENTS ─── */
const Badge = ({
  source
}) => {
  const s = SOURCES[source] || SOURCES.manual;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontFamily: F.mono,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      padding: "1px 6px",
      borderRadius: 3,
      letterSpacing: .5,
      textTransform: "uppercase"
    }
  }, s.label);
};
const TagPill = ({
  tag,
  small,
  tags
}) => {
  const list = tags || DEFAULT_TAGS;
  const t = list.find(x => x.id === tag) || {
    id: tag,
    label: tag,
    color: "accent"
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: small ? 9 : 10,
      fontFamily: F.mono,
      fontWeight: 600,
      background: gs(t.color),
      color: gc(t.color),
      padding: small ? "1px 5px" : "2px 7px",
      borderRadius: 3,
      textTransform: "uppercase",
      letterSpacing: .4
    }
  }, t.label);
};

/* ─── QUICK ADD BAR ─── */
const QuickAdd = ({
  onAdd,
  daysOff,
  tags
}) => {
  const tagList = tags || DEFAULT_TAGS;
  const [val, setVal] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef();
  const suggestions = [{
    text: "gym tomorrow 6am",
    icon: "💪"
  }, {
    text: "day off Friday",
    icon: "🏖"
  }, {
    text: "client call Wed 2pm",
    icon: "📞"
  }, {
    text: "admin block Thu 9am",
    icon: "📋"
  }];
  const handleSubmit = () => {
    if (!val.trim()) return;
    const lower = val.toLowerCase();
    if (lower.includes("day off")) {
      const di = DAYS.findIndex(d => lower.includes(d.toLowerCase()));
      if (di >= 0) {
        onAdd({
          type: "dayoff",
          day: di
        });
        setVal("");
        return;
      }
    }
    const di = DAYS.findIndex(d => lower.includes(d.toLowerCase()));
    const tm = lower.match(/(\d{1,2})\s*(am|pm)/);
    let hour = tm ? parseInt(tm[1]) : 9;
    if (tm && tm[2] === "pm" && hour < 12) hour += 12;
    if (tm && tm[2] === "am" && hour === 12) hour = 0;
    const tag = lower.includes("client") ? "client" : lower.includes("gym") ? "personal" : lower.includes("admin") ? "admin" : lower.includes("focus") ? "focus" : "meeting";
    const color = tagList.find(t => t.id === tag)?.color || "accent";
    const isDayOff = di >= 0 && daysOff.includes(di);
    if (isDayOff && (tag === "client" || tag === "meeting")) {
      alert(`⚠️ ${DAYS[di]} is a day off — client/work events blocked.`);
      return;
    }
    onAdd({
      type: "event",
      event: {
        id: Date.now(),
        title: val.trim(),
        hour,
        duration: 60,
        day: di >= 0 ? di : 0,
        tag,
        color,
        source: "manual"
      }
    });
    setVal("");
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: C.surface,
      border: `1.5px solid ${focused ? C.accent : C.border}`,
      borderRadius: 12,
      padding: "10px 16px",
      boxShadow: focused ? "0 4px 20px rgba(44,36,24,0.08)" : "none",
      transition: "all 0.2s ease"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      opacity: .6
    }
  }, "\u26A1"), /*#__PURE__*/React.createElement("input", {
    ref: ref,
    value: val,
    onChange: e => setVal(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setTimeout(() => setFocused(false), 200),
    onKeyDown: e => e.key === "Enter" && handleSubmit(),
    placeholder: "Quick add \u2014 try \"gym Wed 6am\" or \"day off Friday\"",
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontSize: 14,
      fontFamily: F.body,
      color: C.text
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    style: {
      background: C.accent,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "6px 14px",
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F.body,
      cursor: "pointer",
      opacity: val.trim() ? 1 : .4
    }
  }, "Add")), focused && !val && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: 4,
      zIndex: 10,
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: 6,
      boxShadow: "0 8px 24px rgba(44,36,24,0.1)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      color: C.textMuted,
      padding: "4px 10px",
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, "Try saying"), suggestions.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => {
      setVal(s.text);
      ref.current?.focus();
    },
    style: {
      padding: "8px 10px",
      borderRadius: 6,
      cursor: "pointer",
      display: "flex",
      gap: 8,
      alignItems: "center",
      fontSize: 13,
      color: C.text,
      fontFamily: F.body
    },
    onMouseEnter: e => e.currentTarget.style.background = C.surfaceHover,
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement("span", null, s.icon), s.text))));
};

/* ─── TAG PULSE ─── */
const TagPulse = ({
  events,
  tags
}) => {
  const tagList = tags || DEFAULT_TAGS;
  const counts = {};
  let total = 0;
  events.forEach(e => {
    counts[e.tag] = (counts[e.tag] || 0) + (e.duration || 60);
    total += e.duration || 60;
  });
  const segments = tagList.filter(t => counts[t.id]).map(t => ({
    ...t,
    mins: counts[t.id],
    pct: Math.round(counts[t.id] / total * 100)
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontFamily: F.mono,
      fontWeight: 600,
      color: C.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, "Time Breakdown"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontFamily: F.mono,
      color: C.textMuted
    }
  }, Math.round(total / 60), "h total")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: 8,
      borderRadius: 6,
      overflow: "hidden",
      gap: 2
    }
  }, segments.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      flex: s.pct,
      background: gc(s.color),
      borderRadius: 4,
      minWidth: 4,
      transition: "flex 0.3s ease"
    },
    title: `${s.label}: ${s.pct}%`
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 8,
      flexWrap: "wrap"
    }
  }, segments.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontSize: 11,
      color: C.textMuted,
      fontFamily: F.body
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: gc(s.color)
    }
  }), s.label, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: F.mono,
      fontWeight: 600
    }
  }, s.pct, "%")))));
};

/* ─── MONTH VIEW ─── */
const MonthView = ({
  events,
  daysOff,
  onToggleDayOff,
  spanEvents,
  tags
}) => {
  const [monthOffset, setMonthOffset] = useState(0);
  const viewMonth = TODAY.getMonth() + monthOffset;
  const viewYear = TODAY.getFullYear() + Math.floor(viewMonth / 12);
  const normMonth = (viewMonth % 12 + 12) % 12;
  const daysInM = getDaysInMonth(viewYear, normMonth);
  const startDay = getFirstDayOfMonth(viewYear, normMonth);
  const isCurrentMonth = monthOffset === 0;
  const eventsByDate = {};
  events.forEach(ev => {
    const dt = eventToDate(ev, THIS_MONDAY);
    if (dt.getMonth() === normMonth && dt.getFullYear() === viewYear) {
      const d = dt.getDate();
      if (!eventsByDate[d]) eventsByDate[d] = [];
      eventsByDate[d].push(ev);
    }
  });
  const mSpans = spanEvents.filter(s => s.month === normMonth);
  const getSpanForDay = day => mSpans.find(s => day >= s.startDay && day <= s.endDay);
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const navBtn = {
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 14,
    color: C.accent,
    fontWeight: 700,
    fontFamily: F.body,
    lineHeight: 1
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthOffset(m => m - 1),
    style: navBtn
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 20,
      fontWeight: 700,
      color: C.text,
      fontFamily: F.display
    }
  }, MONTHS_FULL[normMonth], " ", viewYear), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 13,
      color: C.textMuted
    }
  }, "Tap a day to toggle day off \xB7 greyed = no clients")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, !isCurrentMonth && /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthOffset(0),
    style: {
      ...navBtn,
      fontSize: 11,
      fontWeight: 600,
      padding: "4px 10px"
    }
  }, "Today"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthOffset(m => m + 1),
    style: navBtn
  }, "\u203A"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7,1fr)",
      gap: 1,
      marginBottom: 2
    }
  }, DAYS.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      padding: "8px 0",
      textAlign: "center",
      fontSize: 11,
      fontWeight: 600,
      color: C.textMuted,
      fontFamily: F.mono,
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7,1fr)",
      gap: 2
    }
  }, cells.map((day, i) => {
    const evts = day ? eventsByDate[day] || [] : [];
    const isToday = isCurrentMonth && day === TODAY.getDate();
    const weekdayIdx = day ? (startDay + day - 1) % 7 : -1;
    const isDayOff = day && daysOff.includes(weekdayIdx);
    const span = day ? getSpanForDay(day) : null;
    const isSpanStart = span && day === span.startDay;
    const isSpanEnd = span && day === span.endDay;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => day && onToggleDayOff(weekdayIdx),
      style: {
        minHeight: 68,
        padding: 6,
        borderRadius: span ? isSpanStart && isSpanEnd ? 8 : isSpanStart ? "8px 0 0 8px" : isSpanEnd ? "0 8px 8px 0" : 0 : 8,
        background: span ? gs(span.color) : isDayOff ? C.dayOff : "transparent",
        border: isToday ? `1.5px solid ${C.accent}` : span ? `1.5px solid ${gc(span.color)}30` : isDayOff ? `1px dashed ${C.dayOffBorder}` : "1px solid transparent",
        cursor: day ? "pointer" : "default",
        transition: "all 0.15s ease"
      }
    }, day && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: isToday ? 700 : 500,
        fontFamily: F.body,
        color: isToday ? C.accent : isDayOff ? C.textMuted : C.text
      }
    }, day), isDayOff && !span && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontFamily: F.mono,
        fontWeight: 700,
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: .5
      }
    }, "off"), span && isSpanStart && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontFamily: F.mono,
        fontWeight: 700,
        color: gc(span.color),
        textTransform: "uppercase",
        letterSpacing: .3,
        maxWidth: 50,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, span.title)), evts.slice(0, 2).map((e, j) => /*#__PURE__*/React.createElement("div", {
      key: j,
      style: {
        fontSize: 10,
        padding: "2px 6px",
        borderRadius: 4,
        marginTop: 2,
        background: isDayOff && (e.color === "blue" || e.color === "accent") ? C.redSoft : gs(e.color),
        color: isDayOff && (e.color === "blue" || e.color === "accent") ? C.red : gc(e.color),
        fontFamily: F.body,
        fontWeight: 600,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        textDecoration: isDayOff && (e.color === "blue" || e.color === "accent") ? "line-through" : "none",
        opacity: isDayOff && (e.color === "blue" || e.color === "accent") ? .5 : 1
      }
    }, e.title)), evts.length > 2 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        color: C.textMuted,
        marginTop: 2
      }
    }, "+", evts.length - 2, " more")));
  })), mSpans.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, mSpans.map((s, si) => {
    const st = SPAN_TYPES.find(t => t.id === s.type);
    return /*#__PURE__*/React.createElement("div", {
      key: s.id || si,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: gs(s.color),
        borderLeft: `3px solid ${gc(s.color)}`,
        borderRadius: 5,
        padding: "4px 8px"
      }
    }, st && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11
      }
    }, st.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: gc(s.color),
        fontFamily: F.body
      }
    }, s.title), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        color: C.textMuted,
        marginLeft: "auto"
      }
    }, s.startDay === s.endDay ? `${s.startDay}` : `${s.startDay}–${s.endDay}`, " ", MONTHS_SHORT[normMonth]));
  })));
};

/* ─── WEEK VIEW ─── */
const WeekView = ({
  events,
  daysOff,
  templates,
  spanEvents,
  tags,
  onPlaceTemplate,
  onAddTemplate,
  onDeleteTemplate,
  onDeleteEvent,
  onEditEvent,
  selectedTemplate,
  setSelectedTemplate,
  hoveredSlot,
  setHoveredSlot
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("💪");
  const [newDuration, setNewDuration] = useState(60);
  const [newTag, setNewTag] = useState("personal");
  const [newConflicts, setNewConflicts] = useState("show warning");
  const [weekOffset, setWeekOffset] = useState(0);
  const weekMonday = addDays(THIS_MONDAY, weekOffset * 7);
  const weekSunday = addDays(weekMonday, 6);
  const weekNum = getWeekNum(weekMonday);
  const isCurrentWeek = weekOffset === 0;
  const weekDates = DAYS.map((_, i) => addDays(weekMonday, i));
  const weekLabel = `${weekMonday.getDate()} ${MONTHS_SHORT[weekMonday.getMonth()]} – ${weekSunday.getDate()} ${MONTHS_SHORT[weekSunday.getMonth()]} ${weekSunday.getFullYear()}`;
  const activeSpans = spanEvents.filter(s => {
    const spanStart = new Date(weekMonday.getFullYear(), s.month, s.startDay);
    const spanEnd = new Date(weekMonday.getFullYear(), s.month, s.endDay);
    return spanStart <= weekSunday && spanEnd >= weekMonday;
  });
  const getSpanDayCols = s => {
    const cols = [];
    for (let di = 0; di < 7; di++) {
      const dt = weekDates[di];
      if (dt.getMonth() === s.month && dt.getDate() >= s.startDay && dt.getDate() <= s.endDay) cols.push(di);
    }
    return cols;
  };
  const getConflict = (day, hour, dur) => {
    const end = hour + dur / 60;
    return events.find(e => e.day === day && !(end <= e.hour || hour >= e.hour + e.duration / 60));
  };
  const selT = selectedTemplate ? templates.find(t => t.id === selectedTemplate) : null;
  const navBtn = {
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 14,
    color: C.accent,
    fontWeight: 700,
    fontFamily: F.body,
    lineHeight: 1
  };
  const handleCreateTemplate = () => {
    if (!newName.trim()) return;
    const tag = tags.find(t => t.id === newTag);
    onAddTemplate({
      id: `custom_${Date.now()}`,
      icon: newIcon,
      name: newName.trim(),
      duration: newDuration,
      tag: newTag,
      color: tag?.color || "accent",
      conflicts: newConflicts
    });
    setNewName("");
    setNewIcon("💪");
    setNewDuration(60);
    setNewTag("personal");
    setNewConflicts("show warning");
    setCreating(false);
  };
  const inputSt = {
    width: "100%",
    padding: "6px 8px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: F.body,
    color: C.text,
    background: C.surface,
    outline: "none",
    boxSizing: "border-box"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      position: "relative",
      minHeight: 520
    }
  }, !sidebarOpen && /*#__PURE__*/React.createElement("div", {
    onClick: () => setSidebarOpen(true),
    style: {
      position: "absolute",
      left: 0,
      top: 50,
      zIndex: 5,
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderLeft: "none",
      borderRadius: "0 10px 10px 0",
      padding: "14px 8px",
      cursor: "pointer",
      writingMode: "vertical-rl",
      textOrientation: "mixed",
      fontSize: 11,
      fontWeight: 700,
      fontFamily: F.mono,
      color: C.accent,
      letterSpacing: 1,
      textTransform: "uppercase",
      boxShadow: "2px 2px 8px rgba(44,36,24,0.06)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      transition: "all 0.2s ease"
    },
    onMouseEnter: e => e.currentTarget.style.background = C.surfaceHover,
    onMouseLeave: e => e.currentTarget.style.background = C.surface
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      writingMode: "horizontal-tb",
      fontSize: 12
    }
  }, "\u25B6"), "Templates"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: sidebarOpen ? 210 : 0,
      overflow: "hidden",
      borderRight: sidebarOpen ? `1px solid ${C.border}` : "none",
      transition: "width 0.25s ease",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 210,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      fontWeight: 600,
      color: C.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, "Templates"), /*#__PURE__*/React.createElement("span", {
    onClick: () => setSidebarOpen(false),
    style: {
      fontSize: 11,
      cursor: "pointer",
      color: C.textMuted,
      fontWeight: 700,
      padding: "3px 6px",
      borderRadius: 4,
      lineHeight: 1
    },
    onMouseEnter: e => e.currentTarget.style.background = C.surfaceHover,
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, "\u25C0")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      marginBottom: 8,
      maxHeight: 320,
      overflowY: "auto"
    }
  }, templates.map(t => {
    const active = selectedTemplate === t.id;
    const isConfirming = confirmDelete === t.id;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      style: {
        background: isConfirming ? C.redSoft : active ? gs(t.color) : C.surface,
        border: `1.5px solid ${isConfirming ? C.red : active ? gc(t.color) : C.border}`,
        borderRadius: 10,
        padding: "8px 10px",
        cursor: isConfirming ? "default" : "pointer",
        transition: "all 0.15s ease",
        transform: active && !isConfirming ? "scale(1.02)" : "scale(1)",
        position: "relative"
      },
      onClick: () => {
        if (!isConfirming) setSelectedTemplate(active ? null : t.id);
      },
      onMouseEnter: e => {
        if (!isConfirming) {
          const d = e.currentTarget.querySelector('.tpl-del');
          if (d) d.style.opacity = '1';
        }
      },
      onMouseLeave: e => {
        if (!isConfirming) {
          const d = e.currentTarget.querySelector('.tpl-del');
          if (d) d.style.opacity = '0';
        }
        setConfirmDelete(null);
      }
    }, isConfirming ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: C.red,
        fontFamily: F.body,
        marginBottom: 6
      }
    }, "Delete \"", t.name, "\"?"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: C.textMuted,
        fontFamily: F.body,
        marginBottom: 8,
        lineHeight: 1.4
      }
    }, "Events already on the calendar won't be removed."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        onDeleteTemplate(t.id);
        setConfirmDelete(null);
        if (selectedTemplate === t.id) setSelectedTemplate(null);
      },
      style: {
        flex: 1,
        padding: "5px 0",
        background: C.red,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: F.body,
        cursor: "pointer"
      }
    }, "Delete"), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        setConfirmDelete(null);
      },
      style: {
        padding: "5px 10px",
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        fontSize: 11,
        fontFamily: F.body,
        color: C.textMuted,
        cursor: "pointer"
      }
    }, "Keep"))) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15
      }
    }, t.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: C.text,
        fontFamily: F.body,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, t.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontFamily: F.mono,
        color: C.textMuted
      }
    }, t.duration, "m"), /*#__PURE__*/React.createElement(TagPill, {
      tag: t.tag,
      small: true
    }))), /*#__PURE__*/React.createElement("span", {
      className: "tpl-del",
      onClick: e => {
        e.stopPropagation();
        setConfirmDelete(t.id);
      },
      style: {
        opacity: 0,
        fontSize: 12,
        color: C.textMuted,
        fontWeight: 700,
        cursor: "pointer",
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        transition: "all 0.15s ease",
        flexShrink: 0
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = C.redSoft;
        e.currentTarget.style.color = C.red;
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = C.textMuted;
      }
    }, "\xD7")));
  })), creating ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.surfaceHover,
      border: `1.5px solid ${C.border}`,
      borderRadius: 10,
      padding: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      fontWeight: 600,
      color: C.accent,
      letterSpacing: .5,
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "New Template"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      color: C.textMuted,
      marginBottom: 3
    }
  }, "Icon"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      flexWrap: "wrap"
    }
  }, ICON_OPTIONS.map(ic => /*#__PURE__*/React.createElement("span", {
    key: ic,
    onClick: () => setNewIcon(ic),
    style: {
      fontSize: 16,
      padding: 3,
      borderRadius: 5,
      cursor: "pointer",
      background: newIcon === ic ? C.accentSoft : "transparent",
      border: newIcon === ic ? `1px solid ${C.accent}` : "1px solid transparent"
    }
  }, ic)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      color: C.textMuted,
      marginBottom: 3
    }
  }, "Name"), /*#__PURE__*/React.createElement("input", {
    value: newName,
    onChange: e => setNewName(e.target.value),
    placeholder: "e.g. Morning Run",
    style: inputSt
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      color: C.textMuted,
      marginBottom: 3
    }
  }, "Duration"), /*#__PURE__*/React.createElement("select", {
    value: newDuration,
    onChange: e => setNewDuration(+e.target.value),
    style: inputSt
  }, [15, 30, 45, 60, 90, 120].map(d => /*#__PURE__*/React.createElement("option", {
    key: d,
    value: d
  }, d, "m")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      color: C.textMuted,
      marginBottom: 3
    }
  }, "Tag"), /*#__PURE__*/React.createElement("select", {
    value: newTag,
    onChange: e => setNewTag(e.target.value),
    style: inputSt
  }, tags.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      color: C.textMuted,
      marginBottom: 3
    }
  }, "On conflicts"), /*#__PURE__*/React.createElement("select", {
    value: newConflicts,
    onChange: e => setNewConflicts(e.target.value),
    style: inputSt
  }, /*#__PURE__*/React.createElement("option", {
    value: "show warning"
  }, "Show warning"), /*#__PURE__*/React.createElement("option", {
    value: "auto-decline"
  }, "Auto-decline"), /*#__PURE__*/React.createElement("option", {
    value: "can be bumped"
  }, "Can be bumped"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCreateTemplate,
    disabled: !newName.trim(),
    style: {
      flex: 1,
      padding: "6px 0",
      background: newName.trim() ? C.accent : C.border,
      color: "#fff",
      border: "none",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: F.body,
      cursor: newName.trim() ? "pointer" : "not-allowed"
    }
  }, "Save"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCreating(false),
    style: {
      padding: "6px 10px",
      background: "transparent",
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      fontSize: 11,
      fontFamily: F.body,
      color: C.textMuted,
      cursor: "pointer"
    }
  }, "Cancel"))) : /*#__PURE__*/React.createElement("div", {
    onClick: () => setCreating(true),
    style: {
      padding: "8px 10px",
      borderRadius: 10,
      border: `1.5px dashed ${C.border}`,
      textAlign: "center",
      cursor: "pointer",
      fontSize: 12,
      color: C.textMuted,
      fontWeight: 600,
      transition: "all 0.15s ease"
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = C.accent;
      e.currentTarget.style.color = C.accent;
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = C.border;
      e.currentTarget.style.color = C.textMuted;
    }
  }, "+ New Template"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: "12px 16px",
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setWeekOffset(w => w - 1),
    style: navBtn
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: C.text,
      fontFamily: F.display
    }
  }, "Week ", weekNum), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: F.mono,
      color: C.textMuted
    }
  }, weekLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, !isCurrentWeek && /*#__PURE__*/React.createElement("button", {
    onClick: () => setWeekOffset(0),
    style: {
      ...navBtn,
      fontSize: 11,
      fontWeight: 600,
      padding: "4px 10px"
    }
  }, "Today"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWeekOffset(w => w + 1),
    style: navBtn
  }, "\u203A"))), selectedTemplate && selT && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 12px",
      background: gs(selT.color),
      borderRadius: 8,
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, selT.icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: gc(selT.color)
    }
  }, "Tap a slot to place \"", selT.name, "\""), /*#__PURE__*/React.createElement("span", {
    onClick: () => setSelectedTemplate(null),
    style: {
      marginLeft: "auto",
      fontSize: 11,
      cursor: "pointer",
      color: C.textMuted,
      fontWeight: 600
    }
  }, "\u2715")), activeSpans.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, activeSpans.map((s, si) => {
    const st = SPAN_TYPES.find(t => t.id === s.type);
    const cols = getSpanDayCols(s);
    const dayRange = cols.length > 0 ? `${DAYS[cols[0]]}${cols.length > 1 ? `–${DAYS[cols[cols.length - 1]]}` : ""}` : "";
    return /*#__PURE__*/React.createElement("div", {
      key: s.id || si,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: gs(s.color),
        borderLeft: `3px solid ${gc(s.color)}`,
        borderRadius: 6,
        padding: "5px 10px"
      }
    }, st && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, st.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: gc(s.color),
        fontFamily: F.body
      }
    }, s.title), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        color: C.textMuted,
        marginLeft: "auto"
      }
    }, dayRange));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "40px repeat(7,1fr)",
      gap: 0
    }
  }, /*#__PURE__*/React.createElement("div", null), DAYS.map((d, i) => {
    const dt = weekDates[i];
    const isToday = isCurrentWeek && dt.getDate() === TODAY.getDate() && dt.getMonth() === TODAY.getMonth();
    const daySpan = activeSpans.find(s => dt.getMonth() === s.month && dt.getDate() >= s.startDay && dt.getDate() <= s.endDay);
    return /*#__PURE__*/React.createElement("div", {
      key: d,
      style: {
        padding: "6px 2px",
        textAlign: "center",
        borderBottom: `1px solid ${C.border}`,
        background: daySpan ? gs(daySpan.color) : daysOff.includes(i) ? C.dayOff : "transparent",
        borderRadius: daysOff.includes(i) || daySpan ? "6px 6px 0 0" : "0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 600,
        color: C.textMuted,
        fontFamily: F.mono,
        letterSpacing: .5
      }
    }, d), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: isToday ? 800 : 600,
        color: isToday ? C.accent : C.text,
        fontFamily: F.display,
        marginTop: 1,
        ...(isToday ? {
          background: C.accentSoft,
          borderRadius: 6,
          display: "inline-block",
          padding: "1px 7px"
        } : {})
      }
    }, dt.getDate()), daysOff.includes(i) && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontFamily: F.mono,
        color: C.orange,
        fontWeight: 700,
        marginTop: 1
      }
    }, "NO CLIENTS"));
  }), HOURS.map(h => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      display: "contents"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.textMuted,
      fontFamily: F.mono,
      padding: "4px 4px 0 0",
      textAlign: "right",
      borderTop: `1px solid ${C.border}`
    }
  }, fh(h)), DAYS.map((_, di) => {
    const ev = isCurrentWeek ? events.find(e => e.day === di && Math.floor(e.hour) === h) : null;
    const isOff = daysOff.includes(di);
    const isHov = hoveredSlot?.day === di && hoveredSlot?.hour === h;
    const conflict = selT ? getConflict(di, h, selT.duration) : null;
    const isEvSelected = selectedEvent === ev?.id;
    return /*#__PURE__*/React.createElement("div", {
      key: di,
      onMouseEnter: () => selectedTemplate && setHoveredSlot({
        day: di,
        hour: h
      }),
      onMouseLeave: () => setHoveredSlot(null),
      onClick: () => {
        if (selectedTemplate) {
          if (isOff && (selT.tag === "client" || selT.tag === "meeting")) return;
          onPlaceTemplate(di, h);
          return;
        }
        if (selectedEvent && !ev) setSelectedEvent(null);
      },
      style: {
        borderTop: `1px solid ${C.border}`,
        borderLeft: `1px solid ${C.border}`,
        minHeight: 38,
        padding: 1,
        position: "relative",
        background: isOff ? C.dayOff : isHov && selectedTemplate ? conflict ? "rgba(212,121,58,0.06)" : gs(selT.color) : "transparent",
        cursor: selectedTemplate ? isOff && (selT?.tag === "client" || selT?.tag === "meeting") ? "not-allowed" : "pointer" : "default",
        transition: "background 0.1s"
      }
    }, ev && /*#__PURE__*/React.createElement("div", {
      onClick: e => {
        if (!selectedTemplate) {
          e.stopPropagation();
          setSelectedEvent(isEvSelected ? null : ev.id);
          setConfirmDeleteEvent(null);
        }
      },
      style: {
        background: gs(ev.color),
        borderLeft: `3px solid ${gc(ev.color)}`,
        borderRadius: 4,
        padding: "3px 5px",
        minHeight: Math.max(ev.duration / 60 * 34, 26),
        cursor: "pointer",
        outline: isEvSelected ? `2px solid ${gc(ev.color)}` : "none",
        outlineOffset: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: gc(ev.color),
        fontFamily: F.body,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, ev.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        alignItems: "center",
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontFamily: F.mono,
        color: C.textMuted
      }
    }, fh(ev.hour)), /*#__PURE__*/React.createElement(Badge, {
      source: ev.source
    })), isEvSelected && /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 20,
        marginTop: 4,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 10,
        boxShadow: "0 8px 24px rgba(44,36,24,0.12)",
        minWidth: 160
      }
    }, confirmDeleteEvent === ev.id ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: C.red,
        marginBottom: 6
      }
    }, "Delete this event?"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onDeleteEvent(ev.id);
        setSelectedEvent(null);
        setConfirmDeleteEvent(null);
      },
      style: {
        flex: 1,
        padding: "5px 0",
        background: C.red,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: F.body
      }
    }, "Delete"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirmDeleteEvent(null),
      style: {
        padding: "5px 8px",
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        fontSize: 10,
        cursor: "pointer",
        fontFamily: F.body,
        color: C.textMuted
      }
    }, "Cancel"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: C.text,
        marginBottom: 2
      }
    }, ev.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        alignItems: "center",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontFamily: F.mono,
        color: C.textMuted
      }
    }, fh(ev.hour), " \xB7 ", ev.duration, "m \xB7 ", DAYS[ev.day])), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        alignItems: "center",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement(TagPill, {
      tag: ev.tag,
      small: true
    }), /*#__PURE__*/React.createElement(Badge, {
      source: ev.source
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onEditEvent(ev);
        setSelectedEvent(null);
      },
      style: {
        flex: 1,
        padding: "5px 0",
        background: C.accent,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: F.body
      }
    }, "Edit"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirmDeleteEvent(ev.id),
      style: {
        flex: 1,
        padding: "5px 0",
        background: C.redSoft,
        color: C.red,
        border: `1px solid ${C.red}30`,
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: F.body
      }
    }, "Delete"))))), isHov && selectedTemplate && !ev && /*#__PURE__*/React.createElement("div", {
      style: {
        borderLeft: `3px solid ${gc(selT.color)}`,
        borderRadius: 4,
        padding: "3px 5px",
        opacity: .45,
        minHeight: Math.max(selT.duration / 60 * 34, 26)
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: gc(selT.color)
      }
    }, selT.icon, " ", selT.name), conflict && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: C.orange,
        fontWeight: 700,
        fontFamily: F.mono
      }
    }, "\u26A0 overlaps ", conflict.title), isOff && (selT.tag === "client" || selT.tag === "meeting") && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: C.red,
        fontWeight: 700,
        fontFamily: F.mono
      }
    }, "\u2715 day off \u2014 no clients")));
  }))))));
};

/* ─── AGENDA VIEW ─── */
const AgendaView = ({
  events,
  daysOff,
  spanEvents,
  tags,
  onDeleteEvent,
  onEditEvent
}) => {
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const todayEvents = [...events].filter(e => e.day <= 1).sort((a, b) => a.hour - b.hour);
  const isOff = daysOff.includes(0);
  const todaySpans = spanEvents.filter(s => s.month === TODAY.getMonth() && TODAY.getDate() >= s.startDay && TODAY.getDate() <= s.endDay);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 20,
      fontWeight: 700,
      color: C.text,
      fontFamily: F.display
    }
  }, "Today's Agenda"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 13,
      color: C.textMuted
    }
  }, todayEvents.length, " events", isOff && /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.orange,
      fontWeight: 600
    }
  }, " \xB7 Day Off (personal only)"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5
    }
  }, Object.keys(SOURCES).map(s => /*#__PURE__*/React.createElement(Badge, {
    key: s,
    source: s
  })))), todaySpans.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, todaySpans.map((s, si) => {
    const st = SPAN_TYPES.find(t => t.id === s.type);
    return /*#__PURE__*/React.createElement("div", {
      key: s.id || si,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: gs(s.color),
        border: `1.5px solid ${gc(s.color)}30`,
        borderLeft: `4px solid ${gc(s.color)}`,
        borderRadius: 10,
        padding: "10px 14px"
      }
    }, st && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, st.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: gc(s.color),
        fontFamily: F.body
      }
    }, s.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontFamily: F.mono,
        color: C.textMuted
      }
    }, s.startDay === s.endDay ? `${s.startDay}` : `${s.startDay}–${s.endDay}`, " ", MONTHS_SHORT[s.month])));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      paddingLeft: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 6,
      top: 8,
      bottom: 8,
      width: 1,
      background: `linear-gradient(180deg,${C.accent},${C.purple})`
    }
  }), todayEvents.map((item, i) => {
    const isClient = item.tag === "client" || item.tag === "meeting";
    const blocked = isOff && isClient;
    const isExpanded = expanded === i;
    const isConfirming = confirmDelete === item.id;
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      onClick: () => setExpanded(isExpanded ? null : i),
      style: {
        display: "flex",
        gap: 14,
        padding: "12px 14px",
        marginBottom: 4,
        background: gs(item.color),
        borderLeft: `3px solid ${gc(item.color)}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.15s ease",
        position: "relative",
        opacity: blocked ? .45 : 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: -23,
        top: 18,
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: gc(item.color),
        border: `2px solid ${C.bg}`,
        boxShadow: `0 0 0 2px ${gs(item.color)}`
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 62
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: C.text,
        fontFamily: F.mono
      }
    }, fh(item.hour).replace(/([ap])/, " $1m").toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: C.textMuted,
        fontFamily: F.mono
      }
    }, item.duration, "m")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: C.text,
        fontFamily: F.body,
        textDecoration: blocked ? "line-through" : "none"
      }
    }, item.title), /*#__PURE__*/React.createElement(TagPill, {
      tag: item.tag,
      small: true
    }), /*#__PURE__*/React.createElement(Badge, {
      source: item.source
    }), blocked && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        fontWeight: 700,
        color: C.red
      }
    }, "BLOCKED")), isExpanded && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 12px",
        background: C.surface,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        fontSize: 12,
        color: C.textMuted,
        lineHeight: 1.6,
        marginBottom: 8
      }
    }, item.source === "shopify" && "Synced from Shopify via webhook → Supabase Edge Function.", item.source === "google" && "Synced from Google Calendar via OAuth 2.0. Changes sync both ways.", item.source === "apple" && "Synced from Apple Calendar via CalDAV (read-only in this dashboard).", item.source === "netlify" && "Auto-generated from Netlify deploy hook in your CI/CD pipeline.", item.source === "manual" && "Manually added via Quick Add or the appointment form."), isConfirming ? /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: C.red
      }
    }, "Delete this event?"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onDeleteEvent(item.id);
        setConfirmDelete(null);
        setExpanded(null);
      },
      style: {
        padding: "4px 10px",
        background: C.red,
        color: "#fff",
        border: "none",
        borderRadius: 5,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: F.body
      }
    }, "Delete"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirmDelete(null),
      style: {
        padding: "4px 10px",
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        fontSize: 10,
        cursor: "pointer",
        fontFamily: F.body,
        color: C.textMuted
      }
    }, "Cancel")) : /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onEditEvent(item);
        setExpanded(null);
      },
      style: {
        padding: "5px 12px",
        background: C.accent,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: F.body
      }
    }, "Edit"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirmDelete(item.id),
      style: {
        padding: "5px 12px",
        background: C.redSoft,
        color: C.red,
        border: `1px solid ${C.red}30`,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: F.body
      }
    }, "Delete")))));
  })));
};

/* ─── YEAR SPAN EVENTS ─── */
const yearSpanEvents = [{
  id: "sp1",
  month: 0,
  startDay: 26,
  endDay: 27,
  title: "Australia Day",
  color: "blue",
  type: "holiday"
}, {
  id: "sp2",
  month: 2,
  startDay: 9,
  endDay: 9,
  title: "Canberra Day",
  color: "blue",
  type: "holiday"
}, {
  id: "sp3",
  month: 3,
  startDay: 3,
  endDay: 6,
  title: "Easter Break",
  color: "green",
  type: "holiday"
}, {
  id: "sp4",
  month: 3,
  startDay: 25,
  endDay: 25,
  title: "ANZAC Day",
  color: "blue",
  type: "holiday"
}, {
  id: "sp5",
  month: 5,
  startDay: 15,
  endDay: 22,
  title: "Bali Trip ✈️",
  color: "pink",
  type: "trip"
}, {
  id: "sp6",
  month: 6,
  startDay: 6,
  endDay: 10,
  title: "Gold Coast",
  color: "pink",
  type: "trip"
}, {
  id: "sp7",
  month: 7,
  startDay: 12,
  endDay: 12,
  title: "Ekka Holiday",
  color: "blue",
  type: "holiday"
}, {
  id: "sp8",
  month: 8,
  startDay: 28,
  endDay: 30,
  title: "Tech Conference",
  color: "purple",
  type: "event"
}, {
  id: "sp9",
  month: 9,
  startDay: 5,
  endDay: 5,
  title: "Queens Birthday",
  color: "blue",
  type: "holiday"
}, {
  id: "sp10",
  month: 10,
  startDay: 16,
  endDay: 20,
  title: "Team Retreat",
  color: "purple",
  type: "trip"
}, {
  id: "sp11",
  month: 11,
  startDay: 22,
  endDay: 31,
  title: "Christmas Break 🎄",
  color: "green",
  type: "holiday"
}];

/* ─── YEAR VIEW ─── */
const YearView = ({
  daysOff,
  events,
  spanEvents,
  tags,
  onAddSpan,
  onDeleteSpan
}) => {
  const [yearOffset, setYearOffset] = useState(0);
  const [addingMonth, setAddingMonth] = useState(null);
  const [confirmDeleteSpan, setConfirmDeleteSpan] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState(1);
  const [newEnd, setNewEnd] = useState(3);
  const [newSpanType, setNewSpanType] = useState("holiday");
  const [newTag, setNewTag] = useState("personal");
  const viewYear = TODAY.getFullYear() + yearOffset;
  const isCurrentYear = yearOffset === 0;
  const navBtn = {
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 14,
    color: C.accent,
    fontWeight: 700,
    fontFamily: F.body,
    lineHeight: 1
  };
  const handleCreate = m => {
    if (!newTitle.trim()) return;
    const spanType = SPAN_TYPES.find(t => t.id === newSpanType);
    const tag = tags.find(t => t.id === newTag);
    onAddSpan({
      id: Date.now(),
      month: m,
      startDay: Math.min(newStart, newEnd),
      endDay: Math.max(newStart, newEnd),
      title: newTitle.trim(),
      color: tag?.color || spanType?.defaultColor || "accent",
      type: newSpanType,
      tag: newTag
    });
    setNewTitle("");
    setNewStart(1);
    setNewEnd(3);
    setNewSpanType("holiday");
    setNewTag("personal");
    setAddingMonth(null);
  };
  const getMonthEvents = m => {
    const result = [];
    events.forEach(ev => {
      const dt = eventToDate(ev, THIS_MONDAY);
      if (dt.getMonth() === m && dt.getFullYear() === viewYear) result.push({
        day: dt.getDate(),
        title: ev.title,
        color: ev.color
      });
    });
    return result;
  };
  const ist = {
    width: "100%",
    padding: "5px 7px",
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    fontSize: 11,
    fontFamily: F.body,
    color: C.text,
    background: C.surface,
    outline: "none",
    boxSizing: "border-box"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setYearOffset(y => y - 1),
    style: navBtn
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 22,
      fontWeight: 700,
      color: C.text,
      fontFamily: F.display
    }
  }, viewYear), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 13,
      color: C.textMuted
    }
  }, "Click + on any month to add holidays, trips & more")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, !isCurrentYear && /*#__PURE__*/React.createElement("button", {
    onClick: () => setYearOffset(0),
    style: {
      ...navBtn,
      fontSize: 11,
      fontWeight: 600,
      padding: "4px 10px"
    }
  }, "This Year"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setYearOffset(y => y + 1),
    style: navBtn
  }, "\u203A"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, Array.from({
    length: 12
  }, (_, m) => {
    const daysIn = getDaysInMonth(viewYear, m);
    const firstDay = getFirstDayOfMonth(viewYear, m);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysIn; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const isCurrentMonth = isCurrentYear && m === TODAY.getMonth();
    const mSpans = spanEvents.filter(e => e.month === m);
    const mEvents = getMonthEvents(m);
    const notableEvents = mEvents.slice(0, 3);
    const getSpanForDay = day => mSpans.find(s => day >= s.startDay && day <= s.endDay);
    const isAdding = addingMonth === m;
    return /*#__PURE__*/React.createElement("div", {
      key: m,
      style: {
        background: isCurrentMonth ? C.surfaceHover : C.surface,
        border: `1.5px solid ${isCurrentMonth ? C.accent : C.border}`,
        borderRadius: 14,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: isCurrentMonth ? C.accent : C.text,
        fontFamily: F.display
      }
    }, MONTHS_FULL[m]), /*#__PURE__*/React.createElement("span", {
      onClick: () => setAddingMonth(isAdding ? null : m),
      style: {
        fontSize: 16,
        cursor: "pointer",
        color: isAdding ? C.red : C.textMuted,
        fontWeight: 700,
        width: 22,
        height: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        transition: "all 0.15s ease"
      },
      onMouseEnter: e => e.currentTarget.style.background = C.surfaceHover,
      onMouseLeave: e => e.currentTarget.style.background = "transparent"
    }, isAdding ? "×" : "+")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(7,1fr)",
        gap: 1
      }
    }, ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        textAlign: "center",
        fontSize: 9,
        fontFamily: F.mono,
        color: C.textMuted,
        fontWeight: 600,
        padding: "2px 0 4px"
      }
    }, d)), cells.map((day, ci) => {
      const weekdayIdx = day ? (firstDay + day - 1) % 7 : -1;
      const isDayOff = day && daysOff.includes(weekdayIdx);
      const isToday = isCurrentYear && m === TODAY.getMonth() && day === TODAY.getDate();
      const span = day ? getSpanForDay(day) : null;
      const isSpanStart = span && day === span.startDay;
      const isSpanEnd = span && day === span.endDay;
      const dayEvts = day ? mEvents.filter(e => e.day === day) : [];
      const hasEvents = dayEvts.length > 0;
      return /*#__PURE__*/React.createElement("div", {
        key: ci,
        style: {
          textAlign: "center",
          padding: "3px 1px",
          position: "relative",
          minHeight: 24,
          background: span ? gs(span.color) : isDayOff ? C.dayOff : "transparent",
          borderRadius: span ? isSpanStart && isSpanEnd ? 5 : isSpanStart ? "5px 0 0 5px" : isSpanEnd ? "0 5px 5px 0" : 0 : isDayOff ? 3 : 0,
          borderTop: span ? `2px solid ${gc(span.color)}` : "none",
          borderBottom: span ? `2px solid ${gc(span.color)}` : "none",
          borderLeft: isSpanStart ? `2px solid ${gc(span.color)}` : "none",
          borderRight: isSpanEnd ? `2px solid ${gc(span.color)}` : "none"
        }
      }, day && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: isToday ? 800 : span ? 600 : hasEvents ? 600 : 400,
          color: isToday ? "#fff" : span ? gc(span.color) : isDayOff ? C.textMuted : C.text,
          fontFamily: F.body,
          lineHeight: "20px",
          borderRadius: isToday ? "50%" : 0,
          background: isToday ? C.accent : "transparent",
          width: isToday ? 20 : "auto",
          height: isToday ? 20 : "auto",
          margin: isToday ? "0 auto" : "0",
          display: isToday ? "flex" : "block",
          alignItems: "center",
          justifyContent: "center"
        }
      }, day), hasEvents && !isToday && !span && /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 1,
          justifyContent: "center",
          marginTop: 1
        }
      }, dayEvts.slice(0, 3).map((e, ei) => /*#__PURE__*/React.createElement("span", {
        key: ei,
        style: {
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: gc(e.color)
        }
      }))));
    })), isAdding && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 10,
        background: C.surfaceHover,
        borderRadius: 10,
        border: `1px solid ${C.border}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontFamily: F.mono,
        fontWeight: 600,
        color: C.accent,
        letterSpacing: .5,
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, "Add to ", MONTHS_SHORT[m]), /*#__PURE__*/React.createElement("input", {
      value: newTitle,
      onChange: e => setNewTitle(e.target.value),
      placeholder: "e.g. Bali Trip \u2708\uFE0F",
      style: {
        ...ist,
        marginBottom: 6
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        marginBottom: 6
      }
    }, SPAN_TYPES.map(st => /*#__PURE__*/React.createElement("button", {
      key: st.id,
      onClick: () => setNewSpanType(st.id),
      style: {
        flex: 1,
        padding: "4px 2px",
        borderRadius: 5,
        border: `1.5px solid ${newSpanType === st.id ? C.accent : C.border}`,
        background: newSpanType === st.id ? C.accentSoft : "transparent",
        cursor: "pointer",
        fontSize: 9,
        fontWeight: 600,
        fontFamily: F.body,
        color: newSpanType === st.id ? C.accent : C.textMuted,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, st.icon), st.label))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        color: C.textMuted,
        marginBottom: 2
      }
    }, "Start day"), /*#__PURE__*/React.createElement("select", {
      value: newStart,
      onChange: e => setNewStart(+e.target.value),
      style: ist
    }, Array.from({
      length: daysIn
    }, (_, i) => /*#__PURE__*/React.createElement("option", {
      key: i,
      value: i + 1
    }, i + 1)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        color: C.textMuted,
        marginBottom: 2
      }
    }, "End day"), /*#__PURE__*/React.createElement("select", {
      value: newEnd,
      onChange: e => setNewEnd(+e.target.value),
      style: ist
    }, Array.from({
      length: daysIn
    }, (_, i) => /*#__PURE__*/React.createElement("option", {
      key: i,
      value: i + 1
    }, i + 1))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        color: C.textMuted,
        marginBottom: 2
      }
    }, "Tag"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3,
        flexWrap: "wrap"
      }
    }, tags.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setNewTag(t.id),
      style: {
        padding: "3px 8px",
        borderRadius: 4,
        border: `1px solid ${newTag === t.id ? gc(t.color) : C.border}`,
        background: newTag === t.id ? gs(t.color) : "transparent",
        cursor: "pointer",
        fontSize: 10,
        fontWeight: 600,
        fontFamily: F.body,
        color: newTag === t.id ? gc(t.color) : C.textMuted
      }
    }, t.label)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handleCreate(m),
      disabled: !newTitle.trim(),
      style: {
        flex: 1,
        padding: "5px 0",
        background: newTitle.trim() ? C.accent : C.border,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: F.body,
        cursor: newTitle.trim() ? "pointer" : "not-allowed"
      }
    }, "Add"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setAddingMonth(null),
      style: {
        padding: "5px 10px",
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        fontSize: 11,
        fontFamily: F.body,
        color: C.textMuted,
        cursor: "pointer"
      }
    }, "Cancel"))), mSpans.length > 0 && !isAdding && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 3
      }
    }, mSpans.map((s, si) => {
      const st = SPAN_TYPES.find(t => t.id === s.type);
      const isConfirming = confirmDeleteSpan === (s.id || si);
      return isConfirming ? /*#__PURE__*/React.createElement("div", {
        key: s.id || si,
        style: {
          background: C.redSoft,
          border: `1.5px solid ${C.red}`,
          borderRadius: 5,
          padding: "8px 10px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: C.red,
          fontFamily: F.body,
          marginBottom: 4
        }
      }, "Delete \"", s.title, "\"?"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          onDeleteSpan(s.id);
          setConfirmDeleteSpan(null);
        },
        style: {
          flex: 1,
          padding: "4px 0",
          background: C.red,
          color: "#fff",
          border: "none",
          borderRadius: 5,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: F.body,
          cursor: "pointer"
        }
      }, "Delete"), /*#__PURE__*/React.createElement("button", {
        onClick: () => setConfirmDeleteSpan(null),
        style: {
          padding: "4px 10px",
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 5,
          fontSize: 10,
          fontFamily: F.body,
          color: C.textMuted,
          cursor: "pointer"
        }
      }, "Keep"))) : /*#__PURE__*/React.createElement("div", {
        key: s.id || si,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: gs(s.color),
          borderLeft: `3px solid ${gc(s.color)}`,
          borderRadius: 5,
          padding: "4px 8px"
        },
        onMouseEnter: e => {
          const d = e.currentTarget.querySelector('.span-del');
          if (d) d.style.opacity = '1';
        },
        onMouseLeave: e => {
          const d = e.currentTarget.querySelector('.span-del');
          if (d) d.style.opacity = '0';
        }
      }, st && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11
        }
      }, st.icon), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: gc(s.color),
          fontFamily: F.body
        }
      }, s.title), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 9,
          fontFamily: F.mono,
          color: C.textMuted,
          marginLeft: "auto"
        }
      }, s.startDay === s.endDay ? `${s.startDay}` : `${s.startDay}–${s.endDay}`, " ", MONTHS_SHORT[m]), /*#__PURE__*/React.createElement("span", {
        className: "span-del",
        onClick: () => setConfirmDeleteSpan(s.id || si),
        style: {
          opacity: 0,
          fontSize: 12,
          color: C.textMuted,
          fontWeight: 700,
          cursor: "pointer",
          width: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 3,
          transition: "all 0.15s ease",
          flexShrink: 0
        },
        onMouseEnter: e => {
          e.currentTarget.style.background = C.redSoft;
          e.currentTarget.style.color = C.red;
        },
        onMouseLeave: e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = C.textMuted;
        }
      }, "\xD7"));
    })), notableEvents.length > 0 && !isAdding && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: mSpans.length > 0 ? 4 : 8,
        display: "flex",
        gap: 4,
        flexWrap: "wrap"
      }
    }, notableEvents.map((e, ei) => /*#__PURE__*/React.createElement("span", {
      key: ei,
      style: {
        fontSize: 9,
        fontFamily: F.mono,
        fontWeight: 600,
        background: gs(e.color),
        color: gc(e.color),
        padding: "2px 6px",
        borderRadius: 4
      }
    }, e.day, " \xB7 ", e.title))));
  })));
};

/* ─── ADD/EDIT MODAL ─── */
const AddModal = ({
  onClose,
  onAdd,
  onUpdate,
  events,
  daysOff,
  editEvent,
  tags,
  onAddTag
}) => {
  const isEditing = !!editEvent;
  const [title, setTitle] = useState(editEvent?.title || "");
  const [day, setDay] = useState(editEvent?.day ?? 0);
  const [hour, setHour] = useState(editEvent?.hour ?? 9);
  const [duration, setDuration] = useState(editEvent?.duration ?? 60);
  const [tag, setTag] = useState(editEvent?.tag || "meeting");
  const [source, setSource] = useState(editEvent?.source || "manual");
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const isOff = daysOff.includes(day);
  const blocked = isOff && (tag === "client" || tag === "meeting");
  const conflicts = events.filter(e => {
    if (e.day !== day) return false;
    if (isEditing && e.id === editEvent.id) return false;
    const end = hour + duration / 60;
    return !(end <= e.hour || hour >= e.hour + e.duration / 60);
  });
  const handleSubmit = () => {
    if (!title.trim() || blocked) return;
    if (isEditing) onUpdate(editEvent.id, {
      title: title.trim(),
      hour,
      duration,
      day,
      tag,
      color: tags.find(t => t.id === tag)?.color || "accent",
      source
    });else onAdd({
      type: "event",
      event: {
        id: Date.now(),
        title: title.trim(),
        hour,
        duration,
        day,
        tag,
        color: tags.find(t => t.id === tag)?.color || "accent",
        source
      }
    });
    onClose();
  };
  const ist = {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: F.body,
    color: C.text,
    background: C.surface,
    outline: "none",
    boxSizing: "border-box"
  };
  const lst = {
    fontSize: 11,
    fontFamily: F.mono,
    fontWeight: 600,
    color: C.textMuted,
    letterSpacing: .5,
    textTransform: "uppercase",
    marginBottom: 4,
    display: "block"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(44,36,24,0.3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      backdropFilter: "blur(4px)"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: C.bg,
      borderRadius: 20,
      width: 580,
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 20px 60px rgba(44,36,24,0.15)",
      display: "flex",
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 28
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 20px",
      fontSize: 18,
      fontWeight: 700,
      color: C.text,
      fontFamily: F.display
    }
  }, isEditing ? "Edit Appointment" : "New Appointment"), /*#__PURE__*/React.createElement("label", {
    style: lst
  }, "Title"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "e.g. Client Call \u2013 Jane",
    style: {
      ...ist,
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lst
  }, "Day"), /*#__PURE__*/React.createElement("select", {
    value: day,
    onChange: e => setDay(+e.target.value),
    style: ist
  }, DAYS.map((d, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, d, daysOff.includes(i) ? " (day off)" : "")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lst
  }, "Time"), /*#__PURE__*/React.createElement("select", {
    value: hour,
    onChange: e => setHour(+e.target.value),
    style: ist
  }, TIME_SLOTS.map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, fh(t)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lst
  }, "Duration"), /*#__PURE__*/React.createElement("select", {
    value: duration,
    onChange: e => setDuration(+e.target.value),
    style: ist
  }, [15, 30, 45, 60, 90, 120].map(d => /*#__PURE__*/React.createElement("option", {
    key: d,
    value: d
  }, d, "m")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lst
  }, "Source"), /*#__PURE__*/React.createElement("select", {
    value: source,
    onChange: e => setSource(e.target.value),
    style: ist
  }, Object.entries(SOURCES).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, v.label))))), /*#__PURE__*/React.createElement("label", {
    style: lst
  }, "Tag"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      flexWrap: "wrap",
      marginBottom: 18
    }
  }, tags.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTag(t.id),
    style: {
      padding: "5px 12px",
      borderRadius: 6,
      border: `1.5px solid ${tag === t.id ? gc(t.color) : C.border}`,
      background: tag === t.id ? gs(t.color) : "transparent",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: F.body,
      color: tag === t.id ? gc(t.color) : C.textMuted
    }
  }, t.label)), !creatingTag && /*#__PURE__*/React.createElement("button", {
    onClick: () => setCreatingTag(true),
    style: {
      padding: "5px 12px",
      borderRadius: 6,
      border: `1.5px dashed ${C.border}`,
      background: "transparent",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: F.body,
      color: C.textMuted,
      transition: "all 0.15s ease"
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = C.accent;
      e.currentTarget.style.color = C.accent;
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = C.border;
      e.currentTarget.style.color = C.textMuted;
    }
  }, "+ New Tag")), creatingTag && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center",
      marginBottom: 18,
      padding: "10px 12px",
      background: C.surfaceHover,
      borderRadius: 8,
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: newTagLabel,
    onChange: e => setNewTagLabel(e.target.value),
    placeholder: "Tag name",
    style: {
      flex: 1,
      padding: "5px 8px",
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      fontSize: 12,
      fontFamily: F.body,
      color: C.text,
      background: C.surface,
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3
    }
  }, TAG_COLORS.map(tc => /*#__PURE__*/React.createElement("span", {
    key: tc.id,
    onClick: () => setNewTagColor(tc.id),
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: gc(tc.id),
      cursor: "pointer",
      border: newTagColor === tc.id ? "2.5px solid #fff" : "2px solid transparent",
      outline: newTagColor === tc.id ? `2px solid ${gc(tc.id)}` : "none",
      boxSizing: "border-box",
      transition: "all 0.1s ease"
    }
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!newTagLabel.trim()) return;
      const id = newTagLabel.trim().toLowerCase().replace(/\s+/g, '-');
      const newTag = {
        id,
        label: newTagLabel.trim(),
        color: newTagColor
      };
      onAddTag(newTag);
      setTag(id);
      setNewTagLabel("");
      setNewTagColor("blue");
      setCreatingTag(false);
    },
    disabled: !newTagLabel.trim(),
    style: {
      padding: "5px 10px",
      background: newTagLabel.trim() ? C.accent : C.border,
      color: "#fff",
      border: "none",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: F.body,
      cursor: newTagLabel.trim() ? "pointer" : "not-allowed"
    }
  }, "Add"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setCreatingTag(false);
      setNewTagLabel("");
      setNewTagColor("blue");
    },
    style: {
      padding: "5px 8px",
      background: "transparent",
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      fontSize: 11,
      fontFamily: F.body,
      color: C.textMuted,
      cursor: "pointer"
    }
  }, "\u2715")), blocked && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: C.redSoft,
      borderRadius: 8,
      fontSize: 12,
      color: C.red,
      fontWeight: 600,
      marginBottom: 14
    }
  }, "\u26A0 ", DAYS[day], " is a day off \u2014 client & meeting events are blocked."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: blocked || !title.trim(),
    style: {
      flex: 1,
      padding: "10px 0",
      background: blocked ? C.border : C.accent,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 700,
      fontFamily: F.body,
      cursor: blocked ? "not-allowed" : "pointer"
    }
  }, isEditing ? "Save Changes" : "Add Appointment"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      padding: "10px 18px",
      background: "transparent",
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      fontSize: 13,
      fontFamily: F.body,
      color: C.textMuted,
      cursor: "pointer"
    }
  }, "Cancel"))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200,
      borderLeft: `1px solid ${C.border}`,
      padding: 20,
      background: C.surfaceHover
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      fontWeight: 600,
      color: C.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, DAYS[day], " at ", fh(hour)), isOff && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 8px",
      background: C.orangeSoft,
      borderRadius: 6,
      fontSize: 11,
      color: C.orange,
      fontWeight: 600,
      marginBottom: 10
    }
  }, "\uD83C\uDFD6 Day off \u2014 personal only"), conflicts.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontFamily: F.mono,
      fontWeight: 700,
      color: C.red,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: .5
    }
  }, "\u26A0 ", conflicts.length, " Conflict", conflicts.length > 1 ? "s" : ""), conflicts.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      padding: "8px 10px",
      background: C.surface,
      borderRadius: 8,
      borderLeft: `3px solid ${gc(e.color)}`,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.text
    }
  }, e.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      alignItems: "center",
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontFamily: F.mono,
      color: C.textMuted
    }
  }, fh(e.hour), " \xB7 ", e.duration, "m"), /*#__PURE__*/React.createElement(Badge, {
    source: e.source
  }))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.green,
      fontWeight: 600
    }
  }, "\u2713 No conflicts"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      fontSize: 10,
      fontFamily: F.mono,
      fontWeight: 600,
      color: C.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "All ", DAYS[day], " Events"), events.filter(e => e.day === day && (!isEditing || e.id !== editEvent.id)).sort((a, b) => a.hour - b.hour).map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 0",
      fontSize: 11,
      color: C.textMuted
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: gc(e.color)
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: F.mono,
      fontSize: 10
    }
  }, fh(e.hour)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.text,
      fontWeight: 500
    }
  }, e.title))))));
};

/* ─── MAIN ─── */
const VIEWS = [{
  id: "month",
  label: "Month"
}, {
  id: "week",
  label: "Week"
}, {
  id: "agenda",
  label: "Agenda"
}, {
  id: "year",
  label: "Year"
}];
function UnifiedCalendar() {
  const [view, setView] = useState("year");
  const [events, setEvents] = useState(initEvents);
  const [daysOff, setDaysOff] = useState([5]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selTemplate, setSelTemplate] = useState(null);
  const [hovSlot, setHovSlot] = useState(null);
  const [templates, setTemplates] = useState(defaultTemplates);
  const [spanEvents, setSpanEvents] = useState(yearSpanEvents);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const handleAddTag = t => setTags(p => [...p, t]);
  const toggleDayOff = d => setDaysOff(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const handleAdd = a => {
    if (a.type === "dayoff") toggleDayOff(a.day);else if (a.type === "event") setEvents(p => [...p, a.event]);
  };
  const handleDeleteEvent = id => setEvents(p => p.filter(e => e.id !== id));
  const handleUpdateEvent = (id, updates) => setEvents(p => p.map(e => e.id === id ? {
    ...e,
    ...updates
  } : e));
  const handleEditEvent = ev => {
    setEditingEvent(ev);
    setShowModal(true);
  };
  const handleAddTemplate = t => setTemplates(p => [...p, t]);
  const handleDeleteTemplate = id => setTemplates(p => p.filter(t => t.id !== id));
  const handleAddSpan = s => setSpanEvents(p => [...p, s]);
  const handleDeleteSpan = id => setSpanEvents(p => p.filter(s => s.id !== id));
  const handlePlaceTemplate = (day, hour) => {
    const t = templates.find(x => x.id === selTemplate);
    if (!t) return;
    if (daysOff.includes(day) && (t.tag === "client" || t.tag === "meeting")) return;
    setEvents(p => [...p, {
      id: Date.now(),
      title: t.name,
      hour,
      duration: t.duration,
      day,
      tag: t.tag,
      color: t.color,
      source: "manual"
    }]);
    setSelTemplate(null);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.bg,
      fontFamily: F.body,
      padding: "28px 20px"
    }
  }, /*#__PURE__*/React.createElement("link", {
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
    rel: "stylesheet"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 980,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      flexWrap: "wrap",
      gap: 14,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: F.mono,
      color: C.accent,
      fontWeight: 600,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, "Dashboard \xB7 Calendar"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 26,
      fontWeight: 700,
      color: C.text,
      fontFamily: F.display,
      letterSpacing: -.5
    }
  }, "Unified Calendar")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEditingEvent(null);
      setShowModal(true);
    },
    style: {
      padding: "8px 16px",
      background: C.accent,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      fontFamily: F.body,
      cursor: "pointer"
    }
  }, "+ New Event"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      background: C.surfaceHover,
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      padding: 3
    }
  }, VIEWS.map(v => /*#__PURE__*/React.createElement("button", {
    key: v.id,
    onClick: () => setView(v.id),
    style: {
      padding: "7px 16px",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: F.body,
      background: view === v.id ? C.accent : "transparent",
      color: view === v.id ? "#fff" : C.textMuted,
      transition: "all 0.15s ease"
    }
  }, v.label))))), /*#__PURE__*/React.createElement(QuickAdd, {
    onAdd: handleAdd,
    daysOff: daysOff,
    tags: tags
  }), /*#__PURE__*/React.createElement(TagPulse, {
    events: events,
    tags: tags
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 2px 16px rgba(44,36,24,0.06)"
    }
  }, view === "month" && /*#__PURE__*/React.createElement(MonthView, {
    events: events,
    daysOff: daysOff,
    onToggleDayOff: toggleDayOff,
    spanEvents: spanEvents,
    tags: tags
  }), view === "week" && /*#__PURE__*/React.createElement(WeekView, {
    events: events,
    daysOff: daysOff,
    templates: templates,
    spanEvents: spanEvents,
    tags: tags,
    onPlaceTemplate: handlePlaceTemplate,
    onAddTemplate: handleAddTemplate,
    onDeleteTemplate: handleDeleteTemplate,
    onDeleteEvent: handleDeleteEvent,
    onEditEvent: handleEditEvent,
    selectedTemplate: selTemplate,
    setSelectedTemplate: setSelTemplate,
    hoveredSlot: hovSlot,
    setHoveredSlot: setHovSlot
  }), view === "agenda" && /*#__PURE__*/React.createElement(AgendaView, {
    events: events,
    daysOff: daysOff,
    spanEvents: spanEvents,
    tags: tags,
    onDeleteEvent: handleDeleteEvent,
    onEditEvent: handleEditEvent
  }), view === "year" && /*#__PURE__*/React.createElement(YearView, {
    daysOff: daysOff,
    events: events,
    spanEvents: spanEvents,
    tags: tags,
    onAddSpan: handleAddSpan,
    onDeleteSpan: handleDeleteSpan
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      gap: 16,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, tags.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: gc(l.color)
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      fontFamily: F.body
    }
  }, l.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 2,
      background: C.dayOff,
      border: `1px dashed ${C.dayOffBorder}`
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      fontFamily: F.body
    }
  }, "Day Off")))), showModal && /*#__PURE__*/React.createElement(AddModal, {
    onClose: closeModal,
    onAdd: handleAdd,
    onUpdate: handleUpdateEvent,
    events: events,
    daysOff: daysOff,
    editEvent: editingEvent,
    tags: tags,
    onAddTag: handleAddTag
  }), /*#__PURE__*/React.createElement("style", null, `
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        #calendar-root select{appearance:auto}
        #calendar-root input::placeholder{color:${C.textMuted}}
        #calendar-root *{box-sizing:border-box}
      `));
}
(function () {
  const el = document.getElementById('calendar-root');
  if (el) {
    ReactDOM.createRoot(el).render(React.createElement(UnifiedCalendar));
  }
})();
