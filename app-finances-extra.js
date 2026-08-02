// ═══════════════════════════════════════════════════
// FINANCES — Charts, Cashflow, Money Goals, Tax/BAS
// ═══════════════════════════════════════════════════

var FIN_CHART_COLORS = ['#3B82F6','#F97316','#22C55E','#EAB308','#EC4899','#8B5CF6','#14B8A6','#EF4444'];
var FIN_GST_COLOR     = '#B45309';

var cashflowLog = [];   // [{id, weekEnding, income, expenses, notes}]
var editingCashflowId = null;

var moneyGoals = [];    // [{id, title, target, current, deadline, notes}]
var editingMoneyGoalId = null;

var incomeTaxSetAsideRate = 0.25; // 25% default sole-trader estimate

// ── Shared SVG chart helpers ──────────────────────────────────

function _finColorFor(i) { return FIN_CHART_COLORS[i % FIN_CHART_COLORS.length]; }

function finPieChart(data) {
  var size = 180, r = size/2 - 6, cx = size/2, cy = size/2;
  var total = data.reduce(function(s,d){ return s + d.value; }, 0);
  var svg = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="flex-shrink:0">';
  if (total <= 0) {
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="var(--warm)"/>';
  } else {
    var angle = -Math.PI / 2;
    data.forEach(function(d) {
      var frac = d.value / total;
      if (frac <= 0) return;
      var sweep = frac * Math.PI * 2;
      var end = angle + sweep;
      var x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      var x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
      var largeArc = sweep > Math.PI ? 1 : 0;
      var path = frac >= 0.9995
        ? 'M '+cx+','+(cy-r)+' A '+r+','+r+' 0 1,1 '+(cx-0.01)+','+(cy-r)+' Z'
        : 'M '+cx+','+cy+' L '+x1+','+y1+' A '+r+','+r+' 0 '+largeArc+',1 '+x2+','+y2+' Z';
      svg += '<path d="'+path+'" fill="'+d.color+'" stroke="var(--cream)" stroke-width="1.5"><title>'+esc(d.label)+': '+esc(d.valueLabel)+' ('+Math.round(frac*100)+'%)</title></path>';
      if (frac >= 0.08) {
        var mid = angle + sweep/2;
        var lx = cx + (r*0.64) * Math.cos(mid), ly = cy + (r*0.64) * Math.sin(mid);
        svg += '<text x="'+lx+'" y="'+ly+'" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="white">'+Math.round(frac*100)+'%</text>';
      }
      angle = end;
    });
  }
  svg += '</svg>';
  return svg;
}

function finPieWithLegend(title, data, pl) {
  var total = data.reduce(function(s,d){ return s + d.value; }, 0);
  var legend = data.map(function(d) {
    var pct = total > 0 ? Math.round(d.value/total*100) : 0;
    return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:3px 0">'
      + '<span style="width:10px;height:10px;border-radius:3px;background:'+d.color+';flex-shrink:0"></span>'
      + '<span style="flex:1;color:var(--charcoal);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.label)+'</span>'
      + '<span style="font-weight:600;color:var(--deep);white-space:nowrap">'+fmtAmtRound(d.value)+'</span>'
      + '<span style="color:var(--muted);font-size:11px;width:30px;text-align:right;flex-shrink:0">'+pct+'%</span>'
      + '</div>';
  }).join('');
  return '<div class="card"><div class="ch"><div class="ct">'+esc(title)+'</div></div>'
    + '<div class="cb">'
    + (total > 0
        ? '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">' + finPieChart(data) + '<div style="flex:1;min-width:160px">' + legend + '</div></div>'
        : '<div style="color:var(--muted);font-size:13px;padding:20px 0;text-align:center">No data yet for this period.</div>')
    + '</div></div>';
}

