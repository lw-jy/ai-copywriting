import { ref } from "vue"

export interface BookmarkItem {
  _id: string
  productName: string
  platform: string
  title: string
  body: string
  rawContent: string
  createdAt: string
}

/**
 * 收藏管理 — 需要外部传入 authHeader 函数以携带登录 token
 */
export function useBookmarks(getAuthHeader: () => Record<string, string>) {
  const bookmarks = ref<BookmarkItem[]>([])
  const loaded = ref(false)

  function headers(): Record<string, string> {
    return { "Content-Type": "application/json", ...getAuthHeader() }
  }

  async function fetchAll() {
    try {
      const res = await fetch("/api/bookmarks", { headers: getAuthHeader() })
      if (res.ok) bookmarks.value = await res.json()
    } catch {
      // 静默失败
    } finally {
      loaded.value = true
    }
  }

  function isSaved(rawContent: string): boolean {
    return bookmarks.value.some((b) => b.rawContent === rawContent)
  }

  function getBookmarkId(rawContent: string): string | null {
    return bookmarks.value.find((b) => b.rawContent === rawContent)?._id ?? null
  }

  async function save(data: {
    productName: string
    platform: string
    title: string
    body: string
    rawContent: string
  }): Promise<string | null> {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(data),
      })
      if (!res.ok) return null
      const item: BookmarkItem = await res.json()
      bookmarks.value.unshift(item)
      return item._id
    } catch {
      return null
    }
  }

  async function remove(rawContent: string): Promise<boolean> {
    const id = getBookmarkId(rawContent)
    if (!id) return false
    try {
      const res = await fetch(`/api/bookmarks/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      })
      if (!res.ok) return false
      bookmarks.value = bookmarks.value.filter((b) => b._id !== id)
      return true
    } catch {
      return false
    }
  }

  return { bookmarks, loaded, fetchAll, isSaved, save, remove }
}
