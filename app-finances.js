// FINANCES
// ════════════════════════════════════════════════════════════════
var finPeriod = 'weekly';   // weekly | monthly | yearly
var finTab = 'business';
var finEntryIdSeq = 100;
var editingFinId = null;
var editingFinType = null;

// ── Multipliers to convert any freq to the display period ──
function toDisplayPeriod(amount, freq) {
  // Convert an amount FROM its stored freq TO the current display period
  // e.g. $100/month stored, viewing weekly → $100 * 12/52 = $23.08/wk
  var wk = { weekly:1,     monthly:12/52,  yearly:1/52,   'one-off':0 };
  var mo = { weekly:52/12, monthly:1,      yearly:1/12,   'one-off':0 };
  var yr = { weekly:52,    monthly:12,     yearly:1,      'one-off':1 };
  var m = finPeriod==='weekly' ? wk : finPeriod==='monthly' ? mo : yr;
  return amount * (m[freq] || 0);
}

// Always converts to a WEEKLY amount regardless of the finPeriod toggle — used by Tax/BAS.
function toWeeklyAmount(amount, freq) {
  var wk = { weekly:1, monthly:12/52, yearly:1/52, 'one-off':0 };
  return amount * (wk[freq] || 0);
}

var bizIncome = [
  { id:1, name:'In-Person (Standard)', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:349 },
  { id:5, name:'In-Person (Premium)', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:445 },
  { id:2, name:'Online Clients', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:349 },
  { id:3, name:'Subscribers', cat:'Income', amount:0, freq:'monthly', notes:'', clients:0, rate:0, totalSubs:0, newThisWeek:0, subPrice:0 },
  { id:4, name:'E-Guides', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:0, soldThisWeek:0, guidePrice:0 }
];

var bizExpenses = [
  { id:10, name:'Salma ($5.5/hr)', cat:'Staff', amount:137.50, freq:'weekly', notes:'25hrs', gstIncluded:false },
  { id:11, name:'Lemari ($16/hr)', cat:'Staff', amount:240, freq:'weekly', notes:'15hrs', gstIncluded:false },
  { id:20, name:'Xero', cat:'Subscriptions', amount:22.50, freq:'weekly', notes:'Monthly', gstIncluded:true },
  { id:21, name:'Hue & Stripe', cat:'Subscriptions', amount:29, freq:'weekly', notes:'3 months · $377', gstIncluded:true },
  { id:22, name:'Image Innovators', cat:'Subscriptions', amount:12.50, freq:'weekly', notes:'Monthly', gstIncluded:true },
  { id:23, name:'Ivorey Top Up', cat:'Subscriptions', amount:7.50, freq:'weekly', notes:'Top up $15', gstIncluded:true },
  { id:26, name:'Ivorey', cat:'Subscriptions', amount:0, freq:'weekly', notes:'', gstIncluded:true },
  { id:27, name:'ChatGPT', cat:'Subscriptions', amount:8.45, freq:'weekly', notes:'Monthly', gstIncluded:true },
  { id:24, name:'Squarespace', cat:'Subscriptions', amount:7, freq:'weekly', notes:'', gstIncluded:true },
  { id:25, name:'Google Workspace', cat:'Subscriptions', amount:6.49, freq:'weekly', notes:'', gstIncluded:true },
  { id:50, name:'Rent', cat:'Rent / Living', amount:750, freq:'weekly', notes:'Weekly', gstIncluded:false },
  { id:51, name:'Electricity', cat:'Rent / Living', amount:0, freq:'weekly', notes:'', gstIncluded:true },
  { id:60, name:'Phone (Aldi)', cat:'Electronics', amount:9.75, freq:'weekly', notes:'Monthly', gstIncluded:true },
  { id:61, name:'Internet (Dodo)', cat:'Electronics', amount:23.25, freq:'weekly', notes:'Monthly', gstIncluded:true },
  { id:30, name:'Google Ads', cat:'Marketing', amount:287, freq:'weekly', notes:'Daily $41', gstIncluded:true },
  { id:31, name:'Meta Ads', cat:'Marketing', amount:385, freq:'weekly', notes:'Daily $55', gstIncluded:true },
  { id:70, name:'Accounting', cat:'Services', amount:63.835, freq:'weekly', notes:'', gstIncluded:true },
  { id:71, name:'Insurance', cat:'Services', amount:25.32, freq:'weekly', notes:'', gstIncluded:false }
];

var personalExpenses = [
  { id:200, name:'Groceries', cat:'Groceries & Food', amount:120, freq:'weekly', notes:'' },
  { id:201, name:'Dining Out', cat:'Groceries & Food', amount:60, freq:'weekly', notes:'' },
  { id:202, name:'Netflix', cat:'Subscriptions', amount:22.99, freq:'monthly', notes:'' },
  { id:203, name:'Spotify', cat:'Subscriptions', amount:11.99, freq:'monthly', notes:'' },
  { id:204, name:'Gym', cat:'Health & Wellness', amount:60, freq:'monthly', notes:'' },
  { id:205, name:'Entertainment', cat:'Entertainment', amount:50, freq:'weekly', notes:'' }
];

