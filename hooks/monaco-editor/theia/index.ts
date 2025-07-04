'use client'

import { RefObject, useEffect, useRef, useState } from "react";
import * as monaco from '@theia/monaco-editor-core';

type EditorType = monaco.editor.IStandaloneCodeEditor | null;

export default function useEditor(
  options?: monaco.editor.IStandaloneEditorConstructionOptions,
  override?: monaco.editor.IEditorOverrideServices,
): [EditorType, RefObject<HTMLDivElement | null>] {
  const [editor, setEditor] = useState<EditorType>(null);
  const monacoEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // monaco 初始化
    console.log("monaco 初始化")
  }, [])

  useEffect(() => {

    const domNode = monacoEl.current;
    let _editor: EditorType;
    if (domNode) {

      setEditor((editor) => {
        if (editor && editor.getDomNode() !== null || _editor) {
          return editor;
        }

        _editor = monaco.editor.create(
          domNode,
          options ?? {
            value: ["111"].join("\n"),
            automaticLayout: true,
            inlineSuggest: {
              enabled: true,
            },
            mouseWheelZoom: true,
            language: "javascript",
          },
          override,
        )

        return _editor;
      });
    }

    return () => {
      _editor?.dispose();
    };
  }, []);

  return [editor, monacoEl];
}