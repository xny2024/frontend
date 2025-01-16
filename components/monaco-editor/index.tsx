'use client'

import { useEditor } from "@/hooks/monaco-editor"

export default function App () {
  const [editor, monacoEl] = useEditor();
  console.log(editor);

  return <div style={{ height: "600px" }} ref={monacoEl}></div>
}
