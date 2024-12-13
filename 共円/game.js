let gridSize = 10; // 初期格子サイズ
const cellSize = 50; // 格子の1マスのサイズ
const grid = document.getElementById("grid");
const movesCounter = document.getElementById("moves");
const circleCountDisplay = document.getElementById("circle-count");
const hintButton = document.getElementById("hint");
const restartButton = document.getElementById("restart");
const setGridButton = document.getElementById("set-grid");
const toggleDrawButton = document.getElementById("toggle-draw");
const undoButton = document.getElementById("undo");
const gridSizeInput = document.getElementById("grid-size");
const toggleCheckButton = document.getElementById("toggle-check"); // チェックモードボタン

let moves = 0;
let selectedDots = [];
let checkedDots = []; // チェック状態の点( {x, y} の配列 )
let canvas;
let showHints = false;
let drawCircles = false;
let circles = []; // 完成した円のリスト
let movesHistory = []; // 各手の行動記録
let checkMode = false; // チェックモードのオン・オフ

function initializeGrid(size) {
    grid.innerHTML = ""; // 初期化
    grid.style.width = `${size * cellSize}px`;
    grid.style.height = `${size * cellSize}px`;

    // キャンバスの初期化（円を描画するため）
    canvas = document.createElement("canvas");
    canvas.width = size * cellSize;
    canvas.height = size * cellSize;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    grid.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 点のクリック可能エリアを作成
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dot = document.createElement("div");
            dot.classList.add("dot");
            dot.style.left = `${x * cellSize}px`;
            dot.style.top = `${y * cellSize}px`;
            dot.dataset.x = x;
            dot.dataset.y = y;
            dot.addEventListener("click", () => onDotClick(x, y, dot));
            grid.appendChild(dot);
        }
    }
}

function onDotClick(x, y, dot) {
    if (checkMode) {
        // チェックモード時は選択や円判定には関与しない
        toggleCheckDot(x, y, dot);
    } else {
        // 通常モード時は従来の選択動作
        selectDot(x, y, dot);
    }
}

function toggleCheckDot(x, y, dot) {
    const isChecked = checkedDots.some(d => d.x === x && d.y === y);
    if (isChecked) {
        // 既にチェックされている → チェック解除
        checkedDots = checkedDots.filter(d => !(d.x === x && d.y === y));
        dot.classList.remove("checked");
        dot.classList.remove("hint"); // ヒント中なら黄色だったが戻す
        // movesHistoryにチェック操作を記録
        movesHistory.push({ action: 'check', x, y, checkedBefore: true });
    } else {
        // チェックされていない → チェックする
        checkedDots.push({ x, y });
        // ヒント表示中なら黄色、非表示なら紫
        if (showHints) {
            dot.classList.add("hint");
        } else {
            dot.classList.add("checked");
        }
        movesHistory.push({ action: 'check', x, y, checkedBefore: false });
    }
}

function selectDot(x, y, dot) {
    // 既に選択された点は無視
    if (selectedDots.some(d => d.x === x && d.y === y)) return;

    const prevCirclesLength = circles.length;

    // 点を選択状態にし、リストに追加
    dot.classList.add("selected");
    selectedDots.push({ x, y });

    moves++;
    movesCounter.textContent = moves;

    // 円の判定と記録
    const newCircles = checkAndRecordCircles();

    movesHistory.push({
        action: 'select',
        addedDot: { x, y },
        addedCirclesCount: newCircles.length,
    });

    if (newCircles.length > 0) {
        alert(`円が完成しました！現在の手数: ${moves}\n今回完成した円の数: ${newCircles.length}`);
    }

    circleCountDisplay.textContent = circles.length;

    if (drawCircles) {
        drawAllCircles();
    }

    // ヒント更新
    if (showHints) {
        updateHints();
    }
}

function checkAndRecordCircles() {
    if (selectedDots.length < 4) return [];

    const newCircles = [];
    for (let i = 0; i < selectedDots.length - 3; i++) {
        for (let j = i + 1; j < selectedDots.length - 2; j++) {
            for (let k = j + 1; k < selectedDots.length - 1; k++) {
                for (let l = k + 1; l < selectedDots.length; l++) {
                    const points = [selectedDots[i], selectedDots[j], selectedDots[k], selectedDots[l]];
                    if (isCocircular(points)) {
                        // 既存の円と重複しない場合のみ追加
                        if (!circles.some(circle => isSameCircle(circle.points, points))) {
                            circles.push({ points });
                            newCircles.push({ points });
                        }
                    }
                }
            }
        }
    }
    return newCircles;
}

