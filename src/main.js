import './styles/main.css';
import { APP } from './config/app.js';
import { RULES } from './config/rules.js';
import { computeRanking, getPlayerName, getCafeComLeiteZone } from './lib/ranking.js';
import { parseSetScore, validateScoreForWinner } from './lib/scoreParser.js';
import { getSession, signUp, signIn, signOut, onAuthStateChange } from './lib/auth.js';
import {
  fetchProfiles,
  updateProfile,
  uploadAvatar,
  getProfileDisplayName,
} from './lib/profiles.js';
import {
  getConfigError,
  fetchMatches,
  addMatch,
  confirmMatch,
  rejectMatch,
  deleteMatch,
  insertTimelineEvent,
  initSupabase,
} from './lib/supabase.js';

const state = {
  tab: APP.tabs[0],
  maisView: 'menu',
  authMode: 'login',
  profiles: [],
  matches: [],
  session: null,
  profile: null,
  loading: true,
  error: null,
  formError: null,
};

const medals = ['🥇', '🥈', '🥉'];

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(APP.locale, APP.dateFormat);
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  existing?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function medalForPosition(pos) {
  if (!APP.showMedals || pos > 3) return `<span class="pos-num">${pos}</span>`;
  return `<span class="rank-medal">${medals[pos - 1]}</span>`;
}

function statusBadge(status) {
  const label = APP.matchStatusLabels[status] ?? status;
  return `<span class="status-badge status-${status}">${escapeHtml(label)}</span>`;
}

function matchTypeLabel(type) {
  return RULES.matchTypes[type]?.label ?? type;
}

function renderConfigError() {
  return `
    <div class="alert alert-error">
      <strong>Supabase não configurado</strong>
      <p>${getConfigError()}</p>
      <p>Veja o arquivo <code>TUTORIAL.md</code> — passos 4 e 5.</p>
    </div>
  `;
}

