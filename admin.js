async function init() {
  await dbSeedWords();
  await refresh();
}

const dots = '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-dots"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>'
const svgCross = '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>'
async function refresh() {
  const data = await dbGetAllWords();
  const list = document.getElementById('words');
  list.innerHTML = '';
  data.forEach((item) => {
    const li = document.createElement('li');
    li.dataset.word = item.word.toLowerCase();
    const p = document.createElement('p');
    p.textContent = item.word;
    li.appendChild(p);
    const editBtn = document.createElement('button');
    editBtn.innerHTML = dots;
    editBtn.title = 'Змінити';
    editBtn.setAttribute('aria-label', `Змінити слово ${item.word}`);
    editBtn.onclick = async () => {
      const updated = await promptWord(item.word);
      if (updated && updated !== item.word) {
        try {
          await dbUpdateWord(item.id, updated);
          refresh();
        } catch (e) {
          notice('Таке слово вже є');
        }
      }
    };
    const delBtn = document.createElement('button');
    delBtn.innerHTML = svgCross;
    delBtn.title = 'Видалити';
    delBtn.setAttribute('aria-label', `Видалити слово ${item.word}`);
    delBtn.onclick = async () => {
      if (!(await confirmDelete(item.word))) return;
      await dbDeleteWord(item.id);
      refresh();
    };
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
  filterWords();
}

// typing in the add field narrows the list, so an existing word shows up before
// the user bothers to submit it
function filterWords() {
  const query = document.getElementById('newWord').value.trim().toLowerCase();
  const list = document.getElementById('words');
  let shown = 0;
  list.querySelectorAll('li').forEach((li) => {
    const match = !query || li.dataset.word.includes(query);
    li.hidden = !match;
    if (match) shown += 1;
  });
  list.dataset.empty = query && shown === 0;
}

// the dialogs close themselves (method="dialog"), so this only reads the result
function openDialog(id) {
  const dialog = document.getElementById(id);
  // returnValue survives the previous close, so a dismissal would otherwise
  // report whatever button was pressed last time
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true });
  });
}

async function confirmDelete(word) {
  document.getElementById('confirmWord').textContent = word;
  return (await openDialog('confirmDialog')) === 'delete';
}

async function promptWord(word) {
  const input = document.getElementById('editWord');
  input.value = word;
  const opened = openDialog('editDialog');
  input.focus();
  input.select();
  return (await opened) === 'save' ? input.value.trim() : null;
}

async function notice(message) {
  document.getElementById('noticeText').textContent = message;
  await openDialog('noticeDialog');
}

async function addWord() {
  const input = document.getElementById('newWord');
  const word = input.value.trim();
  if (word) {
    try {
      await dbAddWord(word);
      input.value = '';
      refresh();
    } catch (e) {
      notice('Таке слово вже є');
    }
  }
}

init();
