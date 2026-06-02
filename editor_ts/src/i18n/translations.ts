/**
 * i18n Translation Map — All UI strings used in the editor.
 *
 * Each language (zh-CN, ja-JP, en-US) maps translation keys to localized text.
 * Structured as a flat key-value map for simplicity and type safety.
 */

import type { Language } from '@workbench/settings/SettingsStore';

// ---------------------------------------------------------------------------
// Translation Key Type
// ---------------------------------------------------------------------------

/** All known translation keys. Add new keys here as the UI grows. */
export type TranslationKey =
  // Activity Bar
  | 'activitybar.explorer'
  | 'activitybar.plugins'
  | 'activitybar.llm'
  | 'activitybar.debug'
  // Status Bar
  | 'statusbar.unsaved'
  | 'statusbar.autosave'
  | 'statusbar.utf8'
  // File Tree
  | 'filetree.title'
  | 'filetree.newFile'
  | 'filetree.newFolder'
  | 'filetree.refresh'
  | 'filetree.sortByName'
  | 'filetree.sortByType'
  | 'filetree.loading'
  | 'filetree.noProject'
  | 'filetree.openHint'
  | 'filetree.openProject'
  | 'filetree.contextNewFile'
  | 'filetree.contextRename'
  | 'filetree.contextDelete'
  | 'filetree.confirmDelete'
  | 'filetree.confirmDeleteDir'
  | 'filetree.cancel'
  | 'filetree.delete'
  | 'filetree.filenamePlaceholder'
  // Editor
  | 'editor.noFileOpen'
  | 'editor.clickToOpen'
  | 'editor.loading'
  | 'editor.loadTimeout'
  | 'editor.loadError'
  | 'editor.preview'
  | 'editor.closePreview'
  | 'editor.closeTab'
  // Preview
  | 'preview.loading'
  | 'preview.error'
  | 'preview.close'
  // Settings
  | 'settings.title'
  | 'settings.close'
  | 'settings.autoSave'
  | 'settings.autoSaveEnable'
  | 'settings.autoSaveDelay'
  | 'settings.autoSaveHint'
  | 'settings.language'
  | 'settings.languageHint'
  // Search
  | 'search.find'
  | 'search.replace'
  | 'search.findInFiles'
  | 'search.replaceInFiles'
  | 'search.matchCase'
  | 'search.wholeWord'
  | 'search.regex'
  | 'search.noResults'
  | 'search.results'
  | 'search.searching'
  // Menu
  | 'menu.file'
  | 'menu.edit'
  | 'menu.view'
  | 'menu.help'
  | 'menu.newProject'
  | 'menu.openProject'
  | 'menu.save'
  | 'menu.saveAs'
  | 'menu.about'
  // Welcome
  | 'welcome.title'
  | 'welcome.subtitle'
  | 'welcome.newProject'
  | 'welcome.openProject'
  | 'welcome.recentProjects'
  | 'welcome.clearRecent'
  // New Project Dialog
  | 'newproject.title'
  | 'newproject.name'
  | 'newproject.location'
  | 'newproject.browse'
  | 'newproject.cancel'
  | 'newproject.create'
  | 'newproject.creating'
  | 'newproject.hint'
  | 'newproject.selectDir'
  | 'newproject.enterName'
  | 'newproject.invalidName'
  | 'newproject.selectDirHint'
  // Menu items (for Electron native menu)
  | 'menu.undo'
  | 'menu.redo'
  | 'menu.cut'
  | 'menu.copy'
  | 'menu.paste'
  | 'menu.selectAll'
  | 'menu.exit'
  | 'menu.reload'
  | 'menu.forceReload'
  | 'menu.toggleDevTools'
  | 'menu.resetZoom'
  | 'menu.zoomIn'
  | 'menu.zoomOut'
  | 'menu.toggleFullscreen'
  | 'menu.closeProject'
  | 'menu.find'
  | 'menu.replace'
  | 'menu.findInFiles'
  | 'menu.reloadWindow'
  | 'menu.resetZoomWindow'
  // Editor Area
  | 'editor.project'
  | 'editor.previewGame'
  | 'editor.previewBtn'
  | 'editor.closePreviewBtn'
  | 'editor.loadingEditor'
  | 'editor.find'
  | 'editor.replace'
  // Preview Panel
  | 'preview.play'
  | 'preview.stop'
  | 'preview.pauseResume'
  | 'preview.skipText'
  | 'preview.preview'
  | 'preview.dismiss'
  | 'preview.noScenes'
  // Welcome
  | 'welcome.version'
  | 'welcome.browserMode'
  // Debug Panel
  | 'debug.variables'
  | 'debug.noSession'
  | 'debug.breakpoints'
  | 'debug.noBreakpoints'
  | 'debug.callStack'
  | 'debug.notRunning'
  // AI Chat Panel
  | 'ai.title'
  | 'ai.settings'
  | 'ai.provider'
  | 'ai.openai'
  | 'ai.custom'
  | 'ai.apiKey'
  | 'ai.endpoint'
  | 'ai.model'
  | 'ai.temperature'
  | 'ai.sceneIdPlaceholder'
  | 'ai.sceneNamePlaceholder'
  | 'ai.empty'
  | 'ai.emptyHint'
  | 'ai.you'
  | 'ai.system'
  | 'ai.insertIntoEditor'
  | 'ai.copyJson'
  | 'ai.describeScene'
  | 'ai.send'
  | 'ai.configureApiKey'
  // Plugin Manager
  | 'plugins.title'
  | 'plugins.installing'
  | 'plugins.install'
  | 'plugins.refresh'
  | 'plugins.noPlugins'
  | 'plugins.emptyHint'
  | 'plugins.pluginCount'
  | 'plugins.activeCount'
  | 'plugins.enable'
  | 'plugins.disable'
  | 'plugins.uninstall'
  | 'plugins.active'
  | 'plugins.disabled'
  | 'plugins.error'
  | 'plugins.main'
  | 'plugins.activatesOn'
  | 'plugins.commands'
  // Search Panel extra
  | 'search.invalidRegex'
  | 'search.replacedSummary'
  | 'search.moreMatches';