function periodLabel() { return finPeriod==='weekly'?'/ wk':finPeriod==='monthly'?'/ mo':'/ yr'; }
function fmtAmt(n) { return '$' + n.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtAmtRound(n) { return '$' + Math.round(n).toLocaleString('en-AU'); }

function setFinPeriod(p, btn) {
  finPeriod = p;
  document.querySelectorAll('.fin-period').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderFinances();
}

function showFinTab(tab, btn) {
  finTab = tab;
  ['business','personal','charts','cashflow','goals','convcalc'].forEach(function(t) {
    var sec = document.getElementById('fin-' + t);
    if (sec) sec.style.display = (t === tab) ? 'block' : 'none';
  });
  document.querySelectorAll('.fin-tab').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderFinances();
}

function renderFinances() {
  renderBizFinances();
  renderPersonalFinances();
  if (finTab === 'charts')   { if (typeof renderFinCharts   === 'function') renderFinCharts(); }
  if (finTab === 'cashflow') { if (typeof renderCashflow    === 'function') renderCashflow(); }
  if (finTab === 'goals')    { if (typeof renderMoneyGoals  === 'function') renderMoneyGoals(); }
  if (finTab === 'convcalc') { renderConversionCalc(); }
}

// ── Conversion Calculator ──────────────────────────────────────
// Deliberately stateless — a quick planning tool, nothing saved or
// tracked over time. Reads every input straight off the DOM and
// recomputes on every change; there's no backing data model to keep
// in sync, so there's nothing for saveData()/loadData() to touch here.
//
// Reverse-funnel model: start from a monthly revenue target and price,
// work out how many sales that needs, then — given a conversion rate —
// how much sales-page traffic that takes, and the gap against traffic
// you're actually getting today. Conversion rate and projection period
// are sliders so the numbers respond live as you explore "what if."
var CC_DEFAULTS = { price: 349, revenue: 10000, traffic: 0, conversion: 2, months: 1 };

function ccVal(id) {
  var el = document.getElementById(id);
  return el ? parseFloat(el.value) || 0 : 0;
}

function ccReset() {
  document.getElementById('cc-price').value      = CC_DEFAULTS.price;
  document.getElementById('cc-revenue').value    = CC_DEFAULTS.revenue;
  document.getElementById('cc-traffic').value    = CC_DEFAULTS.traffic;
  document.getElementById('cc-conversion').value = CC_DEFAULTS.conversion;
  document.getElementById('cc-months').value     = CC_DEFAULTS.months;
  ccRecalc();
}

function ccRecalc() {
  var priceEl = document.getElementById('cc-price'); if (!priceEl) return;

  var price      = ccVal('cc-price');
  var revenue    = ccVal('cc-revenue');
  var traffic    = ccVal('cc-traffic');
  var convPct    = ccVal('cc-conversion');
  var months     = ccVal('cc-months') || 1;
  var convFrac   = convPct / 100;

  // Ceiling, not round, for every count below — you can't make "half a
  // sale," and a traffic target should round up (safer to slightly over-
  // estimate the visits you need than to fall short). Visits are ceiled
  // from the UNROUNDED sales goal, not the already-ceiled display value —
  // ceiling twice in a row compounds the rounding error.
  var salesGoalRaw   = price > 0 ? revenue / price : 0;
  var salesGoal      = Math.ceil(salesGoalRaw);
  var monthlyVisits  = convFrac > 0 ? Math.ceil(salesGoalRaw / convFrac) : 0;
  var weeklyRevenue  = revenue * 12 / 52;
  var weeklySalesRaw = price > 0 ? weeklyRevenue / price : 0;
  var weeklyVisits   = convFrac > 0 ? Math.ceil(weeklySalesRaw / convFrac) : 0;
  var quarterlyVisits = monthlyVisits * 3;
  var periodVisits    = monthlyVisits * months;
  var totalRevenuePeriod = revenue * months;

  document.getElementById('cc-sales-goal').textContent    = salesGoal.toLocaleString('en-AU');
  document.getElementById('cc-visits-monthly').textContent   = monthlyVisits.toLocaleString('en-AU');
  document.getElementById('cc-visits-weekly').textContent    = weeklyVisits.toLocaleString('en-AU');
  document.getElementById('cc-visits-quarterly').textContent = quarterlyVisits.toLocaleString('en-AU');
  document.getElementById('cc-visits-period').textContent    = periodVisits.toLocaleString('en-AU');
  document.getElementById('cc-hero-revenue').textContent     = fmtAmtRound(revenue);

  var gap = monthlyVisits - traffic;
  var gapValEl = document.getElementById('cc-gap-value');
  var gapExplainEl = document.getElementById('cc-gap-explain');
  var trafficWorth = traffic * convFrac * price;
  if (gap > 0.5) {
    gapValEl.textContent = Math.ceil(gap).toLocaleString('en-AU') + ' more visits';
    gapExplainEl.textContent = 'You need ' + monthlyVisits.toLocaleString('en-AU') + ' a month and you get '
      + Math.round(traffic).toLocaleString('en-AU') + '. Today that traffic is worth about ' + fmtAmtRound(trafficWorth)
      + ' a month at ' + ccFmtPct(convPct) + ' conversion. Close the gap with traffic, or lift conversion so you need less of it.';
  } else {
    gapValEl.textContent = 'You’re covered';
    gapExplainEl.textContent = 'You need ' + monthlyVisits.toLocaleString('en-AU') + ' a month and you get '
      + Math.round(traffic).toLocaleString('en-AU') + ' — that traffic alone can hit this target at ' + ccFmtPct(convPct) + ' conversion.';
  }

  document.getElementById('cc-conversion-display').textContent = ccFmtPct(convPct);
  document.getElementById('cc-conversion-plus').textContent  = ccFmtPct(convPct * 1.1);
  document.getElementById('cc-conversion-minus').textContent = ccFmtPct(convPct * 0.9);

  document.getElementById('cc-months-display').textContent = months;
  document.getElementById('cc-months-total-revenue').textContent = fmtAmtRound(totalRevenuePeriod);

  document.getElementById('cc-summary').innerHTML = 'To hit <b>' + fmtAmtRound(revenue) + ' per month</b> at <b>' + fmtAmtRound(price) + ' per service</b>, '
    + 'you need <b>' + salesGoal.toLocaleString('en-AU') + ' sales</b>, meaning roughly <b>' + monthlyVisits.toLocaleString('en-AU') + ' sales page visits per month</b> '
    + 'at a <b>' + ccFmtPct(convPct) + ' conversion rate</b>.';
}

function ccFmtPct(p) { return (Math.round(p * 10) / 10) + '%'; }

function renderConversionCalc() {
  var el = document.getElementById('fin-convcalc-content'); if (!el) return;
  var fieldWrap = 'display:flex;flex-direction:column;gap:6px';
  var lbl = 'font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted)';
  var inp = 'width:100%;border:1px solid var(--sand);border-radius:8px;padding:10px 12px;font-size:20px;font-family:\'Cormorant Garamond\',serif;box-sizing:border-box;background:white;color:var(--deep)';
  var stepTitle = 'font-family:\'Fraunces\',serif;font-size:22px;color:var(--deep);margin:2px 0 6px';
  var stepEyebrow = 'font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px';
  var stepDesc = 'font-size:13px;color:var(--muted);max-width:640px;margin-bottom:20px;line-height:1.6';
  var cardWrap = 'background:var(--warm);border:1px solid var(--sand);border-radius:12px;padding:20px';
  var sliderCard = cardWrap + ';text-align:center';
  var bigNum = 'font-family:\'Cormorant Garamond\',serif;font-size:44px;color:var(--deep);line-height:1;margin:10px 0';

  el.innerHTML =
    '<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btns" style="font-size:11px" onclick="ccReset()">Reset</button></div>'

    // ── STEP ONE ──
    + '<div style="' + stepEyebrow + '">Step One</div>'
    + '<div style="' + stepTitle + '">Your Target</div>'
    + '<div style="' + stepDesc + '">Set the revenue you want each month and what you charge. The sales goal calculates itself.</div>'
    + '<div style="background:var(--deep);color:white;border-radius:12px;padding:20px 24px;margin-bottom:16px;max-width:720px">'
    +   '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:6px">Target Monthly Revenue</div>'
    +   '<div style="font-family:\'Cormorant Garamond\',serif;font-size:40px" id="cc-hero-revenue">—</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;max-width:720px;margin-bottom:32px">'
    +   '<div style="' + fieldWrap + '"><label style="' + lbl + '">Price Per Service / Product</label><input type="number" min="0" step="1" id="cc-price" oninput="ccRecalc()" value="' + CC_DEFAULTS.price + '" style="' + inp + '"></div>'
    +   '<div style="' + fieldWrap + '"><label style="' + lbl + '">Desired Revenue Per Month</label><input type="number" min="0" step="1" id="cc-revenue" oninput="ccRecalc()" value="' + CC_DEFAULTS.revenue + '" style="' + inp + '"></div>'
    +   '<div style="' + fieldWrap + '"><label style="' + lbl + '">Sales Goal, Number of Sales</label><div style="' + inp + ';border-color:transparent;background:var(--warm)"><b id="cc-sales-goal">—</b></div></div>'
    + '</div>'

    // ── STEP TWO ──
    + '<div style="' + stepEyebrow + '">Step Two</div>'
    + '<div style="' + stepTitle + '">Traffic You Need</div>'
    + '<div style="' + stepDesc + '">These are visits to your sales page or checkout, not social media views. A reel view is not a visit. Only people who land on the page you sell from count here.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;max-width:720px;margin-bottom:16px">'
    +   '<div style="' + cardWrap + '"><div style="' + lbl + '">Sales Page Visits, Monthly</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep);margin-top:6px" id="cc-visits-monthly">—</div></div>'
    +   '<div style="' + cardWrap + '"><div style="' + lbl + '">Sales Page Visits, Weekly</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep);margin-top:6px" id="cc-visits-weekly">—</div></div>'
    +   '<div style="' + cardWrap + '"><div style="' + lbl + '">Sales Page Visits, Quarterly</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep);margin-top:6px" id="cc-visits-quarterly">—</div></div>'
    +   '<div style="' + cardWrap + '"><div style="' + lbl + '">Total Visits, Selected Period</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep);margin-top:6px" id="cc-visits-period">—</div></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:16px;max-width:720px;margin-bottom:32px">'
    +   '<div style="' + cardWrap + '">'
    +     '<label style="' + lbl + '">Sales Page Visits You Get Now, Monthly</label>'
    +     '<input type="number" min="0" step="1" id="cc-traffic" oninput="ccRecalc()" value="' + CC_DEFAULTS.traffic + '" style="' + inp + ';margin-top:8px">'
    +     '<div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.5">From your website or funnel analytics, not your social media reach.</div>'
    +   '</div>'
    +   '<div style="background:var(--deep);color:white;border-radius:12px;padding:20px">'
    +     '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:6px">Your Traffic Gap</div>'
    +     '<div style="font-family:\'Cormorant Garamond\',serif;font-size:26px;margin-bottom:8px" id="cc-gap-value">—</div>'
    +     '<div style="font-size:12px;color:rgba(255,255,255,.8);line-height:1.6" id="cc-gap-explain"></div>'
    +   '</div>'
    + '</div>'

    // ── STEP THREE ──
    + '<div style="' + stepEyebrow + '">Step Three</div>'
    + '<div style="' + stepTitle + '">Move The Levers</div>'
    + '<div style="' + stepDesc + '">Conversion rate is sales efficiency. Projection period shows what the same month compounds to over time.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;max-width:720px;margin-bottom:24px">'
    +   '<div style="' + sliderCard + '">'
    +     '<div style="' + stepTitle.replace('22px','16px') + '">Conversion Rate</div>'
    +     '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Sales divided by sales page visits</div>'
    +     '<div style="font-size:11px;color:var(--muted)">Plus 10 percent to <span id="cc-conversion-plus">—</span></div>'
    +     '<div style="' + bigNum + '" id="cc-conversion-display">—</div>'
    +     '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Conversion</div>'
    +     '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">Minus 10 percent to <span id="cc-conversion-minus">—</span></div>'
    +     '<input type="range" id="cc-conversion" min="0.2" max="25" step="0.1" value="' + CC_DEFAULTS.conversion + '" oninput="ccRecalc()" style="width:100%">'
    +     '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px"><span>0.2%</span><span>25%</span></div>'
    +     '<div style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:14px;text-align:left">Use the rate your own sales page reports if you have it. If you are estimating, warm traffic from an email list or a nurtured audience converts higher than cold social traffic, and the higher your price the lower the rate tends to sit. Conversion is the denominator here, so halving it doubles the traffic you need.</div>'
    +   '</div>'
    +   '<div style="' + sliderCard + '">'
    +     '<div style="' + stepTitle.replace('22px','16px') + '">Projection Period</div>'
    +     '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Move this to view totals</div>'
    +     '<div style="' + bigNum + '" id="cc-months-display">—</div>'
    +     '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Months</div>'
    +     '<div style="font-size:13px;color:var(--charcoal);margin-bottom:14px">Total revenue: <b id="cc-months-total-revenue">—</b></div>'
    +     '<input type="range" id="cc-months" min="1" max="24" step="1" value="' + CC_DEFAULTS.months + '" oninput="ccRecalc()" style="width:100%">'
    +     '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px"><span>1 mo</span><span>24 mo</span></div>'
    +     '<div style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:14px;text-align:left">Sales page visits = revenue ÷ (conversion × price). Total visits = monthly visits × months.</div>'
    +   '</div>'
    + '</div>'

    // ── SUMMARY ──
    + '<div style="border-left:4px solid var(--deep);background:var(--warm);border-radius:0 12px 12px 0;padding:18px 22px;max-width:720px">'
    +   '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Your SZN, Your Number</div>'
    +   '<div style="font-size:14px;color:var(--charcoal);line-height:1.6" id="cc-summary"></div>'
    + '</div>';

  ccRecalc();
}

// Shared helper — calculates total income respecting clients×rate
function calcIncomeTotal() {
  return bizIncome.reduce(function(s, e) {
    var isClientBased = (e.id===1 || e.id===5 || e.id===2);
    if (isClientBased && e.clients > 0 && e.rate > 0) {
      return s + e.clients * e.rate;
    }
    if (e.id===3) {
      // Subscribers: totalSubs × subPrice (monthly → convert to display period)
      return s + toDisplayPeriod((e.totalSubs||0) * (e.subPrice||0), 'monthly');
    }
    if (e.id===4) {
      // E-guides: soldThisWeek × guidePrice (weekly)
      return s + toDisplayPeriod((e.soldThisWeek||0) * (e.guidePrice||0), 'weekly');
    }
    return s + toDisplayPeriod(e.amount, e.freq);
  }, 0);
}

// Always-weekly version of calcIncomeTotal — used by Tax/BAS regardless of the finPeriod toggle.
function calcWeeklyIncomeTotal() {
  return bizIncome.reduce(function(s, e) {
    var isClientBased = (e.id===1 || e.id===5 || e.id===2);
    if (isClientBased && e.clients > 0 && e.rate > 0) return s + e.clients * e.rate;
    if (e.id===3) return s + toWeeklyAmount((e.totalSubs||0) * (e.subPrice||0), 'monthly');
    if (e.id===4) return s + (e.soldThisWeek||0) * (e.guidePrice||0);
    return s + toWeeklyAmount(e.amount, e.freq);
  }, 0);
}

function renderBizFinances() {
  renderCrmRevenue();
  renderFinSection('fin-income-list', bizIncome, 'income', false);
  renderFinSection('fin-expense-list', bizExpenses, 'expense', true);
  renderBizSummary();
  renderNetBar();
}

function renderCrmRevenue() {
  var el = document.getElementById('fin-crm-revenue'); if (!el) return;
  var clients = (typeof crmClients !== 'undefined') ? crmClients : [];
  var allPayments = [];
  clients.forEach(function(c) {
    (c.payments || []).forEach(function(p) {
      if (p.status === 'paid') {
        allPayments.push({ client: (c.firstName||'') + ' ' + (c.lastName||''), amount: parseFloat(p.amount)||0, date: p.date || p.paidAt || '', id: c.id });
      }
    });
  });
  // Sort by date descending
  allPayments.sort(function(a,b){ return (b.date||'') > (a.date||'') ? 1 : -1; });

  var totalPaid = allPayments.reduce(function(s,p){ return s+p.amount; }, 0);

  // This month
  var now = new Date();
  var monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  var thisMonth = allPayments.filter(function(p){ return p.date && p.date.indexOf(monthStr) === 0; });
  var monthTotal = thisMonth.reduce(function(s,p){ return s+p.amount; }, 0);

  // Revenue by client
  var byClient = {};
  allPayments.forEach(function(p) {
    byClient[p.client] = (byClient[p.client]||0) + p.amount;
  });
  var clientList = Object.keys(byClient).sort(function(a,b){ return byClient[b]-byClient[a]; }).slice(0,5);

  if (!allPayments.length) {
    el.innerHTML = '<div style="background:var(--cream);border-radius:14px;padding:20px;border:1px solid var(--sand)">'
      + '<div style="font-family:\'Fraunces\',serif;font-size:18px;color:var(--deep);margin-bottom:4px">Payments Received</div>'
      + '<div style="font-size:12px;color:var(--muted)">No paid payments recorded in CRM yet. Add payments to client profiles to track real revenue here.</div>'
      + '</div>';
    return;
  }

  var recentHtml = allPayments.slice(0,6).map(function(p) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--sand)">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:28px;height:28px;border-radius:50%;background:var(--warm);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--rose)">'
      + esc((p.client.trim().split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2)))
      + '</div>'
      + '<div><div style="font-size:13px;font-weight:600;color:var(--deep)">' + esc(p.client.trim()) + '</div>'
      + (p.date ? '<div style="font-size:11px;color:var(--muted)">' + esc(p.date) + '</div>' : '')
      + '</div>'
      + '</div>'
      + '<div style="font-size:14px;font-weight:700;color:#10B981">+' + fmtAmt(p.amount) + '</div>'
      + '</div>';
  }).join('');

  var topClients = clientList.map(function(name) {
    var pct = totalPaid > 0 ? Math.round(byClient[name]/totalPaid*100) : 0;
    return '<div style="margin-bottom:10px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:3px">'
      + '<span style="font-size:12px;color:var(--deep)">' + esc(name) + '</span>'
      + '<span style="font-size:12px;font-weight:600;color:var(--deep)">' + fmtAmtRound(byClient[name]) + '</span>'
      + '</div>'
      + '<div style="height:4px;background:var(--sand);border-radius:2px">'
      + '<div style="height:4px;background:var(--rose);border-radius:2px;width:'+pct+'%"></div>'
      + '</div>'
      + '</div>';
  }).join('');

  el.innerHTML = '<div style="background:var(--cream);border-radius:14px;padding:20px;border:1px solid var(--sand)">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px">'
    + '<div style="font-family:\'Fraunces\',serif;font-size:20px;color:var(--deep)">Payments Received</div>'
    + '<div style="display:flex;gap:24px">'
    + '<div style="text-align:right"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:2px">This month</div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:22px;color:var(--deep)">' + fmtAmtRound(monthTotal) + '</div></div>'
    + '<div style="text-align:right"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:2px">All time</div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:22px;color:#10B981">' + fmtAmtRound(totalPaid) + '</div></div>'
    + '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">'
    + '<div>'
    + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:10px">Recent</div>'
    + recentHtml
    + '</div>'
    + '<div>'
    + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:10px">By Client</div>'
    + topClients
    + '</div>'
    + '</div>'
    + '</div>';
}

