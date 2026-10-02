import 'server-only';
import type { ExportFile } from './layout';

// Minimal GitHub REST client for one job: replace the whole tree of a branch with one commit.

type Repo = { token: string; repo: string; branch: string };

class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function gh<T>(r: Repo, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${r.repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${r.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    // Never include the token or request body in the error; the API message is enough.
    const detail = await res
      .json()
      .then((j: { message?: string }) => j.message)
      .catch(() => '');
    throw new GitHubError(
      res.status,
      `GitHub ${method} ${path}: ${res.status} ${detail ?? ''}`.trim(),
    );
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/**
 * Commit `files` as the complete content of the branch. Returns the commit URL, or null when
 * nothing changed. Retries once if the branch moved in between (concurrent export).
 */
export async function commitTree(
  r: Repo,
  files: ExportFile[],
  message: string,
): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    let parent: string | null = null;
    let parentTree: string | null = null;
    try {
      const ref = await gh<{ object: { sha: string } }>(r, 'GET', `/git/ref/heads/${r.branch}`);
      parent = ref.object.sha;
      const commit = await gh<{ tree: { sha: string } }>(r, 'GET', `/git/commits/${parent}`);
      parentTree = commit.tree.sha;
    } catch (e) {
      if (!(e instanceof GitHubError)) throw e;
      if (e.status === 409 && attempt === 0) {
        // A brand-new empty repository rejects the Git Data API entirely; the Contents API
        // can create the first commit (on the default branch — an empty repo has no other),
        // after which we rebuild on top of it or start the target branch from scratch.
        await gh(r, 'PUT', '/contents/README.md', {
          message: 'Initialize course export',
          content: Buffer.from('# Course export\n').toString('base64'),
        });
        continue;
      }
      // 404: the repository has commits, but not this branch yet.
      if (e.status !== 404) throw e;
    }

    const tree = [];
    for (const f of files) {
      if ('content' in f) {
        tree.push({ path: f.path, mode: '100644', type: 'blob', content: f.content });
      } else {
        const blob = await gh<{ sha: string }>(r, 'POST', '/git/blobs', {
          content: f.base64,
          encoding: 'base64',
        });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
    }
    // No base_tree: the new tree *is* the repository, so deleted content disappears too.
    const newTree = await gh<{ sha: string }>(r, 'POST', '/git/trees', { tree });
    if (newTree.sha === parentTree) return null;

    const commit = await gh<{ sha: string; html_url: string }>(r, 'POST', '/git/commits', {
      message,
      tree: newTree.sha,
      parents: parent ? [parent] : [],
    });
    try {
      if (parent) {
        await gh(r, 'PATCH', `/git/refs/heads/${r.branch}`, { sha: commit.sha, force: false });
      } else {
        await gh(r, 'POST', '/git/refs', { ref: `refs/heads/${r.branch}`, sha: commit.sha });
      }
      return commit.html_url;
    } catch (e) {
      // 422 "not a fast forward": someone else pushed first — rebuild on top of it once.
      if (attempt === 0 && e instanceof GitHubError && e.status === 422) continue;
      throw e;
    }
  }
}
