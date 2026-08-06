// ── State ─────────────────────────────────────────────────────────────────
let allData              = [...ALL_DATA];
let filteredData         = [...allData];
let currentPage          = 1;
let rowsPerPage          = 10;
let sortKey              = 'last';
let sortDir              = 'asc';
let selectedIds          = new Set();
let statusFilter         = null;
let roleFilter           = 'Worker';
let activeTab            = 'employees';
let currentDrawerEmployee = null;

// ── Tabs ──────────────────────────────────────────────────────────────────
function switchTab(el) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  activeTab = el.dataset.tab;
  if (activeTab !== 'employees') {
    toast(`Viewing ${el.textContent.trim().split(/\s+/)[0]}`);
    renderEmpty(activeTab);
  } else {
    applyFilters();
  }
}

function renderEmpty(tab) {
  const labels = {
    contractors: 'No contractors yet — add one to get started.',
    crews: 'No crews configured.',
    archive: 'Archive is empty.',
    issues: '2 issues need your attention. Re-invite users or fix invalid contact info.',
  };
  document.getElementById('tableBody').innerHTML = `<tr><td colspan="14"><div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin:0 auto;display:block">
      <rect x="8" y="10" width="32" height="28" rx="3" stroke="#d5dbe2" stroke-width="2"/>
      <path d="M14 18h20M14 24h14M14 30h10" stroke="#d5dbe2" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <p>${labels[tab] || 'Nothing to show here.'}</p>
  </div></td></tr>`;
  document.getElementById('pagination').innerHTML = '';
  document.getElementById('footerInfo').textContent = '';
}

// ── Sort ──────────────────────────────────────────────────────────────────
function sortBy(key) {
  if (sortKey === key) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey = key; sortDir = 'asc';
  }
  document.querySelectorAll('thead th.sortable').forEach(th => th.classList.remove('sort-asc','sort-desc'));
  const headers = ['first','last','code','role','title','dept','branch','status'];
  const idx = headers.indexOf(key);
  if (idx >= 0) {
    const ths = document.querySelectorAll('thead th.sortable');
    if (ths[idx]) ths[idx].classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  }
  applyFilters();
}

// ── Filter ────────────────────────────────────────────────────────────────
function setStatusFilter(s, el) {
  if (statusFilter === s) {
    statusFilter = null;
    el.classList.remove('active');
  } else {
    statusFilter = s;
    document.querySelectorAll('.filter-chip[data-status]').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  }
  updateFilterCount();
  applyFilters();
}
function setRoleFilter(r, el) {
  if (roleFilter === r) {
    roleFilter = null;
    el.classList.remove('active');
  } else {
    roleFilter = r;
    document.querySelectorAll('.filter-chip[data-role]').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  }
  updateFilterCount();
  applyFilters();
}
function clearFilters() {
  statusFilter = null;
  roleFilter = null;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  updateFilterCount();
  applyFilters();
  toast('Filters cleared');
}
function updateFilterCount() {
  let n = 0;
  if (statusFilter) n++;
  if (roleFilter) n++;
  const el = document.getElementById('filterCount');
  if (n === 0) el.style.display = 'none';
  else { el.style.display = 'inline-flex'; el.textContent = n; }
}

function applyFilters() {
  if (activeTab !== 'employees') return;
  const q = document.getElementById('searchInput').value.toLowerCase();
  filteredData = allData.filter(r => {
    const matchQ = !q
      || r.first.toLowerCase().includes(q)
      || r.last.toLowerCase().includes(q)
      || r.code.toLowerCase().includes(q)
      || (r.email || '').toLowerCase().includes(q);
    const matchS = !statusFilter || r.status === statusFilter;
    const matchR = !roleFilter || r.role === roleFilter;
    return matchQ && matchS && matchR;
  });

  if (sortKey) {
    filteredData.sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }

  const enabled = filteredData.filter(r => r.status === 'Enabled').length;
  const disabled = filteredData.filter(r => r.status === 'Disabled').length;
  document.getElementById('enabled-count').textContent = enabled;
  document.getElementById('disabled-count').textContent = disabled;

  if (currentPage > Math.ceil(filteredData.length / rowsPerPage)) currentPage = 1;
  renderPage();
}

