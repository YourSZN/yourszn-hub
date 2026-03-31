// ════════════════════════════════════════════════════════════════
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
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep)">'+e.clients+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Rate</div>'
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep)">$'+e.rate+'</div>'
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
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:36px;color:var(--deep)">'+displayAmt+'</div>'
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
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep)">'+e.clients+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Rate</div>'
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:var(--deep)">$'+e.rate+'</div>'
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
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:32px;color:var(--deep)">'+( e.totalSubs||0)+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:#D1FAE5;border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">New This Week</div>'
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:32px;color:#065F46">'+(e.newThisWeek||0)+'</div>'
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
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:32px;color:var(--deep)">'+( e.soldThisWeek||0)+'</div>'
          + '</div>'
          + '<div style="flex:1;text-align:center;padding:12px;background:var(--warm);border-radius:10px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Price Each</div>'
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:32px;color:var(--deep)">'+(e.guidePrice>0?'$'+(e.guidePrice):'—')+'</div>'
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
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:24px;color:#92400E">− '+fmtAmtRound(gstAmt)+'</div>'
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
    + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:24px;color:var(--deep)">'+fmtAmtRound(totalExp)+'</div></div>' : '')
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

// ══ META PLANNER ══
var metaWeekOff = 0, metaSlots = {};
var META_ROWS = [{key:'story',label:'STORY'},{key:'am',label:'AM POST'},{key:'pm',label:'PM POST'}];
var ASSIGN_COLORS = {L:'#7A8C6E', S:'#C49A8A', '':'#C9B99A'};
var META_STATUS_STYLES = {
  todo:       'background:#F3F4F6;color:#6B7280',
  inprogress: 'background:#DBEAFE;color:#1D4ED8',
  ready:      'background:#D1FAE5;color:#065F46',
  scheduled:  'background:#EDE9FE;color:#5B21B6',
  published:  'background:#1C1712;color:#F7F3EE'
};
var META_STATUS_LABELS = {todo:'To Do',inprogress:'In Progress',ready:'Ready',scheduled:'Scheduled',published:'Published'};

function changeMetaWeek(d) { metaWeekOff += d; renderMetaRotation(); }

function renderMetaRotation() {
  var grid = document.getElementById('meta-rotation-grid'); if (!grid) return;
  var lbl = document.getElementById('meta-week-lbl');
  var today = new Date(); today.setHours(0,0,0,0);
  var dow = today.getDay(); if (dow===0) dow=7;
  var mon = new Date(today); mon.setDate(today.getDate() - (dow-1) + metaWeekOff*7);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var fmtD = function(d) { return d.getDate()+' '+months[d.getMonth()]; };
  var sun = new Date(mon); sun.setDate(mon.getDate()+6);
  if (lbl) lbl.textContent = fmtD(mon)+' \u2013 '+fmtD(sun);
  var days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  var out = '<div style="display:grid;grid-template-columns:60px repeat(7,1fr);gap:1px;border:1px solid var(--sand);border-radius:12px;overflow:hidden;background:var(--sand)">';
  out += '<div style="background:var(--charcoal);padding:10px 8px"></div>';
  for (var c=0; c<7; c++) {
    var d = new Date(mon); d.setDate(mon.getDate()+c);
    out += '<div style="background:var(--charcoal);color:var(--cream);padding:10px 8px;text-align:center"><div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">'+days[c]+'</div><div style="font-size:11px;margin-top:2px;opacity:.7">'+fmtD(d)+'</div></div>';
  }
  for (var r=0; r<META_ROWS.length; r++) {
    var row = META_ROWS[r];
    out += '<div style="background:var(--warm);padding:10px 8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);writing-mode:vertical-rl;transform:rotate(180deg)">'+row.label+'</div>';
    for (var c=0; c<7; c++) {
      var d = new Date(mon); d.setDate(mon.getDate()+c);
      var slotKey = row.key+':'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      var slot = metaSlots[slotKey];
      out += '<div style="background:white;padding:10px;cursor:pointer;min-height:90px;position:relative;transition:background .15s" data-key="'+slotKey+'" onclick="openMetaSlot(this.dataset.key)" onmouseenter="this.style.background=\'var(--warm)\'" onmouseleave="this.style.background=\'white\'">';
      if (slot && slot.subject) {
        if (slot.assign) out += '<div style="width:20px;height:20px;border-radius:50%;background:'+(ASSIGN_COLORS[slot.assign]||'#C9B99A')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;margin-bottom:5px">'+slot.assign+'</div>';
        if (slot.vidtype) out += '<div style="font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">'+slot.vidtype+'</div>';
        out += '<div style="font-size:11px;color:var(--charcoal);line-height:1.4;margin-bottom:5px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+slot.subject+(slot.part?' \u2014 '+slot.part:'')+'</div>';
        if (slot.status) out += '<span style="font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 7px;border-radius:8px;'+( META_STATUS_STYLES[slot.status]||'')+'">'+( META_STATUS_LABELS[slot.status]||'')+'</span>';
        if (slot.canva) out += '<div style="font-size:10px;margin-top:4px">\u{1F3A8} <a href="'+slot.canva+'" target="_blank" onclick="event.stopPropagation()" style="color:var(--accent);text-decoration:none">Canva</a></div>';
        if (slot.drive) out += '<div style="font-size:10px;margin-top:2px">\u{1F4C2} <a href="'+slot.drive+'" target="_blank" onclick="event.stopPropagation()" style="color:var(--muted);text-decoration:none">Drive</a></div>';
      } else {
        out += '<div style="display:flex;align-items:center;justify-content:center;height:50px;color:var(--tan);font-size:20px">+</div>';
      }
      out += '</div>';
    }
  }
  out += '</div>';
  grid.innerHTML = out;
}

