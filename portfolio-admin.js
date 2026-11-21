const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "lebronjames";
const PROJECTS_KEY = "biza-art-portfolio-projects-v1";
const MEDIA_DB = "biza-art-portfolio-media-v1";
const MEDIA_STORE = "files";

const gallery = document.querySelector(".gallery");
const overlay = document.getElementById("admin-overlay");
const loginView = document.getElementById("admin-login");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("admin-login-form");
const projectForm = document.getElementById("project-form");
const projectList = document.getElementById("admin-project-list");
const projectTitle = document.getElementById("project-title");
const projectMedia = document.getElementById("project-media");
const menuIcon = document.getElementById("menu-icon");
const navbar = document.querySelector(".navbar");
let editingId = null;
let activeObjectUrls = [];
let draggedProjectId = null;

menuIcon.addEventListener("click", () => {
    const isOpen = navbar.classList.toggle("active");
    menuIcon.setAttribute("aria-expanded", String(isOpen));
    menuIcon.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    const menuGlyph = menuIcon.querySelector("i");
    menuGlyph.classList.toggle("bx-menu", !isOpen);
    menuGlyph.classList.toggle("bx-x", isOpen);
});

navbar.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    navbar.classList.remove("active");
    menuIcon.setAttribute("aria-expanded", "false");
    menuIcon.setAttribute("aria-label", "Open navigation menu");
    menuIcon.querySelector("i").classList.replace("bx-x", "bx-menu");
}));

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        navbar.classList.remove("active");
        menuIcon.setAttribute("aria-expanded", "false");
        menuIcon.setAttribute("aria-label", "Open navigation menu");
        menuIcon.querySelector("i").classList.replace("bx-x", "bx-menu");
    }
});