// ── Render ────────────────────────────────────────────────────────────────
function renderPage() {
  const start = (currentPage - 1) * rowsPerPage;
  const rows = filteredData.slice(start, start + rowsPerPage);
  const tbody = document.getElementById('tableBody');

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin:0 auto;display:block">
        <circle cx="22" cy="22" r="12" stroke="#d5dbe2" stroke-width="2"/>
        <path d="M31 31l8 8" stroke="#d5dbe2" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>No employees match your search.</p>
    </div></td></tr>`;
    renderPagination(0);
    document.getElementById('footerInfo').textContent = '';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const checked = selectedIds.has(r.id);
    const badgeClass = r.status === 'Enabled' ? 'badge-enabled'
                     : r.status === 'Pending' ? 'badge-pending' : 'badge-disabled';
    const initial = (r.first[0] || '?') + (r.last[0] || '');
    const phoneShort = r.phone.length > 14 ? r.phone.substring(0, 14) + '…' : r.phone;

    return `<tr class="${checked ? 'selected' : ''}" data-id="${r.id}" onclick="onRowClick(event, ${r.id})" style="cursor:pointer;">
      <td class="col-check" onclick="event.stopPropagation()">
        <div class="cb ${checked ? 'checked' : ''}" onclick="toggleRow(${r.id})">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </td>
      <td>
        <div class="name-cell">
          <span class="avatar" style="background:${r.role === 'Admin' ? '#B8885E' : r.role === 'Worker' ? '#2F5C3D' : ''}">${initial}</span>
          <span class="name-text">
            ${r.first}
            <span class="name-icons">
              ${r.hasFaceId ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4v-1a1 1 0 0 1 1-1h1M14 4v-1a1 1 0 0 0-1-1h-1M2 12v1a1 1 0 0 0 1 1h1M14 12v1a1 1 0 0 1-1 1h-1" stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round"/><circle cx="6" cy="7" r=".7" fill="#f59e0b"/><circle cx="10" cy="7" r=".7" fill="#f59e0b"/><path d="M6 10c.6.5 1.3.7 2 .7s1.4-.2 2-.7" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/></svg>' : ''}
              ${r.hasMessaging ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2L1 7.5l5 1.5 1.5 5L14 2z" stroke="#f59e0b" stroke-width="1.4" stroke-linejoin="round" fill="none"/></svg>' : ''}
            </span>
          </span>
        </div>
      </td>
      <td style="font-weight:600;color:var(--900);">${r.last}</td>
      <td>${r.code || ''}</td>
      <td>${r.role}</td>
      <td>${r.title}</td>
      <td>${r.dept || ''}</td>
      <td>${r.branch || ''}</td>
      <td><span class="badge ${badgeClass}"><span class="badge-dot"></span>${r.status}</span></td>
      <td>${phoneShort}</td>
      <td title="${r.email}" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">${r.email || ''}</td>
      <td>${r.hire}</td>
      <td>${r.start}</td>
      <td onclick="event.stopPropagation()">
        <button class="row-action-btn" onclick="openRowMenu(event, ${r.id})" title="More actions">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="5" r="1.4" fill="currentColor"/>
            <circle cx="10" cy="10" r="1.4" fill="currentColor"/>
            <circle cx="10" cy="15" r="1.4" fill="currentColor"/>
          </svg>
        </button>
      </td>
    </tr>`;
  }).join('');

  syncHeaderCheckbox();
  renderPagination(filteredData.length);
  updateFooterInfo();
  updateBulkActionState();
}

function updateFooterInfo() {
  const total = filteredData.length;
  const start = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, total);
  document.getElementById('footerInfo').textContent = `Showing ${start}–${end} of ${total}`;
}

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / rowsPerPage));
  const el = document.getElementById('pagination');
  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 5l-5 5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`;

  const showPages = [];
  const lastPage = pages;

  if (pages <= 7) {
    for (let p = 1; p <= pages; p++) showPages.push(p);
  } else {
    if (currentPage <= 4) {
      showPages.push(1,2,3,4,5,'...',lastPage);
    } else if (currentPage >= lastPage - 3) {
      showPages.push(1,'...',lastPage-4,lastPage-3,lastPage-2,lastPage-1,lastPage);
    } else {
      showPages.push(1,'...',currentPage-1,currentPage,currentPage+1,'...',lastPage);
    }
  }

  showPages.forEach(p => {
    if (p === '...') {
      html += `<button class="page-btn dots" disabled>...</button>`;
    } else {
      html += `<button class="page-btn ${p===currentPage?'active':''}" onclick="goPage(${p})">${p}</button>`;
    }
  });

  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===pages?'disabled':''}>
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`;
  el.innerHTML = html;
}

function goPage(p) {
  const pages = Math.ceil(filteredData.length / rowsPerPage);
  currentPage = Math.max(1, Math.min(pages, p));
  renderPage();
}

// ── Selection ─────────────────────────────────────────────────────────────
function toggleRow(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  renderPage();
}

function toggleAll() {
  const start = (currentPage - 1) * rowsPerPage;
  const ids = filteredData.slice(start, start + rowsPerPage).map(r => r.id);
  const allSel = ids.every(id => selectedIds.has(id));
  if (allSel) ids.forEach(id => selectedIds.delete(id));
  else ids.forEach(id => selectedIds.add(id));
  renderPage();
}

function syncHeaderCheckbox() {
  const start = (currentPage - 1) * rowsPerPage;
  const ids = filteredData.slice(start, start + rowsPerPage).map(r => r.id);
  const cb = document.getElementById('headerCb');
  if (ids.length && ids.every(id => selectedIds.has(id))) cb.classList.add('checked');
  else cb.classList.remove('checked');
}

function updateBulkActionState() {
  const enabled = selectedIds.size > 0;
  ['actSendSms','actEnable','actDisable','actExclude','actMessaging','actTimeOff'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
}

// ── Bulk Actions ──────────────────────────────────────────────────────────
function bulkAction(label) {
  if (selectedIds.size === 0) {
    toast('Select at least one user first');
    return;
  }
  toast(`${label} → ${selectedIds.size} user(s)`);
  if (label === 'Enable Users') {
    selectedIds.forEach(id => {
      const r = allData.find(x => x.id === id);
      if (r) r.status = 'Enabled';
    });
  } else if (label === 'Disable Users') {
    selectedIds.forEach(id => {
      const r = allData.find(x => x.id === id);
      if (r) r.status = 'Disabled';
    });
  }
  applyFilters();
}

// ── Row menu ──────────────────────────────────────────────────────────────
let activeMenu = null;
function openRowMenu(e, id) {
  e.stopPropagation();
  if (activeMenu) { activeMenu.remove(); activeMenu = null; }
  const r = allData.find(x => x.id === id);
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu open';
  menu.style.cssText = 'position:fixed;z-index:200;min-width:200px;';
  menu.innerHTML = `
    <div class="dropdown-item" onclick="viewProfile(${id})">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      View Profile
    </div>
    <div class="dropdown-item" onclick="closeMenuOnce();toast('Opening paystubs…')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 6h4M6 9h4M6 12h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      View Paystubs
    </div>
    <div class="dropdown-item" onclick="closeMenuOnce();toast('Assigning task…')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Assign Task
    </div>
    <div class="dropdown-item" onclick="closeMenuOnce();toast('Opening SMS…')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 3h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 2V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
      Send SMS
    </div>
    <div class="dropdown-item" onclick="closeMenuOnce();toast('Opening onboarding…')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M4 6l4-4 4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Onboarding
    </div>
    <div class="dropdown-item" onclick="closeMenuOnce();toast('Opening withholdings…')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.4"/><path d="M6 9h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Withholdings
    </div>`;
  document.body.appendChild(menu);
  const rect = e.currentTarget.getBoundingClientRect();
  let top = rect.bottom + 4;
  if (top + menu.offsetHeight > window.innerHeight) top = rect.top - menu.offsetHeight - 4;
  menu.style.top  = `${top}px`;
  menu.style.left = `${rect.right - menu.offsetWidth}px`;
  activeMenu = menu;
  setTimeout(() => document.addEventListener('click', closeMenuOnce, {once:true}), 10);
}
function closeMenuOnce() { if (activeMenu) { activeMenu.remove(); activeMenu = null; } }

function editRow(id) {
  const r = allData.find(x => x.id === id);
  toast(`Editing ${r.first} ${r.last}`);
  closeMenuOnce();
}
function viewProfile(id) {
  closeMenuOnce();
  openDrawer(id);
}
function toggleStatus(id) {
  const r = allData.find(x => x.id === id);
  r.status = r.status === 'Enabled' ? 'Disabled' : 'Enabled';
  toast(`${r.first} ${r.last} → ${r.status}`);
  applyFilters();
}
function resendInvite(id) {
  const r = allData.find(x => x.id === id);
  toast(`Invite resent to ${r.first} ${r.last}`);
  closeMenuOnce();
}
function deleteRow(id) {
  const r = allData.find(x => x.id === id);
  if (!confirm(`Remove ${r.first} ${r.last}?`)) return;
  allData = allData.filter(x => x.id !== id);
  selectedIds.delete(id);
  toast(`Removed ${r.first} ${r.last}`);
  applyFilters();
}

// ── Modal ─────────────────────────────────────────────────────────────────
function openModal() { document.getElementById('modalOverlay').classList.add('open'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function openEditRoleModal(currentRole) {
  const val = currentRole || (currentDrawerEmployee ? currentDrawerEmployee.role : 'Worker');
  const el = document.getElementById('editRoleCurrentVal');
  if (el) el.textContent = val;
  const sel = document.getElementById('editRoleSelect');
  if (sel) sel.value = '';
  document.getElementById('editRoleModal').classList.add('open');
}
function closeEditRoleModal() {
  document.getElementById('editRoleModal').classList.remove('open');
}
function closeEditRoleModalOnOverlay(e) {
  if (e.target === document.getElementById('editRoleModal')) closeEditRoleModal();
}
function saveEditRole() {
  const sel = document.getElementById('editRoleSelect');
  if (sel && sel.value) {
    toast(`Role updated to ${sel.value}`);
    closeEditRoleModal();
  } else {
    toast('Please select a new role');
  }
}
function addEmployee() {
  const first = document.getElementById('f-first').value.trim();
  const last  = document.getElementById('f-last').value.trim();
  if (!first || !last) { toast('First and last name are required'); return; }
  const newId = (allData.length === 0 ? 0 : Math.max(...allData.map(r => r.id))) + 1;
  const code  = document.getElementById('f-code').value || `EMP${String(newId).padStart(4,'0')}`;
  allData.unshift({
    id: newId, first, last, code,
    role:   document.getElementById('f-role').value  || 'Worker',
    title:  document.getElementById('f-title').value || 'Laborer',
    dept:   document.getElementById('f-dept').value  || 'Operations',
    branch: 'Main',
    status: 'Pending',
    phone:  document.getElementById('f-phone').value || '',
    email:  document.getElementById('f-email').value || '',
    hire:   document.getElementById('f-hire').value  || '11/01/2025',
    start:  document.getElementById('f-start').value || '11/01/2025',
    avatar: AVATAR_COLORS[newId % AVATAR_COLORS.length],
    hasFaceId: false, hasMessaging: false,
  });
  ['f-first','f-last','f-code','f-title','f-dept','f-phone','f-email','f-hire','f-start'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-role').value = '';
  closeModal();
  toast(`${first} ${last} added`);
  applyFilters();
}

// ── Filter panel ──────────────────────────────────────────────────────────
function toggleFilters() { document.getElementById('filterPanel').classList.toggle('open'); }
function closeFilters() { document.getElementById('filterPanel').classList.remove('open'); }
document.addEventListener('click', e => {
  if (!e.target.closest('#filterBtn') && !e.target.closest('#filterPanel')) closeFilters();
});

// ── CSV ───────────────────────────────────────────────────────────────────
function downloadCSV() {
  const headers = ['First Name','Last Name','Employee Code','Role','Job Title','Department','Branch','Status','Cell Phone','Email','Hire Date','Start Date'];
  const rows = filteredData.map(r => [r.first,r.last,r.code,r.role,r.title,r.dept,r.branch,r.status,r.phone,r.email,r.hire,r.start]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'employees.csv';
  a.click();
  toast(`Downloaded ${rows.length} employees`);
}

// ── Profile Drawer ────────────────────────────────────────────────────────
function onRowClick(e, id) {
  if (e.target.closest('.cb') || e.target.closest('.row-action-btn') || e.target.closest('.dropdown-menu')) return;
  openDrawer(id);
}

function openDrawer(id) {
  const r = allData.find(x => x.id === id);
  if (!r) return;
  const initial = (r.first[0] || '?') + (r.last[0] || '');
  document.getElementById('d-avatar').textContent = initial.toUpperCase();
  document.getElementById('d-name').textContent = `${r.first} ${r.last}`;
  document.getElementById('d-code').textContent = `#${r.code || 'EMP' + String(r.id).padStart(4,'0')}`;
  document.getElementById('d-role').textContent = r.title || r.role || 'Worker';
  document.getElementById('d-clocked').textContent = 'Clocked In: Mon, 08:00 AM';

  document.getElementById('p-first').value = r.first || '';
  document.getElementById('p-last').value = r.last || '';

  currentDrawerEmployee = r;
  document.getElementById('drawerOverlay').classList.add('open');
  document.getElementById('drawer').setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  const overviewNavEl = document.querySelector('.drawer-nav-item[data-section="overview"]');
  if (overviewNavEl) switchDrawerSection(overviewNavEl);
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
  document.getElementById('drawer').setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

function closeDrawerOnOverlay(e) {
  if (e.target === document.getElementById('drawerOverlay')) closeDrawer();
}

function removeWorkplaceChip(btn) {
  btn.closest('.tag-chip').remove();
}

function addWorkplaceChip(e, input) {
  if (e.key !== 'Enter') return;
  const val = input.value.trim();
  if (!val) return;
  e.preventDefault();
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.innerHTML = `${val}<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`;
  input.parentNode.insertBefore(chip, input);
  input.value = '';
}

const MGR_OPTIONS = [
  { name: 'Tom Henderson',  code: '100034', managedBy: 'Paula Chen',    reportees: 4  },
  { name: 'Maria Gonzalez', code: '100078', managedBy: 'Steve Bradley', reportees: 7  },
  { name: 'James Park',     code: '100012', managedBy: 'Paula Chen',    reportees: 15 },
  { name: 'Sarah Nguyen',   code: '100005', managedBy: 'Robert Kim',    reportees: 9  },
];

function showMgrDropdown(input) {
  const wrap = input.closest('.mgr-field-wrap');
  const dd = wrap.querySelector('.mgr-dropdown');
  const chips = wrap.querySelectorAll('.tag-chip');
  const selected = [...chips].map(c => c.dataset.name);
  const q = input.value.trim().toLowerCase();
  const visible = MGR_OPTIONS.filter(m => !q || m.name.toLowerCase().includes(q));
  const checkedOpts = visible.filter(m => selected.includes(m.name));
  const uncheckedOpts = visible.filter(m => !selected.includes(m.name));
  const checkIcon = `<svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const renderOpt = (m, checked) => `
    <div class="mgr-option" onmousedown="${checked ? `removeMgrChipByName(event,'${m.name}')` : `addMgrChip(event,'${m.name}','${m.code}','${m.managedBy}',${m.reportees})`}">
      <div class="mgr-option-check ${checked ? 'mgr-option-check--on' : ''}">${checked ? checkIcon : ''}</div>
      <div>
        <div class="mgr-option-name">${m.name}</div>
        <div class="mgr-option-meta"># ${m.code} · 1 Manager · ${m.reportees} reportees</div>
      </div>
    </div>`;
  dd.innerHTML = visible.length
    ? [...checkedOpts.map(m => renderOpt(m, true)), ...uncheckedOpts.map(m => renderOpt(m, false))].join('')
    : `<div class="mgr-option mgr-option--empty">No options</div>`;
  dd.classList.add('open');
}

function hideMgrDropdown(input) {
  const dd = input.closest('.mgr-field-wrap').querySelector('.mgr-dropdown');
  setTimeout(() => dd.classList.remove('open'), 150);
}

function addMgrChip(e, name, code, managedBy, reportees) {
  e.preventDefault();
  const wrap = e.target.closest('.mgr-field-wrap');
  const input = wrap.querySelector('input');
  const removeBtn = `<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`;
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.dataset.name = name;
  chip.innerHTML = `${name}${removeBtn}`;
  input.parentNode.insertBefore(chip, input);
  input.value = '';
  showMgrDropdown(input);
}

function removeMgrChipByName(e, name) {
  e.preventDefault();
  const wrap = e.target.closest('.mgr-field-wrap');
  const chip = [...wrap.querySelectorAll('.tag-chip')].find(c => c.dataset.name === name);
  if (chip) chip.remove();
  showMgrDropdown(wrap.querySelector('input'));
}

function saveJob() {
  const r = currentDrawerEmployee;
  if (r) {
    const g = id => document.getElementById(id);
    r.code       = g('j-code')?.value.trim()        || r.code;
    r.title      = g('j-title')?.value.trim()       || r.title;
    r.hire       = g('j-hire')?.value.trim()        || r.hire;
    r.start      = g('j-start')?.value.trim()       || r.start;
    r.shiftType  = g('j-shift-type')?.value         || r.shiftType;
    r.shiftStart = g('j-shift-start')?.value        || r.shiftStart;
    r.shiftEnd   = g('j-shift-end')?.value          || r.shiftEnd;
    const primaryWp = g('j-primary-wp')?.value;
    if (primaryWp) {
      const chips = document.getElementById('j-workplaces')?.querySelectorAll('.tag-chip') || [];
      const wpList = Array.from(chips).map(c => {
        const clone = c.cloneNode(true);
        clone.querySelectorAll('button').forEach(b => b.remove());
        return clone.textContent.trim();
      }).filter(Boolean);
      r.workplaces = wpList.length ? wpList : [primaryWp];
    }
    document.getElementById('d-code').textContent = `#${r.code || 'EMP' + String(r.id).padStart(4,'0')}`;
  }
  toast('Job details saved');
  closeDrawer();
}

// ── Overview ──────────────────────────────────────────────────────────────
function ovAddBtn(section, heading) {
  return `<button class="ov-add-link" onclick="navigateToDrawerSection('${section}','${heading}')"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Add</button>`;
}

function buildOverviewSectionHTML() {
  const r           = currentDrawerEmployee;
  const code        = r ? (r.code || `EMP${String(r.id).padStart(4,'0')}`) : 'EMP0001';
  const status      = 'Enabled'; /* locked — do not change */
  const rawPhone    = r ? r.phone  : '';
  const phone       = rawPhone && !rawPhone.startsWith('+') ? `+1 ${rawPhone}` : rawPhone;
  const email       = r ? r.email  : '';
  const title       = r ? r.title  : 'Journeyman';
  const hire        = r ? r.hire   : '—';
  const start       = r ? r.start  : '—';
  const shiftType   = r ? (r.shiftType  || '4 × 10')    : '4 × 10';
  const shiftStart  = r ? (r.shiftStart || '05:00 AM')   : '05:00 AM';
  const shiftEnd    = r ? (r.shiftEnd   || '03:00 PM')   : '03:00 PM';
  const shiftDetails = `${shiftType} · ${shiftStart} – ${shiftEnd}`;
  const street      = r ? (r.street || '') : '';
  const city        = r ? (r.city   || '') : '';
  const state       = r ? (r.state  || '') : '';
  const zip         = r ? (r.zip    || '') : '';
  const address     = street ? `${street}, ${city} ${state} ${zip}`.trim() : '';
  const wpArr       = r ? (r.workplaces || []) : [];
  const wpDisplay   = Array.isArray(wpArr) ? wpArr[0] || '' : wpArr;
  const mgr         = r ? (r.manager      || '') : '';
  const mgrTitle    = r ? (r.managerTitle || '') : '';
  const mgrInitials = mgr ? mgr.split(' ').map(w => w[0]).join('').toUpperCase() : '';
  const emgContact  = r ? (r.emergencyContact || '') : '';
  const ssnLast4    = r ? (r.ssnLast4 || '0000') : '0000';

  const SC = {
    'Enabled':  { bg: 'var(--green-bg)',  bd: 'var(--green-border)',  tx: 'var(--green-text)'  },
    'Pending':  { bg: 'var(--yellow-bg)', bd: 'var(--yellow-border)', tx: 'var(--yellow-text)' },
    'Disabled': { bg: 'var(--red-bg)',    bd: 'var(--red-border)',    tx: 'var(--red-text)'    },
  };
  const sc = SC[status] || SC['Enabled'];
  const statusChip = `<span class="ov-status-chip" style="background:${sc.bg};border-color:${sc.bd};color:${sc.tx};">${status}</span>`;

  const MAX_H = 10, TRACK_H = 100;
  const _today = new Date();
  const _dow = _today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const todayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][_dow];
  // Order Mon–Sun; map each to its JS getDay() value
  const WEEK_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const DAY_NUM    = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 };
  const OFF_DAYS   = new Set(['Sat','Sun']);
  // Sample hours for days that have data (past + today)
  const SAMPLE = {
    Mon: { hours: 10.0, worked: 10.0 },
    Tue: { hours: 10.0, worked: 8.0,  extra: 2.0, extraLabel: 'PTO'     },
    Wed: { hours: 10.0, worked: 10.0 },
    Thu: { hours:  7.5, worked: 5.5,  extra: 2.0, extraLabel: 'Holiday' },
    Fri: { hours:  8.0, worked: 8.0  },
  };
  // A day is "future" if it comes after today in the Mon–Sun week order
  const todayNum = _dow === 0 ? 7 : _dow; // treat Sun as 7 so Mon(1)<...<Sat(6)<Sun(7)
  const days = WEEK_ORDER.map(label => {
    const isOff    = OFF_DAYS.has(label);
    const dNum     = DAY_NUM[label] === 0 ? 7 : DAY_NUM[label];
    const isFuture = dNum > todayNum;
    if (isOff || isFuture) return { label, off: true };
    return { label, ...(SAMPLE[label] || { hours: 8, worked: 8 }) };
  });
  // Dynamic week label: Monday – Friday of the current week
  const _monday = new Date(_today);
  _monday.setDate(_today.getDate() - (_dow === 0 ? 6 : _dow - 1));
  const _friday = new Date(_monday); _friday.setDate(_monday.getDate() + 4);
  const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekLabel = `Week of ${_MONTHS[_monday.getMonth()]} ${_monday.getDate()} – ${_friday.getDate()}, ${_friday.getFullYear()}`;
  const bars = days.map(d => {
    const px      = d.off ? 0 : Math.round((d.hours / MAX_H) * TRACK_H);
    const isToday = d.label === todayLabel;
    const tipData = d.off ? '' : [
      `data-hours="${d.hours}"`,
      `data-worked="${d.worked}"`,
      d.extra ? `data-extra="${d.extra}" data-extra-label="${d.extraLabel}"` : '',
    ].join(' ');
    return `<div class="ov-chart-col${isToday ? ' ov-chart-col--today' : ''}" ${tipData} onmouseenter="showBarTooltip(this,event)" onmouseleave="hideBarTooltip()">
      <div class="ov-chart-bar-track${isToday ? ' ov-chart-bar-track--today' : ''}">
        ${d.off ? '' : `<div class="ov-chart-bar" style="height:${px}px;background:${isToday ? 'var(--blue)' : '#D1E0FF'};"></div>`}
      </div>
    </div>`;
  }).join('');
  const dayLabels = days.map(d => {
    const isToday = d.label === todayLabel;
    return `<div class="ov-chart-label-col"><span class="ov-chart-day-label${isToday ? ' ov-chart-day-label--today' : ''}">${d.label}</span></div>`;
  }).join('');

  return `
  <div class="ov-grid">

    <!-- ── Left 8 cols: operational content ── -->
    <div class="ov-main">

      <div class="ov-section">
        <h3 class="ov-section-title">Issues</h3>
        <div class="ov-issues-list">
          <div class="ov-issue-item">
            <span class="ov-issue-dot ov-issue-dot--high"></span>
            <div class="ov-issue-body">
              <span class="ov-issue-title">Onboarding Documents Incomplete</span>
              <span class="ov-issue-desc">3 required documents pending — Form I-9 Section 1, Jobsite Safety Form, Health Insurance Certificate.</span>
            </div>
            <button class="ov-resolve-btn" onclick="toast('Opening issue')">Resolve</button>
          </div>
          <div class="ov-issue-item">
            <span class="ov-issue-dot ov-issue-dot--med"></span>
            <div class="ov-issue-body">
              <span class="ov-issue-title">Payroll Setup Incomplete</span>
              <span class="ov-issue-desc">Direct deposit banking information has not been configured.</span>
            </div>
            <button class="ov-resolve-btn" onclick="toast('Opening issue')">Resolve</button>
          </div>
          <div class="ov-issue-item">
            <span class="ov-issue-dot ov-issue-dot--low"></span>
            <div class="ov-issue-body">
              <span class="ov-issue-title">Emergency Contact Missing</span>
              <span class="ov-issue-desc">No emergency contact has been added to this employee record.</span>
            </div>
            <button class="ov-resolve-btn" onclick="toast('Opening issue')">Resolve</button>
          </div>
        </div>
      </div>

      <div class="ov-section">
        <h3 class="ov-section-title">Upcoming Time Off</h3>
        <div class="ov-timeoff-wrap">
          <table class="ov-timeoff-table">
            <thead><tr><th>Type</th><th>Dates</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>
              <tr>
                <td>Vacation</td><td>Jun 2 – Jun 6, 2026</td><td>40 hrs</td>
                <td><span class="ov-to-status ov-to-status--approved">Approved</span></td>
              </tr>
              <tr>
                <td>Personal</td><td>Jun 20, 2026</td><td>8 hrs</td>
                <td><span class="ov-to-status ov-to-status--pending">Pending</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="ov-section ov-section--last">
        <div class="ov-section-hd-row">
          <h3 class="ov-section-title" style="margin-bottom:0;">Shift Overview</h3>
          <button class="btn-inline-link" onclick="navigateToDrawerSection('timesheet')">View Timesheet</button>
        </div>
        <div class="ov-chart-meta-row">
          <span class="ov-chart-meta-label"><span class="ov-chart-meta-highlight">${days.filter(d=>!d.off).reduce((s,d)=>s+d.hours,0)}h</span> total in ${weekLabel}</span>
        </div>
        <div class="ov-chart-wrap">
          <div class="ov-chart-y-axis">
            <span class="ov-chart-y-label">10h</span>
            <span class="ov-chart-y-label">5h</span>
            <span class="ov-chart-y-label">0h</span>
          </div>
          <div class="ov-chart-bars-area">
            <div class="ov-chart-bars">${bars}</div>
            <div class="ov-chart-xaxis-line"></div>
            <div class="ov-chart-day-labels">${dayLabels}</div>
          </div>
        </div>
      </div>

    </div><!-- /.ov-main -->

    <!-- ── Right 4 cols: sticky summary ── -->
    <div class="ov-sidebar">
      <div class="ov-sidebar-inner">
        <h3 class="ov-section-title">General Details</h3>
        <div class="ov-details-grid">
          <div class="ov-detail-item"><span class="ov-meta-label">Work Phone</span>${phone ? `<span class="ov-meta-value">${phone}</span>` : ovAddBtn('profile','Contact')}</div>
          <div class="ov-detail-item"><span class="ov-meta-label">Work Email</span>${email ? `<span class="ov-meta-value ov-meta-mono">${email}</span>` : ovAddBtn('profile','Contact')}</div>
          <div class="ov-detail-item"><span class="ov-meta-label">Address</span>${address ? `<span class="ov-meta-value">${address}</span>` : ovAddBtn('profile','Contact Details')}</div>
          <div class="ov-detail-item"><span class="ov-meta-label">Emergency Contact</span>${emgContact ? `<span class="ov-meta-value">${emgContact}</span>` : ovAddBtn('profile','Emergency Contact')}</div>
          <div class="ov-detail-item">
            <span class="ov-meta-label">SSN</span>
            <div class="ov-ssn-row">
              <span class="ov-meta-value ov-meta-masked" id="ov-ssn-val" data-last4="${ssnLast4}">XXX-XX-${ssnLast4}</span>
              <button class="ov-ssn-toggle" onclick="toggleOverviewSsn()" title="Show / hide SSN">
                <svg id="ov-ssn-eye" width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="ov-detail-item"><span class="ov-meta-label">Job Title</span><span class="ov-meta-value">${title}</span></div>
          <div class="ov-detail-item"><span class="ov-meta-label">Employee Code</span><span class="ov-meta-value">${code}</span></div>
          <div class="ov-detail-item"><span class="ov-meta-label">Employee Status</span>${statusChip}</div>
          <div class="ov-detail-item"><span class="ov-meta-label">Hire Date</span><span class="ov-meta-value">${hire}</span></div>
          <div class="ov-detail-item"><span class="ov-meta-label">Start Date</span><span class="ov-meta-value">${start}</span></div>
          <div class="ov-detail-item"><span class="ov-meta-label">Shift Details</span><span class="ov-meta-value">${shiftDetails}</span></div>
          <div class="ov-detail-item"><span class="ov-meta-label">Primary Workplace</span>${wpDisplay ? `<span class="ov-meta-value">${wpDisplay}</span>` : ovAddBtn('job','Workplace Details')}</div>
          <div class="ov-detail-item">
            <span class="ov-meta-label">Manager</span>
            ${mgr ? `
            <div class="ov-manager-cell">
              <div class="ov-manager-avatar">${mgrInitials}</div>
              <div class="ov-manager-info">
                <span class="ov-manager-name">${mgr}</span>
                <span class="ov-manager-role">${mgrTitle}</span>
              </div>
            </div>` : ovAddBtn('job','Employment')}
          </div>
          <div class="ov-detail-item"><span class="ov-meta-label">Credentials</span><span class="ov-meta-value">${CREDENTIALS_DATA.length}</span></div>
        </div>
      </div>
      <div class="ov-sidebar-inner" style="margin-top:24px;">
        <h3 class="ov-section-title">Employment History</h3>
        <div class="pay-table-wrap"><table class="pay-table">
          <thead>
            <tr>
              <th>Effective Date</th>
              <th>Employment Status</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Jun 3, 2024</td>
              <td><span class="badge badge-enabled"><span class="badge-dot"></span>Active</span></td>
              <td class="emp-hist-comment">Returned from leave of absence</td>
            </tr>
            <tr>
              <td>Oct 14, 2023</td>
              <td><span class="badge badge-leave"><span class="badge-dot"></span>Leave of Absence</span></td>
              <td class="emp-hist-comment">Approved leave of absence – personal</td>
            </tr>
            <tr>
              <td>Mar 20, 2023</td>
              <td><span class="badge badge-enabled"><span class="badge-dot"></span>Active</span></td>
              <td class="emp-hist-comment">Onboarding completed – became active</td>
            </tr>
            <tr>
              <td>Mar 5, 2023</td>
              <td><span class="badge badge-onboarding"><span class="badge-dot"></span>Onboarding</span></td>
              <td class="emp-hist-comment">User created – onboarding initiated</td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div><!-- /.ov-sidebar -->

  </div><!-- /.ov-grid -->`;
}

