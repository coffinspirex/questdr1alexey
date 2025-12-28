let gameData = {};
let currentNode = null;
let typingSpeed = 25;
let bossHP = 6;
let playerHP = 10;
let estus = 3;
let typingInterval = null;
let lastLootName = "";
let forcedText = null;
let enemyHP = 100; // Здоровье врага для мира Таркова
let bgMusic = null;

let tarkovStats = {
    head: 35,
    thorax: 85,
    death_count: 0
};
let inventory = ["бинт", "аптечка"];
let returnNode = "W5_SPAWN";

const output = document.getElementById("output");
const choicesDiv = document.getElementById("choices");

// Загрузка данных
fetch("game.json")
    .then(res => res.json())
    .then(data => {
        gameData = {};
        data.forEach(node => {
            if (node.Node_ID) gameData[node.Node_ID] = node;
        });
        startGame();
    })
    .catch(err => console.error("Ошибка загрузки JSON:", err));

function applyEffect(effect) {
    forcedText = null;
    if (!effect) return false;

    const parts = effect.split(",");
    let causedTransition = false;

    parts.forEach(e => {
        e = e.trim();
		
		if (e.startsWith("enemy_hp-")) enemyHP -= parseInt(e.split("-")[1]);
if (e === "reset_enemy") {
    // Если мы в мире Таркова (W5), даем врагу 100 HP, иначе — 5 HP
    const currentNode = Object.values(gameData).find(n => n.Node_ID === currentNodeID);
    if (currentNode && currentNode.World === "W5") {
        enemyHP = 100;
    } else {
        enemyHP = 5; 
    }
}

        // --- ТАРКОВСКАЯ МЕДИЦИНА И СТАТЫ ---
        if (e === "init_tarkov") {
            tarkovStats.head = 35;
            tarkovStats.thorax = 85;
            inventory = ["бинт", "аптечка"];
        }
        if (e.startsWith("hp_thorax-")) tarkovStats.thorax -= parseInt(e.split("-")[1]);
        if (e.startsWith("hp_thorax+")) {
            tarkovStats.thorax = Math.min(85, tarkovStats.thorax + parseInt(e.split("+")[1]));
            inventory = inventory.filter(item => item !== "аптечка");
        }
        if (e.startsWith("hp_head-")) tarkovStats.head -= parseInt(e.split("-")[1]);
        if (e === "heal_full") {
            tarkovStats.thorax = 85;
            inventory = inventory.filter(item => item !== "аптечка");
        }
        if (e.startsWith("set_return:")) returnNode = e.split(":")[1];
        if (e === "add_death") tarkovStats.death_count++;
        
        // Логика кнопки "Назад" в инвентаре
        if (e === "use:RETURN_LOGIC") {
            goTo(returnNode);
            causedTransition = true;
        }

// --- УСЛОВИЯ (CONDITIONS) ---
if (e === "check_alive_tarkov") {
    // Если HP кончилось — смерть.
    if (tarkovStats.head <= 0 || tarkovStats.thorax <= 0) {
        goTo("W5_DEATH");
        causedTransition = true;
    }
    // Если жив — НИЧЕГО не делаем, позволяем игроку нажать на кнопку "Продолжить бой"
}

        if (e === "check_loop") {
            // Если это уже вторая+ смерть, сразу кидаем на выход
            if (tarkovStats.death_count >= 2) {
                goTo("W5_EXIT");
                causedTransition = true;
            }
            // Если первая - ничего не делаем (даем нажать кнопку в JSON)
        }

        // 🔹 ЛОГИКА БОЯ (W4)
       if (e === "check_enemy_alive") {
    if (enemyHP <= 0 || bossHP <= 0) { // Проверяем и зомби (enemyHP) и босса
        goTo("W4_WIN");
    } else {
        goTo("W4_ZOMBIE_TURN");
    }
    causedTransition = true;
}

        if (e === "check_player_state") {
            if (playerHP <= 1) goTo("W4_KNOCKDOWN");
            else goTo("W4_PLAYER_TURN");
            causedTransition = true;
        }

        // 🔹 ЛУТ
        if (e.startsWith("open_container:")) {
            const containerType = e.split(":")[1];
            const lootMap = { 'WARDROBE': 'META_CLOTH', 'FRIDGE': 'META_FOOD', 'CAR_TRUNK': 'META_CARLOOT' };
            const prefix = lootMap[containerType];
            if (prefix) {
                const possibleLoot = Object.values(gameData).filter(n => n.Node_ID && n.Node_ID.startsWith(prefix));
                if (possibleLoot.length > 0) {
                    const item = possibleLoot[Math.floor(Math.random() * possibleLoot.length)];
                    lastLootName = item.Text;
                }
            }
        }

       // 🔹 СТАТЫ W4
if (e.startsWith("enemy_hp:")) {
    enemyHP = parseInt(e.split(":")[1]);
}

if (e.startsWith("player_hp:")) {
    playerHP = parseInt(e.split(":")[1]);
} 
// Нанесение урона (dmg:1)
if (e.startsWith("dmg:")) {
    let d = parseInt(e.split(":")[1]) || 1;
    enemyHP -= d; 
    bossHP -= d; // Урон идет тому, кто сейчас активен
}

// Отнимание HP у игрока (hp-1)
if (e.startsWith("hp-")) {
    playerHP -= parseInt(e.split("-")[1]) || 1;
}

        // Инициализация HP для врагов (чтобы не были бессмертными)
        if (e.startsWith("enemy_hp:")) enemyHP = parseInt(e.split(":")[1]);
        if (e.startsWith("player_hp:")) playerHP = parseInt(e.split(":")[1]);

        // 🔹 ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
        if (e === "screen_shake") {
            const term = document.getElementById("terminal");
            if (term) {
                term.classList.add("shake-animation");
                setTimeout(() => term.classList.remove("shake-animation"), 500);
            }
        }

        if (e === "red_flash") {
            const flash = document.createElement("div");
            flash.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(255,0,0,0.3); pointer-events:none; z-index:9999;";
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 150);
        }

        if (e === "white_flash") {
            const flash = document.createElement("div");
            flash.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:white; pointer-events:none; z-index:9999; opacity:0.8;";
            document.body.appendChild(flash);
            setTimeout(() => {
                flash.style.transition = "opacity 0.5s";
                flash.style.opacity = "0";
                setTimeout(() => flash.remove(), 500);
            }, 50);
        }

        if (e === "fade_to_red") {
            const term = document.getElementById("terminal");
            if (term) {
                term.style.transition = "box-shadow 2s ease, border 2s ease";
                term.style.boxShadow = "inset 0 0 50px rgba(255, 0, 0, 0.7)";
                term.style.borderColor = "red";
                setTimeout(() => {
                    term.style.boxShadow = "none";
                    term.style.borderColor = "#00ff00";
                }, 4000);
            }
        }

        if (e.startsWith("play_sound:")) {
            const soundName = e.split(":")[1];
            new Audio(`sounds/${soundName}.mp3`).play().catch(() => {});
        }
if (e === "check_enemy_tarkov") {
    if (enemyHP <= 0) {
        goTo("W5_AFTER_MCHS"); // Враг повержен
    } else {
        goTo("W5_MCHS_LOOP"); // Враг еще жив, возвращаемся в цикл выбора
    }
    causedTransition = true;
}
if (e === "check_boss_hp") {
    if (bossHP <= 0) {
        goTo("W2_WIN");
    } else {
        goTo("W2_BOSS_TURN");
    }
    causedTransition = true; // Это заставит игру сразу прыгнуть в нужный узел
}
// --- ПРАЗДНИК ---
        if (e === "birthday_celebration") {
            const term = document.getElementById("terminal");
            if (term) term.classList.add("birthday-fade-in");
            
            if (typeof spawnStars === "function") {
                spawnStars(); 
                setTimeout(spawnStars, 1000);
                setTimeout(spawnStars, 2000);
            }

            const party = document.createElement("div");
            party.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background: radial-gradient(circle, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0) 70%); pointer-events:none; z-index:9998;";
            document.body.appendChild(party);
            setTimeout(() => party.remove(), 3000);
        }

        // --- ЗВУКОВАЯ СИСТЕМА (Универсальная) ---
        if (e.startsWith("play_bg:")) {
            const track = e.split(":")[1]; 
            if (bgMusic) { bgMusic.pause(); }
            bgMusic = new Audio(`sounds/${track}`); 
            bgMusic.loop = true;
            bgMusic.volume = 0.4;
            bgMusic.play().catch(err => console.log("Нужен клик для звука"));
        }

        if (e.startsWith("play_sound:")) {
    const soundFile = e.split(":")[1]; 
    const sfx = new Audio(`sounds/${soundFile}`);
    sfx.volume = 0.3; // <--- ДОБАВЬ ЭТУ СТРОКУ (0.6 — оптимально)
    sfx.play().catch(() => {});
}

        if (e === "stop_bg") {
            if (bgMusic) {
                let fadeOut = setInterval(() => {
                    if (bgMusic.volume > 0.05) {
                        bgMusic.volume -= 0.05;
                    } else {
                        bgMusic.pause();
                        bgMusic = null; // Обнуляем, чтобы не пытаться убавить громкость паузы
                        clearInterval(fadeOut);
                    }
                }, 100);
            }
        }
    }); // Закрытие parts.forEach

    return causedTransition;
} // Конец функции applyEffect

