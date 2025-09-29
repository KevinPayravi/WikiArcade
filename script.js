class ViewManager {
    constructor() {
        this.currentView = 'grid';
        this.views = {
            tabs: document.getElementById('viewTabs'),
            grid: document.getElementById('gridView'),
            scroll: document.getElementById('scrollView'),
            arcade: document.getElementById('arcadeCabinet')
        };
        
        this.setupTabs();
        this.showView('grid');
    }
    
    setupTabs() {
        const tabs = this.views.tabs?.querySelectorAll('.view-tab');
        if (!tabs) return;
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.showView(tab.dataset.view);
            });
        });
    }
    
    showView(viewName) {
        if (!['grid', 'scroll', 'arcade'].includes(viewName)) return;

        this.currentView = viewName;
        
        // Hide all views
        this.views.grid.style.display = 'none';
        this.views.scroll.style.display = 'none';
        this.views.arcade.style.display = 'none';
        
        // Show selected view
        if (viewName === 'arcade') {
            this.views.arcade.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            this.views[viewName].style.display = 'block';
            document.body.style.overflow = 'auto';
        }

        // Scroll-to-top on view change
        requestAnimationFrame(() => {
            setTimeout(() => {
                const bodyPaddingTop = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
                window.scrollTo({ 
                    top: -bodyPaddingTop, 
                    behavior: 'smooth' 
                });
            }, 0);
        });
        
        // Update tab highlighting
        const tabs = this.views.tabs?.querySelectorAll('.view-tab');
        tabs?.forEach(tab => {
            tab.classList.toggle('view-tab-active', tab.dataset.view === viewName);
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
        this.gameCards = document.getElementById('gameCards');
        this.gamesGrid = document.getElementById('gamesGrid');
        this.gameList = document.getElementById('gameList');
        this.gamePreview = document.getElementById('gamePreview');
        this.selectedGameTitle = document.getElementById('selectedGameTitle');
        this.gameDescription = document.getElementById('gameDescription');
        this.gameStatus = document.getElementById('gameStatus');
        this.navUp = document.getElementById('navUp');
        this.navDown = document.getElementById('navDown');
        this.arcadeLeft = document.getElementById('arcadeLeft');
        this.arcadeRight = document.getElementById('arcadeRight');
        this.arcadePlay = document.getElementById('arcadePlay');
        this.powerButton = document.getElementById('powerButton');
        this.coinSlot = document.getElementById('coinSlot');
        this.creditsDisplay = document.querySelector('.credits-display');
    }

    async loadGames() {
        try {
            const response = await fetch('games.json');
            const data = await response.json();
            this.games = this.shuffleArray(data.games);
            
            this.buildAllViews();
            this.setupControls();
            this.updateCredits();
            this.selectGame(0);
        } catch (error) {
            console.error('Failed to load games:', error);
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
    
    buildAllViews() {
        this.buildArcadeView();
        this.buildGridView();
        this.buildScrollView();
    }

    buildArcadeView() {
        if (!this.gameCards) return;
        
        this.gameCards.innerHTML = '';
        
        this.games.forEach((game, i) => {
            const card = document.createElement('div');
            card.className = 'arcade-game-card';
            card.dataset.index = i;
            
            const emoji = game.emoji ? `<span class="game-emoji">${game.emoji}</span> ` : '';
            const author = game.author ? `<div class="arcade-game-card-author">by ${game.author}</div>` : '';
            
            card.innerHTML = `
                <img class="arcade-game-card-image" src="assets/previews/${game.preview}" alt="${game.name} Preview">
                <div class="arcade-game-card-title">
                    ${emoji}<span class="game-name">${game.name}</span>
                </div>
                <div class="arcade-game-card-description">${game.description}</div>
                ${author}
            `;
            
            card.addEventListener('click', () => {
                if (this.selectedIndex === i) {
                    this.playGame(game);
                } else {
                    this.selectGame(i);
                }
            });
            this.gameCards.appendChild(card);
        });
        
        this.positionArcadeCards();
    }

    positionArcadeCards() {
        const cards = document.querySelectorAll('.arcade-game-card');
        
        cards.forEach((card, i) => {
            const distance = i - this.selectedIndex;
            const isSelected = i === this.selectedIndex;
            
            const offset = distance * 100;
            const scale = isSelected ? 1 : 0.85;
            const zIndex = isSelected ? 10 : Math.max(0, 5 - Math.abs(distance));
            
            card.style.transform = `translateX(${offset}px) scale(${scale})`;
            card.style.zIndex = zIndex;
            card.classList.toggle('selected', isSelected);
        });
    }

    buildScrollView() {
        if (!this.gameList) return;
        
        this.gameList.innerHTML = '';
        
        this.games.forEach((game, i) => {
            const item = document.createElement('div');
            item.className = 'game-item';
            item.dataset.index = i;
            
            const emoji = game.emoji ? `<span class="game-emoji">${game.emoji}</span>` : '';
            const subtitle = game.subtitle || game.description;
            
            item.innerHTML = `
                <div class="game-name">${emoji}<span>${game.name}</span></div>
                <div class="game-subtitle">${subtitle}</div>
            `;
            
            item.addEventListener('click', () => this.selectGame(i));
            this.gameList.appendChild(item);
        });
        
        this.positionScrollItems();
    }

    positionScrollItems() {
        const items = document.querySelectorAll('.game-item');
        const gameCount = this.games.length;
        const visibleCount = 5;
        const halfVisible = Math.floor(visibleCount / 2);
        
        items.forEach((item, i) => {
            let distance = i - this.selectedIndex;
            if (distance > gameCount / 2) distance -= gameCount;
            if (distance < -gameCount / 2) distance += gameCount;
            
            item.style.setProperty('--distance', distance);
            
            // Hide faraway items
            if (Math.abs(distance) > halfVisible) {
                item.style.opacity = '0';
                item.style.pointerEvents = 'none';
            } else {
                item.style.opacity = '';
                item.style.pointerEvents = '';
            }
            
            item.classList.toggle('selected', i === this.selectedIndex);
        });
        this.updatePreview();
    }

    updatePreview() {
        const game = this.games[this.selectedIndex];
        if (!game || !this.gamePreview) return;
        
        this.gamePreview.src = `assets/previews/${game.preview}`;
        this.gamePreview.alt = `${game.name} Preview`;
        
        if (this.selectedGameTitle) this.selectedGameTitle.textContent = game.name;
        if (this.gameDescription) this.gameDescription.textContent = game.description;
        
        if (this.gameStatus) {
            this.gameStatus.textContent = 'Play Now';
            this.gameStatus.className = 'game-status';
            this.gameStatus.onclick = () => this.playGame(game);
        }
        
        this.gamePreview.style.cursor = 'pointer';
        this.gamePreview.onclick = () => this.playGame(game);
    }

    playGame(game = null) {
        const targetGame = game || this.games[this.selectedIndex];
        if (!targetGame) return;
        
        // Check if arcade view is active
        const arcadeView = document.getElementById('arcadeCabinet');
        const inArcadeMode = arcadeView && arcadeView.style.display !== 'none';
        
        if (inArcadeMode) {
            if (!this.isPowered) return;
            
            if (this.credits <= 0) {
                alert('Insert coin to play!');
                this.highlightCoinSlot();
                return;
            }
            
            this.credits--;
            this.updateCredits();
            
            if (this.credits === 0) {
                setTimeout(() => this.highlightCoinSlot(), 500);
            }
        }
        
        if (targetGame.url) {
            window.open(targetGame.url, '_blank');
        }
    }

    buildGridView() {
        if (!this.gamesGrid) return;
        
        this.gamesGrid.innerHTML = '';
        
        this.games.forEach((game, i) => {
            const card = document.createElement('div');
            card.className = 'grid-arcade-game-card';
            
            const emoji = game.emoji ? `<span class="game-emoji">${game.emoji}</span> ` : '';
            const author = game.author ? `<div class="grid-game-author">by ${game.author}</div>` : '';
            
            card.innerHTML = `
                <img class="grid-game-image" src="assets/previews/${game.preview}" alt="${game.name} Preview">
                <div class="grid-game-title">
                    ${emoji}<span class="game-name">${game.name}</span>
                </div>
                <div class="grid-game-description">${game.description}</div>
                ${author}
            `;
            
            card.addEventListener('click', () => this.playGame(game));
            this.gamesGrid.appendChild(card);
        });
    }

    selectGame(index) {
        if (index < 0 || index >= this.games.length) return;
        
        this.selectedIndex = index;
        this.positionArcadeCards();
        this.positionScrollItems();
        this.updateButtons();
    }

    updateButtons() {
        // Scroll view buttons
        if (this.navUp) {
            this.navUp.disabled = false;
            this.navUp.style.opacity = '1';
        }
        if (this.navDown) {
            this.navDown.disabled = false;
            this.navDown.style.opacity = '1';
        }
        
        // Arcade buttons
        if (!this.isPowered) {
            [this.arcadeLeft, this.arcadeRight, this.arcadePlay].forEach(btn => {
                if (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.3';
                }
            });
            return;
        }
        
        if (this.arcadeLeft) {
            this.arcadeLeft.disabled = false;
            this.arcadeLeft.style.opacity = '1';
        }
        if (this.arcadeRight) {
            this.arcadeRight.disabled = false;
            this.arcadeRight.style.opacity = '1';
        }
        if (this.arcadePlay) {
            this.arcadePlay.disabled = false;
            this.arcadePlay.style.opacity = '1';
        }
    }

    move(direction) {
        let newIndex = this.selectedIndex;
        
        if (direction === 'prev') {
            newIndex = this.getCircularIndex(this.selectedIndex - 1);
        } else if (direction === 'next') {
            newIndex = this.getCircularIndex(this.selectedIndex + 1);
        }
        
        this.selectGame(newIndex);
    }

    setupControls() {
        // Arcade buttons
        this.arcadeLeft?.addEventListener('click', () => {
            if (this.isPowered) this.move('prev');
        });
        
        this.arcadeRight?.addEventListener('click', () => {
            if (this.isPowered) this.move('next');
        });
        
        this.arcadePlay?.addEventListener('click', () => {
            if (this.isPowered) this.playGame();
        });
        
        // Power and coin
        this.powerButton?.addEventListener('click', () => this.togglePower());
        this.coinSlot?.addEventListener('click', () => this.addCoin());
        
        // Scroll view buttons
        this.navUp?.addEventListener('click', () => this.move('prev'));
        this.navDown?.addEventListener('click', () => this.move('next'));
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeys(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    handleKeys(e) {
        const key = e.key;
        
        if (key === 'ArrowUp' || key === 'ArrowLeft') {
            e.preventDefault();
            this.pressButton('left');
            if (this.isPowered) this.move('prev');
        } else if (key === 'ArrowDown' || key === 'ArrowRight') {
            e.preventDefault();
            this.pressButton('right');
            if (this.isPowered) this.move('next');
        } else if (key === 'Enter' || key === ' ') {
            e.preventDefault();
            this.pressButton('play');
            if (this.isPowered) this.playGame();
        } else if (key === 'c' || key === 'C') {
            this.addCoin();
        } else if (key === 'p' || key === 'P') {
            this.togglePower();
        }
    }

    handleResize() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.positionArcadeCards();
            this.positionScrollItems();
        }, 150);
    }

    pressButton(type) {
        const buttons = {
            left: this.arcadeLeft,
            right: this.arcadeRight,
            play: this.arcadePlay
        };
        
        const button = buttons[type];
        if (button && !button.disabled) {
            button.classList.add('button-pressed');
            setTimeout(() => {
                button.classList.remove('button-pressed');
            }, 150);
        }
    }

    showError() {
        const errorMsg = `
            <div style="text-align: center; color: #ef4444; padding: 2rem;">
                <h3>Error Loading Games</h3>
                <p>Please refresh the page and try again.</p>
            </div>
        `;
        
        [this.gameCards, this.gamesGrid, this.gameList]
            .filter(el => el)
            .forEach(el => el.innerHTML = errorMsg);
    }

    togglePower() {
        this.isPowered = !this.isPowered;
        const cabinet = document.querySelector('.arcade-cabinet');
        
        if (this.isPowered) {
            cabinet?.classList.remove('powered-off');
            this.powerButton?.classList.remove('off');
            
            if (this.credits === 0) {
                setTimeout(() => this.highlightCoinSlot(), 500);
            }
        } else {
            cabinet?.classList.add('powered-off');
            this.powerButton?.classList.add('off');
            this.coinSlot?.classList.remove('needs-coins');
        }
        
        this.updateButtons();
    }

    addCoin() {
        if (!this.isPowered) return;
        
        this.credits++;
        this.updateCredits();
        this.coinSlot?.classList.remove('needs-coins');
    }

    highlightCoinSlot() {
        this.coinSlot?.classList.add('needs-coins');
    }

    updateCredits() {
        if (this.creditsDisplay) {
            this.creditsDisplay.textContent = `Credits: ${this.credits}`;
            this.creditsDisplay.style.textShadow = '0 0 10px rgba(251, 191, 36, 0.8)';
            setTimeout(() => {
                this.creditsDisplay.style.textShadow = '';
            }, 300);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ViewManager();
    new WikiGamesArcade();
});