function buildJobSectionHTML() {
  const r         = currentDrawerEmployee;
  const role      = r ? r.role       : 'Worker';
  const code      = r ? (r.code || '') : '';
  const hire      = r ? r.hire       : '12/04/2025';
  const start     = r ? r.start      : '12/04/2025';
  const title     = r ? r.title      : 'Worker';
  const shiftType = r ? (r.shiftType  || '4 × 10')  : '4 × 10';
  const mgr         = r ? (r.manager      || '') : '';
  const mgrTitle    = r ? (r.managerTitle || '') : '';
  const mgrInitials = mgr ? mgr.split(' ').map(w => w[0]).join('').toUpperCase() : '';
  const shiftStart = r ? (r.shiftStart || '05:00 AM') : '05:00 AM';
  const shiftEnd   = r ? (r.shiftEnd   || '03:00 PM') : '03:00 PM';
  const wpArr     = r ? (r.workplaces || []) : ['Portland Construction Work-OR'];
  const wpList    = Array.isArray(wpArr) ? wpArr : [wpArr];

  const roleOpts = ['Worker','Foreman','Supervisor','Admin'].map(
    v => `<option${v===role?' selected':''}>${v}</option>`).join('');

  const shiftTypeOpts = ['4 × 10','5 × 8','3 × 12','Flex','Rotating'].map(
    v => `<option${v===shiftType?' selected':''}>${v}</option>`).join('');

  const startTimeOpts = ['04:00 AM','04:30 AM','05:00 AM','05:30 AM','06:00 AM','06:30 AM','07:00 AM','07:30 AM','08:00 AM'].map(
    v => `<option${v===shiftStart?' selected':''}>${v}</option>`).join('');

  const endTimeOpts = ['01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','06:00 PM'].map(
    v => `<option${v===shiftEnd?' selected':''}>${v}</option>`).join('');

  const removeBtn = `<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`;
  const chipHTML  = wpList.map(w => `<span class="tag-chip">${w} ${removeBtn}</span>`).join('');
  const primaryOpts = wpList.map(w => `<option selected>${w}</option>`).join('');

  return `
  <div class="job-grid">
  <div class="section">
    <h3>Employment</h3>
    <div class="field-grid">
      <div class="field">
        <label>Employee Code</label>
        <input class="field-input" id="j-code" value="${code}" placeholder="Enter" />
      </div>
      <div class="field">
        <label>Employment Type</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Full-time</option>
          <option>Part-time</option>
          <option>Contract</option>
          <option>Temporary</option>
        </select></div>
      </div>

      <div class="field">
        <label>Hire Date <span class="field-required">*</span></label>
        <div class="date-input"><input class="field-input" id="j-hire" value="${hire}" placeholder="MM/DD/YYYY" /></div>
      </div>
      <div class="field">
        <label>Start Date <span class="field-required">*</span></label>
        <div class="date-input"><input class="field-input" id="j-start" value="${start}" placeholder="MM/DD/YYYY" /></div>
      </div>
      <div class="field">
        <label>Effective Tenure Date <span class="field-required">*</span></label>
        <div class="date-input"><input class="field-input" value="" placeholder="MM/DD/YYYY" /></div>
      </div>

      <div class="field">
        <label>Job Title <span class="field-required">*</span></label>
        <input class="field-input" id="j-title" value="${title}" />
      </div>
      <div class="field">
        <label>Job Classification <span class="field-required">*</span></label>
        <div class="tl-field-readonly">
          <span class="tl-field-val">CM-JM</span>
          <span class="tl-field-effective">Eff. Mar 5, 2025</span>
        </div>
        <div class="field-helper-row">
          <button class="field-helper-link" id="tl-view-btn-classification" onclick="openTimelinePane('classification')" type="button">View Timeline</button>
        </div>
      </div>
      <div class="field">
        <label>Job Level <span class="field-required">*</span></label>
        <div class="tl-field-readonly">
          <span class="tl-field-val">Journeyman</span>
          <span class="tl-field-effective">Eff. Mar 5, 2025</span>
        </div>
        <div class="field-helper-row">
          <button class="field-helper-link" id="tl-view-btn-level" onclick="openTimelinePane('level')" type="button">View Timeline</button>
        </div>
      </div>

      <div class="field">
        <label>EEOC Job Classification</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Craft Workers</option>
          <option>Laborers &amp; Helpers</option>
          <option>Service Workers</option>
          <option>Professionals</option>
          <option>Officials &amp; Managers</option>
        </select></div>
      </div>
      <div class="field">
        <label>Probation</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>Waived</option>
        </select></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Workplace</h3>
    <div class="field-grid">
      <div class="field" style="grid-column:span 8;">
        <label>Workplaces <span class="field-required">*</span></label>
        <div class="tag-input-field" id="j-workplaces" onclick="this.querySelector('input').focus()">
          ${chipHTML}
          <input type="text" placeholder="" onkeydown="addWorkplaceChip(event, this)" />
        </div>
      </div>
      <div class="field">
        <label>Primary Workplace <span class="field-required">*</span></label>
        <div class="select-wrapper"><select class="field-input" id="j-primary-wp">
          ${primaryOpts}
          <option>East California Boulevard</option>
          <option>Downtown Office</option>
          <option>North Seattle Site</option>
          <option>Sacramento Yard</option>
        </select></div>
      </div>

      <div class="field">
        <label>Department</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Field Operations</option>
          <option>Administration</option>
          <option>Safety</option>
          <option>Estimating</option>
          <option>Project Management</option>
        </select></div>
      </div>
      <div class="field">
        <label>Branch</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Portland</option>
          <option>Seattle</option>
          <option>Sacramento</option>
          <option>San Jose</option>
        </select></div>
      </div>
      <div class="field">
        <label>Class</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Commercial</option>
          <option>Residential</option>
          <option>Industrial</option>
          <option>Infrastructure</option>
        </select></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Shift</h3>
    <div class="field-grid">
      <div class="field">
        <label>Shift Type <span class="field-required">*</span></label>
        <div class="select-wrapper"><select class="field-input" id="j-shift-type">
          <option value="">Select</option>
          ${shiftTypeOpts}
        </select></div>
      </div>
      <div class="field">
        <label>Start &amp; End Time</label>
        <div class="time-range-field">
          <div class="select-wrapper" style="flex:1;"><select class="field-input" id="j-shift-start">${startTimeOpts}</select></div>
          <span class="time-range-sep">-</span>
          <div class="select-wrapper" style="flex:1;"><select class="field-input" id="j-shift-end">${endTimeOpts}</select></div>
        </div>
      </div>
      <div class="field">
        <label>Assigned Shift</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Morning Crew</option>
          <option>Afternoon Crew</option>
          <option>Night Crew</option>
        </select></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Union &amp; Program</h3>
    <div class="field-grid">
      <div class="field">
        <label>Union</label>
        <div class="tl-field-readonly">
          <span class="tl-field-val">Cement Masons</span>
          <span class="tl-field-effective">Eff. Jun 1, 2024</span>
        </div>
        <div class="field-helper-row">
          <button class="field-helper-link" id="tl-view-btn-union" onclick="openTimelinePane('union')" type="button">View Timeline</button>
        </div>
      </div>
      <div class="field">
        <label>Apprentice Program</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Year 1 – Foundation</option>
          <option>Year 2 – Core Skills</option>
          <option>Year 3 – Advanced</option>
          <option>Year 4 – Journeyman Prep</option>
        </select></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-hd-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
      <h3>Manager &amp; Reports</h3>
      <button class="field-helper-link" onclick="toast('View Org Chart')" type="button" style="color:var(--700);display:inline-flex;align-items:center;gap:4px;">View Org Chart<svg width="13" height="13" viewBox="0 0 14 14" fill="none" style="flex-shrink:0"><path d="M5 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9M8 1h5m0 0v5m0-5L6 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
    <div class="field-grid">
      <div class="field">
        <label>Manager</label>
        <div class="mgr-field-wrap">
          <div class="tag-input-field" onclick="this.querySelector('input').focus()">
            ${MANAGER_HISTORY.filter(m => m.status === 'active').map(m =>
              `<span class="tag-chip" data-name="${m.name}">${m.name}<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></span>`
            ).join('')}
            <input type="text" onfocus="showMgrDropdown(this)" oninput="showMgrDropdown(this)" onblur="hideMgrDropdown(this)" />
          </div>
          <div class="mgr-dropdown"></div>
        </div>
        <div class="field-helper-row">
          <button class="field-helper-link" id="mgr-history-btn" onclick="openManagerHistoryPane()" type="button">View Manager History</button>
        </div>
      </div>
      <div class="field">
        <label>Direct Reports</label>
        <div class="select-wrapper"><select class="field-input">
          <option value="">Select</option>
          <option>Marcus Webb</option>
          <option>Sarah Chen</option>
          <option>Robert Torres</option>
        </select></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Roles &amp; Permissions</h3>
    <div class="field-grid">
      <div class="field">
        <label>Role</label>
        <div class="readonly-field-row">
          <span class="readonly-field-val">${role}</span>
        </div>
        <div class="field-helper-row">
          <button class="field-helper-link" onclick="openEditRoleModal('${role}')" type="button">Edit Role</button>
        </div>
      </div>
      <div class="field">
        <label>Managing Departments</label>
        <div class="tag-input-field" onclick="this.querySelector('input').focus()">
          <span class="tag-chip">Field Operations<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></span>
          <span class="tag-chip">Safety<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></span>
          <input type="text" placeholder="Add department…" onkeydown="addWorkplaceChip(event, this)" />
        </div>
      </div>
      <div class="field">
        <label>Managing Crews</label>
        <div class="tag-input-field" onclick="this.querySelector('input').focus()">
          <span class="tag-chip">Morning Crew<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></span>
          <input type="text" placeholder="Add crew…" onkeydown="addWorkplaceChip(event, this)" />
        </div>
      </div>
    </div>
  </div>
  </div><!-- /.job-grid -->

`;
}

