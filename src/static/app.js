document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginToggle = document.getElementById("login-toggle");
  const logoutButton = document.getElementById("logout-button");
  const authStatus = document.getElementById("auth-status");
  const loginPanel = document.getElementById("login-panel");
  const loginSubmit = document.getElementById("login-submit");
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");

  function getAuthToken() {
    return localStorage.getItem("teacherToken");
  }

  function getTeacherUsername() {
    return localStorage.getItem("teacherUsername");
  }

  function updateAuthUi() {
    const token = getAuthToken();
    const username = getTeacherUsername();

    if (token && username) {
      authStatus.textContent = `Logged in as ${username}`;
      logoutButton.classList.remove("hidden");
      loginToggle.classList.add("hidden");
      loginPanel.classList.add("hidden");
    } else {
      authStatus.textContent = "Not logged in";
      logoutButton.classList.add("hidden");
      loginToggle.classList.remove("hidden");
      loginPanel.classList.add("hidden");
    }
  }

  async function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
      showMessage("Please enter both username and password.", "error");
      return;
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("teacherToken", result.token);
        localStorage.setItem("teacherUsername", result.username);
        updateAuthUi();
        fetchActivities();
        showMessage("Logged in successfully.", "success");
      } else {
        showMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      showMessage("Login request failed. Please try again.", "error");
      console.error("Login error:", error);
    }
  }

  async function handleLogout() {
    const token = getAuthToken();
    if (!token) {
      localStorage.removeItem("teacherToken");
      localStorage.removeItem("teacherUsername");
      updateAuthUi();
      fetchActivities();
      return;
    }

    try {
      await fetch("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUsername");
    updateAuthUi();
    fetchActivities();
    showMessage("Logged out.", "info");
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      const isTeacher = Boolean(getAuthToken());

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
               <h5>Participants:</h5>
               <ul class="participants-list">
                 ${details.participants
                   .map((email) =>
                     isTeacher
                       ? `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                       : `<li><span class="participant-email">${email}</span></li>`
                   )
                   .join("")}
               </ul>
             </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (isTeacher) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    const token = getAuthToken();

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginToggle.addEventListener("click", () => {
    loginPanel.classList.toggle("hidden");
  });

  loginSubmit.addEventListener("click", handleLogin);
  logoutButton.addEventListener("click", handleLogout);

  updateAuthUi();
  fetchActivities();
});