function openMetaSlot(key) {
  var slot = metaSlots[key] || {};
  var parts = key.split(':');
  var rowObj = META_ROWS.find(function(r){return r.key===parts[0];});
  var d = new Date(parts[1]);
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var dayLbl = (rowObj?rowObj.label:'') + ' \u2014 ' + dayNames[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
  document.getElementById('msm-view-mode').style.display = 'block';
  document.getElementById('msm-edit-mode').style.display = 'none';
  document.getElementById('msm-day-lbl').textContent = dayLbl;
  document.getElementById('msm-title-view').innerHTML = slot.subject ? (slot.subject + (slot.part?' \u2014 '+slot.part:'')) : 'Empty slot \u2014 click Edit to add';
  var badge = document.getElementById('msm-assign-badge');
  badge.textContent = slot.assign || '';
  badge.style.background = ASSIGN_COLORS[slot.assign||''];
  var statusHtml = '';
  if (slot.cat) statusHtml += '<span style="font-size:10px;font-weight:600;text-transform:uppercase;padding:3px 10px;border-radius:10px;background:var(--warm);color:var(--muted);margin-right:6px">'+(slot.cat==='celeb'?'\u2B50 Celeb':'\u{1F464} Client')+'</span>';
  if (slot.vidtype) statusHtml += '<span style="font-size:10px;font-weight:600;text-transform:uppercase;padding:3px 10px;border-radius:10px;background:var(--sand);color:var(--charcoal);margin-right:6px">'+slot.vidtype+'</span>';
  if (slot.status) statusHtml += '<span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 10px;border-radius:10px;'+(META_STATUS_STYLES[slot.status]||'')+'">'+( META_STATUS_LABELS[slot.status]||'')+'</span>';
  document.getElementById('msm-status-view').innerHTML = statusHtml;
  var linksHtml = '';
  if (slot.canva) linksHtml += '<a href="'+slot.canva+'" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--charcoal);background:var(--warm);padding:7px 14px;border-radius:8px;border:1px solid var(--sand);text-decoration:none;margin-right:8px;margin-bottom:8px">\u{1F3A8} Canva File</a>';
  if (slot.drive) linksHtml += '<a href="'+slot.drive+'" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:white;background:var(--charcoal);padding:7px 14px;border-radius:8px;text-decoration:none;margin-bottom:8px">\u{1F4C2} Google Drive</a>';
  document.getElementById('msm-links-view').innerHTML = linksHtml;
  var notesHtml = '';
  if (slot.editor) notesHtml += '<div style="margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted)">Editor: </span>'+slot.editor+'</div>';
  if (slot.caption) notesHtml += '<div style="margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted)">Caption</span><div style="margin-top:4px;white-space:pre-wrap;font-size:13px">'+slot.caption+'</div></div>';
  if (slot.cta) notesHtml += '<div style="margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted)">CTA: </span>'+slot.cta+'</div>';
  if (slot.hashtags) notesHtml += '<div style="margin-bottom:6px;font-size:12px;color:var(--accent)">'+slot.hashtags+'</div>';
  if (slot.dateCompleted) notesHtml += '<div style="font-size:11px;color:var(--muted)">Completed: '+slot.dateCompleted+'</div>';
  if (slot.datePublished) notesHtml += '<div style="font-size:11px;color:var(--muted)">Published: '+slot.datePublished+'</div>';
  document.getElementById('msm-notes-view').innerHTML = notesHtml;
  document.getElementById('meta-slot-modal').style.display = 'flex';
}

function switchMetaToEdit() {
  var slot = metaSlots[currentMetaKey] || {};
  document.getElementById('msm-view-mode').style.display = 'none';
  document.getElementById('msm-edit-mode').style.display = 'block';
  var catClient = document.getElementById('msm-cat-client');
  var catCeleb  = document.getElementById('msm-cat-celeb');
  if (catClient) catClient.checked = slot.cat !== 'celeb';
  if (catCeleb)  catCeleb.checked  = slot.cat === 'celeb';
  document.getElementById('msm-subject').value        = slot.subject || '';
  document.getElementById('msm-vidtype').value        = slot.vidtype || 'Reel';
  document.getElementById('msm-part').value           = slot.part    || '';
  document.getElementById('msm-editor').value         = slot.editor  || '';
  document.getElementById('msm-caption').value        = slot.caption || '';
  document.getElementById('msm-cta').value            = slot.cta     || '';
  document.getElementById('msm-hashtags').value       = slot.hashtags|| '#colouranalysis #yourszn';
  document.getElementById('msm-status').value         = slot.status  || 'todo';
  document.getElementById('msm-assign').value         = slot.assign  || '';
  document.getElementById('msm-canva').value          = slot.canva   || '';
  document.getElementById('msm-drive').value          = slot.drive   || '';
  document.getElementById('msm-date-completed').value = slot.dateCompleted || '';
  document.getElementById('msm-date-published').value = slot.datePublished || '';
}

var currentMetaKey = null;
var _origOpenMetaSlot = openMetaSlot;
openMetaSlot = function(key) { currentMetaKey = key; _origOpenMetaSlot(key); };

function switchMetaToView() {
  document.getElementById('msm-edit-mode').style.display = 'none';
  document.getElementById('msm-view-mode').style.display = 'block';
}

function saveMetaSlot() {
  if (!currentMetaKey) return;
  var catCeleb = document.getElementById('msm-cat-celeb');
  metaSlots[currentMetaKey] = {
    cat:           catCeleb && catCeleb.checked ? 'celeb' : 'client',
    subject:       document.getElementById('msm-subject').value.trim(),
    vidtype:       document.getElementById('msm-vidtype').value,
    part:          document.getElementById('msm-part').value.trim(),
    editor:        document.getElementById('msm-editor').value,
    caption:       document.getElementById('msm-caption').value.trim(),
    cta:           document.getElementById('msm-cta').value.trim(),
    hashtags:      document.getElementById('msm-hashtags').value.trim(),
    status:        document.getElementById('msm-status').value,
    assign:        document.getElementById('msm-assign').value,
    canva:         document.getElementById('msm-canva').value.trim(),
    drive:         document.getElementById('msm-drive').value.trim(),
    dateCompleted: document.getElementById('msm-date-completed').value,
    datePublished: document.getElementById('msm-date-published').value
  };
  saveData(); closeMetaSlotModal(); renderMetaRotation();
}

function clearMetaSlot() {
  if (currentMetaKey) { delete metaSlots[currentMetaKey]; saveData(); }
  closeMetaSlotModal(); renderMetaRotation();
}

function closeMetaSlotModal() {
  document.getElementById('meta-slot-modal').style.display = 'none';
  currentMetaKey = null;
}

// ══ CELEB TRACKER ══
var celebData = [], celebEditId = null, celebTab = 'todo';

function setCelebTab(t) {
  celebTab = t;
  var td = document.getElementById('ctab-todo');
  var dn = document.getElementById('ctab-done');
  if (td) td.classList.toggle('on', t==='todo');
  if (dn) dn.classList.toggle('on', t==='done');
  renderCelebList();
}

function renderCelebList() {
  var el = document.getElementById('celeb-list'); if (!el) return;
  var list = celebData.filter(function(c){ return c.status===celebTab; });
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">'+(celebTab==='todo'?'No celebs added yet. Click + Add Celeb to start.':'No completed analyses yet.')+'</div>';
    return;
  }
  var scStyle = function(s) {
    if (!s) return 'background:var(--warm);color:var(--muted)';
    if (s.indexOf('spring')>-1) return 'background:#FEF3C7;color:#92400E';
    if (s.indexOf('summer')>-1) return 'background:#DBEAFE;color:#1E40AF';
    if (s.indexOf('autumn')>-1) return 'background:#FEE2E2;color:#B45309';
    if (s.indexOf('winter')>-1) return 'background:#EDE9FE;color:#5B21B6';
    return 'background:var(--warm);color:var(--muted)';
  };
  var scLabel = function(s) {
    if (!s) return 'Season Unknown';
    return s.split('-').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(' ');
  };
  var statusStyle = {editing:'background:#F3F4F6;color:#6B7280',review:'background:#FEF3C7;color:#92400E',completed:'background:#D1FAE5;color:#065F46',scheduled:'background:#EDE9FE;color:#5B21B6',published:'background:#1C1712;color:#F7F3EE'};
  var statusLabel = {editing:'Editing',review:'Review',completed:'Completed',scheduled:'Scheduled',published:'Published'};
  var prioOrder = {hot:0, trending:1, evergreen:2};
  list.sort(function(a,b){ return (prioOrder[a.priority||'evergreen']||2) - (prioOrder[b.priority||'evergreen']||2); });
  var prioDot = {hot:'🔴', trending:'🟡', evergreen:'🟢'};
  var out = '';
  list.forEach(function(c) {
    var isDone = c.status === 'done';
    var vids = c.videos || [];
    out += '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px 20px;margin-bottom:12px">';
    out += '<div style="display:flex;align-items:flex-start;gap:16px">';
    out += '<div style="width:22px;height:22px;border-radius:50%;border:2px solid ' + (isDone ? 'var(--charcoal)' : 'var(--sand)') + ';flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:2px;background:' + (isDone ? 'var(--charcoal)' : 'transparent') + '" data-id="' + c.id + '" onclick="toggleCelebDone(this.dataset.id)">' + (isDone ? '<span style="color:white;font-size:11px">&#10003;</span>' : '') + '</div>';
    out += '<div style="flex:1">';
    out += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:14px">' + (prioDot[c.priority||'evergreen']||'🟢') + '</span><span style="font-size:18px;color:var(--charcoal);font-weight:500">' + c.name + '</span></div>';
    out += '<span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:3px 10px;border-radius:12px;margin-bottom:6px;' + scStyle(c.season) + '">' + scLabel(c.season) + '</span>';
    if (c.notes) out += '<div style="font-size:12px;color:var(--muted);font-style:italic;line-height:1.5">' + c.notes + '</div>';
    out += '</div>';
    out += '<button style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;padding:4px;flex-shrink:0" data-id="' + c.id + '" onclick="openCelebModal(this.dataset.id)" title="Edit">&#9998;</button>';
    out += '</div>';
    if (isDone) {
      out += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--sand)">';
      out += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
      out += '<span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">&#127916; Videos</span>';
      out += '<button style="font-size:10px;font-weight:600;background:var(--warm);border:1.5px solid var(--sand);border-radius:8px;padding:4px 12px;cursor:pointer;color:var(--charcoal)" data-cid="' + c.id + '" onclick="openCelebVidModal(this.dataset.cid, null)">+ Add Video</button>';
      out += '</div>';
      if (vids.length) {
        vids.forEach(function(v) {
          var st = statusStyle[v.status] || statusStyle.editing;
          var sl = statusLabel[v.status] || 'Editing';
          out += '<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--warm);border-radius:8px;margin-bottom:6px">';
          if (v.thumb) out += '<img src="' + v.thumb + '" style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0">';
          out += '<div style="flex:1;min-width:0">';
          out += '<div style="font-size:13px;font-weight:600;color:var(--charcoal);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (v.type || 'Reel') + (v.part ? ' \u2014 ' + v.part : '') + '</div>';
          out += '<div style="font-size:11px;color:var(--muted)">' + (v.editor ? v.editor + ' \u00b7 ' : '') + sl + '</div>';
          out += '</div>';
          out += '<button style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;padding:4px" data-cid="' + c.id + '" data-vid="' + v.id + '" onclick="openCelebVidModal(this.dataset.cid,this.dataset.vid)" title="Edit video">&#9998;</button>';
          out += '</div>';
        });
      } else {
        out += '<div style="font-size:12px;color:var(--muted);padding:6px 0">No videos yet.</div>';
      }
      out += '</div>';
    }
    out += '</div>';
  });
  el.innerHTML = out;
}