function switchTimeAttendanceTab(el) {
  document.getElementById('drawer-header-subnav').querySelectorAll('.ta-subnav-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const tab = el.dataset.tab;
  document.getElementById('ta-tab-body').innerHTML =
    tab === 'timesheet' ? buildTimesheetSectionHTML() : buildAttendanceExceptionsSectionHTML();
}

function buildTimeAttendanceSectionHTML() {
  return `<div id="ta-tab-body" class="ta-tab-body">${buildTimesheetSectionHTML()}</div>`;
}

function buildAttendanceExceptionsSectionHTML() {
  const calIco = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const dlIco  = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const weekRange = (() => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7)); const sun = new Date(mon); sun.setDate(mon.getDate()+6); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const f = d => `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; return `${f(mon)} – ${f(sun)}`; })();
  const totalDemeritPoints = 0;
  return `
  <div class="ae-stack">
    <div class="ae-toolbar">
      <button class="ae-date-btn" onclick="toast('Change date range')">
        <span>${weekRange}</span>
        ${calIco}
      </button>
      <button class="btn" onclick="toast('Downloading CSV')">
        ${dlIco} Download CSV
      </button>
    </div>

    ${totalDemeritPoints > 0 ? `<div class="ae-summary">
      <span class="ae-summary-lbl">Total Demerit Points</span>
      <span class="ae-summary-val">${totalDemeritPoints} points</span>
    </div>` : ''}

    <div class="ae-table-wrap">
      <table class="ae-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Exception Code</th>
            <th>Deviation</th>
            <th>Threshold</th>
            <th>Demerit Points</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr class="ae-empty-row">
            <td colspan="6">No rows</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

function buildTimesheetSectionHTML() {
  const chevLeft  = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13 5l-6 5 6 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const chevRight = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M7 5l6 5-6 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const icoInfo   = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 6.5v.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const icoNotes  = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 3a1 1 0 0 1 1-1h8l4 4v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M13 2v5h5M8 10h5M8 13h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const icoFace   = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6V4a1 1 0 0 1 1-1h2M14 3h2a1 1 0 0 1 1 1v2M17 14v2a1 1 0 0 1-1 1h-2M6 17H4a1 1 0 0 1-1-1v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="7.5" cy="9" r="1" fill="currentColor"/><circle cx="12.5" cy="9" r="1" fill="currentColor"/><path d="M7 13c.9.8 2 1.2 3 1.2s2.1-.4 3-1.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
  const icoPin    = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 0 1 6 6c0 4-6 10-6 10S4 12 4 8a6 6 0 0 1 6-6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>`;
  const icoCar    = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="7" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 8l2-4h8l2 4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="6" cy="15" r="1.5" fill="currentColor"/><circle cx="14" cy="15" r="1.5" fill="currentColor"/></svg>`;
  const icoSig    = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 15c2-2 3-7 5-7 1.3 0 1.3 3 2.6 3s2-3 3.4-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 15h16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
  const icoInj    = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="8.5" y="3" width="3" height="14" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="8.5" width="14" height="3" rx="1.5" stroke="currentColor" stroke-width="1.3"/></svg>`;
  const icoQ      = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M8 8c0-1.1.9-2 2-2s2 .9 2 2c0 .8-.5 1.5-1.2 1.8L10 10.5V12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="10" cy="14.5" r=".8" fill="currentColor"/></svg>`;
  const icoCheck  = `<svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 7-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const icoMore   = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="5" r="1.2" fill="currentColor"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/><circle cx="10" cy="15" r="1.2" fill="currentColor"/></svg>`;
  const icoClock  = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#F79009" stroke-width="1.5"/><path d="M10 6v4l2.5 2.5" stroke="#F79009" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const icoWarn   = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M10 3L2 17h16L10 3z" stroke="#F04438" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 9v4M10 14.5v.5" stroke="#F04438" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  const _now = new Date();
  const _mon = new Date(_now); _mon.setDate(_now.getDate() - ((_now.getDay()+6)%7));
  const _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const _hours = ['8h 51m','7h 20m','9h 49m','8h 18m','10h 47m','9h 16m','7h 45m'];
  const _hrs   = ['8.85h','7.33h','9.82h','8.30h','10.78h','9.27h','7.75h'];
  const _today = _now.getDay() === 0 ? 6 : _now.getDay() - 1;
  const days = _dayNames.map((day, i) => {
    const d = new Date(_mon); d.setDate(_mon.getDate() + i);
    const future = i > _today;
    return { day, date: `${_months[d.getMonth()]} ${d.getDate()}`, time: future ? '–' : _hours[i], hrs: future ? '' : _hrs[i], active: i === _today };
  });

  const daysHTML = days.map(d => `
    <button class="tsv-day${d.active ? ' active' : ''}" onclick="toast('Switch to ${d.day}')">
      <span class="tsv-day-name">${d.day}, ${d.date}</span>
      <span class="tsv-day-hrs">${d.time}${d.hrs ? ` (${d.hrs})` : ''}</span>
    </button>`).join('');

  const cardTabs = [
    { label:'Overview',  icon: icoInfo,  active: true },
    { label:'Notes',     icon: icoNotes  },
    { label:'Face ID',   icon: icoFace   },
    { label:'Geofence',  icon: icoPin    },
    { label:'Mileage',   icon: icoCar    },
    { label:'Signature', icon: icoSig    },
    { label:'Injury',    icon: icoInj    },
    { label:'Questions', icon: icoQ      },
  ];

  const cardTabsHTML = cardTabs.map(t => `
    <button class="tsv-ctab${t.active ? ' active' : ''}" onclick="toast('${t.label} tab')">
      ${t.icon}${t.label}
    </button>`).join('');

  const entryRows = [
    { project:'Downtown Tower', task:'Main Panel Install', code:'EL-001', classification:'Commercial', time:'7:00am – 11:00am (4 hours)', warn: true, approve: true },
    { project:'Downtown Tower', task:'Wiring Phase 1',    code:'EL-002', classification:'Commercial', time:'12:00pm – 4:00pm (4 hours)', warn: true, approve: true },
    { meal: true, label:'Meal Break', paid: true, time:'11:00am – 12:00pm (1 hours)' },
  ];

  const entryRowsHTML = entryRows.map(r => r.meal ? `
    <tr class="tsv-row tsv-row-meal">
      <td class="tsv-td"><div class="tsv-meal-avatar">M</div><span class="tsv-meal-label">${r.label}</span><span class="tsv-meal-paid">| Paid</span></td>
      <td class="tsv-td"></td>
      <td class="tsv-td"></td>
      <td class="tsv-td"></td>
      <td class="tsv-td tsv-td-time">${r.time}</td>
      <td class="tsv-td"></td>
    </tr>` : `
    <tr class="tsv-row">
      <td class="tsv-td">${r.project}</td>
      <td class="tsv-td">${r.task}</td>
      <td class="tsv-td">${r.code}</td>
      <td class="tsv-td">${r.classification}</td>
      <td class="tsv-td tsv-td-time">${r.time} ${r.warn ? `<span class="tsv-ico">${icoClock}</span><span class="tsv-ico">${icoWarn}</span>` : ''}</td>
      <td class="tsv-td tsv-td-actions">
        <div class="tsv-actions-wrap">
          <button class="tsv-approve-btn" onclick="toast('Entry approved')">${icoCheck} Approve</button>
          <button class="tsv-more-btn" onclick="toast('More options')">${icoMore}</button>
        </div>
      </td>
    </tr>`).join('');

  const bottomIcons = [
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 3L2 17h16L10 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 9v4M10 14.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 8h14M7 2v3M13 2v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 3a1 1 0 0 1 1-1h8l4 4v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M13 2v5h5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 0 1 6 6c0 4-6 10-6 10S4 12 4 8a6 6 0 0 1 6-6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="7" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 8l2-4h8l2 4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="6" cy="15" r="1.5" fill="currentColor"/><circle cx="14" cy="15" r="1.5" fill="currentColor"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ];

  return `
  <div class="tsv-wrap">
    <div class="tsv-week-nav">
      <button class="tsv-nav-btn" onclick="toast('Previous week')">${chevLeft}</button>
      <span class="tsv-date-range">${(() => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7)); const sun = new Date(mon); sun.setDate(mon.getDate()+6); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const f = d => `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; return `${f(mon)} – ${f(sun)}`; })()}</span>
      <button class="tsv-nav-btn" onclick="toast('Next week')">${chevRight}</button>
    </div>
    <div class="tsv-days">${daysHTML}</div>

    <div class="tsv-card-toolbar">
      <button class="btn" onclick="toast('Add Timesheet')">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        Add Timesheet
      </button>
      <button class="btn btn-secondary" onclick="toast('All entries approved')">Approve All</button>
    </div>

    <div class="tsv-card">
      <div class="tsv-card-info">
        <strong class="tsv-card-title">Downtown Office Tower</strong>
        <span>Electrical Installation</span>
        <span>EL-2024-001</span>
        <span>Commercial Construction</span>
        <span>Senior Technician</span>
      </div>
      <div class="tsv-card-tabs">${cardTabsHTML}</div>
      <table class="tsv-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Task</th>
            <th>Cost Code</th>
            <th>Job Classification</th>
            <th>Time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${entryRowsHTML}</tbody>
      </table>
      <div class="tsv-bottom-bar">
        ${bottomIcons.map(ico => `<button class="tsv-bottom-btn" onclick="toast('Action')">${ico}</button>`).join('')}
      </div>
    </div>
  </div>`;
}

function closeTimelineModal() {
  document.getElementById('timelineModal').classList.remove('open');
}
function closeTimelineModalOnOverlay(e) {
  if (e.target === document.getElementById('timelineModal')) closeTimelineModal();
}

const MANAGER_HISTORY = [
  { name: 'Tom Henderson',  code: '100034', reportees: 4,  start: 'Mar 5, 2025',  end: null,          status: 'active', changedBy: 'Paula Chen'   },
  { name: 'Maria Gonzalez', code: '100078', reportees: 7,  start: 'Mar 5, 2025',  end: null,          status: 'active', changedBy: 'Paula Chen'   },
  { name: 'James Park',     code: '100012', reportees: 15, start: 'Jan 8, 2024',  end: 'Mar 4, 2025', status: 'past',   changedBy: 'Robert Kim'   },
  { name: 'Sarah Nguyen',   code: '100005', reportees: 9,  start: 'Mar 5, 2023',  end: 'Jan 7, 2024', status: 'past',   changedBy: 'David Ortiz'  },
];

function openManagerHistoryPane() {
  closeTimelinePane();
  const btn = document.getElementById('mgr-history-btn');
  if (btn) btn.classList.add('field-helper-link--inactive');
  const items = MANAGER_HISTORY.map((m, i) => {
    const badge = m.status === 'active' ? `<span class="to-status-badge">Active</span>` : '';
    const connector = (i < MANAGER_HISTORY.length - 1) ? `<div class="tl-feed-connector"></div>` : '';
    return `
      <div class="tl-feed-item">
        <div class="tl-feed-line">
          <div class="tl-feed-dot tl-feed-dot--${m.status === 'active' ? 'active' : 'past'}"></div>
          ${connector}
        </div>
        <div class="tl-feed-content">
          <div class="tl-feed-left" style="display:flex;flex-direction:row;align-items:flex-start;gap:12px;">
            <div class="ov-manager-avatar" style="flex-shrink:0;">${m.name.split(' ').map(w=>w[0]).join('').toUpperCase()}</div>
            <div style="min-width:0;display:flex;flex-direction:column;gap:2px;">
              <div class="tl-feed-title">${m.name}</div>
              <div class="tl-feed-date"># ${m.code} · ${m.start}${m.end ? ' – ' + m.end : ' – Present'}</div>
              <div class="tl-feed-date">Changed by ${m.changedBy}</div>
            </div>
          </div>
          ${badge ? `<div class="tl-feed-badge">${badge}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  document.getElementById('managerHistoryPaneBody').innerHTML = `<div class="tl-feed">${items}</div>`;
  document.getElementById('managerHistoryPane').classList.add('open');
}

function closeManagerHistoryPane() {
  document.getElementById('managerHistoryPane').classList.remove('open');
  const btn = document.getElementById('mgr-history-btn');
  if (btn) btn.classList.remove('field-helper-link--inactive');
}

function closeTimelinePane() {
  document.getElementById('timelinePane').classList.remove('open');
  ['classification', 'level', 'union'].forEach(f => {
    const btn = document.getElementById('tl-view-btn-' + f);
    if (btn) btn.classList.remove('field-helper-link--inactive');
  });
}

function openTimelinePane(fieldType) {
  currentTimelineFieldType = fieldType;
  const d = timelineData[fieldType] || timelineData.union;
  const headingMap = { classification: 'Timeline - Job Classification', level: 'Timeline - Job Level', union: 'Timeline - Union' };
  document.getElementById('timelinePaneTitle').textContent = headingMap[fieldType] || 'Timeline';
  const statusBadge = s => {
    if (s === 'active')   return `<span class="to-status-badge">Active</span>`;
    if (s === 'upcoming') return `<span class="to-status-badge" style="background:#eff8ff;border-color:#b2ddff;color:#175cd3;">Upcoming</span>`;
    return '';
  };
  const items = d.rows.map(row => {
    const [val, startDate, , status] = row;
    const badge = statusBadge(status);
    return `
      <div class="tl-feed-item">
        <div class="tl-feed-line">
          <div class="tl-feed-dot tl-feed-dot--${status}"></div>
          <div class="tl-feed-connector"></div>
        </div>
        <div class="tl-feed-content">
          <div class="tl-feed-left">
            <div class="tl-feed-title">${val}</div>
            <div class="tl-feed-date">${startDate}</div>
          </div>
          ${badge ? `<div class="tl-feed-badge">${badge}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  document.getElementById('timelinePaneBody').innerHTML = `
    <div class="tl-footer">
      <button class="btn" onclick="openAddTimelineModal('${fieldType}')"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Add</button>
    </div>
    <div class="tl-feed">${items}</div>`;
  document.getElementById('timelinePane').classList.add('open');
  // Mark the active View Timeline button as inactive
  ['classification', 'level', 'union'].forEach(f => {
    const btn = document.getElementById('tl-view-btn-' + f);
    if (btn) btn.classList.toggle('field-helper-link--inactive', f === fieldType);
  });
}
const timelineData = {
  classification: {
    title: 'Job Classification Timeline',
    cols: ['Classification', 'Start Date', 'End Date'],
    rows: [
      ['CM-JM', 'Mar 5, 2025', 'Present', 'active'],
      ['CM-AP', 'Jan 8, 2024', 'Mar 4, 2025', 'past'],
    ]
  },
  level: {
    title: 'Job Level Timeline',
    cols: ['Job Level', 'Start Date', 'End Date'],
    rows: [
      ['Journeyman', 'Mar 5, 2025', 'Present', 'active'],
      ['Apprentice', 'Mar 5, 2023', 'Mar 4, 2025', 'past'],
    ]
  },
  union: {
    title: 'Union Timeline',
    cols: ['Union Name', 'Start Date', 'End Date'],
    rows: [
      ['Cement Masons', '11/14/2025', '11/13/2026', 'active'],
      ['Cement Masons', '11/14/2024', '11/13/2025', 'past'],
    ]
  }
};

let currentTimelineFieldType = null;

function openTimelineModal(fieldType) {
  currentTimelineFieldType = fieldType;
  const d = timelineData[fieldType] || timelineData.union;
  document.getElementById('timelineModalTitle').textContent = d.title;
  const statusBadge = s => {
    if (s === 'active')   return `<span class="badge badge-enabled"><span class="badge-dot"></span>Active</span>`;
    if (s === 'upcoming') return `<span class="badge badge-onboarding"><span class="badge-dot"></span>Upcoming</span>`;
    return `<span class="badge badge-leave"><span class="badge-dot"></span>Inactive</span>`;
  };
  const thead = [...d.cols, 'Status'].map(c => `<th>${c}</th>`).join('');
  const tbody = d.rows.map(row => {
    const vals = row.slice(0, -1);
    const status = row[row.length - 1];
    const tds = vals.map((v, i) => `<td${i === 0 ? ' class="tl-name"' : ''}>${v}</td>`).join('');
    return `<tr>${tds}<td>${statusBadge(status)}</td></tr>`;
  }).join('');
  document.getElementById('timelineModalBody').innerHTML = `
    <div class="tl-table-wrap">
      <table class="tl-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    </div>
    <div class="tl-footer">
      <button class="btn btn-primary" onclick="openAddTimelineModal('${fieldType}')">+ Add</button>
    </div>`;
  document.getElementById('timelineModal').classList.add('open');
}

const addTimelineCfg = {
  classification: {
    title: 'Add Job Classification',
    label: 'Job Classification',
    options: ['CM-JM', 'CM-AP', 'CM-JI', 'CM-FO'],
  },
  level: {
    title: 'Add Job Level',
    label: 'Job Level',
    options: ['Apprentice', 'Journeyman', 'Foreman', 'Superintendent'],
  },
  union: {
    title: 'Add Union',
    label: 'Union Name',
    options: ['Cement Masons', 'Carpenters Local 22', 'Iron Workers Local 10'],
  },
};

function openAddTimelineModal(fieldType) {
  closeTimelinePane();
  const cfg = addTimelineCfg[fieldType] || addTimelineCfg.classification;
  document.getElementById('addTimelineModalTitle').textContent = cfg.title;
  document.getElementById('addTimelineFieldLabel').textContent = cfg.label;
  const sel = document.getElementById('addTimelineSelect');
  sel.innerHTML = `<option value="">Select an option</option>` +
    cfg.options.map(o => `<option>${o}</option>`).join('');
  document.getElementById('addTimelineDateInput').value = '';
  document.getElementById('addTimelineSubmitBtn').disabled = true;
  document.getElementById('addTimelineModal').classList.add('open');
}

function closeAddTimelineModal() {
  document.getElementById('addTimelineModal').classList.remove('open');
}

function closeAddTimelineModalOnOverlay(e) {
  if (e.target === document.getElementById('addTimelineModal')) closeAddTimelineModal();
}

function updateAddTimelineBtn() {
  const sel = document.getElementById('addTimelineSelect').value;
  const date = document.getElementById('addTimelineDateInput').value;
  document.getElementById('addTimelineSubmitBtn').disabled = !(sel && date);
}

function submitAddTimeline() {
  const val = document.getElementById('addTimelineSelect').value;
  const rawDate = document.getElementById('addTimelineDateInput').value;
  const effectiveDate = new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const d = timelineData[currentTimelineFieldType];
  if (d) {
    const statusOrder = { upcoming: 0, active: 1, past: 2 };
    d.rows.unshift([val, effectiveDate, '—', 'upcoming']);
    d.rows.sort((a, b) => (statusOrder[a[a.length - 1]] ?? 3) - (statusOrder[b[b.length - 1]] ?? 3));
  }
  closeAddTimelineModal();
  openTimelinePane(currentTimelineFieldType);
  toast('New entry added');
}

function switchPayTab(btn, tabId) {
  document.getElementById('drawer-header-subnav').querySelectorAll('.ta-subnav-btn').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('pay-tab-body').innerHTML = ({
    overview: buildPayOverview, paystubs: buildPaystubs,
    deductions: buildPayDeductions, payrates: buildPayRates,
    reimbursements: buildPayReimbursements, taxinfo: buildPayTaxInfo,
  }[tabId] || buildPayOverview)();
}

function togglePaySSN() {
  const el = document.getElementById('pay-ssn-val');
  if (el) el.textContent = el.textContent.includes('●') ? '531 – 22 – 4821' : '●●● – ●● – 4821';
}

function buildPaySectionHTML() {
  return `<div class="pay-wrap"><div class="pay-body" id="pay-tab-body">${buildPayOverview()}</div></div>`;
}

function togglePovBlock(id) {
  const block = document.getElementById(id);
  if (block) block.classList.toggle('pov-collapsed');
}

function buildPayOverview() {
  const moreIcon = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="5" r="1.4" fill="currentColor"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/><circle cx="10" cy="15" r="1.4" fill="currentColor"/></svg>`;
  const chevDown = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const filterIco = `<svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M3 5h14l-5 7v4l-4 1v-5L3 5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const sortIco = `<svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M6 13l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const editIco = `<svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M14 3l3 3-9 9H5v-3L14 3z" stroke="#f79009" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const infoIco = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#8597ab" stroke-width="1.3"/><path d="M8 7v4M8 5v.5" stroke="#8597ab" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const lockIco = `<svg width="11" height="11" viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const dlIco = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 6l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  const earnings = [
    { date:'Feb 2, 2026', day:'Monday',    type:'REG Hours', desc:'1425 Residence Drive • Wire Rough-in • Foreman',                  hrs:'8', rate:'$27.00 / Hr', rateSub:'REG • Union 123 • Inside...', gross:'$216.00',  ov:'' },
    { date:'Feb 3, 2026', day:'Tuesday',   type:'REG Hours', desc:'1425 Residence Drive • Wire Rough-in • Foreman',                  hrs:'8', rate:'$27.00 / Hr', rateSub:'REG • Union 123 • Inside...', gross:'$216.00',  ov:'' },
    { date:'Feb 4, 2026', day:'Wednesday', type:'REG Hours', desc:'Main Street Courthouse • Wire Rough-in • Journeyman',             hrs:'8', rate:'$45.00 / Hr', rateSub:'REG • PW-CA • Inside Wi...',  gross:'$360.00',  ov:'' },
    { date:'Feb 4, 2026', day:'Wednesday', type:'OT Hours',  desc:'Main Street Courthouse • Wire Rough-in • Journeyman',             hrs:'4', rate:'$67.50 / Hr', rateSub:'Union 123 • I...',             gross:'$270.00',  ov:'overridden', hasEdit:true },
    { date:'Feb 5, 2026', day:'Thursday',  type:'REG Hours', desc:'321 Commercial Project • Low-Voltage • Journeyman',               hrs:'8', rate:'$42.00 / Hr', rateSub:'OT • PW-CA • Inside Wir...',  gross:'$336.00',  ov:'' },
    { date:'Feb 6, 2026', day:'Friday',    type:'REG Hours', desc:'432 Server Project • Low-Voltage • Journeyman',                   hrs:'6', rate:'$39.00 / Hr', rateSub:'REG • PW-CA • Inside Wi...',  gross:'$234.00',  ov:'' },
    { date:'Feb 6, 2026', day:'Friday',    type:'Time Off',  desc:'Sick Leave (Unpaid)',                                             hrs:'4', hrsNote:'Balance: 16', rate:'$27.00 / Hr', rateSub:'REG • Base', gross:'$10,800', ov:'' },
    { date:'Feb 7, 2026', day:'Saturday',  type:'Holiday',   desc:'Company Holiday',                                                 hrs:'8', rate:'$27.00 / Hr', rateSub:'REG',                          gross:'$216.00',  ov:'' },
    { date:'–', type:'Cell Phone Allowance', hrs:'–', rate:'–', gross:'$75.00',  ov:'',       isLine:true },
    { date:'–', type:'Bonus',              hrs:'–', rate:'–', gross:'$300.00', ov:'manual', isLine:true },
  ];

  const earnRows = earnings.map(r => {
    const descCell = r.isLine
      ? `<td class="pov-td-desc"><span class="pov-earn-link">${r.type}</span></td>`
      : `<td class="pov-td-desc">
           <div class="pov-earn-dateline"><span class="pov-earn-date">${r.date}</span><span class="pov-earn-day">${r.day}</span></div>
           <div class="pov-earn-type">${r.type}</div>
           ${r.desc ? `<div class="pov-earn-subdesc">${r.desc}</div>` : ''}
         </td>`;
    const hrsCell = r.hrsNote
      ? `<td class="pov-td-hrs"><div>${r.hrs}</div><div class="pov-hrs-note">${r.hrsNote}</div></td>`
      : `<td class="pov-td-hrs">${r.hrs}</td>`;
    const rateCell = (r.rate === '–')
      ? `<td class="pov-td-rate pov-muted">–</td>`
      : `<td class="pov-td-rate">
           <div class="pov-rate-top"><span class="pov-rate-link">${r.rate}</span>${r.hasEdit ? `<span class="pov-rate-edit">${editIco}</span>` : ''}</div>
           ${r.rateSub ? `<div class="pov-rate-sub">${r.rateSub}</div>` : ''}
         </td>`;
    const ovCell = r.ov === 'overridden'
      ? `<td class="pov-td-ov"><span class="pov-badge-ov">Overridden</span></td>`
      : r.ov === 'manual'
      ? `<td class="pov-td-ov"><span class="pov-manual-entry">Manual Entry</span></td>`
      : `<td class="pov-td-ov"></td>`;
    return `<tr>${descCell}${hrsCell}${rateCell}<td class="pov-td-gross">${r.gross}</td>${ovCell}<td class="pov-td-more"><button class="pov-more-btn" onclick="toast('Row actions')">${moreIcon}</button></td></tr>`;
  }).join('');

  const dedRows = [
    ['401(k) Traditional','Retirement','Pre-Tax','% of Gross','5%','$105.77','$52.89'],
    ['Medical – Anthem Gold PPO','Health','Post-Tax','Flat Amount','–','$120.00','$430.00'],
    ['Dental – Anthem Gold PPO','Health','Pre-Tax','Flat Amount','–','$18.00','$45.00'],
    ['HSA Contribution','Health','Post-Tax','Flat Amount','–','$40.00','–'],
    ['Loan Repayment','Loan','Post-Tax','Flat Amount','–','$75.00','–'],
  ].map(([name,sub,taxType,treatment,method,empAmt,erAmt]) => `<tr>
    <td class="pov-td-ded"><div class="pov-ded-name">${name}</div><div class="pov-ded-sub">${sub}</div></td>
    <td>${taxType}</td><td>${treatment}</td><td>${method}</td>
    <td class="pov-td-num">${empAmt}</td><td class="pov-td-num">${erAmt}</td>
    <td></td><td class="pov-td-more"><button class="pov-more-btn" onclick="toast('Deduction actions')">${moreIcon}</button></td>
  </tr>`).join('');

  const taxRows = [
    ['Federal Income Tax','Federal','$1,871.68','$185.00','–'],
    ['Social Security',   'Federal','$1,871.68','$116.04','$116.04'],
    ['Medicare',          'Federal','$1,871.68','$27.14', '$27.14'],
    ['CA State Income Tax','CA',    '$1,871.68','$32.75', '–'],
    ['CA SDI',            'CA',     '$2,115.45','$21.54', '–'],
    ['FUTA',              'Federal','$1,871.68','–',      '$11.23'],
    ['CA FUTA',           'CA',     '$1,871.68','–',      '$68.07'],
  ].map(([name,jur,taxable,empAmt,erAmt]) => `<tr>
    <td>${name}</td><td class="pov-td-sort"></td><td>${jur}</td>
    <td class="pov-td-num">${taxable}</td>
    <td class="pov-td-num">${empAmt}</td><td class="pov-td-num">${erAmt}</td>
    <td class="pov-td-more"><button class="pov-more-btn" onclick="toast('Tax actions')">${moreIcon}</button></td>
  </tr>`).join('');

  const garnRows = [
    ['Child Support','','','$85.00',''],
    ['Tax Lien','IRS','123','Pending','pending'],
  ].map(([name,issuer,ref,amt,cls]) => `<tr>
    <td>${name}</td><td class="pov-muted">${issuer}</td><td class="pov-muted">${ref}</td>
    <td class="pov-td-num${cls === 'pending' ? ' pov-muted' : ''}">${amt}</td>
    <td class="pov-td-more"><button class="pov-more-btn" onclick="toast('Garnishment actions')">${moreIcon}</button></td>
  </tr>`).join('');

  return `
  <div class="pov-toolbar">
    <div class="pov-toolbar-left">
      <button class="pov-period-btn" onclick="toast('Change pay period')">
        <span class="pov-period-crew">Field Crew</span>
        <span class="pov-period-sep">|</span>
        <span class="pov-period-range">Feb 2 – Feb 9</span>
        ${chevDown}
      </button>
      <span class="pov-badge-review">${lockIco} Uneditable In Review</span>
    </div>
    <div class="pov-toolbar-right">
      <div class="pov-pay-info-rows">
        <div class="pov-pay-info-row">
          <span class="pov-pay-info-lbl">Payment</span>
          <span class="pov-pay-info-val">Direct Deposit (Split)</span>
          ${infoIco}
        </div>
        <div class="pov-pay-info-row">
          <span class="pov-pay-info-lbl">Supplemental Tax:</span>
          <span class="pov-pay-info-val">Aggregate</span>
          ${infoIco}
        </div>
      </div>
      <button class="pov-pay-edit-btn" onclick="toast('Edit payment method')">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M14 3l3 3-9 9H5v-3L14 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>

  <div class="pov-metrics">
    <div class="pov-metric"><span class="pov-metric-lbl">Hours</span><span class="pov-metric-val">51.5</span></div>
    <div class="pov-metric-div"></div>
    <div class="pov-metric"><span class="pov-metric-lbl">Earnings</span><span class="pov-metric-val">$2,115.45</span></div>
    <div class="pov-metric-div"></div>
    <div class="pov-metric"><span class="pov-metric-lbl">Employee Benefits &amp; Deductions</span><span class="pov-metric-val">$315.30</span></div>
    <div class="pov-metric-div"></div>
    <div class="pov-metric"><span class="pov-metric-lbl">Gross Pay</span><span class="pov-metric-val">$1,800.15</span></div>
    <div class="pov-metric-div"></div>
    <div class="pov-metric"><span class="pov-metric-lbl">Employee Taxes</span><span class="pov-metric-val">$382.47</span></div>
    <div class="pov-metric-div"></div>
    <div class="pov-metric"><span class="pov-metric-lbl">Garnishments</span><span class="pov-metric-val">$85.00</span></div>
    <div class="pov-metric-div"></div>
    <div class="pov-metric pov-metric-net"><span class="pov-metric-lbl">Net Pay</span><span class="pov-metric-val">$1,332.68</span></div>
    <div class="pov-metric-div"></div>
    <div class="pov-metric"><span class="pov-metric-lbl">Overrides</span><span class="pov-metric-val pov-metric-ov-num">1</span></div>
  </div>

  <div class="section">
    <div class="pov-section-hd">
      <h3>Earnings</h3>
      <div class="pov-block-actions">
        <button class="pov-add-btn" onclick="toast('Add earning')">+ Add Earning</button>
        <button class="pov-dl-btn" onclick="toast('Download earnings')">${dlIco} Download ${chevDown}</button>
      </div>
    </div>
    <table class="pov-table">
      <thead><tr>
        <th class="pov-th-desc">DESCRIPTION</th>
        <th class="pov-th-hrs">HOURS</th>
        <th class="pov-th-rate">RATE</th>
        <th class="pov-th-gross">GROSS AMOUNT</th>
        <th class="pov-th-ov">OVERRIDE</th>
        <th class="pov-th-more"></th>
      </tr></thead>
      <tbody>${earnRows}</tbody>
      <tfoot><tr>
        <td></td>
        <td class="pov-tf-num">54</td>
        <td></td>
        <td class="pov-tf-num">$2,115.45</td>
        <td></td><td></td>
      </tr></tfoot>
    </table>
  </div>

  <div class="section">
    <h3>Benefits &amp; Deductions</h3>
    <table class="pov-table">
      <thead><tr>
        <th class="pov-th-ded">DEDUCTION <span class="pov-th-ico">${filterIco}</span> <span class="pov-th-ico">${sortIco}</span></th>
        <th>TAX TYPE</th><th>TAX TREATMENT</th><th>METHOD</th>
        <th class="pov-td-num">EMPLOYEE AMOUNT</th>
        <th class="pov-td-num">EMPLOYER AMOUNT</th>
        <th>OVERRIDE</th><th class="pov-th-more"></th>
      </tr></thead>
      <tbody>${dedRows}</tbody>
      <tfoot><tr>
        <td colspan="4"></td>
        <td class="pov-tf-num">$315.30</td>
        <td class="pov-tf-num">$400.30</td>
        <td></td><td></td>
      </tr></tfoot>
    </table>
  </div>

  <div class="section">
    <h3>Taxes</h3>
    <table class="pov-table">
      <thead><tr>
        <th class="pov-th-item">ITEM</th>
        <th class="pov-th-sort"><span class="pov-th-ico">${sortIco}</span></th>
        <th>JURISDICTION</th>
        <th class="pov-td-num">TAXABLE WAGES</th>
        <th class="pov-td-num">EMPLOYEE AMOUNT</th>
        <th class="pov-td-num">EMPLOYER AMOUNT</th>
        <th class="pov-th-more"></th>
      </tr></thead>
      <tbody>${taxRows}</tbody>
      <tfoot><tr>
        <td colspan="4"></td>
        <td class="pov-tf-num">$382.47</td>
        <td class="pov-tf-num">$222.48</td>
        <td></td>
      </tr></tfoot>
    </table>
  </div>

  <div class="section">
    <h3>Garnishments</h3>
    <table class="pov-table">
      <thead><tr>
        <th class="pov-th-garn">GARNISHMENT <span class="pov-th-ico">${sortIco}</span></th>
        <th></th><th></th>
        <th class="pov-td-num">AMOUNT WITHHELD</th>
        <th class="pov-th-more"></th>
      </tr></thead>
      <tbody>${garnRows}</tbody>
      <tfoot><tr>
        <td colspan="3"></td>
        <td class="pov-tf-num pov-muted">Pending</td>
        <td></td>
      </tr></tfoot>
    </table>
  </div>`;
}

function buildPaystubs() {
  const rows = [
    ['Dec 7, 2025','Dec 20, 2025','Dec 20, 2025','Direct Deposit','$1,593.60','$456.00'],
    ['Nov 23, 2025','Dec 6, 2025','Dec 6, 2025','Direct Deposit','$1,593.60','$456.00'],
    ['Nov 9, 2025','Nov 22, 2025','Nov 22, 2025','Direct Deposit','$1,834.40','$536.00'],
    ['Oct 26, 2025','Nov 8, 2025','Nov 8, 2025','Direct Deposit','$1,593.60','$456.00'],
    ['Oct 12, 2025','Oct 25, 2025','Oct 25, 2025','Direct Deposit','$1,675.85','$479.10'],
    ['Sep 28, 2025','Oct 11, 2025','Oct 11, 2025','Direct Deposit','$1,593.60','$456.00'],
  ];
  const dlIcon = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 6l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const rowsHTML = rows.map(([start, end, payday, method, net, taxes]) => `<tr>
    <td>${start}</td>
    <td>${end}</td>
    <td>${payday}</td>
    <td class="pay-td-mute">${method}</td>
    <td class="pay-td-num pay-td-blue">${net}</td>
    <td class="pay-td-num pay-td-mute">${taxes}</td>
    <td class="pay-docs-cell">
      <button class="pay-doc-btn" onclick="toast('Downloading earning statement')">${dlIcon}Earning statement</button>
      <button class="pay-doc-btn" onclick="toast('Downloading paycheck')">${dlIcon}Paycheck</button>
    </td>
  </tr>`).join('');
  return `<div class="pay-section">
    <div class="pay-sh">Paystubs</div>
    <table class="pay-table"><thead><tr>
      <th>Start Date</th><th>End Date</th><th>Pay Day</th>
      <th>Payment Method</th>
      <th class="pay-td-num">Net Pay</th>
      <th class="pay-td-num">Employee Taxes</th>
      <th>Documents</th>
    </tr></thead><tbody>${rowsHTML}</tbody></table>
  </div>`;
}

function buildPayDeductions() {
  const active = [
    ['Medical','Health Insurance Premium','$180.00','Jan 1, 2025','–'],
    ['Dental','Dental Coverage','$28.50','Jan 1, 2025','–'],
    ['Vision','Vision Plan','$8.75','Jan 1, 2025','–'],
    ['401(k)','Retirement Contribution (6%)','$136.80','Mar 5, 2025','–'],
    ['Union Dues','LIUNA Local 42','$42.00','Jul 1, 2024','–'],
  ];
  const hist = [
    ['401(k)','Rate Change','$114.00','$136.80','Jan 1, 2025','Dec 31, 2025'],
    ['Union Dues','Annual Increase','$38.00','$42.00','Jul 1, 2024','Jun 30, 2025'],
    ['Medical','Plan Upgrade','$145.00','$180.00','Mar 15, 2024','Dec 31, 2024'],
  ];
  const aRows = active.map(([type,desc,amt,startDate,endDate]) => `<tr>
    <td class="pay-td-strong">${type}</td><td class="pay-td-mute">${desc}</td>
    <td class="pay-td-num pay-td-strong">${amt}</td>
    <td class="pay-td-mute">${startDate}</td>
    <td class="pay-td-mute">${endDate}</td>
    <td><button class="pay-row-act" onclick="toast('Edit deduction')">Edit</button></td>
  </tr>`).join('');
  const hRows = hist.map(([type,change,prev,upd,startDate,endDate]) => `<tr>
    <td>${type}</td><td class="pay-td-mute">${change}</td>
    <td class="pay-td-num pay-td-mute">${prev}</td><td class="pay-td-num">${upd}</td>
    <td class="pay-td-mute">${startDate}</td>
    <td class="pay-td-mute">${endDate}</td>
  </tr>`).join('');
  return `
  <div class="pay-section">
    <div class="pay-section-hd">
      <span class="pay-sh">Active Deductions</span>
      <button class="pay-action-btn" onclick="toast('Add deduction')">+ Add Deduction</button>
    </div>
    <table class="pay-table"><thead><tr>
      <th>Type</th><th>Description</th><th class="pay-td-num">Amount</th>
      <th>Effective Start</th><th>Effective End</th><th></th>
    </tr></thead><tbody>${aRows}</tbody></table>
  </div>
  <div class="pay-section">
    <div class="pay-sh pay-sh-secondary">Deduction History</div>
    <table class="pay-table"><thead><tr>
      <th>Type</th><th>Change</th><th class="pay-td-num">Previous</th><th class="pay-td-num">Updated</th>
      <th>Effective Start</th><th>Effective End</th>
    </tr></thead><tbody>${hRows}</tbody></table>
  </div>`;
}

function buildPayRates() {
  const moreIco = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="5" r="1.4" fill="currentColor"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/><circle cx="10" cy="15" r="1.4" fill="currentColor"/></svg>`;
  const calIco  = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const copyIco = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M4 13H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const trashIco= `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M8 6V4h4v2M16 6l-1 11H5L4 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const editIco = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M14 3l3 3-9 9H5v-3L14 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const chevIco = `<svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const configActions = `
    <div class="pr-config-actions">
      <button class="pr-icon-btn" onclick="toast('Duplicate')">${copyIco}</button>
      <button class="pr-icon-btn pr-icon-btn-danger" onclick="toast('Delete')">${trashIco}</button>
    </div>`;

  const dateField = (val, placeholder='MM/DD/YYYY') => `
    <div class="pr-date-field">
      <input type="text" class="pr-date-input" value="${val}" placeholder="${placeholder}" />
      <span class="pr-date-ico">${calIco}</span>
    </div>`;

  return `
  <div class="pay-section">
    <div class="pay-sh">Payroll Rules</div>
    <div class="pr-toggle-inline">
      <label class="pay-sw"><input type="checkbox"><span class="pay-sw-track"></span></label>
      <div>
        <div class="pay-toggle-label">Never Receives Overtime</div>
        <div class="pay-toggle-desc">Employee is exempt from overtime calculations</div>
      </div>
    </div>
  </div>

  <div class="pay-section">
    <div class="pay-sh">Financial Information</div>
    <div class="pr-field-row">
      <div class="pr-field-group">
        <label class="pr-field-label">Compensation Type</label>
        <div class="select-wrapper"><select class="field-input">
          <option>Hourly</option><option>Salary</option><option>Daily</option>
        </select></div>
      </div>
      <div class="pr-field-group">
        <label class="pr-field-label">Pay Frequency</label>
        <div class="select-wrapper"><select class="field-input">
          <option>Bi-weekly</option><option>Weekly</option><option>Semi-monthly</option><option>Monthly</option>
        </select></div>
      </div>
    </div>
  </div>

  <div class="pay-section">
    <div class="pr-card">
      <div class="pr-card-hd">
        <div class="pr-card-title">Default Pay Rate</div>
        <div class="pr-card-subtitle">This rate will be used to calculate wages when no other matching rate is found.</div>
      </div>
      <table class="pay-table">
        <thead><tr>
          <th>Effective Start Date</th><th>End Date</th><th>Compensation Type</th>
          <th>Regular Pay</th><th>OT Pay</th><th>DOT Pay</th><th>Notes</th><th></th>
        </tr></thead>
        <tbody><tr>
          <td>1 Mar, 2026</td><td class="pay-td-mute">N/A</td><td>Hourly</td>
          <td>$38.00</td><td>$57.00</td><td>$76.00</td>
          <td class="pay-td-mute">–</td>
          <td class="pov-td-more"><button class="pov-more-btn" onclick="toast('Row actions')">${moreIco}</button></td>
        </tr></tbody>
      </table>
      <div class="pr-card-footer">
        <button class="pr-link-btn" onclick="toast('Add pay rate configuration')">+ Add Pay Rate Configuration</button>
        <button class="pr-link-btn" onclick="toast('View history')">View History</button>
      </div>
    </div>
  </div>

  <div class="pay-section">
    <div class="pr-card">
      <div class="pr-card-hd">
        <div class="pr-card-title">Active Pay Rates</div>
        <div class="pr-card-subtitle">Pay rates determined by the job performed, based on the classification selected on the timesheet.</div>
      </div>
      <div class="pr-config-row">
        <div class="pr-config-group">
          <div class="pr-config-label">Configuration</div>
          <button class="pr-config-select" onclick="toast('Change configuration')">
            05-01-2026 – 05-31-2026 ${chevIco}
          </button>
        </div>
        <div class="pr-config-group">
          <div class="pr-config-label">Start Date</div>
          ${dateField('05/01/2026')}
        </div>
        <div class="pr-config-group">
          <div class="pr-config-label">Expiration Date</div>
          ${dateField('05/31/2026')}
        </div>
        ${configActions}
      </div>
      <table class="pay-table">
        <thead><tr>
          <th>Classification</th><th>Regular Pay</th><th>OT Pay</th><th>DOT Pay</th><th>Notes</th><th></th>
        </tr></thead>
        <tbody><tr>
          <td>Cable Splicer-Welder</td>
          <td>$25.00</td><td>$37.50</td><td>$50.00</td>
          <td class="pay-td-mute">–</td>
          <td class="pov-td-more"><button class="pr-edit-ico-btn" onclick="toast('Edit rate')">${editIco}</button></td>
        </tr></tbody>
      </table>
      <div class="pr-card-footer pr-card-footer-left">
        <button class="pr-link-btn" onclick="toast('Add hourly pay rate')">+ Add Hourly Pay Rate</button>
      </div>
    </div>
  </div>

  <div class="pay-section">
    <div class="pr-card">
      <div class="pr-card-hd">
        <div class="pr-card-title">Travel &amp; Subsistence Pay Rates</div>
        <div class="pr-card-subtitle">Rates that apply when employees travel for work or incur subsistence expenses.</div>
      </div>
      <div class="pr-config-row">
        <div class="pr-config-group">
          <div class="pr-config-label">Configuration</div>
          <button class="pr-config-select" onclick="toast('Change configuration')">
            02/01/2026 – N/A ${chevIco}
          </button>
        </div>
        <div class="pr-config-group">
          <div class="pr-config-label">Start Date</div>
          ${dateField('02/01/2026')}
        </div>
        <div class="pr-config-group">
          <div class="pr-config-label">Expiration Date</div>
          ${dateField('')}
        </div>
        ${configActions}
      </div>
      <table class="pay-table">
        <thead><tr>
          <th>Pay Rate Type</th><th>Earning Type</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${[['Subsistence','Flat Amount',true],['Driver Pay','–',false],['Passenger Pay','–',false],['Driving &amp; Pulling A Trailer','–',false]]
            .map(([type,earning,on]) => `<tr>
              <td>${type}</td>
              <td class="pay-td-mute">${earning}</td>
              <td><label class="pay-sw"><input type="checkbox"${on?' checked':''}><span class="pay-sw-track"></span></label></td>
              <td class="pov-td-more"><button class="pr-edit-ico-btn" onclick="toast('Edit')">${editIco}</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="pr-card-footer">
        <button class="pr-link-btn" onclick="toast('Add travel configuration')">+ Add Travel Configuration</button>
        <button class="pr-link-btn" onclick="toast('View history')">View History</button>
      </div>
    </div>
  </div>

  <div class="pay-section pay-section-last">
    <div class="pr-card">
      <div class="pr-card-hd pr-card-hd-compact">
        <div class="pr-card-title">Union Pay Rate</div>
      </div>
      <table class="pay-table">
        <thead><tr>
          <th>Level</th><th>Trade</th><th>Classification</th><th>Subclassifications</th>
        </tr></thead>
        <tbody><tr><td colspan="4" style="height:48px;"></td></tr></tbody>
      </table>
    </div>
  </div>`;
}

function buildPayReimbursements() {
  const rows = [
    ['Equipment','Safety boots – required PPE','$185.00','Dec 10, 2025','Approved','Dec 7 – 20'],
    ['Travel','Job site mileage – November','$134.00','Nov 30, 2025','Paid','Nov 23 – Dec 6'],
    ['Tools','Replacement drill bit set','$48.50','Nov 15, 2025','Paid','Nov 9 – 22'],
    ['Per Diem','Sacramento job site','$285.00','Oct 28, 2025','Paid','Oct 26 – Nov 8'],
    ['Travel','Job site mileage – October','$112.50','Oct 15, 2025','Paid','Oct 12 – 25'],
  ];
  const rowsHTML = rows.map(([cat,desc,amt,sub,status,period]) => {
    const badge = status === 'Approved' ? 'badge-pending' : 'badge-enabled';
    return `<tr>
      <td class="pay-td-strong">${cat}</td><td class="pay-td-mute">${desc}</td>
      <td class="pay-td-num pay-td-strong">${amt}</td><td class="pay-td-mute">${sub}</td>
      <td><span class="badge ${badge}"><span class="badge-dot"></span>${status}</span></td>
      <td class="pay-td-mute">${period}</td>
      <td><button class="pay-row-act" onclick="toast('View reimbursement')">View</button></td>
    </tr>`;}).join('');
  return `<div class="pay-section">
    <div class="pay-section-hd">
      <span class="pay-sh">Reimbursements</span>
      <button class="pay-action-btn" onclick="toast('Add recurring reimbursement')">+ Add Recurring Reimbursements</button>
    </div>
    <table class="pay-table"><thead><tr>
      <th>Category</th><th>Description</th>
      <th class="pay-td-num">Amount</th><th>Submitted</th>
      <th>Status</th><th>Pay Period</th><th></th>
    </tr></thead><tbody>${rowsHTML}</tbody></table>
  </div>`;
}

function buildPayTaxInfo() {
  return `
  <div class="pay-section">
    <div class="pr-card">
      <div class="pr-card-hd">
        <div class="pr-card-title">Tax Configuration</div>
      </div>
      <div class="tax-toggle-row">
        <label class="pay-sw"><input type="checkbox"><span class="pay-sw-track"></span></label>
        <div class="tax-toggle-body">
          <div class="tax-toggle-title">Enable Auto Create &amp; Assign Workplace (Local Tax States)</div>
          <div class="tax-toggle-desc">Enables automatic creation and assignment of a workplace using the project address if the project is in a state where local tax is applicable.</div>
          <div class="tax-toggle-desc">Applicable States: AL, CO, DE, IN, IA, KS, KY, MD, MI, MO, NY, OH, OR, PA, WV.</div>
        </div>
      </div>
      <div class="tax-toggle-row tax-toggle-row-last">
        <label class="pay-sw"><input type="checkbox" checked><span class="pay-sw-track"></span></label>
        <div class="tax-toggle-body">
          <div class="tax-toggle-title">Enable Auto Assign Workplace by State</div>
          <div class="tax-toggle-desc">Enables automatic assignment of an existing workplace that matches the project's state.</div>
        </div>
      </div>
    </div>
  </div>`;
}

function buildTimeOffSectionHTML() {
  return `<div class="pay-wrap"><div class="pay-body" id="to-tab-body">${buildTimeOffLeave()}</div></div>`;
}

function buildTimeOffLeave() {
  const policies = [
    { name: 'Maternal Leave', accrual: '03/29/2025', balance: '0.00 (0.00 days)' },
    { name: 'Paid Vacation',  accrual: '03/29/2025', balance: '0.00 (0.00 days)' },
  ];
  const policyRows = policies.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.accrual}</td>
      <td>${p.balance}</td>
      <td class="to-td-action">
        <button class="to-more-btn" onclick="toast('Policy options')">&#8942;</button>
      </td>
    </tr>`).join('');

  const historyRows = `
    <tr>
      <td>Mar 05, 2026</td>
      <td style="color:var(--400)">--</td>
      <td class="to-td-num">0</td>
      <td class="to-td-num">0</td>
      <td class="to-td-num">0</td>
      <td class="to-td-num">0</td>
      <td>Imported Leave</td>
      <td><span class="to-status-badge">Approved</span></td>
    </tr>`;

  return `
    <div class="ov-details-grid">

      <div class="ov-detail-item to-group-start">
        <span class="ov-meta-label to-group-label">Leave Balances</span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Maternal Leave</span>
        <span class="ov-meta-value">0.00 hrs <span class="to-meta-sub">(0.00 days)</span></span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Paid Vacation</span>
        <span class="ov-meta-value">0.00 hrs <span class="to-meta-sub">(0.00 days)</span></span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Sick Leave</span>
        <span class="ov-meta-value">16.00 hrs <span class="to-meta-sub">(2.00 days)</span></span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Personal</span>
        <span class="ov-meta-value">8.00 hrs <span class="to-meta-sub">(1.00 days)</span></span>
      </div>

      <div class="ov-detail-item to-group-start">
        <span class="ov-meta-label to-group-label">Upcoming Time Off</span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Vacation</span>
        <span class="ov-meta-value">Jun 2 – Jun 6, 2026 · 40 hrs <span class="to-meta-sub ov-to-status ov-to-status--approved" style="margin-left:6px;">Approved</span></span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Personal</span>
        <span class="ov-meta-value">Jun 20, 2026 · 8 hrs <span class="to-meta-sub ov-to-status ov-to-status--pending" style="margin-left:6px;">Pending</span></span>
      </div>

      <div class="ov-detail-item to-group-start">
        <span class="ov-meta-label to-group-label">Policy Assignment</span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Time Off Approver</span>
        <span class="ov-meta-value">John Doe, Jane Doe</span>
      </div>
      ${policies.map(p => `
      <div class="ov-detail-item">
        <span class="ov-meta-label">${p.name}</span>
        <span class="ov-meta-value">${p.balance} <span class="to-meta-sub">· Accrues ${p.accrual}</span></span>
      </div>`).join('')}

      <div class="ov-detail-item to-group-start">
        <span class="ov-meta-label to-group-label">Leave History</span>
      </div>

    </div>

    <div class="to-history-toolbar">
      <div class="to-filter-select" onclick="toast('Filter by category')">
        Maternal Leave
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="to-btn-group">
        <button class="to-filter-btn active" onclick="toast('Transactions view')">Transactions</button>
        <button class="to-filter-btn" onclick="toast('Pay Period view')">Pay Period</button>
      </div>
      <div class="to-filter-select" onclick="toast('Filter by status')">
        All Status
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="to-year-nav">
        <button class="to-year-nav-btn" onclick="changeToYear(-1)">&#8249;</button>
        <span class="to-year-val" id="to-year-val">2026</span>
        <button class="to-year-nav-btn" onclick="changeToYear(1)">&#8250;</button>
      </div>
    </div>
    <div class="to-table-wrap">
      <table class="to-history-table">
        <thead><tr>
          <th>Transaction Date</th>
          <th>Pay Period</th>
          <th style="text-align:right">Change (Hrs)</th>
          <th style="text-align:right">Change (Days)</th>
          <th style="text-align:right">Balance (Hrs)</th>
          <th style="text-align:right">Balance (Days)</th>
          <th>Action</th>
          <th>Status</th>
        </tr></thead>
        <tbody>${historyRows}</tbody>
      </table>
    </div>`;
}

const holidayConfigs = {
  '': [],
  'us-standard': [
    { name: "New Year's Day",          date: 'Jan 1, 2026',   day: 'Thursday'  },
    { name: 'Martin Luther King Jr. Day', date: 'Jan 19, 2026', day: 'Monday'  },
    { name: "Presidents' Day",         date: 'Feb 16, 2026',  day: 'Monday'    },
    { name: 'Memorial Day',            date: 'May 25, 2026',  day: 'Monday'    },
    { name: 'Juneteenth',              date: 'Jun 19, 2026',  day: 'Friday'    },
    { name: 'Independence Day',        date: 'Jul 4, 2026',   day: 'Saturday'  },
    { name: 'Labor Day',               date: 'Sep 7, 2026',   day: 'Monday'    },
    { name: 'Columbus Day',            date: 'Oct 12, 2026',  day: 'Monday'    },
    { name: 'Veterans Day',            date: 'Nov 11, 2026',  day: 'Wednesday' },
    { name: 'Thanksgiving Day',        date: 'Nov 26, 2026',  day: 'Thursday'  },
    { name: 'Christmas Day',           date: 'Dec 25, 2026',  day: 'Friday'    },
  ],
  'construction-full': [
    { name: "New Year's Day",          date: 'Jan 1, 2026',   day: 'Thursday'  },
    { name: 'Memorial Day',            date: 'May 25, 2026',  day: 'Monday'    },
    { name: 'Independence Day',        date: 'Jul 4, 2026',   day: 'Saturday'  },
    { name: 'Labor Day',               date: 'Sep 7, 2026',   day: 'Monday'    },
    { name: 'Thanksgiving Day',        date: 'Nov 26, 2026',  day: 'Thursday'  },
    { name: 'Day After Thanksgiving',  date: 'Nov 27, 2026',  day: 'Friday'    },
    { name: 'Christmas Eve',           date: 'Dec 24, 2026',  day: 'Thursday'  },
    { name: 'Christmas Day',           date: 'Dec 25, 2026',  day: 'Friday'    },
  ],
  'california': [
    { name: "New Year's Day",          date: 'Jan 1, 2026',   day: 'Thursday'  },
    { name: 'César Chávez Day',        date: 'Mar 31, 2026',  day: 'Tuesday'   },
    { name: 'Memorial Day',            date: 'May 25, 2026',  day: 'Monday'    },
    { name: 'Juneteenth',              date: 'Jun 19, 2026',  day: 'Friday'    },
    { name: 'Independence Day',        date: 'Jul 4, 2026',   day: 'Saturday'  },
    { name: 'Labor Day',               date: 'Sep 7, 2026',   day: 'Monday'    },
    { name: 'Veterans Day',            date: 'Nov 11, 2026',  day: 'Wednesday' },
    { name: 'Thanksgiving Day',        date: 'Nov 26, 2026',  day: 'Thursday'  },
    { name: 'Christmas Day',           date: 'Dec 25, 2026',  day: 'Friday'    },
  ],
};

function buildHolidayTable(configKey) {
  const holidays = holidayConfigs[configKey] || [];
  if (!holidays.length) return '';
  const rows = holidays.map(h => `
    <tr>
      <td>${h.name}</td>
      <td>${h.date} <span style="color:var(--500)">${h.day}</span></td>
    </tr>`).join('');
  return `
    <div class="to-table-wrap">
      <table class="to-policy-table">
        <thead><tr>
          <th>Holiday</th>
          <th>Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function onHolidayConfigChange(sel) {
  document.getElementById('to-holiday-table').innerHTML = buildHolidayTable(sel.value);
}

function buildTimeOffHoliday() {
  const options = [
    ['', '— Select a configuration —'],
    ['us-standard',      'US Standard Holidays'],
    ['construction-full','Construction Full Calendar'],
    ['california',       'California State Holidays'],
  ];
  const optHTML = options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  return `
    <div class="ov-details-grid">
      <div class="ov-detail-item to-group-start">
        <span class="ov-meta-label to-group-label">Holiday Calendar</span>
      </div>
      <div class="ov-detail-item">
        <span class="ov-meta-label">Configuration</span>
        <div class="ov-meta-value to-hc-select-wrap" style="width:70%;">
          <select class="to-hc-select" onchange="onHolidayConfigChange(this)">
            ${optHTML}
          </select>
          <svg class="to-hc-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
    <div id="to-holiday-table" style="margin-top:16px;"></div>`;
}

function switchToTab(btn, tab) {
  document.getElementById('drawer-header-subnav').querySelectorAll('.ta-subnav-btn').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'leave') {
    document.getElementById('to-tab-body').innerHTML = buildTimeOffLeave();
  } else {
    document.getElementById('to-tab-body').innerHTML = buildTimeOffHoliday();
  }
}

let toYear = 2026;
function changeToYear(delta) {
  toYear += delta;
  const el = document.getElementById('to-year-val');
  if (el) el.textContent = toYear;
}

function buildProfileSectionHTML() {
  const r      = currentDrawerEmployee;
  const first  = r ? r.first  : '';
  const last   = r ? r.last   : '';
  const phone  = r ? (r.phone || '') : '';
  const email  = r ? (r.email  || '') : '';
  const street = r ? (r.street || '') : '';
  const city   = r ? (r.city   || '') : '';
  const state  = r ? (r.state  || '') : '';
  const zip    = r ? (r.zip    || '') : '';
  const emgName  = r ? (r.emergencyContact || '') : '';
  const emgPhone = r ? (r.emergencyPhone   || '') : '';
  const taxJur   = (city && state) ? `${city}, ${state}` : 'Not set';

  const removeBtn = `<button class="tag-chip-remove" onclick="removeWorkplaceChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`;

  return `
  <div class="section">
    <h3>Personal</h3>
    <div class="field-grid">
      <div class="field"><label>First Name <span class="field-required">*</span></label><input class="field-input" id="p-first" value="${first}" /></div>
      <div class="field"><label>Middle Name</label><input class="field-input" id="p-middle" value="" /></div>
      <div class="field"><label>Last Name <span class="field-required">*</span></label><input class="field-input" id="p-last" value="${last}" /></div>
      <div class="field"><label>Preferred Name</label><input class="field-input" id="p-pref" value="" /></div>
      <div class="field"><label>Gender</label><div class="select-wrapper"><select class="field-input"><option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option></select></div></div>
      <div class="field"><label>Date of Birth</label><div class="date-input"><input class="field-input" id="p-dob" value="" placeholder="MM/DD/YYYY" /></div></div>
      <div class="field"><label>Birth Place</label><input class="field-input" placeholder="Enter" /></div>
      <div class="field"><label>Language</label><div class="select-wrapper"><select class="field-input"><option value="">Select</option><option>English</option><option>Spanish</option><option>French</option></select></div></div>
      <div class="field"><label>Marital Status</label><div class="select-wrapper"><select class="field-input"><option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option></select></div></div>
      <div class="field">
        <label>Ethnicity</label>
        <label class="checkbox-field-label">
          <input type="checkbox" class="checkbox-field-input" />
          <span>Hispanic or Latino</span>
        </label>
      </div>
      <div class="field"><label>Race</label><div class="select-wrapper"><select class="field-input"><option value="">Select</option><option>White</option><option>Black or African American</option><option>Asian</option><option>Other</option></select></div></div>
      <div class="field"><label>Disability Status</label><div class="select-wrapper"><select class="field-input"><option value="">Select</option><option>No disability</option><option>Has disability</option><option>Prefer not to say</option></select></div></div>
      <div class="field">
        <label>SSN</label>
        <div class="input-with-prefix" id="ssn-wrapper">
          <input type="password" id="p-ssn" class="field-input" style="border:none;box-shadow:none;" placeholder="XXX-XX-XXXX" autocomplete="off" />
          <button type="button" class="input-prefix" style="border:none;border-left:1px solid var(--150);padding:0 10px;background:transparent;cursor:pointer;color:var(--600);" onclick="toggleSsn()" title="Show/hide SSN">
            <svg id="ssn-eye" width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Contact</h3>
    <div class="field-grid">
      <div class="field"><label>Work Phone Number <span class="field-required">*</span></label>
        <div class="input-with-prefix">
          <div class="input-prefix">🇺🇸 +1 <svg width="10" height="10" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="#475467" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <input type="tel" id="p-phone" value="${phone.replace(/^\+1\s*/,'')}" />
        </div>
      </div>
      <div class="field"><label>Work Email</label><input class="field-input" id="p-work-email" type="email" value="${email}" placeholder="Enter" /></div>
      <div class="field"><label>Secondary Email</label><input class="field-input" type="email" placeholder="Enter" /></div>
      <div class="field"><label>Personal Phone Number</label>
        <div class="input-with-prefix">
          <div class="input-prefix">🇺🇸 +1 <svg width="10" height="10" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="#475467" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <input type="tel" id="p-personal-phone" placeholder="(XXX) XXX-XXXX" />
        </div>
      </div>
      <div class="field"><label>Personal Email</label><input class="field-input" id="p-personal-email" type="email" placeholder="Enter" /></div>
    </div>
  </div>

  <div class="section">
    <h3>Address</h3>
    <div class="field-grid">
      <div class="field"><label>Residential Address <span class="field-required">*</span></label><input class="field-input" id="p-street" value="${street}" /></div>
      <div class="field"><label>Unit, Apt</label><input class="field-input" placeholder="Enter" /></div>
      <div class="field"><label>City <span class="field-required">*</span></label><input class="field-input" id="p-city" value="${city}" /></div>
      <div class="field"><label>State <span class="field-required">*</span></label><div class="select-wrapper"><select class="field-input" id="p-state"><option value="">Select</option><option ${state==='AL'?'selected':''}>AL</option><option ${state==='AK'?'selected':''}>AK</option><option ${state==='AZ'?'selected':''}>AZ</option><option ${state==='AR'?'selected':''}>AR</option><option ${state==='CA'?'selected':''}>CA</option><option ${state==='CO'?'selected':''}>CO</option><option ${state==='CT'?'selected':''}>CT</option><option ${state==='DE'?'selected':''}>DE</option><option ${state==='FL'?'selected':''}>FL</option><option ${state==='GA'?'selected':''}>GA</option><option ${state==='HI'?'selected':''}>HI</option><option ${state==='ID'?'selected':''}>ID</option><option ${state==='IL'?'selected':''}>IL</option><option ${state==='IN'?'selected':''}>IN</option><option ${state==='IA'?'selected':''}>IA</option><option ${state==='KS'?'selected':''}>KS</option><option ${state==='KY'?'selected':''}>KY</option><option ${state==='LA'?'selected':''}>LA</option><option ${state==='ME'?'selected':''}>ME</option><option ${state==='MD'?'selected':''}>MD</option><option ${state==='MA'?'selected':''}>MA</option><option ${state==='MI'?'selected':''}>MI</option><option ${state==='MN'?'selected':''}>MN</option><option ${state==='MS'?'selected':''}>MS</option><option ${state==='MO'?'selected':''}>MO</option><option ${state==='MT'?'selected':''}>MT</option><option ${state==='NE'?'selected':''}>NE</option><option ${state==='NV'?'selected':''}>NV</option><option ${state==='NH'?'selected':''}>NH</option><option ${state==='NJ'?'selected':''}>NJ</option><option ${state==='NM'?'selected':''}>NM</option><option ${state==='NY'?'selected':''}>NY</option><option ${state==='NC'?'selected':''}>NC</option><option ${state==='ND'?'selected':''}>ND</option><option ${state==='OH'?'selected':''}>OH</option><option ${state==='OK'?'selected':''}>OK</option><option ${state==='OR'?'selected':''}>OR</option><option ${state==='PA'?'selected':''}>PA</option><option ${state==='RI'?'selected':''}>RI</option><option ${state==='SC'?'selected':''}>SC</option><option ${state==='SD'?'selected':''}>SD</option><option ${state==='TN'?'selected':''}>TN</option><option ${state==='TX'?'selected':''}>TX</option><option ${state==='UT'?'selected':''}>UT</option><option ${state==='VT'?'selected':''}>VT</option><option ${state==='VA'?'selected':''}>VA</option><option ${state==='WA'?'selected':''}>WA</option><option ${state==='WV'?'selected':''}>WV</option><option ${state==='WI'?'selected':''}>WI</option><option ${state==='WY'?'selected':''}>WY</option></select></div></div>
      <div class="field"><label>Zip Code <span class="field-required">*</span></label><input class="field-input" id="p-zip" value="${zip}" /></div>
    </div>
    <div class="tax-jurisdiction-info">
      <div class="tax-jur-heading">
        Tax Jurisdiction
        <span class="tooltip-wrap">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="vertical-align:-1px;cursor:default;"><circle cx="8" cy="8" r="7" stroke="#8597ab" stroke-width="1.3"/><path d="M8 7v4M8 5v.5" stroke="#8597ab" stroke-width="1.4" stroke-linecap="round"/></svg>
          <span class="tooltip">Federal + State + Local taxes apply</span>
        </span>
      </div>
      <div class="tax-jur-value">
        <span>${taxJur}</span>
        <button class="btn-inline-link" onclick="openTaxesPane()">View Applicable Taxes</button>
      </div>
    </div>
    <div class="checkbox-row" onclick="toggleMailingSame(this)">
      <span class="cb-large checked">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      Mailing address same as residential
    </div>
    <div id="mailing-address-fields" style="display:none; padding-top:16px;">
      <div class="field-grid">
        <div class="field"><label>Mailing Address</label><input class="field-input" placeholder="Enter" /></div>
        <div class="field"><label>Unit, Apt</label><input class="field-input" placeholder="Enter" /></div>
        <div class="field"><label>City</label><input class="field-input" placeholder="Enter" /></div>
        <div class="field"><label>State</label><div class="select-wrapper"><select class="field-input"><option value="">Select</option><option>AL</option><option>AK</option><option>AZ</option><option>AR</option><option>CA</option><option>CO</option><option>CT</option><option>DE</option><option>FL</option><option>GA</option><option>HI</option><option>ID</option><option>IL</option><option>IN</option><option>IA</option><option>KS</option><option>KY</option><option>LA</option><option>ME</option><option>MD</option><option>MA</option><option>MI</option><option>MN</option><option>MS</option><option>MO</option><option>MT</option><option>NE</option><option>NV</option><option>NH</option><option>NJ</option><option>NM</option><option>NY</option><option>NC</option><option>ND</option><option>OH</option><option>OK</option><option>OR</option><option>PA</option><option>RI</option><option>SC</option><option>SD</option><option>TN</option><option>TX</option><option>UT</option><option>VT</option><option>VA</option><option>WA</option><option>WV</option><option>WI</option><option>WY</option></select></div></div>
        <div class="field"><label>Zip Code</label><input class="field-input" placeholder="Enter" /></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Emergency Contact</h3>
    <div class="field-grid">
      <div class="field"><label>Contact Name</label><input class="field-input" id="p-emg-name" value="${emgName}" placeholder="Enter" /></div>
      <div class="field"><label>Phone Number</label>
        <div class="input-with-prefix">
          <div class="input-prefix">🇺🇸 +1 <svg width="10" height="10" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="#475467" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <input type="tel" id="p-emg-phone" value="${emgPhone}" placeholder="(XXX) XXX-XXXX" />
        </div>
      </div>
      <div class="field"><label>Relationship</label><div class="select-wrapper"><select class="field-input"><option value="">Select</option><option>Spouse</option><option>Parent</option><option>Sibling</option><option>Child</option><option>Friend</option><option>Other</option></select></div></div>
    </div>
  </div>

  <div class="section">
    <h3>Notes</h3>
    <div class="field">
      <label>Notes</label>
      <textarea class="field-input field-textarea" placeholder="Enter"></textarea>
    </div>
  </div>`;
}

// ── Benefits ──────────────────────────────────────────────────────────────

function openBnBenefitMenu(e, canDelete) {
  e.stopPropagation();
  if (activeMenu) { activeMenu.remove(); activeMenu = null; }
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu open';
  menu.style.cssText = 'position:fixed;z-index:200;min-width:150px;';
  menu.innerHTML = `
    <div class="dropdown-item" onclick="closeMenuOnce();toast('Edit benefit')">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M14 3l3 3-9 9H5v-3L14 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      Edit
    </div>
    ${canDelete ? `<div class="dropdown-item danger" onclick="closeMenuOnce();toast('Delete benefit')">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 9v6M13 9v6M5 6l1 10h8l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Delete
    </div>` : ''}`;
  document.body.appendChild(menu);
  activeMenu = menu;
  const rect = e.currentTarget.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 160) + 'px';
}

function filterBnBenefits(query) {
  const tbody = document.querySelector('#bn-benefits-table tbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
  });
}

