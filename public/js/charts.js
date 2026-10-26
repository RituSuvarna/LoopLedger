'use strict';

window.LoopLedgerCharts = (() => {
  const instances = {};

  const palette = {
    green: '#70d9a0',
    blue: '#82b5ff',
    violet: '#b49aff',
    amber: '#efc17c',
    red: '#ff8b96',
    muted: '#8d9bb0'
  };

  function themeColors() {
    const styles = getComputedStyle(document.body);

    return {
      text: styles.getPropertyValue('--muted').trim() || '#96a5ba',
      border: styles.getPropertyValue('--border').trim() || '#29374b',
      surface: styles.getPropertyValue('--surface').trim() || '#151f30'
    };
  }

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function legendMarkup(items) {
    return items.map(item => `
      <span class="legend-item">
        <span class="legend-dot" style="--legend-color:${item.color}"></span>
        ${item.label}
        <strong>${item.value}</strong>
      </span>
    `).join('');
  }

  function renderBar(id, labels, values, colors, horizontal = false) {
    const canvas = document.getElementById(id);

    if (!canvas || typeof Chart === 'undefined') return;

    destroy(id);
    const theme = themeColors();

    instances[id] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.surface,
            titleColor: theme.text,
            bodyColor: theme.text,
            borderColor: theme.border,
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { display: !horizontal, color: theme.border },
            ticks: {
              color: theme.text,
              precision: 0,
              font: { size: 10 }
            },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { display: horizontal, color: theme.border },
            ticks: {
              color: theme.text,
              precision: 0,
              font: { size: 10 }
            },
            border: { display: false }
          }
        }
      }
    });
  }

  function renderDoughnut(id, labels, values, colors) {
    const canvas = document.getElementById(id);

    if (!canvas || typeof Chart === 'undefined') return;

    destroy(id);
    const theme = themeColors();

    instances[id] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: theme.surface,
          borderWidth: 4,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.surface,
            titleColor: theme.text,
            bodyColor: theme.text,
            borderColor: theme.border,
            borderWidth: 1,
            padding: 10
          }
        }
      }
    });
  }

  function renderPipeline(statusCounts = {}) {
    const items = [
      { label: 'Collected', key: 'collected', color: palette.blue },
      { label: 'Assessed', key: 'assessed', color: palette.violet },
      { label: 'In repair', key: 'in-repair', color: palette.amber },
      { label: 'Ready for reuse', key: 'ready-for-reuse', color: palette.green },
      { label: 'Recycled', key: 'recycled', color: palette.muted }
    ];

    renderBar(
      'pipelineChart',
      items.map(item => item.label),
      items.map(item => Number(statusCounts[item.key] || 0)),
      items.map(item => item.color)
    );

    const legend = document.getElementById('pipelineLegend');
    if (legend) {
      legend.innerHTML = legendMarkup(
        items.map(item => ({
          ...item,
          value: Number(statusCounts[item.key] || 0)
        }))
      );
    }
  }

  function renderRecommendations(counts = {}) {
    const items = [
      { label: 'Reuse', key: 'reuse', color: palette.green },
      { label: 'Repair', key: 'repair', color: palette.amber },
      { label: 'Refurbish', key: 'refurbish', color: palette.blue },
      { label: 'Recycle', key: 'recycle', color: palette.violet }
    ];

    renderDoughnut(
      'recommendationChart',
      items.map(item => item.label),
      items.map(item => Number(counts[item.key] || 0)),
      items.map(item => item.color)
    );

    const legend = document.getElementById('recommendationLegend');
    if (legend) {
      legend.innerHTML = legendMarkup(
        items.map(item => ({
          ...item,
          value: Number(counts[item.key] || 0)
        }))
      );
    }
  }

  function renderCategories(counts = {}) {
    const entries = Object.entries(counts);

    renderBar(
      'categoryChart',
      entries.map(([name]) => name),
      entries.map(([, value]) => Number(value || 0)),
      entries.map((_, index) =>
        [palette.green, palette.blue, palette.violet, palette.amber][index % 4]
      ),
      true
    );
  }

  function renderImpact(counts = {}) {
    const items = [
      { label: 'Reuse', key: 'reuse', color: palette.green },
      { label: 'Repair', key: 'repair', color: palette.amber },
      { label: 'Refurbish', key: 'refurbish', color: palette.blue },
      { label: 'Recycle', key: 'recycle', color: palette.violet }
    ];

    renderBar(
      'impactChart',
      items.map(item => item.label),
      items.map(item => Number(counts[item.key] || 0)),
      items.map(item => item.color),
      true
    );
  }

  function refreshTheme() {
    const saved = Object.entries(instances).map(([id, chart]) => ({
      id,
      labels: chart.data.labels,
      datasets: chart.data.datasets.map(dataset => ({
        data: dataset.data,
        backgroundColor: dataset.backgroundColor
      })),
      type: chart.config.type,
      horizontal: chart.config.options.indexAxis === 'y'
    }));

    saved.forEach(item => {
      if (item.type === 'doughnut') {
        renderDoughnut(
          item.id,
          item.labels,
          item.datasets[0].data,
          item.datasets[0].backgroundColor
        );
      } else {
        renderBar(
          item.id,
          item.labels,
          item.datasets[0].data,
          item.datasets[0].backgroundColor,
          item.horizontal
        );
      }
    });
  }

  return {
    renderPipeline,
    renderRecommendations,
    renderCategories,
    renderImpact,
    refreshTheme
  };
})();