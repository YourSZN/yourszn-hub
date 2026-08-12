// ══ SEASON BOARDS ══
// Visual boards (pinwheel-style colour fan, cropped to a rectangle with the colours
// radiating in from the left edge) with client photo overlay and season comparison.

var OCA_BOARDS_BUCKET_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co/storage/v1/object/public/oca-report-assets';
var OCA_SEASON_BOARD_FILES = {
  'Light Summer':  'rectangle light summer (1).png',
  'True Summer':   'rectangle true summer (1).png',
  'Soft Summer':   'rectangle soft summer (1).png',
  'Bright Winter': 'rectangle bright winter (1).png',
  'True Winter':   'rectangle true winter (1).png',
  'Dark Winter':   'rectangle dark winter (1).png',
  'Soft Autumn':   'rectangle soft autumn (1).png',
  'True Autumn':   'rectangle true autumn (1).png',
  'Dark Autumn':   'rectangle dark autumn (1).png',
  'Light Spring':  'rectangle light spring (1).png',
  'True Spring':   'rectangle true spring (1).png',
  'Bright Spring': 'Bright spring rectangle (1).png',
};
function ocaBoardImgUrl(seasonName) {
  var file = OCA_SEASON_BOARD_FILES[seasonName];
  return file ? OCA_BOARDS_BUCKET_URL + '/' + encodeURIComponent(file) : '';
}

// Kept as reference colour data (used elsewhere for swatch lookups) — no longer drawn
// directly now that each board is the designed pinwheel-rectangle image above.
var OCA_SEASON_BOARDS = {
  'Soft Autumn':   ['#3D1335','#164C6E','#34897D','#3C3531','#E2D2A1','#4F4139','#B55332','#CB807F','#6D5E99','#35646D','#A29842','#455136','#889D66','#F5D67C','#6A5D51','#852A39','#2D3351','#6D5743','#F3BFB7'],
  'True Autumn':   ['#DB8646','#463720','#935322','#E8481E','#912B1C','#CA5318','#E08D6F','#9F2F22','#454887','#A29942','#465236','#889F45','#D29C4E','#675D51','#FE826C','#403854','#ED554D','#F8B53F'],
  'Dark Autumn':   ['#F9B856','#0F2B36','#2599B3','#2F261D','#5E1E01','#F7D9AB','#BA3C02','#E77E69','#780902','#79007F','#2D15A5','#6A700B','#1A2A0D','#494101','#F1C759','#59504D','#EB7084','#203454','#A22B3B','#331A0A'],
  'Light Summer':  ['#EA98DE','#C3ED83','#1FE6E5','#E9E880','#847CDF','#FC9893','#5C6ECF','#DB9BD2','#9073C4','#BDABA2','#6E8FD3','#7AB2CA','#92DFBB','#89CA74','#F9F97F','#BEBFBF','#E93850','#C56C89','#A99188','#7097E3'],
  'True Summer':   ['#50B470','#4BB8D6','#9D988E','#5D453C','#B92730','#AB1E4D','#DC9BD2','#81497C','#3F027B','#5548BA','#516FB2','#76B2FE','#4DA596','#83C773','#FAFA7E','#BEBEBF','#6188DE','#DA5183','#EA98DE','#7C7DE8'],
  'Soft Summer':   ['#CE899E','#E2586D','#8E746B','#5C3F34','#911C28','#8A2A67','#8B2F89','#552A7E','#1E1255','#3D3E87','#5167AD','#478BB0','#2F5C78','#4CA596','#117A6A','#F3E78A','#2C306F','#703642','#FAA0BC','#4F3244'],
  'Bright Winter': ['#9C02E0','#65FAFE','#4F10FE','#17005F','#E0001D','#90FD22','#757674','#01C040','#400194','#FC48B5','#08F6CE','#FE0404','#DCFD50','#FE0DD3','#012CEC','#01112C','#FD3A09','#FEFD56','#FE2277'],
  'True Winter':   ['#ACC8FE','#DB175F','#FDFB56','#75EFA2','#5D0730','#E40B9B','#9415CA','#FE8AED','#2646E6','#17D3D7','#01893C','#F9FA7F','#00107B','#E20B2F','#0193FE','#4D02D6','#C51EE6','#193AF3'],
  'Dark Winter':   ['#B00019','#2F261C','#8F4931','#403576','#FE47AF','#59299C','#9315CA','#4644B8','#201955','#159DFD','#00EFF4','#007035','#013317','#FBFC60','#CDD1D3','#1D6896','#E5362D','#363E2B','#214058','#FE3EFE'],
  'Light Spring':  ['#8FC7E5','#CF7E48','#F1778C','#D3B48D','#A77C53','#E7976D','#F2536F','#7D7EE7','#B073DB','#00EFF3','#00A67A','#76B2FD','#6BC04C','#E9E37A','#A0A09B','#FE826C','#ECDCC3','#4CBBD0','#FEF04B'],
  'True Spring':   ['#DB8646','#935321','#A77A51','#D16C1A','#E9481E','#912C1B','#F25270','#E37A90','#5446BA','#395874','#01EFF4','#AEC447','#487642','#A6C452','#F9B53F','#A0A09C','#FD826C','#783D14','#9B4ED3','#FEEC22'],
  'Bright Spring': ['#FE260A','#3C2E27','#621CCF','#FE6F0F','#BB723A','#CA5419','#DB8446','#FD1A42','#501EFD','#17416C','#79F2FD','#45B6E0','#DDFE1D','#00E502','#FEFE56','#A9A9AA','#FE816B','#AD4501','#A222FD','#FCE800'],
};