function buildBenefitsSectionHTML() {
  const searchIco = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M16 16l-3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  const kebabIco = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="5" r="1.4" fill="currentColor"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/><circle cx="10" cy="15" r="1.4" fill="currentColor"/></svg>`;

  const benefits = [
    { type: 'Non Taxable Fringe', createdBy: 'Admin',  desc: 'Training',      empCont: '$0.00/hr', erCont: '$0.57/hr', start: 'Jan 1, 2026',   end: '', canDelete: false },
    { type: 'Non Taxable Fringe', createdBy: 'System', desc: 'Paid-Training', empCont: '$0.00',    erCont: '$0.00',    start: 'Dec 16, 2025', end: '', canDelete: true  },
  ];
  const benefitRows = benefits.map(b => `<tr>
    <td class="bn-benefit-name">${b.type}</td>
    <td>${b.desc}</td>
    <td class="pov-td-num">${b.empCont}</td>
    <td class="pov-td-num">${b.erCont}</td>
    <td>${b.start}</td>
    <td>${b.end}</td>
    <td>${b.createdBy}</td>
    <td style="text-align:right">
      <button class="pov-more-btn" onclick="openBnBenefitMenu(event,${b.canDelete})">${kebabIco}</button>
    </td>
  </tr>`).join('');

  return `<div class="bn-grid">
    <div class="section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="margin-bottom:0">Benefits Assigned</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="bn-search-wrap">${searchIco}<input type="text" class="bn-search-input" placeholder="Search benefits…" oninput="filterBnBenefits(this.value)"></div>
          <button class="pay-action-btn" onclick="toast('Add Benefit')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            Add Benefit
          </button>
        </div>
      </div>
      <div id="bn-benefits-table">
        <table class="pay-table">
          <thead><tr>
            <th>Benefit Type</th><th>Description</th><th style="text-align:right">Employee Contribution</th><th style="text-align:right">Employer Contribution</th><th>Start Date</th><th>End Date</th><th>Created By</th><th></th>
          </tr></thead>
          <tbody>${benefitRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h3>Benefits Category</h3>
      <div class="bn-field-grid">
        <div class="field">
          <label>Class<span class="field-required">*</span></label>
          <div class="select-wrapper"><select class="field-input">
            <option>EMPHOURLY</option><option>EMPSALARY</option><option>CONTRACTOR</option>
          </select></div>
        </div>
        <div class="field">
          <label>Location<span class="field-required">*</span></label>
          <div class="select-wrapper"><select class="field-input">
            <option>KRC, Los Angeles</option><option>SF Downtown</option><option>Oakland Main</option>
          </select></div>
        </div>
        <div class="field">
          <label>Division<span class="field-required">*</span></label>
          <div class="select-wrapper"><select class="field-input">
            <option>LA KRC 2</option><option>LA KRC 1</option><option>SF Division</option>
          </select></div>
        </div>
        <div class="field">
          <label>Department<span class="field-required">*</span></label>
          <div class="select-wrapper"><select class="field-input">
            <option>FINANCE</option><option>OPERATIONS</option><option>HR</option><option>ENGINEERING</option>
          </select></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="tax-toggle-row" style="border-top:none;padding:0;">
        <label class="pay-sw">
          <input type="checkbox" checked onchange="toast('Bonus eligibility updated')">
          <span class="pay-sw-track"></span>
        </label>
        <div class="tax-toggle-body">
          <div class="tax-toggle-title">Eligible to receive bonus</div>
          <div class="tax-toggle-desc">Employee will be included in bonus calculations for this classification.</div>
        </div>
      </div>
    </div>
  </div>`;
}

function buildAwardsSectionHTML() {
  const recognitionCards = [
    {
      icon: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#f97316"/><text x="20" y="26" text-anchor="middle" font-size="18" fill="white">⚡</text></svg>`,
      title: 'Speed Recognition',
      desc: 'Awarded for exceptional speed and efficiency in task completion.',
    },
    {
      icon: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#84cc16"/><text x="20" y="26" text-anchor="middle" font-size="18" fill="white">★</text></svg>`,
      title: 'Quality Recognition',
      desc: 'Awarded for consistently delivering work of the highest quality.',
    },
    {
      icon: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#8b5cf6"/><text x="20" y="26" text-anchor="middle" font-size="18" fill="white">👍</text></svg>`,
      title: 'Praise Recognition',
      desc: 'Awarded for performing outstanding individual contributions.',
    },
  ];

  const cards = recognitionCards.map(c => `
    <div class="aw-recognition-card">
      <div class="aw-recognition-card-top">
        <div class="aw-recognition-icon">${c.icon}</div>
        <div>
          <div class="aw-recognition-title">${c.title}</div>
          <div class="aw-recognition-desc">${c.desc}</div>
        </div>
      </div>
      <div class="aw-recognition-awards-box">
        <div class="aw-recognition-awards-label">Awards</div>
        <div class="aw-recognition-awards-value">--</div>
      </div>
    </div>`).join('');

  return `<div class="to-wrap">
    <div class="aw-section-hd">
      <div class="aw-section-title">Achievements</div>
      <div class="aw-section-sub">Awarded by completing daily streaks</div>
    </div>
    <div class="empty-state" style="padding:40px 24px;">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="margin:0 auto;display:block">
        <circle cx="20" cy="20" r="18" stroke="#d5dbe2" stroke-width="1.8"/>
        <path d="M20 13v7l4 4" stroke="#d5dbe2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>No achievements yet. Complete daily streaks to earn badges.</p>
    </div>
    <hr class="section-divider">

    <div class="aw-section-hd aw-section-hd--row" style="margin-top:24px;">
      <div>
        <div class="aw-section-title">Recognitions</div>
        <div class="aw-section-sub">Recognitions are special awards given by foremen, admins, and owners for outstanding performances.</div>
      </div>
      <button class="btn btn-primary" style="padding:8px 18px;font-size:14px;white-space:nowrap;" onclick="toast('Send New Recognition clicked')">+ Send New Recognition</button>
    </div>

    <div class="aw-recognition-grid" style="margin-top:24px;">${cards}</div>
  </div>`;
}