function renderNode(node) {
    if (!node) return;
    document.body.className = `world-${node.World || "INTRO"}`;
    output.innerHTML = "";
    choicesDiv.innerHTML = "";

    if (applyEffect(node.Effect)) return;

    let displayText = forcedText || node.Text || "";

    // 1. Сначала обрабатываем RANDOM (если он есть)
    if (displayText.includes("{RANDOM:")) {
        const key = displayText.match(/\{RANDOM:(.*?)\}/)?.[1];
        const options = Object.values(gameData).filter(n => n.Node_ID === `META_${key}`);
        if (options.length > 0) {
            const chosenOption = options[Math.floor(Math.random() * options.length)];
            displayText = displayText.replace(`{RANDOM:${key}}`, chosenOption.Text);
            
            const cleanItemName = chosenOption.Text.split('(')[0].trim();
            if (!inventory.includes(cleanItemName)) {
                inventory.push(cleanItemName);
            }
        }
    }

    // 2. Теперь делаем все остальные замены ПЕРЕМЕННЫХ в displayText
    displayText = displayText
        .replace("{boss_hp}", bossHP)
        .replace("{player_hp}", playerHP)
        .replace("{enemy_hp}", enemyHP)
        .replace("{container_loot}", lastLootName || "Ничего")
        .replace("{inv_backpack}", "ИНВЕНТАРЬ: " + inventory.join(", "))
        .replace("{hp_status}", `Голова: ${tarkovStats.head} | Грудь: ${tarkovStats.thorax}`);

    // 3. Отправляем итоговый текст на печать
    typeText(displayText, () => {
        renderChoices(node);
        forcedText = null;
    });
}

