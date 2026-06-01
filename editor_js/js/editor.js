/**
 * GalEngine Editor - Main JavaScript Module
 *
 * Implements P5.2 ~ P5.9:
 * - P5.2: Asset Manager (drag-and-drop import)
 * - P5.3: Scene Editor (visual scene editing)
 * - P5.4: Timeline Editor (dialogue timeline)
 * - P5.5: Flowchart Editor (branch visualization)
 * - P5.6: UI Layout Editor
 * - P5.7: settings.json Auto-sync
 * - P5.8: One-click Compile
 * - P5.9: Real-time Preview
 */

// =====================================================================
//  Global State
// =====================================================================
const EditorState = {
    currentProject: null,
    currentScene: null,
    selectedElement: null,
    selectedTimelineIndex: -1,
    isPreviewMode: false,
    autoSync: true,
    currentMode: 'scene',   // 'scene' | 'flowchart' | 'layout'
    layouts: { elements: [] },
    scenes: [],
    timelineCommands: [],
    assets: {
        backgrounds: ['bg_classroom.png', 'bg_street.png', 'bg_room.png'],
        sprites: ['alice_normal.png', 'alice_smile.png', 'bob_normal.png'],
        cgs: ['cg_ending.png'],
        audio: ['bgm_everyday.ogg', 'se_click.ogg'],
        fonts: ['msyh.ttf'],
    },
    undoStack: [],
    redoStack: [],
};

// =====================================================================
//  Utility
// =====================================================================
function saveUndo() {
    EditorState.undoStack.push(JSON.stringify({
        scenes: JSON.parse(JSON.stringify(EditorState.scenes)),
        layouts: JSON.parse(JSON.stringify(EditorState.layouts)),
        timelineCommands: JSON.parse(JSON.stringify(EditorState.timelineCommands)),
    }));
    if (EditorState.undoStack.length > 50) EditorState.undoStack.shift();
    EditorState.redoStack = [];
}

function undo() {
    if (EditorState.undoStack.length === 0) return;
    EditorState.redoStack.push(JSON.stringify({
        scenes: JSON.parse(JSON.stringify(EditorState.scenes)),
        layouts: JSON.parse(JSON.stringify(EditorState.layouts)),
        timelineCommands: JSON.parse(JSON.stringify(EditorState.timelineCommands)),
    }));
    const state = JSON.parse(EditorState.undoStack.pop());
    EditorState.scenes = state.scenes;
    EditorState.layouts = state.layouts;
    EditorState.timelineCommands = state.timelineCommands;
    refreshAll();
}

function redo() {
    if (EditorState.redoStack.length === 0) return;
    EditorState.undoStack.push(JSON.stringify({
        scenes: JSON.parse(JSON.stringify(EditorState.scenes)),
        layouts: JSON.parse(JSON.stringify(EditorState.layouts)),
        timelineCommands: JSON.parse(JSON.stringify(EditorState.timelineCommands)),
    }));
    const state = JSON.parse(EditorState.redoStack.pop());
    EditorState.scenes = state.scenes;
    EditorState.layouts = state.layouts;
    EditorState.timelineCommands = state.timelineCommands;
    refreshAll();
}

function refreshAll() {
    SceneEditor.renderTimeline();
    FlowchartEditor.render();
    UILayoutEditor.renderLayoutEditor();
    updatePropertyPanel();
    updateStatusBar();
}

function updateStatusBar() {
    const el = document.getElementById('statusMode');
    if (el) el.textContent = '模式: ' + ({ scene: '场景编辑', flowchart: '流程图', layout: 'UI布局' })[EditorState.currentMode] || '场景编辑';
    const el2 = document.getElementById('statusCommands');
    if (el2) el2.textContent = '命令: ' + EditorState.timelineCommands.length;
}

function updatePropertyPanel() {
    // Handled by individual editors
}