function openCelebModal(id) {
  celebEditId = id || null;
  var c = id ? celebData.find(function(x){return x.id===id;}) : null;
  document.getElementById('celeb-modal-title').textContent = c ? 'Edit Celeb' : 'Add Celeb';
  document.getElementById('celeb-name').value   = c ? c.name : '';
  document.getElementById('celeb-status').value = c ? c.status : 'todo';
  document.getElementById('celeb-season').value = c ? (c.season||'') : '';
  document.getElementById('celeb-notes').value  = c ? (c.notes||'') : '';
  var prio = c ? (c.priority || 'evergreen') : 'evergreen';
  document.querySelectorAll('input[name="celeb-priority"]').forEach(function(r){ r.checked = r.value === prio; });
  document.getElementById('celeb-del').style.display = c ? 'inline-block' : 'none';
  document.getElementById('celeb-modal').style.display = 'flex';
}

function closeCelebModal() { document.getElementById('celeb-modal').style.display='none'; }

function saveCeleb() {
  var name = document.getElementById('celeb-name').value.trim(); if (!name) return;
  var prioEl = document.querySelector('input[name="celeb-priority"]:checked');
  var prio = prioEl ? prioEl.value : 'evergreen';
  if (celebEditId) {
    var c = celebData.find(function(x){return x.id===celebEditId;});
    if (c) { c.name=name; c.status=document.getElementById('celeb-status').value; c.season=document.getElementById('celeb-season').value; c.notes=document.getElementById('celeb-notes').value.trim(); c.priority=prio; }
  } else {
    celebData.push({id:'c'+Date.now(), name:name, status:document.getElementById('celeb-status').value, season:document.getElementById('celeb-season').value, notes:document.getElementById('celeb-notes').value.trim(), priority:prio});
  }
  saveData(); closeCelebModal(); renderCelebList();
}

function deleteCeleb() {
  celebData = celebData.filter(function(c){return c.id!==celebEditId;});
  saveData(); closeCelebModal(); renderCelebList();
}

function toggleCelebDone(id) {
  var c = celebData.find(function(x){return x.id===id;}); if (!c) return;
  c.status = c.status==='done' ? 'todo' : 'done';
  saveData(); renderCelebList();
}

// ══ AD STATUS FILTERS ══
var adStatusFilter = 'all';

function filterAdStatus(s) {
  adStatusFilter = s;
  renderAdStatusPills();
  renderAdList();
}

function renderAdStatusPills() {
  var el = document.getElementById('ad-status-filters'); if (!el) return;
  var statuses = ['all','backlog','ready','active','paused','completed'];
  var labels   = ['All','Backlog','Ready','Active','Paused','Completed'];
  el.innerHTML = statuses.map(function(s,i){
    var on = adStatusFilter===s;
    return '<button onclick="filterAdStatus(\''+s+'\')" class="sm-pill'+(on?' on':'')+'" style="font-size:11px">'+labels[i]+'</button>';
  }).join('');
}

// ══ LOCALST0RAGE PERSISTENCE ══

