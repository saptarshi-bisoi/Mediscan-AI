const API_KEY = "AIzaSyAmsdn_IG6uQlsCiulylslBX9RTDxOp9zQ";
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

let currentImage = null;

// Initialize particles
function createParticles() {
  const particlesContainer = document.getElementById("particles");
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.left = Math.random() * 100 + "%";
    particle.style.top = Math.random() * 100 + "%";
    particle.style.animationDelay = Math.random() * 6 + "s";
    particle.style.animationDuration = Math.random() * 3 + 3 + "s";
    particlesContainer.appendChild(particle);
  }
}

// Notification system
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 4000);
}

function setActiveStep(stepNumber) {
  const steps = document.querySelectorAll(".step");
  steps.forEach((step, idx) => {
    if (idx === stepNumber - 1) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });
}

// File handling functions
function handleFile(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showNotification("Please upload a valid image file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const previewImage = document.getElementById("previewImage");
    const imagePreview = document.getElementById("imagePreview");
    const analysisSection = document.getElementById("analysisSection");

    previewImage.src = e.target.result;
    imagePreview.style.display = "block";
    analysisSection.style.display = "block";

    currentImage = e.target.result;
    showNotification("Image uploaded successfully!");
    setActiveStep(2);
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  document.getElementById("imagePreview").style.display = "none";
  document.getElementById("analysisSection").style.display = "none";
  document.getElementById("results").style.display = "none";
  document.getElementById("fileInput").value = "";
  currentImage = null;
  setActiveStep(1);
  showNotification("Image removed");
}

// Image analysis function
async function analyzeImage() {
  if (!currentImage) {
    showNotification("Please upload an image first", "error");
    return;
  }

  const analyzeBtn = document.getElementById("analyzeBtn");
  const loading = document.getElementById("loading");
  const results = document.getElementById("results");

  // Show loading state
  analyzeBtn.disabled = true;
  loading.style.display = "block";
  results.style.display = "none";

  try {
    // Convert image to base64 for API
    const base64Image = currentImage.split(",")[1];

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "You are an advanced AI medical imaging specialist. Analyze this brain scan image for potential brain tumors. Provide a detailed analysis including: 1) Whether a tumor is detected (YES/NO), 2) Confidence level (%), 3) If tumor detected: location, size estimation, type (if possible), 4) Detailed technical analysis of the image, 5) Recommendations for further medical evaluation. Be thorough and professional in your medical analysis. Format your response clearly with sections.",
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      displayResults(aiResponse);
      showNotification("Analysis completed successfully!");
      setActiveStep(3);
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("Error during analysis. Please try again.", "error");
    displayErrorResult();
  } finally {
    analyzeBtn.disabled = false;
    loading.style.display = "none";
  }
}

function displayResults(analysisText) {
  const results = document.getElementById("results");

  // Robust detection logic
  const lowerText = analysisText.toLowerCase();
  const strongNegativePhrases = [
    "no tumor detected",
    "tumor not detected",
    "no evidence of tumor",
    "tumor absent",
    "tumor-free",
    "detection: no",
    "tumor detection: no",
  ];
  const positiveIndicators = [
    "tumor detected",
    "tumor present",
    "tumor identified",
    "abnormality detected",
    "mass detected",
  ];

  let tumorDetected = false;
  if (strongNegativePhrases.some((phrase) => lowerText.includes(phrase))) {
    tumorDetected = false;
  } else if (positiveIndicators.some((phrase) => lowerText.includes(phrase))) {
    tumorDetected = true;
  } else if (
    lowerText.includes("tumor") &&
    (lowerText.includes("detected") ||
      lowerText.includes("present") ||
      lowerText.includes("yes"))
  ) {
    tumorDetected = true;
  }

  // Extract confidence if mentioned
  const confidenceMatch = analysisText.match(/(\d+)%/);
  const confidence = confidenceMatch ? confidenceMatch[1] : "N/A";

  const resultClass = tumorDetected ? "result-positive" : "result-negative";
  const resultIcon = tumorDetected ? "⚠" : "✅";
  const resultTitle = tumorDetected
    ? "Potential Tumor Detected"
    : "No Tumor Detected";

  results.innerHTML = `
          <div class="result-card ${resultClass}">
            <div class="result-title">
              ${resultIcon} ${resultTitle}
            </div>
            <div class="result-confidence">
              Confidence Level: ${confidence}%
            </div>
            <div class="result-details">
              <strong>AI Analysis:</strong><br>
              ${analysisText.replace(/\n/g, "<br>")}
            </div>
          </div>
        `;

  results.style.display = "block";
}

function displayErrorResult() {
  const results = document.getElementById("results");
  results.innerHTML = `
          <div class="result-card result-positive">
            <div class="result-title">
              ❌ Analysis Error
            </div>
            <div class="result-details">
              Unable to analyze the image at this time. Please ensure the image is clear and try again.
              If the problem persists, please check your internet connection or try a different image.
            </div>
          </div>
        `;
  results.style.display = "block";
}

// --- 3D Brain Model (Three.js) ---
function initBrain3D() {
  const container = document.getElementById("brain-3d-container");
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    container.offsetWidth / container.offsetHeight,
    0.1,
    1000
  );
  camera.position.z = 4.5;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0); // transparent
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);

  // Brain (sphere placeholder)
  const brainGeometry = new THREE.SphereGeometry(1.5, 64, 64);
  const brainMaterial = new THREE.MeshPhongMaterial({
    color: 0xccccff,
    shininess: 60,
    specular: 0x00f5ff,
    transparent: true,
    opacity: 0.95,
  });
  const brainMesh = new THREE.Mesh(brainGeometry, brainMaterial);
  scene.add(brainMesh);

  // Tumor highlight (smaller glowing sphere)
  const tumorGeometry = new THREE.SphereGeometry(0.35, 32, 32);
  const tumorMaterial = new THREE.MeshPhongMaterial({
    color: 0xff4b4b,
    emissive: 0xff4b4b,
    emissiveIntensity: 1.5,
    shininess: 100,
    transparent: true,
    opacity: 0.85,
  });
  const tumorMesh = new THREE.Mesh(tumorGeometry, tumorMaterial);
  // Position tumor somewhere on the brain
  tumorMesh.position.set(0.8, 0.7, 1.0);
  scene.add(tumorMesh);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x99ccff, 0.7);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0x00f5ff, 1.2);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);
  const tumorLight = new THREE.PointLight(0xff4b4b, 1.5, 10);
  tumorLight.position.copy(tumorMesh.position);
  scene.add(tumorLight);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    brainMesh.rotation.y += 0.008;
    brainMesh.rotation.x += 0.002;
    tumorMesh.rotation.y += 0.008;
    tumorMesh.rotation.x += 0.002;
    renderer.render(scene, camera);
  }
  animate();
}

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  createParticles();
  initBrain3D();

  // Get DOM elements
  const uploadArea = document.getElementById("uploadArea");
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");
  const removeBtn = document.getElementById("removeBtn");
  const analyzeBtn = document.getElementById("analyzeBtn");

  // Set initial step
  setActiveStep(1);

  // Click events
  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  uploadArea.addEventListener("click", (e) => {
    // Only trigger file input if clicked directly on upload area, not buttons
    if (
      e.target === uploadArea ||
      e.target.closest(".upload-icon, .upload-text, .upload-subtext")
    ) {
      fileInput.click();
    }
  });

  removeBtn.addEventListener("click", removeImage);
  analyzeBtn.addEventListener("click", analyzeImage);

  // File input change event
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  });

  // Drag and drop events
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleFile(file);
    }
  });

  // Show initial notification
  setTimeout(() => {
    showNotification("MediScan AI System Ready");
  }, 500);
});
