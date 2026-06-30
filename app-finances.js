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

var bizIncome = [
  { id:1, name:'In-Person (Standard)', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:349 },
  { id:5, name:'In-Person (Premium)', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:445 },
  { id:2, name:'Online Clients', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:349 },
  { id:3, name:'Subscribers', cat:'Income', amount:0, freq:'monthly', notes:'', clients:0, rate:0, totalSubs:0, newThisWeek:0, subPrice:0 },
  { id:4, name:'E-Guides', cat:'Income', amount:0, freq:'weekly', notes:'', clients:0, rate:0, soldThisWeek:0, guidePrice:0 }
];

var bizExpenses = [
  { id:10, name:'Salma ($5.5/hr)', cat:'Staff', amount:137.50, freq:'weekly', notes:'25hrs' },
  { id:11, name:'Lemari ($16/hr)', cat:'Staff', amount:240, freq:'weekly', notes:'15hrs' },
  { id:20, name:'Xero', cat:'Subscriptions', amount:22.50, freq:'weekly', notes:'Monthly' },
  { id:21, name:'Hue & Stripe', cat:'Subscriptions', amount:29, freq:'weekly', notes:'3 months · $377' },
  { id:22, name:'Image Innovators', cat:'Subscriptions', amount:12.50, freq:'weekly', notes:'Monthly' },
  { id:23, name:'Ivorey Top Up', cat:'Subscriptions', amount:7.50, freq:'weekly', notes:'Top up $15' },
  { id:26, name:'Ivorey', cat:'Subscriptions', amount:0, freq:'weekly', notes:'' },
  { id:27, name:'ChatGPT', cat:'Subscriptions', amount:8.45, freq:'weekly', notes:'Monthly' },
  { id:24, name:'Squarespace', cat:'Subscriptions', amount:7, freq:'weekly', notes:'' },
  { id:25, name:'Google Workspace', cat:'Subscriptions', amount:6.49, freq:'weekly', notes:'' },
  { id:50, name:'Rent', cat:'Rent / Living', amount:750, freq:'weekly', notes:'Weekly' },
  { id:51, name:'Electricity', cat:'Rent / Living', amount:0, freq:'weekly', notes:'' },
  { id:60, name:'Phone (Aldi)', cat:'Electronics', amount:9.75, freq:'weekly', notes:'Monthly' },
  { id:61, name:'Internet (Dodo)', cat:'Electronics', amount:23.25, freq:'weekly', notes:'Monthly' },
  { id:30, name:'Google Ads', cat:'Marketing', amount:287, freq:'weekly', notes:'Daily $41' },
  { id:31, name:'Meta Ads', cat:'Marketing', amount:385, freq:'weekly', notes:'Daily $55' },
  { id:70, name:'Accounting', cat:'Services', amount:63.835, freq:'weekly', notes:'' },
  { id:71, name:'Insurance', cat:'Services', amount:25.32, freq:'weekly', notes:'' }
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
  document.getElementById('fin-business').style.display = tab==='business' ? 'block' : 'none';
  document.getElementById('fin-personal').style.display = tab==='personal' ? 'block' : 'none';
  document.querySelectorAll('.fin-tab').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderFinances();
}

function renderFinances() {
  renderBizFinances();
  renderPersonalFinances();
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

function renderBizFinances() {
  renderFinSection('fin-income-list', bizIncome, 'income', false);
  renderFinSection('fin-expense-list', bizExpenses, 'expense', true);
  renderBizSummary();
  renderNetBar();
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

    // Total bar below
    var grandTotal = calcIncomeTotal();
    var gstAmt = grandTotal * 0.1;
    var afterGst = grandTotal - gstAmt;
    gridHtml += '<div class="fin-net-card positive" style="margin-bottom:8px;flex-wrap:wrap;gap:20px">'
      + '<div><div class="fin-net-lbl">Total Income '+pl+'</div>'
      + '<div class="fin-net-val">'+fmtAmtRound(grandTotal)+'</div></div>'
      + '<div style="text-align:center">'
      + '<div class="fin-net-lbl" style="color:#B45309">GST (10%)</div>'
      + '<div style="font-family:\'Fraunces\',serif;font-size:24px;color:#92400E">− '+fmtAmtRound(gstAmt)+'</div>'
      + '</div>'
      + '<div style="text-align:right">'
      + '<div class="fin-net-lbl">After GST '+pl+'</div>'
      + '<div class="fin-net-val">'+fmtAmtRound(afterGst)+'</div>'
      + '</div>'
      + '</div>';

    el.innerHTML = gridHtml;
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

