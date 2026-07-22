/* 손편지 우체국 (Front-end only 버전)
   1) live-binds the form controls to the postcard preview
   2) exports the preview as PNG with html2canvas
   3) saves postcard data via PostcardStorage (no server / no DB)
   4) loads + renders the gallery and detail modal from PostcardStorage
*/

(function () {
  const STAMP_SRC = {
    1: "images/stamps/stamp1-clover.svg",
    2: "images/stamps/stamp2-cat.svg",
    3: "images/stamps/stamp3-bunny.svg",
    4: "images/stamps/stamp4-star.svg",
    5: "images/stamps/stamp5-music.svg",
    6: "images/stamps/stamp6-dog.svg",
    7: "images/stamps/stamp7-hamster.svg",
    8: "images/stamps/stamp8-wedding.svg",
    9: "images/stamps/stamp9-birthday.svg",
    10: "images/stamps/stamp10-school.svg",
    11: "images/stamps/stamp11-food.svg",
    12: "images/stamps/stamp12-sport.svg",
    13: "images/stamps/stamp13-work.svg"
  };

  const el = (id) => document.getElementById(id);

  const postcard = el("postcard");
  const previewStamp = el("previewStamp");
  const previewRecipient = el("previewRecipient");
  const previewTitle = el("previewTitle");
  const previewContent = el("previewContent");
  const previewDate = el("previewDate");

  const inputRecipient = el("inputRecipient");
  const inputTitle = el("inputTitle");
  const inputContent = el("inputContent");

  function todayStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }
  previewDate.textContent = todayStr();

  /* ---------- 1. live preview binding ---------- */
  function refreshTextPreview() {
    previewRecipient.textContent = inputRecipient.value.trim()
      ? inputRecipient.value.trim() + " 에게"
      : "받는 사람을 적어주세요";
    previewTitle.textContent = inputTitle.value.trim() || "제목이 여기에 표시됩니다";
    previewContent.textContent = inputContent.value.trim()
      || "본문 내용이 실시간으로 이 곳에 채워집니다. 왼쪽에서 글을 적어보세요 :)";
  }
  [inputRecipient, inputTitle, inputContent].forEach((f) =>
    f.addEventListener("input", refreshTextPreview)
  );
  refreshTextPreview();

  document.querySelectorAll('input[name="stamp"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      previewStamp.src = STAMP_SRC[radio.value];
    });
  });

  document.querySelectorAll('input[name="bg"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      postcard.className = "postcard " + radio.value;
    });
  });

  function currentStampId() {
    const checked = document.querySelector('input[name="stamp"]:checked');
    return checked ? checked.value : "1";
  }
  function currentBg() {
    const checked = document.querySelector('input[name="bg"]:checked');
    return checked ? checked.value : "bg-cream";
  }

  const charCount = el("charCount");
  inputContent.addEventListener("input", () => {
    const length = inputContent.value.length;
    charCount.textContent = length;
  });
  
  /* 수정 버전 */
  /* ---------- 2. export as image (dom-to-image 버전) ---------- */

  // 캡처를 담당하는 공통 함수
  function downloadPostcard(targetNode, titleText) {
    const scale = 2;
    const config = {
      width: targetNode.clientWidth * scale,
      height: targetNode.clientHeight * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        margin: "0"
      }
    };

    domtoimage.toPng(targetNode, config)
      .then((dataUrl) => {
        const link = document.createElement("a");
        const safeTitle = (titleText || "postcard").replace(/[^\w가-힣-]/g, "_");
        link.download = `${safeTitle}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
        console.error("이미지 저장 중 오류가 발생했어요!", error);
        alert("이미지 저장에 실패했습니다.");
      });
  }

  el("btnDownload").addEventListener("click", () => {
    const targetNode = el("postcard");
    const title = inputTitle.value.trim();
    downloadPostcard(targetNode, title); // 공통 함수 호출!
  });

  el("modalDownload").addEventListener("click", () => {
    const targetNode = el("modalPostcard"); // 모달 속 엽서 지정!
    const title = el("modalTitle").textContent; 
    downloadPostcard(targetNode, title); // 똑같은 함수 호출!
  });
  

  /* ---------- 3. save (no server: goes straight into PostcardStorage) ---------- */
  el("btnSaveDb").addEventListener("click", async () => {
    const status = el("saveStatus");
    status.textContent = "저장 중...";
    try {
      await PostcardStorage.add({
        title: inputTitle.value.trim(),
        content: inputContent.value.trim(),
        recipient: inputRecipient.value.trim(),
        stampId: currentStampId(),
        bg: currentBg()
      });
      status.textContent = "저장되었어요! '모아보기' 탭에서 확인해보세요 🌷";
      loadGallery();
    } catch (err) {
      status.textContent = "저장에 실패했어요: " + err.message;
    }
  });

  /* ---------- 4. gallery list + detail modal ---------- */
  const galleryGrid = el("galleryGrid");
  const galleryEmpty = el("galleryEmpty");
  const modalBackdrop = el("modalBackdrop");
  const modalDelete = el("modalDelete");

  function stampSrcFor(id) {
    return STAMP_SRC[id] || STAMP_SRC[1];
  }

  async function loadGallery() {
    let items = [];
    try {
      items = await PostcardStorage.loadAll();
    } catch (e) {
      galleryEmpty.style.display = "block";
      galleryEmpty.textContent = "목록을 불러오지 못했어요.";
      return;
    }
    galleryGrid.querySelectorAll(".gallery-card").forEach((n) => n.remove());
    if (!items || items.length === 0) {
      galleryEmpty.style.display = "block";
      galleryEmpty.textContent = "아직 저장된 엽서가 없어요. 엽서를 만들고 저장해보세요!";
      return;
    }
    galleryEmpty.style.display = "none";
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "gallery-card";
      card.innerHTML = `
        <div class="mini-postcard ${item.bg || "bg-cream"}">
          <div class="stamp-slot" style="width:34px;height:34px;top:8px;right:8px;">
            <img src="${stampSrcFor(item.stampId)}" alt="우표">
          </div>
          <div style="padding:10px 44px 10px 10px;">
            <p class="postcard-recipient" style="font-size:11px;margin-bottom:4px;">${escapeHtml(item.recipient || "")} 에게</p>
            <h3 class="postcard-title" style="font-size:14px;margin:0;">${escapeHtml(item.title || "(제목 없음)")}</h3>
          </div>
        </div>
        <p class="mini-title">${escapeHtml(item.title || "(제목 없음)")}</p>
        <p class="mini-meta">${escapeHtml(item.createdAt || "")}</p>
      `;
      card.addEventListener("click", () => openDetail(item.id));
      galleryGrid.appendChild(card);
    });
  }

  let currentOpenId = null;

  async function openDetail(id) {
    const item = await PostcardStorage.getById(id);
    currentOpenId = id;
    if (!item) return;
    el("modalPostcard").className = "postcard " + (item.bg || "bg-cream");
    el("modalStamp").src = stampSrcFor(item.stampId);
    el("modalRecipient").textContent = (item.recipient || "") + " 에게";
    el("modalTitle").textContent = item.title || "(제목 없음)";
    el("modalContent").textContent = item.content || "";
    el("modalDate").textContent = item.createdAt || "";
    el("deleteStatus").textContent = "";
    modalBackdrop.classList.add("open");
  }

  el("modalClose").addEventListener("click", () => modalBackdrop.classList.remove("open"));
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) modalBackdrop.classList.remove("open");
  });

  el("modalDelete").addEventListener("click", async () => {
      if (!currentOpenId) return;

      try {
        await PostcardStorage.deleteById(currentOpenId); 

        modalBackdrop.classList.remove("open");
        loadGallery();

      } catch (err) {
        el("deleteStatus").textContent = "삭제에 실패했어요: " + err.message;
      }
    });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  document.getElementById("tab-gallery").addEventListener("change", function () {
    if (this.checked) loadGallery();
  });
  loadGallery();
})();