function finBarChart(data) {
  var w = 560, h = 200, pad = 40;
  var maxVal = Math.max.apply(null, data.map(function(d){ return Math.abs(d.value); }).concat([1]));
  var gap = (w - pad*2) / data.length;
  var barW = gap * 0.5;
  var zeroY = h - pad;
  var svg = '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" style="max-width:'+w+'px;display:block">';
  svg += '<line x1="'+pad+'" y1="'+zeroY+'" x2="'+(w-8)+'" y2="'+zeroY+'" stroke="var(--sand)" stroke-width="1"/>';
  data.forEach(function(d, i) {
    var x = pad + gap*i + (gap-barW)/2;
    var barH = Math.max(2, (Math.abs(d.value)/maxVal) * (h - pad - 30));
    var y = zeroY - barH;
    svg += '<rect x="'+x+'" y="'+y+'" width="'+barW+'" height="'+barH+'" rx="5" fill="'+d.color+'"><title>'+esc(d.label)+': '+fmtAmtRound(d.value)+'</title></rect>';
    svg += '<text x="'+(x+barW/2)+'" y="'+(y-8)+'" text-anchor="middle" font-size="12" font-weight="700" fill="var(--deep)">'+fmtAmtRound(d.value)+'</text>';
    svg += '<text x="'+(x+barW/2)+'" y="'+(zeroY+18)+'" text-anchor="middle" font-size="11" fill="var(--muted)">'+esc(d.label)+'</text>';
  });
  svg += '</svg>';
  return svg;
}

function finLineChart(points) {
  if (!points.length) return '<div style="color:var(--muted);font-size:13px;padding:20px 0;text-align:center">Log a week to see the trend.</div>';
  var w = 640, h = 200, pad = 36;
  var vals = points.map(function(p){ return p.value; });
  var maxV = Math.max.apply(null, vals.concat([0]));
  var minV = Math.min.apply(null, vals.concat([0]));
  var range = (maxV - minV) || 1;
  var stepX = points.length > 1 ? (w - pad*2) / (points.length - 1) : 0;
  var zeroY = h - pad - ((0 - minV) / range) * (h - pad*2);
  var coords = points.map(function(p, i) {
    var x = pad + stepX * i;
    var y = h - pad - ((p.value - minV) / range) * (h - pad*2);
    return { x:x, y:y, p:p };
  });
  var pathD = coords.map(function(c, i){ return (i===0?'M':'L') + c.x + ',' + c.y; }).join(' ');
  var svg = '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" style="max-width:'+w+'px;display:block">';
  svg += '<line x1="'+pad+'" y1="'+zeroY+'" x2="'+(w-8)+'" y2="'+zeroY+'" stroke="var(--sand)" stroke-width="1" stroke-dasharray="4,3"/>';
  svg += '<path d="'+pathD+'" fill="none" stroke="var(--charcoal)" stroke-width="2"/>';
  coords.forEach(function(c) {
    var col = c.p.value < 0 ? '#EF4444' : '#10B981';
    svg += '<circle cx="'+c.x+'" cy="'+c.y+'" r="4.5" fill="'+col+'" stroke="var(--cream)" stroke-width="1.5"><title>'+esc(c.p.label)+': '+fmtAmtRound(c.p.value)+'</title></circle>';
  });
  svg += '</svg>';
  return svg;
}

// ══════════════════════════════════════
// CHARTS
// ══════════════════════════════════════

function _incomeEntryDisplayAmount(e) {
  var isClientBased = (e.id===1 || e.id===5 || e.id===2);
  if (isClientBased && e.clients > 0 && e.rate > 0) return e.clients * e.rate;
  if (e.id===3) return toDisplayPeriod((e.totalSubs||0) * (e.subPrice||0), 'monthly');
  if (e.id===4) return toDisplayPeriod((e.soldThisWeek||0) * (e.guidePrice||0), 'weekly');
  return toDisplayPeriod(e.amount, e.freq);
}

