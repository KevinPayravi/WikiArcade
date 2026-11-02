const TAG_LABELS = {
  "wikigamejam-nyc-2025": "NYC '25",
  "wikigamejam-sf-2026": "SF '26",
};

class ViewManager {
  constructor() {
    this.currentView = "grid";
    this.views = {
      tabs: document.getElementById("viewTabs"),
      marquee: document.getElementById("gridMarquee"),
      grid: document.getElementById("gridView"),
      scroll: document.getElementById("scrollView"),
      arcade: document.getElementById("arcadeCabinet"),
    };

    this.setupTabs();
    this.showView("grid");
  }

  setupTabs() {
    if (!this.views.tabs) return;

    this.views.tabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".view-tab");
      if (!tab) return;
      this.showView(tab.dataset.view);
    });
  }

  showView(viewName) {
    if (!["grid", "scroll", "arcade"].includes(viewName)) return;
    if (this.currentView === viewName) return;

    this.currentView = viewName;

    const isArcade = viewName === "arcade";
    // Header stays visible in all views
    if (this.views.marquee) this.views.marquee.style.display = "block";
    this.views.grid.style.display = viewName === "grid" ? "block" : "none";
    this.views.scroll.style.display = viewName === "scroll" ? "block" : "none";
    this.views.arcade.style.display = isArcade ? "flex" : "none";
    document.body.style.overflow = isArcade ? "hidden" : "auto";
    document.body.classList.toggle("arcade-mode", isArcade);

    window.wikiGamesArcade?.ensureViewBuilt(viewName);

    // Scroll to top
    if (!isArcade) {
      requestAnimationFrame(() => {
        const bodyPaddingTop =
          parseFloat(getComputedStyle(document.body).paddingTop) || 0;
        window.scrollTo({ top: -bodyPaddingTop, behavior: "smooth" });
      });
    } else {
      // Re-position cards once cabinet is sized
      requestAnimationFrame(() => {
        window.wikiGamesArcade?.positionArcadeCards();
      });
    }

    // Update tab highlights
    if (!this.tabElements) {
      this.tabElements = this.views.tabs?.querySelectorAll(".view-tab");
    }
    this.tabElements?.forEach((tab) => {
      tab.classList.toggle("view-tab-active", tab.dataset.view === viewName);
    });
  }
}

class WikiGamesArcade {
  constructor() {
    this.games = [];
    this.selectedIndex = 0;
    this.credits = 3;
    this.isPowered = true;
    this.resizeTimer = null;

    this.getElements();
    this.loadGames();
  }

  getElements() {
    this.gameCards = document.getElementById("gameCards");
    this.gamesGrid = document.getElementById("gamesGrid");
    this.gameList = document.getElementById("gameList");
    this.gamePreview = document.getElementById("gamePreview");
    this.selectedGameTitle = document.getElementById("selectedGameTitle");
    this.gameDescription = document.getElementById("gameDescription");
    this.scrollGameAuthor = document.getElementById("scrollGameAuthor");
    this.gameStatus = document.getElementById("gameStatus");
    this.navUp = document.getElementById("navUp");
    this.navDown = document.getElementById("navDown");
    this.arcadeLeft = document.getElementById("arcadeLeft");
    this.arcadeRight = document.getElementById("arcadeRight");
    this.arcadePlay = document.getElementById("arcadePlay");
    this.powerButton = document.getElementById("powerButton");
    this.coinSlot = document.getElementById("coinSlot");
    this.creditsDisplay = document.querySelector(".credits-display");
    this.insertCoinOverlay = document.getElementById("insertCoinOverlay");
    this.filterControls = document.getElementById("filterControls");
    this.arcadeView = document.getElementById("arcadeCabinet");
    this.cabinet = document.querySelector(".arcade-cabinet");
  }