// =====================================================================
//  P5.2 - Asset Manager
// =====================================================================
const AssetManager = {
    init() {
        this.bindDragAndDrop();
        this.renderAssetPanel();
    },

    bindDragAndDrop() {
        const thumbs = document.querySelectorAll('.asset-thumb');
        thumbs.forEach(el => {
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'asset',
                    path: el.dataset.path,
                    name: el.textContent.trim(),
                }));
            });
        });

        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.addEventListener('dragover', (e) => e.preventDefault());
            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.type === 'asset') {
                        this.onAssetDropped(data, e);
                    }
                } catch (ex) { /* ignore */ }
            });
        }
    },

    onAssetDropped(data, event) {
        const ext = data.name.split('.').pop().toLowerCase();
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            // Check if it's a background or sprite by data path
            if (data.path.includes('backgrounds')) {
                this.addBackgroundToCanvas(data, x, y);
            } else if (data.path.includes('sprites')) {
                this.addSpriteToCanvas(data, x, y);
            } else if (data.path.includes('cg')) {
                alert('CG 已添加，请在场景中触发 CG 模式显示。');
            }
        } else if (['ogg', 'mp3', 'wav'].includes(ext)) {
            alert('音频文件 "' + data.name + '" 已关联当前场景。');
            const selBGM = document.getElementById('selBGM');
            if (selBGM) {
                // Add option if not exists
                let found = false;
                for (let i = 0; i < selBGM.options.length; i++) {
                    if (selBGM.options[i].value === data.name) { found = true; break; }
                }
                if (!found) {
                    const opt = document.createElement('option');
                    opt.value = data.name;
                    opt.textContent = data.name;
                    selBGM.appendChild(opt);
                }
                selBGM.value = data.name;
            }
        }
    },

    addBackgroundToCanvas(data, x, y) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        // Remove existing background
        const oldBg = canvas.querySelector('.canvas-bg');
        if (oldBg) oldBg.remove();
        const img = document.createElement('img');
        img.src = 'file:///' + data.path; // In real app, use server path
        img.className = 'canvas-bg';
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;';
        img.alt = data.name;
        canvas.insertBefore(img, canvas.firstChild);
        // Update scene property
        const sel = document.getElementById('selBackground');
        if (sel) sel.value = data.name;
        if (EditorState.autoSync) SettingsSync.syncToSettings({ background: data.name });
    },

    addSpriteToCanvas(data, x, y) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        saveUndo();
        const sprite = document.createElement('img');
        sprite.src = 'file:///' + data.path;
        sprite.className = 'canvas-sprite';
        sprite.style.cssText = 'position:absolute;left:' + (x - 100) + 'px;top:' + (y - 200) + 'px;height:400px;z-index:10;';
        sprite.dataset.name = data.name;
        sprite.onclick = (e) => {
            e.stopPropagation();
            canvas.querySelectorAll('.canvas-sprite').forEach(s => s.classList.remove('selected'));
            sprite.classList.add('selected');
            EditorState.selectedElement = data.name;
            SpriteDragger.makeDraggable(sprite);
        };
        canvas.appendChild(sprite);
        if (EditorState.autoSync) SettingsSync.syncToSettings({ sprite: data.name });
    },

    renderAssetPanel() {
        // Populate asset grids from EditorState.assets
        this.renderGrid('assetBgGrid', EditorState.assets.backgrounds, 'assets/backgrounds/');
        this.renderGrid('assetSpriteGrid', EditorState.assets.sprites, 'assets/sprites/');
        this.renderGrid('assetCgGrid', EditorState.assets.cgs, 'assets/cg/');
        this.renderList('assetAudioList', EditorState.assets.audio, 'assets/audio/');
    },

    renderGrid(containerId, items, basePath) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'asset-thumb';
            div.textContent = item.replace('.png', '').replace('.jpg', '');
            div.dataset.path = basePath + item;
            div.draggable = true;
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'asset', path: basePath + item, name: item,
                }));
            });
            container.appendChild(div);
        });
    },

    renderList(containerId, items, basePath) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'asset-list-item';
            div.textContent = '🔊 ' + item;
            div.dataset.path = basePath + item;
            div.draggable = true;
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'asset', path: basePath + item, name: item,
                }));
            });
            container.appendChild(div);
        });
    },

    importAsset(file) {
        // In real app: upload to server
        alert('导入素材: ' + file.name + '\n\n实际使用时需连接本地服务器上传文件。');
        // Add to state
        const ext = file.name.split('.').pop().toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            EditorState.assets.backgrounds.push(file.name);
        }
        this.renderAssetPanel();
    },
};

// =====================================================================
//  Sprite Dragger (helper)
// =====================================================================
const SpriteDragger = {
    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, origX, origY;
        el.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origX = parseInt(el.style.left) || 0;
            origY = parseInt(el.style.top) || 0;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            el.style.left = (origX + e.clientX - startX) + 'px';
            el.style.top = (origY + e.clientY - startY) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) saveUndo();
            isDragging = false;
        });
    },
};

