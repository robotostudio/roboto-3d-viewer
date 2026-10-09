import * as THREE from "three";

/**
 * Connected pieces of a mesh: union-find over shared vertices, plus each
 * piece's world-space bounds. `pieceOf(vertex)` returns the piece's root.
 */
function connectedPieces(mesh: THREE.Mesh) {
  const index = mesh.geometry.index as THREE.BufferAttribute;
  const position = mesh.geometry.getAttribute("position");

  const parent = new Int32Array(position.count);
  for (let vertex = 0; vertex < parent.length; vertex++) {
    parent[vertex] = vertex;
  }
  const pieceOf = (vertex: number) => {
    let node = vertex;
    // Typed arrays: every index here is in range.
    while (parent[node] !== node) {
      const grandparent = parent[parent[node] as number] as number;
      parent[node] = grandparent;
      node = grandparent;
    }
    return node;
  };
  for (let corner = 0; corner < index.count; corner += 3) {
    const first = pieceOf(index.getX(corner));
    for (const offset of [1, 2]) {
      const other = pieceOf(index.getX(corner + offset));
      if (other !== first) parent[other] = first;
    }
  }

  mesh.updateWorldMatrix(true, false);
  const bounds = new Map<number, THREE.Box3>();
  const point = new THREE.Vector3();
  for (let vertex = 0; vertex < position.count; vertex++) {
    point.fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
    const root = pieceOf(vertex);
    let box = bounds.get(root);
    if (!box) {
      box = new THREE.Box3();
      bounds.set(root, box);
    }
    box.expandByPoint(point);
  }
  return { index, pieceOf, bounds };
}

/** A mesh drawing only `triangles`, sharing the source's vertex attributes. */
function subMesh(
  source: THREE.Mesh,
  triangles: number[],
  material: THREE.Material | THREE.Material[],
  name: string
) {
  const geometry = new THREE.BufferGeometry();
  for (const [key, attribute] of Object.entries(source.geometry.attributes)) {
    geometry.setAttribute(key, attribute);
  }
  geometry.setIndex(triangles);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  // Same local transform: meshopt quantisation lives in it.
  mesh.position.copy(source.position);
  mesh.quaternion.copy(source.quaternion);
  mesh.scale.copy(source.scale);
  mesh.renderOrder = source.renderOrder;
  mesh.castShadow = source.castShadow;
  return mesh;
}

/**
 * Split the connected pieces of `mesh` that `select` picks into their own
 * mesh, drawn with `material`. The rest stays on the original mesh.
 *
 * Used to repair source-model faults that live in shared textures: a part
 * whose UVs overlap other parts' dark patches in the texture atlas renders as
 * stripes. Splitting it off and giving it a real chrome material fixes it
 * without touching the GLB.
 */
export function splitPieces(
  mesh: THREE.Mesh,
  select: (bounds: THREE.Box3) => boolean,
  material: THREE.Material
) {
  if (!mesh.geometry.index) return null;
  const { index, pieceOf, bounds } = connectedPieces(mesh);

  const selected = new Set<number>();
  for (const [root, box] of bounds) if (select(box)) selected.add(root);
  if (selected.size === 0) return null;

  const kept: number[] = [];
  const split: number[] = [];
  for (let corner = 0; corner < index.count; corner += 3) {
    const target = selected.has(pieceOf(index.getX(corner))) ? split : kept;
    target.push(
      index.getX(corner),
      index.getX(corner + 1),
      index.getX(corner + 2)
    );
  }
  mesh.geometry.setIndex(kept);

  const splitMesh = subMesh(mesh, split, material, `${mesh.name}-split`);
  mesh.parent?.add(splitMesh);
  return splitMesh;
}

/**
 * Regroup a model into functional assemblies.
 *
 * GLB meshes are often grouped by material rather than by part (one white
 * shell mesh can span a product from base to top), so every
 * connected piece of every mesh is classified on its own and the model is
 * rebuilt as one THREE.Group per assembly. Groups are parented where the
 * meshes were, so moving a group moves its parts without touching their
 * quantised local transforms.
 */
export function partitionMeshes(
  root: THREE.Object3D,
  classify: (centre: THREE.Vector3, meshName: string) => string
) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry.index) {
      meshes.push(object);
    }
  });

  const groups = new Map<string, THREE.Group>();
  const groupFor = (id: string, parent: THREE.Object3D) => {
    let group = groups.get(id);
    if (!group) {
      group = new THREE.Group();
      group.name = `assembly:${id}`;
      parent.add(group);
      groups.set(id, group);
    }
    return group;
  };

  // World-space bounds per assembly, from the real pieces. (Sub-meshes share
  // their source's vertex attributes, so three's own bounding boxes would
  // cover the whole original mesh, not the assembly.)
  const bounds = new Map<string, THREE.Box3>();
  const centre = new THREE.Vector3();
  const sourceGeometries = new Set<THREE.BufferGeometry>();
  for (const mesh of meshes) {
    const parent = mesh.parent;
    if (!parent) continue;
    const { index, pieceOf, bounds: pieces } = connectedPieces(mesh);

    const assemblyOf = new Map<number, string>();
    for (const [piece, box] of pieces) {
      const id = classify(box.getCenter(centre), mesh.name);
      assemblyOf.set(piece, id);
      const total = bounds.get(id) ?? new THREE.Box3();
      bounds.set(id, total.union(box));
    }

    const buckets = new Map<string, number[]>();
    for (let corner = 0; corner < index.count; corner += 3) {
      const id = assemblyOf.get(pieceOf(index.getX(corner))) as string;
      let bucket = buckets.get(id);
      if (!bucket) {
        bucket = [];
        buckets.set(id, bucket);
      }
      bucket.push(
        index.getX(corner),
        index.getX(corner + 1),
        index.getX(corner + 2)
      );
    }

    for (const [id, triangles] of buckets) {
      const piece = subMesh(
        mesh,
        triangles,
        mesh.material,
        `${mesh.name}:${id}`
      );
      const group = groupFor(id, parent);
      if (group.parent === parent) {
        group.add(piece);
      } else {
        // Meshes under other nodes (Sketchfab-style exports give each part
        // its own transform node): keep the piece where it is in the world.
        parent.add(piece);
        piece.updateWorldMatrix(true, false);
        group.attach(piece);
      }
    }
    parent.remove(mesh);
    sourceGeometries.add(mesh.geometry);
  }
  // Only now drop the source indices: dedup'd models share one geometry
  // between several meshes (repeated bolts and nuts), and each needs it.
  for (const geometry of sourceGeometries) geometry.setIndex(null);
  return { groups, bounds };
}
