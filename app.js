const SUPABASE_URL = "https://ytpcfbefsrkwbdbasqxp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGNmYmVmc3Jrd2JkYmFzcXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU0MzksImV4cCI6MjA4OTk1MTQzOX0.d2VOldKy6-Ne8to3t8vY4cxSP4e9U6Jfy25XRXTDraI";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const footer = document.getElementById("footer");
const count = document.getElementById("count");
const clearBtn = document.getElementById("clear-completed");

let todos = [];

// Supabase REST API helper
async function supabase(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: options.prefer || "return=representation",
        },
        ...options,
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function loadTodos() {
    todos = await supabase("todos?order=created_at.asc");
    render();
}

async function addTodo(text) {
    const [newTodo] = await supabase("todos", {
        method: "POST",
        body: JSON.stringify({ text, completed: false }),
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

loadTodos();