  async loadGames() {
    try {
      const response = await fetch("games.json");
      const data = await response.json();
      const availableGames = data.games.filter((g) => g.status === "available");
      this.games = this.shuffleArray(availableGames);
      this.allGames = [...this.games];
      this.currentFilter = "all";
      this.mobileFilterActive = false;

      this.buildGridView();
      this.ensureViewBuilt(window.viewManager.currentView);
      this.setupControls();
      this.setupFilters();
      this.updateCredits();
      this.selectGame(0);
    } catch (error) {
      console.error("Failed to load games:", error);
      this.showError();
    }
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getCircularIndex(index) {
    const length = this.games.length;
    return ((index % length) + length) % length;
  }

  ensureViewBuilt(viewName) {
    // Until games load, keep the loading or error message in place
    if (this.games.length === 0) return;

    if (viewName === "scroll" && !this.scrollViewBuilt) {
      this.buildScrollView();
      this.scrollViewBuilt = true;
    } else if (viewName === "arcade" && !this.arcadeViewBuilt) {
      this.buildArcadeView();
      this.arcadeViewBuilt = true;
    }
  }

  buildArcadeView() {
    if (!this.gameCards) return;

    this.gameCards.innerHTML = "";

    const fragment = document.createDocumentFragment();

    this.games.forEach((game, i) => {
      const card = document.createElement("div");
      card.className = "arcade-game-card";
      card.dataset.index = i;

      const emoji = game.emoji
        ? `<span class="game-emoji">${game.emoji}</span> `
        : "";
      const author = game.author
        ? `<div class="arcade-game-card-author">By ${game.author}</div>`
        : "";

      card.innerHTML = `
                <img class="arcade-game-card-image" src="assets/previews/${game.preview}" alt="${game.name} Preview" loading="lazy">
                <div class="arcade-game-card-title">
                    ${emoji}<span>${game.name}</span>
                </div>
                <div class="arcade-game-card-description">${game.description}</div>
                ${author}
            `;

      fragment.appendChild(card);
    });

    this.gameCards.appendChild(fragment);

    if (!this.arcadeCardsDelegated) {
      this.gameCards.addEventListener("click", (e) => {
        const card = e.target.closest(".arcade-game-card");
        if (!card) return;

        const i = parseInt(card.dataset.index);
        if (this.selectedIndex === i) {
          this.playGame(this.games[i]);
        } else {
          this.selectGame(i);
        }
      });
      this.arcadeCardsDelegated = true;
    }

    this.positionArcadeCards();
  }

  positionArcadeCards() {
    if (!this.gameCards) return;

    const cards = this.gameCards.children;
    if (cards.length === 0) return;

    const selectedIdx = this.selectedIndex;
    const isFullScreen = document.body.classList.contains("arcade-mode");
    let offsetPerCard = 100;
    if (isFullScreen) {
      const containerW = this.gameCards.offsetWidth;
      const cardW = cards[0].offsetWidth;
      if (containerW > 0 && cardW > 0) {
        // Show peek of adjacent card
        const peek = Math.max(40, cardW * 0.22);
        offsetPerCard = Math.round((containerW + cardW) / 2 - peek);
      } else {
        offsetPerCard = 520;
      }
    }

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const distance = i - selectedIdx;
      const isSelected = i === selectedIdx;

      card.style.setProperty("--card-offset", distance * offsetPerCard);
      card.style.setProperty("--card-scale", isSelected ? 1 : 0.85);
      card.style.zIndex = isSelected ? 10 : Math.max(0, 5 - Math.abs(distance));
      card.classList.toggle("selected", isSelected);
    }
  }

