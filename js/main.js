// ── CONFIG ──
const SUPABASE_URL = 'https://ovrnlagwnrzgecvgawce.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cm5sYWd3bnJ6Z2Vjdmdhd2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjY0MDQsImV4cCI6MjA4ODg0MjQwNH0.3zzPo86V-QxkX0TPOyKzawzWNy9AEuQ1DtTT6EbJhdQ';
const ADMIN_PASS = 'Olamide24';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── UNREAD NOTIFICATIONS ──
let lastSeenMsgCount = parseInt(localStorage.getItem('last_seen_msgs') || '0');

function updateBadge(total) {
  const unread = Math.max(0, total - lastSeenMsgCount);
  const navBadge = document.getElementById('msg-badge');
  const tabBadge = document.getElementById('tab-badge');
  if (unread > 0) {
    navBadge.textContent = unread;
    navBadge.style.display = 'inline-flex';
    tabBadge.textContent = unread;
    tabBadge.style.display = 'inline';
  } else {
    navBadge.style.display = 'none';
    tabBadge.style.display = 'none';
  }
}

function markAllRead() {
  lastSeenMsgCount = parseInt(document.getElementById('admin-msgs').textContent) || lastSeenMsgCount;
  localStorage.setItem('last_seen_msgs', lastSeenMsgCount);
  updateBadge(lastSeenMsgCount);
}

// ── VISITOR TRACKING ──
const now = new Date();
const sessionStart = now.toLocaleString();
let sessions = parseInt(localStorage.getItem('sessions') || '0') + 1;
let firstVisit = localStorage.getItem('first_visit') || now.toLocaleString();
localStorage.setItem('sessions', sessions);
localStorage.setItem('first_visit', firstVisit);
localStorage.setItem('last_visit', now.toLocaleString());

async function trackVisit() {
  try {
    const { data } = await sb.from('visitors').select('count').eq('id', 1).single();
    const newCount = data ? data.count + 1 : 1;
    await sb.from('visitors').upsert({ id: 1, count: newCount });
    return newCount;
  } catch (e) {
    return parseInt(localStorage.getItem('visitors') || '0') + 1;
  }
}

// ── LIKES ──
let likes = JSON.parse(localStorage.getItem('likes') || '{}');

async function loadLikes() {
  try {
    const { data } = await sb.from('likes').select('*');
    if (data) data.forEach(row => { likes[row.project] = row.count; });
  } catch (e) {}
}

async function toggleLike(btn, project) {
  if (btn.classList.contains('liked')) {
    btn.classList.remove('liked');
    likes[project] = Math.max(0, (likes[project] || 1) - 1);
  } else {
    btn.classList.add('liked');
    likes[project] = (likes[project] || 0) + 1;
  }
  localStorage.setItem('likes', JSON.stringify(likes));
  try { await sb.from('likes').upsert({ project, count: likes[project] }); } catch(e) {}
}

// ── SUPPORT LIKE ──
let supportLiked = localStorage.getItem('support_liked') === 'true';

async function loadSupportLike() {
  try {
    const { data } = await sb.from('likes').select('count').eq('project', 'support').single();
    if (data) likes['support'] = data.count;
  } catch(e) {}
  if (supportLiked) {
    const btn = document.getElementById('support-like-btn');
    if (btn) { btn.style.borderColor = 'var(--blue)'; btn.style.color = 'var(--blue)'; }
    const heart = document.getElementById('support-heart');
    if (heart) heart.textContent = '❤';
  }
}

async function toggleSupportLike() {
  const btn = document.getElementById('support-like-btn');
  const heart = document.getElementById('support-heart');
  const msg = document.getElementById('support-msg');
  if (supportLiked) {
    supportLiked = false;
    likes['support'] = Math.max(0, (likes['support'] || 1) - 1);
    btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--muted)';
    heart.textContent = '♥'; heart.style.transform = 'scale(1)';
    msg.style.opacity = '0';
  } else {
    supportLiked = true;
    likes['support'] = (likes['support'] || 0) + 1;
    btn.style.borderColor = 'var(--blue)'; btn.style.color = 'var(--blue)';
    heart.textContent = '❤'; heart.style.transform = 'scale(1.4)';
    setTimeout(() => { heart.style.transform = 'scale(1)'; }, 300);
    msg.style.opacity = '1';
  }
  localStorage.setItem('support_liked', supportLiked);
  try { await sb.from('likes').upsert({ project: 'support', count: likes['support'] }); } catch(e) {}
}

// ── BLOG ──
let blogPosts = [];

async function loadBlog() {
  try {
    const { data } = await sb.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (data) blogPosts = data;
  } catch(e) {
    blogPosts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
  }
  renderBlog();
}