// =====================================================================
//  P5.3 - Scene Editor
// =====================================================================
const SceneEditor = {
    init() {
        this.bindCanvasEvents();
    },

    bindCanvasEvents() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        canvas.addEventListener('click', (e) => {
            if (e.target === canvas) {
                canvas.querySelectorAll('.canvas-sprite').forEach(s => s.classList.remove('selected'));
                EditorState.selectedElement = null;
            }
        });
    },

    addCommand(type) {
        saveUndo();
        const cmd = { type: type, data: {} };
        switch (type) {
            case 'dialogue':
                cmd.data = { character: 'alice', text: '新对话内容', display_name: 'Alice' };
                break;
            case 'narration':
                cmd.data = { text: '新旁白内容' };
                break;
            case 'choice':
                cmd.data = { prompt: '请选择：', choices: [{ text: '选项1', target: '' }] };
                break;
            case 'background':
                cmd.data = { image: 'bg_classroom.png', transition: 'fade' };
                break;
            case 'show_sprite':
                cmd.data = { character: 'alice', sprite: 'alice_normal.png', position: 'center', transition: 'fade' };
                break;
            case 'bgm':
                cmd.data = { file: 'bgm_everyday.ogg', loop: true, fade_in: 1.0 };
                break;
            case 'hide_sprite':
                cmd.data = { character: 'alice', transition: 'fade' };
                break;
            case 'command':
                cmd.data = { action: 'jump', target: '' };
                break;
        }
        EditorState.timelineCommands.push(cmd);
        this.renderTimeline();
        // Select the new command
        EditorState.selectedTimelineIndex = EditorState.timelineCommands.length - 1;
        this.renderTimeline();
        updatePropertyPanelForCommand(cmd);
    },

    renderTimeline() {
        const container = document.getElementById('timelineScroll');
        if (!container) return;
        container.innerHTML = '';
        EditorState.timelineCommands.forEach((cmd, idx) => {
            const div = document.createElement('div');
            div.className = 'timeline-item' + (idx === EditorState.selectedTimelineIndex ? ' active' : '');
            div.innerHTML = '<span class="type-badge">' + this.getTypeLabel(cmd.type) + '</span>' +
                '<div>' + this.getCommandPreview(cmd) + '</div>';
            div.onclick = () => {
                EditorState.selectedTimelineIndex = idx;
                this.renderTimeline();
                updatePropertyPanelForCommand(cmd);
            };
            div.ondblclick = () => {
                // Inline edit
            };
            container.appendChild(div);
        });
        // Add button
        const addBtn = document.createElement('div');
        addBtn.className = 'timeline-item';
        addBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;color:#555;font-size:24px;min-width:60px;';
        addBtn.textContent = '+';
        addBtn.onclick = () => {
            const type = prompt('输入命令类型 (dialogue/narration/choice/background/show_sprite/bgm):', 'dialogue');
            if (type) this.addCommand(type);
        };
        container.appendChild(addBtn);

        const info = document.getElementById('timelineInfo');
        if (info) info.textContent = (EditorState.selectedTimelineIndex + 1) + ' / ' + EditorState.timelineCommands.length + ' 命令';
    },

    getTypeLabel(type) {
        const map = { dialogue: '对话', narration: '旁白', choice: '选项', background: '背景', show_sprite: '立绘', hide_sprite: '隐藏', bgm: 'BGM', sfx: '音效', command: '命令' };
        return map[type] || type;
    },

    getCommandPreview(cmd) {
        switch (cmd.type) {
            case 'dialogue': return (cmd.data.character || '???') + '<br>"' + (cmd.data.text || '').slice(0, 20) + '"';
            case 'narration': return '旁白<br>"' + (cmd.data.text || '').slice(0, 20) + '"';
            case 'choice': return '选项<br>' + ((cmd.data.choices || []).map(c => c.text).join(' / '));
            case 'background': return '背景<br>' + (cmd.data.image || '');
            case 'show_sprite': return '立绘<br>' + (cmd.data.character || '') + '/' + (cmd.data.sprite || '');
            case 'bgm': return 'BGM<br>' + (cmd.data.file || '');
            default: return cmd.type;
        }
    },

    deleteSelected() {
        if (EditorState.selectedTimelineIndex >= 0) {
            saveUndo();
            EditorState.timelineCommands.splice(EditorState.selectedTimelineIndex, 1);
            EditorState.selectedTimelineIndex = Math.max(-1, EditorState.selectedTimelineIndex - 1);
            this.renderTimeline();
        }
    },

    moveSelectedUp() {
        const idx = EditorState.selectedTimelineIndex;
        if (idx > 0) {
            saveUndo();
            const temp = EditorState.timelineCommands[idx];
            EditorState.timelineCommands[idx] = EditorState.timelineCommands[idx - 1];
            EditorState.timelineCommands[idx - 1] = temp;
            EditorState.selectedTimelineIndex = idx - 1;
            this.renderTimeline();
        }
    },

    moveSelectedDown() {
        const idx = EditorState.selectedTimelineIndex;
        if (idx >= 0 && idx < EditorState.timelineCommands.length - 1) {
            saveUndo();
            const temp = EditorState.timelineCommands[idx];
            EditorState.timelineCommands[idx] = EditorState.timelineCommands[idx + 1];
            EditorState.timelineCommands[idx + 1] = temp;
            EditorState.selectedTimelineIndex = idx + 1;
            this.renderTimeline();
        }
    },

    // Generate scene JSON from timeline
    generateSceneJSON() {
        const sceneId = document.getElementById('inpSceneId')?.value || 'scene_001';
        const sceneName = document.getElementById('inpSceneName')?.value || '';
        return {
            id: sceneId,
            name: sceneName,
            commands: EditorState.timelineCommands,
        };
    },

    // Load scene JSON into timeline
    loadSceneJSON(sceneData) {
        EditorState.timelineCommands = sceneData.commands || [];
        EditorState.selectedTimelineIndex = -1;
        document.getElementById('inpSceneId').value = sceneData.id || '';
        document.getElementById('inpSceneName').value = sceneData.name || '';
        this.renderTimeline();
    },
};