  buildScrollView() {
    if (!this.gameList) return;

    this.gameList.innerHTML = "";

    const fragment = document.createDocumentFragment();

    this.games.forEach((game, i) => {
      const item = document.createElement("div");
      item.className = "game-item";
      item.dataset.index = i;

      const emoji = game.emoji
        ? `<span class="game-emoji">${game.emoji}</span>`
        : "";
      const subtitle = game.subtitle || game.description;
      item.innerHTML = `
                <div class="game-item-main">
                  <div class="game-name">${emoji}<span>${game.name}</span></div>
                  <div class="game-subtitle">${subtitle}</div>
                </div>
            `;

      fragment.appendChild(item);
    });

    this.gameList.appendChild(fragment);

    if (!this.scrollItemsDelegated) {
      this.gameList.addEventListener("click", (e) => {
        const item = e.target.closest(".game-item");
        if (!item) return;

        const i = parseInt(item.dataset.index);
        this.selectGame(i);
      });

      this.scrollItemsDelegated = true;
    }

    this.positionScrollItems();
  }

  positionScrollItems() {
    if (!this.gameList) return;

    const items = this.gameList.children;
    if (items.length === 0) return;

    const gameCount = this.games.length;
    const visibleCount = 5;
    const halfVisible = Math.floor(visibleCount / 2);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let distance = i - this.selectedIndex;
      if (distance > gameCount / 2) distance -= gameCount;
      if (distance < -gameCount / 2) distance += gameCount;

      item.style.setProperty("--distance", distance);

      const isHidden = Math.abs(distance) > halfVisible;
      item.style.opacity = isHidden ? "0" : "";
      item.style.pointerEvents = isHidden ? "none" : "";

      item.classList.toggle("selected", i === this.selectedIndex);
    }

