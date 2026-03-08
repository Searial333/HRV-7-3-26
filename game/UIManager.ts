
import type { GameState } from './GameState';
import type { Game } from './Game';
import type { NPC, Gear, ItemTemplate, EquipmentSlot, BestiaryEntry, PersonalLogEntry, PlantPediaEntry } from '../types/index';
import { itemTemplates, cropTemplates, alchemyRecipes, smithingRecipes } from '../data/items';
import { MOON_PHASE_EMOJIS } from '../data/constants';

export class UIManager {
    state: GameState;
    game: Game;
    dom: { [key: string]: HTMLElement | NodeListOf<Element> | null };
    activeModal: HTMLElement | null;

    constructor(state: GameState, game: Game) {
        this.state = state;
        this.game = game;
        this.dom = {
            // Modals
            mainMenuModal: document.getElementById('main-menu-modal'),
            settingsModal: document.getElementById('settings-modal'),
            craftingMenu: document.getElementById('crafting-menu'),
            journalMenu: document.getElementById('journal-menu'),
            hollowMawModal: document.getElementById('hollow-maw-modal'),
            npcDialogueModal: document.getElementById('npc-dialogue-modal'),
             // Character Creation
            playerNameInput: document.getElementById('player-name-input'),
            beginCycleBtn: document.getElementById('begin-cycle-btn'),
            // NEW HUD
            healthGlobeFill: document.getElementById('health-globe-fill'),
            healthGlobeValue: document.getElementById('health-globe-value'),
            manaGlobeFill: document.getElementById('mana-globe-fill'),
            manaGlobeValue: document.getElementById('mana-globe-value'),
            xpBarFill: document.getElementById('xp-bar-fill'),
            infoDate: document.getElementById('info-date'),
            infoTime: document.getElementById('info-time'),
            infoDungeonFloor: document.getElementById('info-dungeon-floor'),
            hotbar: document.getElementById('hotbar'),
            minimapCanvas: document.getElementById('minimap-canvas'),
            // Old HUD Elements (some may be repurposed or kept for modals)
            bossHud: document.getElementById('boss-hud'),
            bossHpBar: document.getElementById('boss-hp-bar'),
            damageFlash: document.getElementById('damage-flash'),
            tooltip: document.getElementById('tooltip'),
             // Journal
            journalTabs: document.getElementById('journal-tabs'),
            journalContents: document.querySelectorAll('.journal-tab-content'),
            journalBackBtn: document.getElementById('journal-back-btn'),
            characterContent: document.getElementById('character-content'),
            coreStatsPanel: document.getElementById('core-stats-panel'),
            inventoryContent: document.getElementById('inventory-content'),
            playerGoldDisplay: document.getElementById('player-gold-display'),
            gearInventoryList: document.getElementById('gear-inventory-list'),
            inventoryGrid: document.getElementById('inventory-grid'),
            inventoryDetailsPane: document.getElementById('inventory-details-pane'),
            journalContent: document.getElementById('journal-content'),
            journalEntryList: document.getElementById('journal-entry-list'),
            pediaContent: document.getElementById('pedia-content'),
            plantPediaContent: document.getElementById('plant-pedia-content'),
            bestiaryContent: document.getElementById('bestiary-content'),
            relationshipsContent: document.getElementById('relationships-content'),
            legacyContent: document.getElementById('legacy-content'),
            // Crafting
            craftingRecipeList: document.getElementById('crafting-recipe-list'),
            // Hollow Maw
            hollowDescriptionContent: document.getElementById('hollow-description-content'),
             // NPC Dialogue
            npcNameHeading: document.getElementById('npc-name-heading'),
            npcDialogueContent: document.getElementById('npc-dialogue-content'),
            npcDialogueOptions: document.getElementById('npc-dialogue-options'),
            // Upgrade Menu
            upgradeGearList: document.getElementById('upgrade-gear-list'),
            upgradeItemSlot: document.getElementById('upgrade-item-slot'),
            upgradeMaterialsList: document.getElementById('upgrade-materials-list'),
            upgradePreviewList: document.getElementById('upgrade-preview-list'),
            upgradeCostInfo: document.getElementById('upgrade-cost-info'),
            upgradeButton: document.getElementById('upgrade-button'),
            upgradeStatusMessage: document.getElementById('upgrade-status-message'),
        };
        this.activeModal = null;
    }

    init() {
        document.body.addEventListener('click', e => this.handleAction(e as MouseEvent));
        document.body.addEventListener('mouseover', e => this.handleTooltip(e as MouseEvent, true));
        document.body.addEventListener('mouseout', e => this.handleTooltip(e as MouseEvent, false));
        document.body.addEventListener('mousemove', e => this.updateTooltipPosition(e as MouseEvent));
        (this.dom.journalTabs as HTMLElement)?.addEventListener('click', e => this.switchJournalTab(e as MouseEvent));
        (this.dom.characterContent as HTMLElement)?.addEventListener('click', e => this.handleCharacterSheetClick(e));
        
        const journalContent = document.getElementById('journal-main-content');
        journalContent?.addEventListener('click', e => this.switchPediaSubTab(e as MouseEvent));

        (this.dom.craftingMenu as HTMLElement)?.querySelector('.forge-tabs')?.addEventListener('click', e => this.switchForgeTab(e as MouseEvent));

        
        (this.dom.playerNameInput as HTMLInputElement)?.addEventListener('input', e => {
            const beginBtn = this.dom.beginCycleBtn as HTMLButtonElement;
            if (beginBtn) {
                beginBtn.disabled = (e.target as HTMLInputElement).value.trim().length === 0;
            }
        });

        const resolutionSelect = document.getElementById('resolution-select');
        if (resolutionSelect) {
            resolutionSelect.addEventListener('change', (e) => {
                const selectElement = e.target as HTMLSelectElement;
                if (selectElement.value) {
                    this.game.setResolution(selectElement.value);
                }
            });
        }
    }

    handleCharacterSheetClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const slotEl = target.closest<HTMLElement>('.equipment-slot');
        if (slotEl?.dataset.slot) {
            this.game.unequipGear(slotEl.dataset.slot as EquipmentSlot);
        }
    }

    handleAction(e: MouseEvent) {
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        
        // The resolution select is handled by a 'change' event, not a 'click', so we ignore its data-action.
        if (action === 'set-resolution') {
            return;
        }

        switch (action) {
            case 'begin-cycle':
                const playerName = (this.dom.playerNameInput as HTMLInputElement).value.trim();
                if (playerName) {
                    this.game.startNewGame(playerName);
                }
                break;
            case 'open-settings': this.showModal(this.dom.settingsModal as HTMLElement); break;
            case 'open-journal': 
                this.showModal(this.dom.journalMenu as HTMLElement); 
                this.renderJournal(); 
                // Force select a tab if one is provided
                if (target.dataset.tab) {
                    this.state.session.activeJournalTab = target.dataset.tab;
                }
                this.renderJournal();
                break;
            case 'open-crafting':
                this.showModal(this.dom.craftingMenu as HTMLElement);
                this.renderCraftingMenu();
                this.renderUpgradeMenu();
                break;
            case 'close-modal': this.hideModal(); break;
            case 'select-tool': this.state.player.tool = target.dataset.tool!; this.updateHotbar(); break;
            case 'use-ability': this.game.activateAbility(target.dataset.tool!); break;
            case 'start-dungeon': this.game.startDungeon(); break;
            case 'save-game': this.game.saveGame(); break;
            case 'load-game': this.game.loadGame(); break;
            case 'spend-attribute': this.game.spendAttributePoint(target.dataset.stat!); break;
            case 'use-inventory-item': this.game.useInventoryItem(target.dataset.itemName!); break;
            // FIX: Implemented the missing 'dropItem' method in the Game class.
            case 'drop-item': this.game.dropItem(target.dataset.itemName!); break;
            case 'sell-inventory-item': this.game.sellInventoryItem(target.dataset.itemName!); break;
            case 'equip-gear': this.game.equipGear(target.dataset.gearId!); break;
            case 'unequip-gear': this.game.unequipGear(target.dataset.slot as EquipmentSlot); break;
            case 'brew-recipe': this.game.brewRecipe(target.dataset.recipeName!); break;
            case 'craft-recipe': this.game.craftRecipe(target.dataset.recipeName!); break;
            case 'upgrade-gear': this.game.upgradeGear(); break;
            case 'select-upgrade-gear':
                 this.state.session.selectedUpgradeGearId = target.dataset.gearId!;
                 this.renderUpgradeMenu();
                 break;
            // FIX: Implemented the missing 'selectDialogueOption' method in the Game class.
            case 'select-dialogue-option': this.game.selectDialogueOption(JSON.parse(target.dataset.option!)); break;
            case 'select-inventory-item': 
                 this.state.session.selectedInventoryItem = target.dataset.itemName!;
                 this.state.session.selectedGearId = null;
                 this.renderInventory();
                 break;
            case 'select-gear-item':
                this.state.session.selectedGearId = target.dataset.gearId!;
                this.state.session.selectedInventoryItem = null;
                this.renderInventory();
                break;
            case 'journal-back':
                this.state.session.activeJournalTab = 'character';
                this.renderJournal();
                break;
        }
    }

    handleTooltip(e: MouseEvent, isShowing: boolean) {
        const target = e.target as HTMLElement;
        const button = target.closest<HTMLElement>('[data-tooltip-title]');
        const statLine = target.closest<HTMLElement>('[data-stat-breakdown]');

        if (!button && !statLine) {
            this.hideTooltip();
            return;
        }
        
        if (isShowing) {
            if(button) {
                const title = button.dataset.tooltipTitle || '';
                const text = button.dataset.tooltipText || '';
                this.showTooltip(title, text);
            } else if (statLine) {
                 const breakdown = JSON.parse(statLine.dataset.statBreakdown!);
                 const title = breakdown.name.charAt(0).toUpperCase() + breakdown.name.slice(1);
                 let text = `<p>Base: ${breakdown.base}</p>`;
                 if(Object.keys(breakdown.equipment).length > 0) {
                     text += '<div class="stat-breakdown">';
                     for(const equipName in breakdown.equipment) {
                         const value = breakdown.equipment[equipName];
                         text += `<div class="tooltip-stat-source"><span>${equipName}</span><span class="${value > 0 ? 'text-green-300' : 'text-red-300'}">${value > 0 ? '+' : ''}${value}</span></div>`;
                     }
                     text += '</div>';
                 }
                this.showTooltip(title, text);
            }
        } else {
            this.hideTooltip();
        }
    }
    
    showTooltip(title: string, text: string) {
        (this.dom.tooltip as HTMLElement).innerHTML = `<h4>${title}</h4>${text}`;
        (this.dom.tooltip as HTMLElement).style.display = 'block';
    }

    hideTooltip() {
        (this.dom.tooltip as HTMLElement).style.display = 'none';
    }

    updateTooltipPosition(e: MouseEvent) {
        const tooltip = this.dom.tooltip as HTMLElement;
        if (tooltip.style.display === 'none') return;
        
        const buffer = 15;
        let x = e.clientX + buffer;
        let y = e.clientY + buffer;

        if (x + tooltip.offsetWidth > window.innerWidth) {
            x = e.clientX - tooltip.offsetWidth - buffer;
        }
        if (y + tooltip.offsetHeight > window.innerHeight) {
            y = e.clientY - tooltip.offsetHeight - buffer;
        }

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    showModal(modalElement: HTMLElement) {
        if (!modalElement) return; // Prevent crash if element not found
        if (this.activeModal) this.hideModal();
        modalElement.style.display = 'flex'; // All backdrops are flex for centering
        this.activeModal = modalElement;
        this.state.session.gameRunning = false; // Pause game
    }

    hideModal() {
        if (this.activeModal) {
            // FIX: Clear NPC interaction state when closing the dialogue modal to prevent stale data.
            if(this.activeModal === this.dom.npcDialogueModal) {
                this.state.session.currentNpcInteraction = null;
            }
            this.activeModal.style.display = 'none';
            this.activeModal = null;
        }
        if (!this.activeModal) { // only resume if no other modal was opened
            this.state.session.gameRunning = true; // Resume game
        }
    }

    updateHUD() {
        const { player, world, session, progression } = this.state;
        const derivedStats = this.game.getDerivedStats().derived;
        player.maxHp = derivedStats.maxHp;
        player.maxWoundStain = derivedStats.maxWoundStain;

        // Globes
        (this.dom.healthGlobeFill as HTMLElement).style.height = `${(player.hp / player.maxHp) * 100}%`;
        (this.dom.healthGlobeValue as HTMLElement).textContent = `${Math.ceil(player.hp)}`;
        (this.dom.manaGlobeFill as HTMLElement).style.height = `${(player.woundStain / player.maxWoundStain) * 100}%`;
        (this.dom.manaGlobeValue as HTMLElement).textContent = `${Math.ceil(player.woundStain)}`;
        
        // XP Bar
        (this.dom.xpBarFill as HTMLElement).style.width = `${(progression.xp / progression.maxXp) * 100}%`;

        // Info Panel
        if (session.currentGameState === 'dungeon') {
            (this.dom.infoDate as HTMLElement).style.display = 'none';
            (this.dom.infoTime as HTMLElement).style.display = 'none';
            (this.dom.infoDungeonFloor as HTMLElement).style.display = 'block';
            (this.dom.infoDungeonFloor as HTMLElement).textContent = `The Hollow - Floor ${session.dungeonFloor}`;
        } else {
            (this.dom.infoDate as HTMLElement).style.display = 'block';
            (this.dom.infoTime as HTMLElement).style.display = 'block';
            (this.dom.infoDungeonFloor as HTMLElement).style.display = 'none';

            const hours = Math.floor(world.gameTime / 60) % 24;
            const minutes = Math.floor(world.gameTime % 60);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 === 0 ? 12 : hours % 12;

            (this.dom.infoDate as HTMLElement).textContent = `${world.gameSeason}, Day ${world.gameDay} ${MOON_PHASE_EMOJIS[world.moonPhase]}`;
            (this.dom.infoTime as HTMLElement).textContent = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }

        if (session.inBossFight) {
            const boss = this.state.entities.dungeonEnemies.find((e: any) => e.type === 'heart_of_the_hollow');
            if (boss && this.dom.bossHud && this.dom.bossHpBar) {
                (this.dom.bossHud as HTMLElement).style.display = 'block';
                (this.dom.bossHpBar as HTMLElement).style.width = `${(boss.hp / boss.maxHp) * 100}%`;
            }
        } else {
            if (this.dom.bossHud) {
                (this.dom.bossHud as HTMLElement).style.display = 'none';
            }
        }
        this.updateCooldowns();
        this.updateMinimap();
    }
    
    updateCooldowns() {
        const now = Date.now();
        for (const abilityName in this.state.player.abilityCooldowns) {
            const endTime = this.state.player.abilityCooldowns[abilityName];
            const slot = (this.dom.hotbar as HTMLElement).querySelector<HTMLElement>(`[data-tool="${abilityName}"]`);
            if (slot) {
                const overlay = slot.querySelector<HTMLElement>('.cooldown-overlay')!;
                if (now < endTime) {
                    const remaining = ((endTime - now) / 1000).toFixed(1);
                    overlay.textContent = remaining;
                    overlay.classList.add('visible');
                } else {
                    overlay.classList.remove('visible');
                }
            }
        }
    }
    
    updateBuffDisplay() {
        // This could be integrated into the new HUD if desired, e.g. above the hotbar.
        // For now, it's unhooked from the DOM.
    }

    updateHotbar() {
        const hotbar = this.dom.hotbar as HTMLElement;
        hotbar.innerHTML = '';
        const hotbarItems = [
            'blade', 'scythe', 'hoe', 'watering_can', 'axe', 'pickaxe',
            'ability_shadowmend', 'ability_umbrallash',
            'Soulroot Seed'
        ];
        
        hotbarItems.forEach(toolName => {
            const itemTemplate = itemTemplates[toolName];
            if (!itemTemplate) return;
            if ((this.state.inventory[toolName] || 0) <= 0 && !itemTemplate.isAbility) return;

            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.tool = toolName;
            slot.dataset.action = itemTemplate?.isAbility ? 'use-ability' : 'select-tool';
            
            let currentItem = itemTemplate;

            slot.dataset.tooltipTitle = currentItem.name;
            slot.dataset.tooltipText = currentItem.description;
            
            if (currentItem.iconUrl) {
                const icon = document.createElement('img');
                icon.src = currentItem.iconUrl;
                icon.className = 'hotbar-icon';
                icon.alt = currentItem.name;
                slot.appendChild(icon);
            }
            
            const rarity = currentItem.rarity;
            if (this.state.player.tool === toolName) {
                slot.classList.add('active');
            } else if (rarity) {
                slot.style.borderColor = rarity.color;
                if (rarity.name === 'Premium' || rarity.name === 'Perfect') {
                    slot.style.boxShadow = `0 0 8px ${rarity.color}, inset 0 0 10px rgba(0,0,0,0.8)`;
                } else {
                    slot.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.8)';
                }
            }
            
            const count = this.state.inventory[toolName];
            if (count > 1 && !currentItem.isAbility) {
                const countEl = document.createElement('span');
                countEl.className = 'inventory-item-count';
                // FIX: The 'count' variable is a number, so it must be converted to a string before being assigned to textContent.
                countEl.textContent = count.toString();
                slot.appendChild(countEl);
            }
            
             if (itemTemplate?.isAbility) {
                const cdOverlay = document.createElement('div');
                cdOverlay.className = 'cooldown-overlay';
                slot.appendChild(cdOverlay);
            }

            hotbar.appendChild(slot);
        });
    }
    
    flashDamage() {
        (this.dom.damageFlash as HTMLElement).style.opacity = '1';
        setTimeout(() => ((this.dom.damageFlash as HTMLElement).style.opacity = '0'), 300);
    }
    
    renderJournal() {
        const activeTab = this.state.session.activeJournalTab;
        const journalMenu = this.dom.journalMenu as HTMLElement;

        // Handle deep view state
        const deepViews = ['pedia', 'relationships', 'legacy', 'journal'];
        if (deepViews.includes(activeTab)) {
            journalMenu.classList.add('deep-view');
        } else {
            journalMenu.classList.remove('deep-view');
        }
        
        (this.dom.journalTabs as HTMLElement).querySelectorAll('.journal-tab-btn').forEach(btn => {
            (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.tab === activeTab);
        });
        
        (this.dom.journalContents as NodeListOf<Element>).forEach(content => {
            (content as HTMLElement).classList.toggle('active', (content as HTMLElement).id === `${activeTab}-content`);
        });

        // Re-render content on tab switch to ensure it's up to date
        switch(activeTab) {
            case 'character': this.renderCharacterTab(); break;
            case 'inventory': this.renderInventory(); break;
            case 'journal': this.renderJournalLog(); break;
            case 'pedia': this.renderPediaTab(); break;
            case 'relationships': this.renderRelationshipsTab(); break;
            case 'legacy': this.renderLegacyTab(); break;
        }
    }
    
    switchJournalTab(e: MouseEvent) {
        const tabBtn = (e.target as HTMLElement).closest<HTMLElement>('.journal-tab-btn');
        if (!tabBtn) return;
        this.state.session.activeJournalTab = tabBtn.dataset.tab!;
        this.renderJournal();
    }
    
    switchPediaSubTab(e: MouseEvent) {
        const subTabBtn = (e.target as HTMLElement).closest<HTMLElement>('.journal-sub-tab-btn');
        if (!subTabBtn) return;
        
        this.state.session.activePediaSubTab = subTabBtn.dataset.subtab!;
        this.renderPediaTab();
    }
    
    switchForgeTab(e: MouseEvent) {
        const tabBtn = (e.target as HTMLElement).closest<HTMLElement>('.forge-tab-btn');
        if (!tabBtn) return;
        
        const tabsContainer = (this.dom.craftingMenu as HTMLElement).querySelector('.forge-tabs') as HTMLElement;
        tabsContainer.querySelectorAll('.forge-tab-btn').forEach(btn => btn.classList.remove('active'));
        tabBtn.classList.add('active');

        const targetTab = tabBtn.dataset.tab; // 'crafting' or 'upgrade'
        const craftingPanel = (this.dom.craftingMenu as HTMLElement).querySelector('#crafting-panel') as HTMLElement;
        const upgradePanel = (this.dom.craftingMenu as HTMLElement).querySelector('#upgrade-panel') as HTMLElement;

        if (craftingPanel) craftingPanel.style.display = targetTab === 'crafting' ? 'flex' : 'none';
        if (upgradePanel) upgradePanel.style.display = targetTab === 'upgrade' ? 'flex' : 'none';
    }

    renderCharacterTab() {
        const { player, progression } = this.state;
        const content = this.dom.characterContent as HTMLElement;
        if (!content) return;

        // --- Paper Doll Logic ---
        const slots: NodeListOf<HTMLElement> = content.querySelectorAll('.equipment-slot');
        slots.forEach(slotEl => {
            const slotName = slotEl.dataset.slot as EquipmentSlot;
            const item = player.equipment[slotName];

            slotEl.innerHTML = '';
            slotEl.classList.remove('filled');
            slotEl.style.borderColor = '';
            slotEl.style.backgroundImage = '';
            slotEl.style.backgroundColor = '';
            slotEl.style.boxShadow = '';
            slotEl.style.fontSize = '0.7rem'; // restore default

            if (item) {
                slotEl.classList.add('filled');
                slotEl.style.borderColor = item.rarity.color;
                slotEl.style.backgroundColor = 'rgba(0,0,0,0.6)';
                slotEl.style.boxShadow = `inset 0 0 10px ${item.rarity.color}`;
                
                const itemTemplate = itemTemplates[item.baseItemId];
                if (itemTemplate?.iconUrl) {
                    slotEl.style.backgroundImage = `url('${itemTemplate.iconUrl}')`;
                    slotEl.style.backgroundSize = 'contain';
                    slotEl.style.backgroundRepeat = 'no-repeat';
                    slotEl.style.backgroundPosition = 'center';
                    slotEl.style.fontSize = '0'; // Hide text if icon is present
                } else {
                    slotEl.textContent = item.name.substring(0, 10);
                }
                
                let tooltipText = `<p style="color:${item.rarity.color}">${item.rarity.name} ${item.slot}</p>`;
                Object.entries(item.stats).forEach(([stat, value]) => {
                    tooltipText += `<p>${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value > 0 ? '+' : ''}${value}</p>`;
                });
                slotEl.dataset.tooltipTitle = item.name;
                slotEl.dataset.tooltipText = tooltipText;

            } else {
                const defaultText = slotName.charAt(0).toUpperCase() + slotName.slice(1).replace(/([A-Z])/g, ' $1').replace(/(\d)/, ' $1').trim();
                slotEl.textContent = defaultText;
                slotEl.dataset.tooltipTitle = defaultText;
                slotEl.dataset.tooltipText = "Empty";
            }
        });
        
        // --- Stat Panel Logic ---
        const { derived, combinedStats, statBreakdown } = this.game.getDerivedStats();
        const coreStatsPanel = this.dom.coreStatsPanel as HTMLElement;
        const derivedStatsPanel = document.getElementById('derived-stats-panel');
        if (!coreStatsPanel || !derivedStatsPanel) return;

        const hasPoints = progression.attributePoints > 0;
        const upgradeButtonHTML = (stat: string) => hasPoints ? `<button class="stat-upgrade-btn" data-action="spend-attribute" data-stat="${stat}">+</button>` : '';

        const getStatHTML = (statName: string) => {
            const breakdown = {
                name: statName,
                base: statBreakdown[statName]?.base || 0,
                equipment: statBreakdown[statName]?.equipment || {}
            };
            return `<div class="stat-line" data-stat-breakdown='${JSON.stringify(breakdown)}'>
                        <span>${statName.charAt(0).toUpperCase() + statName.slice(1)}</span>
                        <div class="flex items-center gap-2">
                            <span>${combinedStats[statName] || 0}</span>
                            ${upgradeButtonHTML(statName)}
                        </div>
                    </div>`;
        };

        coreStatsPanel.innerHTML = `
            <h5 class="flex justify-between">Core Attributes <span>Points: ${progression.attributePoints}</span></h5>
            ${getStatHTML('might')}
            ${getStatHTML('agility')}
            ${getStatHTML('defense')}
            ${getStatHTML('arcanum')}
            ${getStatHTML('destiny')}
            ${getStatHTML('plants')}
        `;

        derivedStatsPanel.innerHTML = `
            <h5>Derived Stats</h5>
            <div class="stat-line"><span>Max Health</span> <span>${Math.floor(derived.maxHp)}</span></div>
            <div class="stat-line"><span>Phys. Damage Bonus</span> <span>+${derived.physicalDamageBonus}</span></div>
            <div class="stat-line"><span>Magic Damage Bonus</span> <span>+${derived.magicalDamageBonus}</span></div>
            <div class="stat-line"><span>Crit Chance</span> <span>${derived.critChance.toFixed(1)}%</span></div>
            <div class="stat-line"><span>Move Speed</span> <span>${derived.moveSpeed.toFixed(2)}</span></div>
            <div class="stat-line"><span>Damage Reduction</span> <span>${(derived.damageReduction * 100).toFixed(1)}%</span></div>
        `;
    }

    renderEquipmentTab() { /* This tab is merged into Character/Inventory, keeping for potential future separation */ }

    renderInventory() {
        const { inventory, player, session, progression } = this.state;
        const grid = this.dom.inventoryGrid as HTMLElement;
        const gearList = this.dom.gearInventoryList as HTMLElement;
        const detailsPane = this.dom.inventoryDetailsPane as HTMLElement;
        const goldDisplay = this.dom.playerGoldDisplay as HTMLElement;

        if (!grid || !gearList || !detailsPane || !goldDisplay) return;

        goldDisplay.textContent = `${progression.gold} Gold`;
        
        // Render Materials
        grid.innerHTML = '';
        Object.entries(inventory).forEach(([name, count]) => {
            if (count <= 0) return;
            const item = itemTemplates[name] || cropTemplates[name];
            if (!item || item.type === 'tool') return;

            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            itemEl.dataset.action = 'select-inventory-item';
            itemEl.dataset.itemName = name;
            itemEl.dataset.tooltipTitle = item.name;
            itemEl.dataset.tooltipText = item.description;

            const rarity = item?.rarity;
            if(session.selectedInventoryItem === name) {
                itemEl.classList.add('active');
            } else if (rarity) {
                itemEl.style.borderColor = rarity.color;
                if (rarity.name === 'Premium' || rarity.name === 'Perfect') {
                    itemEl.style.boxShadow = `0 0 8px ${rarity.color}`;
                }
            }

            itemEl.innerHTML = `
                <img src="${item.iconUrl || 'about:blank'}" alt="${item.name}">
                <span class="inventory-item-count">${count}</span>
            `;
            grid.appendChild(itemEl);
        });

        // Render Gear
        gearList.innerHTML = '';
        player.gear.forEach(gear => {
            const itemEl = document.createElement('div');
            itemEl.className = 'gear-item-row';
            itemEl.dataset.action = 'select-gear-item';
            itemEl.dataset.gearId = gear.instanceId;

            if(session.selectedGearId === gear.instanceId) itemEl.classList.add('active');
            itemEl.style.borderLeft = `3px solid ${gear.rarity.color}`;

            itemEl.innerHTML = `<span style="color: ${gear.rarity.color};">[${gear.rarity.name}]</span> ${gear.name} <span>(Lvl ${gear.level})</span>`;
            gearList.appendChild(itemEl);
        });

        // Render Details Pane
        detailsPane.innerHTML = '';
        const selectedGear = player.gear.find(g => g.instanceId === session.selectedGearId);
        const selectedItem = session.selectedInventoryItem ? (itemTemplates[session.selectedInventoryItem] || cropTemplates[session.selectedInventoryItem]) : null;

        if (selectedGear) {
            let statsHTML = Object.entries(selectedGear.stats).map(([stat, val]) => `<li>${stat}: ${val}</li>`).join('');
            detailsPane.innerHTML = `
                <h4 style="color: ${selectedGear.rarity.color};">${selectedGear.name}</h4>
                <p>${selectedGear.slot} - Level ${selectedGear.level}</p>
                <ul>${statsHTML}</ul>
                <div class="item-actions">
                    <button class="action-btn" data-action="equip-gear" data-gear-id="${selectedGear.instanceId}">Equip</button>
                </div>
            `;
        } else if (selectedItem) {
             detailsPane.innerHTML = `
                <h4>${selectedItem.name}</h4>
                <p>${selectedItem.description}</p>
                <p>Value: ${selectedItem.value || 1}</p>
                <div class="item-actions">
                    ${selectedItem.type === 'consumable' ? `<button class="action-btn" data-action="use-inventory-item" data-item-name="${selectedItem.name}">Use</button>` : ''}
                    <button class="action-btn" data-action="drop-item" data-item-name="${selectedItem.name}">Drop</button>
                </div>
            `;
        }
    }

    renderJournalLog() {
        const list = this.dom.journalEntryList as HTMLElement;
        if (!list) return;
        list.innerHTML = this.state.progression.personalLog.map(entry => `
            <div class="journal-entry">
                <span class="journal-entry-icon">${entry.icon}</span>
                <p>${entry.text}</p>
                <span class="journal-entry-day">Day ${entry.day}</span>
            </div>
        `).join('');
    }

    renderPediaTab() {
        const { activePediaSubTab } = this.state.session;
        const pediaContent = this.dom.pediaContent as HTMLElement;
        if (!pediaContent) return;

        pediaContent.querySelectorAll('.journal-sub-tab-btn').forEach(btn => {
            (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.subtab === activePediaSubTab);
        });

        (this.dom.plantPediaContent as HTMLElement).style.display = activePediaSubTab === 'plants' ? 'block' : 'none';
        (this.dom.bestiaryContent as HTMLElement).style.display = activePediaSubTab === 'bestiary' ? 'block' : 'none';
        
        if (activePediaSubTab === 'plants') this.renderPlantPedia();
        else if (activePediaSubTab === 'bestiary') this.renderBestiary();
    }

    renderPlantPedia() {
        const content = this.dom.plantPediaContent as HTMLElement;
        if (!content) return;
        const entries = Object.values(this.state.progression.plantPedia);
        if (entries.length === 0) {
            content.innerHTML = '<p class="pedia-empty">No plants discovered yet. Try harvesting things!</p>';
            return;
        }
        content.innerHTML = entries.map((p: PlantPediaEntry) => `
            <div class="pedia-entry">
                <h5>${p.name}</h5>
                <p>${p.description}</p>
                <p>Yields: ${p.yields}</p>
            </div>
        `).join('');
    }

    renderBestiary() {
        const content = this.dom.bestiaryContent as HTMLElement;
        if (!content) return;
        const entries = Object.values(this.state.progression.bestiary);
         if (entries.length === 0) {
            content.innerHTML = '<p class="pedia-empty">No creatures encountered yet. Explore the hollows.</p>';
            return;
        }
        content.innerHTML = entries.map((b: BestiaryEntry) => `
             <div class="pedia-entry">
                <h5>${b.name} (${b.kills} defeated)</h5>
                <p>${b.description}</p>
                <p>Drops: ${Object.keys(b.drops).join(', ')}</p>
            </div>
        `).join('');
    }

    renderRelationshipsTab() {
        const content = this.dom.relationshipsContent as HTMLElement;
        if(!content) return;
        content.innerHTML = `<p>Coming soon...</p>`;
    }
    
    renderLegacyTab() {
        const content = this.dom.legacyContent as HTMLElement;
        if(!content) return;
        content.innerHTML = `<p>Coming soon...</p>`;
    }

    renderCraftingMenu() {
        const list = this.dom.craftingRecipeList as HTMLElement;
        const details = (this.dom.craftingMenu as HTMLElement)?.querySelector('#crafting-details') as HTMLElement;
        if (!list || !details) return;

        const { inventory } = this.state;

        let smithingHTML = `<div><h4 class="font-deco text-lg border-b border-iron mb-2">Smithing</h4>`;
        Object.entries(smithingRecipes).forEach(([key, recipe]) => {
            let canCraft = true;
            const materialsList = Object.entries(recipe.materials).map(([mat, count]) => {
                const owned = inventory[mat] || 0;
                if (owned < (count as number)) canCraft = false;
                const textColor = owned >= (count as number) ? 'text-parchment' : 'text-danger';
                return `<li class="${textColor}">${mat}: ${owned}/${count}</li>`;
            }).join('');

            smithingHTML += `
                <div class="p-2 border border-transparent hover:border-wood-light">
                    <h5 class="font-deco">${recipe.name}</h5>
                    <ul class="text-sm ml-2">${materialsList}</ul>
                    <button class="action-btn text-sm mt-2" data-action="craft-recipe" data-recipe-name="${key}" ${canCraft ? '' : 'disabled'}>
                        Craft
                    </button>
                </div>
            `;
        });
        smithingHTML += `</div>`;

        // For now, details pane is empty
        details.innerHTML = `<p class="text-stone">Select a recipe to see details.</p>`;

        list.innerHTML = smithingHTML;

        // Placeholder for alchemy
        list.innerHTML += `<div><h4 class="font-deco text-lg border-b border-iron my-2">Alchemy</h4><p class="text-stone italic">No recipes known.</p></div>`;
    }

    renderUpgradeMenu() {
        const { session, player, inventory, progression } = this.state;
        const gearList = this.dom.upgradeGearList as HTMLElement;
        const itemSlot = this.dom.upgradeItemSlot as HTMLElement;
        const materialsList = this.dom.upgradeMaterialsList as HTMLElement;
        const costInfo = this.dom.upgradeCostInfo as HTMLElement;
        const upgradeButton = this.dom.upgradeButton as HTMLButtonElement;

        if (!gearList || !itemSlot || !materialsList || !costInfo || !upgradeButton) return;

        const allGear = [...player.gear, ...Object.values(player.equipment).filter(Boolean) as Gear[]];
        gearList.innerHTML = allGear.map(gear => {
            const isSelected = gear.instanceId === session.selectedUpgradeGearId;
            return `<div class="gear-item-row ${isSelected ? 'active' : ''}" data-action="select-upgrade-gear" data-gear-id="${gear.instanceId}">
                        <span style="color: ${gear.rarity.color};">[Lvl ${gear.level}]</span> ${gear.name}
                    </div>`;
        }).join('');

        const selectedGear = allGear.find(g => g.instanceId === session.selectedUpgradeGearId);
        
        if (selectedGear) {
            itemSlot.innerHTML = `<img src="${itemTemplates[selectedGear.baseItemId]?.iconUrl || ''}" alt="${selectedGear.name}" style="border-color: ${selectedGear.rarity.color};">`;
            
            const level = selectedGear.level || 0;
            const dustCost = level + 1;
            const goldCost = 50 * Math.pow(level + 1, 2);
            const ownedDust = inventory['Glimmering Dust'] || 0;
            const canAfford = progression.gold >= goldCost && ownedDust >= dustCost;

            materialsList.innerHTML = `<li class="${ownedDust >= dustCost ? 'text-green-300' : 'text-red-300'}">Glimmering Dust: ${ownedDust}/${dustCost}</li>`;
            costInfo.innerHTML = `<span class="${progression.gold >= goldCost ? 'text-green-300' : 'text-red-300'}">Gold: ${goldCost}</span>`;
            
            upgradeButton.disabled = !canAfford;
            upgradeButton.textContent = `Upgrade to Level ${level + 1}`;
        } else {
            itemSlot.innerHTML = '';
            materialsList.innerHTML = '';
            costInfo.innerHTML = '';
            upgradeButton.disabled = true;
            upgradeButton.textContent = 'Select an Item';
        }
    }

    setUpgradeStatus(message: string, isSuccess: boolean) {
        const statusEl = this.dom.upgradeStatusMessage as HTMLElement;
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.style.color = isSuccess ? 'var(--color-success)' : 'var(--color-danger)';
        statusEl.style.opacity = '1';
        setTimeout(() => {
            statusEl.style.opacity = '0';
        }, 3000);
    }
    
    showHollowMawModal() {
        const descriptionEl = this.dom.hollowDescriptionContent as HTMLElement;
        if (descriptionEl) {
            descriptionEl.textContent = "The air grows cold. A sense of dread emanates from the swirling portal.";
        }
        this.showModal(this.dom.hollowMawModal as HTMLElement);
    }
    
    // FIX: Added logic to track current NPC for dialogue options.
    showNpcDialogue(npc: NPC, dialogueNodeKey: string) {
        const node = npc.dialogueTree[dialogueNodeKey];
        if (!node) {
            this.hideModal();
            return;
        }

        // Set the current interaction state
        this.state.session.currentNpcInteraction = { npcId: npc.id, dialogueNodeKey };

        (this.dom.npcNameHeading as HTMLElement).textContent = npc.name;
        (this.dom.npcDialogueContent as HTMLElement).textContent = node.text;

        const optionsContainer = this.dom.npcDialogueOptions as HTMLElement;
        optionsContainer.innerHTML = '';

        if (node.ends) {
            const closeButton = document.createElement('button');
            closeButton.className = 'action-btn';
            closeButton.dataset.action = 'close-modal';
            closeButton.textContent = 'Leave';
            optionsContainer.appendChild(closeButton);
        } else {
            node.options?.forEach((option: any) => {
                const optionButton = document.createElement('button');
                optionButton.className = 'action-btn';
                optionButton.dataset.action = 'select-dialogue-option';
                optionButton.dataset.option = JSON.stringify(option);
                optionButton.textContent = option.text;
                optionsContainer.appendChild(optionButton);
            });
        }
        
        this.showModal(this.dom.npcDialogueModal as HTMLElement);
    }

    updateMinimap() {
        const canvas = this.dom.minimapCanvas as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { player, world, session, entities } = this.state;
        const grid = session.currentGameState === 'farm' ? world.gameGrid : world.dungeonGrid;
        if (!grid || grid.length === 0) return;
        
        const mapSize = 180;
        canvas.width = mapSize;
        canvas.height = mapSize;

        const viewDiameterInTiles = 20;
        const tileSizeOnMap = mapSize / viewDiameterInTiles;

        ctx.clearRect(0, 0, mapSize, mapSize);
        ctx.fillStyle = 'rgba(10, 8, 7, 0.9)';
        ctx.fillRect(0, 0, mapSize, mapSize);

        const startTileX = Math.floor(player.x - viewDiameterInTiles / 2);
        const endTileX = Math.ceil(player.x + viewDiameterInTiles / 2);
        const startTileY = Math.floor(player.y - viewDiameterInTiles / 2);
        const endTileY = Math.ceil(player.y + viewDiameterInTiles / 2);

        for (let tileY = startTileY; tileY < endTileY; tileY++) {
            for (let tileX = startTileX; tileX < endTileX; tileX++) {
                const mapX = (tileX - player.x) * tileSizeOnMap + mapSize / 2;
                const mapY = (tileY - player.y) * tileSizeOnMap + mapSize / 2;

                const tile = grid[tileX]?.[tileY];
                if (tile) {
                    let color = '';
                    if (tile.type === 'wall') color = '#2e2824';
                    else if (tile.type === 'floor') color = '#4a413a';
                    else if (tile.isTilled) color = '#573b26';
                    else if (tile.type === 'grass') color = '#314917';
                    
                    if (color) {
                        ctx.fillStyle = color;
                        ctx.fillRect(mapX, mapY, tileSizeOnMap, tileSizeOnMap);
                    }
                    
                    if (tile.object) {
                        let objectColor = '';
                        switch(tile.object.type) {
                            case 'tree': objectColor = '#166534'; break;
                            case 'rock': objectColor = '#6b7280'; break;
                            case 'portal': objectColor = '#c084fc'; break;
                            case 'forge': objectColor = '#ef4444'; break;
                            case 'bed': objectColor = '#d7c7b2'; break;
                            case 'scarecrow': objectColor = '#d2b48c'; break;
                            case 'stairs': objectColor = '#facc15'; break;
                            case 'exit': objectColor = '#a5b4fc'; break;
                        }
                        if (objectColor) {
                            ctx.fillStyle = objectColor;
                            ctx.fillRect(mapX + tileSizeOnMap * 0.25, mapY + tileSizeOnMap * 0.25, tileSizeOnMap * 0.5, tileSizeOnMap * 0.5);
                        }
                    }
                }
            }
        }
        
        const drawEntity = (entity: {x:number, y:number}, color: string, radius: number) => {
            const mapX = (entity.x - player.x) * tileSizeOnMap + mapSize / 2;
            const mapY = (entity.y - player.y) * tileSizeOnMap + mapSize / 2;
            if (mapX > 0 && mapX < mapSize && mapY > 0 && mapY < mapSize) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(mapX, mapY, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const enemyList = session.currentGameState === 'farm' ? entities.enemies : entities.dungeonEnemies;
        enemyList.forEach(enemy => drawEntity(enemy, '#ef4444', tileSizeOnMap * 0.4));
        
        if (session.currentGameState === 'farm') {
            entities.npcs.forEach(npc => drawEntity(npc, '#60a5fa', tileSizeOnMap * 0.4));
        }

        ctx.fillStyle = '#f5f1e8';
        ctx.beginPath();
        ctx.arc(mapSize / 2, mapSize / 2, tileSizeOnMap * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0a0807';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}