// =====================================================================
//  P5.4 - Timeline Editor (integrated with SceneEditor)
// =====================================================================
const TimelineEditor = {
    init() {
        this.bindEvents();
        SceneEditor.renderTimeline();
    },

    bindEvents() {
        const btnAdd = document.getElementById('btnTimelineAdd');
        if (btnAdd) btnAdd.onclick = () => SceneEditor.addCommand('dialogue');
        const btnDel = document.getElementById('btnTimelineDel');
        if (btnDel) btnDel.onclick = () => SceneEditor.deleteSelected();
        const btnUp = document.getElementById('btnTimelineUp');
        if (btnUp) btnUp.onclick = () => SceneEditor.moveSelectedUp();
        const btnDown = document.getElementById('btnTimelineDown');
        if (btnDown) btnDown.onclick = () => SceneEditor.moveSelectedDown();
    },
};

// =====================================================================
//  P5.5 - Flowchart Editor
// =====================================================================
const FlowchartEditor = {
    nodes: [],
    edges: [],
    selectedNode: null,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,

    init() {
        this.loadFromScenes();
        this.render();
        this.bindEvents();
    },

    loadFromScenes() {
        // Auto-generate nodes from scenes
        this.nodes = [];
        this.edges = [];
        EditorState.scenes.forEach((scene, idx) => {
            this.nodes.push({
                id: scene.id || ('scene_' + idx),
                label: scene.name || scene.id || ('Scene ' + idx),
                x: 100 + (idx % 4) * 220,
                y: 80 + Math.floor(idx / 4) * 140,
                type: 'scene',
            });
        });
        // Add start/end nodes if empty
        if (this.nodes.length === 0) {
            this.nodes.push({ id: '_start', label: '开始 Start', x: 100, y: 40, type: 'start' });
            this.nodes.push({ id: '_end', label: '结束 End', x: 100, y: 300, type: 'end' });
        }
    },

    render() {
        const canvas = document.getElementById('flowchartCanvas');
        if (!canvas) return;
        // Clear
        canvas.innerHTML = '';
        // Draw edges first (SVG)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
        this.edges.forEach(edge => {
            const from = this.nodes.find(n => n.id === edge.from);
            const to = this.nodes.find(n => n.id === edge.to);
            if (from && to) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', from.x + 60);
                line.setAttribute('y1', from.y + 40);
                line.setAttribute('x2', to.x + 60);
                line.setAttribute('y2', to.y);
                line.setAttribute('stroke', '#0f3460');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('marker-end', 'url(#arrowhead)');
                svg.appendChild(line);
            }
        });
        // Arrowhead marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#0f3460');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        canvas.appendChild(svg);

        // Draw nodes
        this.nodes.forEach(node => {
            const div = document.createElement('div');
            div.className = 'flowchart-node' + (this.selectedNode === node.id ? ' selected' : '') + ' ' + node.type;
            div.style.cssText = 'left:' + node.x + 'px;top:' + node.y + 'px;z-index:2;';
            div.textContent = node.label;
            if (node.type === 'start') div.style.borderColor = '#4CAF50';
            if (node.type === 'end') div.style.borderColor = '#f44336';
            if (node.type === 'choice') div.style.borderColor = '#FF9800';
            div.onmousedown = (e) => this.startNodeDrag(e, node.id);
            div.onclick = (e) => {
                e.stopPropagation();
                this.selectedNode = node.id;
                this.render();
            };
            div.ondblclick = (e) => {
                e.stopPropagation();
                this.editNode(node);
            };
            canvas.appendChild(div);
        });
    },

    startNodeDrag(e, nodeId) {
        e.stopPropagation();
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;
        this.dragging = true;
        this.selectedNode = nodeId;
        this.dragOffsetX = e.offsetX;
        this.dragOffsetY = e.offsetY;
        const onMove = (ev) => {
            if (!this.dragging) return;
            node.x = ev.clientX - this.dragOffsetX - 260; // sidebar width offset
            node.y = ev.clientY - this.dragOffsetY - 100; // toolbar offset
            this.render();
        };
        const onUp = () => {
            this.dragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (EditorState.autoSync) SettingsSync.syncToSettings({ flowchart: 'updated' });
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    editNode(node) {
        const newLabel = prompt('节点名称:', node.label);
        if (newLabel !== null) node.label = newLabel;
        const newType = prompt('节点类型 (scene/start/end/choice):', node.type);
        if (['scene', 'start', 'end', 'choice'].includes(newType)) node.type = newType;
        this.render();
    },

    addNode() {
        const label = prompt('节点名称:', 'New Scene');
        if (!label) return;
        const type = prompt('节点类型 (scene/choice):', 'scene');
        saveUndo();
        this.nodes.push({
            id: 'node_' + Date.now(),
            label: label,
            type: type || 'scene',
            x: 100 + Math.random() * 300,
            y: 80 + Math.random() * 200,
        });
        this.render();
    },

    addEdge() {
        if (this.nodes.length < 2) { alert('至少需要两个节点'); return; }
        const fromId = prompt('从节点 ID:', this.nodes[0].id);
        const toId = prompt('到节点 ID:', this.nodes[1].id);
        if (fromId && toId) {
            saveUndo();
            this.edges.push({ from: fromId, to: toId });
            this.render();
        }
    },

    bindEvents() {
        const canvas = document.getElementById('flowchartContainer');
        if (canvas) {
            canvas.onclick = (e) => {
                if (e.target === canvas || e.target.id === 'flowchartCanvas') {
                    this.selectedNode = null;
                    this.render();
                }
            };
        }
    },
};

// =====================================================================
//  P5.6 - UI Layout Editor
// =====================================================================
const UILayoutEditor = {
    selectedLayoutElem: null,

    init() {
        this.renderLayoutEditor();
        this.bindEvents();
    },

    renderLayoutEditor() {
        const container = document.getElementById('layoutCanvas');
        if (!container) return;
        container.innerHTML = '';
        const elements = EditorState.layouts.elements || [];
        elements.forEach(elem => {
            const div = document.createElement('div');
            div.className = 'layout-element' + (this.selectedLayoutElem === elem.id ? ' selected' : '');
            div.style.cssText = 'left:' + (elem.x || 0) + 'px;top:' + (elem.y || 0) + 'px;width:' + (elem.width || 200) + 'px;height:' + (elem.height || 100) + 'px;';
            div.textContent = elem.id + ' (' + (elem.type || 'panel') + ')';
            div.onmousedown = (e) => this.startElemDrag(e, elem.id);
            div.onclick = (e) => {
                e.stopPropagation();
                this.selectedLayoutElem = elem.id;
                this.renderLayoutEditor();
                this.showElementProperties(elem);
            };
            container.appendChild(div);
        });
    },

    startElemDrag(e, elemId) {
        e.stopPropagation();
        const elem = (EditorState.layouts.elements || []).find(el => el.id === elemId);
        if (!elem) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const origX = elem.x || 0;
        const origY = elem.y || 0;
        const onMove = (ev) => {
            elem.x = Math.max(0, origX + ev.clientX - startX);
            elem.y = Math.max(0, origY + ev.clientY - startY);
            this.renderLayoutEditor();
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (EditorState.autoSync) SettingsSync.syncToSettings({ layout: 'updated' });
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    showElementProperties(elem) {
        // Show in right panel
        const panel = document.getElementById('panelLayoutProps');
        if (panel) panel.style.display = 'block';
        document.getElementById('inpLayoutId').value = elem.id || '';
        document.getElementById('selAnchor').value = (elem.anchor || 'middle-center');
        document.getElementById('inpLayoutX').value = elem.x || 0;
        document.getElementById('inpLayoutY').value = elem.y || 0;
        document.getElementById('inpLayoutW').value = elem.width || 200;
        document.getElementById('inpLayoutH').value = elem.height || 100;
        document.getElementById('inpLayoutVisible').value = (elem.visible_if || '');
    },

    addElement() {
        saveUndo();
        const elements = EditorState.layouts.elements || [];
        const newId = 'element_' + (elements.length + 1);
        elements.push({
            id: newId,
            type: 'panel',
            x: 100, y: 100, width: 200, height: 100,
            style: { background_color: 'rgba(0,0,0,0.7)', text_color: '#FFFFFF', text_size: 24 },
            visible: true,
            text: '',
        });
        EditorState.layouts.elements = elements;
        this.renderLayoutEditor();
    },

    bindEvents() {
        // Bind property panel inputs
        const ids = ['inpLayoutX', 'inpLayoutY', 'inpLayoutW', 'inpLayoutH'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.onchange = () => this.onLayoutPropertyChange();
        });
    },

    onLayoutPropertyChange() {
        const elem = (EditorState.layouts.elements || []).find(e => e.id === this.selectedLayoutElem);
        if (!elem) return;
        saveUndo();
        elem.x = parseInt(document.getElementById('inpLayoutX')?.value) || 0;
        elem.y = parseInt(document.getElementById('inpLayoutY')?.value) || 0;
        elem.width = parseInt(document.getElementById('inpLayoutW')?.value) || 200;
        elem.height = parseInt(document.getElementById('inpLayoutH')?.value) || 100;
        this.renderLayoutEditor();
    },
};

// =====================================================================
//  P5.7 - Settings Sync
// =====================================================================
const SettingsSync = {
    enable() {
        EditorState.autoSync = true;
        this.showStatus('自动同步: 已启用');
    },

    disable() {
        EditorState.autoSync = false;
        this.showStatus('自动同步: 已禁用');
    },

    syncToSettings(changes) {
        if (!EditorState.autoSync) return;
        console.log('[SettingsSync]', JSON.stringify(changes));
        // In real app: POST to local server to update settings.json
        // For demo: save to localStorage
        const key = 'galengine_settings';
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        Object.assign(existing, changes);
        localStorage.setItem(key, JSON.stringify(existing));
    },

    generateSettingsJSON() {
        const scenes = {};
        EditorState.scenes.forEach(s => {
            scenes[s.id || 'scene'] = 'scripts/' + (s.id || 'scene') + '.json';
        });
        return {
            project: { name: 'Untitled Game', version: '0.1.0', author: '' },
            window: { width: 1280, height: 720, title: 'GalEngine Game' },
            assets: {
                backgrounds: 'assets/backgrounds',
                sprites: 'assets/sprites',
                cgs: 'assets/cg',
                audio: 'assets/audio',
                fonts: 'assets/fonts',
                ui: 'assets/ui',
            },
            scenes: scenes,
            ui: { layout: 'ui-layout.json' },
        };
    },

    showStatus(msg) {
        const el = document.getElementById('statusSave');
        if (el) {
            el.textContent = msg;
            el.style.opacity = '1';
            setTimeout(() => { el.style.opacity = '0.6'; }, 2000);
        }
    },
};

// =====================================================================
//  P5.8 - Compile Manager
// =====================================================================
const CompileManager = {
    compile() {
        const overlay = document.getElementById('compileProgress');
        const bar = document.getElementById('compileProgressBar');
        const status = document.getElementById('compileStatus');
        const title = document.getElementById('compileTitle');
        const log = document.getElementById('compileLog');
        if (!overlay) return;
        overlay.classList.add('active');
        if (title) title.textContent = '正在编译...';
        const steps = [
            { pct: 5, text: '正在验证项目...' },
            { pct: 15, text: '正在收集资源文件...' },
            { pct: 30, text: '正在编译场景脚本...' },
            { pct: 50, text: '正在打包数据文件 (.gpk)...' },
            { pct: 70, text: '正在打包运行时...' },
            { pct: 85, text: '正在生成可执行文件...' },
            { pct: 95, text: '正在写入输出目录...' },
            { pct: 100, text: '编译完成！' },
        ];
        let i = 0;
        const next = () => {
            if (i >= steps.length) {
                if (title) title.textContent = '编译完成！';
                if (log) log.innerHTML += '<div style="color:#4CAF50;">✓ 输出目录: build/dist/</div>';
                setTimeout(() => overlay.classList.remove('active'), 2000);
                return;
            }
            const step = steps[i];
            if (bar) bar.style.width = step.pct + '%';
            if (status) status.textContent = step.text;
            if (log) log.innerHTML += '<div>' + step.text + '</div>';
            i++;
            setTimeout(next, 400 + Math.random() * 400);
        };
        next();
    },

    compilePatch() {
        const name = prompt('请输入补丁名称:', 'patch_001');
        if (!name) return;
        alert('补丁编译功能\n\n实际使用时将:\n1. 扫描 patches/ 目录\n2. 打包选中的场景为 .gpk 文件\n3. 输出到 build/patches/');
    },
};

// =====================================================================
//  P5.9 - Preview Manager
// =====================================================================
const PreviewManager = {
    startPreview() {
        if (EditorState.isPreviewMode) {
            this.stopPreview();
            return;
        }
        EditorState.isPreviewMode = true;
        const panel = document.getElementById('previewPanel');
        if (panel) panel.classList.add('active');
        this.renderPreview();
        const btn = document.getElementById('btnPreview');
        if (btn) btn.classList.add('active');
    },

    stopPreview() {
        EditorState.isPreviewMode = false;
        const panel = document.getElementById('previewPanel');
        if (panel) panel.classList.remove('active');
        const btn = document.getElementById('btnPreview');
        if (btn) btn.classList.remove('active');
    },

    renderPreview() {
        const frame = document.getElementById('previewFrame');
        if (!frame) return;
        // Render a simple preview of current scene
        const scene = SceneEditor.generateSceneJSON();
        const html = this.buildPreviewHTML(scene);
        // Use data URL for preview
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        frame.src = dataUrl;
    },

    buildPreviewHTML(scene) {
        const commands = scene.commands || [];
        let dialogueHTML = '';
        let currentBg = '';
        commands.forEach(cmd => {
            if (cmd.type === 'background') currentBg = cmd.data.image || '';
            if (cmd.type === 'dialogue') {
                dialogueHTML += '<div style="margin:12px 0;"><span style="color:#e94560;font-weight:bold;">' +
                    (cmd.data.display_name || cmd.data.character || '???') + ':</span> ' +
                    (cmd.data.text || '') + '</div>';
            }
            if (cmd.type === 'narration') {
                dialogueHTML += '<div style="margin:12px 0;color:#aaa;font-style:italic;">' +
                    (cmd.data.text || '') + '</div>';
            }
            if (cmd.type === 'choice') {
                dialogueHTML += '<div style="margin:12px 0;">' + (cmd.data.prompt || '') + '<br>';
                (cmd.data.choices || []).forEach(ch => {
                    dialogueHTML += '<button style="margin:4px;padding:6px 16px;background:#0f3460;color:#e0e0e0;border:1px solid #e94560;border-radius:4px;cursor:pointer;">' + ch.text + '</button>';
                });
                dialogueHTML += '</div>';
            }
        });
        return '<!DOCTYPE html>' +
            '<html><head><meta charset="utf-8"><title>Preview</title>' +
            '<style>body{margin:0;padding:0;width:1280px;height:720px;overflow:hidden;font-family:"Microsoft YaHei",sans-serif;}' +
            '.bg{position:absolute;top:0;left:0;width:100%;height:100%;background:#1a1a2e;}' +
            '.dialogue-box{position:absolute;bottom:20px;left:10%;width:80%;background:rgba(0,0,0,0.75);border:1px solid #555;border-radius:8px;padding:16px;color:#e0e0e0;font-size:16px;}' +
            '</style></head><body>' +
            '<div class="bg">' + (currentBg ? '<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;color:#555;font-size:48px;">' + currentBg + '</div>' : '') + '</div>' +
            '<div class="dialogue-box">' + (dialogueHTML || '<span style="color:#555;">（空场景）</span>') + '</div>' +
            '</body></html>';
    },

    onEditorChange() {
        if (!EditorState.isPreviewMode) return;
        this.renderPreview();
    },
};

// =====================================================================
//  Mode Switching
// =====================================================================
function switchMode(mode) {
    EditorState.currentMode = mode;
    // Hide all editors
    const sceneEl = document.getElementById('canvasContainer');
    const flowEl = document.getElementById('flowchartContainer');
    const layoutEl = document.getElementById('layoutEditorContainer');
    const panelScene = document.getElementById('panelSceneProps');
    const panelLayout = document.getElementById('panelLayoutProps');

    if (sceneEl) sceneEl.style.display = (mode === 'scene') ? 'block' : 'none';
    if (flowEl) flowEl.style.display = (mode === 'flowchart') ? 'block' : 'none';
    if (layoutEl) layoutEl.style.display = (mode === 'layout') ? 'block' : 'none';
    if (panelScene) panelScene.style.display = (mode === 'scene' || mode === 'flowchart') ? 'block' : 'none';
    if (panelLayout) panelLayout.style.display = (mode === 'layout') ? 'block' : 'none';

    // Update toolbar buttons
    document.querySelectorAll('.toolbar button[id^="btnMode"]').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('btnMode' + mode.charAt(0).toUpperCase() + mode.slice(1));
    if (activeBtn) activeBtn.classList.add('active');

    if (mode === 'flowchart') FlowchartEditor.render();
    if (mode === 'layout') UILayoutEditor.renderLayoutEditor();
    updateStatusBar();
}

// =====================================================================
//  Sidebar Tab Switching
// =====================================================================
function initSidebarTabs() {
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            document.querySelectorAll('.project-tree, .asset-panel').forEach(el => el.classList.remove('active'));
            const panel = document.querySelector('.' + target + '-panel') || document.getElementById(target + 'Panel');
            if (panel) panel.classList.add('active');
            // Fallback: toggle project-tree and asset-panel
            if (target === 'project') {
                const pt = document.getElementById('projectTree');
                if (pt) pt.classList.add('active');
            }
            if (target === 'assets') {
                const ap = document.getElementById('assetPanel');
                if (ap) ap.classList.add('active');
            }
        };
    });
}

