import type { ConceptNode } from "@/lib/types"

export type FlatConcept = { id: string; label: string; depth: number }

/** Depth-first flatten for parent <select> options. */
export function flattenTree(nodes: ConceptNode[], depth = 0): FlatConcept[] {
  const out: FlatConcept[] = []
  for (const node of nodes) {
    out.push({ id: node.id, label: node.label, depth })
    if (node.children.length) out.push(...flattenTree(node.children, depth + 1))
  }
  return out
}

export function findNode(
  nodes: ConceptNode[],
  id: string,
): ConceptNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

/** ids of `node` and all of its descendants — invalid reparent targets. */
export function getSubtreeIds(node: ConceptNode): Set<string> {
  const ids = new Set<string>()
  const walk = (n: ConceptNode) => {
    ids.add(n.id)
    n.children.forEach(walk)
  }
  walk(node)
  return ids
}
