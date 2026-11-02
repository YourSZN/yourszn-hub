# YOUR SZN Hub — Data Schema Documentation

> **Last Updated:** March 31, 2026  
> **Purpose:** Document all data structures used in the YOUR SZN Hub app for easier debugging and future development.

---

## Table of Contents
1. [Users & Authentication](#users--authentication)
2. [Tasks](#tasks)
3. [Hidden Tasks](#hidden-tasks)
4. [Clients (Calendar)](#clients-calendar)
5. [Tours](#tours)
6. [Goals](#goals)
7. [Finances](#finances)
8. [SOPs (Standard Operating Procedures)](#sops)
9. [Brands](#brands)
10. [Videos & Ads](#videos--ads)
11. [Messaging](#messaging)
12. [Data Persistence](#data-persistence)

---

## Users & Authentication

### USERS Object
Static user definitions for the app.

```javascript
var USERS = {
  latisha: { 
    name: 'Latisha', 
    role: 'Owner', 
    pin: '0162', 
    pages: ['dashboard','clients','vouchers','tours','social','adcreative','tasks','staff','finances','vietnam','goals','sops','huestripe','marketing','online','comms'] 
  },
  salma: { 
    name: 'Salma', 
    role: 'Staff', 
    pin: '1234', 
    pages: ['dashboard','tasks','staff','goals','sops','comms'] 
  },
  lemari: { 
    name: 'Lemari', 
    role: 'Staff', 
    pin: '5678', 
    pages: ['dashboard','tasks','staff','goals','sops','comms'] 
  }
};
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `role` | string | 'Owner' or 'Staff' |
| `pin` | string | 4-digit PIN for login |
| `pages` | array | List of pages user can access |

### Global Auth Variables
```javascript
var curUser = null;   // Currently logged in user ID (e.g., 'latisha')
var selUid = null;    // Selected user (for viewing other users' data)
```

---

## Tasks

### Task Object
```javascript
{
  id: 1,                          // Unique identifier (number or UUID string)
  title: 'Task title',            // Task name
  assignedTo: 'salma',            // User ID of assignee
  category: 'Admin',              // Category: Admin, Marketing, Content, Customer Support, Links
  freq: 'daily',                  // Frequency: 'daily', 'weekly', 'one-off'
  due: 'Friday',                  // Due day (for weekly) or date
  priority: 'red',                // Priority: 'red', 'orange', 'green'
  hrsAllowed: 2,                  // Hours budgeted for task
  hrsTaken: 0,                    // Hours actually spent
  status: 'not-started',          // Status: 'not-started', 'in-progress', 'blocked', 'complete', 'done'
  desc: 'Task description',       // Detailed description
  videoUrl: '',                   // Optional video URL
  fileUrl: '',                    // Optional file URL
  notes: '',                      // Owner notes
  staffNotes: '',                 // Staff notes
  days: {                         // Daily task tracking (keyed by week label)
    '30 Mar to 5 Apr': {
      'Mon': true,
      'Tue': false,
      // ...
    }
  }
}
```

### Task Categories
- Admin
- Marketing
- Content
- Customer Support
- Links

### Task Frequencies
- `daily` — Appears every day, has day bubbles (Mon-Sun)
- `weekly` — Appears every week, has a due day
- `one-off` — Appears once, may have a specific due date

### Task Status Values
| Value | Display | Color |
|-------|---------|-------|
| `not-started` | Not Started | Grey #f0f0f0 |
| `in-progress` | In Progress | Orange #fff3e0 |
| `blocked` | Blocked | Red #fdecea |
| `complete` | Complete | Green #e8f5e9 |
| `done` | Done | (same as complete) |

### Related Variables
```javascript
var taskIdSeq = 10;           // Next task ID for new tasks
var taskWeekOff = 0;          // Week offset for owner view (0 = this week)
var staffTaskWeekOff = 0;     // Week offset for staff view
var taskFilt = 'all';         // Current filter
```

---

## Hidden Tasks

### hiddenTasks Object
Tracks tasks that have been "hidden" (marked complete and dismissed).

```javascript
var hiddenTasks = {
  'task_id': {
    by: 'salma',                    // User who hid the task
    completedDate: '31 Mar 2026',   // Date hidden (AU format)
    staffNotes: 'Done early',       // Optional notes
    weekLabel: '30 Mar to 5 Apr'    // Week when hidden (for week-scoped hiding)
  }
};
```

| Field | Type | Description |
|-------|------|-------------|
| `by` | string | User ID who hid the task |
| `completedDate` | string | Date in 'DD Mon YYYY' format |
| `staffNotes` | string | Notes added when hiding |
| `weekLabel` | string | Week label for week-scoped hiding (e.g., '30 Mar to 5 Apr') |

**Note:** Tasks are only hidden on the week they were hidden. They reappear on other weeks.

---

## Clients (Calendar)

### cRows Array
30 client appointment slots displayed in a calendar grid.

```javascript
var cRows = [
  {
    name: 'Jane Smith',           // Client name
    day: 'Monday',                // Day of week
    date: '31/03/2026',           // Date
    type: 'Premium In-Person',    // Appointment type
    con: 'true',                  // Confirmed? 'true' or ''
    atts: ['Paid', 'First-Timer'],// Attribute tags
    inv: 'INV-001',               // Invoice number
    notes: 'Special requests'     // Notes
  },
  // ... 30 slots total
];
```

### Appointment Types
- Standard In-Person
- Premium In-Person
- Call

### Client Attributes
- Paid
- First-Timer
- (custom tags possible)

---

## Tours

### Tour Object
```javascript
{
  id: 't1',                       // Unique identifier
  city: 'Cairns',                 // City name
  state: 'QLD',                   // State abbreviation
  status: 'upcoming',             // Status: 'upcoming', 'completed'
  travelDateStart: '2026-03-05',  // Travel start (ISO date)
  travelDateEnd: '2026-03-10',    // Travel end (ISO date)
  clientDateStart: '2026-03-06',  // Client booking start
  clientDateEnd: '2026-03-09',    // Client booking end
  
  flights: [                      // Array of flights
    {
      id: 'f1',
      airline: 'Qantas',
      flightNo: 'QF123',
      dep: 'BNE 06:00',           // Departure
      arr: 'CNS 09:15',           // Arrival
      cost: 320
    }
  ],
  
  accommodation: {                // Hotel details
    name: 'Crystalbrook Riley',
    address: '131-141 The Esplanade, Cairns',
    checkin: '2026-03-05',
    checkout: '2026-03-10',
    cost: 890
  },
  
  bookings: {                     // Client bookings
    standard: 8,                  // Number of standard bookings
    premium: 3,                   // Number of premium bookings
    standardRate: 349,            // Standard rate $
    premiumRate: 445              // Premium rate $
  },
  
  activeTab: 'flights',           // UI state
  isOpen: false,                  // Accordion state
  
  tasks: [                        // Tour-specific tasks
    {
      id: 'tt1',
      text: 'Book flights',
      status: 'done',             // 'todo' or 'done'
      notes: ''
    }
  ]
}
```

---

## Goals

### Goal Object
```javascript
{
  id: 1,                          // Unique identifier
  title: '$364K Yearly Revenue',  // Goal title
  cat: 'Revenue',                 // Category
  desc: 'Description text',       // Detailed description
  target: 364000,                 // Target value
  current: 0,                     // Current progress
  unit: '$ AUD',                  // Unit of measurement
  deadline: '2025-12-31',         // Optional deadline (ISO date)
  status: 'active'                // Status: 'active', 'completed', 'paused'
}
```

### Goal Categories
- Revenue
- Social Media / Growth
- (custom categories possible)

**Note:** Staff users (Salma, Lemari) cannot see Revenue goals.

---

## Finances

### Income Item (bizIncome)
```javascript
{
  id: 1,
  name: 'In-Person (Standard)',   // Income source name
  cat: 'Income',                  // Always 'Income'
  amount: 0,                      // Current amount
  freq: 'weekly',                 // Frequency: 'weekly', 'monthly'
  notes: '',
  clients: 0,                     // Number of clients
  rate: 349,                      // Rate per client
  
  // For subscribers:
  totalSubs: 0,
  newThisWeek: 0,
  subPrice: 0,
  
  // For e-guides:
  soldThisWeek: 0,
  guidePrice: 0
}
```

### Expense Item (bizExpenses)
```javascript
{
  id: 10,
  name: 'Salma ($5.5/hr)',        // Expense name
  cat: 'Staff',                   // Category
  amount: 137.50,                 // Amount
  freq: 'weekly',                 // Frequency: 'weekly', 'monthly'
  notes: '25hrs'                  // Notes
}
```

### Expense Categories
- Staff
- Subscriptions
- Rent / Living
- Electronics
- Marketing
- Services

### Personal Expenses (personalExpenses)
Same structure as bizExpenses but for personal spending.

---

## SOPs

### SOP Object
```javascript
{
  id: 1,
  title: 'Squarespace',           // Service/tool name
  category: 'Admin',              // Category
  url: 'https://squarespace.com', // Login URL
  user: 'hello@yourszn.com.au',   // Username/email
  pw: '',                         // Password (stored securely)
  notes: 'Main website CMS'       // Notes/description
}
```

### SOP Categories
- Admin
- Social Media
- Finance
- Marketing

---

## Brands

### Brand Object
```javascript
{
  id: 1,
  name: 'Witchery',               // Brand name
  url: 'https://witchery.com.au', // Website URL
  cats: ['Clothing'],             // Categories array
  tags: ['Casual', 'Formal'],     // Tags array
  season: 'True Autumn',          // Colour season (optional)
  notes: 'Notes about brand',     // Notes
  date: '2025-01-01'              // Date added
}
```

### Brand Categories
- Clothing
- Makeup
- Accessories
- (others)

### Brand Tags
- Casual
- Formal
- Animal Cruelty Free
- Clean Beauty
- All
- (others)

---

## Videos & Ads

### Video Object (vidData)
```javascript
{
  id: 'v1',
  title: 'Video title',
  platform: 'tiktok',             // 'tiktok', 'instagram', 'youtube'
  datePosted: '2026-03-01',
  views: 1500,
  likes: 100,
  shares: 25,
  comments: 10,
  saves: 50,
  url: 'https://...',
  thumb: 'base64...',             // Thumbnail (stripped before save)
  notes: ''
}
```

### Ad Object (adData)
```javascript
{
  id: 'a1',
  name: 'Campaign name',
  platform: 'meta',               // 'meta', 'google'
  spend: 500,
  impressions: 10000,
  clicks: 250,
  leads: 15,
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  notes: ''
}
```

---

## Messaging

### Group Messages (groupMsgs)
```javascript
var groupMsgs = [
  {
    from: 'latisha',              // Sender user ID
    text: 'Message content',      // Message text
    time: '09:15 am'              // Timestamp
  }
];
```

### Direct Messages (dmMsgs)
```javascript
var dmMsgs = {
  'latisha_salma': [              // Key: sorted user IDs joined with '_'
    {
      from: 'latisha',
      text: 'Hi Salma!',
      time: '10:30 am'
    }
  ]
};
```

---

## Data Persistence

### Save Location
Data is saved to two places:
1. **Supabase Cloud** (primary) — `app_state` table
2. **localStorage** (backup) — key `yszn_v1`

### Saved Data Structure
```javascript
{
  cRows: [...],                   // Clients
  tours: [...],                   // Tours
  tasks: [...],                   // Tasks
  taskNotifs: [...],              // Task notifications
  vidData: [...],                 // Videos
  adData: [...],                  // Ads
  goals: [...],                   // Goals
  bizIncome: [...],               // Business income
  bizExpenses: [...],             // Business expenses
  personalExpenses: [...],        // Personal expenses
  sopList: [...],                 // SOPs
  brands: [...],                  // Brands
  watchlist: [...],               // Watchlist
  socialSlots: {...},             // Social media slots
  metaSlots: {...},               // Meta slots
  metaSchedData: {...},           // Meta schedule data
  celebData: [...],               // Celebrity data
  groupMsgs: [...],               // Group messages
  dmMsgs: {...},                  // Direct messages
  auditD: {...},                  // Audit data
  commsUnread: {...},             // Unread message counts
  vtData: {...},                  // Vietnam tour data
  ideaList: [...],                // Ideas
  metaWeekOff: 0,                 // Meta week offset
  hiddenTasks: {...}              // Hidden tasks
}
```

### Save/Load Functions
```javascript
saveData()        // Saves to cloud + localStorage
loadData()        // Loads from cloud (falls back to localStorage)
cloudSave(data)   // Direct cloud save
cloudLoad()       // Direct cloud load
```

### Supabase Configuration
```javascript
var SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIs...';  // Anon key
```

---

## Known Issues & Workarounds

### 1. hiddenTasks Not Loading
**Issue:** Original app saves `hiddenTasks` but doesn't load it.  
**Fix:** `comms-fix-v39.js` patches `_applyLoadedData` to also load `hiddenTasks`.

### 2. Week-Scoped Hiding
**Issue:** Tasks hidden on one week stayed hidden on all weeks.  
**Fix:** `comms-fix-v39.js` adds `weekLabel` to hidden tasks and patches `buildTaskTablesHTML` to filter by current week.

---

## Patch Files

| File | Purpose |
|------|---------|
| `comms-fix-v39.js` | Main patches: DM filtering, group chat sync, hidden task fixes, week-scoped hiding |
| `comms-fix-hidden.js` | DOM-level hiding of task rows |
| `comms-fix-daily.js` | Daily task day bubbles (Mon-Sun) |

---

*This documentation was created as part of Phase 1 codebase improvements.*