function renderFinSection(elId, data, type, groupByCat) {
  var el = document.getElementById(elId); if (!el) return;
  var pl = periodLabel();

  if (!groupByCat) {
    // Income — 2-column card grid, one card per income stream
    var incCards = '';
    data.forEach(function(e) {
      var isClientBased = e.id===1 || e.id===5 || e.id===2; // In-Person Standard, Premium, Online
      // For client-based: auto-calc if clients+rate set, else use manual amount
      var weeklyAmt;
      if (isClientBased && e.clients > 0 && e.rate > 0) {
        weeklyAmt = e.clients * e.rate;
      } else {
        weeklyAmt = toDisplayPeriod(e.amount, e.freq);
      }
      var displayAmt = fmtAmtRound(weeklyAmt);

      incCards += '<div class="card">'
        + '<div class="ch" style="display:flex;justify-content:space-between;align-items:center">'
        + '<div class="ct">'+esc(e.name)+'</div>'
        + '<button class="fin-row-edit" onclick="openFinEntryModal(\'income\','+e.id+')">Edit</button>'
        + '</div>'
        + '<div class="cb">';

      if (isClientBased) {
        // Show clients × rate layout
        incCards += '<div style="display:flex;gap:20px;margin-bottom:14px">'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Clients</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:28px;color:var(--deep)">'+e.clients+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Rate</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:28px;color:var(--deep)">$'+e.rate+'</div>'
          + '</div>'
          + '</div>'
          + '<div class="er" style="border-top:1px solid var(--warm);padding-top:10px">'
          + '<span style="font-weight:600">'+pl+' Total</span>'
          + '<span></span>'
          + '<span class="eamt" style="font-size:16px">'+displayAmt+pl+'</span>'
          + '</div>';
        if (e.notes) incCards += '<div style="font-size:11px;color:var(--muted);margin-top:6px">'+esc(e.notes)+'</div>';
      } else {
        // Subscribers / E-guides — simpler layout
        incCards += '<div style="text-align:center;padding:16px 0">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">'+(e.id===3?'Subscribers':'Sales')+' '+pl+'</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:36px;color:var(--deep)">'+displayAmt+'</div>'
          + '</div>';
        if (e.notes) incCards += '<div style="font-size:11px;color:var(--muted);margin-top:4px;text-align:center">'+esc(e.notes)+'</div>';
      }
      incCards += '</div></div>';
    });

    // Wrap in 2-col grid rows
    var cardsArr = [];
    data.forEach(function(e, i) { if (i%1===0) cardsArr.push(incCards.split('<div class="card">')[i+1] ? '<div class="card">' + incCards.split('<div class="card">')[i+1] : ''); });

    // Build proper 2-col layout
    var cardList = [];
    data.forEach(function(e) {
      var isClientBased = e.id===1 || e.id===5 || e.id===2;
      var weeklyAmt = (isClientBased && e.clients > 0 && e.rate > 0) ? e.clients * e.rate : toDisplayPeriod(e.amount, e.freq);
      var displayAmt = fmtAmtRound(weeklyAmt);
      var inner = '';
      if (isClientBased) {
        inner = '<div style="display:flex;gap:20px;margin-bottom:14px">'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Clients</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:28px;color:var(--deep)">'+e.clients+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Rate</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:28px;color:var(--deep)">$'+e.rate+'</div>'
          + '</div>'
          + '</div>'
          + '<div class="er" style="border-top:1px solid var(--warm);padding-top:10px">'
          + '<span style="font-weight:600">'+pl+' Total</span><span></span>'
          + '<span class="eamt" style="font-size:16px">'+displayAmt+pl+'</span></div>'
          + (e.notes ? '<div style="font-size:11px;color:var(--muted);margin-top:6px">'+esc(e.notes)+'</div>' : '');
      } else if (e.id===3) {
        // ── Subscribers ──
        var subRevenue = (e.subPrice||0) * (e.totalSubs||0);
        inner = '<div style="display:flex;gap:16px;margin-bottom:14px">'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Total Subscribers</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:32px;color:var(--deep)">'+( e.totalSubs||0)+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:#D1FAE5;border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">New This Week</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:32px;color:#065F46">'+(e.newThisWeek||0)+'</div>'
          + '</div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;margin-bottom:12px">'
          + '<button class="btn btns" style="flex:1;font-size:12px" onclick="adjustSubs(3,1)">+ Sign Up</button>'
          + '<button class="btn" style="flex:1;font-size:12px;background:#FEE2E2;color:#B91C1C;border:none" onclick="adjustSubs(3,-1)">− Remove</button>'
          + '</div>'
          + '<div class="er" style="border-top:1px solid var(--warm);padding-top:10px">'
          + '<span style="font-weight:600">Price / mo</span><span></span>'
          + '<span><input type="number" min="0" step="0.01" value="'+(e.subPrice||0)+'" placeholder="$0" '
          + 'onchange="setSubPrice(3,this.value)" '
          + 'style="width:80px;padding:4px 8px;border:1px solid var(--sand);border-radius:6px;font-size:13px;text-align:right;font-family:\'DM Sans\',sans-serif"></span>'
          + '</div>'
          + '<div class="er" style="padding-top:6px">'
          + '<span style="font-weight:600">Revenue '+pl+'</span><span></span>'
          + '<span class="eamt" style="font-size:16px">'+fmtAmtRound(toDisplayPeriod(subRevenue,'monthly'))+pl+'</span>'
          + '</div>';
      } else if (e.id===4) {
        // ── E-Guides ──
        var guideRevenue = (e.guidePrice||0) * (e.soldThisWeek||0);
        inner = '<div style="display:flex;gap:16px;margin-bottom:14px">'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Sold This Week</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:32px;color:var(--deep)">'+( e.soldThisWeek||0)+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Price Each</div>'
          + '<div style="font-family:\'Fraunces\',serif;font-size:32px;color:var(--deep)">'+(e.guidePrice>0?'$'+(e.guidePrice):'—')+'</div>'
          + '</div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;margin-bottom:12px">'
          + '<button class="btn btns" style="flex:1;font-size:12px" onclick="adjustGuides(1)">+ Add Sale</button>'
          + '<button class="btn" style="flex:1;font-size:12px;background:#FEE2E2;color:#B91C1C;border:none" onclick="adjustGuides(-1)">− Remove</button>'
          + '</div>'
          + '<div class="er" style="border-top:1px solid var(--warm);padding-top:10px">'
          + '<span style="font-weight:600">Guide Price ($)</span><span></span>'
          + '<span><input type="number" min="0" step="0.01" value="'+(e.guidePrice||0)+'" placeholder="$0" '
          + 'onchange="setGuidePrice(this.value)" '
          + 'style="width:80px;padding:4px 8px;border:1px solid var(--sand);border-radius:6px;font-size:13px;text-align:right;font-family:\'DM Sans\',sans-serif"></span>'
          + '</div>'
          + '<div class="er" style="padding-top:6px">'
          + '<span style="font-weight:600">Revenue '+pl+'</span><span></span>'
          + '<span class="eamt" style="font-size:16px">'+fmtAmtRound(guideRevenue)+pl+'</span>'
          + '</div>';
      }
      cardList.push('<div class="card"><div class="ch" style="display:flex;justify-content:space-between;align-items:center"><div class="ct">'+esc(e.name)+'</div><button class="fin-row-edit" onclick="openFinEntryModal(\'income\','+e.id+')">Edit</button></div><div class="cb">'+inner+'</div></div>');
    });

    var gridHtml = '';
    for (var i=0; i<cardList.length; i+=2) {
      gridHtml += '<div class="g2" style="margin-bottom:20px">' + cardList[i] + (cardList[i+1]||'<div></div>') + '</div>';
    }

    // Tax / BAS section — rendered by renderTaxBas() in app-finances-extra.js
    gridHtml += '<div id="fin-income-taxbas" style="margin-top:8px"></div>';

    el.innerHTML = gridHtml;
    if (typeof renderTaxBas === 'function') renderTaxBas();
    return;
  }

  // Expenses — 2-column card grid, one card per category
  var cats = {};
  var catOrder = [];
  data.forEach(function(e) {
    var c = e.cat || 'Other';
    if (!cats[c]) { cats[c] = []; catOrder.push(c); }
    cats[c].push(e);
  });

  // Build cards into pairs for 2-col grid
  var cards = catOrder.map(function(cat) {
    var entries = cats[cat];
    var catTotal = entries.reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0);
    var rows = entries.map(function(e) {
      var amt = toDisplayPeriod(e.amount, e.freq);
      return '<div class="er">'
        + '<span>'+esc(e.name)+'</span>'
        + '<span class="efrq">'+(e.notes?esc(e.notes):cap(e.freq))+'</span>'
        + '<span class="eamt">'+fmtAmtRound(amt)+pl+'</span>'
        + '<button class="fin-row-edit" style="margin-left:8px" onclick="openFinEntryModal(\'expense\','+e.id+')">Edit</button>'
        + '</div>';
    }).join('');
    // Total row
    rows += '<div class="er" style="font-weight:600;border-top:1px solid var(--warm);margin-top:4px;padding-top:12px">'
      + '<span>Total</span><span></span><span class="eamt">'+fmtAmtRound(catTotal)+pl+'</span><span></span></div>';
    return '<div class="card"><div class="ch"><div class="ct">'+esc(cat)+'</div></div>'
      + '<div class="cb">'+rows+'</div></div>';
  });

  // Wrap in 2-col grid
  var html = '';
  for (var i = 0; i < cards.length; i += 2) {
    html += '<div class="g2" style="margin-bottom:20px">'
      + cards[i]
      + (cards[i+1] || '<div></div>')
      + '</div>';
  }
  if (!html) html = '<div style="color:var(--muted);font-size:13px;padding:14px 0">No expenses yet.</div>';

  // GST row — always appended at bottom as a live calculated expense
  var gstVal = calcGst();
  html += '<div class="g2" style="margin-bottom:20px"><div class="card" style="border:1px solid #FDE68A;background:#FFFBEB">'
    + '<div class="ch" style="background:#FEF3C7"><div class="ct" style="color:#92400E">⚠️ GST Payable</div></div>'
    + '<div class="cb">'
    + '<div class="er"><span style="color:var(--muted);font-size:12px">10% of gross income — updated live as income changes</span></div>'
    + '<div class="er" style="font-weight:600;border-top:1px solid #FDE68A;padding-top:10px">'
    + '<span>GST '+periodLabel()+'</span><span></span><span class="eamt" style="color:#B45309;font-size:16px">'+fmtAmtRound(gstVal)+' '+periodLabel()+'</span></div>'
    + '</div></div><div></div></div>';

  el.innerHTML = html;
}

