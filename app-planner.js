// ════════════════════════════════════════════════════════
// TOURS
// ════════════════════════════════════════════════════════
var tourTaskIdSeq = 100;
var editingTourId = null;
var tours = [];

function fmtTourDate(d) {
  if (!d) return '\u2014';
  var p = d.split('-'); if (p.length < 3) return d;
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(p[2]) + ' ' + mo[parseInt(p[1])-1];
}
function tourRevenue(t) {
  return (t.bookings.standard||0)*(t.bookings.standardRate||349)+(t.bookings.premium||0)*(t.bookings.premiumRate||445);
}
function tourTotalCost(t) {
  return (t.flights||[]).reduce(function(s,f){return s+(f.cost||0);},0)+(t.accommodation?(t.accommodation.cost||0):0);
}
function tourTaskProg(t) {
  var tasks = t.tasks||[];
  var done  = tasks.filter(function(tk){return tk.status==='done';}).length;
  return {done:done, total:tasks.length};
}

function renderToursPage() {
  var el = document.getElementById('tours-list'); if (!el) return;
  el.innerHTML = '';
  if (!tours.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:60px 0;text-align:center">No tours yet. Click \u201c+ New Tour\u201d to plan your first.</div>';
    return;
  }
  tours.forEach(function(t) {
    var card = buildTourCard(t);
    card.id = 'tour-card-' + t.id;
    el.appendChild(card);
  });
}

function buildTourCard(t) {
  var rev   = tourRevenue(t);
  var costs = tourTotalCost(t);
  var net   = rev - costs;
  var prog  = tourTaskProg(t);
  var stCls = {upcoming:'upcoming',active:'active',done:'done'}[t.status]||'upcoming';
  var acc   = t.accommodation||{};
  var activeTab = t.activeTab||'flights';

  // ── flight summary lines ──
  var flightLines = (t.flights||[]).map(function(f) {
    return '<div class="tour-sum-line">'
      + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
      + '<span>' + esc(f.flightNo||'') + '</span>'
      + esc(f.dep||'') + ' \u2192 ' + esc(f.arr||'')
      + (f.cost ? ' \u00b7 $' + f.cost : '')
      + '</div>';
  }).join('');

  var accLine = acc.name ? (
    '<div class="tour-sum-line">'
    + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
    + esc(acc.name)
    + (acc.checkin ? ' \u00b7 ' + fmtTourDate(acc.checkin) + '\u2013' + fmtTourDate(acc.checkout) : '')
    + (acc.cost ? ' \u00b7 $' + acc.cost : '')
    + '</div>'
  ) : '';

  var progPct = prog.total ? Math.round(prog.done/prog.total*100) : 0;

  // ── snapshot (collapsed header) ──
  var snapHtml =
    '<div class="tour-snap" onclick="toggleTour(\'' + t.id + '\')">'
    + '<div class="tour-snap-main">'
    + '<div class="tour-snap-city">' + esc(t.city) + (t.state ? ', ' + esc(t.state) : '') + '</div>'
    + '<div class="tour-snap-sub">' + fmtTourDate(t.travelDateStart) + ' \u2013 ' + fmtTourDate(t.travelDateEnd) + '</div>'
    + '<div class="tour-snap-tiles">'
    + '<div class="tour-snap-tile" style="background:#EEF2FF">'
    + '<div class="tour-snap-tile-lbl">&#9992; Travel</div>'
    + '<div class="tour-snap-tile-val">' + fmtTourDate(t.travelDateStart) + ' \u2013 ' + fmtTourDate(t.travelDateEnd) + '</div>'
    + '</div>'
    + '<div class="tour-snap-tile" style="background:#FEF3C7">'
    + '<div class="tour-snap-tile-lbl">&#128197; Client Days</div>'
    + '<div class="tour-snap-tile-val">' + fmtTourDate(t.clientDateStart) + ' \u2013 ' + fmtTourDate(t.clientDateEnd) + '</div>'
    + '</div>'
    + (flightLines || accLine ? '<div class="tour-snap-tile" style="background:var(--warm);flex:2">'
    + '<div class="tour-snap-tile-lbl">&#128205; Details</div>'
    + '<div class="tour-summary-lines">' + flightLines + accLine + '</div>'
    + '</div>' : '')
    + '</div>'
    + '</div>'
    + '<div class="tour-snap-right">'
    + '<div class="tour-snap-meta">'
    + '<span class="tour-status ' + stCls + '">' + cap(t.status) + '</span>'
    + (curUser==='latisha' ? '<div class="tour-snap-rev">' + '<div class="tour-snap-fin-row"><div class="tour-snap-rev-lbl">Revenue</div><div class="tour-snap-rev-val">$' + rev.toLocaleString() + '</div></div>' + '<div class="tour-snap-fin-row"><div class="tour-snap-rev-lbl">Costs</div><div class="tour-snap-rev-val" style="color:#EF4444">−$' + costs.toLocaleString() + '</div></div>' + '<div class="tour-snap-fin-row" style="border-top:1px solid var(--sand);padding-top:6px;margin-top:4px"><div class="tour-snap-rev-lbl" style="font-weight:700">Net</div><div class="tour-snap-rev-val" style="color:' + (net>=0?'#10B981':'#EF4444') + ';font-size:18px">' + (net>=0?'$':'−$') + Math.abs(net).toLocaleString() + '</div></div>' + '</div>' : '')
    + '</div>'
    + '<div>'
    + '<div class="tour-task-prog">' + prog.done + '/' + prog.total + ' tasks</div>'
    + '<div class="tour-task-prog-bar"><div class="tour-task-prog-fill" style="width:' + progPct + '%"></div></div>'
    + '</div>'
    + (curUser==='latisha' ? '<button class="btn btns" style="font-size:11px;padding:4px 12px" onclick="event.stopPropagation();openTourEditModal(\'' + t.id + '\')">Edit</button>' : '')
    + '<div class="tour-expand' + (t.isOpen?' open':'') + '">&#9662;</div>'
    + '</div>'
    + '</div>';

  // ── tab panels ──
  // Flights tab
  var flightRows = (t.flights||[]).map(function(f,i) {
    return '<div class="tour-info-grid" style="margin-bottom:12px">'
      + '<div class="tour-info-col"><div class="tour-info-lbl">Airline</div><div class="tour-info-val">' + esc(f.airline||'\u2014') + '</div></div>'
      + '<div class="tour-info-col"><div class="tour-info-lbl">Flight No.</div><div class="tour-info-val">' + esc(f.flightNo||'\u2014') + '</div></div>'
      + '<div class="tour-info-col"><div class="tour-info-lbl">Departs</div><div class="tour-info-val">' + esc(f.dep||'\u2014') + '</div></div>'
      + '<div class="tour-info-col"><div class="tour-info-lbl">Arrives</div><div class="tour-info-val">' + esc(f.arr||'\u2014') + '</div></div>'
      + '<div class="tour-info-col"><div class="tour-info-lbl">Cost</div><div class="tour-info-val">$' + (f.cost||0) + '</div></div>'
      + (curUser==='latisha' ? '<div class="tour-info-col" style="justify-content:flex-end"><button class="fin-row-edit" onclick="openFlightModal(\'' + t.id + '\',' + i + ')">Edit</button></div>' : '')
      + '</div>';
  }).join('');

  var flightsPanel = '<div class="tour-section-hd">'
    + '<div class="tour-sec-title">Flights</div>'
    + (curUser==='latisha' ? '<button class="fin-row-edit" onclick="openFlightModal(\'' + t.id + '\',null)">+ Add Flight</button>' : '')
    + '</div>'
    + (flightRows || '<div style="color:var(--muted);font-size:13px;padding:12px 0">No flights added yet.</div>');

  // Stay tab
  var stayPanel = '<div class="tour-section-hd">'
    + '<div class="tour-sec-title">Accommodation</div>'
    + (curUser==='latisha' ? '<button class="fin-row-edit" onclick="openAccModal(\'' + t.id + '\')">Edit</button>' : '')
    + '</div>'
    + (acc.name
      ? '<div class="tour-info-grid">'
        + '<div class="tour-info-col"><div class="tour-info-lbl">Hotel</div><div class="tour-info-val">' + esc(acc.name) + '</div></div>'
        + '<div class="tour-info-col"><div class="tour-info-lbl">Address</div><div class="tour-info-val">' + esc(acc.address||'\u2014') + '</div></div>'
        + '<div class="tour-info-col"><div class="tour-info-lbl">Check-in</div><div class="tour-info-val">' + fmtTourDate(acc.checkin) + '</div></div>'
        + '<div class="tour-info-col"><div class="tour-info-lbl">Check-out</div><div class="tour-info-val">' + fmtTourDate(acc.checkout) + '</div></div>'
        + '<div class="tour-info-col"><div class="tour-info-lbl">Total Cost</div><div class="tour-info-val">$' + (acc.cost||0) + '</div></div>'
        + '</div>'
      : '<div style="color:var(--muted);font-size:13px;padding:12px 0">No accommodation added yet.</div>');

  // Bookings tab (Latisha only)
  var bookingsPanel = curUser==='latisha' ? (
    '<div class="tour-bookings-grid">'
    + '<div class="tour-bk-cell"><div class="tour-info-lbl">Standard Clients</div><input type="number" min="0" value="' + (t.bookings.standard||0) + '" class="tour-rev-input" oninput="updateBooking(\'' + t.id + '\',\'standard\',this.value)"></div>'
    + '<div class="tour-bk-cell"><div class="tour-info-lbl">Standard Rate ($)</div><input type="number" min="0" value="' + (t.bookings.standardRate||349) + '" class="tour-rev-input" oninput="updateBooking(\'' + t.id + '\',\'standardRate\',this.value)"></div>'
    + '<div class="tour-bk-cell"><div class="tour-info-lbl">Premium Clients</div><input type="number" min="0" value="' + (t.bookings.premium||0) + '" class="tour-rev-input" oninput="updateBooking(\'' + t.id + '\',\'premium\',this.value)"></div>'
    + '<div class="tour-bk-cell"><div class="tour-info-lbl">Premium Rate ($)</div><input type="number" min="0" value="' + (t.bookings.premiumRate||445) + '" class="tour-rev-input" oninput="updateBooking(\'' + t.id + '\',\'premiumRate\',this.value)"></div>'
    + '</div>'
    + '<div class="tour-rev-summary">'
    + '<div class="tour-rev-row"><div class="tour-rev-lbl">Standard</div><div class="tour-rev-num">' + (t.bookings.standard||0) + ' \u00d7 $' + (t.bookings.standardRate||349) + ' = $' + ((t.bookings.standard||0)*(t.bookings.standardRate||349)).toLocaleString() + '</div></div>'
    + '<div class="tour-rev-row"><div class="tour-rev-lbl">Premium</div><div class="tour-rev-num">' + (t.bookings.premium||0) + ' \u00d7 $' + (t.bookings.premiumRate||445) + ' = $' + ((t.bookings.premium||0)*(t.bookings.premiumRate||445)).toLocaleString() + '</div></div>'
    + '<div style="border-top:1px solid var(--sand);padding-top:10px">'
    + '<div class="tour-rev-row"><div class="tour-rev-lbl">Projected Revenue</div><div class="tour-rev-total">$' + rev.toLocaleString() + '</div></div>'
    + '<div class="tour-rev-row" style="margin-top:6px"><div class="tour-rev-lbl">Travel Costs</div><div class="tour-rev-num" style="color:#EF4444">\u2212 $' + costs.toLocaleString() + '</div></div>'
    + '<div class="tour-rev-row" style="margin-top:6px"><div class="tour-rev-lbl">Net</div><div class="tour-rev-total" style="color:' + (net>=0?'#10B981':'#EF4444') + '">$' + net.toLocaleString() + '</div></div>'
    + '</div></div>'
  ) : '<div style="color:var(--muted);font-size:13px;padding:12px 0">Revenue details are private.</div>';

  // Tasks tab
  var taskRows = '';
  (t.tasks||[]).forEach(function(tk) {
    var icon = tk.status==='done'?'&#10003;':tk.status==='in-progress'?'&#9680;':'';
    var cls  = 'ttk-'+tk.status;
    taskRows += '<div class="tour-task2">'
      + '<div class="tour-task2-ck ' + cls + '" onclick="cycleTourTask(\'' + t.id + '\',\'' + tk.id + '\')">' + icon + '</div>'
      + '<div style="flex:1">'
      + '<div class="tour-task2-txt' + (tk.status==='done'?' done':'') + '">' + esc(tk.text) + '</div>'
      + (tk.notes ? '<div class="tour-task2-note">' + esc(tk.notes) + '</div>' : '')
      + '</div>'
      + '<button class="fin-row-edit" onclick="deleteTourTask(\'' + t.id + '\',\'' + tk.id + '\')">&#215;</button>'
      + '</div>';
  });
  var tasksPanel = '<div class="tour-section-hd">'
    + '<div class="tour-sec-title">Tasks &mdash; ' + prog.done + ' of ' + prog.total + ' done</div>'
    + '<button class="fin-row-edit" onclick="openTourTaskModal(\'' + t.id + '\')">+ Add Task</button>'
    + '</div>'
    + (taskRows || '<div style="color:var(--muted);font-size:13px;padding:12px 0">No tasks yet.</div>');


  // ── Documents panel ──
  var docs = t.docs || [];
  var docRows = docs.map(function(d,di){
    var tid = t.id;
    return '<div class="tour-doc-row">'
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">' + esc(d.name||'Untitled') + '</div>'
      +   (d.notes ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + esc(d.notes) + '</div>' : '')
      + '</div>'
      + (d.url ? '<a href="'+esc(d.url)+'" target="_blank" class="fin-row-edit" style="text-decoration:none;margin-right:4px">Open &#8599;</a>' : '')
      + '<button class="fin-row-edit" onclick="openTourDocModal(\''+tid+'\','+di+')">Edit</button>'
      + '<button class="fin-row-edit" onclick="deleteTourDoc(\''+tid+'\','+di+')" style="color:#EF4444">Del</button>'
      + '</div>';
  }).join('');
  var docsPanel = '<div class="tour-section-hd">'
    + '<div class="tour-sec-title">Documents &amp; Links</div>'
    + '<button class="fin-row-edit" onclick="openTourDocModal(\''+t.id+'\',null)">+ Add</button>'
    + '</div>'
    + (docRows || '<div style="color:var(--muted);font-size:13px;padding:12px 0">No documents yet. Add files, Canva links or any URL.</div>');

  // ── Clients panel ──
  var bookedClients = t.bookedClients || [];
  var intClients    = t.intClients    || [];
  var bookedRows = bookedClients.map(function(c,ci){
    var tid = t.id;
    return '<div class="tour-doc-row">'
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">' + esc(c.name) + '</div>'
      +   (c.package ? '<span style="font-size:10px;background:var(--rose);color:#fff;padding:2px 8px;border-radius:10px;margin-top:3px;display:inline-block">' + esc(c.package) + '</span>' : '')
      +   (c.notes ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + esc(c.notes) + '</div>' : '')
      + '</div>'
      + '<button class="fin-row-edit" onclick="openTourClientModal(\''+tid+'\',\'booked\','+ci+')">Edit</button>'
      + '<button class="fin-row-edit" onclick="deleteTourClient(\''+tid+'\',\'booked\','+ci+')" style="color:#EF4444">Del</button>'
      + '</div>';
  }).join('');
  var intRows = intClients.map(function(c,ci){
    var tid = t.id;
    return '<div class="tour-doc-row">'
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">' + esc(c.name) + '</div>'
      +   (c.notes ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + esc(c.notes) + '</div>' : '')
      + '</div>'
      + '<button class="fin-row-edit" onclick="openTourClientModal(\''+tid+'\',\'int\','+ci+')">Edit</button>'
      + '<button class="fin-row-edit" onclick="deleteTourClient(\''+tid+'\',\'int\','+ci+')" style="color:#EF4444">Del</button>'
      + '</div>';
  }).join('');
  var clientsPanel = '<div class="tour-section-hd">'
    + '<div class="tour-sec-title">Booked <span style="font-size:12px;font-weight:400;color:var(--muted)">('+bookedClients.length+')</span></div>'
    + '<button class="fin-row-edit" onclick="openTourClientModal(\''+t.id+'\',\'booked\',null)">+ Add</button>'
    + '</div>'
    + (bookedRows || '<div style="color:var(--muted);font-size:13px;padding:8px 0">No booked clients yet.</div>')
    + '<div class="tour-section-hd" style="margin-top:20px">'
    + '<div class="tour-sec-title">Interested <span style="font-size:12px;font-weight:400;color:var(--muted)">('+intClients.length+')</span></div>'
    + '<button class="fin-row-edit" onclick="openTourClientModal(\''+t.id+'\',\'int\',null)">+ Add</button>'
    + '</div>'
    + (intRows || '<div style="color:var(--muted);font-size:13px;padding:8px 0">No interested clients yet.</div>');

  var tabs = [
    {id:'flights',  label:'Flights',   content:flightsPanel},
    {id:'stay',     label:'Stay',      content:stayPanel},
    {id:'bookings', label:'Bookings',  content:bookingsPanel},
    {id:'clients',  label:'Clients',   content:clientsPanel},
    {id:'docs',     label:'Docs',      content:docsPanel},
    {id:'tasks',    label:'Tasks',     content:tasksPanel}
  ];

  var tabsHtml = '<div class="tour-tabs">'
    + tabs.map(function(tab) {
        return '<div class="tour-tab' + (activeTab===tab.id?' on':'') + '" onclick="switchTourTab(\'' + t.id + '\',\'' + tab.id + '\')">' + tab.label + '</div>';
      }).join('')
    + '</div>'
    + tabs.map(function(tab) {
        return '<div class="tour-tab-panel' + (activeTab===tab.id?' on':'') + '" id="ttp-' + t.id + '-' + tab.id + '">'
          + '<div style="padding:0">' + tab.content + '</div></div>';
      }).join('');

  var card = document.createElement('div');
  card.className = 'tour-card';
  card.innerHTML = snapHtml
    + '<div class="tour-body2' + (t.isOpen?' open':'') + '">'
    + tabsHtml
    + '</div>';
  return card;
}