// =====================================================================
//  Property Panel Updates
// =====================================================================
function updatePropertyPanelForCommand(cmd) {
    // Populate right panel with command properties
    const selType = document.getElementById('selElemType');
    const selChar = document.getElementById('selCharacter');
    const inpText = document.getElementById('inpText');
    const selVoice = document.getElementById('selVoice');
    const selSprite = document.getElementById('selSprite');
    if (selType) selType.value = cmd.type;
    if (selChar && cmd.data.character) selChar.value = cmd.data.character;
    if (inpText && cmd.data.text !== undefined) inpText.value = cmd.data.text;
    if (selVoice && cmd.data.voice) selVoice.value = cmd.data.voice;
    if (selSprite && cmd.data.sprite) selSprite.value = cmd.data.sprite;
}

// =====================================================================
//  Save / Load
// =====================================================================
function saveAll() {
    const scene = SceneEditor.generateSceneJSON();
    console.log('[Save] Scene JSON:', JSON.stringify(scene, null, 2));
    // In real app: POST to server
    const status = document.getElementById('statusSave');
    if (status) {
        status.textContent = '已保存 ' + new Date().toLocaleTimeString();
    }
    SettingsSync.syncToSettings({ last_save: new Date().toISOString() });
}

function loadSceneFromFile() {
    // In real app: open file dialog via server
    alert('打开场景文件\n\n实际使用时可通过菜单"文件 > 打开场景"选择 .json 场景文件。');
}