function renderBlog() {
  const grid = document.getElementById('blog-grid');
  if (blogPosts.length === 0) {
    grid.innerHTML = '<div class="blog-empty">// No posts yet. Check back soon — admin can add updates from the dashboard.</div>';
    return;
  }
  grid.innerHTML = blogPosts.map(p => `
    <div class="blog-card">
      ${p.image ? `<img src="${p.image}" style="width:100%;max-height:180px;object-fit:cover;border-radius:2px;margin-bottom:1rem;border:1px solid var(--border);"/>` : ''}
      <div class="blog-date">${p.date || new Date(p.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</div>
      <h3>${p.title}</h3>
      <p>${p.content}</p>
    </div>
  `).join('');
}

// ── CONTACT FORM ──
async function submitContact(e) {
  e.preventDefault();
  const name = document.getElementById('c-name').value;
  const email = document.getElementById('c-email').value;
  const msg = document.getElementById('c-msg').value;
  const el = document.getElementById('form-msg');
  try {
    await sb.from('contact_messages').insert({ name, email, message: msg });
  } catch(err) {
    const msgs = JSON.parse(localStorage.getItem('contact_msgs') || '[]');
    msgs.push({ name, email, msg, timestamp: new Date().toLocaleString() });
    localStorage.setItem('contact_msgs', JSON.stringify(msgs));
  }
  el.textContent = "// Message sent! I'll get back to you soon.";
  el.className = 'form-msg success';
  e.target.reset();
  setTimeout(() => { el.className = 'form-msg'; }, 4000);
}

// ── REVEAL ON SCROLL ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── MOBILE MENU ──
function toggleMobileMenu() {
  const links = document.querySelector('.nav-links');
  if (links.style.display === 'flex') {
    links.style.display = 'none';
  } else {
    links.style.cssText = 'display:flex;flex-direction:column;position:absolute;top:60px;left:0;right:0;background:rgba(3,7,15,0.98);padding:1.5rem;gap:1.5rem;border-bottom:1px solid var(--border);';
  }
}

// ── ADMIN ──
function openAdminLogin() {
  document.getElementById('admin-modal').classList.add('open');
  document.getElementById('modal-title').textContent = 'Admin Login';
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('admin-dashboard').style.display = 'none';
}
function closeAdmin() {
  document.getElementById('admin-modal').classList.remove('open');
  document.getElementById('admin-pass').value = '';
  document.getElementById('login-msg').className = 'form-msg';
}
function checkAdminPass() {
  const pass = document.getElementById('admin-pass').value;
  const msg = document.getElementById('login-msg');
  if (pass === ADMIN_PASS) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    document.getElementById('modal-title').textContent = 'Admin Dashboard';
    loadAdminData();
  } else {
    msg.textContent = '// Incorrect password.';
    msg.className = 'form-msg error';
  }
}
document.getElementById('admin-pass').addEventListener('keydown', e => { if (e.key === 'Enter') checkAdminPass(); });

function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((t, i) => t.classList.toggle('active', ['messages','blog','stats'][i] === tab));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
}

async function loadAdminData() {
  // Messages
  const msgContainer = document.getElementById('admin-messages');
  try {
    const { data } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) {
      msgContainer.innerHTML = '<p style="font-family:var(--mono);font-size:0.78rem;color:var(--muted);">// No messages yet.</p>';
      document.getElementById('admin-msgs').textContent = '0';
    } else {
      msgContainer.innerHTML = data.map(m => `
        <div class="msg-item">
          <strong>${m.name} — ${m.email} — ${new Date(m.created_at).toLocaleString()}</strong>
          <p>${m.message}</p>
        </div>
      `).join('');
      document.getElementById('admin-msgs').textContent = data.length;
      updateBadge(data.length);
      // auto mark as read when admin opens messages tab
      lastSeenMsgCount = data.length;
      localStorage.setItem('last_seen_msgs', lastSeenMsgCount);
      updateBadge(data.length);
    }
  } catch(e) {
    msgContainer.innerHTML = '<p style="font-family:var(--mono);font-size:0.78rem;color:var(--muted);">// Could not load messages.</p>';
  }

  // Visitors
  try {
    const { data } = await sb.from('visitors').select('count').eq('id', 1).single();
    document.getElementById('admin-visits').textContent = data ? data.count : '—';
  } catch(e) {
    document.getElementById('admin-visits').textContent = localStorage.getItem('visitors') || '—';
  }

  // Likes
  try {
    const { data } = await sb.from('likes').select('*');
    const total = data ? data.filter(r => r.project !== 'support').reduce((a, r) => a + r.count, 0) : 0;
    document.getElementById('admin-likes').textContent = total;
  } catch(e) {
    document.getElementById('admin-likes').textContent = '—';
  }

  // Stats
  document.getElementById('admin-posts-count').textContent = blogPosts.length;
  document.getElementById('visit-session').textContent = sessionStart;
  document.getElementById('visit-first').textContent = firstVisit;
  document.getElementById('visit-last').textContent = localStorage.getItem('last_visit') || '—';
  document.getElementById('visit-sessions').textContent = sessions + ' session(s)';

  // Blog posts list
  const postsContainer = document.getElementById('admin-posts');
  if (blogPosts.length === 0) {
    postsContainer.innerHTML = '<p style="font-family:var(--mono);font-size:0.78rem;color:var(--muted);">// No posts yet.</p>';
  } else {
    postsContainer.innerHTML = blogPosts.map(p => `
      <div class="msg-item">
        <strong>${p.date || new Date(p.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})} — ${p.title}</strong>
        <p>${p.content.substring(0, 80)}...</p>
        <button onclick="deletePost('${p.id}')" style="font-family:var(--mono);font-size:0.65rem;color:#ff4d6d;background:transparent;border:1px solid #ff4d6d33;padding:0.2rem 0.6rem;border-radius:2px;cursor:pointer;margin-top:0.5rem;">Delete</button>
      </div>
    `).join('');
  }
}

