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
  | 'newproject.create';

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
