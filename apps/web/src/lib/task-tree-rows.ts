import type { Task } from '@taskforge/shared';

export interface TaskRow {
  task: Task;
  depth: number;
}

/**
 * Given all tasks for a board and an ordered list of root tasks (already
 * filtered/sorted by the caller), produce a flat display list where each
 * root is followed by its descendants in DFS order with increasing depth.
 * Children at each level are sorted by created_at ascending.
 */
export function buildTaskTreeRows(
  allTasks: Task[],
  orderedRoots: Task[],
): TaskRow[] {
  const childrenByParent = new Map<string, Task[]>();
  for (const t of allTasks) {
    if (!t.parent_task_id) continue;
    let siblings = childrenByParent.get(t.parent_task_id);
    if (!siblings) {
      siblings = [];
      childrenByParent.set(t.parent_task_id, siblings);
    }
    siblings.push(t);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  const rows: TaskRow[] = [];

  function walk(task: Task, depth: number) {
    rows.push({ task, depth });
    const children = childrenByParent.get(task.id);
    if (children) {
      for (const child of children) {
        walk(child, depth + 1);
      }
    }
  }

  for (const root of orderedRoots) {
    walk(root, 0);
  }

  return rows;
}

/**
 * Recursively collect IDs of all descendant subtasks that are currently
 * unassigned (assignee_user_id is null).  Used to cascade an owner
 * assignment from a parent task down to its unassigned children.
 */
export function getUnassignedDescendantIds(
  allTasks: Task[],
  parentId: string,
): string[] {
  const ids: string[] = [];
  for (const t of allTasks) {
    if (t.parent_task_id === parentId && !t.assignee_user_id) {
      ids.push(t.id);
      ids.push(...getUnassignedDescendantIds(allTasks, t.id));
    }
  }
  return ids;
}