function calcGst() {
  return calcIncomeTotal() * 0.1;
}

function renderBizSummary() {
  var el = document.getElementById('fin-biz-summary'); if (!el) return;
  var totalInc = calcIncomeTotal();
  var gst = calcGst();
  var totalExp = bizExpenses.reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0) + gst;
  var net = totalInc - totalExp;
  var pl = periodLabel();
  el.innerHTML =
    '<div class="sc" style="flex:1"><div class="slb">Income '+pl+'</div><div class="sv" style="color:#10B981">'+fmtAmtRound(totalInc)+'</div></div>'
    +'<div class="sc r" style="flex:1"><div class="slb">GST (10%) '+pl+'</div><div class="sv" style="color:#B45309">'+fmtAmtRound(gst)+'</div></div>'
    +'<div class="sc r" style="flex:1"><div class="slb">Total Expenses '+pl+'</div><div class="sv">'+fmtAmtRound(totalExp)+'</div></div>'
    +'<div class="sc '+(net>=0?'g':'r')+'" style="flex:1"><div class="slb">Net '+pl+'</div><div class="sv">'+fmtAmtRound(net)+'</div></div>';
}

function renderNetBar() {
  var el = document.getElementById('fin-net-bar'); if (!el) return;
  var totalInc = calcIncomeTotal();
  var totalExp = bizExpenses.reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0) + calcGst();
  var net = totalInc - totalExp;
  var pl = periodLabel();
  el.innerHTML = '<div class="fin-net-card '+(net>=0?'positive':'negative')+'">'
    + '<div><div class="fin-net-lbl">Net '+(net>=0?'Surplus':'Shortfall')+' '+pl+'</div>'
    + '<div class="fin-net-val">'+(net<0?'-':'')+fmtAmtRound(Math.abs(net))+'</div></div>'
    + (totalInc>0 ? '<div style="text-align:right"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">To break even '+(pl)+' you need</div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:24px;color:var(--deep)">'+fmtAmtRound(totalExp)+'</div></div>' : '')
    + '</div>';
}