function renderFinCharts() {
  var el = document.getElementById('fin-charts-content'); if (!el) return;
  var pl = periodLabel();

  // Income by stream
  var incomeData = bizIncome.map(function(e, i) {
    return { label: e.name, value: Math.max(0, _incomeEntryDisplayAmount(e)), color: _finColorFor(i) };
  }).filter(function(d){ return d.value > 0; });

  // Business expenses by category (+ GST as its own slice)
  var bizCatTotals = {};
  var bizCatOrder = [];
  bizExpenses.forEach(function(e) {
    var c = e.cat || 'Other';
    if (bizCatTotals[c] === undefined) { bizCatTotals[c] = 0; bizCatOrder.push(c); }
    bizCatTotals[c] += toDisplayPeriod(e.amount, e.freq);
  });
  var expenseData = bizCatOrder.map(function(c, i) {
    return { label: c, value: bizCatTotals[c], color: _finColorFor(i) };
  }).filter(function(d){ return d.value > 0; });
  var gstAmt = calcGst();
  if (gstAmt > 0) expenseData.push({ label: 'GST Payable', value: gstAmt, color: FIN_GST_COLOR });

  // Personal expenses by category
  var persCatTotals = {};
  var persCatOrder = [];
  personalExpenses.forEach(function(e) {
    var c = e.cat || 'Other';
    if (persCatTotals[c] === undefined) { persCatTotals[c] = 0; persCatOrder.push(c); }
    persCatTotals[c] += toDisplayPeriod(e.amount, e.freq);
  });
  var personalData = persCatOrder.map(function(c, i) {
    return { label: c, value: persCatTotals[c], color: _finColorFor(i) };
  }).filter(function(d){ return d.value > 0; });

  // Bar: income vs business expenses vs personal expenses vs net
  var totalIncome = calcIncomeTotal();
  var totalBizExp = bizExpenses.reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0) + gstAmt;
  var totalPersExp = personalExpenses.reduce(function(s,e){ return s+toDisplayPeriod(e.amount,e.freq); }, 0);
  var net = totalIncome - totalBizExp - totalPersExp;
  var barData = [
    { label: 'Income',            value: totalIncome,  color: '#10B981' },
    { label: 'Business Expenses', value: totalBizExp,  color: 'var(--rose)' },
    { label: 'Personal Expenses', value: totalPersExp, color: '#8B5CF6' },
    { label: 'Net',               value: net,          color: net >= 0 ? '#10B981' : '#EF4444' }
  ];

  var html = '<div style="font-size:12px;color:var(--muted);margin-bottom:20px">All figures shown '+pl+' — switch the Weekly / Monthly / Yearly toggle above to change the period.</div>';

  html += '<div class="card" style="margin-bottom:20px">'
    + '<div class="ch"><div class="ct">Income vs Expenses '+pl+'</div></div>'
    + '<div class="cb" style="overflow-x:auto">' + finBarChart(barData) + '</div></div>';

  html += '<div class="g2" style="margin-bottom:20px">'
    + finPieWithLegend('Income by Stream', incomeData, pl)
    + finPieWithLegend('Business Expenses by Category', expenseData, pl)
    + '</div>';

  html += '<div class="g2" style="margin-bottom:20px">'
    + finPieWithLegend('Personal Expenses by Category', personalData, pl)
    + '<div></div>'
    + '</div>';

  el.innerHTML = html;
}

// ══════════════════════════════════════
// CASHFLOW
// ══════════════════════════════════════

function _nextSundayISO() {
  var d = new Date();
  var day = d.getDay();
  d.setDate(d.getDate() + (7 - day) % 7);
  return d.toISOString().slice(0,10);
}

function openCashflowModal(id) {
  editingCashflowId = id;
  var e = id ? cashflowLog.find(function(x){ return x.id===id; }) : null;
  document.getElementById('cfm-heading').textContent = e ? 'Edit Week' : 'Log This Week';
  document.getElementById('cfm-week').value = e ? e.weekEnding : _nextSundayISO();
  document.getElementById('cfm-income').value = e ? e.income : Math.round(calcWeeklyIncomeTotal());
  document.getElementById('cfm-expenses').value = e ? e.expenses : Math.round(bizExpenses.reduce(function(s,x){ return s+toWeeklyAmount(x.amount,x.freq); }, 0));
  document.getElementById('cfm-notes').value = e ? (e.notes||'') : '';
  document.getElementById('cfm-del-btn').style.display = e ? 'inline-block' : 'none';
  document.getElementById('cfm-err').textContent = '';
  document.getElementById('cashflow-modal').style.display = 'flex';
}
function closeCashflowModal() { document.getElementById('cashflow-modal').style.display = 'none'; }
function saveCashflowModal() {
  var week = document.getElementById('cfm-week').value;
  var err = document.getElementById('cfm-err');
  if (!week) { err.textContent = 'Please choose a week ending date.'; return; }
  var obj = {
    id: editingCashflowId || Date.now(),
    weekEnding: week,
    income: parseFloat(document.getElementById('cfm-income').value) || 0,
    expenses: parseFloat(document.getElementById('cfm-expenses').value) || 0,
    notes: document.getElementById('cfm-notes').value.trim()
  };
  if (editingCashflowId) {
    var i = cashflowLog.findIndex(function(x){ return x.id===editingCashflowId; });
    if (i > -1) cashflowLog[i] = obj;
  } else {
    cashflowLog.push(obj);
  }
  closeCashflowModal(); saveData(); renderCashflow();
}
function deleteCashflowEntry() {
  if (!editingCashflowId || !confirm('Delete this week\'s cashflow entry?')) return;
  cashflowLog = cashflowLog.filter(function(x){ return x.id !== editingCashflowId; });
  closeCashflowModal(); saveData(); renderCashflow();
}

