import './styles/main.css';
import { APP } from './config/app.js';
import { RULES } from './config/rules.js';
import { computeRanking, getPlayerName, getCafeComLeiteZone } from './lib/ranking.js';
import { computeAllPlayerAchievements, getPlayerAchievements, applyDevAchievementPreview, ACHIEVEMENTS } from './lib/achievements.js';
import { getAchievementIconHtml } from './lib/achievementIcons.js';
import { getProfileLocation } from './lib/profiles.js';
import { parseSetScoreFromGames } from './lib/scoreParser.js';
import { getSession, signUp, signIn, signOut, onAuthStateChange, completeAuthFromUrl } from './lib/auth.js';
import { formatAuthError } from './lib/authErrors.js';
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
  achievementMap: new Map(),
  viewProfileId: null,
  viewProfileFromRanking: false,
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

function achievementTitle(a) {
  return a.count > 1 ? `${a.title} (${a.count}×) — ${a.description}` : `${a.title} — ${a.description}`;
}

function renderAchievementIconMarkup(a, className) {
  const count =
    a.count > 1 ? `<span class="achievement-count" aria-label="${a.count} vezes">${a.count}</span>` : '';
  return `<span class="${className}" title="${escapeHtml(achievementTitle(a))}">${getAchievementIconHtml(a)}${count}</span>`;
}

function renderAchievementBadges(playerId, { compact = true } = {}) {
  const list = getPlayerAchievements(state.achievementMap, playerId);
  if (list.length === 0) return '';

  const shown = compact ? list.slice(0, 3) : list;
  const extra = compact && list.length > 3 ? `<span class="achievement-more">+${list.length - 3}</span>` : '';

  return `<span class="achievement-badges">${shown
    .map((a) => renderAchievementIconMarkup(a, 'achievement-badge'))
    .join('')}${extra}</span>`;
}

function renderRankingAchievements(playerId) {
  const list = getPlayerAchievements(state.achievementMap, playerId);
  if (list.length === 0) return '';

  const icons = list.map((a) => renderAchievementIconMarkup(a, 'player-achievement-icon')).join('');
  const summary = list
    .map((a) => (a.count > 1 ? `${a.title} (${a.count}×)` : a.title))
    .join(', ');

  return `<div class="player-achievements" aria-label="Conquistas: ${escapeHtml(summary)}" title="${escapeHtml(summary)}">
    <span class="player-achievement-icons">${icons}</span>
  </div>`;
}

function renderAchievementList(playerId) {
  const list = getPlayerAchievements(state.achievementMap, playerId);
  if (list.length === 0) {
    return '<p class="match-meta">Nenhuma conquista ainda.</p>';
  }

  return `<ul class="achievement-list">${list
    .map(
      (a) => `
      <li class="achievement-item">
        <span class="achievement-item-icon">${renderAchievementIconMarkup(a, 'achievement-item-badge')}</span>
        <div>
          <strong>${escapeHtml(a.title)}${a.count > 1 ? ` ×${a.count}` : ''}</strong>
          <p class="match-meta">${escapeHtml(a.description)}</p>
        </div>
      </li>
    `,
    )
    .join('')}</ul>`;
}