function isCocircular(points) {
    const [p1, p2, p3, p4] = points;

    const matrix = [
        [p1.x, p1.y, p1.x ** 2 + p1.y ** 2, 1],
        [p2.x, p2.y, p2.x ** 2 + p2.y ** 2, 1],
        [p3.x, p3.y, p3.x ** 2 + p3.y ** 2, 1],
        [p4.x, p4.y, p4.x ** 2 + p4.y ** 2, 1]
    ];

    return Math.abs(determinant(matrix)) < 1e-12;
}

function determinant(matrix) {
    const [a, b, c, d] = matrix;
    return (
        a[0] * (b[1] * (c[2] * d[3] - c[3] * d[2]) - b[2] * (c[1] * d[3] - c[3] * d[1]) + b[3] * (c[1] * d[2] - c[2] * d[1])) -
        a[1] * (b[0] * (c[2] * d[3] - c[3] * d[2]) - b[2] * (c[0] * d[3] - c[3] * d[0]) + b[3] * (c[0] * d[2] - c[2] * d[0])) +
        a[2] * (b[0] * (c[1] * d[3] - c[3] * d[1]) - b[1] * (c[0] * d[3] - c[3] * d[0]) + b[3] * (c[0] * d[1] - c[1] * d[0])) -
        a[3] * (b[0] * (c[1] * d[2] - c[2] * d[1]) - b[1] * (c[0] * d[2] - c[2] * d[0]) + b[2] * (c[0] * d[1] - c[1] * d[0]))
    );
}

function isSameCircle(points1, points2) {
    return points1.every(p1 => points2.some(p2 => p1.x === p2.x && p1.y === p2.y));
}