function switchDrawerSection(el) {
  document.querySelectorAll('.drawer-nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const section = el.dataset.section;
  if (section !== 'job') { closeTimelinePane(); closeManagerHistoryPane(); }
  if (section !== 'profile') closeTaxesPane();
  const titles = {
    overview: 'Overview',
    profile: 'Profile', job: 'Job', timeattendance: 'Time & Attendance',
    pay: 'Pay', timeoff: 'Time Off', benefits: 'Benefits', scheduler: 'Scheduler',
    credentials: 'Credentials', assignments: 'Onboarding Tasks', documents: 'Documents',
    awards: 'Awards', access: 'Access & Controls'
  };
  document.getElementById('drawer-section-title').textContent = titles[section] || 'Profile';
  const sectionsWithSubnav = ['timeattendance', 'pay', 'timeoff', 'documents'];
  document.querySelector('.drawer-content-header').classList.toggle('has-subnav', sectionsWithSubnav.includes(section));
  document.querySelector('.drawer-content-body').classList.toggle('has-subnav', sectionsWithSubnav.includes(section));
  const headerSubnav = document.getElementById('drawer-header-subnav');
  if (section === 'timeattendance') {
    headerSubnav.innerHTML = `
      <button class="ta-subnav-btn active" data-tab="timesheet" onclick="switchTimeAttendanceTab(this)">Timesheet</button>
      <button class="ta-subnav-btn" data-tab="exceptions" onclick="switchTimeAttendanceTab(this)">Attendance Exceptions</button>`;
  } else if (section === 'pay') {
    const payTabs = [['Overview','overview'],['Paystubs','paystubs'],['Deductions','deductions'],['Pay Rates','payrates'],['Reimbursements','reimbursements'],['Tax Information','taxinfo']];
    headerSubnav.innerHTML = payTabs.map(([label, id], i) =>
      `<button class="ta-subnav-btn${i===0?' active':''}" onclick="switchPayTab(this,'${id}')">${label}</button>`).join('');
  } else if (section === 'timeoff') {
    headerSubnav.innerHTML = `
      <button class="ta-subnav-btn active" onclick="switchToTab(this,'leave')">Leave</button>
      <button class="ta-subnav-btn" onclick="switchToTab(this,'holiday')">Holiday</button>`;
  } else if (section === 'documents') {
    headerSubnav.innerHTML = `
      <button class="ta-subnav-btn active" onclick="switchDocTab('onboarding')">Onboarding</button>
      <button class="ta-subnav-btn" onclick="switchDocTab('payroll')">Payroll</button>`;
  } else {
    headerSubnav.innerHTML = '';
  }
  const footer = document.querySelector('.drawer-content-footer');
  footer.style.display = '';
  const body = document.getElementById('drawerSectionBody');
  if (section === 'overview') {
    body.innerHTML = buildOverviewSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'profile') {
    body.innerHTML = buildProfileSectionHTML();
    footer.innerHTML = `<button class="btn" onclick="closeDrawer()">Cancel</button>
       <button class="btn btn-primary" onclick="saveProfile()">Save</button>`;
    footer.style.display = 'none';
    body.addEventListener('input', () => { footer.style.display = ''; }, { once: true });
  } else if (section === 'job') {
    body.innerHTML = buildJobSectionHTML();
    footer.innerHTML = `<button class="btn" onclick="closeDrawer()">Cancel</button>
       <button class="btn btn-primary" onclick="saveJob()">Save</button>`;
    footer.style.display = 'none';
    body.addEventListener('input', () => { footer.style.display = ''; }, { once: true });
  } else if (section === 'timeattendance') {
    body.innerHTML = buildTimeAttendanceSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'pay') {
    body.innerHTML = buildPaySectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'timeoff') {
    body.innerHTML = buildTimeOffSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'benefits') {
    body.innerHTML = buildBenefitsSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'credentials') {
    body.innerHTML = buildCredentialsSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'assignments') {
    body.innerHTML = buildOnboardingTasksSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'documents') {
    body.innerHTML = buildDocumentsSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'awards') {
    body.innerHTML = buildAwardsSectionHTML();
    document.querySelector('.drawer-content-footer').style.display = 'none';
  } else if (section === 'access') {
    body.innerHTML = buildAccessControlsSectionHTML();
    footer.innerHTML = `<button class="btn" onclick="closeDrawer()">Cancel</button>
       <button class="btn btn-primary" onclick="toast('Access & Controls saved')">Save</button>`;
    footer.style.display = 'none';
    body.addEventListener('input', () => { footer.style.display = ''; }, { once: true });
  } else {
    body.innerHTML = `<div class="empty-state" style="padding:120px 24px;">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin:0 auto;display:block">
        <rect x="8" y="10" width="32" height="28" rx="3" stroke="#d5dbe2" stroke-width="2"/>
        <path d="M14 18h20M14 24h14M14 30h10" stroke="#d5dbe2" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>${titles[section]} section is a placeholder in this prototype.</p>
    </div>`;
    footer.innerHTML = `<button class="btn" onclick="closeDrawer()">Cancel</button>
       <button class="btn btn-primary" onclick="toast('Saved')">Save</button>`;
    footer.style.display = 'none';
    body.addEventListener('input', () => { footer.style.display = ''; }, { once: true });
  }
  document.querySelector('.drawer-content-body').scrollTop = 0;
}

// ── Onboarding Tasks ──────────────────────────────────────────────────────
const ONBOARDING_TASKS_DATA = [
  { assignee: 'Amelia Hernandez', template: 'Joey Request Template',      icon: 'upload',   dueDate: '10/31/2025', assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '-',          status: 'Pending'   },
  { assignee: 'Amelia Hernandez', template: 'Joey Delivery Template',     icon: 'download', dueDate: '10/31/2025', assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '-',          status: 'Pending'   },
  { assignee: 'Amelia Hernandez', template: 'Jobsite Safety Form',        icon: 'doc',      dueDate: '10/31/2025', assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '-',          status: 'Overdue'   },
  { assignee: 'Amelia Hernandez', template: 'Company Policy',             icon: 'download', dueDate: '10/31/2025', assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '-',          status: 'Pending'   },
  { assignee: 'Amelia Hernandez', template: 'Health Insurance Certificate', icon: 'upload', dueDate: '10/31/2025', assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '-',          status: 'Pending'   },
  { assignee: 'Amelia Hernandez', template: 'Joey Link',                  icon: 'link',     dueDate: '-',          assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '-',          status: 'Pending'   },
  { assignee: 'Amelia Hernandez', template: 'Form I-9 Section 1',         icon: 'doc',      dueDate: '10/31/2025', assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '-',          status: 'Pending'   },
  { assignee: 'Amelia Hernandez', template: 'Form I-9 Section 2',         icon: 'doc',      dueDate: '10/31/2025', assignedBy: 'David Success', assignedDate: '05/14/2026', completionDate: '05/14/2026', status: 'Completed' },
];

const OT_ICONS = {
  upload:   `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M10 13V7M7 10l3-3 3 3"/></svg>`,
  download: `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M10 7v6M7 10l3 3 3-3"/></svg>`,
  doc:      `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="12" height="16" rx="1.5"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>`,
  link:     `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h3v3M17 3l-8 8M8 5H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3"/></svg>`,
};

const OT_STATUS_CLASS = {
  Overdue:   'ot-badge-overdue',
  Pending:   'ot-badge-pending',
  Completed: 'ot-badge-completed',
};

function buildOnboardingTasksSectionHTML() {
  const rows = ONBOARDING_TASKS_DATA.map(t => `
    <tr class="ot-row">
      <td class="ot-td">${t.assignee}</td>
      <td class="ot-td ot-td-template">
        <span class="ot-icon">${OT_ICONS[t.icon]}</span>
        <span class="ot-template-name">${t.template}</span>
      </td>
      <td class="ot-td">${t.dueDate}</td>
      <td class="ot-td">${t.completionDate}</td>
      <td class="ot-td">${t.assignedBy}</td>
      <td class="ot-td">${t.assignedDate}</td>
      <td class="ot-td">
        <span class="ot-badge ${OT_STATUS_CLASS[t.status]}">${t.status}</span>
      </td>
      <td class="ot-td ot-td-menu">
        <button class="ot-menu-btn" onclick="toast('Options coming soon')">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="4.5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15.5" r="1.5"/></svg>
        </button>
      </td>
    </tr>`).join('');
  return `
    <div class="section-hd">
      <div class="section-hd-text">
        <span class="pay-sh">Assignments <span class="pay-count-badge">${ONBOARDING_TASKS_DATA.length}</span></span>
      </div>
      <div class="section-hd-action">
        <button class="btn" onclick="toast('Assign Task coming soon')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Assign Task
        </button>
      </div>
    </div>
    <div class="ot-table-wrap">
      <table class="ot-table">
        <thead>
          <tr>
            <th class="ot-th">Assignee</th>
            <th class="ot-th">Template</th>
            <th class="ot-th">Due Date</th>
            <th class="ot-th">Completion Date</th>
            <th class="ot-th">Assigned By</th>
            <th class="ot-th">Assigned Date</th>
            <th class="ot-th">Status</th>
            <th class="ot-th"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Documents ─────────────────────────────────────────────────────────────
const ONBOARDING_DOCS_DATA = [
  { name: 'Employee Doc', completedOn: '05/07/2026', expiresOn: '05/15/2026', completedBy: 'Anshika', notes: 'test demo notes' },
  { name: 'Joey',         completedOn: '05/01/2026', expiresOn: '05/20/2026', completedBy: 'Biden',   notes: 'Test Document'  },
];

const PAYROLL_DOCS_DATA = [];

function buildDocumentsSectionHTML(activeTab = 'onboarding') {
  const today = new Date();

  const onboardingRows = ONBOARDING_DOCS_DATA.map(d => {
    const [m, dy, y] = d.expiresOn.split('/').map(Number);
    const expired = new Date(y, m - 1, dy) < today;
    const expiresCell = expired
      ? `<span>${d.expiresOn}</span><br><span class="doc-expired-label">Expired</span>`
      : d.expiresOn;
    return `<tr class="doc-row">
      <td class="doc-td">${d.name}</td>
      <td class="doc-td">${d.completedOn}</td>
      <td class="doc-td">${expiresCell}</td>
      <td class="doc-td">${d.completedBy}</td>
      <td class="doc-td">${d.notes}</td>
      <td class="doc-td doc-td-menu">
        <button class="ot-menu-btn" onclick="toast('Document options')">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="4.5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15.5" r="1.5"/></svg>
        </button>
      </td>
    </tr>`;
  }).join('');

  const payrollRows = PAYROLL_DOCS_DATA.length
    ? PAYROLL_DOCS_DATA.map(d => `<tr class="doc-row">
        <td class="doc-td">${d.name}</td>
        <td class="doc-td">${d.signedDate}</td>
        <td class="doc-td">${d.year}</td>
        <td class="doc-td">${d.jurisdiction}</td>
        <td class="doc-td doc-td-menu">
          <button class="ot-menu-btn" onclick="toast('Document options')">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="4.5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15.5" r="1.5"/></svg>
          </button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="5" class="doc-no-rows">No rows</td></tr>`;

  return `
    <div class="doc-wrap">
    <div class="doc-tab-panel" id="docPanelOnboarding"
         style="display:${activeTab === 'onboarding' ? 'block' : 'none'}">
      <div class="doc-toolbar">
        <div class="doc-search-bar">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="#8597ab" stroke-width="1.5"/>
            <path d="M13.5 13.5L17 17" stroke="#8597ab" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input type="text" placeholder="Search documents" oninput="filterOnboardingDocs(this.value)" />
        </div>
        <button class="btn btn-primary doc-upload-btn" onclick="toast('Upload Document')">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2v12M2 8h12"/></svg>
          Upload Document
        </button>
      </div>
      <div class="doc-table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="doc-th">Document Name</th>
              <th class="doc-th">Completed On</th>
              <th class="doc-th">Expires On</th>
              <th class="doc-th">Completed By</th>
              <th class="doc-th">Notes</th>
              <th class="doc-th"></th>
            </tr>
          </thead>
          <tbody>${onboardingRows}</tbody>
        </table>
      </div>
      <div class="doc-footer">
        <div class="doc-perpage">
          <select class="doc-perpage-select"><option>25</option><option>50</option><option>100</option></select>
          <span>per page</span>
        </div>
        <div class="doc-pagination">
          <button class="doc-page-btn" disabled>&#8249;</button>
          <span class="doc-page-current">1</span>
          <button class="doc-page-btn" disabled>&#8250;</button>
        </div>
      </div>
    </div>

    <div class="doc-tab-panel" id="docPanelPayroll"
         style="display:${activeTab === 'payroll' ? 'block' : 'none'}">
      <div class="doc-table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="doc-th">Document</th>
              <th class="doc-th">Signed Date</th>
              <th class="doc-th">Year</th>
              <th class="doc-th">Jurisdiction</th>
              <th class="doc-th"></th>
            </tr>
          </thead>
          <tbody>${payrollRows}</tbody>
        </table>
      </div>
      <div class="doc-footer">
        <div class="doc-perpage">
          <select class="doc-perpage-select"><option>25</option><option>50</option><option>100</option></select>
          <span>per page</span>
        </div>
        <div class="doc-pagination">
          <button class="doc-page-btn" disabled>&#8249;</button>
          <button class="doc-page-btn" disabled>&#8250;</button>
        </div>
      </div>
    </div></div>`;
}

function switchDocTab(tab) {
  document.getElementById('drawer-header-subnav').querySelectorAll('.ta-subnav-btn').forEach(b => b.classList.remove('active'));
  [...document.getElementById('drawer-header-subnav').querySelectorAll('.ta-subnav-btn')]
    .find(b => b.getAttribute('onclick').includes(`'${tab}'`))?.classList.add('active');
  document.getElementById('docPanelOnboarding').style.display = tab === 'onboarding' ? '' : 'none';
  document.getElementById('docPanelPayroll').style.display = tab === 'payroll' ? '' : 'none';
}

function filterOnboardingDocs(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#docPanelOnboarding .doc-row').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? '' : 'none';
  });
}

// ── Credentials ───────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  'Certifications': {
    bg: '#7CC54F',
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="9.5" r="5.5" stroke="white" stroke-width="1.8" fill="rgba(255,255,255,0.2)"/>
      <circle cx="12" cy="9.5" r="2.8" fill="white"/>
      <path d="M8.8 14.5 L7 21 L12 18.5 L17 21 L15.2 14.5" fill="white" opacity="0.9"/>
    </svg>`
  },
  'Trainings': {
    bg: '#3DC9A0',
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7C10 6 6.5 6 4 7L4 19C6.5 18 10 18 12 19Z" fill="white"/>
      <path d="M12 7C14 6 17.5 6 20 7L20 19C17.5 18 14 18 12 19Z" fill="rgba(255,255,255,0.75)"/>
    </svg>`
  },
  'Licenses': {
    bg: '#5B6BE8',
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3" width="13" height="17" rx="1.5" fill="white" opacity="0.9"/>
      <line x1="5.5" y1="8" x2="13" y2="8" stroke="rgba(91,107,232,0.55)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="5.5" y1="11" x2="10.5" y2="11" stroke="rgba(91,107,232,0.55)" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="18" cy="17" r="4" fill="white"/>
      <circle cx="18" cy="17" r="2.2" stroke="rgba(91,107,232,0.6)" stroke-width="1.4" fill="none"/>
    </svg>`
  },
  'Other': {
    bg: '#9B72D0',
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="white" opacity="0.9"/>
      <circle cx="8.5" cy="11.5" r="2.5" fill="rgba(155,114,208,0.5)"/>
      <path d="M5 17.5C5 15.3 6.6 14 8.5 14C10.4 14 12 15.3 12 17.5" fill="rgba(155,114,208,0.45)"/>
      <line x1="14" y1="10" x2="20" y2="10" stroke="rgba(155,114,208,0.5)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="14" y1="13" x2="20" y2="13" stroke="rgba(155,114,208,0.5)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  }
};

