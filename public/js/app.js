'use strict';

(() => {
  const API = window.LoopLedgerAPI;
  const Charts = window.LoopLedgerCharts;
  const $ = id => document.getElementById(id);

  const state = {
    devices: [],
    analytics: null,
    page: 'overview',
    editingId: null,
    search: '',
    category: '',
    status: '',
    confirmAction: null,
    noticeTimer: null
  };

  const STATUS_LABELS = {
    collected: 'Collected',
    assessed: 'Assessed',
    'in-repair': 'In repair',
    'ready-for-reuse': 'Ready for reuse',
    recycled: 'Recycled'
  };

  const ACTION_LABELS = {
    reuse: 'Reuse',
    repair: 'Repair',
    refurbish: 'Refurbish',
    recycle: 'Recycle'
  };

  const CATEGORY_ICONS = {
    laptop: '▣',
    desktop: '▤',
    monitor: '▧',
    phone: '▯',
    tablet: '▣',
    printer: '▤',
    television: '▣',
    battery: '▰',
    other: '◇'
  };

  const DEMO_IDS = [
    'LL-DEMO-001', 'LL-DEMO-002', 'LL-DEMO-003', 'LL-DEMO-004',
    'LL-DEMO-005', 'LL-DEMO-006', 'LL-DEMO-007', 'LL-DEMO-008'
  ];

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function formatNumber(value, digits = 0) {
    const number = Number(value);
    return (Number.isFinite(number) ? number : 0).toLocaleString('en-IN', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    });
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function quantityOf(device) {
    const quantity = Number(device.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  }

  function assessmentOf(device) {
    return device.assessment || {};
  }

  function recommendationOf(device) {
    const assessment = assessmentOf(device);
    const action = String(
      assessment.recommendation || device.recommendation || ''
    ).toLowerCase();

    return Object.prototype.hasOwnProperty.call(ACTION_LABELS, action)
      ? action
      : '';
  }

  function iconOf(device) {
    return CATEGORY_ICONS[device.category] || '◇';
  }

  function statusBadge(status) {
    const label = STATUS_LABELS[status] || status || 'Unknown';
    return `<span class="status-badge status-${escapeHTML(status)}">${escapeHTML(label)}</span>`;
  }

  function actionBadge(action) {
    const label = ACTION_LABELS[action] || 'Review';
    return `<span class="action-badge action-${escapeHTML(action)}">${escapeHTML(label)}</span>`;
  }

  function deviceCell(device) {
    return `
      <div class="device-cell">
        <span class="device-symbol">${iconOf(device)}</span>
        <div>
          <strong>${escapeHTML(device.name)}</strong>
          <small>${escapeHTML(device.id || device.deviceId)}</small>
        </div>
      </div>`;
  }

  function showNotice(message, type = 'success') {
    const notice = $('notice');
    if (!notice) return;

    clearTimeout(state.noticeTimer);
    notice.textContent = message;
    notice.className = `notice ${type}`;
    notice.hidden = false;

    state.noticeTimer = setTimeout(() => {
      notice.hidden = true;
    }, 4500);
  }

  function showPage(page) {
    const pages = [
      'overview', 'inventory', 'recovery',
      'analytics', 'activity', 'settings'
    ];

    if (!pages.includes(page)) return;
    state.page = page;

    document.querySelectorAll('.page').forEach(section => {
      section.classList.toggle('active', section.id === `page-${page}`);
    });

    document.querySelectorAll('[data-page]').forEach(button => {
      const active = button.dataset.page === page;

      if (button.classList.contains('nav-item')) {
        button.classList.toggle('active', active);
        button.setAttribute('aria-current', active ? 'page' : 'false');
      }
    });

    const labels = {
      overview: 'Overview',
      inventory: 'Device inventory',
      recovery: 'Recovery intelligence',
      analytics: 'Impact analytics',
      activity: 'Activity & records',
      settings: 'Settings'
    };

    if ($('breadcrumbCurrent')) {
      $('breadcrumbCurrent').textContent = labels[page];
    }

    $('sidebar')?.classList.remove('mobile-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'analytics' || page === 'overview') {
      requestAnimationFrame(() => Charts?.refreshTheme?.());
    }
  }

  async function loadData(showMessage = false) {
    const refreshButton = $('refreshButton');
    if (refreshButton) refreshButton.disabled = true;

    try {
      const [devicesResult, analyticsResult] = await Promise.all([
        API.getDevices({ limit: 100 }),
        API.getAnalytics()
      ]);

      state.devices = Array.isArray(devicesResult) ? devicesResult : [];
      state.analytics = analyticsResult?.data || null;

      if (!state.analytics) {
        throw new Error('Analytics data was not returned by the server.');
      }

      renderAll();

      if (showMessage) {
        showNotice('Workspace data refreshed successfully.');
      }

      return true;
    } catch (error) {
      showNotice(error.message || 'Unable to load workspace data.', 'error');
      return false;
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  // Use the same assessment data for all recommendation counts.
  function getRecommendationCounts() {
    const counts = {
      reuse: 0,
      repair: 0,
      refurbish: 0,
      recycle: 0
    };

    state.devices.forEach(device => {
      const action = recommendationOf(device);
      if (action) counts[action] += quantityOf(device);
    });

    return counts;
  }

  function getStatusCounts() {
    const counts = {};

    state.devices.forEach(device => {
      const status = device.status || 'unknown';
      counts[status] = (counts[status] || 0) + quantityOf(device);
    });

    return counts;
  }

  function getWorkingRate() {
    const total = state.devices.reduce(
      (sum, device) => sum + quantityOf(device), 0
    );

    const working = state.devices.reduce(
      (sum, device) => sum + (
        device.working === true ? quantityOf(device) : 0
      ), 0
    );

    return total ? Math.round((working / total) * 100) : 0;
  }

  function getEstimatedWeight() {
    return state.devices.reduce((sum, device) => {
      const assessment = assessmentOf(device);
      const weight = Number(
        assessment.estimatedWeightKg ?? device.weightKg ?? 0
      );

      return sum + Math.max(0, Number.isFinite(weight) ? weight : 0) *
        quantityOf(device);
    }, 0);
  }

  function getEstimatedWasteAvoided() {
    return state.devices.reduce((sum, device) => {
      const assessment = assessmentOf(device);
      const estimate = Number(assessment.estimatedWasteAvoidedKg ?? 0);

      return sum + Math.max(0, Number.isFinite(estimate) ? estimate : 0) *
        quantityOf(device);
    }, 0);
  }

  function getAverageRecoveryScore() {
    const total = state.devices.reduce(
      (sum, device) => sum + quantityOf(device), 0
    );

    const weighted = state.devices.reduce((sum, device) => {
      const assessment = assessmentOf(device);
      const score = Number(
        assessment.recoveryPotential ?? assessment.reuseScore ?? 0
      );

      return sum + Math.max(0, Math.min(100, score)) * quantityOf(device);
    }, 0);

    return total ? Math.round(weighted / total) : 0;
  }

  function renderOverview() {
    const analytics = state.analytics;
    if (!analytics) return;

    const overview = analytics.overview || {};
    const recommendations = getRecommendationCounts();
    const statuses = getStatusCounts();

    $('metricTotal').textContent = formatNumber(
      overview.totalDevices ??
      state.devices.reduce((sum, device) => sum + quantityOf(device), 0)
    );

    $('metricReuse').textContent = formatNumber(recommendations.reuse);
    $('metricWorking').textContent = `${formatNumber(getWorkingRate())}%`;
    $('metricWaste').textContent = `${formatNumber(getEstimatedWasteAvoided(), 1)} kg`;

    Charts?.renderPipeline?.(statuses);
    Charts?.renderRecommendations?.(recommendations);

    const priority = state.devices
      .filter(device =>
        ['collected', 'assessed', 'in-repair'].includes(device.status)
      )
      .slice(0, 5);

    $('priorityTable').innerHTML = priority.length
      ? priority.map(device => `
        <tr>
          <td>${deviceCell(device)}</td>
          <td>${escapeHTML(device.condition)}</td>
          <td>${statusBadge(device.status)}</td>
          <td>${actionBadge(recommendationOf(device))}</td>
          <td>
            <button class="small-button"
              data-action="edit-device"
              data-id="${escapeHTML(device.id)}">Review</button>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="5">No devices currently require attention.</td></tr>';
  }

  function filteredDevices() {
    const search = state.search.toLowerCase();

    return state.devices.filter(device => {
      const matchesSearch = !search || [
        device.name, device.category, device.id
      ].some(value => String(value || '').toLowerCase().includes(search));

      const matchesCategory = !state.category || device.category === state.category;
      const matchesStatus = !state.status || device.status === state.status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  function renderInventory() {
    const devices = filteredDevices();

    $('inventoryCount').textContent =
      `${devices.length} device${devices.length === 1 ? '' : 's'} shown`;

    $('inventoryTable').innerHTML = devices.map(device => `
      <tr>
        <td>${deviceCell(device)}</td>
        <td>${escapeHTML(device.category)}</td>
        <td>${escapeHTML(device.condition)}</td>
        <td>${statusBadge(device.status)}</td>
        <td>${actionBadge(recommendationOf(device))}</td>
        <td>
          <div class="table-actions">
            <button class="small-button"
              data-action="edit-device"
              data-id="${escapeHTML(device.id)}">Edit</button>
            <button class="small-button delete"
              data-action="delete-device"
              data-id="${escapeHTML(device.id)}">Delete</button>
          </div>
        </td>
      </tr>`).join('');

    $('emptyInventory').hidden = devices.length > 0;
  }

  function renderRecovery() {
    const descriptions = {
      reuse: 'Working devices in suitable condition that may be used again.',
      repair: 'Devices that may benefit from a repair assessment.',
      refurbish: 'Devices that may gain useful life through refurbishment.',
      recycle: 'Devices to prioritize for responsible material recovery.'
    };

    const colors = {
      reuse: 'green',
      repair: 'amber',
      refurbish: 'blue',
      recycle: 'violet'
    };

    const symbols = {
      reuse: '↗',
      repair: '⚒',
      refurbish: '◈',
      recycle: '↻'
    };

    const counts = getRecommendationCounts();

    $('recoveryCards').innerHTML = Object.keys(ACTION_LABELS).map(action => `
      <article class="recovery-card">
        <span class="metric-icon icon-${colors[action]}">${symbols[action]}</span>
        <strong>${formatNumber(counts[action])}</strong>
        <h3>${ACTION_LABELS[action]} pathway</h3>
        <p>${descriptions[action]}</p>
      </article>`).join('');

    $('recoveryTable').innerHTML = state.devices.map(device => {
      const assessment = assessmentOf(device);
      const score = Number(
        assessment.reuseScore ?? assessment.recoveryPotential ?? 0
      );

      return `
        <tr>
          <td>${deviceCell(device)}</td>
          <td>
            <strong>${formatNumber(score)}/100</strong>
            <div class="score-track">
              <span style="width:${Math.min(100, Math.max(0, score))}%"></span>
            </div>
          </td>
          <td>${actionBadge(recommendationOf(device))}</td>
          <td>${escapeHTML(assessment.reason || 'Assessment unavailable')}</td>
        </tr>`;
    }).join('');
  }

  function renderAnalytics() {
    const analytics = state.analytics;
    if (!analytics) return;

    const categories = analytics.categoryCounts || {};
    const recommendations = getRecommendationCounts();

    $('analyticsWeight').textContent =
      `${formatNumber(getEstimatedWeight(), 1)} kg`;

    $('analyticsPotential').textContent =
      `${formatNumber(getAverageRecoveryScore())}%`;

    $('analyticsRepair').textContent =
      formatNumber(recommendations.repair);

    $('analyticsDemo').textContent = formatNumber(
      state.devices.filter(device =>
        device.demo === true || DEMO_IDS.includes(device.id)
      ).length
    );

    Charts?.renderCategories?.(categories);
    Charts?.renderImpact?.(recommendations);
  }

  function renderActivity() {
    $('activityTable').innerHTML = state.devices.map(device => `
      <tr>
        <td>${deviceCell(device)}</td>
        <td>${escapeHTML(device.id)}</td>
        <td>${formatDate(device.createdAt)}</td>
        <td>${formatDate(device.updatedAt)}</td>
        <td>
          <span class="type-badge">
            ${device.demo === true || DEMO_IDS.includes(device.id)
              ? 'Demo record'
              : 'User record'}
          </span>
        </td>
      </tr>`).join('');
  }

  function renderSettings() {
    $('settingsRecordCount').textContent = formatNumber(state.devices.length);
  }

  function renderAll() {
    renderOverview();
    renderInventory();
    renderRecovery();
    renderAnalytics();
    renderActivity();
    renderSettings();
  }

  function openModal(device = null) {
    state.editingId = device?.id || null;

    $('deviceForm').reset();
    $('deviceId').value = device?.id || '';
    $('modalTitle').textContent = device ? 'Edit device' : 'Register a device';
    $('deviceName').value = device?.name || '';
    $('deviceCategory').value = device?.category || 'laptop';
    $('deviceCondition').value = device?.condition || 'good';
    $('deviceAge').value = device?.ageYears ?? 2;
    $('deviceWeight').value = device?.weightKg ?? 1;
    $('deviceWorking').checked = device?.working === true;

    $('editStatusField').hidden = !device;
    $('deviceStatus').value = device?.status || 'collected';

    $('deviceModal').hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => $('deviceName').focus(), 50);
  }

  function closeModal() {
    $('deviceModal').hidden = true;
    document.body.classList.remove('modal-open');
    state.editingId = null;
  }

  async function saveDevice(event) {
    event.preventDefault();

    const device = {
      name: $('deviceName').value.trim(),
      category: $('deviceCategory').value,
      condition: $('deviceCondition').value,
      ageYears: Number($('deviceAge').value),
      weightKg: Number($('deviceWeight').value),
      quality: 1,
      working: $('deviceWorking').checked
    };

    if (!device.name) {
      showNotice('Please enter a device name.', 'error');
      return;
    }

    const editing = Boolean(state.editingId);
    if (editing) device.status = $('deviceStatus').value;

    const saveButton = $('saveDeviceButton');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
      if (editing) {
        await API.updateDevice(state.editingId, device);
      } else {
        await API.createDevice(device);
      }

      closeModal();
      await loadData();
      showNotice(editing ? 'Device updated successfully.' : 'Device registered successfully.');
      showPage('inventory');
    } catch (error) {
      showNotice(error.message || 'Could not save device.', 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save device';
    }
  }

  function askConfirmation(title, message, action, label) {
    state.confirmAction = action;
    $('confirmTitle').textContent = title;
    $('confirmMessage').textContent = message;
    $('acceptConfirm').textContent = label;
    $('confirmModal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeConfirmation() {
    $('confirmModal').hidden = true;
    document.body.classList.remove('modal-open');
    state.confirmAction = null;
  }

  async function deleteDevice(id) {
    const device = state.devices.find(item => item.id === id);
    if (!device) return;

    askConfirmation(
      'Delete this device?',
      `This will permanently delete "${device.name}" from the local demo inventory.`,
      async () => {
        try {
          await API.deleteDevice(id);
          await loadData();
          showNotice('Device deleted successfully.');
        } catch (error) {
          showNotice(error.message || 'Unable to delete device.', 'error');
        }
      },
      'Delete device'
    );
  }

  function csvEscape(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function downloadCSV(filename, rows) {
    if (!rows.length) {
      showNotice('There are no records to export.', 'error');
      return;
    }

    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice('CSV export downloaded.');
  }

  function exportInventory() {
    const rows = [
      [
        'ID', 'Name', 'Category', 'Condition', 'Age years',
        'Weight kg', 'Working', 'Status', 'Recommendation',
        'Recovery score', 'Demo record'
      ],
      ...filteredDevices().map(device => [
        device.id,
        device.name,
        device.category,
        device.condition,
        device.ageYears,
        device.weightKg,
        device.working,
        device.status,
        recommendationOf(device),
        assessmentOf(device).reuseScore ?? '',
        device.demo === true || DEMO_IDS.includes(device.id) ? 'Yes' : 'No'
      ])
    ];

    downloadCSV('loopledger-inventory.csv', rows);
  }

  function exportActivity() {
    const rows = [
      ['Device', 'ID', 'Created', 'Last updated', 'Status', 'Record type'],
      ...state.devices.map(device => [
        device.name,
        device.id,
        device.createdAt,
        device.updatedAt,
        device.status,
        device.demo === true || DEMO_IDS.includes(device.id)
          ? 'Demo record'
          : 'User record'
      ])
    ];

    downloadCSV('loopledger-records.csv', rows);
  }

  function resetDemo() {
    askConfirmation(
      'Reset sample inventory?',
      'All current device records will be replaced with the original fictional sample records. Export anything you need first.',
      async () => {
        try {
          const response = await fetch('/api/devices/reset-demo', {
            method: 'POST',
            headers: { Accept: 'application/json' }
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || result.error || 'Reset is not available yet.');
          }

          await loadData();
          showNotice('Sample inventory has been reset.');
        } catch (error) {
          showNotice(error.message || 'Unable to reset inventory.', 'error');
        }
      },
      'Reset inventory'
    );
  }

  function setTheme(light) {
    document.body.classList.toggle('light-theme', light);
    localStorage.setItem('loopledger-theme', light ? 'light' : 'dark');

    if ($('themeToggle')) $('themeToggle').textContent = light ? '☾' : '☼';
    if ($('settingsThemeToggle')) {
      $('settingsThemeToggle').textContent = light ? 'Switch to dark' : 'Switch to light';
    }

    Charts?.refreshTheme?.();
  }

  function bindEvents() {
    document.querySelectorAll('[data-page]').forEach(button => {
      button.addEventListener('click', () => showPage(button.dataset.page));
    });

    document.querySelectorAll('[data-action="add-device"]').forEach(button => {
      button.addEventListener('click', () => openModal());
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const { action, id } = button.dataset;

      if (action === 'edit-device') {
        const device = state.devices.find(item => item.id === id);
        if (device) openModal(device);
      }

      if (action === 'delete-device') deleteDevice(id);
    });

    $('deviceForm').addEventListener('submit', saveDevice);
    $('closeModal').addEventListener('click', closeModal);
    $('cancelModal').addEventListener('click', closeModal);

    $('deviceModal').addEventListener('click', event => {
      if (event.target === $('deviceModal')) closeModal();
    });

    $('closeConfirm').addEventListener('click', closeConfirmation);
    $('cancelConfirm').addEventListener('click', closeConfirmation);

    $('acceptConfirm').addEventListener('click', async () => {
      const action = state.confirmAction;
      closeConfirmation();
      if (action) await action();
    });

    $('confirmModal').addEventListener('click', event => {
      if (event.target === $('confirmModal')) closeConfirmation();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeModal();
        closeConfirmation();
        $('sidebar')?.classList.remove('mobile-open');
      }
    });

    $('searchInput').addEventListener('input', event => {
      state.search = event.target.value.trim();
      renderInventory();
    });

    $('categoryFilter').addEventListener('change', event => {
      state.category = event.target.value;
      renderInventory();
    });

    $('statusFilter').addEventListener('change', event => {
      state.status = event.target.value;
      renderInventory();
    });

    $('clearFilters').addEventListener('click', () => {
      state.search = '';
      state.category = '';
      state.status = '';

      $('searchInput').value = '';
      $('categoryFilter').value = '';
      $('statusFilter').value = '';

      renderInventory();
    });

    $('refreshButton').addEventListener('click', () => loadData(true));
    $('exportButton').addEventListener('click', exportInventory);
    $('analyticsExport').addEventListener('click', exportInventory);
    $('activityExport').addEventListener('click', exportActivity);
    $('resetDemoButton').addEventListener('click', resetDemo);

    $('mobileMenu').addEventListener('click', () => {
      $('sidebar').classList.toggle('mobile-open');
    });

    $('themeToggle').addEventListener('click', () => {
      setTheme(!document.body.classList.contains('light-theme'));
    });

    $('settingsThemeToggle').addEventListener('click', () => {
      setTheme(!document.body.classList.contains('light-theme'));
    });
  }

  async function initialize() {
    $('footerYear').textContent = new Date().getFullYear();
    setTheme(localStorage.getItem('loopledger-theme') === 'light');
    bindEvents();

    try {
      const health = await API.health();
      $('apiStatus').textContent = health.status === 'healthy'
        ? 'Connected'
        : 'Unavailable';
    } catch {
      $('apiStatus').textContent = 'Unavailable';
    }

    await loadData();
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();