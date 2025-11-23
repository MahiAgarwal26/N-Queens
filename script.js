// ------------------ STATE ------------------
let N = 8;
let grid = document.getElementById("grid");
let logBox = document.getElementById("logBox");
let statusBox = document.getElementById("status");
let domainBox = document.getElementById("domainBox");
let running = false;
let generator = null;
let counters = { checked: 0, back: 0, assign: 0 };

const nSizeInput = document.getElementById("nSize");
const algoInput = document.getElementById("algo");
const speedInput = document.getElementById("speed");

function resetCounters() {
  counters = { checked: 0, back: 0, assign: 0 };
  updateCounters();
}
function updateCounters() {
  document.getElementById("countChecked").innerText = counters.checked;
  document.getElementById("countBack").innerText = counters.back;
  document.getElementById("countAssign").innerText = counters.assign;
}

function lockControls() {
  nSizeInput.disabled = true;
  algoInput.disabled = true;
}
function unlockControls() {
  nSizeInput.disabled = false;
  algoInput.disabled = false;
}

// ------------------ UI BUILD ------------------
function buildGrid() {
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${N},48px)`;
  grid.style.gridTemplateRows = `repeat(${N},48px)`;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let cell = document.createElement("div");
      cell.className = "cell " + ((r + c) % 2 == 0 ? "white" : "black");
      cell.id = `cell-${r}-${c}`;
      grid.appendChild(cell);
    }
  }
}

function render(board) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let cell = document.getElementById(`cell-${r}-${c}`);
      if (cell) {
        cell.classList.remove("conflict");
        cell.innerHTML =
          board[r] === c ? '<span class="queen">♛</span>' : "";
      }
    }
  }
}

function flashConflict(r, c) {
  let cell = document.getElementById(`cell-${r}-${c}`);
  if (cell) cell.classList.add("conflict");
}
function log(msg) {
  let d = document.createElement("div");
  d.className = "logLine";
  d.innerText = msg;
  logBox.appendChild(d);
  logBox.scrollTop = logBox.scrollHeight;
}
function updateDomainView(domains, board) {
  domainBox.innerHTML = "";
  for (let i = 0; i < N; i++) {
    let rowDiv = document.createElement("div");
    rowDiv.className = "domainRow";
    rowDiv.innerHTML = `<strong>Row ${i}:</strong> ${
      board[i] === -1
        ? "[" + domains[i].join(", ") + "]"
        : "assigned → " + board[i]
    }`;
    domainBox.appendChild(rowDiv);
  }
}

// ------------------ UTILS ------------------
function conflicts(board, row, col) {
  for (let r = 0; r < N; r++) {
    let c = board[r];
    if (c === -1) continue;
    if (r === row) continue;
    if (c === col) return { type: "col", r, c };
    if (Math.abs(r - row) === Math.abs(c - col))
      return { type: "diag", r, c };
  }
  return null;
}
function deepCopyDomains(dom) {
  return dom.map((d) => d.slice());
}

// ------------------ SOLVERS ------------------
function* solver_bt() {
  let board = Array(N).fill(-1);
  function* solve(row) {
    if (row === N) return true;
    for (let col = 0; col < N; col++) {
      counters.checked++;
      updateCounters();
      log(`Check row ${row}, col ${col}`);
      yield { type: "check", row, col, board: [...board] };
      if (conflicts(board, row, col)) {
        flashConflict(row, col);
        log(`Conflict at (${row},${col})`);
        yield { type: "conflict", row, col, board: [...board] };
        continue;
      }
      board[row] = col;
      counters.assign++;
      updateCounters();
      log(`Place queen at (${row},${col})`);
      yield { type: "place", row, col, board: [...board] };
      if (yield* solve(row + 1)) return true;
      board[row] = -1;
      counters.back++;
      updateCounters();
      log(`Backtrack from row ${row}`);
      yield { type: "remove", row, col, board: [...board] };
    }
    return false;
  }
  yield* solve(0);
  return { done: true };
}

function* solver_fc(mrv = false) {
  let board = Array(N).fill(-1);
  let domains = Array.from({ length: N }, () =>
    Array.from({ length: N }, (_, i) => i)
  );

  function select_row() {
    if (!mrv) {
      for (let r = 0; r < N; r++) if (board[r] === -1) return r;
      return null;
    }
    let best = null;
    let bestSize = Infinity;
    for (let r = 0; r < N; r++) {
      if (board[r] !== -1) continue;
      let size = domains[r].length;
      if (size < bestSize) {
        bestSize = size;
        best = r;
      }
    }
    return best;
  }

  function eliminate_for(row, col, dom) {
    for (let r = 0; r < N; r++) {
      if (r === row) continue;
      let dist = Math.abs(r - row);
      dom[r] = dom[r].filter(
        (c) => c !== col && c !== col - dist && c !== col + dist
      );
    }
  }

  function* solve() {
    if (board.every((v) => v !== -1)) return true;
    let row = select_row();
    if (row === null) return false;
    let choices = domains[row].slice();
    for (let i = 0; i < choices.length; i++) {
      let col = choices[i];
      counters.checked++;
      updateCounters();
      log(`Check row ${row}, col ${col}`);
      yield {
        type: "check",
        row,
        col,
        board: [...board],
        domains: deepCopyDomains(domains),
      };

      if (conflicts(board, row, col)) {
        flashConflict(row, col);
        log(`Conflict with existing assignment at (${row},${col})`);
        yield {
          type: "conflict",
          row,
          col,
          board: [...board],
          domains: deepCopyDomains(domains),
        };
        continue;
      }

      let savedDomains = deepCopyDomains(domains);
      board[row] = col;
      counters.assign++;
      updateCounters();
      domains[row] = [col];
      eliminate_for(row, col, domains);
      log(`Place queen at (${row},${col}) and forward-check`);
      yield {
        type: "place",
        row,
        col,
        board: [...board],
        domains: deepCopyDomains(domains),
      };

      let wiped = domains.some(
        (d, ri) => d.length === 0 && board[ri] === -1
      );
      if (wiped) {
        counters.back++;
        updateCounters();
        log(`Domain wipeout after placing (${row},${col}) → backtrack`);
        domains = savedDomains;
        board[row] = -1;
        yield {
          type: "wipeout",
          row,
          col,
          board: [...board],
          domains: deepCopyDomains(domains),
        };
        continue;
      }

      if (yield* solve()) return true;
      domains = savedDomains;
      board[row] = -1;
      counters.back++;
      updateCounters();
      log(`Backtrack from (${row},${col})`);
      yield {
        type: "remove",
        row,
        col,
        board: [...board],
        domains: deepCopyDomains(domains),
      };
    }
    return false;
  }

  yield* solve();
  return { done: true };
}

// ------------------ EXECUTION ------------------
async function runSteps() {
  running = true;
  lockControls();
  while (running) {
    let delay = parseInt(speedInput.value);
    document.getElementById("speedVal").innerText = delay;
    if (!generator) {
      running = false;
      break;
    }
    let nxt = generator.next();
    if (nxt.done) {
      statusBox.innerText = "Status: Finished";
      running = false;
      unlockControls();
      break;
    }
    let step = nxt.value;
    if (step.domains)
      updateDomainView(step.domains, step.board || Array(N).fill(-1));
    render(step.board || Array(N).fill(-1));
    if (step.type === "conflict" || step.type === "wipeout")
      flashConflict(step.row, step.col);
    statusBox.innerText = `Status: ${step.type} r=${step.row} c=${step.col}`;
    logShort(step.type, step);
    await new Promise((r) => setTimeout(r, delay));
  }
}

function logShort(type, step) {
  if (type === "check") log(`Check r=${step.row},c=${step.col}`);
  else if (type === "place") log(`Place r=${step.row},c=${step.col}`);
  else if (type === "remove") log(`Remove r=${step.row},c=${step.col}`);
  else if (type === "conflict") log(`Conflict r=${step.row},c=${step.col}`);
  else if (type === "wipeout") log(`Wipeout after r=${step.row},c=${step.col}`);
}

// ------------------ BUTTON HANDLERS ------------------
function updateDomainVisibility() {
  const mode = algoInput.value;
  domainBox.style.display =
    mode === "fc" || mode === "mrv" ? "block" : "none";
}
algoInput.addEventListener("change", updateDomainVisibility);

run.onclick = () => {
  if (running) return;
  logBox.innerHTML = "";
  resetCounters();
  updateDomainVisibility();
  const mode = algoInput.value;
  if (mode === "bt") generator = solver_bt();
  else if (mode === "fc") generator = solver_fc(false);
  else generator = solver_fc(true);
  statusBox.innerText = "Status: Running";
  runSteps();
};

step.onclick = () => {
  lockControls();
  if (!generator) {
    const mode = algoInput.value;
    generator = mode === "bt" ? solver_bt() : solver_fc(mode === "mrv");
  }
  let nxt = generator.next();
  if (nxt.done) {
    statusBox.innerText = "Status: Finished";
    unlockControls();
    return;
  }
  let s = nxt.value;
  if (s.domains)
    updateDomainView(s.domains, s.board || Array(N).fill(-1));
  render(s.board || Array(N).fill(-1));
  logShort(s.type, s);
};

reset.onclick = () => {
  running = false;
  generator = null;
  statusBox.innerText = "Status: Idle";
  logBox.innerHTML = "";
  resetCounters();
  updateDomainView(
    Array.from({ length: N }, () =>
      Array.from({ length: N }, (_, i) => i)
    ),
    Array(N).fill(-1)
  );
  buildGrid();
  unlockControls();
};

nSizeInput.onchange = (e) => {
  N = parseInt(e.target.value);
  running = false;
  generator = null;
  logBox.innerHTML = "";
  resetCounters();
  buildGrid();
  updateDomainView(
    Array.from({ length: N }, () =>
      Array.from({ length: N }, (_, i) => i)
    ),
    Array(N).fill(-1)
  );
};

speedInput.oninput = (e) => {
  document.getElementById("speedVal").innerText = e.target.value;
};

buildGrid();
updateDomainView(
  Array.from({ length: N }, () => Array.from({ length: N }, (_, i) => i)),
  Array(N).fill(-1)
);
updateDomainVisibility();
