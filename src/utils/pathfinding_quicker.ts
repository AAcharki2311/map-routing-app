/**
 * Optimized Pathfinding Module
 * Implements A* pathfinding algorithm with performance optimizations
 * Uses binary heap for efficient open set management and early terrain validation
 */

import { getTerrainCost } from './terrainConstants';

/**
 * Represents a node in the pathfinding grid
 * Contains position, cost information, and parent reference for path reconstruction
 */
export interface Node {
  x: number; // X coordinate in the grid
  y: number; // Y coordinate in the grid
  g: number; // Cost from start to this node
  h: number; // Heuristic cost from this node to end
  f: number; // Total cost (g + h)
  parent?: Node; // Reference to parent node for path reconstruction
}

/**
 * Result of pathfinding operation
 * Contains the found path, distance, success status, and performance metrics
 */
export interface PathResult {
  path: Node[]; // Array of nodes representing the path
  distance: number; // Total cost of the path
  success: boolean; // Whether a path was found
  computationTime?: number; // Time taken to compute the path in milliseconds
}

/**
 * Binary heap implementation for efficient open set management
 * Provides O(log n) insertion and O(log n) extraction of minimum element
 * Uses a map for O(1) node lookup and update operations
 */
class BinaryHeap {
  private heap: Node[] = [];
  private nodeMap = new Map<string, number>(); // Maps node keys to heap indices

  //Generates a unique key for a node based on its coordinates
  private getKey(node: Node): string {
    return `${node.x},${node.y}`;
  }

  //Swaps two elements in the heap and updates their positions in the node map
  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    this.nodeMap.set(this.getKey(this.heap[i]), i);
    this.nodeMap.set(this.getKey(this.heap[j]), j);
  }

  //Moves an element up the heap to maintain min-heap property
  private heapifyUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].f >= this.heap[parentIndex].f) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  //Moves an element down the heap to maintain min-heap property
  private heapifyDown(index: number): void {
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      // Find the smallest among current node and its children
      if (left < this.heap.length && this.heap[left].f < this.heap[smallest].f) {
        smallest = left;
      }
      if (right < this.heap.length && this.heap[right].f < this.heap[smallest].f) {
        smallest = right;
      }

      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  /**
   * Adds or updates a node in the heap
   * If node already exists, updates it; otherwise adds as new node
   */
  push(node: Node): void {
    const key = this.getKey(node);
    if (this.nodeMap.has(key)) {
      // Update existing node; heapify only in necessary direction
      const index = this.nodeMap.get(key)!;
      const oldF = this.heap[index].f;
      this.heap[index] = node;
      if (node.f < oldF) {
        this.heapifyUp(index);
      } else if (node.f > oldF) {
        this.heapifyDown(index);
      }
      // If equal, no heapify needed
    } else {
      // Add new node to the end and heapify up
      this.heap.push(node);
      this.nodeMap.set(key, this.heap.length - 1);
      this.heapifyUp(this.heap.length - 1);
    }
  }

  //Removes and returns the minimum element from the heap
  pop(): Node | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) {
      const node = this.heap.pop()!;
      this.nodeMap.clear();
      return node;
    }

    // Remove root and replace with last element, then heapify down
    const root = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.nodeMap.delete(this.getKey(root));
    this.nodeMap.set(this.getKey(this.heap[0]), 0);
    this.heapifyDown(0);
    return root;
  }

  //Checks if the heap is empty
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  //Checks if a node exists in the heap
  has(node: Node): boolean {
    return this.nodeMap.has(this.getKey(node));
  }
}

/**
 * Heuristic function using Euclidean distance
 * Provides a decent heuristic for A* pathfinding
 */
function getHeuristic(a: Node, b: Node): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.sqrt(dx * dx + dy * dy);
}

// Pre-computed direction offsets for 8-directional movement, includes diagonal movement for more natural pathfinding
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Optimized neighbor generation with early terrain cost checking, 
// generates valid neighboring nodes while filtering out impassable terrain
function getNeighbors(node: Node, terrainMap: string[][], width: number, height: number): Node[] {
  const neighbors: Node[] = [];
  const x = node.x;
  const y = node.y;

  // Check all 8 directions around the current node
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const [dx, dy] = DIRECTIONS[i];
    const nx = x + dx;
    const ny = y + dy;
    
    // Bounds check -> skip if outside map boundaries
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    
    // Early terrain cost check to avoid creating unnecessary nodes
    // This optimization prevents processing impassable terrain
    const terrain = terrainMap[ny][nx];
    if (getTerrainCost(terrain) === Infinity) continue;
    
    // Create neighbor node with basic structure
    neighbors.push({
      x: nx,
      y: ny,
      g: 0, // Will be calculated in A* algorithm
      h: 0, // Will be calculated in A* algorithm
      f: 0, // Will be calculated in A* algorithm
      parent: node
    });
  }
  
  return neighbors;
}

