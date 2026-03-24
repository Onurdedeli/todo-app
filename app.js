const SUPABASE_URL = "https://ytpcfbefsrkwbdbasqxp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGNmYmVmc3Jrd2JkYmFzcXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU0MzksImV4cCI6MjA4OTk1MTQzOX0.d2VOldKy6-Ne8to3t8vY4cxSP4e9U6Jfy25XRXTDraI";

// ── Auth State ──
let accessToken = null;
let currentUser = null;

// ── DOM Elements ──
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleLink = document.getElementById("auth-toggle-link");
const authMessage = document.getElementById("auth-message");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const footer = document.getElementById("footer");
const count = document.getElementById("count");
const clearBtn = document.getElementById("clear-completed");

let isLoginMode = true;
let todos = [];

// ── Auth Functions ──
function showAuthMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
    authMessage.classList.remove("hidden");
}

function hideAuthMessage() {
    authMessage.classList.add("hidden");
}

async function authFetch(endpoint, body) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Bir hata oluştu");
    return data;
}

const REDIRECT_URL = "https://onurdedeli.github.io/todo-app/";

async function signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(REDIRECT_URL)}`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            password,
            data: {},
            gotrue_meta_security: {},
        }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Bir hata oluştu");
    showAuthMessage("Kayıt başarılı! E-postanı kontrol et ve onay bağlantısına tıkla.", "success");
}

async function signIn(email, password) {
    const data = await authFetch("token?grant_type=password", { email, password });
    accessToken = data.access_token;
    currentUser = data.user;
    localStorage.setItem("supabase_token", data.access_token);
    localStorage.setItem("supabase_refresh", data.refresh_token);
    showApp();
}

async function refreshSession() {
    const refreshToken = localStorage.getItem("supabase_refresh");
    if (!refreshToken) return false;
    try {
        const data = await authFetch("token?grant_type=refresh_token", {
            refresh_token: refreshToken,
        });
        accessToken = data.access_token;
        currentUser = data.user;
        localStorage.setItem("supabase_token", data.access_token);
        localStorage.setItem("supabase_refresh", data.refresh_token);
        return true;
    } catch {
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("supabase_refresh");
        return false;
    }
}

async function getUser(token) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) return null;
    return await res.json();
}

function logout() {
    accessToken = null;
    currentUser = null;
    localStorage.removeItem("supabase_token");
    localStorage.removeItem("supabase_refresh");
    todos = [];
    showAuth();
}

function showAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    hideAuthMessage();
}

function showApp() {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userEmailSpan.textContent = currentUser.email;
    loadTodos();
}

// ── Auth Event Listeners ──
authToggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    hideAuthMessage();
    if (isLoginMode) {
        authSubmitBtn.textContent = "Giriş Yap";
        authToggleText.textContent = "Hesabın yok mu?";
        authToggleLink.textContent = "Kayıt Ol";
    } else {
        authSubmitBtn.textContent = "Kayıt Ol";
        authToggleText.textContent = "Zaten hesabın var mı?";
        authToggleLink.textContent = "Giriş Yap";
    }
});

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthMessage();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    authSubmitBtn.disabled = true;
    try {
        if (isLoginMode) {
            await signIn(email, password);
        } else {
            await signUp(email, password);
            authSubmitBtn.textContent = "Onay E-postası Gönderildi";
            return;
        }
    } catch (err) {
        showAuthMessage(err.message, "error");
        authSubmitBtn.disabled = false;
    }
});

logoutBtn.addEventListener("click", logout);

// ── Handle email confirmation redirect ──
async function handleAuthRedirect() {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return false;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get("access_token");
    const refresh = params.get("refresh_token");

    if (token) {
        accessToken = token;
        localStorage.setItem("supabase_token", token);
        if (refresh) localStorage.setItem("supabase_refresh", refresh);
        currentUser = await getUser(token);
        if (currentUser) {
            window.history.replaceState(null, "", window.location.pathname);
            return true;
        }
    }
    return false;
}

// ── Supabase REST API (authenticated) ──
async function supabase(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Prefer: options.prefer || "return=representation",
        },
        ...options,
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// ── Todo CRUD ──
async function loadTodos() {
    todos = await supabase("todos?order=created_at.asc");
    render();
}

async function addTodo(text) {
    const [newTodo] = await supabase("todos", {
        method: "POST",
        body: JSON.stringify({ text, completed: false, user_id: currentUser.id }),
    });
    todos.push(newTodo);
    render();
}

async function toggleTodo(todo) {
    todo.completed = !todo.completed;
    render();
    await supabase(`todos?id=eq.${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: todo.completed }),
    });
}

async function deleteTodo(todo) {
    todos = todos.filter((t) => t.id !== todo.id);
    render();
    await supabase(`todos?id=eq.${todo.id}`, { method: "DELETE" });
}

async function clearCompleted() {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (completedIds.length === 0) return;
    todos = todos.filter((t) => !t.completed);
    render();
    await supabase(`todos?id=in.(${completedIds.join(",")})`, { method: "DELETE" });
}

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function render() {
    list.innerHTML = "";

    todos.forEach((todo) => {
        const li = document.createElement("li");
        if (todo.completed) li.classList.add("completed");

        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? "checked" : ""}>
            <span>${escapeHTML(todo.text)}</span>
            <button class="delete-btn">&times;</button>
        `;

        li.querySelector("input").addEventListener("change", () => toggleTodo(todo));
        li.querySelector(".delete-btn").addEventListener("click", () => deleteTodo(todo));

        list.appendChild(li);
    });

    const remaining = todos.filter((t) => !t.completed).length;
    footer.classList.toggle("hidden", todos.length === 0);
    count.textContent = `${remaining} görev kaldı`;
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addTodo(text);
});

clearBtn.addEventListener("click", clearCompleted);

// ── Init ──
(async () => {
    try {
        // 1. Check if redirected from email confirmation
        const fromRedirect = await handleAuthRedirect();
        if (fromRedirect) {
            showApp();
            return;
        }

        // 2. Try to restore session from localStorage
        const savedToken = localStorage.getItem("supabase_token");
        if (savedToken) {
            const user = await getUser(savedToken);
            if (user) {
                accessToken = savedToken;
                currentUser = user;
                showApp();
                return;
            }
            // Token expired, try refresh
            const refreshed = await refreshSession();
            if (refreshed) {
                showApp();
                return;
            }
        }
    } catch (err) {
        console.error("Init error:", err);
    }

    // 3. No session, show login
    showAuth();
})();
