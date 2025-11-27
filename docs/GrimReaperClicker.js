
/* =========================
   Global Game State
========================= */
let GameRunning = true;
setInterval(GameTick, 1000);

let soulCount = 0;
let HighestSoulCount = 0;
let multiplier = 1;
let SPS = 0;
let messageVisible = false;
let prestigePoints = 0;      // Your prestige currency
let totalPrestigePoints = 0; // All-time earned prestige points
let prestigeTabUnlocked = false; // Track if prestige tab is unlocked
let ThisPresHighestSoulCount = 0; // Highest soul count in the current prestige session
let allTimeTotalSouls = 0; // Track all-time total souls collected
let playTime = 0; // Track total play time in seconds
let PrestigeLevel = 0;
let DebugInterval = 0;
let statsIntervalID = null;
let MusicVol = 0.5;
let SfxVol = 0.5;
const music = document.getElementById("backgroundMusic");
const Sfx = document.getElementById("clickSound");

// Start playing music
music.play();

// Set volume (0.0 to 1.0)
music.volume = MusicVol;  // assume MusicVol is a float in [0, 1]
Sfx.volume = SfxVol; // assume SfxVol is a float in [0, 1]
/* =========================
   Number Formatting
========================= */
const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

function formatNumber(num, roundFn = Math.floor) {
  if (num < 1e3) return roundFn(num);
  let exponent = Math.floor(Math.log10(num) / 3);
  let shortNum = (num / Math.pow(10, exponent * 3)).toFixed(2);
  if (exponent < suffixes.length) return shortNum + suffixes[exponent];
  let baseSuffixIndex = exponent % suffixes.length;
  let tier = Math.floor(exponent / suffixes.length);
  return shortNum + suffixes[baseSuffixIndex] + 'x' + tier;
}

// format playcount from seconds to HH:MM:SS
function formatPlayTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/* =========================
   Tooltip Handling
========================= */
const tooltipBox = document.getElementById('tooltipBox');
const tooltipElements = document.querySelectorAll('.has-tooltip');

tooltipElements.forEach(el => {
  el.addEventListener('mousemove', e => {
    const offsetX = 12;
    const offsetY = 12;

    const tooltipRaw = el.getAttribute('data-tooltip');
    if (!tooltipRaw || tooltipRaw.trim() === '') {
      tooltipBox.style.display = 'none';
      return;
    }
  
    const tooltipText = tooltipRaw.replace(/\n/g, '<br>');
    tooltipBox.innerHTML = tooltipText;


    tooltipBox.style.left = '-9999px';
    tooltipBox.style.top = '-9999px';

    tooltipBox.style.display = 'block';
    tooltipBox.style.visibility = 'hidden';

    const tooltipWidth = tooltipBox.offsetWidth;
    const tooltipHeight = tooltipBox.offsetHeight;

    let x = e.pageX + offsetX;
    let y = e.pageY + offsetY;

    if (x + tooltipWidth > window.innerWidth) {
      x = window.innerWidth - tooltipWidth - 5;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - 5;
    }

    tooltipBox.style.left = x + 'px';
    tooltipBox.style.top = y + 'px';
    tooltipBox.style.visibility = 'visible';
  });

  el.addEventListener('mouseleave', () => {
    tooltipBox.style.display = 'none';
  });
});

/* =========================
   Floating Message
========================= */
function showFloatingMessage(text, x, y) {
  if (messageVisible) return;
  messageVisible = true;

  const msg = document.createElement('div');
  msg.textContent = text;
  msg.style.position = 'fixed';
  msg.style.left = x + 10 + 'px';
  msg.style.top = y + 10 + 'px';
  msg.style.background = 'rgba(0,0,0,0.7)';
  msg.style.color = 'white';
  msg.style.padding = '4px 8px';
  msg.style.borderRadius = '4px';
  msg.style.fontSize = '12px';
  msg.style.pointerEvents = 'none';
  msg.style.zIndex = 10000;
  msg.style.transition = 'opacity 0.5s ease';
  msg.style.opacity = '1';

  document.body.appendChild(msg);

  setTimeout(() => {
    msg.style.opacity = '0';
    setTimeout(() => {
      msg.remove();
      messageVisible = false;
    }, 500);
  }, 2000);
}

/* =========================
   Click Cursor Image + Text Animation
========================= */
const cursorImageCache = new Image();
cursorImageCache.src = 'Transparent_Check.png';