function titleFromPath(path) {
    const filename = path.split(/[\\/]/).pop().replace(/[?#].*$/, "");
    return filename.replace(/\.[^.]+$/, "").replace(/[()_-]+/g, " ").trim() || "Untitled project";
}

function readProjects() {
    const saved = localStorage.getItem(PROJECTS_KEY);
    if (saved) {
        try {
            const projects = JSON.parse(saved);
            if (Array.isArray(projects)) {
                const normalizedProjects = projects.map(project => {
                    if (typeof project.media !== "string"
                        || project.media.startsWith("upload:")
                        || project.media.includes("/")
                        || project.media.includes("\\")
                        || /^[a-z]+:/i.test(project.media)) {
                        return project;
                    }
                    return { ...project, media: `Assets/${project.media}` };
                });
                if (normalizedProjects.some((project, index) => project !== projects[index])) {
                    try {
                        localStorage.setItem(PROJECTS_KEY, JSON.stringify(normalizedProjects));
                    } catch (error) {
                        console.warn("Legacy portfolio media paths could not be migrated.", error);
                    }
                }
                return normalizedProjects;
            }
        } catch (error) {
            console.warn("Saved portfolio projects could not be read.", error);
        }
    }

    return [...gallery.querySelectorAll(".gallery-item")].map((item, index) => {
        const media = item.querySelector("img, video");
        const path = media?.getAttribute("src") || media?.querySelector("source")?.getAttribute("src") || "";
        return { id: `project-${index}`, title: titleFromPath(path), media: path };
    }).filter(project => project.media);
}

let projects = readProjects();

function saveProjects() {
    try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
        return true;
    } catch (error) {
        document.getElementById("project-message").textContent = "Could not save the project list in this browser.";
        return false;
    }
}

function openMediaDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(MEDIA_DB, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(MEDIA_STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function storeMediaFile(file) {
    const database = await openMediaDatabase();
    const key = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await new Promise((resolve, reject) => {
        const transaction = database.transaction(MEDIA_STORE, "readwrite");
        transaction.objectStore(MEDIA_STORE).put(file, key);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
    database.close();
    return key;
}

async function readMediaFile(key) {
    const database = await openMediaDatabase();
    const file = await new Promise((resolve, reject) => {
        const request = database.transaction(MEDIA_STORE, "readonly").objectStore(MEDIA_STORE).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    database.close();
    return file;
}

async function deleteMediaFile(key) {
    const database = await openMediaDatabase();
    await new Promise((resolve, reject) => {
        const transaction = database.transaction(MEDIA_STORE, "readwrite");
        transaction.objectStore(MEDIA_STORE).delete(key);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
}

function projectMediaName(project) {
    return project.mediaName || project.media;
}

function isVideo(project) {
    return /\.mp4$/i.test(projectMediaName(project));
}

async function renderGallery() {
    activeObjectUrls.forEach(URL.revokeObjectURL);
    activeObjectUrls = [];
    gallery.replaceChildren();
    for (const project of projects) {
        const item = document.createElement("div");
        item.className = "gallery-item";
        item.dataset.title = project.title;
        let mediaPath = project.media;
        if (mediaPath.startsWith("upload:")) {
            try {
                const file = await readMediaFile(mediaPath.slice("upload:".length));
                if (!file) continue;
                mediaPath = URL.createObjectURL(file);
                activeObjectUrls.push(mediaPath);
            } catch (error) {
                console.error("Could not load uploaded portfolio media.", error);
                continue;
            }
        }
        const media = document.createElement(isVideo(project) ? "video" : "img");
        media.src = mediaPath;
        if (media instanceof HTMLVideoElement) {
            media.autoplay = true;
            media.muted = true;
            media.loop = true;
            media.playsInline = true;
        } else {
            media.alt = project.title;
        }
        item.append(media);
        gallery.append(item);
    }
}

function renderProjectList() {
    projectList.replaceChildren();
    projects.forEach(project => {
        const row = document.createElement("li");
        row.dataset.projectId = project.id;
        const handle = document.createElement("button");
        handle.className = "admin-drag-handle";
        handle.type = "button";
        handle.draggable = true;
        handle.dataset.projectId = project.id;
        handle.textContent = "::";
        handle.title = "Drag to rearrange";
        handle.setAttribute("aria-label", `Drag ${project.title} to rearrange. Use the up and down arrow keys as an alternative.`);
        handle.addEventListener("dragstart", event => {
            draggedProjectId = project.id;
            row.classList.add("is-dragging");
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", project.id);
        });
        handle.addEventListener("keydown", event => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            moveProject(project.id, event.key === "ArrowUp" ? -1 : 1);
        });
        const name = document.createElement("span");
        name.className = "admin-project-name";
        name.textContent = project.title;
        const path = document.createElement("span");
        path.className = "admin-project-path";
        path.textContent = projectMediaName(project);
        name.append(path);
        const edit = document.createElement("button");
        edit.className = "admin-secondary";
        edit.type = "button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => beginEdit(project));
        const remove = document.createElement("button");
        remove.className = "admin-danger";
        remove.type = "button";
        remove.textContent = "Delete";
        remove.setAttribute("aria-label", `Delete ${project.title}`);
        remove.addEventListener("click", () => deleteProject(project));
        const actions = document.createElement("div");
        actions.className = "admin-project-actions";
        actions.append(edit, remove);
        row.append(handle, name, actions);
        projectList.append(row);
    });
}

function applyProjectOrder(nextProjects) {
    const previousProjects = projects;
    projects = nextProjects;
    if (!saveProjects()) {
        projects = previousProjects;
        renderProjectList();
        return;
    }
    renderProjectList();
    renderGallery();
}

function moveProject(projectId, offset) {
    const currentIndex = projects.findIndex(project => project.id === projectId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= projects.length) return;

    const nextProjects = [...projects];
    const [movedProject] = nextProjects.splice(currentIndex, 1);
    nextProjects.splice(nextIndex, 0, movedProject);
    applyProjectOrder(nextProjects);

    const movedHandle = [...projectList.querySelectorAll(".admin-drag-handle")]
        .find(handle => handle.dataset.projectId === movedProject.id);
    movedHandle?.focus();
}

projectList.addEventListener("dragover", event => {
    event.preventDefault();
    if (!draggedProjectId) return;
    const targetRow = event.target.closest("li");
    if (!targetRow || targetRow.dataset.projectId === draggedProjectId) return;

    projectList.querySelectorAll(".drag-over").forEach(row => row.classList.remove("drag-over"));
    targetRow.classList.add("drag-over");
});

projectList.addEventListener("drop", event => {
    event.preventDefault();
    const targetRow = event.target.closest("li");
    if (!targetRow || !draggedProjectId) return;

    const draggedRow = [...projectList.querySelectorAll("li")]
        .find(row => row.dataset.projectId === draggedProjectId);
    if (!draggedRow) return;

    const targetRect = targetRow.getBoundingClientRect();
    const placeAfter = event.clientY > targetRect.top + targetRect.height / 2;
    if (placeAfter) {
        targetRow.after(draggedRow);
    } else {
        targetRow.before(draggedRow);
    }

    const orderedIds = [...projectList.querySelectorAll("li")].map(row => row.dataset.projectId);
    const projectsById = new Map(projects.map(project => [project.id, project]));
    applyProjectOrder(orderedIds.map(id => projectsById.get(id)).filter(Boolean));
    draggedProjectId = null;
});

projectList.addEventListener("dragend", () => {
    draggedProjectId = null;
    projectList.querySelectorAll(".is-dragging, .drag-over").forEach(row => {
        row.classList.remove("is-dragging", "drag-over");
    });
});

function deleteProject(project) {
    const previousProjects = projects;
    projects = projects.filter(item => item.id !== project.id);
    if (!saveProjects()) {
        projects = previousProjects;
        renderProjectList();
        return;
    }

    if (editingId === project.id) resetProjectForm();
    renderProjectList();
    renderGallery();

    if (project.media.startsWith("upload:")) {
        deleteMediaFile(project.media.slice("upload:".length)).catch(error => {
            console.warn("Could not remove the deleted project's stored media.", error);
        });
    }
}

function beginEdit(project) {
    editingId = project.id;
    projectTitle.value = project.title;
    projectMedia.value = "";
    document.getElementById("project-file-name").textContent = `Current file: ${projectMediaName(project)}. Choose another file only if you want to replace it.`;
    document.getElementById("project-form-heading").textContent = "Edit project";
    document.getElementById("project-save").textContent = "Save changes";
    document.getElementById("project-cancel").hidden = false;
    document.getElementById("project-message").textContent = "";
    projectTitle.focus();
}

function resetProjectForm() {
    editingId = null;
    projectForm.reset();
    document.getElementById("project-form-heading").textContent = "Add a project";
    document.getElementById("project-save").textContent = "Add project";
    document.getElementById("project-cancel").hidden = true;
    document.getElementById("project-message").textContent = "";
    document.getElementById("project-file-name").textContent = "Choose a JPG, JFIF, GIF, or MP4 from this device. When editing, leave this empty to keep the current file.";
}

function showAdmin() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    if (sessionStorage.getItem("biza-art-admin") === "true") {
        loginView.hidden = true;
        dashboard.hidden = false;
        renderProjectList();
    } else {
        loginView.hidden = false;
        dashboard.hidden = true;
        document.getElementById("admin-username").focus();
    }
}

function hideAdmin() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
}

document.getElementById("admin-open").addEventListener("click", showAdmin);
document.getElementById("admin-close").addEventListener("click", hideAdmin);
overlay.addEventListener("click", event => {
    if (event.target === overlay) hideAdmin();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) hideAdmin();
});

loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        document.getElementById("login-message").textContent = "That username or password was not recognized.";
        return;
    }
    sessionStorage.setItem("biza-art-admin", "true");
    document.getElementById("login-message").textContent = "";
    loginView.hidden = true;
    dashboard.hidden = false;
    renderProjectList();
});

document.getElementById("admin-logout").addEventListener("click", () => {
    sessionStorage.removeItem("biza-art-admin");
    resetProjectForm();
    loginForm.reset();
    loginView.hidden = false;
    dashboard.hidden = true;
});

document.getElementById("project-new").addEventListener("click", () => {
    resetProjectForm();
    projectMedia.click();
});
document.getElementById("project-cancel").addEventListener("click", resetProjectForm);

projectMedia.addEventListener("change", () => {
    const file = projectMedia.files[0];
    if (!file) return;
    document.getElementById("project-file-name").textContent = `Selected file: ${file.name}`;
    if (!projectTitle.value.trim()) projectTitle.value = titleFromPath(file.name);
});

projectForm.addEventListener("submit", async event => {
    event.preventDefault();
    const title = projectTitle.value.trim();
    const file = projectMedia.files[0];
    const message = document.getElementById("project-message");
    message.textContent = "";

    if (file && !/\.(jpe?g|jfif|gif|mp4)$/i.test(file.name)) {
        message.textContent = "Choose a JPG, JFIF, GIF, or MP4 file.";
        return;
    }
    if (!editingId && !file) {
        message.textContent = "Choose a JPG, JFIF, GIF, or MP4 file to add this project.";
        return;
    }

    const existingProject = projects.find(project => project.id === editingId);
    let uploadedKey = null;
    let media = existingProject?.media;
    let mediaName = existingProject?.mediaName;
    if (file) {
        try {
            uploadedKey = await storeMediaFile(file);
            media = `upload:${uploadedKey}`;
            mediaName = file.name;
        } catch (error) {
            message.textContent = "Could not store this file in the browser. Check available storage and try again.";
            return;
        }
    }

    const nextProjects = editingId
        ? projects.map(project => project.id === editingId ? { ...project, title, media, mediaName } : project)
        : [...projects, { id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, media, mediaName }];
    const previousProjects = projects;
    const previousMedia = existingProject?.media;
    projects = nextProjects;
    if (!saveProjects()) {
        projects = previousProjects;
        if (uploadedKey) await deleteMediaFile(uploadedKey).catch(() => {});
        return;
    }
    if (uploadedKey && previousMedia?.startsWith("upload:")) {
        await deleteMediaFile(previousMedia.slice("upload:".length)).catch(() => {});
    }
    renderGallery();
    renderProjectList();
    resetProjectForm();
});

renderGallery();