function renderPersonalFinances() {
  var el = document.getElementById('fin-personal-list'); if (!el) return;
  var sum = document.getElementById('fin-personal-summary');
  var pl = periodLabel();

  // Summary
  if (sum) {
    var cats = ['Groceries & Food','Subscriptions','Health & Wellness','Entertainment','Other'];
    var html = '';
    cats.forEach(function(c) {
      var total = personalExpenses.filter(function(e){ return e.cat===c; })
        .reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0);
      if (total > 0) html += '<div class="sc r" style="flex:1;min-width:140px"><div class="slb">'+c+'</div><div class="sv" style="font-size:18px">'+fmtAmtRound(total)+' '+pl+'</div></div>';
    });
    var grandTotal = personalExpenses.reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0);
    html += '<div class="sc go" style="flex:1;min-width:140px"><div class="slb">Total Personal</div><div class="sv">'+fmtAmtRound(grandTotal)+' '+pl+'</div></div>';
    sum.innerHTML = html;
    sum.style.display = 'flex';
    sum.style.flexWrap = 'wrap';
    sum.style.gap = '12px';
  }

  // Grouped list
  var cats2 = {};
  personalExpenses.forEach(function(e) {
    var c = e.cat || 'Other';
    if (!cats2[c]) cats2[c] = [];
    cats2[c].push(e);
  });
  var html2 = '';
  Object.keys(cats2).forEach(function(cat) {
    var entries = cats2[cat];
    var catTotal = entries.reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0);
    html2 += '<div class="fin-cat-block">'
      + '<div class="fin-cat-hd"><span class="fin-cat-name">'+esc(cat)+'</span><span class="fin-cat-total">'+fmtAmtRound(catTotal)+' '+periodLabel()+'</span></div>'
      + '<div class="fin-cat-body">';
    entries.forEach(function(e) {
      var amt = toDisplayPeriod(e.amount, e.freq);
      html2 += '<div class="fin-row">'
        + '<div class="fin-row-name">'+esc(e.name)+(e.notes?'<div style="font-size:10px;color:var(--muted)">'+esc(e.notes)+'</div>':'')+'</div>'
        + '<div class="fin-row-freq">'+cap(e.freq)+'</div>'
        + '<div class="fin-row-amt">'+fmtAmtRound(amt)+' '+periodLabel()+'</div>'
        + '<button class="fin-row-edit" onclick="openFinEntryModal(\'personal\','+e.id+')">Edit</button>'
        + '</div>';
    });
    html2 += '</div></div>';
  });
  el.innerHTML = html2 || '<div style="color:var(--muted);font-size:13px;padding:14px 0">No personal expenses yet.</div>';
}