var ocaBoardsExpanded = null;  // season name or null (grid view)
var ocaBoardsCompare  = false; // single vs compare mode
var ocaBoardsSeasonB  = '';    // second season in compare mode

function renderOcaBoards() {
  if (ocaBoardsExpanded) return renderOcaBoardExpanded();
  return renderOcaBoardsGrid();
}

// ── Grid view: all 12 seasons ──
function renderOcaBoardsGrid() {
  var families = [
    { name: 'Summer' }, { name: 'Winter' },
    { name: 'Autumn' }, { name: 'Spring' },
  ];
  var html = '<div style="display:grid;gap:28px">';
  families.forEach(function(fam) {
    var seasons = OCA_GROUPS[fam.name] || [];
    html += '<div>'
      + '<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:14px">' + fam.name + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">'
      + seasons.map(function(name) {
          var season  = OCA_SEASONS[name];
          return '<div onclick="ocaBoardsExpanded=\''+name.replace(/'/g,"\\'")+'\';ocaBoardsCompare=false;renderOca()" '
            + 'style="cursor:pointer;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);transition:transform .15s,box-shadow .15s" '
            + 'onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.13)\'" '
            + 'onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 1px 4px rgba(0,0,0,.08)\'">'
            + '<div style="height:110px;background-image:url(\''+ocaBoardImgUrl(name)+'\');background-size:cover;background-position:left center;background-repeat:no-repeat"></div>'
            + '<div style="padding:10px 14px;background:white;border-top:1px solid #F0EAE2;display:flex;align-items:center;justify-content:space-between">'
            + '<div><div style="font-size:12px;font-weight:700;color:var(--deep)">' + name + '</div>'
            + '<div style="font-size:10px;color:var(--muted);margin-top:1px">' + (season ? season.desc : '') + '</div></div>'
            + '<div style="font-size:11px;color:var(--muted);flex-shrink:0;margin-left:8px">&#8599;</div>'
            + '</div></div>';
        }).join('')
      + '</div></div>';
  });
  return html + '</div>';
}

// ── Expanded view: single or compare ──
function renderOcaBoardExpanded() {
  var seasonKeys = Object.keys(OCA_SEASONS);
  var photo = (typeof ocaPhoto !== 'undefined' && ocaPhoto) ? ocaPhoto : null;

  // Season selector dropdown
  function mkSelect(id, val) {
    var opts = seasonKeys.map(function(k){
      return '<option value="'+k+'"'+(k===val?' selected':'')+'>'+k+'</option>';
    }).join('');
    return '<select onchange="'+id+'=this.value;renderOca()" '
      + 'style="padding:9px 14px;border:1px solid var(--sand);border-radius:10px;font-size:13px;font-weight:600;background:white;color:var(--deep);cursor:pointer">'
      + opts + '</select>';
  }

  // Board image with optional photo overlay
  function mkBoard(seasonName, isWinner) {
    var boardH = ocaBoardsCompare ? 'calc(100vh - 230px)' : 'calc(100vh - 200px)';
    var maxH   = ocaBoardsCompare ? '90%' : '98%';
    var maxW   = ocaBoardsCompare ? '65%' : '52%';

    return '<div style="border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.15)'+(isWinner?';outline:3px solid var(--deep)':'')+'">'
      // Board image with photo overlay
      + '<div style="position:relative;height:'+boardH+'">'
      +   '<div style="height:100%;position:absolute;inset:0;background-image:url(\''+ocaBoardImgUrl(seasonName)+'\');background-size:cover;background-position:left center;background-repeat:no-repeat"></div>'
      +   (photo
            ? '<div style="position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center">'
              + '<img src="'+photo+'" style="max-height:'+maxH+';max-width:'+maxW+';width:auto;height:auto;filter:drop-shadow(0 8px 32px rgba(0,0,0,.5))">'
              + '</div>'
            : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">'
              + '<div style="font-size:11px;color:rgba(255,255,255,.7);background:rgba(0,0,0,.25);padding:8px 14px;border-radius:8px">Upload a client photo</div>'
              + '</div>')
      + '</div>'
      // Footer
      + '<div style="padding:12px 18px;background:white;border-top:1px solid #F0EAE2;display:flex;align-items:center;justify-content:space-between;gap:12px">'
      +   '<div>'
      +     '<div style="font-size:14px;font-weight:700;color:var(--deep)">' + seasonName + '</div>'
      +     '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + (OCA_SEASONS[seasonName] ? OCA_SEASONS[seasonName].desc : '') + '</div>'
      +   '</div>'
      +   (isWinner
            ? '<div style="background:var(--deep);color:white;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0">&#10003; Winner</div>'
            : '<button onclick="ocaBoardsSetWinner(\''+seasonName.replace(/'/g,"\\'")+'\''+')" '
              + 'style="background:var(--warm);border:1px solid var(--sand);color:var(--deep);padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0">Set as Winner</button>')
      + '</div></div>';
  }

  var currentWinner = (typeof ocaReport !== 'undefined') ? ocaReport.primarySeason : '';

  // Header
  var html = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">'
    + '<button onclick="ocaBoardsExpanded=null;renderOca()" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--muted);padding:0;font-family:inherit;display:flex;align-items:center;gap:5px">&#8592; All Seasons</button>'
    + '<div style="flex:1"></div>'
    // Mode toggle
    + '<div style="display:flex;border:1px solid var(--sand);border-radius:10px;overflow:hidden">'
    +   '<button onclick="ocaBoardsCompare=false;renderOca()" style="padding:8px 16px;border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;background:'+(ocaBoardsCompare?'white':'var(--deep)')+';color:'+(ocaBoardsCompare?'var(--deep)':'white')+'">Single</button>'
    +   '<button onclick="ocaBoardsCompare=true;if(!ocaBoardsSeasonB)ocaBoardsSeasonB=Object.keys(OCA_SEASONS)[1];renderOca()" style="padding:8px 16px;border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;background:'+(ocaBoardsCompare?'var(--deep)':'white')+';color:'+(ocaBoardsCompare?'white':'var(--deep)')+'">Compare</button>'
    + '</div>'
    + '</div>';

  if (ocaBoardsCompare) {
    // Compare mode: two season selectors + two boards
    if (!ocaBoardsSeasonB) ocaBoardsSeasonB = Object.keys(OCA_SEASONS)[0];

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">'
      + '<div>'
      +   '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Season A</div>'
      +   mkSelect('ocaBoardsExpanded', ocaBoardsExpanded)
      + '</div>'
      + '<div>'
      +   '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Season B</div>'
      +   mkSelect('ocaBoardsSeasonB', ocaBoardsSeasonB)
      + '</div>'
      + '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">'
      + mkBoard(ocaBoardsExpanded, currentWinner === ocaBoardsExpanded)
      + mkBoard(ocaBoardsSeasonB,  currentWinner === ocaBoardsSeasonB)
      + '</div>';

  } else {
    // Single mode: one season selector + one board
    html += '<div style="margin-bottom:20px">'
      + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Season</div>'
      + mkSelect('ocaBoardsExpanded', ocaBoardsExpanded)
      + '</div>';
    html += mkBoard(ocaBoardsExpanded, currentWinner === ocaBoardsExpanded);
  }

  // Winner confirmation banner
  if (currentWinner) {
    html += '<div style="margin-top:20px;padding:12px 18px;background:#F0FBF0;border:1px solid #B8DDB8;border-radius:10px;display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:16px">&#10003;</span>'
      + '<div><span style="font-weight:700;color:#2A6A2A">' + currentWinner + '</span>'
      + ' <span style="font-size:12px;color:#4A8A4A">set as season result — pre-filled in Generate Report</span></div>'
      + '<button onclick="ocaBoardsClearWinner()" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#4A8A4A;font-size:18px;line-height:1">&#215;</button>'
      + '</div>';
  }

  return html;
}

function ocaBoardsSetWinner(seasonName) {
  if (typeof ocaReport !== 'undefined') {
    ocaReport.primarySeason = seasonName;
  }
  renderOca();
}

function ocaBoardsClearWinner() {
  if (typeof ocaReport !== 'undefined') {
    ocaReport.primarySeason = '';
  }
  renderOca();
}