function showCursorImage(imgSrc, text, event) {
  let position = event.clientY - 35;
  
  // Create the container for the animation
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = `${event.clientX - 80}px`;
  container.style.top = `${position}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  // Use a clone of the preloaded image so each animation is separate
  const img = cursorImageCache.cloneNode();
  img.className = 'cursor-image';
  img.style.width = '64px';
  img.style.height = 'auto';
  img.style.verticalAlign = 'middle';
  img.style.marginRight = '6px';
  container.appendChild(img);

  // Add the text element
  const span = document.createElement('span');
  span.textContent = text;
  span.style.color = 'white';
  span.style.fontFamily = "'UnifrakturCook', Arial, sans-serif";
  span.style.fontSize = '18px';
  span.style.textShadow = '2px 2px 4px black';
  span.style.marginLeft = '47px';
  span.style.lineHeight = '60px';
  container.appendChild(span);

  // Animation
  let start = null;
  const duration = 500;
  const distance = 80;

  function animate(timestamp) {
    if (!start) start = timestamp;
    let progress = timestamp - start;
    let newY = position - (distance * (progress / duration));
    container.style.top = `${newY}px`;
    container.style.opacity = `${1 - (progress / duration)}`;

    if (progress < duration) {
      requestAnimationFrame(animate);
    } else {
      container.remove();
    }
  }

  requestAnimationFrame(animate);
}

/* =========================
   Unlock Visibility Logic
========================= */
function updateUnlockVisibility() {
  const q = id => document.getElementById(id);

  function setTooltip(el, text) {
    if (el) el.setAttribute("data-tooltip", text || "");
  }

  function toggleTab(id, visible) {
    const tab = q(id);
    if (tab) tab.style.display = visible && tab.style.display !== "none" ? "block" : "none";
  }

  let anyUpgradeVisible = false;
  for (const upg of upgrades) {
    const nameEl = q(`${upg.id}Name`);
    const tooltipEl = q(`${upg.id}Up`);
    if (!nameEl) continue;

    if (HighestSoulCount >= upg.baseCost * 0.6) {
      nameEl.innerHTML = upg.name;

      if (upg.level > 0) {
        let stat = "", tooltip = "";

        if (upg.sps) {
          const sps = upg.baseSps * upg.level * upg.multiplierSps * upg.prestigeMultiplierSps;
          const nextSps = upg.baseSps * (upg.level + 1) * upg.multiplierSps * upg.prestigeMultiplierSps;
          stat = ` (${formatNumber(sps)} SPS)`;
          tooltip = `Increases souls per second by ${formatNumber(nextSps - sps)}\nLore: ${upg.lore}`;
          nameEl.innerHTML += `<br class="SPSContribution">${stat}</br>`;
        } else if (upg.multiplier) {
          const spc = upg.baseMultiplier * upg.level * upg.multiplierMultiplier * upg.prestigeMultiplierMultiplier;
          const nextSpc = upg.baseMultiplier * (upg.level + 1) * upg.multiplierMultiplier * upg.prestigeMultiplierMultiplier;
          stat = ` (${formatNumber(spc)} SPC)`;
          tooltip = `Increases souls per click by ${formatNumber(nextSpc - spc)}\nLore: ${upg.lore}`;
          nameEl.innerHTML += `<br class="MultiplierContribution">${stat}</br>`;
        }

        setTooltip(tooltipEl, tooltip);
      }
      anyUpgradeVisible = true;
    } else {
      nameEl.innerHTML = "? ? ?";
    }
  }

  let anyEnhancerVisible = false;
  for (const enh of enhancers) {
    const nameEl = q(`${enh.id}Name`);
    const tooltipEl = q(`${enh.id}`);
    if (!nameEl) continue;

    if (HighestSoulCount >= enh.baseCost * 0.6) {
      nameEl.innerHTML = enh.name;
      const upg = upgrades.find(u => u.id === enh.upgEnhancer);

      if (enh.level > 0 && upg) {
        let tooltip = "";
        if (upg.sps) {
          const prevSps = upg.baseSps * (enh.level * 1.5) * (upg.prestigeMultiplierSps || 1);
          const currSps = upg.baseSps * ((enh.level + 1) * 1.5) * (upg.prestigeMultiplierSps || 1);
          tooltip = `${enh.prefix}\nSPS increase by ${formatNumber(currSps - prevSps)}\nLore: ${enh.lore}`;
        } else if (upg.multiplier) {
          const prevSpc = upg.baseMultiplier * (enh.level * 1.5) * (upg.prestigeMultiplierMultiplier || 1);
          const currSpc = upg.baseMultiplier * ((enh.level + 1) * 1.5) * (upg.prestigeMultiplierMultiplier || 1);
          tooltip = `${enh.prefix}\nSPC increase by ${formatNumber(currSpc - prevSpc)}\nLore: ${enh.lore}`;
        }
        setTooltip(tooltipEl, tooltip);
      }
      anyEnhancerVisible = true;
    } else {
      nameEl.innerHTML = "? ? ?";
    }
  }

  // Prestige tab unlock
  if (!prestigeTabUnlocked && HighestSoulCount >= 1_000_000) {
    prestigeTabUnlocked = true;
    const btn = q("togglePrestigeBtn");
    if (btn) {
      btn.classList.remove("has-tooltip");
      setTooltip(btn, "");
      btn.innerHTML = "Prestige";
    }
  }

  // Toggle buttons and tabs
  const enhBtn = q("toggleEnhancersBtn");
  if (enhBtn) enhBtn.style.display = anyEnhancerVisible ? "" : "none";

  toggleTab("enhancersTab", anyEnhancerVisible);
  toggleTab("prestigeTab", prestigeTabUnlocked);
}

/* =========================
   Game Logic and Stats Update
========================= */
function updateStats() {
  document.getElementById('soulCount').textContent = formatNumber(soulCount);
  document.getElementById('multiplierCount').textContent = formatNumber(multiplier);
  document.getElementById('spsCount').textContent = formatNumber(SPS);
  const prestigePointsEl = document.getElementById('prestigePoints');
  const prestigePointsPng = document.getElementById('prestigePNG');
  prestigePointsEl.textContent = `Prestige Points: ${formatNumber(prestigePoints)}`;
  if (prestigePointsEl) {
    if (prestigePoints > 0) {
      prestigePointsEl.style.display = 'block';
      prestigePointsPng.style.visibility = 'visible';
    } else {
      prestigePointsEl.style.display = 'none';
      prestigePointsPng.style.visibility = 'hidden';
    }
  }
}

function handleBackgroundClick(event) {
  Sfx.pause();
  Sfx.currentTime = 0; // Reset sound to start
  Sfx.play();
  showCursorImage('Transparent_Check.png', `+ ${formatNumber(multiplier)}`, event);
  soulCount += multiplier;
  allTimeTotalSouls += multiplier;
  updateStats();
}

function GameTick() {
  if (GameRunning) {
    soulCount += SPS;
    allTimeTotalSouls += SPS;
    playTime += 1; // Increment play time by 1 second
    if (soulCount > HighestSoulCount) {
      HighestSoulCount = soulCount;
    }
    if (soulCount > ThisPresHighestSoulCount) {
      ThisPresHighestSoulCount = soulCount;
    }
    updateStats();
    updateUnlockVisibility();
  }
}

/* =========================
   Prestige System
========================= */
function calculatePrestigePoints() {
  return Math.floor(ThisPresHighestSoulCount / 1_000_000);
}

function prestigeReset() {
  const gainedPoints = calculatePrestigePoints();
  if (gainedPoints <= 0) {
    alert('You need more souls to prestige!');
    return;
  }

  PrestigeLevel += 1;
  prestigePoints += gainedPoints;
  totalPrestigePoints += gainedPoints;

  ThisPresHighestSoulCount = 0;
  soulCount = 0;
  multiplier = 1;
  SPS = 0;

  enhancers.forEach(enh => { enh.level = 0; });
  upgrades.forEach(upg => {
    upg.level = 0;
    if ('prestigeMultiplierSps' in upg) upg.prestigeMultiplierSps = 0;
    if ('prestigeMultiplierMultiplier' in upg) upg.prestigeMultiplierMultiplier = 1;
    if ('multiplierSps' in upg) upg.multiplierSps = 1;
    if ('multiplierMultiplier' in upg) upg.multiplierMultiplier = 1;
  });

  updateStats();
  updateUpStats();
  recalculateAllEnhancers();
  updateEnhStats();

  applyPrestigeUpgrades();

  showFloatingMessage(`Prestiged! Gained ${gainedPoints} Prestige Points.`, window.innerWidth / 2, window.innerHeight / 2);
}

function applyPrestigeUpgrades() {
  prestigeUpgrades.forEach(prestigeUpg => {
    prestigeUpg.effect();
  });
  increaseMultiplier();
  increaseSPS();
}

function buyPrestigeUpgrade(id) {
  const pUpg = prestigeUpgrades.find(p => p.id === id);
  if (!pUpg) return;

  if (prestigePoints >= pUpg.cost && pUpg.level < pUpg.maxLevel) {
    prestigePoints -= pUpg.cost;
    pUpg.level++;
    pUpg.effect();
    updatePrestigeUI();
    increaseMultiplier();
    increaseSPS();
    showFloatingMessage(`Bought ${pUpg.name} level ${pUpg.level}`, window.innerWidth / 2, window.innerHeight / 2);
  } else {
    showFloatingMessage('Not enough Prestige Points or max level reached!', window.innerWidth / 2, window.innerHeight / 2);
  }
}

function updatePrestigeUI() {
  const prestigePointsEl = document.getElementById('prestigePoints');
  if (prestigePointsEl) prestigePointsEl.textContent = `Prestige Points: ${formatNumber(prestigePoints)}`;
}

/* =========================
   Increase Stats Functions
========================= */
function increaseMultiplier() {
  let total = 0;
  upgrades.forEach(upg => {
    if (upg.level > 0 && upg.multiplier) {
      total += upg.multiplier();
    }
  });
  multiplier = total + 1;
  updateStats();
}

function increaseSPS() {
  let total = 0;
  upgrades.forEach(upg => {
    if (upg.level > 0 && upg.sps) {
      total += upg.sps();
    }
  });
  SPS = total;
  updateStats();
}

/* =========================
   Helper Functions
========================= */
function enhanceUpgradeProd(upgradeid, amount) {
  const upgrade = upgrades.find(upg => upg.id === upgradeid);
  if (upgrade) {
    if ('multiplierSps' in upgrade) {
      upgrade.multiplierSps = amount;
    }
    if ('multiplierMultiplier' in upgrade) {
      upgrade.multiplierMultiplier = amount;
    }
    updateEnhStats();
    increaseMultiplier();
    increaseSPS();
  }
}

function spsFormula(upg) {
  if (upg.prestigeMultiplierSps && !(upg.prestigeMultiplierSps > 0)) {
    return upg.baseSps * upg.level * upg.multiplierSps;
  }
  else if (upg.prestigeMultiplierSps && upg.prestigeMultiplierSps > 0) {
    return upg.baseSps * upg.level * upg.multiplierSps * upg.prestigeMultiplierSps;
  }
  else {
    return upg.baseSps * upg.level * upg.multiplierSps;
  }
}

function prestigeEnhancer(upgradeid, baseUpgradeId) {
  let targetUpg = upgrades.find(u => u.id === upgradeid);
  let baseUpg = upgrades.find(u => u.id === baseUpgradeId);

  if (targetUpg && baseUpg) {
    prestigeUpgrades.forEach(pres => {
      if (pres.level > 0 && targetUpg.sps && baseUpg.level > 0) {
        targetUpg.prestigeMultiplierSps = pres.level * (baseUpg.level) * 2;
      }
      else if (pres.level > 0 && targetUpg.multiplier && baseUpg.level > 0) {
        targetUpg.prestigeMultiplierMultiplier = pres.level * (baseUpg.level);
      }
    });
  }
  updateEnhStats();
  increaseMultiplier();
  increaseSPS();
}

function recalculateAllPrestigeEnhancers() {
  prestigeEnhancer('MassCollection', 'MassCollection');
  prestigeEnhancer('WON', 'MassCollection');
  prestigeEnhancer('DAM', 'WON');
  prestigeEnhancer('BAW', 'DAM');
  prestigeEnhancer('Misfortune', 'BAW');
  prestigeEnhancer('FatherTime', 'Misfortune');
  prestigeEnhancer('Plague', 'FatherTime');
}

function recalculateAllEnhancers() {
  enhancers.forEach(enh => {
    const upgrade = upgrades.find(upg => upg.id === enh.id);
    if (upgrade) {
      upgrade.baseCost = enh.baseCost;
      upgrade.level = enh.level;
    }
  });
}

/* =========================
   Game Data Definitions
========================= */
// Upgrades
const upgrades = [
  {
    id: 'MassCollection',
    name: 'Mass Collection',
    lore: 'The Grim Reaper travels to big mass collections to manually harvest souls.',
    baseCost: 10,
    level: 0,
    prestigeMultiplierMultiplier: 1,
    multiplierMultiplier: 1,
    baseMultiplier: 1,
    multiplier: function () {
      return this.baseMultiplier * this.level * this.multiplierMultiplier * this.prestigeMultiplierMultiplier;
    },
    effect: function () {
      increaseMultiplier();
    }
  },
  {
    id: 'WON',
    name: 'Wrath of Nature',
    lore: 'The Grim Reaper exploits the wrath of nature to collect souls from those who succumb to its fury.',
    baseCost: 50,
    level: 0,
    prestigeMultiplierSps: 1,
    baseSps: 1,
    multiplierSps: 1,
    sps: function () {
      return spsFormula(this);
    },
    effect: function () {
      increaseSPS();
    }
  },
  {
    id: 'DAM',
    name: 'Despair & Madness',
    lore: "The Grim Reaper exploits human's despair and collects the souls of those who succumb to madness.",
    baseCost: 2500,
    level: 0,
    prestigeMultiplierSps: 1,
    baseSps: 10,
    multiplierSps: 1,
    sps: function () {
      return spsFormula(this);
    },
    effect: function () {
      increaseSPS();
    }
  },
  {
    id: 'BAW',
    name: 'Bloodshed & War',
    lore: "The Grim Reaper collects the souls of those lost in bloodshed and war.",
    baseCost: 125000,
    level: 0,
    prestigeMultiplierSps: 1,
    baseSps: 100,
    multiplierSps: 1,
    sps: function () {
      return spsFormula(this);
    },
    effect: function () {
      increaseSPS();
    }
  },
  {
    id: 'Misfortune',
    name: 'Misfortune',
    lore: "The Grim Reaper thrives on the misfortunes of others, collecting the souls of the unfortunate.",
    baseCost: 6250000,
    level: 0,
    prestigeMultiplierSps: 1,
    baseSps: 1000,
    multiplierSps: 1,
    sps: function () {
      return spsFormula(this);
    },
    effect: function () {
      increaseSPS();
    }
  },
  {
    id: 'FatherTime',
    name: 'Father Time',
    lore: "The Grim Reaper exploits the passage of time to collect souls from those who succumb to its flow.",
    baseCost: 31250000,
    level: 0,
    prestigeMultiplierSps: 1,
    baseSps: 10000,
    multiplierSps: 1,
    sps: function () {
      return spsFormula(this);
    },
    effect: function () {
      increaseSPS();
    }
  },
  {
    id: 'Plague',
    name: 'Plague & Pestilence',
    lore: "The Grim Reaper exploits the spread of diseases and plagues to collect souls from those who succumb to their effects.",
    baseCost: 156250000,
    level: 0,
    prestigeMultiplierSps: 1,
    baseSps: 100000,
    multiplierSps: 1,
    sps: function () {
      return spsFormula(this);
    },
    effect: function () {
      increaseSPS();
    }
  }
];

// Enhancers
const enhancers = [
  {
    id: 'EnhanceMassCollection',
    name: "Harverster's Culling",
    lore: "The Grim Reaper's harverster's culling techique allows for more efficient soul gathering.",
    prefix: "Increases the efficiency of Mass Collection by 1.5x per level.",
    upgEnhancer: 'MassCollection',
    baseCost: 1000,
    level: 0,
    effect: function () {
      enhanceUpgradeProd(this.upgEnhancer, this.level * 1.5);
    }
  },
  {
    id: 'EnhanceWON',
    name: "Nature's Reconing",
    lore: "The Grim Reaper's nature's reconing techique allows for more efficient soul gathering from natural disasters.",
    prefix: "Increases the efficiency of Wrath of Nature by 1.5x per level.",
    upgEnhancer: 'WON',
    baseCost: 5000,
    level: 0,
    effect: function () {
      enhanceUpgradeProd(this.upgEnhancer, this.level * 1.5);
    }
  },
  {
    id: 'EnhanceDAM',
    name: 'Call of the Void',
    lore: "The Grim Reaper's call of the void techique allows for more efficient soul gathering from the depths of despair.",
    prefix: "Increases the efficiency of Despair & Madness by 1.5x per level.",
    upgEnhancer: 'DAM',
    baseCost: 25000,
    level: 0,
    effect: function () {
      enhanceUpgradeProd(this.upgEnhancer, this.level * 1.5);
    }
  },
  {
    id: 'EnhanceBAW',
    name: 'Bloodlust',
    lore: "The Grim Reaper's bloodlust techique allows for more efficient soul gathering from the chaos of war.",
    prefix: "Increases the efficiency of Bloodshed & War by 1.5x per level.",
    upgEnhancer: 'BAW',
    baseCost: 125000,
    level: 0,
    effect: function () {
      enhanceUpgradeProd(this.upgEnhancer, this.level * 1.5);
    }
  },
  {
    id: 'EnhanceMisfortune',
    name: 'Unstable Karma',
    lore: "The Grim Reaper's unstable karma techique allows for more efficient soul gathering from the unfortunate.",
    prefix: "Increases the efficiency of Misfortune by 1.5x per level.",
    upgEnhancer: 'Misfortune',
    baseCost: 625000,
    level: 0,
    effect: function () {
      enhanceUpgradeProd(this.upgEnhancer, this.level * 1.5);
    }
  },
  {
    id: 'EnhanceFatherTime',
    name: 'Entropy',
    lore: "The Grim Reaper's entropy techique allows for more efficient soul gathering from the passage of time.",
    prefix: "Increases the efficiency of Father Time by 1.5x per level.",
    upgEnhancer: 'FatherTime',
    baseCost: 3125000,
    level: 0,
    effect: function () {
      enhanceUpgradeProd(this.upgEnhancer, this.level * 1.5);
    }
  },
  {
    id: 'EnhancePlague',
    name: 'Miasma',
    lore: "The Grim Reaper's miasma techique allows for more efficient soul gathering from the effects of disease.",
    prefix: "Increases the efficiency of Plague & Pestilence by 1.5x per level.",
    upgEnhancer: 'Plague',
    baseCost: 15625000,
    level: 0,
    effect: function () {
      enhanceUpgradeProd(this.upgEnhancer, this.level * 1.5);
    }
  }
];

// Prestige Upgrades
const prestigeUpgrades = [
  {
    id: 'BoostMassCollection',
    name: 'Mass Collection Boost',
    baseCost: 1,
    level: 0,
    maxLevel: 10,
    effect: function () {
      prestigeEnhancer('MassCollection', 'MassCollection');
    }
  },
  {
    id: 'BoostWON',
    name: 'WON Boost',
    baseCost: 1,
    level: 0,
    maxLevel: 10,
    effect: function () {
      prestigeEnhancer('WON', 'MassCollection');
    }
  },
  {
    id: 'BoostDAM',
    name: 'DAM Boost',
    baseCost: 3,
    level: 0,
    maxLevel: 10,
    effect: function () {
      prestigeEnhancer('DAM', 'WON');
    }
  },
  {
    id: 'BoostBAW',
    name: 'BAW Boost',
    baseCost: 5,
    level: 0,
    maxLevel: 10,
    effect: function () {
      prestigeEnhancer('BAW', 'DAM');
    }
  },
  {
    id: 'BoostMisfortune',
    name: 'Misfortune Boost',
    baseCost: 10,
    level: 0,
    maxLevel: 10,
    effect: function () {
      prestigeEnhancer('Misfortune', 'BAW');
    }
  },
  {
    id: 'BoostFatherTime',
    name: 'Father Time Boost',
    baseCost: 10,
    level: 0,
    maxLevel: 10,
    effect: function () {
      prestigeEnhancer('FatherTime', 'Misfortune');
    }
  },
  {
    id: 'BoostPlague',
    name: 'Plague Boost',
    baseCost: 10,
    level: 0,
    maxLevel: 10,
    effect: function () {
      prestigeEnhancer('Plague', 'FatherTime');
    }
  }
];

/* =========================
   Cost Calculations
========================= */
function getUpgradeCost(upg) {
  return upg.baseCost * Math.pow(1.5, upg.level);
}

function getEnhancerCost(enh) {
  return enh.baseCost * Math.pow(1.5, enh.level);
}

function getPrestigeCost(pres) {
  return pres.baseCost * Math.pow(10, pres.level);
}

/* =========================
   UI Updates for Upgrades, Enhancers, Prestige
========================= */
function updateUpStats() {
  upgrades.forEach(upg => {
    const costEl = document.getElementById(`SCost${upg.id}`);
    if (costEl) costEl.textContent = "Cost: " + formatNumber(Math.ceil(getUpgradeCost(upg))) + " Souls";

    const levelEl = document.getElementById(`${upg.id}UpLevel`);
    if (levelEl) levelEl.textContent = upg.level;

    const buttonEl = document.getElementById(upg.id);
    if (buttonEl) {
      buttonEl.disabled = soulCount < getUpgradeCost(upg);
    }
  });
}

function updateEnhStats() {
  enhancers.forEach(enh => {
    const costEl = document.getElementById(`SCost${enh.id}`);
    if (costEl) costEl.textContent = "Cost: " + formatNumber(Math.ceil(getEnhancerCost(enh))) + " Souls";

    const levelEl = document.getElementById(`${enh.id}Level`);
    if (levelEl) levelEl.textContent = enh.level;

    const buttonEl = document.getElementById(enh.id);
    if (buttonEl) {
      buttonEl.disabled = soulCount < getEnhancerCost(enh);
    }
  });
}

function updatePrestigeStats() {
  prestigeUpgrades.forEach(pres => {
    const costEl = document.getElementById(`SCost${pres.id}`);
    if (costEl) costEl.textContent = "Cost: " + formatNumber(Math.ceil(getPrestigeCost(pres))) + " Prestige Points";

    const levelEl = document.getElementById(`${pres.id}Level`);
    if (levelEl) levelEl.textContent = pres.level;

    const buttonEl = document.getElementById(pres.id);
    if (buttonEl) {
      buttonEl.disabled = prestigePoints < getPrestigeCost(pres);
    }
  });
}

/* =========================
   Buy Functions
========================= */
function buyUpgrade(upgradeId) {
  const upg = upgrades.find(u => u.id === upgradeId);
  if (!upg) return;

  const cost = getUpgradeCost(upg);
  if (soulCount >= cost) {
    soulCount -= cost;
    upg.level++;
    upg.effect();
    updateStats();
    updateUpStats();
  } else {
    showFloatingMessage('Not enough Souls!', window.innerWidth / 2, window.innerHeight / 2);
  }
}

function buyEnhancer(enhancerId) {
  const enh = enhancers.find(e => e.id === enhancerId);
  if (!enh) return;

  const cost = getEnhancerCost(enh);
  if (soulCount >= cost) {
    soulCount -= cost;
    enh.level++;
    enh.effect();
    updateStats();
    updateEnhStats();
  } else {
    showFloatingMessage('Not enough Souls!', window.innerWidth / 2, window.innerHeight / 2);
  }
}

function buyPrestige(prestigeId) {
  const pres = prestigeUpgrades.find(p => p.id === prestigeId);
  if (!pres) return;

  const cost = getPrestigeCost(pres);
  if (prestigePoints >= cost) {
    prestigePoints -= cost;
    pres.level++;
    pres.effect();
    updateStats();
    updatePrestigeStats();
  } else {
    showFloatingMessage('Not enough Prestige Points!', window.innerWidth / 2, window.innerHeight / 2);
  }
}

/* =========================
   Initialization & Event Listeners
========================= */
document.addEventListener('DOMContentLoaded', () => {
  // Initial UI update calls
  updateStats();
  updateUpStats();
  updateEnhStats();
  updatePrestigeStats();
  updatePrestigeUI();

  // Main click area
  const backgroundLayer = document.getElementById('backgroundLayer');
  if (backgroundLayer) backgroundLayer.onclick = handleBackgroundClick;

  // Toggle tab buttons
  const toggleUpgradeBtn = document.getElementById('toggleUpgradeBtn');
  const upgradeTab = document.getElementById('upgradeTab');
  const toggleEnhancersBtn = document.getElementById('toggleEnhancersBtn');
  const enhancersTab = document.getElementById('enhancersTab');
  const togglePrestigeBtn = document.getElementById('togglePrestigeBtn');
  const prestigeTab = document.getElementById('prestigeTab');
  const activateSettingsBtn = document.getElementById('ToggleSettingsBtn');
  const deactivateSettingsBtn = document.getElementById('SettingsX');
  const SettingsTab = document.getElementById('SettingsMenuBackground');
  const SettingsMenu = document.getElementById('SettingsStats')
  const defaultToggleBtn = document.getElementById('DefaultToggleBtn');
  const statsToggleBtn = document.getElementById('StatsToggleBtn');

  function showOnly(tab) {
    if (upgradeTab) upgradeTab.style.display = (tab === upgradeTab) ? 'block' : 'none';
    if (enhancersTab) enhancersTab.style.display = (tab === enhancersTab) ? 'block' : 'none';
    if (prestigeTab) prestigeTab.style.display = (tab === prestigeTab) ? 'block' : 'none';
  }
  function UpdateStatsMenu() {
    DebugInterval += 1
    SettingsMenu.innerHTML = `<br>Playtime: ${formatPlayTime(playTime)}</br><br>Highest Souls: ${formatNumber(HighestSoulCount)}</br><br>Total Souls Collected: ${allTimeTotalSouls}</br><br>Prestige Level: ${PrestigeLevel}</br>`;
  }
  function UpdateDefaultMenu() {
    SettingsMenu.innerHTML = `<br>Music:<input type="range" id="MusicSlider" min="0" max="1" step="0.01" value="${MusicVol}"></br><br>Sfx:<input type="range" id="SfxSlider" min="0" max="1" step="0.01" value="${SfxVol}"></br><br>Save/Load:<button id="SaveBtn">Save</button><button id="LoadBtn">Load</button></br>`;
    const Musicslider = document.getElementById("MusicSlider");
    if (Musicslider) {
      Musicslider.addEventListener("input", () => {
        MusicVol = parseFloat(Musicslider.value);
        music.volume = MusicVol;
    });
    const Sfxslider = document.getElementById("SfxSlider");
    if (Sfxslider) {
      Sfxslider.addEventListener("input", () => {
      SfxVol = parseFloat(Sfxslider.value);
      Sfx.volume = SfxVol;
      });
    }
    const saveBtn = document.getElementById('SaveBtn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const saveData = {
          soulCount,
          multiplier,
          SPS,
          prestigePoints,
          PrestigeLevel,
          allTimeTotalSouls,
          HighestSoulCount,
          ThisPresHighestSoulCount,
          playTime,
          MusicVol,
          SfxVol,
          upgrades: upgrades.map(upg => ({ id: upg.id, level: upg.level })),
          enhancers: enhancers.map(enh => ({ id: enh.id, level: enh.level })),
          prestigeUpgrades: prestigeUpgrades.map(pres => ({ id: pres.id, level: pres.level }))
        };
        localStorage.setItem('grimReaperClickerSave', JSON.stringify(saveData));
        showFloatingMessage('Game saved!', window.innerWidth / 2, window.innerHeight / 2);
      };
    }
    const loadBtn = document.getElementById('LoadBtn');
    if (loadBtn) {
      loadBtn.onclick = () => {
        const saveData = localStorage.getItem('grimReaperClickerSave');
        if (saveData) {
          const data = JSON.parse(saveData);
          soulCount = data.soulCount || 0;
          multiplier = data.multiplier || 1;
          SPS = data.SPS || 0;
          prestigePoints = data.prestigePoints || 0;
          PrestigeLevel = data.PrestigeLevel || 0;
          allTimeTotalSouls = data.allTimeTotalSouls || 0;
          HighestSoulCount = data.HighestSoulCount || 0;
          ThisPresHighestSoulCount = data.ThisPresHighestSoulCount || 0;
          playTime = data.playTime || 0;
          MusicVol = data.MusicVol || 1;
          SfxVol = data.SfxVol || 1;

          upgrades.forEach(upg => {
            const savedUpg = data.upgrades.find(u => u.id === upg.id);
            if (savedUpg) upg.level = savedUpg.level || 0;
          });
          enhancers.forEach(enh => {
            const savedEnh = data.enhancers.find(e => e.id === enh.id);
            if (savedEnh) enh.level = savedEnh.level || 0;
          });
          prestigeUpgrades.forEach(pres => {
            const savedPres = data.prestigeUpgrades.find(p => p.id === pres.id);
            if (savedPres) pres.level = savedPres.level || 0;
          });

          updateStats();
          updateUpStats();
          updateEnhStats();
          updatePrestigeStats();
          showFloatingMessage('Game loaded!', window.innerWidth / 2, window.innerHeight / 2);
        } else {
          showFloatingMessage('No save found!', window.innerWidth / 2, window.innerHeight / 2);
        }
      };
    }
  }
  }
  if (defaultToggleBtn) defaultToggleBtn.onclick = () => {
      clearInterval(statsIntervalID);
      UpdateDefaultMenu();
  }
  if (statsToggleBtn) statsToggleBtn.onclick = () => {
      UpdateStatsMenu();
      statsIntervalID = setInterval(UpdateStatsMenu,500);
  }
  if (activateSettingsBtn) activateSettingsBtn.onclick = () => {
      UpdateDefaultMenu();
      SettingsTab.style.display = 'block';
  };
  if (deactivateSettingsBtn) deactivateSettingsBtn.onclick = () => {
      if (statsIntervalID !== null) {
        clearInterval(statsIntervalID);
      }
      SettingsTab.style.display = 'none'
  };
  if (toggleUpgradeBtn) toggleUpgradeBtn.onclick = () => {
    if (upgradeTab.style.display === 'block') {
      upgradeTab.style.display = 'none';
    } else {
      showOnly(upgradeTab);
    }
  };

  if (toggleEnhancersBtn) toggleEnhancersBtn.onclick = () => {
    if (enhancersTab.style.display === 'block') {
      enhancersTab.style.display = 'none';
    } else {
      showOnly(enhancersTab);
    }
  };

  if (togglePrestigeBtn) togglePrestigeBtn.onclick = () => {
    if (prestigeTab.style.display === 'block') {
      prestigeTab.style.display = 'none';
    } else if (prestigeTabUnlocked) {
      showOnly(prestigeTab);
    }
  };

  // Prestige reset button
  const prestigeResetBtn = document.getElementById('prestigeResetBtn');
  if (prestigeResetBtn) prestigeResetBtn.onclick = prestigeReset;

  // Soul click button
  const soulBtn = document.getElementById('soulButton');
  if (soulBtn) soulBtn.onclick = handleBackgroundClick;

  // Upgrade buttons
  upgrades.forEach(upg => {
    const btn = document.getElementById(`${upg.id}Up`);
    if (btn) btn.onclick = (e) => {
      const cost = getUpgradeCost(upg);
      if (soulCount >= cost) {
        soulCount -= cost;
        upg.level++;
        upg.effect();
        updateUpStats();
        updateStats();
        recalculateAllPrestigeEnhancers();
      } else {
        showFloatingMessage('Not enough souls!', e.clientX, e.clientY);
      }
    };
  });

  // Enhancer buttons
  enhancers.forEach(enh => {
    const btn = document.getElementById(enh.id);
    if (btn) btn.onclick = (e) => {
      const cost = getEnhancerCost(enh);
      if (soulCount >= cost) {
        soulCount -= cost;
        enh.level++;
        enh.effect();
        updateEnhStats();
        updateStats();
        updateUpStats();
        recalculateAllPrestigeEnhancers();
      } else {
        showFloatingMessage('Not enough souls!', e.clientX, e.clientY);
      }
    };
  });

  // Prestige buttons
  prestigeUpgrades.forEach(pres => {
    const btn = document.getElementById(pres.id);
    if (btn) btn.onclick = (e) => {
      const cost = getPrestigeCost(pres);
      if (prestigePoints >= cost) {
        prestigePoints -= cost;
        pres.level++;
        pres.effect();
        updateStats();
        updateUpStats();
        updatePrestigeStats();
        updatePrestigeUI();
      } else {
        showFloatingMessage('Not enough Prestige Points!', e.clientX, e.clientY);
      }
    };
  });
});


