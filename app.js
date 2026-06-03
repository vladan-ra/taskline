const CAT_COLORS = {
  people:'#534AB7', admin:'#185FA5', process:'#0F6E56',
  adhoc:'#D85A30', planning:'#639922', ops:'#BA7517',
  workflow:'#993556', restructure:'#5F5E5A'
};
const CAT_LABELS = {
  people:'People mgmt', admin:'Admin & comms', process:'Process & protocol',
  adhoc:'Ad-hoc', planning:'Long-term planning', ops:'Operations',
  workflow:'Workflow & auto', restructure:'Restructuring'
};
const PRIO_COLORS = { critical:'#E24B4A', high:'#EF9F27', medium:'#378ADD', low:'#888780' };
const PRIO_LABELS = { critical:'Critical', high:'High', medium:'Medium', low:'Low' };

const ZOOM_LEVELS = [
  { label:'4 weeks', days:28, colW:40 },
  { label:'8 weeks', days:56, colW:28 },
  { label:'12 weeks', days:84, colW:22 },
  { label:'6 months', days:180, colW:16 },
  { label:'1 year', days:365, colW:10 },
];
let zoomIdx = 2;
let activeView = 'timeline';
let filterPrioVal = 'all';
let filterCatVal = 'all';
let editingId = null;

function today() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}
function parseDate(s) {
  if(!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d);
}
function fmtDate(d) {
  if(!d) return '';
  return d.toLocaleDateString('en-GB', {day:'numeric',month:'short'});
}
function toISO(d) {
  if(!d) return '';
  return d.toISOString().slice(0,10);
}
function daysUntil(d) {
  return Math.round((d - today()) / 86400000);
}

let tasks = JSON.parse(localStorage.getItem('stl-tasks') || '[]');

function saveTasks() {
  localStorage.setItem('stl-tasks', JSON.stringify(tasks));
}

function getFiltered() {
  return tasks.filter(t => {
    if(filterPrioVal !== 'all' && t.priority !== filterPrioVal) return false;
    if(filterCatVal !== 'all' && t.category !== filterCatVal) return false;
    return true;
  });
}

function dueClass(t) {
  if(!t.due) return '';
  const d = parseDate(t.due);
  const diff = daysUntil(d);
  if(diff < 0) return 'overdue';
  if(diff <= 7) return 'soon';
  return '';
}

function dueLabel(t) {
  if(!t.due) return '';
  const d = parseDate(t.due);
  const diff = daysUntil(d);
  if(diff < 0) return `Overdue by ${Math.abs(diff)}d`;
  if(diff === 0) return 'Due today';
  if(diff <= 7) return `Due in ${diff}d`;
  return `Due ${fmtDate(d)}`;
}