// ── Finance Entry Modal ──
function openFinEntryModal(type, id) {
  editingFinType = type;
  var data = type==='income' ? bizIncome : type==='expense' ? bizExpenses : personalExpenses;
  var e = id ? data.find(function(x){ return x.id===id; }) : null;
  editingFinId = e ? e.id : null;

  document.getElementById('fem-heading').textContent = (e ? 'Edit' : 'Add') + ' ' + cap(type==='income'?'Income':type==='expense'?'Business Expense':'Personal Expense');
  document.getElementById('fem-id').value = e ? e.id : '';
  document.getElementById('fem-type').value = type;
  document.getElementById('fem-name').value = e ? e.name : '';
  document.getElementById('fem-amount').value = e ? e.amount : '';
  document.getElementById('fem-freq').value = e ? e.freq : 'weekly';
  document.getElementById('fem-notes').value = e ? e.notes||'' : '';

  // Client/rate fields — show only for client-based income (In-Person / Online)
  var isClientBased = type==='income' && e && (e.id===1 || e.id===5 || e.id===2);
  var clientWrap = document.getElementById('fem-client-wrap');
  if (clientWrap) {
    clientWrap.style.display = isClientBased ? 'flex' : 'none';
    if (isClientBased) {
      document.getElementById('fem-clients').value = e.clients || 0;
      document.getElementById('fem-rate').value = e.rate || 349;
    }
  }
  // Amount field label
  var amtLabel = document.getElementById('fem-amt-label');
  if (amtLabel) amtLabel.textContent = isClientBased ? 'Manual Amount (overrides clients × rate)' : 'Amount ($)';

  // GST checkbox — expenses only
  var gstWrap = document.getElementById('fem-gst-wrap');
  if (gstWrap) {
    gstWrap.style.display = type === 'expense' ? 'block' : 'none';
    document.getElementById('fem-gst').checked = e ? (e.gstIncluded !== false) : true;
  }

  // Show correct category selector
  var isBiz = type==='income' || type==='expense';
  document.getElementById('fem-cat-wrap').style.display = (isBiz && type!=='income') ? 'block' : 'none';
  document.getElementById('fem-pcat-wrap').style.display = (isBiz || type==='income') ? 'none' : 'block';
  if (e && type==='expense') document.getElementById('fem-cat').value = e.cat || 'Other';
  if (e && type==='personal') document.getElementById('fem-pcat').value = e.cat || 'Groceries & Food';

  document.getElementById('fem-err').textContent = '';
  document.getElementById('fem-del-btn').style.display = (e && (type==='expense'||type==='personal')) ? 'inline-block' : 'none';
  document.getElementById('fin-entry-modal').style.display = 'flex';
}