function exportData() {
  var payload = JSON.stringify({
    _v:'yszn_v1', _date: new Date().toISOString(),
    cRows:cRows, tours:tours, tasks:tasks, taskNotifs:taskNotifs,
    vidData:vidData, adData:adData, goals:goals,
    bizIncome:bizIncome, bizExpenses:bizExpenses, personalExpenses:personalExpenses,
    sopList:sopList, brands:brands, watchlist:watchlist,
    socialSlots:socialSlots, metaSlots:metaSlots, metaSchedData:metaSchedData, celebData:celebData,
    groupMsgs:groupMsgs, dmMsgs:dmMsgs, auditD:auditD, commsUnread:commsUnread, vtData:vtData, pwList:pwList, mktData:mktData, ideaList:ideaList, creatorsList:creatorsList
  }, null, 2);
  var blob = new Blob([payload], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yourszn-data-' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(a.href);
}

function importData(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var d = JSON.parse(e.target.result);
      if (d.cRows)             cRows             = d.cRows;
      if (d.tours)             tours             = d.tours;
      if (d.tasks)             tasks             = d.tasks;
      if (d.taskNotifs)        taskNotifs        = d.taskNotifs;
      if (d.vidData)           vidData           = d.vidData;
      if (d.adData)            adData            = d.adData;
      if (d.goals)             goals             = d.goals;
      if (d.bizIncome)         bizIncome         = d.bizIncome;
      if (d.bizExpenses)       bizExpenses       = d.bizExpenses;
      if (d.personalExpenses)  personalExpenses  = d.personalExpenses;
      if (d.sopList)           sopList           = d.sopList;
      if (d.brands)            brands            = d.brands;
      if (d.watchlist)         watchlist         = d.watchlist;
      if (d.socialSlots)       socialSlots       = d.socialSlots;
      if (d.metaSlots)         metaSlots         = d.metaSlots;
      if (d.metaSchedData)     metaSchedData     = d.metaSchedData;
      if (d.celebData)         celebData         = d.celebData;
      if (d.groupMsgs)         groupMsgs         = d.groupMsgs;
      if (d.dmMsgs)            dmMsgs            = d.dmMsgs;
      if (d.auditD)            auditD            = d.auditD;
      if (d.commsUnread)       commsUnread       = d.commsUnread;
      saveData();
      renderClients(); renderSops(); renderAudit(); renderBrands(); renderWatchlist();
      renderTaskBoard(); renderToursPage(); renderSocialPage(); renderAdCreativePage();
      renderGoals(); renderFinances();
      if (curUser==='latisha') { renderStaffPage(); renderDashTaskProgress(); } else { renderMyHub(); }
      alert('Data imported successfully!');
    } catch(err) { alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file);
}


// ── Vietnam Tour data ──
var vtData = {
  checklists: [
    { id:'planning', title:'Planning & Pre-Launch', groups: [
      { label:'Planning', items:[
        {id:'vt1', text:'Collect client data', done:false},
        {id:'vt2', text:'Create pricing structure and packages', done:false},
        {id:'vt3', text:'Draft flyer with all inclusions', done:false},
        {id:'vt4', text:'Consult lawyer \u2014 finalise legal docs', done:false}
      ]},
      { label:'Launch', items:[
        {id:'vt5', text:'Launch end of October with pricing live', done:false},
        {id:'vt6', text:'Set up booking/deposit system', done:false}
      ]}
    ]},
    { id:'onboarding', title:'Client Onboarding', groups: [
      { label:'Onboarding', items:[
        {id:'vt7', text:'Send confirmation + legal doc once deposit received', done:false},
        {id:'vt8', text:'Collect lookbook submissions from each client', done:false},
        {id:'vt9', text:'Request preliminary quotes from tailors (January)', done:false}
      ]},
      { label:'Pre-Departure Pack', items:[
        {id:'vt10', text:'Detailed itinerary', done:false},
        {id:'vt11', text:'What to pack guide', done:false},
        {id:'vt12', text:'Currency/tipping notes + emergency contacts', done:false}
      ]}
    ]}
  ],
  docs: [
    {id:'d1', name:'Brochure',       status:'done',       notes:'Created in Canva', url:''},
    {id:'d2', name:'Welcome Pack',   status:'inprogress', notes:'Hotel, restaurants, client info', url:''},
    {id:'d3', name:'Tailoring Guide',status:'inprogress', notes:'Help clients pick after colour analysis', url:''},
    {id:'d4', name:'Personal Report',status:'inprogress', notes:'Images, notes, colours, measurements', url:''}
  ],
  bookedClients: [],
  intClients: [],
  finances: { my:{}, guest:{}, feeRate:0 },
  onboardingSop: [
    {id:'ob1', text:'Send contract', done:false, notes:''},
    {id:'ob2', text:'Receive signed contract & deposit', done:false, notes:''},
    {id:'ob3', text:'First meeting / colour analysis', done:false, notes:''},
    {id:'ob4', text:'Send welcome pack', done:false, notes:''},
    {id:'ob5', text:'Second meeting / tailoring brief', done:false, notes:''},
    {id:'ob6', text:'Confirm final details & payments', done:false, notes:''}
  ]
};

function vtSave() { saveData(); }

// ── Vietnam Tour tab state ──
var vtTab = 'planning';
function vtSetTab(tab) {
  vtTab = tab;
  document.querySelectorAll('.vt-tab').forEach(function(b){ b.classList.remove('on'); });
  var tb = document.getElementById('vt-tab-'+tab); if(tb) tb.classList.add('on');
  renderVietnamTour();
}