// SIDEBAR
function renderSidebar() {
  const list = document.getElementById('sidebar-list');
  const filtered = getFiltered().sort((a,b) => {
    const po = {critical:0,high:1,medium:2,low:3};
    return (po[a.priority]||2) - (po[b.priority]||2);
  });
  document.getElementById('task-count-label').textContent = `(${filtered.length} task${filtered.length!==1?'s':''})`;
  if(!filtered.length) {
    list.innerHTML = '<div style="padding:20px 14px; font-size:13px; color:var(--text3)">No tasks match filters.</div>';
    return;
  }
  list.innerHTML = filtered.map(t => {
    const dc = dueClass(t);
    const dl = dueLabel(t);
    return `<div class="task-row" onclick="openModal('${t.id}')">
      <div class="t-name">${t.name}</div>
      <div class="t-meta">
        <span class="prio-dot" style="background:${PRIO_COLORS[t.priority]}"></span>
        <span class="cat-tag" style="background:${CAT_COLORS[t.category]}22; color:${CAT_COLORS[t.category]}">${CAT_LABELS[t.category]||t.category}</span>
        ${dl ? `<span class="t-due ${dc}">${dl}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// TIMELINE
function renderTimeline() {
  const wrap = document.getElementById('timeline-inner');
  const zoom = ZOOM_LEVELS[zoomIdx];
  document.getElementById('zoom-label').textContent = zoom.label;

  const startD = new Date(today());
  startD.setDate(startD.getDate() - 7);
  const days = zoom.days + 14;
  const colW = zoom.colW;

  const filtered = getFiltered();

  // Build header
  let headerHTML = `<div class="tl-header">`;

  // Date cells
  for(let i = 0; i < days; i++) {
    const d = new Date(startD); d.setDate(d.getDate() + i);
    const isToday = daysUntil(d) === 0;
    const isMon = d.getDay() === 1;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    let label = '';
    if(zoom.days <= 56) {
      if(isMon || i===0) label = d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    } else {
      if(d.getDate()===1 || i===0) label = d.toLocaleDateString('en-GB',{month:'short',year:'2-digit'});
    }
    headerHTML += `<div class="tl-date-cell ${isToday?'today-col':''}" style="width:${colW}px; min-width:${colW}px">${label}</div>`;
  }
  headerHTML += '</div>';

  // Task rows
  let rowsHTML = '';
  if(!filtered.length) {
    rowsHTML = `<div class="empty-state"><b>No tasks yet</b><p>Click "+ Add task" to get started.</p></div>`;
  } else {
    filtered.sort((a,b) => {
      const po = {critical:0,high:1,medium:2,low:3};
      return (po[a.priority]||2) - (po[b.priority]||2);
    }).forEach(t => {
      let cellsHTML = '';
      let barsHTML = '';
      for(let i = 0; i < days; i++) {
        const d = new Date(startD); d.setDate(d.getDate() + i);
        const isToday = daysUntil(d) === 0;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        cellsHTML += `<div class="tl-cell ${isToday?'today-col':''} ${isWeekend?'weekend':''}" style="width:${colW}px; min-width:${colW}px"></div>`;
      }

      if(t.start && t.due) {
        const sd = parseDate(t.start);
        const ed = parseDate(t.due);
        const startOffset = Math.round((sd - startD) / 86400000);
        const endOffset = Math.round((ed - startD) / 86400000);
        const left = Math.max(0, startOffset) * colW;
        const right = Math.min(days, endOffset + 1) * colW;
        const width = Math.max(colW, right - left);
        const dc = dueClass(t);
        const label = width > colW * 3 ? t.name : '';
        barsHTML = `<div class="tl-bar ${dc}" style="left:${left}px; width:${width}px; background:${CAT_COLORS[t.category]}" onclick="openModal('${t.id}')" title="${t.name} — ${PRIO_LABELS[t.priority]} priority — Due ${fmtDate(ed)}">${label}</div>`;
      }

      rowsHTML += `<div class="tl-row">
        <div class="tl-grid-cells" style="position:relative">
          ${cellsHTML}
          <div class="tl-bar-layer">${barsHTML}</div>
        </div>
      </div>`;
    });
  }

  // Today line
  const todayOffset = Math.round((today() - startD) / 86400000);
  const todayLeft = todayOffset * colW + colW / 2;
  const todayLineHTML = `<div class="today-line" style="left:${todayLeft}px; top:36px; height:calc(100% - 36px)"></div>`;

  wrap.innerHTML = `<div style="position:relative; min-width:${days*colW}px">${headerHTML}${rowsHTML}${todayLineHTML}</div>`;
}

// LIST VIEW
function renderList() {
  const lv = document.getElementById('list-view');
  const filtered = getFiltered();

  if(!filtered.length) {
    lv.innerHTML = '<div class="empty-state"><b>No tasks yet</b><p>Click "+ Add task" to get started.</p></div>';
    return;
  }

  const groups = { critical:[], high:[], medium:[], low:[] };
  filtered.forEach(t => (groups[t.priority]||groups.medium).push(t));

  let html = '';
  for(const [prio, items] of Object.entries(groups)) {
    if(!items.length) continue;
    items.sort((a,b) => {
      if(!a.due && !b.due) return 0;
      if(!a.due) return 1; if(!b.due) return -1;
      return parseDate(a.due) - parseDate(b.due);
    });
    html += `<div class="list-group">
      <div class="list-group-title" style="color:${PRIO_COLORS[prio]}">${PRIO_LABELS[prio]} impact</div>
      ${items.map(t => {
        const dc = dueClass(t);
        const dl = dueLabel(t);
        return `<div class="list-card" onclick="openModal('${t.id}')">
          <span class="prio-dot" style="background:${PRIO_COLORS[t.priority]}; margin-top:4px; flex-shrink:0; width:9px; height:9px; border-radius:50%"></span>
          <div class="lc-body">
            <div class="lc-name">${t.name}</div>
            <div class="lc-meta">
              <span class="cat-tag" style="background:${CAT_COLORS[t.category]}22; color:${CAT_COLORS[t.category]}">${CAT_LABELS[t.category]||t.category}</span>
              ${dl ? `<span class="lc-due ${dc}">${dl}</span>` : ''}
            </div>
            ${t.notes ? `<div class="lc-notes">${t.notes}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }
  lv.innerHTML = html;
}

function render() {
  renderSidebar();
  if(activeView === 'timeline') renderTimeline();
  else renderList();
}

// VIEW TOGGLE
function setView(v) {
  activeView = v;
  document.getElementById('btn-tl').classList.toggle('active', v==='timeline');
  document.getElementById('btn-list').classList.toggle('active', v==='list');
  document.getElementById('timeline-inner').style.display = v==='timeline' ? '' : 'none';
  document.getElementById('list-view').style.display = v==='list' ? 'block' : 'none';
  render();
}

function changeZoom(dir) {
  zoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length-1, zoomIdx+dir));
  renderTimeline();
  document.getElementById('zoom-label').textContent = ZOOM_LEVELS[zoomIdx].label;
}

function filterPrio(el, val) {
  filterPrioVal = val;
  document.querySelectorAll('[data-filter-prio]').forEach(b => b.classList.toggle('active', b===el));
  render();
}
function filterCat(el, val) {
  filterCatVal = val;
  document.querySelectorAll('[data-filter-cat]').forEach(b => b.classList.toggle('active', b===el));
  render();
}

// MODAL
function openModal(id) {
  editingId = id;
  const modal = document.getElementById('modal');
  const today = toISO(new Date());
  document.getElementById('btn-delete').style.display = id ? 'inline-flex' : 'none';
  document.getElementById('modal-title').textContent = id ? 'Edit task' : 'Add task';
  if(id) {
    const t = tasks.find(x => x.id===id);
    if(!t) return;
    document.getElementById('f-name').value = t.name;
    document.getElementById('f-cat').value = t.category;
    document.getElementById('f-prio').value = t.priority;
    document.getElementById('f-start').value = t.start||'';
    document.getElementById('f-due').value = t.due||'';
    document.getElementById('f-notes').value = t.notes||'';
  } else {
    document.getElementById('f-name').value = '';
    document.getElementById('f-cat').value = 'planning';
    document.getElementById('f-prio').value = 'medium';
    document.getElementById('f-start').value = today;
    document.getElementById('f-due').value = '';
    document.getElementById('f-notes').value = '';
  }
  modal.classList.add('open');
  setTimeout(() => document.getElementById('f-name').focus(), 50);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  editingId = null;
}
function closeModalOnBackdrop(e) {
  if(e.target === document.getElementById('modal')) closeModal();
}

function saveTask() {
  const name = document.getElementById('f-name').value.trim();
  if(!name) { document.getElementById('f-name').focus(); return; }
  const data = {
    name,
    category: document.getElementById('f-cat').value,
    priority: document.getElementById('f-prio').value,
    start: document.getElementById('f-start').value,
    due: document.getElementById('f-due').value,
    notes: document.getElementById('f-notes').value.trim(),
  };
  if(editingId) {
    const idx = tasks.findIndex(x => x.id===editingId);
    if(idx>=0) tasks[idx] = { ...tasks[idx], ...data };
  } else {
    tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), ...data });
  }
  saveTasks(); closeModal(); render();
}

function deleteTask() {
  if(!editingId) return;
  tasks = tasks.filter(x => x.id!==editingId);
  saveTasks(); closeModal(); render();
}

// KEYBOARD
document.addEventListener('keydown', e => {
  if(e.key==='Escape') closeModal();
  if(e.key==='Enter' && document.getElementById('modal').classList.contains('open')) {
    if(document.activeElement.tagName !== 'TEXTAREA') saveTask();
  }
});

// SEED DATA (demo tasks)
if(!tasks.length) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = (offset) => { const x = new Date(t); x.setDate(x.getDate()+offset); return toISO(x); };
  tasks = [
    { id:'t1', name:'Define Q3 headcount plan', category:'people', priority:'critical', start:d(-3), due:d(10), notes:'Align with finance before board meeting' },
    { id:'t2', name:'Redesign onboarding workflow', category:'process', priority:'high', start:d(0), due:d(21), notes:'' },
    { id:'t3', name:'Resolve team escalation — Project X', category:'adhoc', priority:'critical', start:d(-1), due:d(3), notes:'Blocking delivery' },
    { id:'t4', name:'Automate weekly status report', category:'workflow', priority:'medium', start:d(5), due:d(35), notes:'' },
    { id:'t5', name:'Quarterly roadmap review', category:'planning', priority:'high', start:d(7), due:d(28), notes:'' },
    { id:'t6', name:'Vendor contract renewals', category:'admin', priority:'medium', start:d(2), due:d(14), notes:'' },
    { id:'t7', name:'Restructure ops team reporting lines', category:'restructure', priority:'high', start:d(14), due:d(56), notes:'Pending exec sign-off' },
    { id:'t8', name:'SOPs for new hire process', category:'process', priority:'medium', start:d(7), due:d(42), notes:'' },
    { id:'t9', name:'Infrastructure cost audit', category:'ops', priority:'low', start:d(10), due:d(70), notes:'' },
  ];
  saveTasks();
}

render();
