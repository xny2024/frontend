'use client'

import MonacoEditor from "@/components/monaco-editor/viewZone";
import { useState } from "react";

export default function App() {

  const [viewZoneShow, setViewZoneShow] = useState(false);

  return (
    <>
      <button onClick={() => setViewZoneShow(!viewZoneShow)}>切换</button>
      <MonacoEditor viewZoneShow={viewZoneShow}></MonacoEditor>
    </>
  )
}