function renderCashflow() {
  var el = document.getElementById('fin-cashflow-content'); if (!el) return;
  if (!cashflowLog.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:40px 0;text-align:center">No weeks logged yet — click + Log This Week to start tracking actual cashflow.</div>';
    return;
  }
  var sorted = cashflowLog.slice().sort(function(a,b){ return a.weekEnding < b.weekEnding ? -1 : 1; });
  var running = 0;
  var points = sorted.map(function(e) {
    running += (e.income - e.expenses);
    return { label: e.weekEnding, value: running, entry: e };
  });
  var avgNet = points.length ? (running / points.length) : 0;

  var summary = '<div class="srow" style="margin-bottom:20px">'
    + '<div class="sc" style="flex:1"><div class="slb">Weeks Logged</div><div class="sv">'+sorted.length+'</div></div>'
    + '<div class="sc" style="flex:1"><div class="slb">Avg Weekly Net</div><div class="sv" style="color:'+(avgNet>=0?'#10B981':'#EF4444')+'">'+fmtAmtRound(avgNet)+'</div></div>'
    + '<div class="sc '+(running>=0?'g':'r')+'" style="flex:1"><div class="slb">Running Balance</div><div class="sv">'+fmtAmtRound(running)+'</div></div>'
    + '</div>';

  var chart = '<div class="card" style="margin-bottom:20px"><div class="ch"><div class="ct">Running Balance Trend</div></div><div class="cb" style="overflow-x:auto">'+finLineChart(points)+'</div></div>';

  var rows = points.slice().reverse().map(function(pt) {
    var e = pt.entry;
    var net = e.income - e.expenses;
    return '<div class="fin-row" style="align-items:center'+(net<0?';background:#FEF2F2':'')+'">'
      + '<div class="fin-row-name">'+esc(e.weekEnding)+(net<0?' <span style="color:#EF4444;font-size:10px;font-weight:700;margin-left:4px">&#9888; NEGATIVE WEEK</span>':'')+(e.notes?'<div style="font-size:10px;color:var(--muted)">'+esc(e.notes)+'</div>':'')+'</div>'
      + '<div class="fin-row-freq">In '+fmtAmtRound(e.income)+' / Out '+fmtAmtRound(e.expenses)+'</div>'
      + '<div class="fin-row-amt" style="color:'+(net>=0?'#10B981':'#EF4444')+'">'+(net<0?'-':'+')+fmtAmtRound(Math.abs(net))+'</div>'
      + '<button class="fin-row-edit" onclick="openCashflowModal('+e.id+')">Edit</button>'
      + '</div>';
  }).join('');

  el.innerHTML = summary + chart + '<div class="fin-cat-block"><div class="fin-cat-hd"><span class="fin-cat-name">Weekly Log</span></div><div class="fin-cat-body">'+rows+'</div></div>';
}

// ══════════════════════════════════════
// MONEY GOALS
// ══════════════════════════════════════

