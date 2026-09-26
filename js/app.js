/**
 * FC26 LEAGUE MANAGER - CORE CONTROLLER & ENGINE
 * Standar Liga Dunia: Menang = 3 poin, Seri = 1 poin, Kalah = 0 poin
 * Tie-breaker: Poin > Selisih Gol (GD) > Gol Masuk (GF) > Nama
 */

// Preset Klub Top FC26
const DEFAULT_PRESET_CLUBS = [
  { id: 'c1', name: 'Real Madrid', player: 'Player 1', color: '#1e3a8a' },
  { id: 'c2', name: 'Manchester City', player: 'Player 2', color: '#0284c7' },
  { id: 'c3', name: 'Arsenal', player: 'Player 3', color: '#dc2626' },
  { id: 'c4', name: 'FC Barcelona', player: 'Player 4', color: '#7c2d12' },
  { id: 'c5', name: 'Bayern München', player: 'Player 5', color: '#b91c1c' },
  { id: 'c6', name: 'Liverpool', player: 'Player 6', color: '#991b1b' },
  { id: 'c7', name: 'Paris Saint-Germain', player: 'Player 7', color: '#1e1b4b' },
  { id: 'c8', name: 'Inter Milan', player: 'Player 8', color: '#0369a1' }
];

class FC26LeagueApp {
  constructor() {
    this.storageKey = 'fc26_league_data_v1';
    this.state = {
      leagueName: 'FC26 PREMIER LEAGUE',
      laptopCount: 2,
      leagueSystem: 'single', // 'single' or 'double'
      clubs: [],
      matches: []
    };

    this.currentFilter = 'all';
    this.currentLaptopFilter = 'all';

    this.init();
  }

  init() {
    this.loadState();

    // If no clubs exist at first launch, offer or load preset
    if (this.state.clubs.length === 0) {
      this.state.clubs = JSON.parse(JSON.stringify(DEFAULT_PRESET_CLUBS));
      this.generateRoundRobinSchedule();
      this.saveState();
    }

    this.initDOM();
    this.renderAll();
  }

