// Vietnam — Vietnam tour client management

function renderVtOnboarding() {
  var items = vtData.onboardingSop || [];
  var html = '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
    + '<div class="ct">Client Onboarding Process</div>'
    + '<button class="btn btnp" style="font-size:12px;padding:6px 14px" onclick="openVtObModal(null)">+ Add Step</button>'
    + '</div><div class="cb">'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Track the order of steps for onboarding each Vietnam client. Click to mark complete.</div>';
  if (!items.length) {
    html += '<div style="color:var(--muted);font-size:13px;padding:8px 0">No steps yet.</div>';
  } else {
    items.forEach(function(item, idx) {
      html += '<div class="titem'+(item.done?' done':'')+'" style="padding:10px 0;border-bottom:1px solid var(--sand)">'
        + '<div style="display:flex;align-items:center;gap:8px;width:100%">'
        +   '<div style="font-size:12px;font-weight:700;color:var(--muted);min-width:22px;text-align:center">'+(idx+1)+'</div>'
        +   '<div class="tck" onclick="vtObToggle(\''+item.id+'\')">'+(item.done?'<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" fill="none"/></svg>':'')+'</div>'
        +   '<div style="flex:1;min-width:0">'
        +     '<div class="ttx">'+esc(item.text)+'</div>'
        +     (item.notes?'<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(item.notes)+'</div>':'')
        +   '</div>'
        +   '<button class="fin-row-edit" onclick="openVtObModal(\''+item.id+'\')">Edit</button>'
        +   (idx>0?'<button class="fin-row-edit" style="opacity:.5" onclick="vtObMove(\''+item.id+'\',-1)">↑</button>':'')
        +   (idx<items.length-1?'<button class="fin-row-edit" style="opacity:.5" onclick="vtObMove(\''+item.id+'\',1)">↓</button>':'')
        + '</div>'
        + '</div>';
    });
  }
  html += '</div></div>';
  return html;
}
function vtObToggle(id) {
  var item = (vtData.onboardingSop||[]).find(function(x){return x.id===id;});
  if (item) item.done = !item.done;
  vtSave(); renderVietnamTour();
}
function vtObMove(id, dir) {
  var arr = vtData.onboardingSop||[];
  var idx = arr.findIndex(function(x){return x.id===id;});
  var newIdx = idx+dir;
  if (newIdx<0||newIdx>=arr.length) return;
  var tmp=arr[idx]; arr[idx]=arr[newIdx]; arr[newIdx]=tmp;
  vtSave(); renderVietnamTour();
}
function openVtObModal(id) {
  _vtObEditId = id;
  var item = id ? (vtData.onboardingSop||[]).find(function(x){return x.id===id;}) : null;
  document.getElementById('vtob-heading').textContent = item ? 'Edit Step' : 'Add Step';
  document.getElementById('vtob-text').value  = item ? (item.text||'')  : '';
  document.getElementById('vtob-notes').value = item ? (item.notes||'') : '';
  document.getElementById('vtob-del').style.display = item ? 'inline-block' : 'none';
  document.getElementById('vtob-err').textContent = '';
  document.getElementById('vtob-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('vtob-text').focus(); },80);
}
function closeVtObModal() { document.getElementById('vtob-modal').style.display='none'; }
function saveVtObModal() {
  var text = document.getElementById('vtob-text').value.trim();
  if (!text) { document.getElementById('vtob-err').textContent='Step text required.'; return; }
  if (!vtData.onboardingSop) vtData.onboardingSop=[];
  var obj = {id:_vtObEditId||'ob'+Date.now(), text:text, notes:document.getElementById('vtob-notes').value.trim(), done:false};
  if (_vtObEditId) {
    var idx = vtData.onboardingSop.findIndex(function(x){return x.id===_vtObEditId;});
    if (idx>-1) { obj.done=vtData.onboardingSop[idx].done; vtData.onboardingSop[idx]=obj; }
  } else { vtData.onboardingSop.push(obj); }
  closeVtObModal(); vtSave(); renderVietnamTour();
}
function deleteVtObStep(id) {
  vtData.onboardingSop = (vtData.onboardingSop||[]).filter(function(x){return x.id!==id;});
  closeVtObModal(); vtSave(); renderVietnamTour();
}

// ══ Vietnam client status update ══
function vtUpdateClientStatus(list, idx, status) {
  var arr = list==='booked' ? (vtData.bookedClients||[]) : (vtData.intClients||[]);
  if (arr[idx]) arr[idx].status = status;
  vtSave();
  // Re-render just the status badge colour without full re-render to avoid focus loss
  renderVietnamTour();
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
