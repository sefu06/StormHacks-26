const STORAGE_KEY = "carebot.caregiver.medicationSchedules";
const PATIENT_KEY = "carebot.caregiver.patientId";
const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const apiBaseUrl = (
  window.CAREBOT_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname || "localhost"}:8000`
).replace(/\/$/, "");

const form = document.querySelector("#medication-form");
const scheduleList = document.querySelector("#schedule-list");
const scheduleCount = document.querySelector("#schedule-count");
const attentionList = document.querySelector("#attention-list");
const attentionCount = document.querySelector("#attention-count");
const formMessage = document.querySelector("#form-message");
const connectionStatus = document.querySelector("#connection-status");

let schedules = [];
let patientId = localStorage.getItem(PATIENT_KEY);
let apiAvailable = false;
let unansweredEvents = [];

function readLocalSchedules() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function writeLocalSchedules(nextSchedules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSchedules));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch (error) {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function setConnectionStatus(message, state) {
  connectionStatus.textContent = message;
  connectionStatus.className = `connection-status ${state}`;
}

function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDays(days) {
  if (days.length === dayOrder.length) {
    return "Every day";
  }
  return days.join(", ");
}

function sortedSchedules(schedules) {
  return [...schedules].sort((left, right) => left.time.localeCompare(right.time));
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderSchedules() {
  const sorted = sortedSchedules(schedules);
  scheduleList.replaceChildren();
  scheduleCount.textContent = sorted.length;

  if (sorted.length === 0) {
    scheduleList.append(
      createTextElement("p", "empty-state", "No medications have been added yet.")
    );
    return;
  }

  sorted.forEach((schedule) => {
    const card = document.createElement("article");
    card.className = "schedule-card";

    const details = document.createElement("div");
    details.append(createTextElement("h3", "medication-title", schedule.name));
    if (schedule.dose) {
      details.append(createTextElement("p", "medication-detail", schedule.dose));
    }
    details.append(createTextElement("p", "medication-detail", `${formatDays(schedule.days)} · ${formatTime(schedule.time)}`));
    if (schedule.notes) {
      details.append(createTextElement("p", "medication-note", schedule.notes));
    }

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", async () => {
      removeButton.disabled = true;
      try {
        if (apiAvailable) {
          await apiRequest(`/api/medication-schedules/${encodeURIComponent(schedule.id)}`, {
            method: "DELETE",
          });
        } else {
          writeLocalSchedules(schedules.filter((item) => item.id !== schedule.id));
        }
        schedules = schedules.filter((item) => item.id !== schedule.id);
        writeLocalSchedules(schedules);
        renderSchedules();
        showMessage("Medication removed.");
      } catch (error) {
        removeButton.disabled = false;
        showMessage(`Could not remove medication: ${error.message}`);
      }
    });

    card.append(details, removeButton);
    scheduleList.append(card);
  });
}

function renderAttentionEvents() {
  attentionList.replaceChildren();
  attentionCount.textContent = unansweredEvents.length;
  if (unansweredEvents.length === 0) {
    attentionList.append(createTextElement("p", "empty-state", "No unanswered reminders."));
    return;
  }

  unansweredEvents.forEach((event) => {
    const schedule = schedules.find((item) => item.id === event.schedule_id);
    const card = document.createElement("article");
    card.className = "attention-card";
    const medicationName = schedule?.name || "Medication";
    const recordedAt = event.recorded_at
      ? new Date(event.recorded_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
      : "an hour ago";
    card.append(
      createTextElement("h3", "attention-title", medicationName),
      createTextElement("p", "attention-detail", "No touch confirmation received."),
      createTextElement("p", "attention-time", recordedAt),
    );
    attentionList.append(card);
  });
}

async function loadAttentionEvents() {
  if (!apiAvailable || !patientId) {
    unansweredEvents = [];
    renderAttentionEvents();
    return;
  }
  try {
    unansweredEvents = await apiRequest(
      `/api/medication-events?patient_id=${encodeURIComponent(patientId)}&status=unanswered`,
    );
    renderAttentionEvents();
  } catch (error) {
  }
}

function showMessage(message) {
  formMessage.textContent = message;
  window.setTimeout(() => {
    if (formMessage.textContent === message) {
      formMessage.textContent = "";
    }
  }, 3000);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const days = formData.getAll("days");

  if (days.length === 0) {
    showMessage("Select at least one day.");
    return;
  }

  const localSchedule = {
    id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name: String(formData.get("name")).trim(),
    dose: String(formData.get("dose")).trim(),
    time: String(formData.get("time")),
    days: dayOrder.filter((day) => days.includes(day)),
    notes: String(formData.get("notes")).trim(),
  };

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  let schedule = localSchedule;
  try {
    if (apiAvailable) {
      schedule = await apiRequest("/api/medication-schedules", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId, ...localSchedule }),
      });
    } else {
      writeLocalSchedules([...schedules, localSchedule]);
    }
    schedules = [...schedules, schedule];
    writeLocalSchedules(schedules);
  } catch (error) {
    apiAvailable = false;
    setConnectionStatus("API offline — local demo only", "offline");
    writeLocalSchedules([...schedules, localSchedule]);
    schedules = [...schedules, localSchedule];
    showMessage(`API unavailable; saved locally. (${error.message})`);
  }
  form.reset();
  form.querySelectorAll('input[name="days"]').forEach((checkbox) => {
    checkbox.checked = true;
  });
  renderSchedules();
  if (apiAvailable) {
    showMessage(`${schedule.name} was added for ${formatTime(schedule.time)}.`);
  } else if (!formMessage.textContent) {
    showMessage(`${schedule.name} was saved locally for ${formatTime(schedule.time)}.`);
  }
  submitButton.disabled = false;
});

async function initialize() {
  setConnectionStatus("Connecting…", "connecting");
  try {
    if (!patientId) {
      const patient = await apiRequest("/api/patients", {
        method: "POST",
        body: JSON.stringify({
          display_name: "Demo Patient",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      patientId = patient.id;
      localStorage.setItem(PATIENT_KEY, patientId);
    }
    schedules = await apiRequest(
      `/api/medication-schedules?patient_id=${encodeURIComponent(patientId)}`
    );
    writeLocalSchedules(schedules);
    apiAvailable = true;
    setConnectionStatus("Connected to API", "connected");
    await loadAttentionEvents();
  } catch (error) {
    apiAvailable = false;
    schedules = readLocalSchedules();
    setConnectionStatus("API offline — local demo only", "offline");
  }
  renderSchedules();
  renderAttentionEvents();
}

initialize();
window.setInterval(loadAttentionEvents, 15000);
