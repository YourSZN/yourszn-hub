// Tours — tour planning and management

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
  tabEls.forEach(function(el){ el.classList.remove('on'); if(el.textContent.includes(tab.charAt(0).toUpperCase()||tab)) el.classList.toggle('on', el.onclick&&el.onclick.toString().includes("'"+tab+"'")); });
  // Re-render just this card to keep tabs in sync
  renderToursPage();
}
function updateTourRev(id,field,val) { updateBooking(id,field,val); }
function updateBooking(id,field,val) {
  var t = tours.find(function(x){return x.id===id;}); if (!t) return;
  t.bookings[field] = parseFloat(val)||0; renderToursPage();
}
function cycleTourTask(tourId,taskId) {
  var t  = tours.find(function(x){return x.id===tourId;});  if (!t)  return;
  var tk = t.tasks.find(function(x){return x.id===taskId;}); if (!tk) return;
  var c  = ['todo','in-progress','done'];
  tk.status = c[(c.indexOf(tk.status)+1)%c.length];
  renderToursPage();
}
function deleteTourTask(tourId,taskId) {
  var t = tours.find(function(x){return x.id===tourId;}); if (!t) return;
  t.tasks = t.tasks.filter(function(tk){return tk.id!==taskId;});
  renderToursPage();
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
  closeTourEditModal(); renderToursPage();
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
  closeFlightModal(); renderToursPage();
}
function deleteFlight() {
  if (!confirm('Remove this flight?')) return;
  var t = tours.find(function(x){return x.id===editingFlightTourId;}); if (!t) return;
  t.flights.splice(editingFlightIdx,1); closeFlightModal(); renderToursPage();
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
  closeAccModal(); renderToursPage();
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
  closeTourTaskModal(); renderToursPage();
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