// ── BLOG IMAGE HELPERS ──
let blogImgData = null;
function previewBlogImg(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    blogImgData = e.target.result;
    document.getElementById('blog-img-thumb').src = blogImgData;
    document.getElementById('blog-img-preview').style.display = 'block';
    document.getElementById('blog-img-drop').textContent = '✅ Image ready';
    document.getElementById('blog-img-drop').style.borderColor = 'var(--blue)';
  };
  reader.readAsDataURL(file);
}
function clearBlogImg() {
  blogImgData = null;
  document.getElementById('blog-img-input').value = '';
  document.getElementById('blog-img-preview').style.display = 'none';
  document.getElementById('blog-img-drop').textContent = '📷 Click to upload image';
  document.getElementById('blog-img-drop').style.borderColor = '';
}
document.addEventListener('DOMContentLoaded', () => {
  const drop = document.getElementById('blog-img-drop');
  if (drop) {
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = 'var(--blue)'; });
    drop.addEventListener('dragleave', () => { drop.style.borderColor = ''; });
    drop.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const dt = new DataTransfer(); dt.items.add(file);
        document.getElementById('blog-img-input').files = dt.files;
        previewBlogImg(document.getElementById('blog-img-input'));
      }
    });
  }
});

async function addBlogPost() {
  const title = document.getElementById('blog-title').value.trim();
  const content = document.getElementById('blog-content').value.trim();
  const msgEl = document.getElementById('blog-msg');
  if (!title || !content) {
    msgEl.textContent = '// Please fill in both fields.';
    msgEl.className = 'form-msg error';
    return;
  }
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  try {
    await sb.from('blog_posts').insert({ title, content, image: blogImgData || null, date });
    msgEl.textContent = '// Post published!';
    msgEl.className = 'form-msg success';
    document.getElementById('blog-title').value = '';
    document.getElementById('blog-content').value = '';
    clearBlogImg();
    await loadBlog();
    loadAdminData();
    setTimeout(() => { msgEl.className = 'form-msg'; }, 3000);
  } catch(e) {
    msgEl.textContent = '// Error publishing. Check Supabase connection.';
    msgEl.className = 'form-msg error';
  }
}

async function deletePost(id) {
  try {
    await sb.from('blog_posts').delete().eq('id', id);
    await loadBlog();
    loadAdminData();
  } catch(e) {}
}

// ── CLOSE SIDEBAR ON OVERLAY CLICK ──
document.getElementById('admin-modal').addEventListener('click', function(e) {
  if (e.target === this) closeAdmin();
});

// ── INIT ──
(async () => {
  await loadLikes();
  await loadBlog();
  await loadSupportLike();
  const count = await trackVisit();
  localStorage.setItem('visitors', count);

  // Check for new messages every 30 seconds & show badge
  async function checkNewMessages() {
    try {
      const { data } = await sb.from('contact_messages').select('id', { count: 'exact', head: true });
      if (data !== null) {
        const total = data.length !== undefined ? data.length : 0;
        updateBadge(total);
      }
    } catch(e) {}
  }
  // Use count query properly
  async function pollMessages() {
    try {
      const { count } = await sb.from('contact_messages').select('*', { count: 'exact', head: true });
      if (count !== null) updateBadge(count);
    } catch(e) {}
  }
  pollMessages();
  setInterval(pollMessages, 30000);
})();
