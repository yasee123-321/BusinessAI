const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");

let chatHistory = JSON.parse(
  localStorage.getItem("businessAI_chat") || "[]"
);

// =========================
// GENERAL
// =========================

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth"
  });
}

// =========================
// CHAT MESSAGE
// =========================

function addMessage(role, text, save = true) {
  const message = document.createElement("div");

  message.className =
    role === "user"
      ? "message user"
      : "message ai";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const textElement = document.createElement("div");
  textElement.className = "message-text";
  textElement.textContent = text;

  bubble.appendChild(textElement);

  // أزرار رد الذكاء الاصطناعي
  if (role === "ai") {
    const actions = document.createElement("div");

    actions.className = "message-actions";

    actions.innerHTML = `
      <button type="button" onclick="readAloud(this)">
        🔊 قراءة
      </button>

      <button type="button" onclick="copyMessage(this)">
        📋 نسخ
      </button>
    `;

    bubble.appendChild(actions);
  }

  message.appendChild(bubble);
  chatBox.appendChild(message);

  chatBox.scrollTop = chatBox.scrollHeight;

  if (save) {
    chatHistory.push({
      role: role,
      content: text
    });

    localStorage.setItem(
      "businessAI_chat",
      JSON.stringify(chatHistory)
    );
  }
}

// =========================
// TYPING INDICATOR
// =========================