function openMoneyGoalModal(id) {
  editingMoneyGoalId = id;
  var g = id ? moneyGoals.find(function(x){ return x.id===id; }) : null;
  document.getElementById('mgm-heading').textContent = g ? 'Edit Money Goal' : 'New Money Goal';
  document.getElementById('mgm-title').value    = g ? g.title : '';
  document.getElementById('mgm-target').value   = g && g.target  !== undefined ? g.target  : '';
  document.getElementById('mgm-current').value  = g && g.current !== undefined ? g.current : '';
  document.getElementById('mgm-deadline').value = g ? (g.deadline||'') : '';
  document.getElementById('mgm-notes').value    = g ? (g.notes||'') : '';
  document.getElementById('mgm-del-btn').style.display = g ? 'inline-block' : 'none';
  document.getElementById('mgm-err').textContent = '';
  document.getElementById('moneygoal-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('mgm-title').focus(); }, 80);
}
function closeMoneyGoalModal() { document.getElementById('moneygoal-modal').style.display = 'none'; }
function saveMoneyGoalModal() {
  var title = document.getElementById('mgm-title').value.trim();
  var err = document.getElementById('mgm-err');
  if (!title) { err.textContent = 'Title is required.'; return; }
  var obj = {
    id: editingMoneyGoalId || Date.now(),
    title: title,
    target: Number(document.getElementById('mgm-target').value) || 0,
    current: Number(document.getElementById('mgm-current').value) || 0,
    deadline: document.getElementById('mgm-deadline').value,
    notes: document.getElementById('mgm-notes').value.trim()
  };
  if (editingMoneyGoalId) {
    var i = moneyGoals.findIndex(function(x){ return x.id===editingMoneyGoalId; });
    if (i > -1) moneyGoals[i] = obj;
  } else {
    moneyGoals.push(obj);
  }
  closeMoneyGoalModal(); saveData(); renderMoneyGoals();
}
function deleteMoneyGoal() {
  if (!editingMoneyGoalId || !confirm('Delete this money goal?')) return;
  moneyGoals = moneyGoals.filter(function(x){ return x.id !== editingMoneyGoalId; });
  closeMoneyGoalModal(); saveData(); renderMoneyGoals();
}

function _moneyGoalCard(g) {
  var pct = g.target > 0 ? Math.min(100, Math.round((g.current/g.target)*100)) : 0;
  var deadlineLbl = g.deadline ? new Date(g.deadline+'T00:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}) : '';
  return '<div class="sopcard">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">'
    +   '<div class="soptit" style="margin-bottom:0">'+esc(g.title)+'</div>'
    +   '<div style="display:flex;gap:6px;flex-shrink:0">'
    +     '<button class="fin-row-edit" onclick="openMoneyGoalModal('+g.id+')">Edit</button>'
    +     '<button class="fin-row-edit" onclick="editingMoneyGoalId='+g.id+';deleteMoneyGoal()" style="color:#EF4444">Del</button>'
    +   '</div>'
    + '</div>'
    + '<div style="background:var(--warm);border-radius:20px;height:8px;overflow:hidden;margin-bottom:6px">'
    +   '<div style="background:'+(pct>=100?'#10B981':'var(--charcoal)')+';height:100%;width:'+pct+'%;border-radius:20px"></div>'
    + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">'+fmtAmtRound(g.current)+' / '+fmtAmtRound(g.target)+' &mdash; '+pct+'%</div>'
    + (deadlineLbl ? '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">&#128197; '+deadlineLbl+'</div>' : '')
    + (g.notes ? '<div class="sopdesc" style="margin-bottom:0">'+esc(g.notes)+'</div>' : '')
    + '</div>';
}

function renderMoneyGoals() {
  var el = document.getElementById('fin-goals-content'); if (!el) return;
  if (!moneyGoals.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:40px 0;text-align:center">No money goals yet — click + Add Money Goal to set your first target.</div>';
    return;
  }
  var inProgress = moneyGoals.filter(function(g){ return g.current < g.target; });
  var achieved   = moneyGoals.filter(function(g){ return g.current >= g.target && g.target > 0; });

  var html = '';
  html += '<div class="psub" style="margin:0 0 12px">In Progress</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:28px">'
    + (inProgress.length ? inProgress.map(_moneyGoalCard).join('') : '<div style="color:var(--muted);font-size:13px">Nothing in progress.</div>')
    + '</div>';
  if (achieved.length) {
    html += '<div class="psub" style="margin:0 0 12px">Achieved</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">'
      + achieved.map(_moneyGoalCard).join('')
      + '</div>';
  }
  el.innerHTML = html;
}

// ══════════════════════════════════════
// TAX / BAS  (sole trader, quarterly BAS — estimate only)
// ══════════════════════════════════════

function setTaxRate(val) {
  incomeTaxSetAsideRate = Math.max(0, Math.min(1, (parseFloat(val)||0)/100));
  saveData(); renderTaxBas();
}

function renderTaxBas() {
  var el = document.getElementById('fin-tax-content'); if (!el) return;

  var weeklyIncome = calcWeeklyIncomeTotal();
  var weeklyBizExp = bizExpenses.reduce(function(s,e){ return s + toWeeklyAmount(e.amount, e.freq); }, 0);
  var weeklyGstCredits = bizExpenses
    .filter(function(e){ return e.gstIncluded !== false; })
    .reduce(function(s,e){ return s + toWeeklyAmount(e.amount, e.freq); }, 0) * 0.1;
  var weeklyGstCollected = weeklyIncome * 0.1;
  var weeklyNetGst = weeklyGstCollected - weeklyGstCredits;
  var quarterlyNetGst = weeklyNetGst * 13;

  var weeklyProfit = Math.max(0, weeklyIncome - weeklyBizExp);
  var weeklyTaxSetAside = weeklyProfit * incomeTaxSetAsideRate;
  var quarterlyTaxSetAside = weeklyTaxSetAside * 13;
  var yearlyTaxSetAside = weeklyTaxSetAside * 52;

  var weeklyTotalSetAside = Math.max(0, weeklyNetGst) + weeklyTaxSetAside;

  var html = '<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;margin-bottom:24px;font-size:12px;color:#92400E;line-height:1.6">'
    + '<strong>Estimate only, not tax advice.</strong> These figures are simplified calculations from your current income &amp; expense data — GST is assumed to be 10% of gross income, and GST credits are 10% of expenses marked &ldquo;Includes GST&rdquo;. Confirm actual BAS and tax obligations with your accountant, Xero, or the ATO before lodging or paying anything.'
    + '</div>';

  html += '<div class="srow" style="margin-bottom:12px">'
    + '<div class="sc" style="flex:1"><div class="slb">Weekly Gross Income</div><div class="sv" style="color:#10B981">'+fmtAmtRound(weeklyIncome)+'</div></div>'
    + '<div class="sc r" style="flex:1"><div class="slb">GST Collected / wk</div><div class="sv" style="color:'+FIN_GST_COLOR+'">'+fmtAmtRound(weeklyGstCollected)+'</div></div>'
    + '<div class="sc r" style="flex:1"><div class="slb">GST Credits / wk</div><div class="sv">'+fmtAmtRound(weeklyGstCredits)+'</div></div>'
    + '<div class="sc '+(weeklyNetGst>=0?'r':'g')+'" style="flex:1"><div class="slb">Net GST '+(weeklyNetGst>=0?'Payable':'Refundable')+' / wk</div><div class="sv">'+fmtAmtRound(Math.abs(weeklyNetGst))+'</div></div>'
    + '</div>';

  html += '<div class="card" style="margin-bottom:24px">'
    + '<div class="ch"><div class="ct">Quarterly BAS Estimate</div></div>'
    + '<div class="cb">'
    + '<div class="er"><span>Net GST '+(quarterlyNetGst>=0?'Payable':'Refundable')+' (~13 wks)</span><span></span><span class="eamt" style="color:'+FIN_GST_COLOR+'">'+fmtAmtRound(Math.abs(quarterlyNetGst))+'</span></div>'
    + '</div></div>';

  html += '<div class="card" style="margin-bottom:24px">'
    + '<div class="ch" style="display:flex;justify-content:space-between;align-items:center">'
    +   '<div class="ct">Income Tax Set-Aside (sole trader estimate)</div>'
    +   '<div style="display:flex;align-items:center;gap:6px">'
    +     '<label class="sm-lbl" style="margin:0">Rate</label>'
    +     '<input type="number" min="0" max="100" step="1" value="'+Math.round(incomeTaxSetAsideRate*100)+'" onchange="setTaxRate(this.value)" style="width:60px;padding:4px 8px;border:1px solid var(--sand);border-radius:6px;font-size:13px;text-align:right;font-family:\'DM Sans\',sans-serif">'
    +     '<span style="font-size:13px;color:var(--muted)">%</span>'
    +   '</div>'
    + '</div>'
    + '<div class="cb">'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">Applied to weekly net profit (income minus business expenses, before GST adjustments)</div>'
    + '<div class="er"><span>Weekly</span><span></span><span class="eamt">'+fmtAmtRound(weeklyTaxSetAside)+'</span></div>'
    + '<div class="er"><span>Quarterly</span><span></span><span class="eamt">'+fmtAmtRound(quarterlyTaxSetAside)+'</span></div>'
    + '<div class="er"><span>Yearly</span><span></span><span class="eamt">'+fmtAmtRound(yearlyTaxSetAside)+'</span></div>'
    + '</div></div>';

  html += '<div class="fin-net-card '+(weeklyTotalSetAside>0?'negative':'positive')+'">'
    + '<div><div class="fin-net-lbl">Recommended Weekly Set-Aside (GST + Tax)</div>'
    + '<div class="fin-net-val">'+fmtAmtRound(weeklyTotalSetAside)+'</div></div>'
    + '</div>';

  el.innerHTML = html;
}
