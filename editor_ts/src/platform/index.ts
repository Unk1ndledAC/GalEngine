/**
 * Platform layer — public API surface.
 */

export { IPC } from './ipc';
export type { IpcChannelMap, FileStat, DialogOpenOptions, GalEngineBridge } from './ipc';
export { ElectronVFS, getElectronVFS } from './electron-vfs';
export { PluginHost, getPluginHost } from './plugin';
export type { PluginDescriptor } from './plugin';
