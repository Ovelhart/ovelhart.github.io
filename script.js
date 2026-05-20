const GITHUB_USER = "Ovelhart";
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}`;

async function fetchRaw(repoName, branch, file) {
  try {
    const url = `${RAW_BASE}/${repoName}/${branch}/${file}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

function formatDate(isoString) {
  if (!isoString) return "N/A";
  const d = new Date(isoString);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function createCard({ repoMeta, projectJson, iconUrl }) {
  const div = document.createElement("div");
  div.className = "world";
  div.onclick = () => window.open(repoMeta.html_url, "_blank");

  const img = document.createElement("img");
  img.src = iconUrl;
  img.alt = "icon";
  img.onerror = () => { img.src = "img/logo-github.png"; };

  const info = document.createElement("div");
  info.className = "w-info";

  const displayName = projectJson?.name || repoMeta.name;
  const displayDesc = projectJson?.description || repoMeta.description || "No description";
  const displayDate = projectJson?.date || formatDate(repoMeta.created_at);

  const h3 = document.createElement("h3");
  h3.textContent = displayName;

  const h4slug = document.createElement("h4");
  h4slug.textContent = `${repoMeta.name} (${displayDate})`;

  const h4desc = document.createElement("h4");
  h4desc.textContent = displayDesc;

  info.appendChild(h3);
  info.appendChild(h4slug);
  info.appendChild(h4desc);

  div.appendChild(img);
  div.appendChild(info);
  return div;
}

async function loadRepos() {
  const content = document.querySelector(".content");
  if (!content) return;

  content.innerHTML = `<p style="color:#aaa;padding:1rem">Loading repositories...</p>`;

  try {
    const apiRes = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=created&direction=desc`
    );
    if (!apiRes.ok) throw new Error("Failed to fetch GitHub repositories.");
    const allRepos = await apiRes.json();

    const results = await Promise.all(
      allRepos.map(async (repoMeta) => {
        const branch = repoMeta.default_branch;

        const jsonRes = await fetchRaw(repoMeta.name, branch, "repos.json");
        if (!jsonRes) return null;

        const projectJson = await jsonRes.json().catch(() => null);
        if (!projectJson) return null;

        const iconUrl = `${RAW_BASE}/${repoMeta.name}/${branch}/logo-github.png`;

        return { repoMeta, projectJson, iconUrl };
      })
    );

    const valid = results.filter(Boolean);
    content.innerHTML = "";

    if (valid.length === 0) {
      content.innerHTML = `<p style="color:#aaa;padding:1rem">No repository with repos.json found.</p>`;
      return;
    }

    valid.sort((a, b) => new Date(b.repoMeta.created_at) - new Date(a.repoMeta.created_at));
    valid.forEach(({ repoMeta, projectJson, iconUrl }) => {
      content.appendChild(createCard({ repoMeta, projectJson, iconUrl }));
    });

    const searchInput = document.querySelector(".barra-cima input");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();
        document.querySelectorAll(".world").forEach((card) => {
          card.style.display = card.innerText.toLowerCase().includes(q) ? "" : "none";
        });
      });
    }

  } catch (err) {
    content.innerHTML = `<p style="color:red;padding:1rem">Error: ${err.message}</p>`;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", loadRepos);