  // ==================== STATE MANAGEMENT ====================
  loadState() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.state = Object.assign(this.state, parsed);
        // Ensure laptopCount is integer
        this.state.laptopCount = parseInt(this.state.laptopCount, 10) || 2;
      } catch (e) {
        console.error('Gagal membaca data localStorage', e);
      }
    }
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  // ==================== DOM INITIALIZATION ====================
  initDOM() {
    // Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Color picker preview
    const colorInput = document.getElementById('input-team-color');
    const colorHex = document.getElementById('color-hex-preview');
    if (colorInput && colorHex) {
      colorInput.addEventListener('input', (e) => {
        colorHex.textContent = e.target.value;
      });
    }

    // Modal Close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        this.closeModal(modalId);
      });
    });

    // Close modal on click backdrop
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Preset & Club Buttons
    document.getElementById('btn-load-preset')?.addEventListener('click', () => {
      if (confirm('Muat 8 Klub Preset FC26? Ini akan mereset jadwal pertandingan yang ada.')) {
        this.state.clubs = JSON.parse(JSON.stringify(DEFAULT_PRESET_CLUBS));
        this.generateRoundRobinSchedule();
        this.saveState();
        this.renderAll();
        this.showToast('Preset 8 tim FC26 berhasil dimuat!', 'success');
      }
    });

    document.getElementById('btn-add-team')?.addEventListener('click', () => {
      this.openTeamModal();
    });

    document.getElementById('btn-save-team')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveTeam();
    });

    // Score Modal buttons
    document.getElementById('btn-save-score')?.addEventListener('click', () => {
      this.saveMatchScore();
    });

    document.getElementById('btn-clear-match-result')?.addEventListener('click', () => {
      this.clearMatchScore();
    });

    // Fixtures buttons
    document.getElementById('btn-generate-fixtures')?.addEventListener('click', () => {
      if (this.state.clubs.length < 2) {
        alert('Minimal harus ada 2 klub untuk membuat jadwal liga!');
        return;
      }
      if (this.state.matches.length > 0) {
        if (!confirm('Buat ulang jadwal liga? Skor dan pertandingan saat ini akan diganti dengan jadwal baru.')) {
          return;
        }
      }
      this.generateRoundRobinSchedule();
      this.saveState();
      this.renderAll();
      this.showToast('Jadwal pertandingan liga berhasil dibuat!', 'success');
    });

    document.getElementById('btn-add-manual-match')?.addEventListener('click', () => {
      this.openManualMatchModal();
    });

    document.getElementById('btn-save-manual-match')?.addEventListener('click', () => {
      this.saveManualMatch();
    });

    // Fixtures Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.getAttribute('data-filter');
        this.renderFixtures();
      });
    });

    // Laptop Filter select
    document.getElementById('laptop-filter-select')?.addEventListener('change', (e) => {
      this.currentLaptopFilter = e.target.value;
      this.renderFixtures();
    });

    // Quick Add/Remove Laptop from Jadwal Banner
    document.getElementById('btn-quick-add-laptop')?.addEventListener('click', () => {
      this.quickAddLaptop();
    });

    document.getElementById('btn-quick-remove-laptop')?.addEventListener('click', () => {
      this.quickRemoveLaptop();
    });

    // Settings
    const laptopDec = document.getElementById('btn-laptop-dec');
    const laptopInc = document.getElementById('btn-laptop-inc');
    const laptopInput = document.getElementById('input-laptop-count');

    laptopDec?.addEventListener('click', () => {
      let val = parseInt(laptopInput.value, 10) || 1;
      if (val > 1) {
        laptopInput.value = val - 1;
      }
    });

    laptopInc?.addEventListener('click', () => {
      let val = parseInt(laptopInput.value, 10) || 1;
      if (val < 16) {
        laptopInput.value = val + 1;
      }
    });

    document.getElementById('btn-save-laptop-settings')?.addEventListener('click', () => {
      const count = parseInt(laptopInput.value, 10);
      if (count >= 1 && count <= 16) {
        this.state.laptopCount = count;
        this.reassignLaptops(count);
        this.saveState();
        this.renderAll();
        this.showToast(`Jumlah laptop diatur menjadi ${count} unit.`, 'success');
      } else {
        alert('Jumlah laptop harus antara 1 dan 16.');
      }
    });

    document.getElementById('btn-save-league-info')?.addEventListener('click', () => {
      const name = document.getElementById('input-league-name').value.trim();
      const system = document.querySelector('input[name="league-system"]:checked')?.value || 'single';
      if (name) {
        this.state.leagueName = name;
        this.state.leagueSystem = system;
        this.saveState();
        this.renderHeader();
        this.showToast('Pengaturan liga berhasil diperbarui!', 'success');
      }
    });

    // Backup & Resets
    document.getElementById('btn-export-data')?.addEventListener('click', () => {
      this.exportJSON();
    });

    document.getElementById('input-import-data')?.addEventListener('change', (e) => {
      this.importJSON(e);
    });

    document.getElementById('btn-reset-scores')?.addEventListener('click', () => {
      if (confirm('Yakin ingin mereset seluruh skor pertandingan kembali ke 0 (belum dimainkan)?')) {
        this.state.matches.forEach(m => {
          m.isFinished = false;
          m.homeScore = 0;
          m.awayScore = 0;
        });
        this.saveState();
        this.renderAll();
        this.showToast('Semua skor pertandingan berhasil direset.', 'info');
      }
    });

    document.getElementById('btn-reset-all')?.addEventListener('click', () => {
      if (confirm('PERINGATAN: Ini akan menghapus semua klub dan jadwal turnamen! Lanjutkan?')) {
        this.state.clubs = [];
        this.state.matches = [];
        this.saveState();
        this.renderAll();
        this.showToast('Data turnamen telah dibersihkan.', 'info');
      }
    });

    // Print button
    document.getElementById('btn-print-standings')?.addEventListener('click', () => {
      window.print();
    });
  }

  // Switch Active Tab
  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });
  }

  quickAddLaptop() {
    if (this.state.laptopCount >= 16) {
      alert('Maksimal 16 laptop.');
      return;
    }
    this.state.laptopCount += 1;
    this.reassignLaptops(this.state.laptopCount);
    this.saveState();
    this.renderAll();
    this.showToast(`Laptop ${this.state.laptopCount} berhasil ditambahkan! Jadwal otomatis disesuaikan.`, 'success');
  }

  quickRemoveLaptop() {
    if (this.state.laptopCount <= 1) {
      alert('Minimal harus ada 1 laptop untuk turnamen.');
      return;
    }
    const removedNum = this.state.laptopCount;
    this.state.laptopCount -= 1;
    this.reassignLaptops(this.state.laptopCount);
    this.saveState();
    this.renderAll();
    this.showToast(`Laptop ${removedNum} dihapus. Jadwal dialihkan ke Laptop 1-${this.state.laptopCount}.`, 'info');
  }

  // Toast message
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // ==================== RENDERING ====================
  renderAll() {
    this.renderHeader();
    this.renderStandings();
    this.renderNextMatchesBanner();
    this.renderFixtures();
    this.renderTeams();
    this.renderSettingsInputs();
  }

  renderHeader() {
    const titleEl = document.getElementById('league-title-display');
    if (titleEl) titleEl.textContent = this.state.leagueName;

    const clubStat = document.getElementById('stat-total-clubs');
    if (clubStat) clubStat.textContent = this.state.clubs.length;

    const laptopStat = document.getElementById('stat-total-laptops');
    if (laptopStat) laptopStat.textContent = this.state.laptopCount;

    const finishedCount = this.state.matches.filter(m => m.isFinished).length;
    const totalMatches = this.state.matches.length;
    const progressStat = document.getElementById('stat-progress');
    if (progressStat) {
      progressStat.textContent = `${finishedCount} / ${totalMatches}`;
    }
  }

  // ==================== STANDINGS CALCULATION (FIFA STANDARD) ====================
  calculateStandings() {
    // Initialize stats map for each club
    const stats = {};
    this.state.clubs.forEach(club => {
      stats[club.id] = {
        club: club,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0, // Goals For
        ga: 0, // Goals Against
        gd: 0, // Goal Difference
        pts: 0, // Points
        form: [] // Last 5 match results ('W', 'D', 'L')
      };
    });

    // Process finished matches in order
    const finishedMatches = this.state.matches.filter(m => m.isFinished);
    finishedMatches.forEach(match => {
      const home = stats[match.homeTeamId];
      const away = stats[match.awayTeamId];

      if (!home || !away) return;

      const hScore = parseInt(match.homeScore, 10) || 0;
      const aScore = parseInt(match.awayScore, 10) || 0;

      home.played += 1;
      away.played += 1;
      home.gf += hScore;
      home.ga += aScore;
      away.gf += aScore;
      away.ga += hScore;

      if (hScore > aScore) {
        // Home Win
        home.won += 1;
        home.pts += 3;
        home.form.push('W');

        away.lost += 1;
        away.form.push('L');
      } else if (hScore === aScore) {
        // Draw
        home.drawn += 1;
        home.pts += 1;
        home.form.push('D');

        away.drawn += 1;
        away.pts += 1;
        away.form.push('D');
      } else {
        // Away Win
        away.won += 1;
        away.pts += 3;
        away.form.push('W');

        home.lost += 1;
        home.form.push('L');
      }
    });

    // Calculate Goal Difference and format Form to last 5 matches
    const standingsList = Object.values(stats).map(s => {
      s.gd = s.gf - s.ga;
      s.recentForm = s.form.slice(-5); // take latest 5 results
      return s;
    });

    // Sort according to world standard rules:
    // 1. Points (PTS) DESC
    // 2. Goal Difference (GD) DESC
    // 3. Goals For (GF) DESC
    // 4. Club Name ASC
    standingsList.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.club.name.localeCompare(b.club.name);
    });

    return standingsList;
  }

  renderStandings() {
    const tbody = document.getElementById('standings-body');
    if (!tbody) return;

    if (this.state.clubs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center" style="padding: 2.5rem; color: var(--text-secondary);">
            Belum ada klub terdaftar. Silakan tambahkan klub atau muat Preset Tim FC26.
          </td>
        </tr>
      `;
      return;
    }

    const standings = this.calculateStandings();

    tbody.innerHTML = standings.map((item, index) => {
      const pos = index + 1;
      let posClass = 'pos-normal';
      let rankBadgeHtml = `<span class="pos-badge pos-regular">${pos}</span>`;

      if (pos === 1) {
        posClass = 'pos-1';
        rankBadgeHtml = `<span class="pos-badge pos-champion" title="Peringkat 1 - Calon Juara">${pos}</span>`;
      } else if (pos <= 4) {
        posClass = 'pos-ucl';
        rankBadgeHtml = `<span class="pos-badge pos-top4" title="Zona Atas">${pos}</span>`;
      }

      // Format GD with sign
      const gdFormatted = item.gd > 0 ? `+${item.gd}` : `${item.gd}`;

      // Form guide badges (last 5)
      let formHtml = '';
      if (item.recentForm.length === 0) {
        formHtml = '<span class="form-empty">-</span>';
      } else {
        formHtml = item.recentForm.map(res => {
          const label = res === 'W' ? 'Menang' : res === 'D' ? 'Seri' : 'Kalah';
          return `<span class="form-pill ${res.toLowerCase()}" title="${label}">${res}</span>`;
        }).join('');
      }

      return `
        <tr class="${posClass}">
          <td class="col-pos">
            ${rankBadgeHtml}
          </td>
          <td class="col-team">
            <div class="team-cell">
              <div class="team-badge-circle" style="background-color: ${item.club.color || '#2563eb'};">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div class="team-info">
                <span class="team-name-text">${item.club.name}</span>
                <span class="player-name-text">${item.club.player}</span>
              </div>
            </div>
          </td>
          <td class="col-stat">${item.played}</td>
          <td class="col-stat">${item.won}</td>
          <td class="col-stat">${item.drawn}</td>
          <td class="col-stat">${item.lost}</td>
          <td class="col-stat">${item.gf}</td>
          <td class="col-stat">${item.ga}</td>
          <td class="col-stat" style="font-weight: 600; color: ${item.gd > 0 ? '#10b981' : item.gd < 0 ? '#f43f5e' : 'var(--text-secondary)'};">${gdFormatted}</td>
          <td class="col-pts"><span class="pts-val">${item.pts}</span></td>
          <td class="col-form">
            <div class="form-guide">${formHtml}</div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==================== NEXT MATCHES ON LAPTOP BANNER ====================
  // Shows clearly for each laptop which match is next up to play!
  renderNextMatchesBanner() {
    const grid = document.getElementById('laptop-next-grid');
    if (!grid) return;

    const count = this.state.laptopCount || 2;
    const cards = [];

    for (let laptopNum = 1; laptopNum <= count; laptopNum++) {
      // Find the first unfinished match assigned to this laptop
      const nextMatch = this.state.matches.find(m => !m.isFinished && m.laptopNumber === laptopNum);

      if (nextMatch) {
        const homeClub = this.getClub(nextMatch.homeTeamId);
        const awayClub = this.getClub(nextMatch.awayTeamId);

        cards.push(`
          <div class="laptop-card active-match">
            <div class="laptop-card-header">
              <span class="laptop-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                LAPTOP ${laptopNum}
              </span>
              <span class="laptop-status-tag next"><span class="live-dot-sm"></span> GILIRAN MAIN</span>
            </div>

            <div class="laptop-match-content">
              <div class="next-team home">
                <div class="next-team-row">
                  <span class="team-color-bar" style="background-color: ${homeClub?.color || '#2563eb'};"></span>
                  <div class="next-team-text">
                    <span class="next-team-name">${homeClub ? homeClub.name : 'Unknown'}</span>
                    <span class="next-player-name">${homeClub ? homeClub.player : '-'}</span>
                  </div>
                </div>
              </div>
              <div class="next-vs-box">VS</div>
              <div class="next-team away">
                <div class="next-team-row away-row">
                  <div class="next-team-text text-right">
                    <span class="next-team-name">${awayClub ? awayClub.name : 'Unknown'}</span>
                    <span class="next-player-name">${awayClub ? awayClub.player : '-'}</span>
                  </div>
                  <span class="team-color-bar" style="background-color: ${awayClub?.color || '#ef4444'};"></span>
                </div>
              </div>
            </div>

            <div class="laptop-card-action">
              <button class="btn btn-primary btn-sm btn-station-action" onclick="window.app.openScoreModal('${nextMatch.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Input Skor (Match #${nextMatch.matchNumber || '-'})
              </button>
            </div>
          </div>
        `);
      } else {
        cards.push(`
          <div class="laptop-card idle-match">
            <div class="laptop-card-header">
              <span class="laptop-badge idle">
                LAPTOP ${laptopNum}
              </span>
              <span class="laptop-status-tag free">SELESAI / READY</span>
            </div>
            <div class="laptop-idle-body">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Tidak ada antrean laga aktif di laptop ini.</span>
            </div>
          </div>
        `);
      }
    }

    grid.innerHTML = cards.join('');
  }

  // ==================== FIXTURES & RESULTS ====================
  renderFixtures() {
    const container = document.getElementById('fixtures-container');
    const laptopSelect = document.getElementById('laptop-filter-select');
    if (!container) return;

    // Update laptop filter dropdown options
    if (laptopSelect) {
      const currentSelected = this.currentLaptopFilter;
      let opts = '<option value="all">Semua Laptop</option>';
      for (let i = 1; i <= this.state.laptopCount; i++) {
        opts += `<option value="${i}" ${currentSelected == i ? 'selected' : ''}>Laptop ${i}</option>`;
      }
      laptopSelect.innerHTML = opts;
    }

    if (this.state.matches.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <h3>Belum Ada Jadwal Pertandingan</h3>
          <p>Klik tombol <strong>Generate Jadwal Liga</strong> di atas untuk membuat jadwal otomatis sesuai jumlah klub dan laptop Anda.</p>
          <button class="btn btn-primary" onclick="window.app.generateRoundRobinSchedule(); window.app.saveState(); window.app.renderAll();">Generate Sekarang</button>
        </div>
      `;
      return;
    }

    // Filter matches
    let matches = [...this.state.matches];
    if (this.currentFilter === 'upcoming') {
      matches = matches.filter(m => !m.isFinished);
    } else if (this.currentFilter === 'finished') {
      matches = matches.filter(m => m.isFinished);
    }

    if (this.currentLaptopFilter !== 'all') {
      const lNum = parseInt(this.currentLaptopFilter, 10);
      matches = matches.filter(m => m.laptopNumber === lNum);
    }

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Tidak ada pertandingan dengan filter yang dipilih.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = matches.map(match => {
      const home = this.getClub(match.homeTeamId);
      const away = this.getClub(match.awayTeamId);

      const homeName = home ? home.name : 'Unknown';
      const homePlayer = home ? home.player : '-';
      const homeColor = home ? home.color : '#2563eb';

      const awayName = away ? away.name : 'Unknown';
      const awayPlayer = away ? away.player : '-';
      const awayColor = away ? away.color : '#ef4444';

      const scoreHtml = match.isFinished
        ? `<div class="score-board">${match.homeScore} - ${match.awayScore}</div>`
        : `<div class="score-board pending">VS</div>`;

      const statusBadge = match.isFinished
        ? `<span class="status-badge finished">Selesai (FT)</span>`
        : `<span class="status-badge scheduled">Jadwal</span>`;

      return `
        <div class="match-card ${match.isFinished ? 'is-finished' : ''}">
          <div class="match-meta-col">
            <span class="match-number">MATCH #${String(match.matchNumber || match.id).padStart(2, '0')}</span>
            <span class="match-laptop-pill">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              Laptop ${match.laptopNumber || 1} • MD ${match.round || 1}
            </span>
          </div>

          <div class="match-center-col">
            <!-- Home Team -->
            <div class="match-team home">
              <div class="match-team-info">
                <span class="match-team-name">${homeName}</span>
                <span class="match-player-sub">${homePlayer}</span>
              </div>
              <div class="team-badge-circle" style="background-color: ${homeColor};">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>

            <!-- Score Display -->
            <div class="score-display-box">
              ${scoreHtml}
            </div>

            <!-- Away Team -->
            <div class="match-team away">
              <div class="team-badge-circle" style="background-color: ${awayColor};">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div class="match-team-info">
                <span class="match-team-name">${awayName}</span>
                <span class="match-player-sub">${awayPlayer}</span>
              </div>
            </div>
          </div>

          <div class="match-action-col">
            ${statusBadge}
            <button class="btn ${match.isFinished ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.app.openScoreModal('${match.id}')">
              ${match.isFinished ? 'Edit Skor' : 'Input Skor'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==================== TEAMS MANAGEMENT ====================
  renderTeams() {
    const grid = document.getElementById('teams-grid');
    if (!grid) return;

    if (this.state.clubs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <h3>Daftar Klub Kosong</h3>
          <p>Belum ada klub atau pemain terdaftar. Klik <strong>Tambah Klub Baru</strong> atau gunakan <strong>Muat Preset Tim FC26</strong>.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.state.clubs.map(club => {
      const color = club.color || '#2563eb';

      return `
        <div class="team-card" style="border-top: 3px solid ${color};">
          <div class="team-card-top">
            <div class="team-avatar" style="background-color: ${color};">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="team-card-meta">
              <h4>${club.name}</h4>
              <span>Peserta: <strong>${club.player}</strong></span>
            </div>
          </div>
          <div class="team-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.app.editTeam('${club.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button class="btn btn-danger-outline btn-sm" onclick="window.app.deleteTeam('${club.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Hapus
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSettingsInputs() {
    const laptopInput = document.getElementById('input-laptop-count');
    if (laptopInput) laptopInput.value = this.state.laptopCount;

    const leagueInput = document.getElementById('input-league-name');
    if (leagueInput) leagueInput.value = this.state.leagueName;

    const radios = document.querySelectorAll('input[name="league-system"]');
    radios.forEach(r => {
      r.checked = (r.value === this.state.leagueSystem);
    });
  }

  // ==================== SCHEDULE GENERATOR (ROUND ROBIN) ====================
  generateRoundRobinSchedule() {
    const clubs = [...this.state.clubs];
    if (clubs.length < 2) return;

    let teams = [...clubs];
    // If odd number of teams, add dummy "BYE"
    const hasDummy = teams.length % 2 !== 0;
    if (hasDummy) {
      teams.push({ id: '__bye__', name: 'BYE' });
    }

    const n = teams.length;
    const roundsCount = n - 1;
    const matchesPerRound = n / 2;

    const generated = [];
    let matchCounter = 1;
    let laptopIndex = 1;
    const maxLaptop = this.state.laptopCount || 2;

    // Berger tables round-robin algorithm
    for (let round = 0; round < roundsCount; round++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const homeIdx = (round + i) % (n - 1);
        let awayIdx = (n - 1 - i + round) % (n - 1);

        if (i === 0) {
          awayIdx = n - 1;
        }

        const homeTeam = teams[homeIdx];
        const awayTeam = teams[awayIdx];

        if (homeTeam.id !== '__bye__' && awayTeam.id !== '__bye__') {
          // Switch home/away alternatively to balance home matches
          const isSwap = (round % 2 === 1 && i === 0);
          const finalHome = isSwap ? awayTeam : homeTeam;
          const finalAway = isSwap ? homeTeam : awayTeam;

          generated.push({
            id: `m_${matchCounter}`,
            matchNumber: matchCounter,
            round: round + 1,
            homeTeamId: finalHome.id,
            awayTeamId: finalAway.id,
            homeScore: 0,
            awayScore: 0,
            laptopNumber: laptopIndex,
            isFinished: false
          });

          matchCounter++;
          laptopIndex = (laptopIndex % maxLaptop) + 1;
        }
      }
    }

    // Double round robin (Home & Away) if selected
    if (this.state.leagueSystem === 'double') {
      const leg1Matches = [...generated];
      leg1Matches.forEach(m => {
        generated.push({
          id: `m_${matchCounter}`,
          matchNumber: matchCounter,
          round: m.round + roundsCount,
          homeTeamId: m.awayTeamId, // reversed
          awayTeamId: m.homeTeamId,
          homeScore: 0,
          awayScore: 0,
          laptopNumber: laptopIndex,
          isFinished: false
        });
        matchCounter++;
        laptopIndex = (laptopIndex % maxLaptop) + 1;
      });
    }

    this.state.matches = generated;
  }

  // Reassign laptops to existing matches if laptop count changes
  reassignLaptops(newCount) {
    let lIdx = 1;
    this.state.matches.forEach(m => {
      // Keep finished match laptop or redistribute upcoming
      if (!m.isFinished) {
        m.laptopNumber = lIdx;
        lIdx = (lIdx % newCount) + 1;
      } else if (m.laptopNumber > newCount) {
        m.laptopNumber = ((m.laptopNumber - 1) % newCount) + 1;
      }
    });
  }

  // ==================== SCORE MODAL LOGIC ====================
  openScoreModal(matchId) {
    const match = this.state.matches.find(m => m.id === matchId);
    if (!match) return;

    const homeClub = this.getClub(match.homeTeamId);
    const awayClub = this.getClub(match.awayTeamId);

    document.getElementById('modal-match-id').value = match.id;
    document.getElementById('score-modal-meta').textContent = `MATCH #${match.matchNumber || match.id} • BABAK ${match.round || 1}`;

    // Home details
    document.getElementById('modal-home-name').textContent = homeClub ? homeClub.name : 'Unknown';
    document.getElementById('modal-home-player').textContent = homeClub ? homeClub.player : '-';
    const homeBadge = document.getElementById('modal-home-badge');
    if (homeBadge) {
      homeBadge.style.backgroundColor = homeClub ? homeClub.color : '#2563eb';
    }
    document.getElementById('input-home-score').value = match.isFinished ? match.homeScore : 0;

    // Away details
    document.getElementById('modal-away-name').textContent = awayClub ? awayClub.name : 'Unknown';
    document.getElementById('modal-away-player').textContent = awayClub ? awayClub.player : '-';
    const awayBadge = document.getElementById('modal-away-badge');
    if (awayBadge) {
      awayBadge.style.backgroundColor = awayClub ? awayClub.color : '#ef4444';
    }
    document.getElementById('input-away-score').value = match.isFinished ? match.awayScore : 0;

    // Populate laptop options in modal
    const laptopSelect = document.getElementById('modal-match-laptop');
    let laptopOpts = '';
    for (let i = 1; i <= this.state.laptopCount; i++) {
      laptopOpts += `<option value="${i}" ${match.laptopNumber === i ? 'selected' : ''}>Laptop ${i}</option>`;
    }
    laptopSelect.innerHTML = laptopOpts;

    // Delete/Clear score button visibility
    const clearBtn = document.getElementById('btn-clear-match-result');
    if (clearBtn) {
      clearBtn.style.display = match.isFinished ? 'inline-flex' : 'none';
    }

    this.openModal('modal-score');
  }

  adjustScore(side, amount) {
    const input = document.getElementById(side === 'home' ? 'input-home-score' : 'input-away-score');
    if (input) {
      let val = parseInt(input.value, 10) || 0;
      val += amount;
      if (val < 0) val = 0;
      if (val > 99) val = 99;
      input.value = val;
    }
  }

  saveMatchScore() {
    const matchId = document.getElementById('modal-match-id').value;
    const match = this.state.matches.find(m => m.id === matchId);
    if (!match) return;

    const hScore = parseInt(document.getElementById('input-home-score').value, 10);
    const aScore = parseInt(document.getElementById('input-away-score').value, 10);
    const laptopVal = parseInt(document.getElementById('modal-match-laptop').value, 10);

    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      alert('Masukkan skor angka yang valid!');
      return;
    }

    match.homeScore = hScore;
    match.awayScore = aScore;
    match.isFinished = true;
    if (!isNaN(laptopVal)) {
      match.laptopNumber = laptopVal;
    }

    this.saveState();
    this.closeModal('modal-score');
    this.renderAll();
    this.showToast(`Hasil pertandingan Match #${match.matchNumber || match.id} (${hScore}-${aScore}) berhasil disimpan!`, 'success');
  }

  clearMatchScore() {
    const matchId = document.getElementById('modal-match-id').value;
    const match = this.state.matches.find(m => m.id === matchId);
    if (!match) return;

    if (confirm('Hapus skor pertandingan ini dan kembalikan status menjadi belum selesai?')) {
      match.homeScore = 0;
      match.awayScore = 0;
      match.isFinished = false;

      this.saveState();
      this.closeModal('modal-score');
      this.renderAll();
      this.showToast('Skor pertandingan telah dihapus.', 'info');
    }
  }

  // ==================== MANUAL MATCH MODAL ====================
  openManualMatchModal() {
    if (this.state.clubs.length < 2) {
      alert('Daftarkan minimal 2 klub terlebih dahulu!');
      return;
    }

    const homeSelect = document.getElementById('manual-home-select');
    const awaySelect = document.getElementById('manual-away-select');
    const laptopSelect = document.getElementById('manual-laptop-select');

    const clubOptions = this.state.clubs.map(c => `<option value="${c.id}">${c.name} (${c.player})</option>`).join('');
    homeSelect.innerHTML = clubOptions;
    awaySelect.innerHTML = clubOptions;
    if (this.state.clubs.length > 1) {
      awaySelect.selectedIndex = 1;
    }

    let laptopOpts = '';
    for (let i = 1; i <= this.state.laptopCount; i++) {
      laptopOpts += `<option value="${i}">Laptop ${i}</option>`;
    }
    laptopSelect.innerHTML = laptopOpts;

    this.openModal('modal-manual-match');
  }

  saveManualMatch() {
    const homeId = document.getElementById('manual-home-select').value;
    const awayId = document.getElementById('manual-away-select').value;
    const laptopNumber = parseInt(document.getElementById('manual-laptop-select').value, 10) || 1;
    const round = parseInt(document.getElementById('manual-round-input').value, 10) || 1;

    if (homeId === awayId) {
      alert('Tim Tuan Rumah dan Tim Tamu tidak boleh sama!');
      return;
    }

    const newMatchNum = this.state.matches.length + 1;
    const newMatch = {
      id: `manual_${Date.now()}`,
      matchNumber: newMatchNum,
      round: round,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: 0,
      awayScore: 0,
      laptopNumber: laptopNumber,
      isFinished: false
    };

    this.state.matches.push(newMatch);
    this.saveState();
    this.closeModal('modal-manual-match');
    this.renderAll();
    this.showToast('Pertandingan baru berhasil ditambahkan ke jadwal!', 'success');
  }

  // ==================== CLUB MODAL LOGIC ====================
  openTeamModal(teamId = null) {
    const editIdInput = document.getElementById('team-edit-id');
    const titleEl = document.getElementById('team-modal-title');
    const nameInput = document.getElementById('input-team-name');
    const playerInput = document.getElementById('input-team-player');
    const colorInput = document.getElementById('input-team-color');
    const colorHex = document.getElementById('color-hex-preview');

    if (teamId) {
      const club = this.getClub(teamId);
      if (!club) return;
      editIdInput.value = club.id;
      titleEl.textContent = 'Edit Data Klub';
      nameInput.value = club.name;
      playerInput.value = club.player;
      colorInput.value = club.color || '#2563eb';
      colorHex.textContent = club.color || '#2563eb';
    } else {
      editIdInput.value = '';
      titleEl.textContent = 'Tambah Klub Baru';
      nameInput.value = '';
      playerInput.value = '';
      colorInput.value = '#2563eb';
      colorHex.textContent = '#2563eb';
    }

    this.openModal('modal-team');
  }

  saveTeam() {
    const editId = document.getElementById('team-edit-id').value;
    const name = document.getElementById('input-team-name').value.trim();
    const player = document.getElementById('input-team-player').value.trim();
    const color = document.getElementById('input-team-color').value;

    if (!name || !player) {
      alert('Nama Klub dan Nama Pemain wajib diisi!');
      return;
    }

    if (editId) {
      // Edit
      const club = this.getClub(editId);
      if (club) {
        club.name = name;
        club.player = player;
        club.color = color;
      }
      this.showToast(`Data klub ${name} berhasil diubah!`, 'success');
    } else {
      // Create new
      const newClub = {
        id: `club_${Date.now()}`,
        name,
        player,
        color
      };
      this.state.clubs.push(newClub);
      this.showToast(`Klub ${name} berhasil ditambahkan!`, 'success');
    }

    this.saveState();
    this.closeModal('modal-team');
    this.renderAll();
  }

  editTeam(clubId) {
    this.openTeamModal(clubId);
  }

  deleteTeam(clubId) {
    const club = this.getClub(clubId);
    if (!club) return;

    if (confirm(`Yakin ingin menghapus klub "${club.name}"? Pertandingan yang melibatkan klub ini juga akan dihapus.`)) {
      this.state.clubs = this.state.clubs.filter(c => c.id !== clubId);
      this.state.matches = this.state.matches.filter(m => m.homeTeamId !== clubId && m.awayTeamId !== clubId);
      this.saveState();
      this.renderAll();
      this.showToast(`Klub "${club.name}" berhasil dihapus.`, 'info');
    }
  }

  // ==================== BACKUP & RESTORE ====================
  exportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FC26_Liga_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('Data turnamen berhasil diexport ke file JSON!', 'success');
  }

  importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported && Array.isArray(imported.clubs)) {
          this.state = Object.assign(this.state, imported);
          this.state.laptopCount = parseInt(this.state.laptopCount, 10) || 2;
          this.saveState();
          this.renderAll();
          this.showToast('Data turnamen berhasil diimport!', 'success');
        } else {
          alert('Format file JSON tidak valid untuk FC26 League Manager.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON: ' + err.message);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  // ==================== HELPERS ====================
  getClub(clubId) {
    return this.state.clubs.find(c => c.id === clubId);
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FC26LeagueApp();
});