function closeFinEntryModal() { document.getElementById('fin-entry-modal').style.display='none'; }

function saveFinEntry() {
  var name = document.getElementById('fem-name').value.trim();
  var amount = document.getElementById('fem-amount').value;
  var err = document.getElementById('fem-err');
  if (!name) { err.textContent = 'Please enter a name.'; return; }
  if (!amount || isNaN(amount)) { err.textContent = 'Please enter a valid amount.'; return; }

  var type = document.getElementById('fem-type').value;
  var data = type==='income' ? bizIncome : type==='expense' ? bizExpenses : personalExpenses;
  var isBiz = type==='income' || type==='expense';
  var cat = isBiz ? document.getElementById('fem-cat').value : document.getElementById('fem-pcat').value;

  var isClientBased = editingFinType==='income' && editingFinId && (editingFinId===1 || editingFinId===5 || editingFinId===2);
  var clientWrap = document.getElementById('fem-client-wrap');
  var clients = (isClientBased && clientWrap) ? parseInt(document.getElementById('fem-clients').value)||0 : 0;
  var rate = (isClientBased && clientWrap) ? parseFloat(document.getElementById('fem-rate').value)||0 : 0;
  var obj = {
    id: editingFinId || (finEntryIdSeq++),
    name: name,
    cat: cat,
    amount: parseFloat(amount)||0,
    freq: document.getElementById('fem-freq').value,
    notes: document.getElementById('fem-notes').value.trim(),
    clients: clients,
    rate: rate
  };
  if (type === 'expense') obj.gstIncluded = document.getElementById('fem-gst').checked;

  if (editingFinId) {
    var idx = data.findIndex(function(x){ return x.id===editingFinId; });
    if (idx > -1) data[idx] = obj;
  } else {
    data.push(obj);
  }
  closeFinEntryModal(); saveData(); renderFinances();
}