function drawAllCircles() {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    circles.forEach(circle => {
        const [p1, p2, p3] = circle.points;
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;

        const D = 2 * (x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2));
        if (D === 0) {
            return;
        }

        const Ux = ((x1**2 + y1**2)*(y2 - y3) + (x2**2 + y2**2)*(y3 - y1) + (x3**2 + y3**2)*(y1 - y2)) / D;
        const Uy = ((x1**2 + y1**2)*(x3 - x2) + (x2**2 + y2**2)*(x1 - x3) + (x3**2 + y3**2)*(x2 - x1)) / D;

        const centerX = Ux;
        const centerY = Uy;
        const radius = Math.hypot(centerX - x1, centerY - y1);

        if (!isFinite(centerX) || !isFinite(centerY) || !isFinite(radius)) {
            return;
        }

        ctx.beginPath();
        ctx.arc(centerX * cellSize, centerY * cellSize, radius * cellSize, 0, 2 * Math.PI);
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function updateHints() {
    const allDots = document.querySelectorAll(".dot");
    allDots.forEach(dot => dot.classList.remove("hint"));

    if (selectedDots.length >= 3 && showHints) {
        for (let i = 0; i < selectedDots.length - 2; i++) {
            for (let j = i + 1; j < selectedDots.length - 1; j++) {
                for (let k = j + 1; k < selectedDots.length; k++) {
                    const basePoints = [selectedDots[i], selectedDots[j], selectedDots[k]];

                    for (let dot of allDots) {
                        const x = parseInt(dot.dataset.x);
                        const y = parseInt(dot.dataset.y);
                        if (selectedDots.some(d => d.x === x && d.y === y)) continue;

                        const testPoint = { x, y };
                        if (isCocircular([...basePoints, testPoint])) {
                            dot.classList.add("hint");
                        }
                    }
                }
            }
        }
    }

    // ヒント表示にあわせてチェック状態の点を色を合わせる
    updateCheckedDotsAppearance();
}

function updateCheckedDotsAppearance() {
    // チェック状態の点について、ヒント表示中は「hint」クラス（黄色）、非表示中は「checked」クラス（紫色）
    const allDots = document.querySelectorAll(".dot");
    allDots.forEach(dot => {
        const x = parseInt(dot.dataset.x);
        const y = parseInt(dot.dataset.y);
        const isChecked = checkedDots.some(d => d.x === x && d.y === y);

        // チェックされている点から"checked"と"hint"をまず外して状態更新
        dot.classList.remove("checked");
        // hintはヒント表示中はほかの点にもつく可能性があるため一旦外してupdateHints側で決まったら残す
        // ここではchecked状態の点を正しく再割り当てするために、改めて付け直す
        if (isChecked) {
            if (showHints) {
                // ヒント表示中は黄色にしたい => hintクラス付与
                dot.classList.add("hint");
            } else {
                // ヒント非表示中は紫色 => checkedクラス付与
                // ただしdotが元々hintついていた場合(他のヒントロジックで付与)は先に外す
                dot.classList.remove("hint");
                dot.classList.add("checked");
            }
        } else {
            // チェックされてない点は特にここで追加するクラスはない
            // (ただしヒント表示中に共円候補としてhintがつくことはある)
        }
    });
}

hintButton.addEventListener("click", () => {
    showHints = !showHints;
    hintButton.textContent = showHints ? "ヒント非表示" : "ヒント表示";
    updateHints(); // ヒント状態に応じてcheckedDotsの見た目も反映
});

toggleDrawButton.addEventListener("click", () => {
    drawCircles = !drawCircles;
    toggleDrawButton.textContent = `円の描画: ${drawCircles ? "オフ" : "オン"}`;
    if (drawCircles) {
        drawAllCircles();
    } else {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
});

undoButton.addEventListener("click", () => {
    if (movesHistory.length === 0) return;

    const lastMove = movesHistory.pop();

    if (lastMove.action === 'select') {
        // 選択した点と円を戻す
        const lastDot = lastMove.addedDot;
        selectedDots = selectedDots.filter(d => !(d.x === lastDot.x && d.y === lastDot.y));
        const dotElement = [...document.querySelectorAll(".dot")].find(
            dot => parseInt(dot.dataset.x) === lastDot.x && parseInt(dot.dataset.y) === lastDot.y
        );
        if (dotElement) dotElement.classList.remove("selected");

        for (let i = 0; i < lastMove.addedCirclesCount; i++) {
            circles.pop();
        }

        moves--;
        movesCounter.textContent = moves;
        circleCountDisplay.textContent = circles.length;

        if (drawCircles) {
            drawAllCircles();
        } else {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (showHints) {
            updateHints();
        } else {
            const allDots = document.querySelectorAll(".dot");
            allDots.forEach(dot => dot.classList.remove("hint"));
            updateCheckedDotsAppearance();
        }
    } else if (lastMove.action === 'check') {
        // チェック操作の取り消し
        const { x, y, checkedBefore } = lastMove;
        const dotElement = [...document.querySelectorAll(".dot")].find(
            dot => parseInt(dot.dataset.x) === x && parseInt(dot.dataset.y) === y
        );

        if (checkedBefore) {
            // 元々チェックされていた点をチェック解除した手を戻す → 再度チェック状態へ
            checkedDots.push({ x, y });
        } else {
            // 元々チェックされていなかった点をチェックした手を戻す → チェック解除へ
            checkedDots = checkedDots.filter(d => !(d.x === x && d.y === y));
        }

        // 状態反映
        updateCheckedDotsAppearance();
        // ヒントが表示中なら黄色、非表示なら紫色が再現される
    }
});

restartButton.addEventListener("click", () => {
    moves = 0;
    circles = [];
    selectedDots = [];
    checkedDots = [];
    movesHistory = [];
    circleCountDisplay.textContent = 0;
    initializeGrid(gridSize);
});

setGridButton.addEventListener("click", () => {
  const newGridSize = parseInt(gridSizeInput.value);
  if (newGridSize >= 5 && newGridSize <= 20) {
      moves = 0;
      circles = [];
      selectedDots = [];
      checkedDots = [];
      movesHistory = [];
      circleCountDisplay.textContent = 0;
      initializeGrid(newGridSize);
  } else {
      alert("格子サイズは5から20の間で設定してください！");
  }
});

// チェックモードのトグル
toggleCheckButton.addEventListener("click", () => {
    checkMode = !checkMode;
    toggleCheckButton.textContent = `チェックモード: ${checkMode ? "オフ" : "オン"}`;
});

hintButton.textContent = "ヒント表示";
toggleDrawButton.textContent = "円の描画: オン";
toggleCheckButton.textContent = "チェックモード: オン";

initializeGrid(gridSize);