//Main A* algorithm function
export function findPath(
  startX: number, 
  startY: number, 
  endX: number, 
  endY: number, 
  terrainMap: string[][]
): PathResult {
  const startTime = performance.now();
  const width = terrainMap[0].length;
  const height = terrainMap.length;
  
  // Early validation -> skip if outside map boundaries
  if (startX < 0 || startY < 0 || startX >= width || startY >= height ||
      endX < 0 || endY < 0 || endX >= width || endY >= height) {
    return { path: [], distance: 0, success: false };
  }
  
  // Quick terrain validation -> skip if on impassable terrain
  if (getTerrainCost(terrainMap[startY][startX]) === Infinity ||
      getTerrainCost(terrainMap[endY][endX]) === Infinity) {
    return { path: [], distance: 0, success: false };
  }
  
  // Early start and end node check -> skip if start and end are the same
  if (startX === endX && startY === endY) {
    const endTime = performance.now();
    return {
      path: [{ x: startX, y: startY, g: 0, h: 0, f: 0 }],
      distance: 0,
      success: true,
      computationTime: Math.round(endTime - startTime)
    };
  }
  
  // Initialize optimized data structures for A* algorithm
  const openSet = new BinaryHeap(); // Priority queue for nodes to explore (priotized by f score)
  const closedSet = new Set<string>(); // Set of processed nodes (best look up time)
  const gScore = new Map<string, number>(); // Cost from start to each node
  const fScore = new Map<string, number>(); // Total cost (g + h) for each node
  
  // Create start node
  const start: Node = {
    x: startX,
    y: startY,
    g: 0, // Cost from start to start is 0
    h: getHeuristic({ x: startX, y: startY, g: 0, h: 0, f: 0 }, { x: endX, y: endY, g: 0, h: 0, f: 0 }),
    f: 0 // Will be calculated
  };
  
  // Create end node
  const end: Node = {
    x: endX,
    y: endY,
    g: 0,
    h: 0,
    f: 0
  };
  
  // Initialize scores for the starting node
  const startKey = `${startX},${startY}`;
  gScore.set(startKey, 0);
  fScore.set(startKey, start.h);
  openSet.push(start);
  
  // Main A* algorithm loop with optimized data structures
  while (!openSet.isEmpty()) {
    const current = openSet.pop()!;
    const currentKey = `${current.x},${current.y}`;
    
    // Skip if already processed (duplicate in heap)
    if (closedSet.has(currentKey)) continue;
    
    closedSet.add(currentKey);
    
    // Early goal check -> have we reached the destination?
    if (current.x === endX && current.y === endY) {
      // Optimized path reconstruction by following parent chain
      const path: Node[] = [];
      let node: Node | undefined = current;
      
      // Reconstruct path by following parent references
      while (node) {
        path.push(node);
        node = node.parent;
      }

      // Reverse the path to get the correct order
      path.reverse();
      
      // Calculate end time and return path result
      const endTime = performance.now();
      return {
        path,
        distance: current.g,
        success: true,
        computationTime: Math.round(endTime - startTime)
      };
    }
    
    // Process neighbors with optimized checks
    const neighbors = getNeighbors(current, terrainMap, width, height);
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      // Skip if already processed
      if (closedSet.has(neighborKey)) continue;
      
      // Calculate movement cost with optimized diagonal movement check
      const terrain = terrainMap[neighbor.y][neighbor.x];
      const terrainCost = getTerrainCost(terrain);

      // Diagonal movement costs √2 times more than straight movement (~some greek guy)
      const isDiagonal = Math.abs(neighbor.x - current.x) === 1 && Math.abs(neighbor.y - current.y) === 1;
      const movementCost = isDiagonal ? terrainCost * 1.414 : terrainCost;
      
      const newGScore = (gScore.get(currentKey) || 0) + movementCost;
      const currentG = gScore.get(neighborKey) || Infinity;
      
      // Only process if this is a better path to the neighbor
      if (newGScore < currentG) {
        const h = getHeuristic(neighbor, end);
        const f = newGScore + h;
        
        // Update scores for this neighbor
        gScore.set(neighborKey, newGScore);
        fScore.set(neighborKey, f);
        
        // Create optimized neighbor node with calculated costs
        const neighborNode: Node = {
          x: neighbor.x,
          y: neighbor.y,
          g: newGScore,
          h: h,
          f: f,
          parent: current
        };
        
        // Add to open set 
        // (since we're using a binary heap, it will update the node if it already exists)
        openSet.push(neighborNode);
      }
    }
  }
  
  // No path found - all possible paths have been explored
  const endTime = performance.now();
  return { 
    path: [], 
    distance: 0, 
    success: false,
    computationTime: Math.round(endTime - startTime)
  };
}