// =====================================================================
//  Initialization
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('GalEngine Editor JS loading...');

    // Init all modules
    AssetManager.init();
    SceneEditor.init();
    TimelineEditor.init();
    FlowchartEditor.init();
    UILayoutEditor.init();

    initSidebarTabs();

    // Bind mode buttons
    const btnScene = document.getElementById('btnModeScene');
    if (btnScene) btnScene.onclick = () => switchMode('scene');
    const btnFlow = document.getElementById('btnModeFlowchart');
    if (btnFlow) btnFlow.onclick = () => switchMode('flowchart');
    const btnLayout = document.getElementById('btnModeLayout');
    if (btnLayout) btnLayout.onclick = () => switchMode('layout');

    // Bind editor mode select
    const selMode = document.getElementById('selEditorMode');
    if (selMode) selMode.onchange = () => switchMode(selMode.value);

    // Bind toolbar buttons
    const btnCompile = document.getElementById('btnCompile');
    if (btnCompile) btnCompile.onclick = () => CompileManager.compile();

    const btnPreview = document.getElementById('btnPreview');
    if (btnPreview) btnPreview.onclick = () => PreviewManager.startPreview();

    const btnClosePreview = document.getElementById('btnClosePreview');
    if (btnClosePreview) btnClosePreview.onclick = () => PreviewManager.stopPreview();

    const btnSave = document.getElementById('btnSave');
    if (btnSave) btnSave.onclick = () => saveAll();

    const btnAddScene = document.getElementById('btnAddScene');
    if (btnAddScene) btnAddScene.onclick = () => {
        const modal = document.getElementById('modalAddScene');
        if (modal) modal.classList.add('active');
    };

    const btnAddDialogue = document.getElementById('btnAddDialogue');
    if (btnAddDialogue) btnAddDialogue.onclick = () => SceneEditor.addCommand('dialogue');

    const btnAddChoice = document.getElementById('btnAddChoice');
    if (btnAddChoice) btnAddChoice.onclick = () => SceneEditor.addCommand('choice');

    const btnUndo = document.getElementById('btnUndo');
    if (btnUndo) btnUndo.onclick = () => undo();

    const btnRedo = document.getElementById('btnRedo');
    if (btnRedo) btnRedo.onclick = () => redo();

    const btnFlowAdd = document.getElementById('btnFlowAdd');
    if (btnFlowAdd) btnFlowAdd.onclick = () => FlowchartEditor.addNode();

    const btnLayoutAdd = document.getElementById('btnLayoutAdd');
    if (btnLayoutAdd) btnLayoutAdd.onclick = () => UILayoutEditor.addElement();

    // Property panel changes
    const inpText = document.getElementById('inpText');
    if (inpText) inpText.oninput = () => {
        const idx = EditorState.selectedTimelineIndex;
        if (idx >= 0 && EditorState.timelineCommands[idx]) {
            EditorState.timelineCommands[idx].data.text = inpText.value;
            SceneEditor.renderTimeline();
            PreviewManager.onEditorChange();
        }
    };
    const selElemType = document.getElementById('selElemType');
    if (selElemType) selElemType.onchange = () => {
        const idx = EditorState.selectedTimelineIndex;
        if (idx >= 0 && EditorState.timelineCommands[idx]) {
            EditorState.timelineCommands[idx].type = selElemType.value;
            SceneEditor.renderTimeline();
        }
    };

    // Initial timeline render
    SceneEditor.renderTimeline();
    updateStatusBar();

    console.log('GalEngine Editor JS loaded successfully.');
    console.log('P5.2-P5.9 modules initialized.');
});