function deleteFinEntry() {
  var type = document.getElementById('fem-type').value;
  if (!editingFinId || !confirm('Delete this entry?')) return;
  var data = type==='income' ? bizIncome : type==='expense' ? bizExpenses : personalExpenses;
  var idx = data.findIndex(function(x){ return x.id===editingFinId; });
  if (idx > -1) data.splice(idx, 1);
 closeFinEntryModal(); saveData(); renderFinances();
}


// ── Subscriber controls ──
function adjustSubs(id, delta) {
  var e = bizIncome.find(function(x){ return x.id===id; }); if (!e) return;
  e.totalSubs = Math.max(0, (e.totalSubs||0) + delta);
  // Track new this week (only positive additions increment it)
  if (delta > 0) e.newThisWeek = (e.newThisWeek||0) + 1;
  else e.newThisWeek = Math.max(0, (e.newThisWeek||0) - 1);
  saveData(); renderFinances();
}
function setSubPrice(id, val) {
  var e = bizIncome.find(function(x){ return x.id===id; }); if (!e) return;
  e.subPrice = parseFloat(val)||0;
  saveData(); renderFinances();
}

// ── E-guide controls ──
function adjustGuides(delta) {
  var e = bizIncome.find(function(x){ return x.id===4; }); if (!e) return;
  e.soldThisWeek = Math.max(0, (e.soldThisWeek||0) + delta);
  saveData(); renderFinances();
}
function setGuidePrice(val) {
  var e = bizIncome.find(function(x){ return x.id===4; }); if (!e) return;
  e.guidePrice = parseFloat(val)||0;
  saveData(); renderFinances();
}