    this.updatePreview();
  }

  updatePreview() {
    const game = this.games[this.selectedIndex];
    if (!game || !this.gamePreview) return;

    const preview = this.gamePreview;
    const newSrc = `assets/previews/${game.preview}`;
    preview.classList.add("preview-changing");
    clearTimeout(this._previewFadeTimer);
    this._previewFadeTimer = setTimeout(() => {
      preview.src = newSrc;
      preview.alt = `${game.name} Preview`;
      const onDone = () => {
        preview.classList.remove("preview-changing");
        preview.removeEventListener("load", onDone);
        preview.removeEventListener("error", onDone);
      };
      preview.addEventListener("load", onDone);
      preview.addEventListener("error", onDone);
      if (preview.complete && preview.naturalWidth > 0) onDone();
    }, 130);

    if (this.selectedGameTitle) {
      const emoji = game.emoji
        ? `<span class="game-emoji">${game.emoji}</span> `
        : "";
      this.selectedGameTitle.innerHTML = `${emoji}<span>${game.name}</span>`;
    }
    if (this.gameDescription)
      this.gameDescription.textContent = game.description;

    if (this.scrollGameAuthor)
      this.scrollGameAuthor.textContent = game.author
        ? `By ${game.author}`
        : "";

    if (this.gameStatus) {
      this.gameStatus.textContent = "Press Start";
      this.gameStatus.className = "game-status";
      this.gameStatus.onclick = () => this.playGame(game);
    }

    preview.style.cursor = "pointer";
    preview.onclick = () => this.playGame(game);
  }

  playGame(game = null) {
    const targetGame = game || this.games[this.selectedIndex];
    if (!targetGame) return;

    const inArcadeMode =
      this.arcadeView && this.arcadeView.style.display !== "none";

    if (inArcadeMode) {
      if (!this.isPowered) return;

      if (this.credits <= 0) {
        this.showInsertCoinOverlay();
        this.highlightCoinSlot();
        return;
      }

      this.credits--;
      this.updateCredits();

      if (this.credits === 0) {
        setTimeout(() => {
          this.highlightCoinSlot();
          this.showInsertCoinOverlay();
        }, 500);
      }
    }

    if (targetGame.url) {
      window.open(targetGame.url, "_blank");
    }
  }

  buildGridView() {
    if (!this.gamesGrid) return;

    this.gamesGrid.innerHTML = "";

    const fragment = document.createDocumentFragment();

    this.allGames.forEach((game, i) => {
      const card = document.createElement("a");
      card.className = "grid-arcade-game-card";
      card.href = game.url;
      card.target = "_blank";
      card.rel = "noopener";
      card.setAttribute("aria-label", `Play ${game.name}`);
      if (game.tags && game.tags.length > 0) {
        card.dataset.tags = game.tags.join(",");
      }

      const emoji = game.emoji
        ? `<span class="game-emoji">${game.emoji}</span> `
        : "";
      const author = game.author
        ? `<div class="grid-game-author">By ${game.author}</div>`
        : "";

      let tagsHtml = "";
      if (game.tags && game.tags.length > 0) {
        const tagSpans = game.tags.map((tag) => {
          const label = TAG_LABELS[tag] || tag;
          return `<span class="tag" data-tag="${tag}">${label}</span>`;
        });
        tagsHtml = `<div class="game-tags">${tagSpans.join("")}</div>`;
      }

      const imgLoading = i < 6 ? "eager" : "lazy";

      card.innerHTML = `
                <div class="grid-game-image-wrap">
                    <img class="grid-game-image" src="assets/previews/${game.preview}" alt="" loading="${imgLoading}">
                </div>
                <div class="grid-game-body">
                    <div class="grid-game-title">${emoji}<span>${game.name}</span></div>
                    <div class="grid-game-description">${game.description}</div>
                    ${tagsHtml}
                </div>
                ${author}
            `;

      fragment.appendChild(card);
    });

    this.gamesGrid.appendChild(fragment);

    this.filterGridView();
  }

  filterGridView() {
    if (!this.gamesGrid) return;

    const cards = this.gamesGrid.querySelectorAll(".grid-arcade-game-card");
    let visibleCount = 0;

    cards.forEach((card) => {
      const tags = card.dataset.tags ? card.dataset.tags.split(",") : [];
      const passesCategory =
        this.currentFilter === "all" || tags.includes(this.currentFilter);
      const passesMobile = !this.mobileFilterActive || tags.includes("mobile");
      const visible = passesCategory && passesMobile;

      card.style.display = visible ? "" : "none";
      if (visible) visibleCount++;
    });

    // Show/hide no-results message
    let noResults = this.gamesGrid.querySelector(".no-results");
    if (visibleCount === 0) {
      if (!noResults) {
        noResults = document.createElement("div");
        noResults.className = "no-results";
        noResults.innerHTML = `
                    <p>No games found</p>
                    <p>Try another category.</p>
                `;
        this.gamesGrid.appendChild(noResults);
      }
    } else if (noResults) {
      noResults.remove();
    }
  }

  setupFilters() {
    if (!this.filterControls) return;

    const filterInputs = this.filterControls.querySelectorAll(
      'input[name="gameFilter"]',
    );
    filterInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.currentFilter = e.target.value;
          this.filterGridView();
          // On phones the pills scroll sideways; keep the chosen one in view
          e.target.labels[0].scrollIntoView({
            block: "nearest",
            inline: "nearest",
          });
        }
      });
    });

    const mobileToggle = this.filterControls.querySelector(
      'input[name="mobileFilter"]',
    );
    if (mobileToggle) {
      mobileToggle.addEventListener("change", (e) => {
        this.mobileFilterActive = e.target.checked;
        this.filterGridView();
      });
    }
  }

  selectGame(index) {
    if (index < 0 || index >= this.games.length) return;

    // Throttle rapid selections
    if (this.isTransitioning) return;

    this.selectedIndex = index;
    this.isTransitioning = true;

    this.positionArcadeCards();
    this.positionScrollItems();
    this.updateButtons();

    setTimeout(() => {
      this.isTransitioning = false;
    }, 150);
  }

  updateButtons() {
    [this.arcadeLeft, this.arcadeRight, this.arcadePlay].forEach((btn) => {
      if (btn) btn.disabled = !this.isPowered;
    });
  }

  move(direction) {
    let newIndex = this.selectedIndex;

    if (direction === "prev") {
      newIndex = this.getCircularIndex(this.selectedIndex - 1);
    } else if (direction === "next") {
      newIndex = this.getCircularIndex(this.selectedIndex + 1);
    }

    this.selectGame(newIndex);
  }

  setupControls() {
    // Arcade buttons
    this.arcadeLeft?.addEventListener("click", () => {
      if (this.isPowered) this.move("prev");
    });

    this.arcadeRight?.addEventListener("click", () => {
      if (this.isPowered) this.move("next");
    });

    this.arcadePlay?.addEventListener("click", () => {
      if (this.isPowered) this.playGame();
    });

    // Power and coin
    this.powerButton?.addEventListener("click", () => this.togglePower());
    this.coinSlot?.addEventListener("click", () => this.addCoin());

    // Scroll view buttons
    this.navUp?.addEventListener("click", () => this.move("prev"));
    this.navDown?.addEventListener("click", () => this.move("next"));

    // Mouse wheel navigation for scroll view
    const scrollViewEl = document.getElementById("scrollView");
    if (scrollViewEl) {
      scrollViewEl.addEventListener(
        "wheel",
        (e) => {
          if (window.viewManager?.currentView !== "scroll") return;
          e.preventDefault();
          if (e.deltaY > 0 || e.deltaX > 0) this.move("next");
          else this.move("prev");
        },
        { passive: false },
      );
    }

    // Touch swipe for scroll view game list
    if (this.gameList) {
      let svTouchStartX = 0;
      let svTouchStartY = 0;

      this.gameList.addEventListener(
        "touchstart",
        (e) => {
          svTouchStartX = e.touches[0].clientX;
          svTouchStartY = e.touches[0].clientY;
        },
        { passive: true },
      );

      this.gameList.addEventListener(
        "touchend",
        (e) => {
          const dx = e.changedTouches[0].clientX - svTouchStartX;
          const dy = e.changedTouches[0].clientY - svTouchStartY;
          // Vertical swipe on desktop layout, horizontal on mobile
          if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx) * 1.2) {
            if (dy < 0) this.move("next");
            else this.move("prev");
          } else if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            if (dx < 0) this.move("next");
            else this.move("prev");
          }
        },
        { passive: true },
      );
    }

    // Keyboard controls
    document.addEventListener("keydown", (e) => this.handleKeys(e));
    window.addEventListener("resize", () => this.handleResize(), {
      passive: true,
    });

    // Touch swipe
    if (this.gameCards) {
      let touchStartX = 0;
      let touchStartY = 0;

      this.gameCards.addEventListener(
        "touchstart",
        (e) => {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        },
        { passive: true },
      );

      this.gameCards.addEventListener(
        "touchend",
        (e) => {
          if (!this.isPowered) return;
          const dx = e.changedTouches[0].clientX - touchStartX;
          const dy = e.changedTouches[0].clientY - touchStartY;
          // Horizontal swipes only
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) this.move("next");
            else this.move("prev");
          }
        },
        { passive: true },
      );
    }
  }

  handleKeys(e) {
    const key = e.key;

    if (key === "c" || key === "C") {
      this.addCoin();
      return;
    }
    if (key === "p" || key === "P") {
      this.togglePower();
      return;
    }

    const view = window.viewManager?.currentView;
    if (view !== "arcade" && view !== "scroll") return;

    const inArcade = view === "arcade";
    const canMove = !inArcade || this.isPowered;

    if (key === "ArrowUp" || key === "ArrowLeft") {
      e.preventDefault();
      if (inArcade) this.pressButton("left");
      if (canMove) this.move("prev");
    } else if (key === "ArrowDown" || key === "ArrowRight") {
      e.preventDefault();
      if (inArcade) this.pressButton("right");
      if (canMove) this.move("next");
    } else if (key === "Enter" || key === " ") {
      if (e.target.closest("button, a, input")) return;
      e.preventDefault();
      if (inArcade) this.pressButton("play");
      if (this.isPowered) this.playGame();
    }
  }

  handleResize() {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);

    this.resizeTimer = setTimeout(() => {
      const view = window.viewManager?.currentView;
      if (view === "arcade") {
        this.positionArcadeCards();
      } else if (view === "scroll") {
        this.positionScrollItems();
      }
      this.resizeTimer = null;
    }, 150);
  }

  pressButton(type) {
    const buttons = {
      left: this.arcadeLeft,
      right: this.arcadeRight,
      play: this.arcadePlay,
    };

    const button = buttons[type];
    if (button && !button.disabled) {
      button.classList.add("button-pressed");
      setTimeout(() => {
        button.classList.remove("button-pressed");
      }, 150);
    }
  }

  showError() {
    const errorMsg = `
            <div class="no-results">
                <p>Game over</p>
                <p>The games couldn't load. Refresh the page to continue.</p>
            </div>
        `;

    for (const el of [this.gameCards, this.gamesGrid, this.gameList]) {
      if (el) el.innerHTML = errorMsg;
    }
  }

  togglePower() {
    this.isPowered = !this.isPowered;

    if (this.isPowered) {
      this.cabinet?.classList.remove("powered-off");
      this.powerButton?.classList.remove("off");

      if (this.credits === 0) {
        setTimeout(() => {
          this.highlightCoinSlot();
          this.showInsertCoinOverlay();
        }, 500);
      }
    } else {
      this.cabinet?.classList.add("powered-off");
      this.powerButton?.classList.add("off");
      this.coinSlot?.classList.remove("needs-coins");
      this.hideInsertCoinOverlay();
    }

    this.updateButtons();
  }

  showInsertCoinOverlay() {
    if (!this.insertCoinOverlay) return;
    this.insertCoinOverlay.classList.add("visible");
    this.insertCoinOverlay.setAttribute("aria-hidden", "false");
  }

  hideInsertCoinOverlay() {
    if (!this.insertCoinOverlay) return;
    this.insertCoinOverlay.classList.remove("visible");
    this.insertCoinOverlay.setAttribute("aria-hidden", "true");
  }

  addCoin() {
    if (!this.isPowered) return;

    this.credits++;
    this.updateCredits(true);
    this.coinSlot?.classList.remove("needs-coins");
    this.hideInsertCoinOverlay();

    // Flash insert effect
    this.coinSlot?.classList.remove("coin-inserted");
    requestAnimationFrame(() => {
      this.coinSlot?.classList.add("coin-inserted");
      setTimeout(() => this.coinSlot?.classList.remove("coin-inserted"), 500);
    });
  }

  highlightCoinSlot() {
    this.coinSlot?.classList.add("needs-coins");
  }

  updateCredits(flash = false) {
    if (!this.creditsDisplay) return;

    this.creditsDisplay.textContent = `Credits: ${this.credits}`;
    if (flash) {
      this.creditsDisplay.classList.remove("credits-flash");
      void this.creditsDisplay.offsetWidth;
      this.creditsDisplay.classList.add("credits-flash");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.viewManager = new ViewManager();
  window.wikiGamesArcade = new WikiGamesArcade();
  initSpaceMarquee();
});

function initSpaceMarquee() {
  const starsEl = document.getElementById("spaceStars");
  if (!starsEl) return;

  // Build randomised star field
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 140; i++) {
    const star = document.createElement("div");
    const size = 0.4 + Math.random() * 2.2;
    const opacity = 0.2 + Math.random() * 0.75;

    star.className = "space-star";
    star.style.cssText =
      `left:${(Math.random() * 100).toFixed(2)}%;` +
      `top:${(Math.random() * 100).toFixed(2)}%;` +
      `width:${size.toFixed(2)}px;height:${size.toFixed(2)}px;` +
      `opacity:${opacity.toFixed(2)};`;

    frag.appendChild(star);
  }
  starsEl.appendChild(frag);
}