function toggleTour(id) {
  var t = tours.find(function(x){return x.id===id;}); if (!t) return;
  t.isOpen = !t.isOpen; renderToursPage();
}
function switchTourTab(tourId, tab) {
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  t.activeTab = tab;
  // Toggle panels without full re-render for smoothness
  var panels = document.querySelectorAll('[id^="ttp-' + tourId + '-"]');
  panels.forEach(function(p){ p.classList.remove('on'); });
  var active = document.getElementById('ttp-' + tourId + '-' + tab);
  if (active) active.classList.add('on');
  var tabEls = document.querySelectorAll('#tour-card-' + tourId + ' .tour-tab');
  tabEls.forEach(function(el){ el.classList.remove('on'); if(el.onclick&&el.onclick.toString().includes("'"+tab+"'")); });
  // Re-render just this card to keep tabs in sync
  renderToursPage();
}
function updateTourRev(id,field,val) { updateBooking(id,field,val); }
function updateBooking(id,field,val) {
  var t = tours.find(function(x){return x.id===id;}); if (!t) return;
  t.bookings[field] = parseFloat(val)||0; saveData(); renderToursPage();
}
function cycleTourTask(tourId,taskId) {
  var t  = tours.find(function(x){return x.id===tourId;});  if (!t)  return;
  var tk = t.tasks.find(function(x){return x.id===taskId;}); if (!tk) return;
  var c  = ['todo','in-progress','done'];
  tk.status = c[(c.indexOf(tk.status)+1)%c.length];
  saveData(); renderToursPage();
}
function deleteTourTask(tourId,taskId) {
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  t.tasks = t.tasks.filter(function(tk){return tk.id!==taskId;});
  saveData(); renderToursPage();
}

function openTourModal() { openTourEditModal(null); }
function openTourEditModal(id) {
  var t = id ? tours.find(function(x){return x.id===id;}) : null;
  editingTourId = id||null;
  document.getElementById('tem-heading').textContent = t ? 'Edit Tour' : 'New Tour';
  document.getElementById('tem-city').value          = t ? t.city : '';
  document.getElementById('tem-state').value         = t ? (t.state||'') : '';
  document.getElementById('tem-status').value        = t ? t.status : 'upcoming';
  document.getElementById('tem-travel-start').value  = t ? (t.travelDateStart||'') : '';
  document.getElementById('tem-travel-end').value    = t ? (t.travelDateEnd||'') : '';
  document.getElementById('tem-client-start').value  = t ? (t.clientDateStart||'') : '';
  document.getElementById('tem-client-end').value    = t ? (t.clientDateEnd||'') : '';
  document.getElementById('tem-err').textContent     = '';
  document.getElementById('tem-del').style.display   = t ? 'inline-block' : 'none';
  document.getElementById('tour-edit-modal').style.display = 'flex';
}
function closeTourEditModal() { document.getElementById('tour-edit-modal').style.display='none'; }
function saveTourEdit() {
  var city = document.getElementById('tem-city').value.trim();
  if (!city) { document.getElementById('tem-err').textContent='City is required.'; return; }
  if (editingTourId) {
    var t = tours.find(function(x){return x.id===editingTourId;}); if (!t) return;
    t.city=city; t.state=document.getElementById('tem-state').value.trim();
    t.status=document.getElementById('tem-status').value;
    t.travelDateStart=document.getElementById('tem-travel-start').value;
    t.travelDateEnd=document.getElementById('tem-travel-end').value;
    t.clientDateStart=document.getElementById('tem-client-start').value;
    t.clientDateEnd=document.getElementById('tem-client-end').value;
  } else {
    tours.push({id:'t'+Date.now(),city:city,state:document.getElementById('tem-state').value.trim(),
      status:'upcoming',
      travelDateStart:document.getElementById('tem-travel-start').value,
      travelDateEnd:document.getElementById('tem-travel-end').value,
      clientDateStart:document.getElementById('tem-client-start').value,
      clientDateEnd:document.getElementById('tem-client-end').value,
      flights:[],accommodation:{name:'',address:'',checkin:'',checkout:'',cost:0},
      bookings:{standard:0,premium:0,standardRate:349,premiumRate:445},
      activeTab:'flights',isOpen:true,tasks:[]});
  }
  closeTourEditModal(); saveData(); renderToursPage();
}
function deleteTour() {
  if (!editingTourId||!confirm('Delete this tour?')) return;
  tours = tours.filter(function(t){return t.id!==editingTourId;});
  closeTourEditModal(); saveData(); renderToursPage();
}

var editingFlightTourId=null, editingFlightIdx=null;
function openFlightModal(tourId,idx) {
  editingFlightTourId=tourId; editingFlightIdx=idx;
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  var f = (idx!==null&&idx>=0) ? t.flights[idx] : null;
  document.getElementById('flt-heading').textContent    = f?'Edit Flight':'Add Flight';
  document.getElementById('flt-airline').value          = f?(f.airline||''):'';
  document.getElementById('flt-no').value               = f?(f.flightNo||''):'';
  document.getElementById('flt-dep').value              = f?(f.dep||''):'';
  document.getElementById('flt-arr').value              = f?(f.arr||''):'';
  document.getElementById('flt-cost').value             = f?(f.cost||''):'';
  document.getElementById('flt-del').style.display      = f?'inline-block':'none';
  document.getElementById('flt-err').textContent        = '';
  document.getElementById('flight-modal').style.display = 'flex';
}