function renderVietnamTour() {
  var el = document.getElementById('vt-content'); if (!el) return;
  var d = vtData;

  // ── Tab bar ──
  var tabs = [
    {id:'planning',    label:'Planning'},
    {id:'clients',     label:'Clients'},
    {id:'onboarding',  label:'Onboarding SOP'},
    {id:'documents',   label:'Documents'}
  ];
  if (curUser === 'latisha') tabs.push({id:'finances', label:'Finances'});
  var tabBar = '<div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">'
    + tabs.map(function(t){
        return '<button id="vt-tab-'+t.id+'" class="vt-tab'+(vtTab===t.id?' on':'')+'" onclick="vtSetTab(\''+t.id+'\')">'+t.label+'</button>';
      }).join('')
    + '</div>';

  var panelHtml = '';

  // ════════════════════════════════
  // PLANNING TAB
  // ════════════════════════════════
  if (vtTab === 'planning') {
    var clHtml = '<div class="g2">';
    d.checklists.forEach(function(cl) {
      clHtml += '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
        + '<div class="ct">'+esc(cl.title)+'</div>'
        + '<button class="fin-row-edit" onclick="vtOpenChecklistModal(\''+cl.id+'\')">+ Add Item</button>'
        + '</div><div class="cb scrl">';
      cl.groups.forEach(function(g) {
        clHtml += '<div class="ckl"><div class="cklt" style="display:flex;align-items:center;justify-content:space-between">'
          + '<span>'+esc(g.label)+'</span>'
          + '<button class="fin-row-edit" style="font-size:10px" onclick="vtOpenChecklistModal(\''+cl.id+'\',\''+esc(g.label)+'\')">+ Item</button>'
          + '</div>';
        g.items.forEach(function(item) {
          clHtml += '<div class="titem'+(item.done?' done':'')+'">'
            + '<div class="tck" onclick="vtToggleItem(\''+cl.id+'\',\''+item.id+'\')">'+
              (item.done?'<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" fill="none"/></svg>':'')+'</div>'
            + '<div class="ttx" style="flex:1">'+esc(item.text)+'</div>'
            + '<button class="fin-row-edit" style="font-size:10px;opacity:.6" onclick="vtEditItem(\''+cl.id+'\',\''+item.id+'\')">&#9998;</button>'
            + '<button class="fin-row-edit" style="font-size:10px;color:#EF4444;opacity:.6" onclick="vtDeleteItem(\''+cl.id+'\',\''+item.id+'\')">&#10005;</button>'
            + '</div>';
        });
        clHtml += '</div>';
      });
      clHtml += '</div></div>';
    });
    clHtml += '</div>';
    panelHtml = clHtml;
  }

  // ════════════════════════════════
  // CLIENTS TAB
  // ════════════════════════════════
  if (vtTab === 'clients') {
    var bookedRows = (d.bookedClients||[]).map(function(c,i){
      var statCols = {'Booked':'#6366F1','Colour Analysis':'#F59E0B','First Meeting':'#3B82F6','Second Meeting':'#8B5CF6','Final Payment':'#EF4444','Complete':'#10B981'};
      var stCol = statCols[c.status] || 'var(--muted)';
      return '<div class="tour-doc-row" style="flex-wrap:wrap">'
        + '<div style="flex:1;min-width:0">'
        +   '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">'+esc(c.name)+(c.partner?' <span style="font-weight:400;color:var(--muted)">&amp; '+esc(c.partner)+'</span>':'')+'</div>'
        +   (c.package?'<span style="font-size:10px;background:var(--rose);color:#fff;padding:2px 8px;border-radius:10px;display:inline-block;margin-top:3px">'+esc(c.package)+'</span>':'')
        +   (c.contract?'&nbsp;<a href="'+esc(c.contract)+'" target="_blank" style="font-size:11px;color:var(--rose);font-weight:600;text-decoration:none">&#128196; Contract</a>':'')
        +   (c.notes?'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+esc(c.notes)+'</div>':'')
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;width:100%">'
        +   '<select style="font-size:11px;font-weight:700;color:#fff;background:'+stCol+';border:none;border-radius:12px;padding:3px 10px;cursor:pointer" onchange="vtUpdateClientStatus(\'booked\','+i+',this.value)">'
        +     '<option value="Booked" '+(c.status==='Booked'||!c.status?'selected':'')+'>Booked</option>'
        +     '<option value="Colour Analysis" '+(c.status==='Colour Analysis'?'selected':'')+'>Colour Analysis</option>'
        +     '<option value="First Meeting" '+(c.status==='First Meeting'?'selected':'')+'>First Meeting</option>'
        +     '<option value="Second Meeting" '+(c.status==='Second Meeting'?'selected':'')+'>Second Meeting</option>'
        +     '<option value="Final Payment" '+(c.status==='Final Payment'?'selected':'')+'>Final Payment</option>'
        +     '<option value="Complete" '+(c.status==='Complete'?'selected':'')+'>Complete</option>'
        +   '</select>'
        +   '<button class="fin-row-edit" onclick="vtEditClient(\'booked\','+i+')">Edit</button>'
        +   '<button class="fin-row-edit" onclick="vtDeleteClient(\'booked\','+i+')" style="color:#EF4444">Del</button>'
        + '</div>'
        + '</div>';
    }).join('') || '<div style="color:var(--muted);font-size:13px;padding:10px 0">No booked clients yet.</div>';

    var intRows = (d.intClients||[]).map(function(c,i){
      return '<div class="tour-doc-row">'
        + '<div style="flex:1;min-width:0">'
        +   '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">'+esc(c.name)+'</div>'
        +   (c.contract?'<a href="'+esc(c.contract)+'" target="_blank" style="font-size:11px;color:var(--rose);font-weight:600;text-decoration:none">&#128196; Contract</a>':'')
        +   (c.notes?'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+esc(c.notes)+'</div>':'')
        + '</div>'
        + '<button class="fin-row-edit" onclick="vtEditClient(\'int\','+i+')">Edit</button>'
        + '<button class="fin-row-edit" onclick="vtDeleteClient(\'int\','+i+')" style="color:#EF4444">Del</button>'
        + '</div>';
    }).join('') || '<div style="color:var(--muted);font-size:13px;padding:10px 0">No interested clients yet.</div>';

    panelHtml = '<div class="g2">'
      + '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
      +   '<div class="ct">Booked Clients <span style="font-size:13px;font-weight:400;color:var(--muted)">('+( d.bookedClients||[]).length+')</span></div>'
      +   '<button class="btn btnp" style="font-size:12px;padding:6px 14px" onclick="vtEditClient(\'booked\',null)">+ Add</button>'
      + '</div><div class="cb scrl">'+bookedRows+'</div></div>'
      + '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
      +   '<div class="ct">Interested Clients <span style="font-size:13px;font-weight:400;color:var(--muted)">('+( d.intClients||[]).length+')</span></div>'
      +   '<button class="btn btnp" style="font-size:12px;padding:6px 14px" onclick="vtEditClient(\'int\',null)">+ Add</button>'
      + '</div><div class="cb scrl">'+intRows+'</div></div>'
      + '</div>';
  }

  // ════════════════════════════════
  // DOCUMENTS TAB
  // ════════════════════════════════
  if (vtTab === 'onboarding') {
    panelHtml = renderVtOnboarding();
  }

  if (vtTab === 'documents') {
    var statusLabel = {done:'Done', inprogress:'In Progress', todo:'To Do', notstarted:'Not Started'};
    var statusCls   = {done:'sd', inprogress:'sp', todo:'sw', notstarted:'sw'};
    var docRows = (d.docs||[]).map(function(doc,i){
      var cls = statusCls[doc.status]||'sw';
      var lbl = statusLabel[doc.status]||doc.status;
      return '<tr>'
        + '<td style="color:var(--muted);font-size:12px">'+(i+1)+'</td>'
        + '<td style="font-weight:500">'+esc(doc.name)
        +   (doc.url?'&nbsp;<a href="'+esc(doc.url)+'" target="_blank" style="font-size:11px;color:var(--rose);text-decoration:none;font-weight:400">&#8599; Open</a>':'')
        + '</td>'
        + '<td><span class="stat '+cls+'">'+lbl+'</span></td>'
        + '<td style="color:var(--muted);font-size:13px">'+esc(doc.notes||'')+'</td>'
        + '<td style="text-align:right;white-space:nowrap">'
        +   '<button class="fin-row-edit" onclick="vtEditDoc(\''+doc.id+'\')">Edit</button>'
        +   '<button class="fin-row-edit" onclick="vtDeleteDoc(\''+doc.id+'\')" style="color:#EF4444">Del</button>'
        + '</td></tr>';
    }).join('');
    panelHtml = '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
      + '<div class="ct">Document Tracker</div>'
      + '<button class="btn btnp" style="font-size:12px;padding:6px 14px" onclick="vtEditDoc(null)">+ Add Document</button>'
      + '</div><div class="cb">'
      + '<table class="mt"><thead><tr><th>#</th><th>Document</th><th>Status</th><th>Notes</th><th></th></tr></thead>'
      + '<tbody>'+(docRows||'<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:20px">No documents yet.</td></tr>')+'</tbody></table>'
      + '</div></div>';
  }

  // ════════════════════════════════
  // FINANCES TAB
  // ════════════════════════════════
  if (vtTab === 'finances') {
    var fin = d.finances || {};
    var myFin   = fin.my      || {};
    var gSingle = fin.gSingle || {};
    var gDouble = fin.gDouble || {};

    // ── My costs ──
    var myNights = parseFloat(myFin.nights    || 0);
    var myRate   = parseFloat(myFin.roomRate  || 0);
    var myRooms  = parseFloat(myFin.splitRooms|| 6);
    var myFlight = parseFloat(myFin.flight    || 0);
    var myMeals  = parseFloat(myFin.meals     || 0);
    var myTaxi   = parseFloat(myFin.taxi      || 0);
    var myOther  = parseFloat(myFin.other     || 0);
    var myTotal  = (myNights * myRate) + myFlight + myMeals + myTaxi + myOther;
    var myPerRoom = myRooms > 0 ? myTotal / myRooms : 0;

    // ── Guest costs — single (per person) ──
    var gsRoom  = parseFloat(gSingle.room  || 0);
    var gsMeals = parseFloat(gSingle.meals || 0);
    var gsTour  = parseFloat(gSingle.tour  || 0);
    var gsTaxi  = parseFloat(gSingle.taxi  || 0);
    var gsOther = parseFloat(gSingle.other || 0);
    var gsBase  = gsRoom + gsMeals + gsTour + gsTaxi + gsOther;

    // ── Guest costs — double (per person sharing) ──
    var gdRoom  = parseFloat(gDouble.room  || 0);
    var gdMeals = parseFloat(gDouble.meals || 0);
    var gdTour  = parseFloat(gDouble.tour  || 0);
    var gdTaxi  = parseFloat(gDouble.taxi  || 0);
    var gdOther = parseFloat(gDouble.other || 0);
    var gdBase  = gdRoom + gdMeals + gdTour + gdTaxi + gdOther;

    // ── Totals inc. Latisha's allocation ──
    var totalSingle = gsBase + myPerRoom;
    var totalDouble = gdBase + (myPerRoom / 2);

    // ── Fee & charges ──
    var feeRate     = parseFloat(fin.feeRate   || 0);
    var chargeSingle = totalSingle + feeRate;
    var chargeDouble = totalDouble + feeRate;

    // ── Revenue: numSingle = persons, numDouble = persons ──
    var numSingle = parseInt(fin.numSingle || 0);
    var numDouble = parseInt(fin.numDouble || 0);   // persons, not rooms
    var revSingle = numSingle * chargeSingle;
    var revDouble = numDouble * chargeDouble;        // fixed: no * 2
    var totalRev  = revSingle + revDouble;
    var netProfit = totalRev - myTotal;

    var fmt = function(n){ return '$'+parseFloat(n).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}); };
    var inp = function(id,val,ph){
      return '<input id="vtf-'+id+'" class="sm-inp" type="number" min="0" step="0.01" value="'+(parseFloat(val||0))+'" placeholder="'+(ph||'0')+'" oninput="vtFinUpdate()" style="margin-top:4px">';
    };
    var inpInt = function(id,val,ph){
      return '<input id="vtf-'+id+'" class="sm-inp" type="number" min="0" step="1" value="'+(parseInt(val||0))+'" placeholder="'+(ph||'0')+'" oninput="vtFinUpdate()" style="margin-top:4px">';
    };

    panelHtml =

      // ── Row 1: My costs + Guest costs side by side ──
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">'

      // My costs card
      + '<div class="card"><div class="ch"><div class="ct">Your (Latisha) Travel Costs</div></div><div class="cb">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div class="sm-field"><label class="sm-lbl">Nights</label>'+inp('myNights',myFin.nights,'7')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Room rate / night ($)</label>'+inp('myRate',myFin.roomRate,'650')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Flight ($)</label>'+inp('myFlight',myFin.flight,'1200')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Meals ($)</label>'+inp('myMeals',myFin.meals,'110')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Taxi ($)</label>'+inp('myTaxi',myFin.taxi,'55')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Other ($)</label>'+inp('myOther',myFin.other,'0')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Split across rooms</label>'+inp('myRooms',myFin.splitRooms,'6')+'</div>'
      + '</div>'
      + '<div style="border-top:1px solid var(--sand);margin-top:16px;padding-top:14px">'
      + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:var(--muted)">Room ('+myNights+' nights × '+fmt(myRate)+')</span><span>'+fmt(myNights*myRate)+'</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:var(--muted)">Flight + Meals + Taxi + Other</span><span>'+fmt(myFlight+myMeals+myTaxi+myOther)+'</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-top:8px"><span>Total Personal Cost</span><span style="color:var(--rose)">'+fmt(myTotal)+'</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px;padding-top:8px;border-top:1px solid var(--sand)"><span style="color:var(--muted)">Per-room allocation (÷ '+myRooms+')</span><span style="font-weight:600">'+fmt(myPerRoom)+'</span></div>'
      + '</div></div></div>'

      // Guest costs card — BOTH single & double visible at once
      + '<div class="card"><div class="ch"><div class="ct">Guest Base Costs</div></div><div class="cb">'

      // Single column header
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:8px">'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:.8px;color:var(--rose);padding:6px 12px 6px 0;border-bottom:2px solid var(--rose)">SINGLE ROOM</div>'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:.8px;color:var(--charcoal);padding:6px 0 6px 12px;border-bottom:2px solid var(--charcoal)">DOUBLE ROOM <span style="font-weight:400;font-size:10px">(per person)</span></div>'
      + '</div>'

      // Input rows — single col | double col
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-top:8px">'
      + '<div class="sm-field"><label class="sm-lbl">Room ($)</label>'+inp('gsRoom',gSingle.room,'1200')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Room / person ($)</label>'+inp('gdRoom',gDouble.room,'600')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Meals ($)</label>'+inp('gsMeals',gSingle.meals,'110')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Meals ($)</label>'+inp('gdMeals',gDouble.meals,'110')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Tour activities ($)</label>'+inp('gsTour',gSingle.tour,'45')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Tour activities ($)</label>'+inp('gdTour',gDouble.tour,'45')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Taxis ($)</label>'+inp('gsTaxi',gSingle.taxi,'55')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Taxis ($)</label>'+inp('gdTaxi',gDouble.taxi,'55')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Other ($)</label>'+inp('gsOther',gSingle.other,'0')+'</div>'
      + '<div class="sm-field"><label class="sm-lbl">Other ($)</label>'+inp('gdOther',gDouble.other,'0')+'</div>'
      + '</div>'

      // Totals row
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;padding-top:12px;border-top:1px solid var(--sand)">'
      + '<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--muted)">Base / person</span><span style="font-weight:700;color:var(--rose)">'+fmt(gsBase)+'</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--muted)">Base / person</span><span style="font-weight:700;color:var(--charcoal)">'+fmt(gdBase)+'</span></div>'
      + '</div>'
      + '</div></div>'
      + '</div>'  // end row 1 grid

      // ── Row 2: Pricing & Revenue ──
      + '<div class="card"><div class="ch"><div class="ct">Pricing &amp; Revenue</div></div><div class="cb">'

      // Fee + charge summary
      + '<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:16px;margin-bottom:20px;align-items:start">'
      + '<div class="sm-field" style="min-width:160px"><label class="sm-lbl">Your fee / person ($)</label>'+inp('feeRate',fin.feeRate,'0')+'</div>'

      + '<div style="background:var(--warm);border-radius:10px;padding:14px">'
      +   '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--muted);margin-bottom:10px">COST BREAKDOWN (inc. your allocation)</div>'
      +   '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:var(--muted)">Single: base + allocation</span><span>'+fmt(gsBase)+' + '+fmt(myPerRoom)+' = '+fmt(totalSingle)+'</span></div>'
      +   '<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--muted)">Double p/p: base + allocation</span><span>'+fmt(gdBase)+' + '+fmt(myPerRoom/2)+' = '+fmt(totalDouble)+'</span></div>'
      + '</div>'

      + '<div style="background:var(--warm);border-radius:10px;padding:14px">'
      +   '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--muted);margin-bottom:10px">CHARGE TO CLIENT (cost + fee)</div>'
      +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
      +     '<span style="font-size:13px">Single</span>'
      +     '<span style="color:var(--rose);font-size:18px;font-weight:700">'+fmt(chargeSingle)+'</span>'
      +   '</div>'
      +   '<div style="display:flex;justify-content:space-between;align-items:center">'
      +     '<span style="font-size:13px">Double (per person)</span>'
      +     '<span style="color:var(--rose);font-size:18px;font-weight:700">'+fmt(chargeDouble)+'</span>'
      +   '</div>'
      + '</div>'
      + '</div>'

      // Client count inputs
      + '<div style="border-top:1px solid var(--sand);padding-top:16px;margin-bottom:16px">'
      + '<div style="font-size:12px;font-weight:700;letter-spacing:.8px;color:var(--muted);margin-bottom:12px">NUMBER OF CLIENTS</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'

      + '<div class="sm-field">'
      +   '<label class="sm-lbl">Single room clients</label>'
      +   inpInt('numSingle',fin.numSingle,'0')
      +   '<div style="font-size:11px;color:var(--muted);margin-top:5px">'+numSingle+' × '+fmt(chargeSingle)+' = <strong>'+fmt(revSingle)+'</strong></div>'
      + '</div>'

      + '<div class="sm-field">'
      +   '<label class="sm-lbl">Double room clients <span style="font-weight:400">(total persons)</span></label>'
      +   inpInt('numDouble',fin.numDouble,'0')
      +   '<div style="font-size:11px;color:var(--muted);margin-top:5px">'+numDouble+' × '+fmt(chargeDouble)+' = <strong>'+fmt(revDouble)+'</strong></div>'
      + '</div>'
      + '</div></div>'

      // Revenue summary tiles
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">'
      + '<div style="background:var(--warm);border-radius:10px;padding:14px">'
      +   '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">Single Revenue</div>'
      +   '<div style="font-size:20px;font-weight:700;color:var(--charcoal)">'+fmt(revSingle)+'</div>'
      + '</div>'
      + '<div style="background:var(--warm);border-radius:10px;padding:14px">'
      +   '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">Double Revenue</div>'
      +   '<div style="font-size:20px;font-weight:700;color:var(--charcoal)">'+fmt(revDouble)+'</div>'
      + '</div>'
      + '<div style="background:var(--warm);border-radius:10px;padding:14px">'
      +   '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">Total Revenue</div>'
      +   '<div style="font-size:20px;font-weight:700;color:var(--charcoal)">'+fmt(totalRev)+'</div>'
      + '</div>'
      + '<div style="background:'+(netProfit>=0?'#F0FDF4':'#FEF2F2')+';border-radius:10px;padding:14px">'
      +   '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">Net Profit</div>'
      +   '<div style="font-size:20px;font-weight:700;color:'+(netProfit>=0?'#10B981':'#EF4444')+'">'+fmt(netProfit)+'</div>'
      + '</div>'
      + '</div>'

      + '</div></div>';
  }

  el.innerHTML = tabBar + panelHtml;
}