const CREDENTIALS_DATA = [
  { issuer:'OSHA',  title:'GMAW and FCAW – Equipment and Filler Metals', level:'Level 1', category:'Certifications', issued:'1/24/2025', expires:'1/24/2025', status:'Expired'       },
  { issuer:'OSHA',  title:'Hazard Communication',                         level:'Level 1', category:'Certifications', issued:'3/10/2024', expires:'3/10/2026', status:'Active'        },
  { issuer:'AWS',   title:'Certified Welder – Plate',                     level:'Level 2', category:'Licenses',       issued:'6/5/2023',  expires:'6/5/2026',  status:'Verified'      },
  { issuer:'NCCER', title:'Core Curriculum',                               level:'Level 1', category:'Trainings',      issued:'9/1/2022',  expires:'9/1/2027',  status:'Valid'         },
  { issuer:'OSHA',  title:'30-Hour Construction Safety',                   level:'N/A',     category:'Certifications', issued:'11/15/2023',expires:'11/15/2025',status:'Expiring soon' },
  { issuer:'AWS',   title:'Certified Welding Inspector',                   level:'Level 3', category:'Licenses',       issued:'2/20/2024', expires:'2/20/2027', status:'Active'        },
  { issuer:'NCCER', title:'Pipefitting Level 1',                           level:'Level 1', category:'Trainings',      issued:'4/12/2023', expires:'4/12/2026', status:'Incomplete'    },
  { issuer:'OSHA',  title:'First Aid & CPR',                               level:'N/A',     category:'Other',          issued:'7/8/2024',  expires:'7/8/2025',  status:'Expiring soon' },
  { issuer:'AWS',   title:'Structural Welding Code – Steel',               level:'Level 2', category:'Licenses',       issued:'1/3/2025',  expires:'1/3/2028',  status:'Verified'      },
];

