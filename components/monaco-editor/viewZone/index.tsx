import { useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { createRoot } from "react-dom/client";
import { Disposable, DisposableCollection } from "../../../utils/disposable";
import ViewZoneRender, { ViewZoneObserver, ZoneLayoutData } from "./viewZoneRender";
import { runInAction } from "mobx";
import useEditor from "@/hooks/monaco-editor/useEditor";

interface Props {
  viewZoneShow: boolean;
}

const zoneLayoutData: ZoneLayoutData = [
  {
    afterLineNumber: 0,
    heightInLines: 1,
  },
  {
    afterLineNumber: 1,
    heightInLines: 2,
  },
  ...Array.from({length: 8000}).map((v, index) => ({
    afterLineNumber: index,
    heightInLines: 1,
  }))
];

const App = (props: Props) => {
  const option = {
    value: Array.from({length: 8000}).map((v, index) => "1").join("\n"),
  };
  const [editor, monacoEl] = useEditor(option);

  const { viewZoneShow } = props;
  
  useEffect(() => {
    const toDispose = new DisposableCollection();

    if (editor && viewZoneShow) {
      const getFontSize = () => {
        return editor.getOption(monaco.editor.EditorOption.fontSize);
      }

      const getMultiplier = () => {
        return 1 + monaco.editor.EditorZoom.getZoomLevel() * 0.1;
      }

      const zoneOptions: monaco.editor.IViewZone[] = [];

      zoneLayoutData.forEach((zoneLineData) => {
        const div = document.createElement("div");

        zoneOptions.push({
          ...zoneLineData,
          domNode: div,
        })

        zoneLineData.domNode = div;
      })

      const root = createRoot(document.createElement("div"));

      const viewZoneObserver = new ViewZoneObserver({
        zoneLayoutData,
        fontSize: getFontSize(),
        multiplier: getMultiplier(),
      })
      root.render(
        <ViewZoneRender viewZoneObserver={viewZoneObserver}></ViewZoneRender>
      )

      editor.changeViewZones(changeAccessor => {
        // 因为toDispose作用域的关系，我先
        const { addZone, layoutZone } = changeAccessor;

        const zoneIds = zoneOptions.map(zoneOption => {
          return addZone(zoneOption);
        })

        toDispose.pushAll([
          editor.onDidContentSizeChange(() => {
            zoneIds.forEach((zoneId) => {
              layoutZone(zoneId);
            })
            runInAction(() => {
              viewZoneObserver.fontSize = getFontSize();
              viewZoneObserver.multiplier = getMultiplier();
            })
          }),
          Disposable.create(() => {
            // 这里用editor.changeViewZones再包一层是因为释放资源的时候，不仅仅是去除ViewZones，还要告诉editor去changeViewZones
            editor.changeViewZones(changeAccessor => {
              zoneIds.forEach((zoneId) => changeAccessor.removeZone(zoneId));
            });
          })
        ]);

      })

      toDispose.pushAll([
        Disposable.create(() => root.unmount()),
      ]);
    }

    return () => {
      toDispose.dispose();
    }
  }, [viewZoneShow])

  return <div style={{width: "600px", height: "600px"}} ref={monacoEl} />
}

export default App;