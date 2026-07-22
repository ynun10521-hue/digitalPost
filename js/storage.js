/* ------------------------------------------------------------------
   storage.js
   서버/DB 없이 브라우저 안에서만 엽서 데이터를 저장하는 저장소입니다.

   - Claude.ai 안에서 미리보기로 열었을 때는 대화창에 내장된
     window.storage API를 사용합니다 (세션이 끝나도 유지됨).
   - 다운로드해서 내 컴퓨터에서 index.html을 직접 열었을 때는
     window.storage가 없으므로 브라우저의 localStorage를 사용합니다
     (같은 브라우저에서 다시 열어도 목록이 남아있습니다).
   - 둘 다 사용할 수 없는 극히 예외적인 상황에서는 메모리에만
     저장되어 새로고침하면 목록이 초기화됩니다.
   ------------------------------------------------------------------ */

const PostcardStorage = (function () {
  const KEY = "postcards";
  const hasWindowStorage =
    typeof window !== "undefined" &&
    typeof window.storage !== "undefined" &&
    window.storage !== null;

  let memoryFallback = null; // 최후의 fallback (메모리만)

  function memoryLoad() {
    if (memoryFallback === null) memoryFallback = [];
    return memoryFallback;
  }
  function memorySave(list) {
    memoryFallback = list;
  }

  function localGet() {
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return null; // localStorage 사용 불가
    }
  }
  function localSet(list) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  async function loadAll() {
    if (hasWindowStorage) {
      try {
        const res = await window.storage.get(KEY, false);
        return res && res.value ? JSON.parse(res.value) : [];
      } catch (e) {
        return []; // 아직 저장된 값이 없는 경우 등
      }
    }
    const local = localGet();
    if (local !== null) return local;
    return memoryLoad();
  }

  async function saveAll(list) {
    if (hasWindowStorage) {
      try {
        await window.storage.set(KEY, JSON.stringify(list), false);
        return;
      } catch (e) {
        console.error("window.storage 저장 실패, 메모리로 대체합니다.", e);
      }
    }
    if (!localSet(list)) {
      memorySave(list);
    }
  }

  async function deleteById(id) {
  const list = await loadAll();
  const newList = list.filter((p) => String(p.id) !== String(id));
  await saveAll(newList);
  }

  async function add(item) {
    const list = await loadAll();
    const newItem = Object.assign(
      {
        id: Date.now(),
        createdAt: formatDate(new Date())
      },
      item
    );
    list.unshift(newItem);
    await saveAll(list);
    return newItem;
  }

  async function getById(id) {
    const list = await loadAll();
    return list.find((p) => String(p.id) === String(id)) || null;
  }

  function formatDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }

  return { loadAll, saveAll, add, getById, deleteById };
})();