function showTyping() {
  removeTyping();

  const message = document.createElement("div");

  message.className = "message ai";
  message.id = "typingMessage";

  message.innerHTML = `
    <div class="bubble">
      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  chatBox.appendChild(message);

  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById(
    "typingMessage"
  );

  if (typing) {
    typing.remove();
  }
}

// =========================
// SEND MESSAGE
// =========================

async function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  addMessage("user", text);

  messageInput.value = "";

  showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: chatHistory
      })
    });

    const data = await response.json();

    removeTyping();

    if (!response.ok) {
      throw new Error(
        data.error || "حدث خطأ في الخادم."
      );
    }

    addMessage(
      "ai",
      data.answer ||
        "لم تصل إجابة من الذكاء الاصطناعي."
    );

  } catch (error) {
    removeTyping();

    addMessage(
      "ai",
      "❌ حدث خطأ: " + error.message
    );
  }
}

// =========================
// ENTER
// =========================

function handleEnter(event) {
  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {
    event.preventDefault();

    sendMessage();
  }
}

// =========================
// READ ALOUD
// =========================

function readAloud(button) {
  const bubble =
    button.closest(".bubble");

  if (!bubble) return;

  const textElement =
    bubble.querySelector(".message-text");

  if (!textElement) return;

  const text =
    textElement.textContent.trim();

  if (!text) return;

  speechSynthesis.cancel();

  const speech =
    new SpeechSynthesisUtterance(text);

  speech.lang = "ar-SA";
  speech.rate = 0.95;
  speech.pitch = 1;

  button.textContent = "🔊 يقرأ...";

  speech.onend = () => {
    button.textContent = "🔊 قراءة";
  };

  speech.onerror = () => {
    button.textContent = "🔊 قراءة";
  };

  speechSynthesis.speak(speech);
}

// =========================
// COPY
// =========================

async function copyMessage(button) {
  const bubble =
    button.closest(".bubble");

  if (!bubble) return;

  const textElement =
    bubble.querySelector(".message-text");

  if (!textElement) return;

  const text =
    textElement.textContent.trim();

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);

    button.textContent = "✅ تم النسخ";

    setTimeout(() => {
      button.textContent = "📋 نسخ";
    }, 1500);

  } catch (error) {

    // طريقة احتياطية للنسخ
    try {
      const textarea =
        document.createElement("textarea");

      textarea.value = text;

      document.body.appendChild(textarea);

      textarea.select();

      document.execCommand("copy");

      textarea.remove();

      button.textContent =
        "✅ تم النسخ";

      setTimeout(() => {
        button.textContent = "📋 نسخ";
      }, 1500);

    } catch {
      button.textContent =
        "❌ فشل النسخ";

      setTimeout(() => {
        button.textContent = "📋 نسخ";
      }, 1500);
    }
  }
}

// =========================
// CLEAR CHAT
// =========================

function clearChat() {
  const confirmed = confirm(
    "هل تريد مسح المحادثة بالكامل؟"
  );

  if (!confirmed) return;

  chatHistory = [];

  localStorage.removeItem(
    "businessAI_chat"
  );

  chatBox.innerHTML = `
    <div class="message ai">
      <div class="bubble">

        <div class="message-text">
          أهلاً بك 👋
          أنا BusinessAI.
          كيف يمكنني مساعدتك اليوم؟
        </div>

        <div class="message-actions">

          <button
            type="button"
            onclick="readAloud(this)"
          >
            🔊 قراءة
          </button>

          <button
            type="button"
            onclick="copyMessage(this)"
          >
            📋 نسخ
          </button>

        </div>

      </div>
    </div>
  `;
}

// =========================
// FILE ANALYSIS
// =========================

async function analyzeFile(
  file,
  resultId
) {
  if (!file) return;

  const result =
    document.getElementById(resultId);

  result.textContent =
    "⏳ جاري رفع الملف وتحليله...";

  result.classList.add("show");

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  try {
    const response =
      await fetch(
        "/api/analyze",
        {
          method: "POST",
          body: formData
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "حدث خطأ أثناء التحليل."
      );
    }

    result.textContent =
      data.answer ||
      "لم يتم العثور على نتيجة.";

  } catch (error) {

    result.textContent =
      "❌ " + error.message;
  }
}

async function analyzeHomework() {
  const input =
    document.getElementById(
      "homeworkFile"
    );

  const file =
    input.files[0];

  if (!file) {
    alert(
      "اختر ملفًا أولًا."
    );

    return;
  }

  await analyzeFile(
    file,
    "homeworkResult"
  );
}

async function analyzeChatFile(input) {
  const file =
    input.files[0];

  if (!file) return;

  addMessage(
    "user",
    `📎 تم رفع الملف: ${file.name}`
  );

  showTyping();

  try {

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await fetch(
        "/api/analyze",
        {
          method: "POST",
          body: formData
        }
      );

    const data =
      await response.json();

    removeTyping();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "حدث خطأ أثناء التحليل."
      );
    }

    addMessage(
      "ai",
      data.answer ||
        "لم يتم العثور على نتيجة."
    );

  } catch (error) {

    removeTyping();

    addMessage(
      "ai",
      "❌ " + error.message
    );
  }

  input.value = "";
}

// =========================
// IMAGE GENERATION
// =========================

async function generateImage() {
  const prompt =
    document
      .getElementById(
        "imagePrompt"
      )
      .value
      .trim();

  const size =
    document.getElementById(
      "imageSize"
    ).value;

  const status =
    document.getElementById(
      "imageStatus"
    );

  const image =
    document.getElementById(
      "generatedImage"
    );

  if (!prompt) {
    alert(
      "اكتب وصف الصورة أولًا."
    );

    return;
  }

  status.textContent =
    "🎨 جاري إنشاء الصورة بالذكاء الاصطناعي...";

  status.classList.add("show");

  image.style.display =
    "none";

  try {

    const response =
      await fetch(
        "/api/image",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt,
            size
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "فشل إنشاء الصورة."
      );
    }

    image.src =
      data.image;

    image.style.display =
      "block";

    status.textContent =
      "✅ تم إنشاء الصورة بنجاح.";

  } catch (error) {

    status.textContent =
      "❌ " + error.message;
  }
}

// =========================
// BUSINESS PLAN
// =========================

async function createBusinessPlan() {

  const idea =
    document
      .getElementById(
        "businessIdea"
      )
      .value
      .trim();

  const budget =
    document
      .getElementById(
        "businessBudget"
      )
      .value
      .trim();

  const audience =
    document
      .getElementById(
        "businessAudience"
      )
      .value
      .trim();

  const result =
    document.getElementById(
      "businessResult"
    );

  if (!idea) {
    alert(
      "اكتب فكرة المشروع أولًا."
    );

    return;
  }

  result.textContent =
    "⏳ جاري إنشاء خطة العمل...";

  result.classList.add(
    "show"
  );

  try {

    const response =
      await fetch(
        "/api/business-plan",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            idea,
            budget,
            audience
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "حدث خطأ."
      );
    }

    result.textContent =
      data.answer;

  } catch (error) {

    result.textContent =
      "❌ " + error.message;
  }
}

// =========================
// CV
// =========================

async function createCV() {

  const name =
    document
      .getElementById(
        "cvName"
      )
      .value
      .trim();

  const education =
    document
      .getElementById(
        "cvEducation"
      )
      .value
      .trim();

  const skills =
    document
      .getElementById(
        "cvSkills"
      )
      .value
      .trim();

  const experience =
    document
      .getElementById(
        "cvExperience"
      )
      .value
      .trim();

  const targetJob =
    document
      .getElementById(
        "cvTargetJob"
      )
      .value
      .trim();

  const result =
    document.getElementById(
      "cvResult"
    );

  if (!name) {
    alert(
      "اكتب الاسم أولًا."
    );

    return;
  }

  result.textContent =
    "⏳ جاري إنشاء السيرة الذاتية...";

  result.classList.add(
    "show"
  );

  try {

    const response =
      await fetch(
        "/api/cv",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name,
            education,
            skills,
            experience,
            targetJob
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "حدث خطأ."
      );
    }

    result.textContent =
      data.answer;

  } catch (error) {

    result.textContent =
      "❌ " + error.message;
  }
}

// =========================
// LOAD CHAT
// =========================

function loadChatHistory() {

  if (!chatHistory.length) {
    return;
  }

  chatBox.innerHTML = "";

  chatHistory.forEach(
    (message) => {

      addMessage(
        message.role,
        message.content,
        false
      );

    }
  );
}

// =========================
// START
// =========================

loadChatHistory();