function deleteCurrentFlight() {
  if (!confirm('Delete this flight?')) return;
  var t = tours.find(function(x){return x.id===editingFlightTourId;}); if (!t) return;
  if (editingFlightIdx !== null && editingFlightIdx >= 0) {
    t.flights.splice(editingFlightIdx, 1);
  }
  closeFlightModal(); saveData(); renderToursPage();
}

function closeFlightModal() { document.getElementById('flight-modal').style.display='none'; }
function saveFlight() {
  var airline = document.getElementById('flt-airline').value.trim();
  if (!airline) { document.getElementById('flt-err').textContent='Airline is required.'; return; }
  var t = tours.find(function(x){return x.id===editingFlightTourId;}); if (!t) return;
  var obj = {id:'f'+Date.now(),airline:airline,flightNo:document.getElementById('flt-no').value.trim(),dep:document.getElementById('flt-dep').value.trim(),arr:document.getElementById('flt-arr').value.trim(),cost:parseFloat(document.getElementById('flt-cost').value)||0};
  if (editingFlightIdx!==null&&editingFlightIdx>=0) t.flights[editingFlightIdx]=obj; else t.flights.push(obj);
  closeFlightModal(); saveData(); renderToursPage();
}
function deleteFlight() {
  if (!confirm('Remove this flight?')) return;
  var t = tours.find(function(x){return x.id===editingFlightTourId;}); if (!t) return;
  t.flights.splice(editingFlightIdx,1); closeFlightModal(); saveData(); renderToursPage();
}

var editingAccTourId=null;

var editingDocTourId = null, editingDocIdx = null;
var editingClientTourId = null, editingClientList = null, editingClientIdx = null;

function openTourDocModal(tourId, idx) {
  editingDocTourId = tourId; editingDocIdx = idx;
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  if (!t.docs) t.docs = [];
  var d = (idx !== null && idx >= 0) ? t.docs[idx] : {};
  document.getElementById('tdm-name').value  = d.name  || '';
  document.getElementById('tdm-url').value   = d.url   || '';
  document.getElementById('tdm-notes').value = d.notes || '';
  document.getElementById('tdm-err').textContent = '';
  document.getElementById('tdm-del').style.display = (idx !== null && idx >= 0) ? 'inline-block' : 'none';
  document.getElementById('tour-doc-modal').style.display = 'flex';
}
function closeTourDocModal() { document.getElementById('tour-doc-modal').style.display = 'none'; }
function saveTourDoc() {
  var name = document.getElementById('tdm-name').value.trim();
  if (!name) { document.getElementById('tdm-err').textContent = 'Name is required.'; return; }
  var t = tours.find(function(x){return x.id===editingDocTourId;}); if (!t) return;
  if (!t.docs) t.docs = [];
  var obj = { name:name, url:document.getElementById('tdm-url').value.trim(), notes:document.getElementById('tdm-notes').value.trim() };
  if (editingDocIdx !== null && editingDocIdx >= 0) t.docs[editingDocIdx] = obj; else t.docs.push(obj);
  closeTourDocModal(); saveData(); renderToursPage();
}
function deleteTourDoc(tourId, idx) {
  var t = tours.find(function(x){return x.id===tourId;}); if (!t || !t.docs) return;
  if (!confirm('Delete this document?')) return;
  t.docs.splice(idx, 1); saveData(); renderToursPage();
}

function openTourClientModal(tourId, list, idx) {
  editingClientTourId = tourId; editingClientList = list; editingClientIdx = idx;
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  var arr = list === 'booked' ? (t.bookedClients||[]) : (t.intClients||[]);
  var c = (idx !== null && idx >= 0) ? arr[idx] : {};
  var isBooked = (list === 'booked');
  document.getElementById('tcm-heading').textContent = (idx !== null && idx >= 0) ? 'Edit Client' : ('Add ' + (isBooked ? 'Booked' : 'Interested') + ' Client');
  document.getElementById('tcm-name').value    = c.name    || '';
  document.getElementById('tcm-package').value = c.package || '';
  document.getElementById('tcm-notes').value   = c.notes   || '';
  document.getElementById('tcm-package-row').style.display = isBooked ? 'block' : 'none';
  document.getElementById('tcm-err').textContent = '';
  document.getElementById('tcm-del').style.display = (idx !== null && idx >= 0) ? 'inline-block' : 'none';
  document.getElementById('tour-client-modal').style.display = 'flex';
}
function closeTourClientModal() { document.getElementById('tour-client-modal').style.display = 'none'; }
function saveTourClient() {
  var name = document.getElementById('tcm-name').value.trim();
  if (!name) { document.getElementById('tcm-err').textContent = 'Name is required.'; return; }
  var t = tours.find(function(x){return x.id===editingClientTourId;}); if (!t) return;
  var lk = editingClientList === 'booked' ? 'bookedClients' : 'intClients';
  if (!t[lk]) t[lk] = [];
  var obj = { name:name, package:document.getElementById('tcm-package').value.trim(), notes:document.getElementById('tcm-notes').value.trim() };
  if (editingClientIdx !== null && editingClientIdx >= 0) t[lk][editingClientIdx] = obj; else t[lk].push(obj);
  closeTourClientModal(); saveData(); renderToursPage();
}
function deleteTourClient(tourId, list, idx) {
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  var lk = list === 'booked' ? 'bookedClients' : 'intClients';
  if (!t[lk]) return;
  if (!confirm('Remove this client?')) return;
  t[lk].splice(idx, 1); saveData(); renderToursPage();
}

function openAccModal(tourId) {
  editingAccTourId=tourId;
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  var a = t.accommodation||{};
  document.getElementById('acc-name').value     = a.name||'';
  document.getElementById('acc-address').value  = a.address||'';
  document.getElementById('acc-checkin').value  = a.checkin||'';
  document.getElementById('acc-checkout').value = a.checkout||'';
  document.getElementById('acc-cost').value     = a.cost||'';
  document.getElementById('acc-err').textContent = '';
  document.getElementById('acc-modal').style.display = 'flex';
}
function closeAccModal() { document.getElementById('acc-modal').style.display='none'; }
function saveAcc() {
  var t = tours.find(function(x){return x.id===editingAccTourId;}); if (!t) return;
  t.accommodation={name:document.getElementById('acc-name').value.trim(),address:document.getElementById('acc-address').value.trim(),checkin:document.getElementById('acc-checkin').value,checkout:document.getElementById('acc-checkout').value,cost:parseFloat(document.getElementById('acc-cost').value)||0};
  closeAccModal(); saveData(); renderToursPage();
}

var editingTaskTourId=null;
function openTourTaskModal(tourId) {
  editingTaskTourId=tourId;
  document.getElementById('ttm-text').value   = '';
  document.getElementById('ttm-notes').value  = '';
  document.getElementById('ttm-status').value = 'todo';
  document.getElementById('ttm-err').textContent = '';
  document.getElementById('tour-task-modal').style.display='flex';
}
function closeTourTaskModal() { document.getElementById('tour-task-modal').style.display='none'; }
function scrollToTour(id) { var t=tours.find(function(x){return x.id===id;}); if(!t)return; t.isOpen=true; renderToursPage(); setTimeout(function(){var el=document.getElementById("tour-card-"+id);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});},60); }
function saveTourTask() {
  var text = document.getElementById('ttm-text').value.trim();
  if (!text) { document.getElementById('ttm-err').textContent='Task text is required.'; return; }
  var t = tours.find(function(x){return x.id===editingTaskTourId;}); if (!t) return;
  t.tasks.push({id:'tt'+(tourTaskIdSeq++),text:text,status:document.getElementById('ttm-status').value,notes:document.getElementById('ttm-notes').value.trim()});
  closeTourTaskModal(); saveData(); renderToursPage();
}

// ════════════════════════════════════════════════════════
// SOCIAL MEDIA
// ════════════════════════════════════════════════════════
var postsWeekOff = 0, storiesWeekOff = 0, ccWeekOff = 0;
var postsData = {}, storiesData = {}, schedImages = {};
var vidData = [], expandedVids = {}, vidFilter = 'all', vidPlatFilter = 'all';
var schedImgKey = null, slotEditDay = null, slotEditType = null;
var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var PILLARS = ['Outfit / Pinterest Styling','Celebrity Palette Analysis','Client Video / Reel','Educational','Moodboard','Availabilities / Bookings','Cool vs Warm Quiz','Client Review'];

function getWS(off) {
  var now = new Date(), day = now.getDay(), diff = now.getDate() - (day===0?6:day-1);
  var mon = new Date(now.setDate(diff)); mon.setHours(0,0,0,0);
  mon.setDate(mon.getDate() + (off||0)*7); return mon;
}
function smWeekLbl(off) {
  var ws = getWS(off), we = new Date(ws); we.setDate(ws.getDate()+6);
  return fmtDate(ws) + ' – ' + fmtDate(we);
}

function renderSocialPage() {
  renderSchedulePlanner();
  renderMetaSchedule();
  renderVideoTracker();
  renderMetaRotation();
  renderCelebList();
  renderAdStatusPills();
}

