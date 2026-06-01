/**
 * Flowchart Engine — tree-based scene/story visualization.
 * Python: galengine/flowchart/flowchart.py
 */

import type { FlowchartNode, FlowchartNodeType, FlowchartNodeStatus, LoadedProject, BranchConfig } from './types';

export class FlowchartEngine {
  private _roots: FlowchartNode[] = [];
  private _nodeMap = new Map<string, FlowchartNode>();
  private _orientation: 'horizontal' | 'vertical';

  constructor(orientation: 'horizontal' | 'vertical' = 'horizontal') {
    this._orientation = orientation;
  }

  get roots(): FlowchartNode[] { return this._roots; }
  get allNodes(): FlowchartNode[] { return [...this._nodeMap.values()]; }

  /** Build flowchart from loaded project settings. */
  buildFromProject(project: LoadedProject): void {
    this._roots = [];
    this._nodeMap.clear();

    // Create nodes for each scene
    const sceneIds = Object.keys(project.settings.scenes);
    let x = 0;

    sceneIds.forEach((sceneId, i) => {
      const node = this._createNode({
        id: `node_${sceneId}`,
        name: sceneId,
        type: 'scene',
        sceneId,
        position: this._orientation === 'horizontal'
          ? [x + i * 200, 0]
          : [0, i * 150],
      });

      if (i === 0) {
        this._roots.push(node);
      } else {
        // Simple linear chain for now; real parsing would detect jumps/choices
        const prev = this._nodeMap.get(`node_${sceneIds[i - 1]}`);
        if (prev) {
          prev.children.push(node);
          node.parent = prev;
        }
      }
    });

    // Mark branch nodes from branch config
    const branches = project.settings.branches ?? {};
    Object.entries(branches).forEach(([branchId, branch]: [string, BranchConfig]) => {
      const entryNode = this._nodeMap.get(`node_${branch.entry_scene}`);
      if (entryNode) {
        entryNode.type = 'branch_start';
        entryNode.metadata.branchName = branch.name;
      }
    });
  }

  /** Mark a node's status. */
  setNodeStatus(sceneId: string, status: FlowchartNodeStatus): void {
    const node = this._nodeMap.get(`node_${sceneId}`);
    if (node) node.status = status;
  }

  /** Reset all statuses. */
  resetStatuses(): void {
    this._nodeMap.forEach((node) => {
      node.status = 'locked';
    });
    // Unlock first root
    this._roots.forEach((root) => {
      this._unlockChain(root);
    });
  }

  private _unlockChain(node: FlowchartNode): void {
    node.status = node.status === 'locked' ? 'unlocked' : node.status;
    node.children.forEach((c) => this._unlockChain(c));
  }

  private _createNode(partial: Partial<FlowchartNode> & { id: string; sceneId: string }): FlowchartNode {
    const node: FlowchartNode = {
      id: partial.id,
      name: partial.name ?? partial.sceneId!,
      type: partial.type ?? 'scene',
      sceneId: partial.sceneId!,
      status: partial.status ?? 'locked',
      children: [],
      parent: null,
      position: partial.position ?? [0, 0],
      metadata: {},
    };
    this._nodeMap.set(node.id, node);
    return node;
  }
}