// ---------------------------------------------------------------------------
// Translation Data
// ---------------------------------------------------------------------------

const zhCN: Record<TranslationKey, string> = {
  // Activity Bar
  'activitybar.explorer': '资源管理器',
  'activitybar.plugins': '插件',
  'activitybar.llm': 'AI助手',
  'activitybar.debug': '调试',
  // Status Bar
  'statusbar.unsaved': '个未保存',
  'statusbar.autosave': '自动保存',
  'statusbar.utf8': 'UTF-8',
  // File Tree
  'filetree.title': '资源管理器',
  'filetree.newFile': '新建文件',
  'filetree.newFolder': '新建文件夹',
  'filetree.refresh': '刷新',
  'filetree.sortByName': '按名称',
  'filetree.sortByType': '按类型',
  'filetree.loading': '加载中...',
  'filetree.noProject': '未打开项目',
  'filetree.openHint': '使用 Ctrl+O 打开项目，或 Ctrl+N 创建新项目。',
  'filetree.openProject': '打开项目',
  'filetree.contextNewFile': '新建文件',
  'filetree.contextRename': '重命名',
  'filetree.contextDelete': '删除',
  'filetree.confirmDelete': '确定要删除',
  'filetree.confirmDeleteDir': '这将递归删除所有内容。',
  'filetree.cancel': '取消',
  'filetree.delete': '删除',
  'filetree.filenamePlaceholder': '文件名.ext',
  // Editor
  'editor.noFileOpen': '未打开文件',
  'editor.clickToOpen': '在资源管理器中点击文件以打开，或使用 Ctrl+O。',
  'editor.loading': '加载中',
  'editor.loadTimeout': '文件加载超时',
  'editor.loadError': '文件加载失败',
  'editor.preview': '预览',
  'editor.closePreview': '关闭预览',
  'editor.closeTab': '关闭',
  // Preview
  'preview.loading': '预览加载中...',
  'preview.error': '预览错误',
  'preview.close': '关闭',
  // Settings
  'settings.title': '编辑器设置',
  'settings.close': '关闭',
  'settings.autoSave': '自动保存',
  'settings.autoSaveEnable': '启用自动保存',
  'settings.autoSaveDelay': '自动保存延迟（秒）：',
  'settings.autoSaveHint': '停止输入后在设定延迟后自动保存文件。',
  'settings.language': '语言 / Language',
  'settings.languageHint': '更改立即生效，无需重启。',
  // Search
  'search.find': '查找',
  'search.replace': '替换',
  'search.findInFiles': '在文件中查找',
  'search.replaceInFiles': '在文件中替换',
  'search.matchCase': '区分大小写',
  'search.wholeWord': '全字匹配',
  'search.regex': '正则表达式',
  'search.noResults': '未找到结果',
  'search.results': '个结果',
  'search.searching': '搜索中...',
  // Menu
  'menu.file': '文件',
  'menu.edit': '编辑',
  'menu.view': '视图',
  'menu.help': '帮助',
  'menu.newProject': '新建项目',
  'menu.openProject': '打开项目...',
  'menu.save': '保存',
  'menu.saveAs': '另存为...',
  'menu.about': '关于 GalEngine Editor',
  // Welcome
  'welcome.title': 'GalEngine Editor',
  'welcome.subtitle': '视觉小说引擎 & IDE',
  'welcome.newProject': '新建项目',
  'welcome.openProject': '打开项目',
  'welcome.recentProjects': '最近项目',
  'welcome.clearRecent': '清除',
  // New Project Dialog
  'newproject.title': '新建 GalEngine 项目',
  'newproject.name': '项目名称',
  'newproject.location': '项目位置',
  'newproject.browse': '浏览...',
  'newproject.cancel': '取消',
  'newproject.create': '创建',
  'newproject.creating': '创建中...',
  'newproject.hint': '将创建为：',
  'newproject.selectDir': '（选择目录）',
  'newproject.enterName': '请输入项目名称。',
  'newproject.invalidName': '项目名称只能包含字母、数字、空格、连字符、下划线和点。',
  'newproject.selectDirHint': '请选择父目录。',
  // Menu items
  'menu.undo': '撤销',
  'menu.redo': '重做',
  'menu.cut': '剪切',
  'menu.copy': '复制',
  'menu.paste': '粘贴',
  'menu.selectAll': '全选',
  'menu.exit': '退出',
  'menu.reload': '重新加载',
  'menu.forceReload': '强制重新加载',
  'menu.toggleDevTools': '切换开发者工具',
  'menu.resetZoom': '重置缩放',
  'menu.zoomIn': '放大',
  'menu.zoomOut': '缩小',
  'menu.toggleFullscreen': '切换全屏',
  'menu.closeProject': '关闭项目',
  'menu.find': '查找',
  'menu.replace': '替换',
  'menu.findInFiles': '在文件中查找',
  'menu.reloadWindow': '重新加载窗口',
  'menu.resetZoomWindow': '重置缩放',
  // Editor Area
  'editor.project': '项目：',
  'editor.previewGame': '预览游戏',
  'editor.previewBtn': '预览',
  'editor.closePreviewBtn': '■ 预览',
  'editor.loadingEditor': '加载编辑器...',
  'editor.find': '查找',
  'editor.replace': '替换',
  // Preview Panel
  'preview.play': '播放',
  'preview.stop': '停止',
  'preview.pauseResume': '暂停/继续',
  'preview.skipText': '跳过文本',
  'preview.preview': '预览',
  'preview.dismiss': '关闭',
  'preview.noScenes': '未找到场景。',
  // Welcome
  'welcome.version': 'v0.2.0',
  'welcome.browserMode': '正在浏览器模式下运行。文件系统功能需要 Electron 桌面应用。',
  // Debug Panel
  'debug.variables': '变量',
  'debug.noSession': '没有活动的游戏会话。',
  'debug.breakpoints': '断点',
  'debug.noBreakpoints': '没有设置断点。',
  'debug.callStack': '调用栈',
  'debug.notRunning': '未运行。',
  // AI Chat Panel
  'ai.title': 'AI 场景生成器',
  'ai.settings': '设置',
  'ai.provider': '提供商',
  'ai.openai': 'OpenAI',
  'ai.custom': '自定义（OpenAI 兼容）',
  'ai.apiKey': 'API 密钥',
  'ai.endpoint': '端点',
  'ai.model': '模型',
  'ai.temperature': '温度',
  'ai.sceneIdPlaceholder': '场景 ID（例如 school_day1）',
  'ai.sceneNamePlaceholder': '场景名称（例如 第一天）',
  'ai.empty': '描述你想要创建的场景。',
  'ai.emptyHint': '示例："Akari在夕阳下的学校天台遇见了Kenji。他们谈论即将到来的节日。她紧张但兴奋。"',
  'ai.you': '你',
  'ai.system': '系统',
  'ai.insertIntoEditor': '插入到编辑器',
  'ai.copyJson': '复制 JSON',
  'ai.describeScene': '描述场景...',
  'ai.send': '发送',
  'ai.configureApiKey': '请先配置您的 API 密钥（点击齿轮图标）。',
  // Plugin Manager
  'plugins.title': '插件',
  'plugins.installing': '安装中...',
  'plugins.install': '+ 安装',
  'plugins.refresh': '刷新',
  'plugins.noPlugins': '未安装插件。',
  'plugins.emptyHint': '点击"+ 安装"添加 .galplugin 文件，\n或创建包含 manifest + code 的插件。',
  'plugins.pluginCount': '个插件',
  'plugins.activeCount': '个激活',
  'plugins.enable': '启用',
  'plugins.disable': '禁用',
  'plugins.uninstall': '卸载',
  'plugins.active': '活跃',
  'plugins.disabled': '已禁用',
  'plugins.error': '错误',
  'plugins.main': '主文件：',
  'plugins.activatesOn': '激活条件：',
  'plugins.commands': '命令：',
  // Search Panel extra
  'search.invalidRegex': '无效的正则表达式',
  'search.replacedSummary': '已替换',
  'search.moreMatches': '还有更多匹配',
};

