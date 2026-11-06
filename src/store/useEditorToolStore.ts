import { create } from 'zustand'

/** Công cụ đang chọn ở thanh công cụ bên trái; canvas đọc cùng giá trị này (một nguồn duy nhất). */
export type EditorTool = 'select' | 'node' | 'edge' | 'poi' | 'calibrate' | 'delete'

type EditorToolState = {
  tool: EditorTool
  setTool: (tool: EditorTool) => void
}

export const useEditorToolStore = create<EditorToolState>((set) => ({
  tool: 'select',
  setTool: (tool) => set({ tool }),
}))