function renderRanking() {
  const ranked = computeRanking(state.profiles, state.matches);
  if (ranked.length === 0) {
    return `<p class="empty">${APP.messages.emptyRanking}</p>`;
  }

  const cafeZone = getCafeComLeiteZone(ranked.length);
  const cafeLabels = RULES.cafeComLeite.labels;

  const cols = APP.rankingColumns
    .map((col) => `<th${col.width ? ` style="width:${col.width}"` : ''}>${col.label}</th>`)
    .join('');

  const rows = ranked
    .map((p) => {
      let cafeLabel = '';
      if (cafeZone.has(p.position)) {
        const idx = p.position === ranked.length ? 1 : 0;
        cafeLabel = `<span class="cafe-label">${cafeLabels[idx]}</span>`;
      }

      const cells = APP.rankingColumns
        .map((col) => {
          switch (col.key) {
            case 'position':
              return `<td>${medalForPosition(p.position)}</td>`;
            case 'nickname':
              return `<td><strong>${escapeHtml(p.nickname)}</strong> ${cafeLabel}</td>`;
            case 'location':
              return `<td>${escapeHtml(p.location)}</td>`;
            case 'winRate':
              return `<td>${p.winRate}%</td>`;
            default:
              return `<td>${p[col.key] ?? '—'}</td>`;
          }
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <p class="match-meta" style="margin-bottom:1rem">
      Valendo: <strong>${RULES.points.rankedWin} pts</strong> · Livre: <strong>${RULES.points.friendlyWin} pt</strong> · Só entram partidas confirmadas
    </p>
    <div class="table-wrap">
      <table>
        <thead><tr>${cols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderMatches() {
  if (state.matches.length === 0) {
    return `<p class="empty">${APP.messages.emptyMatches}</p>`;
  }

  return `
    <ul class="match-list">
      ${state.matches
        .map((m) => {
          const p1 = getPlayerName(state.profiles, m.player1_id);
          const p2 = getPlayerName(state.profiles, m.player2_id);
          let result;

          if (m.status === 'rejected') {
            result = `${escapeHtml(p1)} vs ${escapeHtml(p2)} — <span class="draw-label">recusada</span>`;
          } else if (m.winner_id) {
            const winner = getPlayerName(state.profiles, m.winner_id);
            const loser = m.winner_id === m.player1_id ? p2 : p1;
            result = `<span class="winner">${escapeHtml(winner)}</span> venceu ${escapeHtml(loser)}`;
          } else {
            result = `${escapeHtml(p1)} vs ${escapeHtml(p2)}`;
          }

          const score = m.score_display
            ? `<span class="match-score">${escapeHtml(m.score_display)}</span>`
            : '';
          const type = `<span class="match-type">${escapeHtml(matchTypeLabel(m.match_type))}</span>`;

          const isOpponent =
            state.profile &&
            m.status === 'pending' &&
            m.registered_by_id !== state.profile.id &&
            (m.player1_id === state.profile.id || m.player2_id === state.profile.id);

          const isRegistrar =
            state.profile && m.status === 'pending' && m.registered_by_id === state.profile.id;

          let actions = '';
          if (isOpponent) {
            actions = `
              <div class="match-actions">
                <button class="btn btn-primary" data-confirm-match="${m.id}">Confirmar</button>
                <button class="btn btn-danger" data-reject-match="${m.id}">Recusar</button>
              </div>
            `;
          } else if (isRegistrar) {
            actions = `<button class="btn btn-danger" data-delete-match="${m.id}">Cancelar</button>`;
          }

          return `
            <li class="match-item">
              <div>
                <div>${result} ${score} ${type} ${statusBadge(m.status)}</div>
                <div class="match-meta">${formatDate(m.played_at)}</div>
              </div>
              ${actions}
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function renderRegisterForm() {
  if (!state.session) {
    return `
      <div class="alert alert-info">
        <p>${APP.messages.loginRequired}</p>
        <button class="btn btn-primary" data-go-auth>Ir para Entrar / Cadastrar</button>
      </div>
    `;
  }

  if (state.profiles.length < 2) {
    return `<p class="empty">Precisa de pelo menos 2 jogadores cadastrados. Convide mais amigos!</p>`;
  }

  const myId = state.profile?.id;
  const defaultP1 = myId ?? state.profiles[0]?.id;
  const defaultP2 = state.profiles.find((p) => p.id !== defaultP1)?.id ?? state.profiles[1]?.id;

  const options1 = state.profiles
    .map(
      (p) =>
        `<option value="${p.id}"${p.id === defaultP1 ? ' selected' : ''}>${escapeHtml(getProfileDisplayName(p))}</option>`,
    )
    .join('');

  const options2 = state.profiles
    .map(
      (p) =>
        `<option value="${p.id}"${p.id === defaultP2 ? ' selected' : ''}>${escapeHtml(getProfileDisplayName(p))}</option>`,
    )
    .join('');

  const today = new Date().toISOString().slice(0, 10);
  const formError = state.formError
    ? `<div class="alert alert-error">${escapeHtml(state.formError)}</div>`
    : '';

  const typeOptions = Object.entries(RULES.matchTypes)
    .map(
      ([value, meta]) =>
        `<option value="${value}">${escapeHtml(meta.label)} — ${escapeHtml(meta.description)}</option>`,
    )
    .join('');

  return `
    ${formError}
    <form class="form-grid" id="match-form">
      <div class="form-row">
        <label for="player1">Jogador 1</label>
        <select id="player1" required>${options1}</select>
      </div>
      <div class="form-row">
        <label for="player2">Jogador 2</label>
        <select id="player2" required>${options2}</select>
      </div>
      <div class="form-row">
        <label for="match_type">Tipo</label>
        <select id="match_type" required>${typeOptions}</select>
      </div>
      <div class="form-row">
        <label>Resultado</label>
        <div class="radio-group">
          <label><input type="radio" name="result" value="p1" checked> Vitória Jogador 1</label>
          <label><input type="radio" name="result" value="p2"> Vitória Jogador 2</label>
        </div>
      </div>
      <div class="form-row">
        <label for="score">Placar do set (obrigatório)</label>
        <input id="score" type="text" placeholder="Ex: 6-4 ou 7-6" required />
        <p class="match-meta">1 set por partida. Placar do Jogador 1 primeiro (ex: 6-4).</p>
      </div>
      <div class="form-row">
        <label for="played_at">Data</label>
        <input id="played_at" type="date" value="${today}" required />
      </div>
      <button type="submit" class="btn btn-primary">Registrar partida</button>
      <p class="match-meta">A partida fica pendente até o adversário confirmar na aba Partidas.</p>
    </form>
  `;
}

function renderMaisMenu() {
  const loggedIn = !!state.session;
  const name = state.profile ? getProfileDisplayName(state.profile) : '';

  return `
    ${loggedIn ? `<p class="match-meta">Logado como <strong>${escapeHtml(name)}</strong></p>` : ''}
    <ul class="mais-menu">
      <li><button class="btn btn-primary mais-link" data-mais-view="perfil">${loggedIn ? 'Meu perfil' : 'Meu perfil (requer login)'}</button></li>
      <li><button class="btn btn-primary mais-link" data-mais-view="regras">Regras do ranking</button></li>
      <li><button class="btn btn-primary mais-link" data-mais-view="auth">${loggedIn ? 'Sair da conta' : 'Entrar / Cadastrar'}</button></li>
    </ul>
  `;
}

function renderAuthForm() {
  if (state.session) {
    return `
      <p class="match-meta">Você está logado como <strong>${escapeHtml(getProfileDisplayName(state.profile))}</strong>.</p>
      <button class="btn btn-danger" id="sign-out-btn">Sair</button>
    `;
  }

  const isLogin = state.authMode === 'login';
  const formError = state.formError
    ? `<div class="alert alert-error">${escapeHtml(state.formError)}</div>`
    : '';

  return `
    ${formError}
    <p class="auth-intro">${isLogin ? 'Já tem conta? Entre abaixo.' : 'Primeira vez? Crie sua conta gratuita.'}</p>
    <div class="auth-toggle" role="tablist" aria-label="Entrar ou cadastrar">
      <button class="auth-tab ${isLogin ? 'active' : ''}" data-auth-mode="login" type="button" role="tab" aria-selected="${isLogin}">Entrar</button>
      <button class="auth-tab ${!isLogin ? 'active' : ''}" data-auth-mode="signup" type="button" role="tab" aria-selected="${!isLogin}">Cadastrar</button>
    </div>
    ${isLogin ? '<p class="auth-hint">Não tem conta? Clique em <strong>Cadastrar</strong> acima.</p>' : ''}
    <form class="form-grid" id="auth-form">
      ${
        !isLogin
          ? `
        <div class="form-row">
          <label for="full_name">Nome completo</label>
          <input id="full_name" type="text" required maxlength="80" />
        </div>
        <div class="form-row">
          <label for="nickname">Apelido (ranking)</label>
          <input id="nickname" type="text" required maxlength="30" placeholder="Como aparece no ranking" />
        </div>
      `
          : ''
      }
      <div class="form-row">
        <label for="email">E-mail</label>
        <input id="email" type="email" required autocomplete="email" />
      </div>
      <div class="form-row">
        <label for="password">Senha</label>
        <input id="password" type="password" required minlength="6" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
      </div>
      <button type="submit" class="btn btn-primary">${isLogin ? 'Entrar' : 'Criar conta'}</button>
    </form>
  `;
}

function renderProfileForm() {
  if (!state.session) {
    return `
      <div class="alert alert-info">
        <p>Faça login para editar seu perfil.</p>
        <button class="btn btn-primary" data-mais-view="auth">Entrar / Cadastrar</button>
      </div>
    `;
  }

  const p = state.profile;
  const formError = state.formError
    ? `<div class="alert alert-error">${escapeHtml(state.formError)}</div>`
    : '';

  const avatar = p.avatar_url
    ? `<img class="profile-avatar" src="${escapeHtml(p.avatar_url)}" alt="" width="80" height="80" />`
    : `<div class="profile-avatar profile-avatar-placeholder">${escapeHtml(p.nickname?.[0]?.toUpperCase() ?? '?')}</div>`;

  return `
    ${formError}
    <div class="profile-header">${avatar}</div>
    <form class="form-grid" id="profile-form">
      <div class="form-row">
        <label for="avatar">Foto</label>
        <input id="avatar" type="file" accept="image/*" />
      </div>
      <div class="form-row">
        <label for="profile_full_name">Nome completo</label>
        <input id="profile_full_name" type="text" value="${escapeHtml(p.full_name)}" required maxlength="80" />
      </div>
      <div class="form-row">
        <label for="profile_nickname">Apelido</label>
        <input id="profile_nickname" type="text" value="${escapeHtml(p.nickname)}" required maxlength="30" />
      </div>
      <div class="form-row">
        <label for="profile_bairro">Bairro (SP)</label>
        <input id="profile_bairro" type="text" value="${escapeHtml(p.bairro ?? '')}" maxlength="60" placeholder="Ex: Vila Madalena" />
      </div>
      <div class="form-row">
        <label for="profile_cidade">Cidade (se não for SP)</label>
        <input id="profile_cidade" type="text" value="${escapeHtml(p.cidade ?? '')}" maxlength="60" />
      </div>
      <div class="form-row">
        <label for="profile_about">Sobre</label>
        <textarea id="profile_about" rows="3" maxlength="300" placeholder="Estilo de jogo, mão favorita...">${escapeHtml(p.about ?? '')}</textarea>
      </div>
      <button type="submit" class="btn btn-primary">Salvar perfil</button>
    </form>
  `;
}

function renderRegras() {
  return `
    <div class="regras-content">
      <h3>Partidas</h3>
      <ul>
        <li><strong>1 set = 1 partida</strong> — placar ex: 6-4, 7-6</li>
        <li>Vitória em 6 games (2 de diferença) ou 7-5 / 7-6 (tie-break)</li>
        <li>Sem empate</li>
        <li>Partida entra no ranking só após confirmação do adversário</li>
      </ul>
      <h3>Pontuação</h3>
      <ul>
        <li><strong>Valendo:</strong> ${RULES.points.rankedWin} pontos por vitória</li>
        <li><strong>Livre:</strong> ${RULES.points.friendlyWin} ponto por vitória</li>
        <li>Derrota: ${RULES.points.loss} pontos</li>
      </ul>
      <h3>Desempate no ranking</h3>
      <ol>
        <li>Pontos</li>
        <li>Games ganhos</li>
        <li>Vitórias</li>
        <li>Apelido (alfabético)</li>
      </ol>
      <h3>Zona inferior</h3>
      <p>Com ${RULES.cafeComLeite.minPlayers}+ jogadores, os 2 últimos ganham os rótulos <em>Café com Leite</em> e <em>Leitinho</em>.</p>
    </div>
  `;
}

function renderMais() {
  switch (state.maisView) {
    case 'perfil':
      return renderBackLink() + renderProfileForm();
    case 'auth':
      return renderBackLink() + renderAuthForm();
    case 'regras':
      return renderBackLink() + renderRegras();
    default:
      return renderMaisMenu();
  }
}

function renderBackLink() {
  return `<button class="btn btn-back" data-mais-view="menu" type="button">← Voltar</button>`;
}

function panelTitle() {
  if (state.tab === 'mais') {
    return APP.maisViews[state.maisView] ?? APP.tabLabels.mais;
  }
  return APP.tabLabels[state.tab] ?? state.tab;
}

function panelContent() {
  if (state.loading) return '<p class="empty">Carregando...</p>';
  if (state.error) return `<div class="alert alert-error">${escapeHtml(state.error)}</div>`;

  switch (state.tab) {
    case 'ranking':
      return renderRanking();
    case 'partidas':
      return renderMatches();
    case 'registrar':
      return renderRegisterForm();
    case 'mais':
      return renderMais();
    default:
      return '';
  }
}

function render() {
  const configErr = getConfigError();
  const app = document.getElementById('app');

  app.innerHTML = `
    <header class="header">
      <div class="header-net" aria-hidden="true">
        <svg class="header-net-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
          <defs>
            <pattern id="tennis-mesh" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M0 0 L12 12 M12 0 L0 12" stroke="rgba(255,255,255,0.35)" stroke-width="0.85" fill="none"/>
              <path d="M6 0 L6 12 M0 6 L12 6" stroke="rgba(0,0,0,0.18)" stroke-width="0.5" fill="none"/>
            </pattern>
            <linearGradient id="net-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="white" stop-opacity="0"/>
              <stop offset="22%" stop-color="white" stop-opacity="0"/>
              <stop offset="45%" stop-color="white" stop-opacity="0.35"/>
              <stop offset="70%" stop-color="white" stop-opacity="0.75"/>
              <stop offset="100%" stop-color="white" stop-opacity="1"/>
            </linearGradient>
            <mask id="net-mask">
              <rect width="400" height="200" fill="url(#net-fade)"/>
            </mask>
          </defs>
          <g mask="url(#net-mask)">
            <rect x="0" y="16" width="400" height="7" fill="rgba(255,255,255,0.42)" rx="1"/>
            <rect x="0" y="22" width="400" height="2" fill="rgba(0,0,0,0.1)"/>
            <rect x="0" y="177" width="400" height="7" fill="rgba(255,255,255,0.42)" rx="1"/>
            <rect x="0" y="176" width="400" height="2" fill="rgba(0,0,0,0.1)"/>
            <rect x="0" y="24" width="400" height="152" fill="url(#tennis-mesh)"/>
          </g>
        </svg>
      </div>
      <div class="header-inner">
        <div class="header-brand">
          <div class="header-logo-wrap">
            <img class="header-logo" src="${APP.logo}" alt="" width="188" height="188" />
          </div>
          <div class="header-wordmark">
            <h1 class="wordmark-primary">${escapeHtml(APP.wordmark.primary)}</h1>
            <p class="wordmark-secondary">${escapeHtml(APP.wordmark.secondary)}</p>
            <p class="wordmark-tagline">${escapeHtml(APP.subtitle)}</p>
          </div>
        </div>
      </div>
    </header>

    ${configErr ? renderConfigError() : ''}

    <nav class="tabs">
      ${APP.tabs
        .map(
          (t) =>
            `<button class="tab ${state.tab === t ? 'active' : ''}" data-tab="${t}">${APP.tabLabels[t] ?? t}</button>`,
        )
        .join('')}
    </nav>

    <section class="panel">
      <h2>${escapeHtml(panelTitle())}</h2>
      ${configErr ? '<p class="empty">Configure o Supabase para usar o app.</p>' : panelContent()}
    </section>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      if (state.tab === 'mais') state.maisView = 'menu';
      state.error = null;
      state.formError = null;
      render();
    });
  });

  document.querySelectorAll('[data-mais-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.maisView = btn.dataset.maisView;
      state.formError = null;
      render();
    });
  });

  document.querySelector('[data-go-auth]')?.addEventListener('click', () => {
    state.tab = 'mais';
    state.maisView = 'auth';
    render();
  });

  document.querySelectorAll('[data-auth-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.authMode = btn.dataset.authMode;
      state.formError = null;
      render();
    });
  });

  document.getElementById('sign-out-btn')?.addEventListener('click', async () => {
    try {
      await signOut();
      state.session = null;
      state.profile = null;
      state.maisView = 'menu';
      showToast(APP.messages.signedOut);
      await loadData();
    } catch (err) {
      state.formError = err.message;
      render();
    }
  });

  document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.formError = null;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      if (state.authMode === 'login') {
        await signIn({ email, password });
      } else {
        const fullName = document.getElementById('full_name').value;
        const nickname = document.getElementById('nickname').value;
        await signUp({ email, password, fullName, nickname });
        showToast(APP.messages.checkEmail);
      }
      await refreshSession();
      state.maisView = 'menu';
      await loadData();
      showToast(APP.messages.saved);
    } catch (err) {
      state.formError = err.message;
      render();
    }
  });

  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.formError = null;

    try {
      const avatarInput = document.getElementById('avatar');
      if (avatarInput.files?.[0]) {
        state.profile = await uploadAvatar(state.profile.id, avatarInput.files[0]);
      }

      state.profile = await updateProfile(state.profile.id, {
        full_name: document.getElementById('profile_full_name').value,
        nickname: document.getElementById('profile_nickname').value,
        bairro: document.getElementById('profile_bairro').value,
        cidade: document.getElementById('profile_cidade').value,
        about: document.getElementById('profile_about').value,
      });

      await loadData();
      showToast(APP.messages.saved);
    } catch (err) {
      state.formError = err.message;
      render();
    }
  });

  document.getElementById('match-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('player1').value;
    const p2 = document.getElementById('player2').value;
    if (p1 === p2) {
      state.formError = 'Escolha jogadores diferentes.';
      render();
      return;
    }

    const result = document.querySelector('input[name="result"]:checked')?.value;
    const winnerIsP1 = result === 'p1';
    const winner_id = winnerIsP1 ? p1 : p2;
    const scoreInput = document.getElementById('score').value;

    const parsed = parseSetScore(scoreInput);
    if (!parsed.ok) {
      state.formError = parsed.error;
      render();
      return;
    }

    const validWinner = validateScoreForWinner(parsed, winnerIsP1);
    if (!validWinner.ok) {
      state.formError = validWinner.error;
      render();
      return;
    }

    state.formError = null;

    try {
      await addMatch({
        player1_id: p1,
        player2_id: p2,
        registered_by_id: state.profile.id,
        match_type: document.getElementById('match_type').value,
        winner_id,
        score_display: parsed.scoreDisplay,
        player1_games: parsed.player1Games,
        player2_games: parsed.player2Games,
        had_tiebreak: parsed.hadTiebreak,
        played_at: document.getElementById('played_at').value,
      });

      try {
        await insertTimelineEvent('match_registered', {
          match_type: document.getElementById('match_type').value,
          player1_id: p1,
          player2_id: p2,
        });
      } catch {
        /* timeline opcional */
      }

      state.tab = 'partidas';
      await loadData();
      showToast(APP.messages.saved);
    } catch (err) {
      state.formError = err.message;
      render();
    }
  });

  document.querySelectorAll('[data-confirm-match]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(APP.messages.confirmMatch)) return;
      try {
        await confirmMatch(btn.dataset.confirmMatch);
        await loadData();
        showToast(APP.messages.saved);
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
  });

  document.querySelectorAll('[data-reject-match]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(APP.messages.rejectMatch)) return;
      try {
        await rejectMatch(btn.dataset.rejectMatch);
        await loadData();
        showToast(APP.messages.saved);
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
  });

  document.querySelectorAll('[data-delete-match]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(APP.messages.confirmDeleteMatch)) return;
      try {
        await deleteMatch(btn.dataset.deleteMatch);
        await loadData();
        showToast(APP.messages.saved);
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
  });
}

async function refreshSession() {
  state.session = await getSession();
  if (state.session?.user) {
    const profiles = await fetchProfiles();
    state.profile = profiles.find((p) => p.id === state.session.user.id) ?? null;
  } else {
    state.profile = null;
  }
}

async function loadData() {
  await initSupabase();

  if (getConfigError()) {
    state.loading = false;
    render();
    return;
  }

  state.loading = true;
  state.error = null;
  state.formError = null;
  render();

  try {
    await refreshSession();
    const [profiles, matches] = await Promise.all([fetchProfiles(), fetchMatches()]);
    state.profiles = profiles;
    state.matches = matches;
  } catch (err) {
    state.error = err.message ?? APP.messages.error;
  } finally {
    state.loading = false;
    render();
  }
}

initSupabase().then(async () => {
  if (getConfigError()) return;
  await onAuthStateChange(async (session) => {
    state.session = session;
    if (session?.user) {
      try {
        const profiles = await fetchProfiles();
        state.profile = profiles.find((p) => p.id === session.user.id) ?? null;
      } catch {
        /* ignore */
      }
    } else {
      state.profile = null;
    }
  });
});

loadData();