function vtSetGuestTab(tab) {
  if (!vtData.finances) vtData.finances = {};
  vtData.finances.guestTab = tab;
  vtSave();
  renderVietnamTour();
}
function vtFinUpdate() {
  if (!vtData.finances) vtData.finances = {};
  var g = function(id){ var el=document.getElementById('vtf-'+id); return el?el.value:'0'; };
  vtData.finances.my = {
    nights:g('myNights'), roomRate:g('myRate'), splitRooms:g('myRooms'),
    flight:g('myFlight'), meals:g('myMeals'), taxi:g('myTaxi'), other:g('myOther')
  };
  vtData.finances.gSingle = { room:g('gsRoom'), meals:g('gsMeals'), tour:g('gsTour'), taxi:g('gsTaxi'), other:g('gsOther') };
  vtData.finances.gDouble = { room:g('gdRoom'), meals:g('gdMeals'), tour:g('gdTour'), taxi:g('gdTaxi'), other:g('gdOther') };
  vtData.finances.feeRate   = g('feeRate');
  vtData.finances.numSingle = g('numSingle');
  vtData.finances.numDouble = g('numDouble');
  vtSave();
  renderVietnamTour();
}

// ── Checklist actions ──
var _vtClModal = {clId:null, groupLabel:null, itemId:null};
function vtToggleItem(clId, itemId) {
  var cl = vtData.checklists.find(function(c){return c.id===clId;}); if (!cl) return;
  cl.groups.forEach(function(g){ g.items.forEach(function(it){ if(it.id===itemId) it.done=!it.done; }); });
  vtSave(); renderVietnamTour();
}
function vtDeleteItem(clId, itemId) {
  if (!confirm('Delete this task?')) return;
  var cl = vtData.checklists.find(function(c){return c.id===clId;}); if (!cl) return;
  cl.groups.forEach(function(g){ g.items = g.items.filter(function(it){return it.id!==itemId;}); });
  vtSave(); renderVietnamTour();
}
function vtEditItem(clId, itemId) {
  var cl = vtData.checklists.find(function(c){return c.id===clId;}); if (!cl) return;
  var item = null;
  cl.groups.forEach(function(g){ g.items.forEach(function(it){ if(it.id===itemId) item=it; }); });
  if (!item) return;
  _vtClModal = {clId:clId, groupLabel:null, itemId:itemId};
  document.getElementById('vtcm-text').value = item.text;
  document.getElementById('vtcm-heading').textContent = 'Edit Task';
  document.getElementById('vtcm-del').style.display = 'inline-block';
  document.getElementById('vtcm-err').textContent = '';
  document.getElementById('vt-checklist-modal').style.display = 'flex';
}
function vtOpenChecklistModal(clId, groupLabel) {
  _vtClModal = {clId:clId, groupLabel:groupLabel||null, itemId:null};
  document.getElementById('vtcm-text').value = '';
  document.getElementById('vtcm-heading').textContent = 'Add Task';
  document.getElementById('vtcm-del').style.display = 'none';
  document.getElementById('vtcm-err').textContent = '';
  document.getElementById('vt-checklist-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('vtcm-text').focus(); },100);
}
function closeVtChecklistModal() { document.getElementById('vt-checklist-modal').style.display = 'none'; }
function saveVtChecklistItem() {
  var text = document.getElementById('vtcm-text').value.trim();
  if (!text) { document.getElementById('vtcm-err').textContent = 'Task text is required.'; return; }
  var cl = vtData.checklists.find(function(c){return c.id===_vtClModal.clId;}); if (!cl) return;
  if (_vtClModal.itemId) {
    // Edit existing
    cl.groups.forEach(function(g){ g.items.forEach(function(it){ if(it.id===_vtClModal.itemId) it.text=text; }); });
  } else {
    // Add new — find group or use first group
    var grp = _vtClModal.groupLabel ? cl.groups.find(function(g){return g.label===_vtClModal.groupLabel;}) : cl.groups[0];
    if (!grp) { grp = {label:'General', items:[]}; cl.groups.push(grp); }
    grp.items.push({id:'vt'+Date.now(), text:text, done:false});
  }
  closeVtChecklistModal(); vtSave(); renderVietnamTour();
}

// ── Document actions ──
var _vtDocId = null;
function vtEditDoc(docId) {
  _vtDocId = docId;
  var doc = docId ? (vtData.docs||[]).find(function(d){return d.id===docId;}) : null;
  document.getElementById('vtdm-heading').textContent = doc ? 'Edit Document' : 'Add Document';
  document.getElementById('vtdm-name').value   = doc ? (doc.name||'')   : '';
  document.getElementById('vtdm-status').value = doc ? (doc.status||'inprogress') : 'inprogress';
  document.getElementById('vtdm-url').value    = doc ? (doc.url||'')    : '';
  document.getElementById('vtdm-notes').value  = doc ? (doc.notes||'')  : '';
  document.getElementById('vtdm-del').style.display = doc ? 'inline-block' : 'none';
  document.getElementById('vtdm-err').textContent = '';
  document.getElementById('vt-doc-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('vtdm-name').focus(); },100);
}
function closeVtDocModal() { document.getElementById('vt-doc-modal').style.display = 'none'; }
function saveVtDoc() {
  var name = document.getElementById('vtdm-name').value.trim();
  if (!name) { document.getElementById('vtdm-err').textContent = 'Name is required.'; return; }
  if (!vtData.docs) vtData.docs = [];
  var obj = { name:name, status:document.getElementById('vtdm-status').value, url:document.getElementById('vtdm-url').value.trim(), notes:document.getElementById('vtdm-notes').value.trim() };
  if (_vtDocId) {
    var idx = vtData.docs.findIndex(function(d){return d.id===_vtDocId;});
    if (idx>-1) vtData.docs[idx] = Object.assign({id:_vtDocId}, obj);
  } else {
    obj.id = 'd'+Date.now();
    vtData.docs.push(obj);
  }
  closeVtDocModal(); vtSave(); renderVietnamTour();
}
function vtDeleteDoc(docId) {
  if (!confirm('Delete this document?')) return;
  vtData.docs = vtData.docs.filter(function(d){return d.id!==docId;});
  vtSave(); renderVietnamTour();
}

// ── Client actions ──
var _vtClientList = null, _vtClientIdx = null;
function vtEditClient(list, idx) {
  _vtClientList = list; _vtClientIdx = idx;
  var arr = list==='booked' ? (vtData.bookedClients||[]) : (vtData.intClients||[]);
  var c = (idx!==null && idx>=0) ? arr[idx] : {};
  var isBooked = list==='booked';
  document.getElementById('vtcl-heading').textContent = (idx!==null&&idx>=0) ? 'Edit Client' : ('Add '+(isBooked?'Booked':'Interested')+' Client');
  document.getElementById('vtcl-name').value     = c.name     || '';
  document.getElementById('vtcl-package').value  = c.package  || '';
  document.getElementById('vtcl-partner').value  = c.partner  || '';
  document.getElementById('vtcl-notes').value    = c.notes    || '';
  document.getElementById('vtcl-contract').value = c.contract || '';
  document.getElementById('vtcl-pkg-row').style.display     = isBooked ? 'block' : 'none';
  document.getElementById('vtcl-partner-row').style.display = (isBooked && c.package==='Double') ? 'block' : 'none';
  document.getElementById('vtcl-del').style.display = (idx!==null&&idx>=0) ? 'inline-block' : 'none';
  document.getElementById('vtcl-err').textContent = '';
  document.getElementById('vt-client-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('vtcl-name').focus(); },100);
}

function vtTogglePartner() {
  var pkg = document.getElementById('vtcl-package').value;
  document.getElementById('vtcl-partner-row').style.display = (pkg === 'Double') ? 'block' : 'none';
  if (pkg !== 'Double') document.getElementById('vtcl-partner').value = '';
}

function closeVtClientModal() { document.getElementById('vt-client-modal').style.display = 'none'; }
function saveVtClient() {
  var name = document.getElementById('vtcl-name').value.trim();
  if (!name) { document.getElementById('vtcl-err').textContent = 'Name is required.'; return; }
  var pkg     = document.getElementById('vtcl-package').value;
  var partner = document.getElementById('vtcl-partner').value.trim();
  if (pkg === 'Double' && !partner) { document.getElementById('vtcl-err').textContent = 'Please enter the partner\'s name.'; return; }
  var lk = _vtClientList==='booked' ? 'bookedClients' : 'intClients';
  if (!vtData[lk]) vtData[lk] = [];
  var obj = {
    name:     name,
    package:  pkg,
    partner:  partner,
    notes:    document.getElementById('vtcl-notes').value.trim(),
    contract: document.getElementById('vtcl-contract').value.trim()
  };
  if (_vtClientIdx!==null && _vtClientIdx>=0) vtData[lk][_vtClientIdx]=obj; else vtData[lk].push(obj);
  closeVtClientModal(); vtSave(); renderVietnamTour();
}

function vtDeleteClient(list, idx) {
  if (!confirm('Remove this client?')) return;
  var lk = list==='booked'?'bookedClients':'intClients';
  if (!vtData[lk]) return;
  vtData[lk].splice(idx,1); vtSave(); renderVietnamTour();
}