function buildCredentialsSectionHTML() {
  return `
    <div class="cred-toolbar">
      <div class="cred-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l4 4"/>
        </svg>
        <input class="cred-search" placeholder="Search credentials…"
               oninput="filterCredentials(this.value, document.getElementById('credCategoryFilter').value, document.getElementById('credStatusFilter').value)" />
      </div>
      <div class="cred-toolbar-right">
        <div class="cred-btn-group">
          <button class="cred-btn-group-item active" onclick="switchCredGroup(this)">Assigned</button>
          <button class="cred-btn-group-item" onclick="switchCredGroup(this)">Personal</button>
        </div>
        <select class="cred-filter-select" id="credCategoryFilter"
                onchange="filterCredentials(document.querySelector('.cred-search').value, this.value, document.getElementById('credStatusFilter').value)">
          <option value="">All categories</option>
          <option value="Licenses">Licenses</option>
          <option value="Certifications">Certifications</option>
          <option value="Trainings">Trainings</option>
          <option value="Other">Other</option>
        </select>
        <select class="cred-filter-select" id="credStatusFilter"
                onchange="filterCredentials(document.querySelector('.cred-search').value, document.getElementById('credCategoryFilter').value, this.value)">
          <option value="">All statuses</option>
          <option value="Expired">Expired</option>
          <option value="Expiring soon">Expiring soon</option>
          <option value="Active">Active</option>
          <option value="Incomplete">Incomplete</option>
          <option value="Verified">Verified</option>
          <option value="Valid">Valid</option>
        </select>
      </div>
    </div>
    <div class="cred-grid" id="credGrid">
      ${renderCredCards(CREDENTIALS_DATA)}
    </div>`;
}

function switchCredGroup(btn) {
  btn.closest('.cred-btn-group').querySelectorAll('.cred-btn-group-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function isExpired(dateStr) {
  const [m, d, y] = dateStr.split('/').map(Number);
  return new Date(y, m - 1, d) < new Date();
}

function renderCredCards(list) {
  if (!list.length) return '<div class="cred-empty">No credentials match your search.</div>';
  return list.map(c => {
    const exp = isExpired(c.expires);
    const cat = CATEGORY_ICONS[c.category] || { bg: '#8597ab', svg: '' };
    return `
      <div class="cred-card">
        <div class="cred-card-top">
          <div class="cred-icon" style="background:${cat.bg}">${cat.svg}</div>
          <div class="cred-meta">
            <div class="cred-issuer">
              ${c.issuer}
              <span class="cred-issuer-check">
                <svg viewBox="0 0 8 8" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1.5 4l2 2 3-3"/>
                </svg>
              </span>
            </div>
            <div class="cred-title">${c.title}</div>
            <div class="cred-level">${c.level}</div>
          </div>
        </div>
        <div class="cred-divider"></div>
        <div class="cred-footer">
          <div class="cred-footer-item">
            <div class="cred-footer-label">Category</div>
            <div class="cred-footer-value">${c.category}</div>
          </div>
          <div class="cred-footer-item">
            <div class="cred-footer-label">Issued</div>
            <div class="cred-footer-value">${c.issued}</div>
          </div>
          <div class="cred-footer-item">
            <div class="cred-footer-label">Expires</div>
            <div class="cred-footer-value${exp ? ' expired' : ''}">${c.expires}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterCredentials(query, category, status) {
  const q = query.toLowerCase();
  const filtered = CREDENTIALS_DATA.filter(c => {
    const matchText = !q || c.title.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q);
    const matchCat  = !category || c.category === category;
    const matchStat = !status  || c.status === status;
    return matchText && matchCat && matchStat;
  });
  document.getElementById('credGrid').innerHTML = renderCredCards(filtered);
}

function filterDrawerNav(q) {
  q = q.toLowerCase();
  document.querySelectorAll('.drawer-nav-item').forEach(i => {
    i.style.display = i.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function toggleMailingSame(el) {
  const cb = el.querySelector('.cb-large');
  cb.classList.toggle('checked');
  const fields = document.getElementById('mailing-address-fields');
  if (!fields) return;
  const isSame = cb.classList.contains('checked');
  fields.style.display = isSame ? 'none' : 'block';
  if (!isSame) {
    const g = id => document.getElementById(id);
    const [streetEl, unitEl, cityEl, zipEl] = fields.querySelectorAll('input.field-input');
    const stateEl = fields.querySelector('select');
    if (streetEl) streetEl.value = g('p-street')?.value || '';
    if (unitEl)   unitEl.value   = '';
    if (cityEl)   cityEl.value   = g('p-city')?.value   || '';
    if (stateEl)  stateEl.value  = g('p-state')?.value  || '';
    if (zipEl)    zipEl.value    = g('p-zip')?.value     || '';
  }
}

function saveProfile() {
  const r = currentDrawerEmployee;
  if (r) {
    const g = id => document.getElementById(id);
    r.first            = g('p-first')?.value.trim()      || r.first;
    r.last             = g('p-last')?.value.trim()       || r.last;
    const rawPhone = g('p-phone')?.value.trim();
    if (rawPhone) r.phone = rawPhone.startsWith('+') ? rawPhone : `+1 ${rawPhone}`;
    r.email            = g('p-work-email')?.value.trim() || r.email;
    r.street           = g('p-street')?.value.trim()     || r.street;
    r.city             = g('p-city')?.value.trim()       || r.city;
    r.state            = g('p-state')?.value.trim()      || r.state;
    r.zip              = g('p-zip')?.value.trim()        || r.zip;
    r.emergencyContact = g('p-emg-name')?.value.trim()  || r.emergencyContact;
    r.emergencyPhone   = g('p-emg-phone')?.value.trim() || r.emergencyPhone;
    const ssnInput = g('p-ssn');
    if (ssnInput?.value) r.ssn = ssnInput.value;
    document.getElementById('d-name').textContent = `${r.first} ${r.last}`;
    const initials = (r.first[0] || '?') + (r.last[0] || '');
    document.getElementById('d-avatar').textContent = initials.toUpperCase();
  }
  toast('Profile saved');
  closeDrawer();
}

// ── Toast ─────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#7aecb4" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#7aecb4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${msg}`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

// ── Keyboard ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeEditRoleModal(); closeTimelineModal(); closeTimelinePane(); closeManagerHistoryPane(); closeAddTimelineModal(); closeFilters(); closeMenuOnce(); closeDrawer(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

// ── Access & Controls ─────────────────────────────────────────────────────
function acToggle(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.checked = !input.checked;
  input.dispatchEvent(new Event('change'));
}

function removeAcChip(btn) {
  btn.closest('.tag-chip').remove();
}

function addAcChip(e, input) {
  if (e.key !== 'Enter') return;
  const val = input.value.trim();
  if (!val) return;
  e.preventDefault();
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.innerHTML = `${val}<button class="tag-chip-remove" onclick="removeAcChip(this)" type="button" title="Remove"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`;
  input.parentNode.insertBefore(chip, input);
  input.value = '';
}

function buildAccessControlsSectionHTML() {
  const r = currentDrawerEmployee;
  const empId = r ? (r.code || `EMP${String(r.id).padStart(4,'0')}`) : 'EMP0001';
  const secId = r ? `SEC-${String(r.id).padStart(6,'0')}` : 'SEC-000001';
  const chkId = r ? `CHQ-${String(r.id * 7 + 4812).padStart(8,'0')}` : 'CHQ-00004816';

  return `
  <div class="section ac-subsection">
    <h3>Lumber Mobile Application Controls</h3>
    <div class="ac-section-rule"></div>
    <div class="tax-toggle-row" style="border-top:none;">
      <label class="pay-sw">
        <input type="checkbox" id="ac-sw-login" checked onchange="toast('Login access ' + (this.checked ? 'enabled' : 'disabled'))" />
        <span class="pay-sw-track"></span>
      </label>
      <div class="tax-toggle-body">
        <div class="tax-toggle-title">Allow Login to the Lumber Application</div>
        <div class="tax-toggle-desc">Allows the employee to login to the Lumber Application.</div>
      </div>
    </div>
    <div class="tax-toggle-row" style="border-top:none;margin-top:24px;">
      <label class="pay-sw">
        <input type="checkbox" id="ac-sw-app" onchange="toast('Mobile clock-in ' + (this.checked ? 'disabled' : 'enabled'))" />
        <span class="pay-sw-track"></span>
      </label>
      <div class="tax-toggle-body">
        <div class="tax-toggle-title">Disable Clock In on the Lumber Mobile Application</div>
        <div class="tax-toggle-desc">Disables the standard Clock In/Clock Out flow on the Lumber App. Employees will be required to use the "Request New Shift" option exclusively for submitting their time.</div>
      </div>
    </div>
  </div>

  <div class="section ac-subsection">
    <h3>Kiosk Mode</h3>
    <div class="ac-section-rule"></div>
    <div class="field">
      <label>Generate PIN</label>
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="ac-pin-field">
          <span class="ac-pin-dot"></span>
          <span class="ac-pin-dot"></span>
          <span class="ac-pin-dot"></span>
          <span class="ac-pin-dot"></span>
          <button class="ac-pin-refresh" onclick="document.getElementById('ac-sms-btn').disabled=false;toast('PIN regenerated')" title="Regenerate PIN">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 0 1 10.5-3.9M16 10a6 6 0 0 1-10.5 3.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14.5 6V3.5l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 14v2.5L3 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <button id="ac-sms-btn" class="ac-sms-btn" disabled onclick="toast('PIN sent as SMS')">Send as SMS</button>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Lumber ID</h3>
    <div class="field-grid">
      <div class="field">
        <label>Employee ID</label>
        <input class="field-input ac-readonly" value="${empId}" readonly />
      </div>
      <div class="field">
        <label>Secondary Employee ID</label>
        <input class="field-input ac-readonly" value="${secId}" readonly />
      </div>
      <div class="field">
        <label>CheckHQ ID</label>
        <input class="field-input ac-readonly" value="${chkId}" readonly />
      </div>
    </div>
  </div>

  </div>`;
}

// ── Overview: navigate to drawer section + scroll to heading ──────────────
function navigateToDrawerSection(sectionKey, headingText) {
  const navItem = document.querySelector(`.drawer-nav-item[data-section="${sectionKey}"]`);
  if (!navItem) return;
  switchDrawerSection(navItem);
  if (!headingText) return;
  setTimeout(() => {
    const bodyEl   = document.querySelector('.drawer-content-body');
    const sectionBody = document.getElementById('drawerSectionBody');
    if (!bodyEl || !sectionBody) return;
    for (const h of sectionBody.querySelectorAll('h3')) {
      if (h.textContent.trim().toLowerCase().includes(headingText.toLowerCase())) {
        const hRect    = h.getBoundingClientRect();
        const bodyRect = bodyEl.getBoundingClientRect();
        bodyEl.scrollTop += hRect.top - bodyRect.top - 16;
        const section    = h.closest('.section');
        const firstInput = section && section.querySelector('.field-input');
        if (firstInput) {
          firstInput.focus();
          firstInput.classList.add('field-input--highlight');
          firstInput.addEventListener('animationend', () => firstInput.classList.remove('field-input--highlight'), { once: true });
        }
        break;
      }
    }
  }, 50);
}

// ── Taxes Pane ────────────────────────────────────────────────────────────
function openTaxesPane() {
  const r = currentDrawerEmployee;
  const city  = document.getElementById('p-city')?.value  || (r ? r.city  : '') || 'Norwich';
  const state = document.getElementById('p-state')?.value || (r ? r.state : '') || 'VT';
  const zip   = document.getElementById('p-zip')?.value   || (r ? r.zip   : '') || '';
  const location = [city, state, zip].filter(Boolean).join(' - ');

  const sections = [
    {
      heading: 'Federal',
      rows: [
        { paidBy: 'Company',  tax: 'Employer Social Security Tax', rate: '6.00%' },
        { paidBy: 'Company',  tax: 'Federal Unemployment Tax',     rate: '6.00%' },
        { paidBy: 'Company',  tax: 'Employer Medicare Tax',        rate: '1.00%' },
        { paidBy: 'Employee', tax: 'Social Security Tax',          rate: '6.00%' },
        { paidBy: 'Employee', tax: 'Federal Income Tax',           rate: '0.00%' },
        { paidBy: 'Employee', tax: 'Medicare',                     rate: '1.00%' },
        { paidBy: 'Employee', tax: 'Additional Medicare',          rate: '1.00%' },
      ],
    },
    {
      heading: 'State',
      rows: [
        { paidBy: 'Company',  tax: `${state} State Unemployment Tax`, rate: '2.00%' },
        { paidBy: 'Employee', tax: `${state} State Tax`,              rate: '0.00%' },
        { paidBy: 'Employee', tax: `${state} Paid Leave`,             rate: '1.00%' },
      ],
    },
    {
      heading: 'Local',
      rows: [
        { paidBy: 'Employee', tax: `${city} Local Income Tax`, rate: '0.00%' },
      ],
    },
  ];

  const thStyle = `padding:10px 14px;text-align:left;font-size:13px;font-weight:600;color:var(--800);border-bottom:1px solid var(--150);`;
  const thStyleR = `padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:var(--800);border-bottom:1px solid var(--150);`;

  const sectionsHTML = sections.map(s => `
    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:var(--900);margin-bottom:10px;">${s.heading}</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid var(--150);border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:var(--50);">
            <th style="${thStyle}">Paid By</th>
            <th style="${thStyle}">Tax</th>
            <th style="${thStyleR}">Rate</th>
          </tr>
        </thead>
        <tbody>
          ${s.rows.map(t => `
          <tr>
            <td style="padding:10px 14px;font-size:13px;color:var(--600);border-bottom:1px solid var(--150);">${t.paidBy}</td>
            <td style="padding:10px 14px;font-size:13px;color:var(--800);border-bottom:1px solid var(--150);">${t.tax}</td>
            <td style="padding:10px 14px;font-size:13px;color:var(--800);border-bottom:1px solid var(--150);text-align:right;">${t.rate}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');

  document.getElementById('taxesPaneBody').innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="font-size:15px;font-weight:700;color:var(--900);margin-bottom:2px;">${location}</div>
      <div style="font-size:13px;color:var(--600);">Federal + State + Local taxes apply</div>
    </div>
    ${sectionsHTML}`;

  document.getElementById('taxesPane').classList.add('open');
}

function closeTaxesPane() {
  document.getElementById('taxesPane').classList.remove('open');
}

// ── SSN toggle ────────────────────────────────────────────────────────────
function showBarTooltip(col, e) {
  let tip = document.getElementById('ov-bar-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'ov-bar-tip';
    tip.className = 'ov-bar-tooltip';
    document.body.appendChild(tip);
  }
  const hours      = col.dataset.hours;
  const worked     = col.dataset.worked;
  const extra      = col.dataset.extra;
  const extraLabel = col.dataset.extraLabel;
  if (!hours && !extra) return;
  let html = `<div class="ov-tip-total">${hours ? hours + 'h' : '–'} total</div><div class="ov-tip-row">Worked: ${worked ? worked + 'h' : '–'}</div>`;
  if (extra) html += `<div class="ov-tip-row">${extraLabel}: ${extra}h</div>`;
  tip.innerHTML = html;
  tip.style.display = 'block';
  const bar  = col.querySelector('.ov-chart-bar');
  const rect = (bar || col).getBoundingClientRect();
  tip.style.left = (rect.left + rect.width / 2 - tip.offsetWidth / 2) + 'px';
  tip.style.top  = (rect.top + window.scrollY - tip.offsetHeight - 4) + 'px';
  if (bar) bar.style.background = 'var(--blue)';
}

function hideBarTooltip() {
  const tip = document.getElementById('ov-bar-tip');
  if (tip) tip.style.display = 'none';
  document.querySelectorAll('.ov-chart-bar').forEach(b => b.style.background = '#D1E0FF');
}

function toggleOverviewSsn() {
  const val = document.getElementById('ov-ssn-val');
  const eye = document.getElementById('ov-ssn-eye');
  if (!val) return;
  const last4  = val.dataset.last4 || '0000';
  const masked = `XXX-XX-${last4}`;
  const isMasked = val.textContent === masked;
  val.textContent = isMasked ? `523-45-${last4}` : masked;
  val.classList.toggle('ov-meta-masked', !isMasked);
  eye.style.opacity = isMasked ? '0.4' : '1';
}

function toggleSsn() {
  const input = document.getElementById('p-ssn');
  const eye = document.getElementById('ssn-eye');
  if (!input) return;
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  eye.style.opacity = visible ? '1' : '0.4';
}

// ── Init ──────────────────────────────────────────────────────────────────
applyFilters();