function openPublicProfile(playerId, fromRanking = false) {
  state.tab = 'mais';
  state.maisView = 'jogador';
  state.viewProfileId = playerId;
  state.viewProfileFromRanking = fromRanking;
  state.formError = null;
  render();
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
  const cafeSlots = RULES.cafeComLeite.slots;

  const cols = APP.rankingColumns
    .map((col) => `<th${col.width ? ` style="width:${col.width}"` : ''}>${col.label}</th>`)
    .join('');

  const colCount = APP.rankingColumns.length;

  const rows = ranked
    .map((p) => {
      let cafeFooter = '';
      const inCafeZone = cafeZone.has(p.position);
      if (inCafeZone) {
        const idx = p.position === ranked.length ? 1 : 0;
        const slot = cafeSlots[idx];
        cafeFooter = `<tr class="cafe-row-footer cafe-row-footer--${slot.variant}">
          <td colspan="${colCount}" class="cafe-footer-bar">
            <span class="cafe-footer-inner">
              <span class="cafe-footer-icon" aria-hidden="true">${slot.icon}</span>
              <span class="cafe-footer-label">${escapeHtml(slot.text)}</span>
            </span>
          </td>
        </tr>`;
      }

      const cells = APP.rankingColumns
        .map((col) => {
          switch (col.key) {
            case 'position':
              return `<td>${medalForPosition(p.position)}</td>`;
            case 'nickname': {
              const locationLine =
                p.location && p.location !== '—'
                  ? `<span class="player-location">${escapeHtml(p.location)}</span>`
                  : '';
              const achievementsLine = renderRankingAchievements(p.id);
              return `<td class="player-cell">
                <button type="button" class="player-link player-link-stack" data-view-profile="${p.id}">
                  <strong class="player-name">${escapeHtml(p.nickname)}</strong>
                  ${locationLine}
                </button>
                ${achievementsLine}
              </td>`;
            }
            case 'location':
              return '';
            case 'winRate':
              return `<td>${p.winRate}%</td>`;
            default:
              return `<td>${p[col.key] ?? '—'}</td>`;
          }
        })
        .join('');
      const rowClass = inCafeZone ? ' ranking-row--with-cafe' : '';
      return `<tr class="ranking-row${rowClass}">${cells}</tr>${cafeFooter}`;
    })
    .join('');

  return `
    <p class="match-meta" style="margin-bottom:1rem">
      ${escapeHtml(RULES.matchTypes.ranked.label)}: <strong>${RULES.points.rankedWin} pts</strong> · ${escapeHtml(RULES.matchTypes.friendly.label)}: <strong>${RULES.points.friendlyWin} pt</strong> · Só entram partidas confirmadas
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
    .map(([value, meta]) => `<option value="${value}">${escapeHtml(meta.label)}</option>`)
    .join('');

  const typeHint = `<strong>${escapeHtml(RULES.matchTypes.ranked.label)}:</strong> ${escapeHtml(RULES.matchTypes.ranked.description)} · <strong>${escapeHtml(RULES.matchTypes.friendly.label)}:</strong> ${escapeHtml(RULES.matchTypes.friendly.description)}`;

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
        <p class="match-type-hint" id="match-type-hint">${typeHint}</p>
      </div>
      <div class="form-row">
        <label>Placar do set</label>
        <div class="score-boxes">
          <div class="score-box">
            <span class="score-box-label">Jogador 1</span>
            <input id="score_p1" type="number" min="0" max="7" inputmode="numeric" placeholder="6" required />
          </div>
          <span class="score-box-sep" aria-hidden="true">–</span>
          <div class="score-box">
            <span class="score-box-label">Jogador 2</span>
            <input id="score_p2" type="number" min="0" max="7" inputmode="numeric" placeholder="4" required />
          </div>
        </div>
        <p class="match-meta">1 set por partida. Quem tiver mais games vence. Ex: 6 e 4, ou 7 e 6.</p>
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

  const sections = [
    { id: 'conta', label: 'Conta' },
    { id: 'ranking', label: 'Ranking' },
  ];

  return `
    ${loggedIn ? `<p class="match-meta mais-greeting">Olá, <strong>${escapeHtml(name)}</strong></p>` : ''}
    ${sections
      .map((section) => {
        const items = APP.maisMenu.filter((item) => {
          if (item.section !== section.id) return false;
          if (item.hideWhenLoggedIn && loggedIn) return false;
          if (item.requiresLogin && !loggedIn) return false;
          if (item.isLogout && !loggedIn) return false;
          return true;
        });
        if (items.length === 0) return '';

        return `
          <div class="mais-section">
            <h3 class="mais-section-title">${section.label}</h3>
            <div class="mais-grid">
              ${items
                .map((item) => {
                  if (item.isLogout) {
                    return `
                      <button type="button" class="mais-card mais-card-danger" id="sign-out-btn">
                        <span class="mais-card-icon">${item.icon}</span>
                        <span class="mais-card-body">
                          <span class="mais-card-title">${item.title}</span>
                          <span class="mais-card-desc">${item.desc}</span>
                        </span>
                      </button>
                    `;
                  }
                  const title =
                    item.view === 'perfil' && !loggedIn ? 'Entrar para editar perfil' : item.title;
                  return `
                    <button type="button" class="mais-card mais-link" data-mais-view="${item.view}">
                      <span class="mais-card-icon">${item.icon}</span>
                      <span class="mais-card-body">
                        <span class="mais-card-title">${escapeHtml(title)}</span>
                        <span class="mais-card-desc">${escapeHtml(item.desc)}</span>
                      </span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      })
      .join('')}
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
    <div class="profile-achievements-block">
      <h3 class="profile-subtitle">Conquistas</h3>
      ${renderAchievementList(p.id)}
    </div>
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
        <li><strong>${escapeHtml(RULES.matchTypes.ranked.label)}:</strong> ${RULES.points.rankedWin} pontos por vitória</li>
        <li><strong>${escapeHtml(RULES.matchTypes.friendly.label)}:</strong> ${RULES.points.friendlyWin} ponto por vitória</li>
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
      <p class="match-meta">Veja quem desbloqueou cada conquista em <strong>Mais → Conquistas</strong>.</p>
    </div>
  `;
}

function renderConquistas() {
  return `
    <div class="conquistas-content">
      <p class="match-meta" style="margin-bottom:1rem">Conquistas são públicas — calculadas automaticamente a partir das partidas confirmadas.</p>
      <div class="conquistas-grid">
        ${ACHIEVEMENTS.map((a) => {
          const holders = state.profiles.filter((p) =>
            getPlayerAchievements(state.achievementMap, p.id).some((x) => x.id === a.id),
          );
          const holderList =
            holders.length > 0
              ? holders
                  .map(
                    (p) =>
                      `<button type="button" class="holder-link" data-view-profile="${p.id}">${escapeHtml(p.nickname)}</button>`,
                  )
                  .join(', ')
              : '<span class="draw-label">Ninguém ainda</span>';

          return `
            <article class="conquista-card">
              <div class="conquista-card-head">
                <span class="conquista-icon">${getAchievementIconHtml(a)}</span>
                <h4>${escapeHtml(a.title)}</h4>
              </div>
              <p class="match-meta">${escapeHtml(a.description)}</p>
              <p class="conquista-holders"><strong>Jogadores:</strong> ${holderList}</p>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderPublicProfile() {
  const profile = state.profiles.find((p) => p.id === state.viewProfileId);
  if (!profile) {
    return `<p class="empty">Jogador não encontrado.</p>`;
  }

  const stats = computeRanking(state.profiles, state.matches).find((r) => r.id === profile.id);
  const avatar = profile.avatar_url
    ? `<img class="profile-avatar" src="${escapeHtml(profile.avatar_url)}" alt="" width="96" height="96" />`
    : `<div class="profile-avatar profile-avatar-placeholder">${escapeHtml(profile.nickname?.[0]?.toUpperCase() ?? '?')}</div>`;

  const about = profile.about
    ? `<p class="profile-about">${escapeHtml(profile.about)}</p>`
    : '<p class="match-meta">Sem descrição.</p>';

  const recentMatches = state.matches
    .filter(
      (m) =>
        m.status === 'confirmed' &&
        (m.player1_id === profile.id || m.player2_id === profile.id),
    )
    .slice(0, 5);

  const matchHistory =
    recentMatches.length === 0
      ? '<p class="match-meta">Nenhuma partida confirmada ainda.</p>'
      : `<ul class="match-list compact-match-list">${recentMatches
          .map((m) => {
            const won = m.winner_id === profile.id;
            const opponentId = m.player1_id === profile.id ? m.player2_id : m.player1_id;
            const opponent = getPlayerName(state.profiles, opponentId);
            return `
              <li class="match-item">
                <span class="${won ? 'winner' : 'draw-label'}">${won ? 'V' : 'D'}</span>
                vs ${escapeHtml(opponent)}
                <span class="match-score">${escapeHtml(m.score_display)}</span>
                <span class="match-meta">${formatDate(m.played_at)}</span>
              </li>
            `;
          })
          .join('')}</ul>`;

  const isOwn = state.profile?.id === profile.id;

  return `
    <div class="public-profile">
      <div class="profile-header public-profile-header">
        ${avatar}
        <div>
          <h3 class="public-profile-name">${escapeHtml(profile.nickname)}</h3>
          <p class="match-meta">${escapeHtml(getProfileLocation(profile))}</p>
          ${renderAchievementBadges(profile.id, { compact: false })}
        </div>
      </div>
      ${about}
      ${
        stats
          ? `<div class="profile-stats">
              <span><strong>${stats.points}</strong> pts</span>
              <span><strong>${stats.wins}</strong> V</span>
              <span><strong>${stats.losses}</strong> D</span>
              <span><strong>${stats.winRate}%</strong> aproveit.</span>
            </div>`
          : ''
      }
      <div class="profile-achievements-block">
        <h3 class="profile-subtitle">Conquistas</h3>
        ${renderAchievementList(profile.id)}
      </div>
      <div class="profile-achievements-block">
        <h3 class="profile-subtitle">Últimas partidas</h3>
        ${matchHistory}
      </div>
      ${
        isOwn
          ? `<button type="button" class="btn btn-primary" data-mais-view="perfil">Editar meu perfil</button>`
          : ''
      }
    </div>
  `;
}

function renderMais() {
  switch (state.maisView) {
    case 'perfil':
      return renderBackLink('menu') + renderProfileForm();
    case 'jogador':
      return renderBackLink(state.viewProfileFromRanking ? 'ranking' : 'menu') + renderPublicProfile();
    case 'auth':
      return renderBackLink('menu') + renderAuthForm();
    case 'regras':
      return renderBackLink('menu') + renderRegras();
    case 'conquistas':
      return renderBackLink('menu') + renderConquistas();
    default:
      return renderMaisMenu();
  }
}

function renderBackLink(target = 'menu') {
  const label = target === 'ranking' ? '← Voltar ao ranking' : '← Voltar';
  return `<button class="btn btn-back" data-back-target="${target}" type="button">${label}</button>`;
}

function panelTitle() {
  if (state.tab === 'mais') {
    if (state.maisView === 'jogador') {
      const p = state.profiles.find((x) => x.id === state.viewProfileId);
      return p ? p.nickname : APP.maisViews.jogador;
    }
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
      if (state.maisView !== 'jogador') state.viewProfileId = null;
      state.formError = null;
      render();
    });
  });

  document.querySelectorAll('[data-back-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.backTarget;
      if (target === 'ranking') {
        state.tab = 'ranking';
        state.maisView = 'menu';
        state.viewProfileId = null;
        state.viewProfileFromRanking = false;
      } else {
        state.maisView = 'menu';
        state.viewProfileId = null;
        state.viewProfileFromRanking = false;
      }
      render();
    });
  });

  document.querySelectorAll('[data-view-profile]').forEach((btn) => {
    btn.addEventListener('click', () =>
      openPublicProfile(btn.dataset.viewProfile, btn.classList.contains('player-link')),
    );
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
        showToast(APP.messages.saved);
      } else {
        const fullName = document.getElementById('full_name').value;
        const nickname = document.getElementById('nickname').value;
        const result = await signUp({ email, password, fullName, nickname });
        if (result.session) {
          showToast(APP.messages.saved);
        } else {
          showToast(APP.messages.checkEmail);
        }
      }
      await refreshSession();
      state.maisView = 'menu';
      await loadData();
    } catch (err) {
      state.formError = formatAuthError(err);
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

    const scoreP1 = document.getElementById('score_p1').value;
    const scoreP2 = document.getElementById('score_p2').value;

    const parsed = parseSetScoreFromGames(scoreP1, scoreP2);
    if (!parsed.ok) {
      state.formError = parsed.error;
      render();
      return;
    }

    const winnerIsP1 = parsed.player1Games > parsed.player2Games;
    const winner_id = winnerIsP1 ? p1 : p2;

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
    try {
      const authResult = await completeAuthFromUrl();
      if (authResult.handled) {
        if (authResult.session) {
          showToast(APP.messages.emailConfirmed);
        } else {
          state.error = APP.messages.emailConfirmFailed;
        }
      }
    } catch (authErr) {
      state.error = authErr.message ?? APP.messages.emailConfirmFailed;
    }

    await refreshSession();
    const [profiles, matches] = await Promise.all([fetchProfiles(), fetchMatches()]);
    state.profiles = profiles;
    state.matches = matches;
    state.achievementMap = applyDevAchievementPreview(
      computeAllPlayerAchievements(profiles, matches),
      profiles,
    );
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