const jaJP: Record<TranslationKey, string> = {
  'activitybar.explorer': 'エクスプローラー',
  'activitybar.plugins': 'プラグイン',
  'activitybar.llm': 'AIアシスタント',
  'activitybar.debug': 'デバッグ',
  'statusbar.unsaved': '件未保存',
  'statusbar.autosave': '自動保存',
  'statusbar.utf8': 'UTF-8',
  'filetree.title': 'エクスプローラー',
  'filetree.newFile': '新規ファイル',
  'filetree.newFolder': '新規フォルダ',
  'filetree.refresh': '更新',
  'filetree.sortByName': '名前順',
  'filetree.sortByType': '種類順',
  'filetree.loading': '読み込み中...',
  'filetree.noProject': 'プロジェクト未開封',
  'filetree.openHint': 'Ctrl+O でプロジェクトを開く、または Ctrl+N で新規作成。',
  'filetree.openProject': 'プロジェクトを開く',
  'filetree.contextNewFile': '新規ファイル',
  'filetree.contextRename': '名前の変更',
  'filetree.contextDelete': '削除',
  'filetree.confirmDelete': '本当に削除しますか？',
  'filetree.confirmDeleteDir': '全ての内容が再帰的に削除されます。',
  'filetree.cancel': 'キャンセル',
  'filetree.delete': '削除',
  'filetree.filenamePlaceholder': 'ファイル名.ext',
  'editor.noFileOpen': 'ファイル未選択',
  'editor.clickToOpen': 'エクスプローラーからファイルをクリック、または Ctrl+O。',
  'editor.loading': '読み込み中',
  'editor.loadTimeout': '読み込みタイムアウト',
  'editor.loadError': '読み込みエラー',
  'editor.preview': 'プレビュー',
  'editor.closePreview': 'プレビューを閉じる',
  'editor.closeTab': '閉じる',
  'preview.loading': 'プレビュー読み込み中...',
  'preview.error': 'プレビューエラー',
  'preview.close': '閉じる',
  'settings.title': 'エディタ設定',
  'settings.close': '閉じる',
  'settings.autoSave': '自動保存',
  'settings.autoSaveEnable': '自動保存を有効にする',
  'settings.autoSaveDelay': '自動保存の遅延（秒）：',
  'settings.autoSaveHint': '入力を止めてから設定された秒数後に自動保存します。',
  'settings.language': '言語 / Language',
  'settings.languageHint': '変更は即座に反映され、再起動は不要です。',
  'search.find': '検索',
  'search.replace': '置換',
  'search.findInFiles': 'ファイル内検索',
  'search.replaceInFiles': 'ファイル内置換',
  'search.matchCase': '大文字小文字',
  'search.wholeWord': '単語単位',
  'search.regex': '正規表現',
  'search.noResults': '結果が見つかりません',
  'search.results': '件の結果',
  'search.searching': '検索中...',
  'menu.file': 'ファイル',
  'menu.edit': '編集',
  'menu.view': '表示',
  'menu.help': 'ヘルプ',
  'menu.newProject': '新規プロジェクト',
  'menu.openProject': 'プロジェクトを開く...',
  'menu.save': '保存',
  'menu.saveAs': '名前を付けて保存...',
  'menu.about': 'GalEngine Editor について',
  'welcome.title': 'GalEngine Editor',
  'welcome.subtitle': 'ビジュアルノベルエンジン & IDE',
  'welcome.newProject': '新規プロジェクト',
  'welcome.openProject': 'プロジェクトを開く',
  'welcome.recentProjects': '最近のプロジェクト',
  'welcome.clearRecent': 'クリア',
  'newproject.title': '新規 GalEngine プロジェクト',
  'newproject.name': 'プロジェクト名',
  'newproject.location': 'プロジェクトの場所',
  'newproject.browse': '参照...',
  'newproject.cancel': 'キャンセル',
  'newproject.create': '作成',
  'newproject.creating': '作成中...',
  'newproject.hint': '作成先：',
  'newproject.selectDir': '（ディレクトリを選択）',
  'newproject.enterName': 'プロジェクト名を入力してください。',
  'newproject.invalidName': 'プロジェクト名は英数字、スペース、ハイフン、アンダースコア、ドットのみ使用可能です。',
  'newproject.selectDirHint': '親ディレクトリを選択してください。',
  // Menu items
  'menu.undo': '元に戻す',
  'menu.redo': 'やり直し',
  'menu.cut': '切り取り',
  'menu.copy': 'コピー',
  'menu.paste': '貼り付け',
  'menu.selectAll': 'すべて選択',
  'menu.exit': '終了',
  'menu.reload': '再読み込み',
  'menu.forceReload': '強制再読み込み',
  'menu.toggleDevTools': '開発者ツールを切り替え',
  'menu.resetZoom': 'ズームをリセット',
  'menu.zoomIn': 'ズームイン',
  'menu.zoomOut': 'ズームアウト',
  'menu.toggleFullscreen': '全画面切り替え',
  'menu.closeProject': 'プロジェクトを閉じる',
  'menu.find': '検索',
  'menu.replace': '置換',
  'menu.findInFiles': 'ファイル内検索',
  'menu.reloadWindow': 'ウィンドウを再読み込み',
  'menu.resetZoomWindow': 'ズームをリセット',
  // Editor Area
  'editor.project': 'プロジェクト：',
  'editor.previewGame': 'ゲームをプレビュー',
  'editor.previewBtn': 'プレビュー',
  'editor.closePreviewBtn': '■ プレビュー',
  'editor.loadingEditor': 'エディタ読み込み中...',
  'editor.find': '検索',
  'editor.replace': '置換',
  // Preview Panel
  'preview.play': '再生',
  'preview.stop': '停止',
  'preview.pauseResume': '一時停止/再開',
  'preview.skipText': 'テキストスキップ',
  'preview.preview': 'プレビュー',
  'preview.dismiss': '閉じる',
  'preview.noScenes': 'シーンが見つかりません。',
  // Welcome
  'welcome.version': 'v0.2.0',
  'welcome.browserMode': 'ブラウザモードで実行中。ファイルシステム機能にはElectronデスクトップアプリが必要です。',
  // Debug Panel
  'debug.variables': '変数',
  'debug.noSession': 'アクティブなゲームセッションがありません。',
  'debug.breakpoints': 'ブレークポイント',
  'debug.noBreakpoints': 'ブレークポイントは設定されていません。',
  'debug.callStack': 'コールスタック',
  'debug.notRunning': '実行していません。',
  // AI Chat Panel
  'ai.title': 'AI シーン生成',
  'ai.settings': '設定',
  'ai.provider': 'プロバイダー',
  'ai.openai': 'OpenAI',
  'ai.custom': 'カスタム（OpenAI互換）',
  'ai.apiKey': 'API キー',
  'ai.endpoint': 'エンドポイント',
  'ai.model': 'モデル',
  'ai.temperature': '温度',
  'ai.sceneIdPlaceholder': 'シーンID（例：school_day1）',
  'ai.sceneNamePlaceholder': 'シーン名（例：初めての登校）',
  'ai.empty': '作成したいシーンを説明してください。',
  'ai.emptyHint': '例：「Akariが夕暮れの学校の屋上でKenjiに会う。彼らはこれからの祭りについて話す。彼女は緊張しているがワクワクしている。」',
  'ai.you': 'あなた',
  'ai.system': 'システム',
  'ai.insertIntoEditor': 'エディタに挿入',
  'ai.copyJson': 'JSONをコピー',
  'ai.describeScene': 'シーンを説明...',
  'ai.send': '送信',
  'ai.configureApiKey': '先にAPIキーを設定してください（歯車アイコンをクリック）。',
  // Plugin Manager
  'plugins.title': 'プラグイン',
  'plugins.installing': 'インストール中...',
  'plugins.install': '+ インストール',
  'plugins.refresh': '更新',
  'plugins.noPlugins': 'プラグインがインストールされていません。',
  'plugins.emptyHint': '「+ インストール」をクリックして.galpluginファイルを追加するか、\nmanifest + code を含むプラグインを作成してください。',
  'plugins.pluginCount': '件のプラグイン',
  'plugins.activeCount': '件アクティブ',
  'plugins.enable': '有効化',
  'plugins.disable': '無効化',
  'plugins.uninstall': 'アンインストール',
  'plugins.active': 'アクティブ',
  'plugins.disabled': '無効',
  'plugins.error': 'エラー',
  'plugins.main': 'メイン：',
  'plugins.activatesOn': '起動条件：',
  'plugins.commands': 'コマンド：',
  // Search Panel extra
  'search.invalidRegex': '無効な正規表現',
  'search.replacedSummary': '置換済み',
  'search.moreMatches': 'さらに一致する項目があります',
};