function renderChoices(node) {
    choicesDiv.innerHTML = "";
    let hasRealChoices = false;

    for (let i = 1; i <= 4; i++) {
        const text = node[`Choice_${i}_Text`];
        const next = node[`Choice_${i}_Next`];

        if (text && next) {
            if (text === "...") { setTimeout(() => goTo(next), 500); return; }
            hasRealChoices = true;
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.textContent = text;
            btn.onclick = () => {
                if (text.includes("{поле ввода пороля}")) {
                    const p = prompt("КОД ПАРОЛЯ:");
                    if (p === "2001") goTo(next);
                    else goTo("W4_CASE_WRONG_PASS");
                } else goTo(next);
            };
            choicesDiv.appendChild(btn);
        }
    }
    if (!hasRealChoices && node.Notes) {
        if (gameData[node.Notes]) setTimeout(() => goTo(node.Notes), 500);
    }
}

function typeText(text, callback) {
    if (typingInterval) clearInterval(typingInterval);
    let i = 0;
    typingInterval = setInterval(() => {
        output.innerHTML += text.charAt(i);
        i++;
        if (i >= text.length) { clearInterval(typingInterval); callback(); }
    }, typingSpeed);
}

function goTo(id) {
    if (typingInterval) clearInterval(typingInterval);
    if (gameData[id]) renderNode(gameData[id]);
}

function startGame() {
    const firstNode = gameData["INTRO_BOOT"] || Object.values(gameData)[0];
    renderNode(firstNode);
}
function spawnStars() {
    const container = document.body;
    for (let i = 0; i < 50; i++) {
        const star = document.createElement("div");
        star.textContent = ["★", "☆", "*", "+", "✧"][Math.floor(Math.random() * 5)];
        star.style.position = "fixed";
        star.style.top = "-20px";
        star.style.left = Math.random() * 100 + "vw";
        star.style.color = ["#ffd700", "#ffffff", "#ff00ff", "#00ffff"][Math.floor(Math.random() * 4)];
        star.style.fontSize = Math.random() * 20 + 10 + "px";
        star.style.pointerEvents = "none";
        star.style.zIndex = "10000";
        star.style.opacity = Math.random();
        
        container.appendChild(star);

        const duration = Math.random() * 3000 + 2000;
        const anim = star.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(110vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: duration,
            easing: 'linear'
        });

        anim.onfinish = () => star.remove();
    }
}
// Авто-запуск музыки при первом клике в любом месте
document.addEventListener('click', () => {
    if (bgMusic && bgMusic.paused) {
        bgMusic.play().catch(e => console.log("Все еще ждем клика..."));
    }
}, { once: true }); // Сработает только один раз