// ── Stories ──
function renderStoriesPlanner() {
  var el = document.getElementById('stories-grid'); if (!el) return;
  var lbl = document.getElementById('stories-week-lbl'); if (lbl) lbl.textContent = smWeekLbl(storiesWeekOff);
  var ws = getWS(storiesWeekOff);
  var html = '<div class="week-grid">';
  for (var d=0; d<7; d++) {
    var dt = new Date(ws); dt.setDate(ws.getDate()+d);
    var key = storiesWeekOff+'_'+d;
    var slot = storiesData[key] || {};
    html += '<div class="day-col">'
      +'<div class="day-hd"><div class="day-name">'+DAYS[d]+'</div><div class="day-date">'+fmtDate(dt)+'</div></div>'
      +'<div class="slot-cell" onclick="openSlotModal('+d+',\'stories\')">'
      +(slot.img ? '<img src="'+esc(slot.img)+'">' : '')
      +(slot.posttype ? '<div class="slot-type">'+esc(slot.posttype)+'</div>' : '')
      +(slot.topic ? '<div class="slot-topic">'+esc(slot.topic)+'</div>' : '')
      +(slot.status ? '<div style="margin-top:4px"><span class="slot-status-dot '+slot.status+'"></span><span style="font-size:10px;color:var(--muted)">'+cap(slot.status)+'</span></div>' : '')
      +(!slot.topic && !slot.posttype ? '<div class="slot-add">+ Add</div>' : '')
      +'</div></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}
function changeStoriesWeek(d) { storiesWeekOff += d; renderStoriesPlanner(); }

// ── META Schedule ──
function renderMetaSchedule() {
  var body = document.getElementById('meta-sched-body'); if (!body) return;
  body.innerHTML = '';
  var rows = ['STORY','AM POST','PM POST'];
  var rowBorderColor = {STORY:'#7C3AED', 'AM POST':'#C49A8A', 'PM POST':'#7A8C6E'};
  var rowBgColor     = {STORY:'rgba(237,233,254,.35)', 'AM POST':'rgba(254,243,199,.45)', 'PM POST':'rgba(219,234,254,.45)'};
  var staffColors    = {Lemari:'#7A8C6E', Salma:'#C49A8A', Latisha:'#C4956A'};

  rows.forEach(function(rowLabel) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.textContent = rowLabel;
    th.style.cssText = 'color:white;background:'+rowBorderColor[rowLabel]+';writing-mode:vertical-lr;text-align:center;padding:8px 5px;font-size:9px;font-weight:700;letter-spacing:1.5px;width:32px;white-space:nowrap';
    tr.appendChild(th);

    for (var d = 0; d < 7; d++) {
      var td = document.createElement('td');
      var key = 'mrc:'+rowLabel+':'+d;
      var slot = metaSchedData[key] || {};
      td.style.cssText = 'cursor:pointer;padding:0;vertical-align:top;width:120px;height:160px;position:relative;border:1px solid var(--sand);overflow:hidden;background:'+(slot.thumb ? '#1a1a1a' : rowBgColor[rowLabel]);
      td.dataset.key = key;
      td.onclick = function() { openMrcModal(this.dataset.key); };

      var inner = '';
      var BASE = 'https://raw.githubusercontent.com/YourSZN/yourszn-hub/main/';
var templateImages = {
  'mrc:AM POST:0': BASE+'Pinterest Inspo Monday AM.png',
  'mrc:AM POST:1': BASE+'Celebrity Statics Tuesday & Saturday AM.png',
'mrc:AM POST:2': BASE+'Educational Wednesday & Sunday AM.png',
  'mrc:AM POST:4': BASE+'Styled Looks Friday AM.png',
  'mrc:AM POST:5': BASE+'Celebrity Statics Tuesday & Saturday AM.png',
'mrc:AM POST:6': BASE+'Educational Wednesday & Sunday AM.png',
  'mrc:PM POST:1': BASE+'Client Video Tuesday & Saturday PM.png',
  'mrc:PM POST:2': BASE+'Client Static Wednesday & Sunday PM.png',
  'mrc:PM POST:5': BASE+'Client Video Tuesday & Saturday PM.png',
  'mrc:PM POST:0': BASE+'Celeb Video Monday & Friday PM.png',
  'mrc:PM POST:4': BASE+'Celeb Video Monday & Friday PM.png',
  'mrc:PM POST:6': BASE+'Client Static Wednesday & Sunday PM.png',
};
if (!slot.thumb && templateImages[key]) slot.thumb = templateImages[key];
      if (slot.thumb) {
        inner += '<img src="'+slot.thumb+'" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0">';
        inner += '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.4) 0%,transparent 45%,transparent 55%,rgba(0,0,0,.55) 100%)"></div>';
      }
      if (slot.contentType) {
        inner += '<div style="position:absolute;top:7px;left:7px;font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:rgba(255,255,255,.93);color:var(--charcoal);padding:3px 8px;border-radius:10px;max-width:calc(100% - 14px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2">'+slot.contentType+'</div>';
      }
      if (slot.staff) {
        var sc = staffColors[slot.staff] || '#C9B99A';
        inner += '<div style="position:absolute;top:'+(slot.contentType?'30px':'7px')+';right:7px;font-size:9px;font-weight:700;background:'+sc+';color:white;padding:3px 8px;border-radius:10px;white-space:nowrap;z-index:2">'+slot.staff+'</div>';
      }
      if (slot.canvaWip || slot.canvaDone) {
        inner += '<div style="position:absolute;bottom:7px;left:7px;right:7px;display:flex;gap:4px;flex-wrap:wrap;z-index:2">';
        if (slot.canvaWip)  inner += '<a href="'+slot.canvaWip+'"  target="_blank" onclick="event.stopPropagation()" style="font-size:9px;font-weight:700;background:#EDE9FE;color:#6D28D9;padding:3px 7px;border-radius:8px;text-decoration:none">WIP</a>';
        if (slot.canvaDone) inner += '<a href="'+slot.canvaDone+'" target="_blank" onclick="event.stopPropagation()" style="font-size:9px;font-weight:700;background:#D1FAE5;color:#065F46;padding:3px 7px;border-radius:8px;text-decoration:none">Final</a>';
        inner += '</div>';
      }
      if (!slot.thumb && !slot.contentType && !slot.staff) {
        inner += '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--tan);font-size:24px;opacity:.5">+</div>';
      }
      td.innerHTML = inner;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
}

function openSchedImgModal(time, dayIdx) {
  schedImgKey = time+'_'+dayIdx;
  var inp = document.getElementById('sched-img-url'); if (inp) inp.value = schedImages[schedImgKey]||'';
  var m = document.getElementById('sched-img-modal'); if (m) m.style.display = 'flex';
}
function closeSchedImgModal() { var m = document.getElementById('sched-img-modal'); if (m) m.style.display='none'; }
function saveSchedImgUrl() {
  var url = document.getElementById('sched-img-url').value.trim();
  if (schedImgKey) schedImages[schedImgKey] = url;
  closeSchedImgModal(); renderMetaSchedule();
}
function handleSchedImgUpload(input) {
  if (!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) { if (schedImgKey) schedImages[schedImgKey]=e.target.result; closeSchedImgModal(); renderMetaSchedule(); };
  reader.readAsDataURL(input.files[0]);
}

// ── Posts ──
// ── Combined Schedule Planner ──
var plannerWeekOff = 0;
var plannerTab = 'meta'; // 'meta' or 'tiktok'

function setPlannerTab(t) {
  plannerTab = t;
  document.querySelectorAll('.planner-tab').forEach(function(b){b.classList.remove('on');});
  var tb = document.getElementById('planner-tab-'+t);
  if(tb) tb.classList.add('on');
  renderSchedulePlanner();
}

function changePlannerWeek(d) { plannerWeekOff += d; renderSchedulePlanner(); }

function renderSchedulePlanner() {
  var grid = document.getElementById('planner-grid'); if (!grid) return;
  var lbl  = document.getElementById('planner-week-lbl');
  var today = new Date(); today.setHours(0,0,0,0);
  var mon   = new Date(today); mon.setDate(today.getDate() - ((today.getDay()+6)%7) + plannerWeekOff*7);
  var sun   = new Date(mon); sun.setDate(mon.getDate()+6);
  var MN    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var fmtD  = function(d){ return d.getDate()+' '+MN[d.getMonth()]; };
  var fmt12 = function(t){ if(!t) return ''; var p=t.split(':'); var h=parseInt(p[0],10); return (h%12||12)+':'+(p[1]||'00')+(h<12?' AM':' PM'); };
  var lkey  = function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  if (lbl) lbl.textContent = fmtD(mon) + ' \u2013 ' + fmtD(sun);
  var DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  var ROWS = [{key:'stories',label:'STORIES'},{key:'am',label:'AM POST'},{key:'pm',label:'PM POST'}];
  var isMeta = (plannerTab === 'meta');
  // Build grid using DOM (avoids all base64/quote escaping issues)
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:grid;grid-template-columns:28px repeat(7,minmax(130px,1fr));gap:8px;';
  // Header row
  wrap.appendChild(document.createElement('div'));
  for (var c=0; c<7; c++) {
    var d = new Date(mon); d.setDate(mon.getDate()+c);
    var hd = document.createElement('div');
    hd.style.cssText = 'text-align:center;padding-bottom:8px;';
    hd.innerHTML = '<div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)">'+DAYS[c]+'</div>'
      + '<div style="font-size:11px;color:var(--charcoal);margin-top:2px">'+fmtD(d)+'</div>';
    wrap.appendChild(hd);
  }
  // Data rows
  for (var r=0; r<ROWS.length; r++) {
    var rl = document.createElement('div');
    rl.className = 'planner-row-label';
    rl.textContent = ROWS[r].label;
    wrap.appendChild(rl);
    for (var c=0; c<7; c++) {
      var d = new Date(mon); d.setDate(mon.getDate()+c);
      var dKey    = lkey(d);
      var slotKey = plannerTab + ':' + ROWS[r].key + ':' + dKey;
      var slot    = (socialSlots||{})[slotKey];
      var cell    = document.createElement('div');
      cell.dataset.key = slotKey;
      cell.onclick = function(){ openSlotModal(this.dataset.key); };
      // Platform badge
      var badge = document.createElement('span');
      badge.className = isMeta ? 'planner-platform-badge' : 'planner-platform-badge tt';
      badge.textContent = isMeta ? 'IG' : 'TT';
      if (slot && slot.thumb && slot.thumb.length > 10) {
        // ── Thumbnail cell ──
        cell.className = 'planner-cell planner-cell-filled';
        cell.style.cssText = 'min-height:140px;position:relative;overflow:hidden;padding:0;';
        cell.style.backgroundSize     = 'cover';
        cell.style.backgroundPosition = 'center top';
        cell.style.backgroundImage    = 'url(' + JSON.stringify(slot.thumb) + ')';
        cell.appendChild(badge);
        // Title overlay
        var nOv = document.createElement('div');
        nOv.style.cssText = 'position:absolute;bottom:'+(slot.time?'24':'6')+'px;left:6px;right:6px;'
          +'color:#fff;font-size:10px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.9);'
          +'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        nOv.textContent = slot.title || '';
        cell.appendChild(nOv);
        // Time overlay
        if (slot.time) {
          var tOv = document.createElement('div');
          tOv.style.cssText = 'position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.65);'
            +'color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;';
          tOv.textContent = fmt12(slot.time);
          cell.appendChild(tOv);
        }
      } else if (slot && slot.title) {
        // ── Title-only cell ──
        cell.className = 'planner-cell planner-cell-filled';
        cell.style.cssText = 'padding:12px;min-height:140px;position:relative;';
        cell.appendChild(badge);
        var ttl = document.createElement('div');
        ttl.style.cssText = 'font-size:12px;color:var(--charcoal);margin-top:28px;text-align:center;font-weight:500;';
        ttl.textContent = slot.title;
        cell.appendChild(ttl);
        if (slot.time) {
          var tLbl = document.createElement('div');
          tLbl.style.cssText = 'font-size:10px;color:var(--muted);margin-top:4px;text-align:center;';
          tLbl.textContent = fmt12(slot.time);
          cell.appendChild(tLbl);
        }
      } else {
        // ── Empty cell ──
        cell.className = 'planner-cell';
        cell.appendChild(badge);
        var add = document.createElement('div');
        add.className = 'planner-add';
        add.innerHTML = '<div class="planner-add-icon">+</div><div class="planner-add-lbl">ADD</div>';
        cell.appendChild(add);
      }
      wrap.appendChild(cell);
    }
  }
  grid.innerHTML = '';
  grid.appendChild(wrap);
}

function openSlotModal(key) {
  var slot = (socialSlots||{})[key];
  var parts = key ? key.split(':') : [];
  var rowKey = parts[1]||'';
  var dateStr = parts[2]||'';
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var d = dateStr ? new Date(dateStr+'T12:00:00') : null;
  var dayLabel = d ? days[d.getDay() === 0 ? 6 : d.getDay()-1] + ' ' + d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] : '';
  var rowLabel = {stories:'Stories', am:'AM Post', pm:'PM Post'}[rowKey] || rowKey;

  // If this slot is linked to a video, show video details
  if (slot && slot.vidId) {
    var v = vidData.find(function(x){ return x.id === slot.vidId; });
    if (v) { openPlannerVidModal(key, v, slot, dayLabel, rowLabel); return; }
  }
  // Otherwise open the manual slot editor
  openManualSlotModal(key, slot, dayLabel, rowLabel);
}

var socialSlots = {};
var currentSlotKey = null;

function renderPostsPlanner() {
  var el = document.getElementById('posts-grid'); if (!el) return;
  var lbl = document.getElementById('posts-week-lbl'); if (lbl) lbl.textContent = smWeekLbl(postsWeekOff);
  var ws = getWS(postsWeekOff);
  var html = '<div class="week-grid">';
  for (var d=0; d<7; d++) {
    var dt = new Date(ws); dt.setDate(ws.getDate()+d);
    var key = postsWeekOff+'_'+d;
    var slot = postsData[key] || {};
    html += '<div class="day-col">'
      +'<div class="day-hd"><div class="day-name">'+DAYS[d]+'</div><div class="day-date">'+fmtDate(dt)+'</div></div>'
      +'<div class="slot-cell" onclick="openSlotModal('+d+',\'posts\')">'
      +(slot.img ? '<img src="'+esc(slot.img)+'">' : '')
      +(slot.assign ? '<div class="slot-assigned">'+cap(slot.assign)+'</div>' : '')
      +(slot.posttype ? '<div class="slot-type">'+esc(slot.posttype)+'</div>' : '')
      +(slot.topic ? '<div class="slot-topic">'+esc(slot.topic)+'</div>' : '')
      +(slot.status ? '<div style="margin-top:4px"><span class="slot-status-dot '+slot.status+'"></span><span style="font-size:10px;color:var(--muted)">'+cap(slot.status)+'</span></div>' : '')
      +(!slot.topic && !slot.assign ? '<div class="slot-add">+ Add</div>' : '')
      +'</div></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}
function changePostsWeek(d) { postsWeekOff += d; renderPostsPlanner(); }

// ── Content Calendar ──
function renderContentCalendar() {
  var el = document.getElementById('cc-grid'); if (!el) return;
  var lbl = document.getElementById('cc-week-lbl'); if (lbl) lbl.textContent = smWeekLbl(ccWeekOff);
  var ws = getWS(ccWeekOff);
  var html = '<table class="cc-tbl"><thead><tr><th class="cc-day">Day</th>'
    + PILLARS.map(function(p){ return '<th>'+p+'</th>'; }).join('') + '</tr></thead><tbody>';
  for (var d=0; d<7; d++) {
    var dt = new Date(ws); dt.setDate(ws.getDate()+d);
    var key = ccWeekOff+'_'+d;
    var slot = postsData[key] || {};
    html += '<tr onclick="openSlotModal('+d+',\'posts\')" style="cursor:pointer"><td class="cc-day">'+DAYS[d]+' '+fmtDate(dt)+'</td>'
      + PILLARS.map(function(p){ return '<td>'+(slot.pillar===p?'<span class="cc-dot"></span>':'')+'</td>'; }).join('')
      + '</tr>';
  }
  html += '</tbody></table>';
  el.innerHTML = html;
}
function changeCCWeek(d) { ccWeekOff += d; renderContentCalendar(); }

// ── Slot Modal ──
function openLegacySlotModal(dayIdx, type) {
  slotEditDay = dayIdx; slotEditType = type;
  var ws = getWS(type==='stories' ? storiesWeekOff : postsWeekOff);
  var dt = new Date(ws); dt.setDate(ws.getDate()+dayIdx);
  var store = type==='stories' ? storiesData : postsData;
  var weekOff = type==='stories' ? storiesWeekOff : postsWeekOff;
  var slot = store[weekOff+'_'+dayIdx] || {};
  var title = document.getElementById('slot-modal-title');
  if (title) title.textContent = DAYS[dayIdx]+' '+fmtDate(dt)+' — '+(type==='stories'?'Story':'Post');
  document.getElementById('slot-assign').value = slot.assign||'';
  document.getElementById('slot-posttype').value = slot.posttype||'Reel';
  document.getElementById('slot-pillar').value = slot.pillar||PILLARS[0];
  document.getElementById('slot-topic').value = slot.topic||'';
  document.getElementById('slot-caption').value = slot.caption||'';
  document.getElementById('slot-cta').value = slot.cta||'';
  document.getElementById('slot-canva').value = slot.canva||'';
  document.getElementById('slot-status').value = slot.status||'idea';
  document.getElementById('slot-img-url').value = slot.img||'';
  var prev = document.getElementById('slot-img-preview');
  var prevImg = document.getElementById('slot-img-preview-img');
  if (slot.img && prev && prevImg) { prev.style.display='block'; prevImg.src=slot.img; }
  else if (prev) { prev.style.display='none'; }
  var m = document.getElementById('slot-modal'); if (m) m.style.display='flex';
}
function closeSlotModal() { var m = document.getElementById('slot-modal'); if (m) m.style.display='none'; }
function saveSlot() {
  var store = slotEditType==='stories' ? storiesData : postsData;
  var weekOff = slotEditType==='stories' ? storiesWeekOff : postsWeekOff;
  var key = weekOff+'_'+slotEditDay;
  var prevImg = document.getElementById('slot-img-preview-img');
  var imgUrl = document.getElementById('slot-img-url').value.trim();
  var finalImg = imgUrl || (prevImg && prevImg.src && prevImg.src !== window.location.href ? prevImg.src : '');
  store[key] = {
    assign: document.getElementById('slot-assign').value,
    posttype: document.getElementById('slot-posttype').value,
    pillar: document.getElementById('slot-pillar').value,
    topic: document.getElementById('slot-topic').value,
    caption: document.getElementById('slot-caption').value,
    cta: document.getElementById('slot-cta').value,
    canva: document.getElementById('slot-canva').value,
    status: document.getElementById('slot-status').value,
    img: finalImg
  };
  closeSlotModal();
  if (slotEditType==='stories') renderStoriesPlanner();
  else { renderPostsPlanner(); renderContentCalendar(); }
}
function handleSlotImgUpload(input) {
  if (!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var prev = document.getElementById('slot-img-preview');
    var prevImg = document.getElementById('slot-img-preview-img');
    if (prev) prev.style.display='block'; if (prevImg) prevImg.src=e.target.result;
    document.getElementById('slot-img-url').value='';
  };
  reader.readAsDataURL(input.files[0]);
}


function togglePlatDate(p) {
  var cb = document.getElementById('vm-plat-'+p);
  var dt = document.getElementById('vm-date-'+p);
  var tm = document.getElementById('vm-time-'+p);
  var show = cb && cb.checked;
  if (dt) { dt.style.display = show ? 'block' : 'none'; if (!show) dt.value = ''; }
  if (tm) { tm.style.display = show ? 'block' : 'none'; if (!show) tm.value = ''; }
}

function syncPlatStatus() {
  // If any platform date is set, auto-set status to scheduled
  var hasDate = ['ig','tt','pi','yt'].some(function(p){
    var cb = document.getElementById('vm-plat-'+p);
    var dt = document.getElementById('vm-date-'+p);
    return cb&&cb.checked&&dt&&dt.value;
  });
  if (hasDate) {
    var sel = document.getElementById('vm-pub-status');
    if (sel && sel.value === 'editing') sel.value = 'scheduled';
  }
}

// ── Video Tracker ──
function renderVideoTracker() {
  var catLabels = {client:'Client', founder:'Founder', trend:'Trend', bts:'Behind the Scenes', educational:'Educational', celeb:'Celeb'};
  var el = document.getElementById('vid-list'); if (!el) return;
  var allowed = ['client','founder','trend','bts','educational'];
  var list = vidData.filter(function(v){ return allowed.indexOf(v.vidCat) > -1; });
  if (vidFilter !== 'all') list = list.filter(function(v){ return v.vidCat === vidFilter; });
  // Platform filter
  if (vidPlatFilter === 'tt')   list = list.filter(function(v){ return v.platforms && v.platforms.tt; });
  if (vidPlatFilter === 'ig')   list = list.filter(function(v){ return v.platforms && v.platforms.ig; });
  if (vidPlatFilter === 'yt')   list = list.filter(function(v){ return v.platforms && v.platforms.yt; });
  if (vidPlatFilter === 'none') list = list.filter(function(v){ return !v.platforms || (!v.platforms.ig && !v.platforms.tt && !v.platforms.yt && !v.platforms.pi); });
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:40px 0">No videos match this filter.</div>';
    return;
  }
  el.innerHTML = ''; list.forEach(function(v){ el.appendChild(buildVidCard(v)); });
}

function filterVids(f, btn) {
  vidFilter = f;
  document.querySelectorAll('#pg-social .sm-pill').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderVideoTracker();
}
function filterVidPlat(f, btn) {
  vidPlatFilter = f;
  document.querySelectorAll('#vid-plat-filters .sm-pill').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderVideoTracker();
}

function buildVidCard(v) {
  var catLabels = {client:'👤 Client', founder:'✨ Founder', trend:'📈 Trend', bts:'🎬 BTS', educational:'📚 Educational', celeb:'⭐ Celeb'};
  var catCls    = 'vid-cat-' + (v.vidCat || 'client');
  var catLbl    = catLabels[v.vidCat] || v.vidCat || 'Client';
  // Platform posted badges
  var platBadges = '';
  if (v.platforms) {
    var platList = [{p:'ig',e:'📸',l:'Instagram'},{p:'tt',e:'🎵',l:'TikTok'},{p:'yt',e:'▶️',l:'YouTube'},{p:'pi',e:'📌',l:'Pinterest'}];
    platList.forEach(function(pl) {
      if (v.platforms[pl.p]) platBadges += '<span style="font-size:10px;background:var(--warm);border-radius:8px;padding:2px 7px;margin-right:4px">' + pl.e + ' ' + pl.l + ' · ' + v.platforms[pl.p] + '</span>';
    });
  }
  var isOpen = !!expandedVids[v.id];
  var div = document.createElement('div'); div.className = 'vid-card';
  div.innerHTML =
    '<div class="vid-card-hd" onclick="toggleVidExpand(\''+v.id+'\')">'+
      '<div class="vid-thumb-wrap">'+(v.thumb?'<img src="'+esc(v.thumb)+'" onerror="this.parentElement.textContent=\'🎬\'">':'🎬')+'</div>'+
      '<div class="vid-info">'+
        '<div class="vid-title">'+esc(v.client||'Untitled')+(v.part?' · '+esc(v.part):'')+'</div>'+
        '<div class="vid-meta">'+
          '<span class="vid-badge '+catCls+'">'+catLbl+'</span>'+
          '<span class="vid-badge">'+esc(v.type||'Reel')+'</span>'+
          '<span class="vid-editor">'+cap(v.editor||'lemari')+'</span>'+
          '<span class="vid-status '+(v.pubStatus||'editing')+'">'+cap(v.pubStatus||'editing')+'</span>'+
        '</div>'+
        (platBadges ? '<div style="margin-top:5px">'+platBadges+'</div>' : '')+
        (v.datePublished?'<div style="font-size:10px;color:var(--muted);margin-top:3px">Published '+v.datePublished+'</div>':
         v.dateScheduled ?'<div style="font-size:10px;color:var(--muted);margin-top:3px">Scheduled '+v.dateScheduled+'</div>':'')
      +'</div>'+
      '<div class="vid-expand'+(isOpen?' open':'')+'">▾</div>'+
    '</div>'+
    '<div class="vid-body'+(isOpen?' open':'')+'">'+
      (v.caption?'<div class="vid-detail-row"><div class="vid-detail-field"><div class="vid-detail-lbl">Caption</div><div class="vid-detail-val">'+esc(v.caption)+'</div></div></div>':'')+
      (v.notes?'<div class="vid-notes-box">'+esc(v.notes)+'</div>':'')+
      (v.platforms&&(v.platforms.ig||v.platforms.tt||v.platforms.pi||v.platforms.yt)
        ?'<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Scheduled On</div>'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
          [{p:'ig',e:'📸',l:'Instagram'},{p:'tt',e:'🎵',l:'TikTok'},{p:'pi',e:'📌',l:'Pinterest'},{p:'yt',e:'▶️',l:'YouTube'}]
            .map(function(pl){return v.platforms[pl.p]?'<div style="background:var(--warm);border-radius:8px;padding:6px 10px;font-size:12px">'+pl.e+' <strong>'+pl.l+'</strong> · '+v.platforms[pl.p]+'</div>':'';}).join('')+
          '</div></div>':'')+
      (v.driveLink?'<a href="'+esc(v.driveLink)+'" target="_blank" class="btn btns" style="font-size:12px;display:inline-block;margin-top:10px;text-decoration:none">📁 Open</a>':'')+
      '<div style="margin-top:12px"><button class="btn btns" style="font-size:12px" onclick="openVidModal(\''+v.id+'\')">Edit</button></div>'+
    '</div>';
  return div;
}

function toggleVidExpand(id) { expandedVids[id]=!expandedVids[id]; renderVideoTracker(); }
function openVidModal(id) {
  var v = id ? vidData.find(function(x){return x.id===id;}) : null;
  // Reset platform filter so new video is always visible after saving
  if (!id) {
    vidPlatFilter = 'all'; vidFilter = 'all';
    document.querySelectorAll('#vid-plat-filters .sm-pill').forEach(function(b){ b.classList.remove('on'); });
    var allPlatBtn = document.querySelector('#vid-plat-filters .sm-pill');
    if (allPlatBtn) allPlatBtn.classList.add('on');
    document.querySelectorAll('#pg-social .sm-pill:not(#vid-plat-filters .sm-pill)').forEach(function(b,i){ b.classList.toggle('on', i===0); });
  }
  document.getElementById('vm-id').value = id||'';
  document.getElementById('vm-vid-cat').value = v?v.vidCat||'client':'client';
  document.querySelectorAll('input[name="vm-cat-r"]').forEach(function(r){ r.checked=(r.value===(v?v.vidCat||'client':'client')); });
  // Restore slot selections
  ['ig','tt'].forEach(function(p) {
    var sl = document.getElementById('vm-slot-'+p);
    if (sl) sl.value = (v && v.slots && v.slots[p]) ? v.slots[p] : 'am';
  });
  document.getElementById('vm-client').value = v?v.client||'':'';
  document.getElementById('vm-type').value = v?v.type||'Reel':'Reel';
  document.getElementById('vm-part').value = v?v.part||'':'';
  document.getElementById('vm-editor').value = v?v.editor||'lemari':'lemari';
  document.getElementById('vm-caption').value = v?v.caption||'':'';
  document.getElementById('vm-cta').value = v?v.cta||'':'';
  document.getElementById('vm-hashtags').value = v?v.hashtags||'':'';
  document.getElementById('vm-pub-status').value = v?v.pubStatus||'editing':'editing';
  document.getElementById('vm-link').value = v?v.driveLink||'':'';
  document.getElementById('vm-date-completed').value = v?v.dateCompleted||'':'';
  document.getElementById('vm-date-published').value = v?v.datePublished||'':'';
  // Platform schedules
  ['ig','tt','pi','yt'].forEach(function(p) {
    var cb  = document.getElementById('vm-plat-'+p);
    var dt  = document.getElementById('vm-date-'+p);
    var tm  = document.getElementById('vm-time-'+p);
    var val  = v && v.platforms ? (v.platforms[p] || '') : '';
    var tval = v && v.times     ? (v.times[p]     || '') : '';
    if (cb) cb.checked = !!val;
    if (dt) { dt.value = val;  dt.style.display = val ? 'block' : 'none'; }
    if (tm) { tm.value = tval; tm.style.display = val ? 'block' : 'none'; }
  });
  document.getElementById('vm-notes').value = v?v.notes||'':'';
  document.getElementById('vm-thumb').value = v?v.thumb||'':'';
  var tp = document.getElementById('vm-thumb-preview');
  if (tp) { tp.src=v?v.thumb||'':''; tp.style.display=(v&&v.thumb)?'block':'none'; }
  var m = document.getElementById('vid-modal'); if (m) m.style.display='flex';
}
function closeVidModal() { var m = document.getElementById('vid-modal'); if (m) m.style.display='none'; }
function timeToSlot(t) {
  if (!t) return 'am';
  var h = parseInt(t.split(':')[0], 10);
  return h < 12 ? 'am' : 'pm';
}

function saveVid() {
  var id = document.getElementById('vm-id').value || ('v'+Date.now());
  var tp = document.getElementById('vm-thumb-preview');
  var thumbUrl = document.getElementById('vm-thumb').value.trim() ||
    (tp && tp.src && tp.src !== window.location.href ? tp.src : '');
  var igTime = document.getElementById('vm-time-ig') ? document.getElementById('vm-time-ig').value : '';
  var ttTime = document.getElementById('vm-time-tt') ? document.getElementById('vm-time-tt').value : '';
  var obj = {
    id: id,
    vidCat:        document.getElementById('vm-vid-cat').value,
    client:        document.getElementById('vm-client').value,
    type:          document.getElementById('vm-type').value,
    part:          document.getElementById('vm-part').value,
    editor:        document.getElementById('vm-editor').value,
    caption:       document.getElementById('vm-caption').value,
    cta:           document.getElementById('vm-cta').value,
    hashtags:      document.getElementById('vm-hashtags').value,
    pubStatus:     document.getElementById('vm-pub-status').value,
    driveLink:     document.getElementById('vm-link').value,
    dateCompleted: document.getElementById('vm-date-completed').value,
    datePublished: document.getElementById('vm-date-published').value,
    notes:         document.getElementById('vm-notes').value,
    thumb:         thumbUrl,
    platforms: {
      ig: document.getElementById('vm-plat-ig').checked ? document.getElementById('vm-date-ig').value : '',
      tt: document.getElementById('vm-plat-tt').checked ? document.getElementById('vm-date-tt').value : '',
      pi: document.getElementById('vm-plat-pi').checked ? document.getElementById('vm-date-pi').value : '',
      yt: document.getElementById('vm-plat-yt').checked ? document.getElementById('vm-date-yt').value : ''
    },
    times: { ig: igTime, tt: ttTime },
    slots: { ig: timeToSlot(igTime), tt: timeToSlot(ttTime) }
  };
  var idx = vidData.findIndex(function(x){ return x.id === id; });
  if (idx > -1) vidData[idx] = obj; else vidData.push(obj);
  dropVidIntoPlanner(obj);
  closeVidModal();
  renderVideoTracker();
  renderSchedulePlanner();
}

function dropVidIntoPlanner(v) {
  if (!v.platforms) return;
  var platTab = {ig:'meta', tt:'tiktok'};
  // Remove all previous planner entries for this video
  Object.keys(socialSlots).forEach(function(k) {
    if (socialSlots[k] && socialSlots[k].vidId === v.id) delete socialSlots[k];
  });
  var firstDate = null; var firstTab = null;
  ['ig','tt'].forEach(function(p) {
    var dateStr = v.platforms[p]; if (!dateStr) return;
    var tab  = platTab[p];
    var time = v.times && v.times[p] ? v.times[p] : '';
    var row  = timeToSlot(time); // derives 'am' or 'pm' from time
    var slotKey = tab + ':' + row + ':' + dateStr;
    // If slot already taken by a different video, use the other row
    if (socialSlots[slotKey] && socialSlots[slotKey].vidId && socialSlots[slotKey].vidId !== v.id) {
      row = (row === 'am') ? 'pm' : 'am';
      slotKey = tab + ':' + row + ':' + dateStr;
    }
    socialSlots[slotKey] = {
      title:    (v.client || 'Video') + (v.part ? ' · ' + v.part : ''),
      thumb:    (v.thumb && v.thumb.length > 10) ? v.thumb : null,
      vidId:    v.id,
      platform: p,
      time:     time,
      status:   'scheduled'
    };
    if (!firstDate) { firstDate = dateStr; firstTab = tab; }
  });
  // Navigate planner to the week + tab of the first scheduled date
  if (firstDate) {
    var target = new Date(firstDate + 'T12:00:00');
    var today  = new Date(); today.setHours(0,0,0,0);
    var mon    = new Date(today); mon.setDate(today.getDate() - ((today.getDay()+6)%7));
    plannerWeekOff = Math.round((target - mon) / (7*24*60*60*1000));
    plannerTab = firstTab;
    document.querySelectorAll('.planner-tab').forEach(function(b){ b.classList.remove('on'); });
    var tb = document.getElementById('planner-tab-' + firstTab);
    if (tb) tb.classList.add('on');
  }
  saveData();
  renderSchedulePlanner();
}

function deleteVid() {
  var id = document.getElementById('vm-id').value;
  if (!id||!confirm('Delete this video?')) return;
  vidData = vidData.filter(function(v){return v.id!==id;});
  saveData();closeVidModal(); renderVideoTracker();
}
function handleVmThumbUpload(input) {
  if (!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var tp = document.getElementById('vm-thumb-preview'); if (tp){tp.src=e.target.result;tp.style.display='block';}
    document.getElementById('vm-thumb').value='';
  };
  reader.readAsDataURL(input.files[0]);
}
function openLightbox(src) { var lb=document.getElementById('lightbox'); var img=document.getElementById('lightbox-img'); if(!lb||!img)return; img.src=src; lb.style.display='flex'; }
function closeLightbox() { var lb=document.getElementById('lightbox'); if(lb) lb.style.display='none'; }

// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  AD CREATIVE
// ════════════════════════════════════════════════════════
var adData = [];
var adTypeFilter = 'all';
var adStatusFilter = 'all';
var adExpanded = {};
var editingAdId = null;

function renderAdCreativePage() {
  renderAdTiles();
  renderAdStatusPills();
  renderAdList();
}

function renderAdTiles() {
  var defs = [
    { type:'Static',   icon:'&#128444;&#65039;', color:'#EEF2FF', border:'#C7D2FE' },
    { type:'Video',    icon:'&#127916;',          color:'#FEF3C7', border:'#FDE68A' },
    { type:'Carousel', icon:'&#128288;',          color:'#D1FAE5', border:'#A7F3D0' }
  ];
  var statuses = ['all','backlog','ready','active','paused','completed'];
  var el = document.getElementById('ad-tiles'); if (!el) return;
  var h = '';
  defs.forEach(function(t) {
    var subset = adStatusFilter === 'all'
      ? adData.filter(function(a){ return a.adType === t.type; })
      : adData.filter(function(a){ return a.adType === t.type && a.status === adStatusFilter; });
    var total  = adData.filter(function(a){ return a.adType === t.type; }).length;
    var active = adData.filter(function(a){ return a.adType === t.type && a.status === 'active'; }).length;
    var on = adTypeFilter === t.type.toLowerCase();
    h += '<div onclick="setAdTypeFilter(\'' + t.type.toLowerCase() + '\')"'
      + ' style="flex:1;min-width:140px;background:' + (on ? t.border : t.color) + ';border:2px solid ' + t.border + ';'
      + 'border-radius:14px;padding:18px 20px;cursor:pointer;transition:all .15s;user-select:none">'
      + '<div style="font-size:26px;margin-bottom:8px">' + t.icon + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;color:var(--deep);margin-bottom:6px">' + t.type + '</div>'
      + '<div style="display:flex;gap:12px">'
      + '<span style="font-size:12px;color:var(--muted)"><strong style="color:var(--charcoal)">' + total + '</strong> total</span>'
      + '<span style="font-size:12px;color:var(--muted)"><strong style="color:#065F46">' + active + '</strong> active</span>'
      + '</div>'
      + '</div>';
  });
  h += '<div onclick="setAdTypeFilter(\'all\')"'
    + ' style="flex:none;display:flex;align-items:center;justify-content:center;padding:18px 20px;'
    + 'background:' + (adTypeFilter === 'all' ? 'var(--sand)' : 'white') + ';'
    + 'border:2px solid var(--sand);border-radius:14px;cursor:pointer;font-size:12px;font-weight:700;'
    + 'color:var(--muted);letter-spacing:.5px;text-transform:uppercase;user-select:none">All</div>';
  el.innerHTML = h;
}

function renderAdStatusPills() {
  var el = document.getElementById('ad-status-pills'); if (!el) return;
  var opts = [
    { v:'all',       l:'All' },
    { v:'backlog',   l:'Backlog' },
    { v:'ready',     l:'Ready' },
    { v:'active',    l:'Active' },
    { v:'paused',    l:'Paused' },
    { v:'completed', l:'Completed' }
  ];
  el.innerHTML = opts.map(function(o) {
    var on = adStatusFilter === o.v;
    return '<button class="sm-pill' + (on ? ' on' : '') + '" onclick="setAdStatusFilter(\'' + o.v + '\')">' + o.l + '</button>';
  }).join('');
}

function setAdTypeFilter(f) { adTypeFilter = f; renderAdTiles(); renderAdStatusPills(); renderAdList(); }
function setAdStatusFilter(f) { adStatusFilter = f; renderAdTiles(); renderAdStatusPills(); renderAdList(); }

function renderAdList() {
  var el = document.getElementById('ad-list'); if (!el) return;
  var list = adData.filter(function(a) {
    var typeOk   = adTypeFilter === 'all' || a.adType.toLowerCase() === adTypeFilter;
    var statusOk = adStatusFilter === 'all' || a.status === adStatusFilter;
    return typeOk && statusOk;
  });
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:50px 0">No ads here yet.</div>';
    return;
  }
  el.innerHTML = '';
  list.forEach(function(a) { el.appendChild(buildAdCard(a)); });
}

function buildAdCard(a) {
  var isOpen = !!adExpanded[a.id];

  // Status colours
  var stBg  = { backlog:'#F3F4F6', ready:'#FEF3C7', active:'#D1FAE5', paused:'#DBEAFE', completed:'#E0E7FF' }[a.status] || '#F3F4F6';
  var stCol = { backlog:'#6B7280', ready:'#92400E', active:'#065F46', paused:'#1E40AF', completed:'#3730A3' }[a.status] || '#6B7280';
  // Type colours
  var tyBg  = { Static:'#EEF2FF', Video:'#FEF3C7', Carousel:'#D1FAE5' }[a.adType] || '#F3F4F6';
  var tyCol = { Static:'#3730A3', Video:'#92400E', Carousel:'#065F46' }[a.adType] || '#6B7280';
  // Performance colours
  var perfMap = { great:['#D1FAE5','#065F46','&#128293; Great'], good:['#E0E7FF','#3730A3','&#128077; Good'], average:['#FEF3C7','#92400E','&#128528; Average'], poor:['#FEE2E2','#B91C1C','&#128201; Poor'] };
  var perf = a.perfRating ? perfMap[a.perfRating] : null;

  // Creative thumbnail
  var thumbInner = a.creative
    ? '<img src="' + esc(a.creative) + '" style="width:100%;height:100%;object-fit:cover">'
    : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;color:#BCC0C4">'
      + ({ Static:'&#128444;&#65039;', Video:'&#127916;', Carousel:'&#128288;' }[a.adType] || '&#127916;')
      + '</div>';

  // Stat chips for tile row
  var statChips = '';
  if (a.ctr)         statChips += '<span class="ad-stat-chip">CTR ' + a.ctr + '%</span>';
  if (a.roas)        statChips += '<span class="ad-stat-chip">ROAS ' + a.roas + 'x</span>';
  if (a.cpc)         statChips += '<span class="ad-stat-chip">CPC $' + a.cpc + '</span>';
  if (a.spend)       statChips += '<span class="ad-stat-chip">Spend $' + a.spend + '</span>';
  if (a.reach)       statChips += '<span class="ad-stat-chip">Reach ' + a.reach + '</span>';
  if (a.conversions) statChips += '<span class="ad-stat-chip">Conv. ' + a.conversions + '</span>';

  // Stats panel (expanded)
  var hasStats = a.ctr || a.roas || a.cpc || a.spend || a.reach || a.conversions;
  var statsPanel = '';
  if (hasStats) {
    statsPanel = '<div style="background:var(--warm);border-radius:12px;padding:14px 16px">'
      + '<div style="font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:12px">&#128202; Performance Stats</div>'
      + '<div style="display:flex;gap:16px;flex-wrap:wrap">';
    [['CTR','ctr','%'],['ROAS','roas','x'],['CPC','cpc','$',true],['Spend','spend','$',true],['Reach','reach',''],['Conversions','conversions','']].forEach(function(s) {
      if (!a[s[1]] && a[s[1]] !== 0) return;
      statsPanel += '<div style="text-align:center;min-width:54px">'
        + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:3px">' + s[0] + '</div>'
        + '<div style="font-size:17px;font-weight:700;color:var(--charcoal)">' + (s[3] ? '$' : '') + a[s[1]] + (s[2] !== '$' ? s[2] : '') + '</div>'
        + '</div>';
    });
    statsPanel += '</div></div>';
  }

  var creativeHtml = a.creative
    ? '<img src="' + esc(a.creative) + '" style="width:100%;height:100%;object-fit:cover">'
    : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:32px;color:#BCC0C4;background:#F0F2F5">&#127916;</div>';

  var card = document.createElement('div');
  card.className = 'ad-card';
  card.innerHTML =

    // ── TILE ROW (always visible) ──
    '<div class="ad-card-hd" onclick="toggleAdExpand(\'' + a.id + '\')">'

    // Thumbnail
    + '<div style="width:62px;height:62px;border-radius:10px;overflow:hidden;background:#F0F2F5;flex-shrink:0">' + thumbInner + '</div>'

    // Info block
    + '<div style="flex:1;min-width:0;padding:2px 0">'
    +   '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:6px">'
    +     '<span style="font-size:14px;font-weight:600;color:var(--charcoal)">' + esc(a.name || 'Untitled Ad') + '</span>'
    +     '<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:' + tyBg + ';color:' + tyCol + '">' + esc(a.adType) + '</span>'
    +     '<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:' + stBg + ';color:' + stCol + '">' + cap(a.status) + '</span>'
    +     (perf ? '<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:' + perf[0] + ';color:' + perf[1] + '">' + perf[2] + '</span>' : '')
    +   '</div>'
    +   (statChips
        ? '<div style="display:flex;gap:6px;flex-wrap:wrap">' + statChips + '</div>'
        : '<div style="font-size:12px;color:var(--muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'
          + esc((a.primaryText || '—').substring(0, 80) + (a.primaryText && a.primaryText.length > 80 ? '…' : ''))
          + '</div>')
    + '</div>'

    // Expand arrow + Mark Used
    + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'
    +   (a.status === 'backlog' || a.status === 'ready'
        ? '<button class="fin-row-edit" style="background:#D1FAE5;color:#065F46;border-color:#A7F3D0;white-space:nowrap;font-size:11px" onclick="event.stopPropagation();markAdUsed(\'' + a.id + '\')">Mark Used</button>'
        : '')
    +   '<div class="vid-expand' + (isOpen ? ' open' : '') + '">&#9662;</div>'
    + '</div>'
    + '</div>'

    // ── ACCORDION BODY ──
    + '<div class="vid-body' + (isOpen ? ' open' : '') + '" style="padding:0">'
    +   '<div style="display:flex;gap:28px;padding:20px 24px 24px;flex-wrap:wrap;align-items:flex-start">'

    // Left: Meta ad preview
    +   '<div style="flex:none;width:270px">'
    +     '<div style="background:white;border:1px solid #E4E6EB;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">'
    +       '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px">'
    +         '<div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;flex-shrink:0">Y</div>'
    +         '<div><div style="font-weight:700;color:#1C1E21;font-size:13px">Your Szn</div><div style="font-size:11px;color:#65676B">Sponsored &nbsp;&middot;&nbsp; &#127758;</div></div>'
    +         '<div style="margin-left:auto;color:#65676B;font-size:18px;letter-spacing:2px">&#8943;</div>'
    +       '</div>'
    +       '<div style="padding:0 14px 10px;color:#1C1E21;line-height:1.45;font-size:13px">'
    +         esc((a.primaryText || 'Your primary text will appear here\u2026').substring(0, 140))
    +         (a.primaryText && a.primaryText.length > 100 ? '<span style="color:#65676B"> &hellip;See more</span>' : '')
    +       '</div>'
    +       '<div style="width:100%;height:210px;background:#F0F2F5;overflow:hidden">' + creativeHtml + '</div>'
    +       '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F0F2F5;border-top:1px solid #E4E6EB">'
    +         '<div style="flex:1;min-width:0">'
    +           '<div style="font-size:10px;color:#65676B;text-transform:uppercase;letter-spacing:.4px;margin-bottom:1px">yourszn.com.au</div>'
    +           '<div style="font-weight:700;color:#1C1E21;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + esc(a.headline || 'Your Headline Here') + '</div>'
    +           (a.description ? '<div style="font-size:11px;color:#65676B;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + esc(a.description) + '</div>' : '')
    +         '</div>'
    +         '<button style="flex-shrink:0;background:#E4E6EB;border:none;border-radius:6px;padding:7px 14px;font-size:13px;font-weight:600;color:#1C1E21;cursor:default;white-space:nowrap">' + esc(a.cta || 'Book Now') + '</button>'
    +       '</div>'
    +     '</div>'
    +   '</div>'

    // Right: copy + stats
    +   '<div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:14px">'
    +     (a.primaryText ? '<div><div class="ad-detail-lbl">Primary Text</div><div class="ad-detail-val">' + esc(a.primaryText) + '</div></div>' : '')
    +     (a.headline    ? '<div><div class="ad-detail-lbl">Headline</div><div class="ad-detail-val">' + esc(a.headline) + '</div></div>' : '')
    +     (a.description ? '<div><div class="ad-detail-lbl">Description</div><div class="ad-detail-val">' + esc(a.description) + '</div></div>' : '')
    +     (a.cta         ? '<div><div class="ad-detail-lbl">CTA</div><div class="ad-detail-val">' + esc(a.cta) + '</div></div>' : '')
    +     (a.targeting   ? '<div><div class="ad-detail-lbl">Audience / Targeting</div><div class="ad-detail-val">' + esc(a.targeting) + '</div></div>' : '')
    +     statsPanel
    +     (a.notes ? '<div style="background:var(--warm);border-radius:10px;padding:12px"><div class="ad-detail-lbl" style="margin-bottom:5px">Notes</div><div class="ad-detail-val">' + esc(a.notes) + '</div></div>' : '')
    +     '<div><button class="btn btns" style="font-size:12px" onclick="openAdModal(\'' + a.id + '\')">Edit</button></div>'
    +   '</div>'
    + '</div>'
    + '</div>';

  return card;
}

function toggleAdExpand(id) { adExpanded[id] = !adExpanded[id]; renderAdList(); }

function markAdUsed(id) {
  var a = adData.find(function(x) { return x.id === id; }); if (!a) return;
  a.status = 'active'; saveData(); renderAdCreativePage();
}

function openAdModal(id) {
  var a = id ? adData.find(function(x) { return x.id === id; }) : null;
  editingAdId = id || null;
  document.getElementById('adm-heading').textContent  = a ? 'Edit Ad' : 'New Ad';
  document.getElementById('adm-name').value           = a ? a.name || '' : '';
  document.getElementById('adm-type').value           = a ? a.adType || 'Static' : 'Static';
  document.getElementById('adm-status').value         = a ? a.status || 'backlog' : 'backlog';
  document.getElementById('adm-perf').value           = a ? a.perfRating || '' : '';
  document.getElementById('adm-primary').value        = a ? a.primaryText || '' : '';
  document.getElementById('adm-headline').value       = a ? a.headline || '' : '';
  document.getElementById('adm-desc').value           = a ? a.description || '' : '';
  document.getElementById('adm-cta').value            = a ? a.cta || 'Book Now' : 'Book Now';
  document.getElementById('adm-targeting').value      = a ? a.targeting || '' : '';
  document.getElementById('adm-ctr').value            = a ? a.ctr || '' : '';
  document.getElementById('adm-roas').value           = a ? a.roas || '' : '';
  document.getElementById('adm-cpc').value            = a ? a.cpc || '' : '';
  document.getElementById('adm-spend').value          = a ? a.spend || '' : '';
  document.getElementById('adm-reach').value          = a ? a.reach || '' : '';
  document.getElementById('adm-conv').value           = a ? a.conversions || '' : '';
  document.getElementById('adm-notes').value          = a ? a.notes || '' : '';
  document.getElementById('adm-creative-url').value   = a ? a.creative || '' : '';
  var prev = document.getElementById('adm-creative-prev');
  if (prev) { prev.src = a ? a.creative || '' : ''; prev.style.display = (a && a.creative) ? 'block' : 'none'; }
  document.getElementById('adm-del').style.display    = a ? 'inline-block' : 'none';
  document.getElementById('adm-err').textContent      = '';
  document.getElementById('ad-modal').style.display   = 'flex';
}
function closeAdModal() { document.getElementById('ad-modal').style.display = 'none'; }
function saveAd() {
  var name = document.getElementById('adm-name').value.trim();
  if (!name) { document.getElementById('adm-err').textContent = 'Ad name is required.'; return; }
  var prev = document.getElementById('adm-creative-prev');
  var creative = document.getElementById('adm-creative-url').value.trim() || (prev && prev.src && prev.src !== window.location.href ? prev.src : '');
  var obj = {
    id: editingAdId || ('a' + Date.now()),
    name: name, adType: document.getElementById('adm-type').value,
    status: document.getElementById('adm-status').value,
    perfRating: document.getElementById('adm-perf').value,
    primaryText: document.getElementById('adm-primary').value,
    headline: document.getElementById('adm-headline').value,
    description: document.getElementById('adm-desc').value,
    cta: document.getElementById('adm-cta').value,
    targeting: document.getElementById('adm-targeting').value,
    ctr: document.getElementById('adm-ctr').value,
    roas: document.getElementById('adm-roas').value,
    cpc: document.getElementById('adm-cpc').value,
    spend: document.getElementById('adm-spend').value,
    reach: document.getElementById('adm-reach').value,
    conversions: document.getElementById('adm-conv').value,
    notes: document.getElementById('adm-notes').value,
    creative: creative
  };
  var idx = adData.findIndex(function(x) { return x.id === obj.id; });
  if (idx > -1) adData[idx] = obj; else adData.push(obj);
  closeAdModal(); saveData(); renderAdCreativePage();
}
function deleteAd() {
  if (!editingAdId || !confirm('Delete this ad?')) return;
  adData = adData.filter(function(a) { return a.id !== editingAdId; });
  closeAdModal(); saveData(); renderAdCreativePage();
}
function handleAdCreativeUpload(input) {
  if (!input.files || !input.files[0]) return;
  var r = new FileReader();
  r.onload = function(e) {
    document.getElementById('adm-creative-url').value = '';
    var prev = document.getElementById('adm-creative-prev');
    if (prev) { prev.src = e.target.result; prev.style.display = 'block'; }
  };
  r.readAsDataURL(input.files[0]);
}


var groupMsgs = [], dmMsgs = {}, activeDmUser = null;
var commsUnread = { group: {}, dm: {} };
// commsUnread.group[user] = count of unseen group msgs
// commsUnread.dm[key][user] = count of unseen DMs

function commsNavBadge() {
  var badge = document.getElementById('n-comms-badge');
  if (!badge) return;
  // Count total unread for curUser
  var total = 0;
  // group unread
  total += commsUnread.group[curUser] || 0;
  // dm unread — any conversation key involving curUser
  Object.keys(commsUnread.dm).forEach(function(key) {
    if (key.indexOf(curUser) > -1) total += commsUnread.dm[key][curUser] || 0;
  });
  badge.style.display = total > 0 ? 'inline-flex' : 'none';
  badge.textContent   = total > 9 ? '9+' : String(total);
}

function markCommsRead() {
  // Clear unread for current user when they open comms
  commsUnread.group[curUser] = 0;
  Object.keys(commsUnread.dm).forEach(function(key) {
    if (key.indexOf(curUser) > -1 && commsUnread.dm[key][curUser]) {
      commsUnread.dm[key][curUser] = 0;
    }
  });
  commsNavBadge();
  // Re-render DM list so any red dots clear
  renderDmList();
}

function renderCommsPage() {
  markCommsRead();
  // Show group chat by default
  var cg = document.getElementById('comms-group');
  var cd = document.getElementById('comms-dm');
  if (cg) cg.style.display = 'block';
  if (cd) cd.style.display = 'none';
  // Reset tab pills
  document.querySelectorAll('.sm-pill').forEach(function(p){
    if(p.textContent.indexOf('Group')>-1) p.classList.add('on');
    else if(p.textContent.indexOf('Direct')>-1) p.classList.remove('on');
  });
  renderGroupThread();
  renderDmList();
}

function renderGroupThread() {
  var el = document.getElementById('group-thread'); if (!el) return;
  el.innerHTML = '';
  if (!groupMsgs.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">No messages yet. Say hello! 👋</div>';
    return;
  }
  var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
  groupMsgs.forEach(function(m) {
    var mine = m.from === curUser;
    var row  = document.createElement('div');
    row.className = 'msg-row' + (mine?' mine':'');
    row.innerHTML = (!mine
      ? '<div class="msg-av-sm" style="background:' + (avatarColors[m.from]||'#999') + '">' + cap(m.from).charAt(0) + '</div>'
      : '')
      + '<div class="msg-content">'
      + (!mine ? '<div class="msg-sender">' + cap(m.from) + '</div>' : '')
      + '<div class="msg-bubble">' + esc(m.text) + '</div>'
      + '<div class="msg-time">' + m.time + '</div>'
      + '</div>';
    el.appendChild(row);
  });
  el.scrollTop = el.scrollHeight;
}

function sendGroupMsg() {
  var inp = document.getElementById('group-input');
  if (!inp || !inp.value.trim()) return;
  var msg = {from:curUser, text:inp.value.trim(), time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})};
  groupMsgs.push(msg);
  inp.value = '';
  // Mark unread for everyone else
  Object.keys(USERS).forEach(function(u) {
    if (u !== curUser) {
      commsUnread.group[u] = (commsUnread.group[u]||0) + 1;
    }
  });
  commsNavBadge();
  renderGroupThread();
}

function renderDmList() {
  var el = document.getElementById('dm-list'); if (!el) return;
  el.innerHTML = '';
  var others = Object.keys(USERS).filter(function(u){return u!==curUser;});
  var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
  others.forEach(function(uid) {
    var u   = USERS[uid];
    var key = [curUser, uid].sort().join('_');
    var unread = (commsUnread.dm[key] && commsUnread.dm[key][curUser]) || 0;
    var lastMsg = dmMsgs[key] && dmMsgs[key].length ? dmMsgs[key][dmMsgs[key].length-1] : null;
    var btn = document.createElement('button');
    btn.className = 'dm-person-btn' + (activeDmUser===uid?' active':'');
    btn.innerHTML =
      '<div style="position:relative">'
      + '<div class="dm-av" style="background:' + (avatarColors[uid]||'#999') + '">' + u.name.charAt(0) + '</div>'
      + (unread > 0 ? '<div style="position:absolute;top:-4px;right:-4px;background:#EF4444;color:white;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">' + unread + '</div>' : '')
      + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">' + u.name + '</div>'
      + (lastMsg ? '<div style="font-size:10px;color:var(--muted)">' + lastMsg.time + '</div>' : '')
      + '</div>'
      + '<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">'
      + (lastMsg ? (lastMsg.from===curUser?'You: ':cap(lastMsg.from)+': ') + lastMsg.text : u.role)
      + '</div>'
      + '</div>';
    btn.onclick = function(){ openDm(uid); };
    el.appendChild(btn);
  });
}

function openDm(uid) {
  activeDmUser = uid;
  // Clear unread for this conversation
  var key = [curUser, uid].sort().join('_');
  if (commsUnread.dm[key]) commsUnread.dm[key][curUser] = 0;
  commsNavBadge();
  var hd = document.getElementById('dm-header');
  if (hd) {
    var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
    hd.innerHTML = '<div class="dm-av" style="background:' + (avatarColors[uid]||'#999') + ';width:28px;height:28px;font-size:13px">' + USERS[uid].name.charAt(0) + '</div>'
      + '<div><div style="font-size:14px;font-weight:600">' + USERS[uid].name + '</div>'
      + '<div style="font-size:11px;color:var(--muted)">' + USERS[uid].role + '</div></div>';
  }
  var wrap = document.getElementById('dm-thread-wrap'); if (wrap) wrap.style.display='block';
  renderDmThread();
  renderDmList(); // refresh list to clear red dot
}

function renderDmThread() {
  var el = document.getElementById('dm-thread'); if (!el) return;
  var key  = [curUser, activeDmUser].sort().join('_');
  var msgs = dmMsgs[key] || [];
  el.innerHTML = '';
  if (!msgs.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">No messages yet.</div>';
    return;
  }
  var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
  msgs.forEach(function(m) {
    var mine = m.from === curUser;
    var row  = document.createElement('div');
    row.className = 'msg-row' + (mine?' mine':'');
    row.innerHTML = (!mine
      ? '<div class="msg-av-sm" style="background:' + (avatarColors[m.from]||'#999') + '">' + cap(m.from).charAt(0) + '</div>'
      : '')
      + '<div class="msg-content">'
      + '<div class="msg-bubble">' + esc(m.text) + '</div>'
      + '<div class="msg-time">' + m.time + '</div>'
      + '</div>';
    el.appendChild(row);
  });
  el.scrollTop = el.scrollHeight;
}

function sendDm() {
  var inp = document.getElementById('dm-input');
  if (!inp || !inp.value.trim() || !activeDmUser) return;
  var key = [curUser, activeDmUser].sort().join('_');
  if (!dmMsgs[key]) dmMsgs[key] = [];
  var msg = {from:curUser, text:inp.value.trim(), time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})};
  dmMsgs[key].push(msg);
  inp.value = '';
  // Mark unread for recipient
  if (!commsUnread.dm[key]) commsUnread.dm[key] = {};
  commsUnread.dm[key][activeDmUser] = (commsUnread.dm[key][activeDmUser]||0) + 1;
  commsNavBadge();
  renderDmThread();
  renderDmList();
}

function showCommsTab(tab, btn) {
  document.getElementById('comms-group').style.display = tab==='group'?'block':'none';
  document.getElementById('comms-dm').style.display    = tab==='dm'   ?'block':'none';
  document.querySelectorAll('#pg-comms .sm-pill').forEach(function(b){b.classList.remove('on');});
  if (btn) btn.classList.add('on');
  if (tab==='group') {
    commsUnread.group[curUser] = 0;
    commsNavBadge();
  }
}