const enUS: Record<TranslationKey, string> = {
  'activitybar.explorer': 'Explorer',
  'activitybar.plugins': 'Plugins',
  'activitybar.llm': 'AI Assistant',
  'activitybar.debug': 'Debug',
  'statusbar.unsaved': 'unsaved',
  'statusbar.autosave': 'AutoSave',
  'statusbar.utf8': 'UTF-8',
  'filetree.title': 'Explorer',
  'filetree.newFile': 'New File',
  'filetree.newFolder': 'New Folder',
  'filetree.refresh': 'Refresh',
  'filetree.sortByName': 'Name',
  'filetree.sortByType': 'Type',
  'filetree.loading': 'Loading...',
  'filetree.noProject': 'No Project Open',
  'filetree.openHint': 'Use Ctrl+O to open a project, or Ctrl+N to create a new one.',
  'filetree.openProject': 'Open Project',
  'filetree.contextNewFile': 'New File',
  'filetree.contextRename': 'Rename',
  'filetree.contextDelete': 'Delete',
  'filetree.confirmDelete': 'Are you sure you want to delete',
  'filetree.confirmDeleteDir': 'This will delete all contents recursively.',
  'filetree.cancel': 'Cancel',
  'filetree.delete': 'Delete',
  'filetree.filenamePlaceholder': 'filename.ext',
  'editor.noFileOpen': 'No file open',
  'editor.clickToOpen': 'Click a file in the Explorer to open it, or use Ctrl+O.',
  'editor.loading': 'Loading',
  'editor.loadTimeout': 'File load timed out',
  'editor.loadError': 'Error loading file',
  'editor.preview': 'Preview',
  'editor.closePreview': 'Close Preview',
  'editor.closeTab': 'Close',
  'preview.loading': 'Preview loading...',
  'preview.error': 'Preview Error',
  'preview.close': 'Close',
  'settings.title': 'Editor Settings',
  'settings.close': 'Close',
  'settings.autoSave': 'Auto Save',
  'settings.autoSaveEnable': 'Enable Auto Save',
  'settings.autoSaveDelay': 'Auto Save Delay (seconds):',
  'settings.autoSaveHint': 'Files will be auto-saved after the set delay when you stop typing.',
  'settings.language': 'Language / \u8bed\u8a00',
  'settings.languageHint': 'Changes take effect immediately. Restart not required.',
  'search.find': 'Find',
  'search.replace': 'Replace',
  'search.findInFiles': 'Find in Files',
  'search.replaceInFiles': 'Replace in Files',
  'search.matchCase': 'Match Case',
  'search.wholeWord': 'Whole Word',
  'search.regex': 'Regex',
  'search.noResults': 'No results found',
  'search.results': 'results',
  'search.searching': 'Searching...',
  'menu.file': 'File',
  'menu.edit': 'Edit',
  'menu.view': 'View',
  'menu.help': 'Help',
  'menu.newProject': 'New Project',
  'menu.openProject': 'Open Project...',
  'menu.save': 'Save',
  'menu.saveAs': 'Save As...',
  'menu.about': 'About GalEngine Editor',
  'welcome.title': 'GalEngine Editor',
  'welcome.subtitle': 'Visual Novel Engine & IDE',
  'welcome.newProject': 'New Project',
  'welcome.openProject': 'Open Project',
  'welcome.recentProjects': 'Recent Projects',
  'welcome.clearRecent': 'Clear',
  'newproject.title': 'New GalEngine Project',
  'newproject.name': 'Project Name',
  'newproject.location': 'Project Location',
  'newproject.browse': 'Browse...',
  'newproject.cancel': 'Cancel',
  'newproject.create': 'Create',
  'newproject.creating': 'Creating...',
  'newproject.hint': 'Will be created as:',
  'newproject.selectDir': '(select directory)',
  'newproject.enterName': 'Please enter a project name.',
  'newproject.invalidName': 'Project name can only contain letters, numbers, spaces, hyphens, underscores and dots.',
  'newproject.selectDirHint': 'Please select a parent directory.',
  // Menu items
  'menu.undo': 'Undo',
  'menu.redo': 'Redo',
  'menu.cut': 'Cut',
  'menu.copy': 'Copy',
  'menu.paste': 'Paste',
  'menu.selectAll': 'Select All',
  'menu.exit': 'Exit',
  'menu.reload': 'Reload',
  'menu.forceReload': 'Force Reload',
  'menu.toggleDevTools': 'Toggle Developer Tools',
  'menu.resetZoom': 'Reset Zoom',
  'menu.zoomIn': 'Zoom In',
  'menu.zoomOut': 'Zoom Out',
  'menu.toggleFullscreen': 'Toggle Full Screen',
  'menu.closeProject': 'Close Project',
  'menu.find': 'Find',
  'menu.replace': 'Replace',
  'menu.findInFiles': 'Find in Files',
  'menu.reloadWindow': 'Reload Window',
  'menu.resetZoomWindow': 'Reset Zoom',
  // Editor Area
  'editor.project': 'Project:',
  'editor.previewGame': 'Preview Game',
  'editor.previewBtn': '▶ Preview',
  'editor.closePreviewBtn': '■ Preview',
  'editor.loadingEditor': 'Loading editor...',
  'editor.find': 'Find',
  'editor.replace': 'Replace',
  // Preview Panel
  'preview.play': 'Play',
  'preview.stop': 'Stop',
  'preview.pauseResume': 'Pause/Resume',
  'preview.skipText': 'Skip text',
  'preview.preview': 'Preview',
  'preview.dismiss': 'Dismiss',
  'preview.noScenes': 'No scenes found in project.',
  // Welcome
  'welcome.version': 'v0.2.0',
  'welcome.browserMode': 'Running in browser mode. File system features require the Electron desktop app.',
  // Debug Panel
  'debug.variables': 'Variables',
  'debug.noSession': 'No active game session.',
  'debug.breakpoints': 'Breakpoints',
  'debug.noBreakpoints': 'No breakpoints set.',
  'debug.callStack': 'Call Stack',
  'debug.notRunning': 'Not running.',
  // AI Chat Panel
  'ai.title': 'AI Scene Generator',
  'ai.settings': 'Settings',
  'ai.provider': 'Provider',
  'ai.openai': 'OpenAI',
  'ai.custom': 'Custom (OpenAI-compatible)',
  'ai.apiKey': 'API Key',
  'ai.endpoint': 'Endpoint',
  'ai.model': 'Model',
  'ai.temperature': 'Temperature',
  'ai.sceneIdPlaceholder': 'Scene ID (e.g., school_day1)',
  'ai.sceneNamePlaceholder': 'Scene Name (e.g., First Day of School)',
  'ai.empty': 'Describe the scene you want to create.',
  'ai.emptyHint': 'Example: "Akari meets Kenji at the school rooftop at sunset. They talk about the upcoming festival. She\'s nervous but excited."',
  'ai.you': 'You',
  'ai.system': 'System',
  'ai.insertIntoEditor': 'Insert into Editor',
  'ai.copyJson': 'Copy JSON',
  'ai.describeScene': 'Describe the scene...',
  'ai.send': 'Send',
  'ai.configureApiKey': 'Please configure your API key first (click gear icon).',
  // Plugin Manager
  'plugins.title': 'Plugins',
  'plugins.installing': 'Installing...',
  'plugins.install': '+ Install',
  'plugins.refresh': 'Refresh',
  'plugins.noPlugins': 'No plugins installed.',
  'plugins.emptyHint': 'Click "+ Install" to add a .galplugin file,\nor create one with manifest + code.',
  'plugins.pluginCount': 'plugin(s)',
  'plugins.activeCount': 'active',
  'plugins.enable': 'Enable',
  'plugins.disable': 'Disable',
  'plugins.uninstall': 'Uninstall',
  'plugins.active': 'Active',
  'plugins.disabled': 'Disabled',
  'plugins.error': 'Error',
  'plugins.main': 'Main:',
  'plugins.activatesOn': 'Activates on:',
  'plugins.commands': 'Commands:',
  // Search Panel extra
  'search.invalidRegex': 'Invalid regex pattern',
  'search.replacedSummary': 'Replaced',
  'search.moreMatches': 'more matches',
};

// ---------------------------------------------------------------------------
// Translation Map
// ---------------------------------------------------------------------------

const translations: Record<Language, Record<TranslationKey, string>> = {
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'en-US': enUS,
};

export default translations;
