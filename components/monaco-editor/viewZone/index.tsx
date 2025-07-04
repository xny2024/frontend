import { useEffect } from "react";
import * as monaco from 'monaco-editor-core';
import { createRoot } from "react-dom/client";
import { Disposable, DisposableCollection } from "../../../utils/disposable";
import ViewZoneRender, { ZoneLayoutData, ZoneLineData } from "./viewZoneRender";
import { computed, makeObservable, observable } from "mobx";
import { useEditor } from "@/hooks/monaco-editor";
import { observer } from "mobx-react";

interface Props {
  viewZoneShow: boolean;
}

const mockZoneLayoutData: ZoneLayoutData = [
  {
    afterLineNumber: 0,
    heightInLines: 1,
    items: [
      {
        key: '变量1',
        value: "12312",
      },
      {
        key: '变量2',
        value: "12312",
      }
    ]
  },
  {
    afterLineNumber: 1,
    heightInLines: 2,
    items: [
      {
        key: '变量11',
        value: "1231112",
      },
      {
        key: '变量22',
        value: "123133333332432er3243242",
      }
    ]
  },
  // ...Array.from({length: 8000}).map((v, index) => ({
  //   afterLineNumber: index,
  //   heightInLines: 1,
  //   label: "我是变量注释",
  // }))
];

// const App = (props: Props) => {
//   const option = {
//     value: Array.from({length: 8000}).map((v, index) => "xxx").join("\n"),
//   };
//   const [editor, monacoEl] = useEditor(option);

//   const { viewZoneShow } = props;

//   const [zoneLayoutData, setZoneLayoutData] = useState<ZoneLayoutData>(mockZoneLayoutData);

//   useEffect(() => {
//     const toDispose = new DisposableCollection();

//     if (editor && viewZoneShow) {
//       const getFontSize = () => {
//         return editor.getOption(monaco.editor.EditorOption.fontSize);
//       }

//       const getMultiplier = () => {
//         return 1 + monaco.editor.EditorZoom.getZoomLevel() * 0.1;
//       }

//       const zoneOptions: monaco.editor.IViewZone[] = [];

//       zoneLayoutData.forEach((zoneLineData) => {
//         const div = document.createElement("div");

//         zoneOptions.push({
//           ...zoneLineData,
//           domNode: div,
//         })

//         zoneLineData.domNode = div;
//       })

//       const root = createRoot(document.createElement("div"));

//       let viewZoneObserver = new ViewZoneObserver({
//         zoneLayoutData: mockZoneLayoutData,
//         fontSize: getFontSize(),
//         multiplier: getMultiplier(),
//       })
//       root.render(
//         <ViewZoneRender viewZoneObserver={viewZoneObserver}></ViewZoneRender>
//       )

//       editor.changeViewZones(changeAccessor => {
//         // 因为toDispose作用域的关系，我先
//         const { addZone, layoutZone } = changeAccessor;

//         const zoneIds = zoneOptions.map(zoneOption => {
//           return addZone(zoneOption);
//         })

//         toDispose.pushAll([
//           editor.onDidContentSizeChange(() => {
//             zoneIds.forEach((zoneId) => {
//               layoutZone(zoneId);
//             })
//             runInAction(() => {
//               viewZoneObserver!.fontSize = getFontSize();
//               viewZoneObserver!.multiplier = getMultiplier();
//             })
//           }),
//           Disposable.create(() => {
//             // 这里用editor.changeViewZones再包一层是因为释放资源的时候，不仅仅是去除ViewZones，还要告诉editor去changeViewZones
//             editor.changeViewZones(changeAccessor => {
//               zoneIds.forEach((zoneId) => changeAccessor.removeZone(zoneId));
//             });
//           })
//         ]);

//       })

//       toDispose.pushAll([
//         Disposable.create(() => setTimeout(() => root.unmount())),
//       ]);
//     }

//     return () => {
//       toDispose.dispose();
//     }
//   }, [viewZoneShow])

//   // useEffect(() => {
//   //   const toDispose = new DisposableCollection();

//   //   if (editor && viewZoneShow && viewZoneObserver) {
//   //     const zoneOptions: monaco.editor.IViewZone[] = [];

//   //     // TODO 重新刷新计算zoneLineData

//   //     zoneLayoutData.forEach((zoneLineData) => {
//   //       if (!zoneLineData.domNode) {
//   //         const div = document.createElement("div");
//   //         zoneLineData.domNode = div;
//   //       }

//   //       zoneOptions.push({
//   //         ...zoneLineData,
//   //         domNode: zoneLineData.domNode,
//   //       });
//   //     })

//   //     viewZoneObserver.zoneLayoutData = zoneLayoutData;

//   //     editor.changeViewZones(changeAccessor => {
//   //       const { addZone, layoutZone, removeZone } = changeAccessor;

//   //       zoneIds.forEach((zoneId) => removeZone(zoneId));

//   //       setZoneIds(zoneOptions.map(zoneOption => {
//   //         return addZone(zoneOption);
//   //       }))
//   //     })
//   //   }
//   // }, [zoneLayoutData])

//   return <div style={{width: "600px", height: "600px"}} ref={monacoEl} />
// }

export class ViewZoneObs{
  constructor(props: { zoneLayoutData: ZoneLayoutData }) {
    const { zoneLayoutData } = props;

    this.zoneLayoutData = zoneLayoutData;

    makeObservable(this, {
      show: observable,
      viewZones: computed,
      lineDivs: observable,
      zoneLayoutData: observable,
      zoneIds: observable,
    });
  }

  public show: boolean = false;

  public lineDivs: Map<number, HTMLElement> = new Map<number, HTMLElement>();

  public zoneIds: string[] = [];

  public get viewZones(): { iViewZone: monaco.editor.IViewZone, items: ZoneLineData["items"] }[] {
    return this.zoneLayoutData.map(o => {
      let dom = this.lineDivs.get(o.afterLineNumber)
      if (!dom) {
        dom = document.createElement("div");
        this.lineDivs.set(o.afterLineNumber, dom);
      }

      return {
        iViewZone: {...o, domNode: dom},
        items: o.items,
      }
    })
  }

  public zoneLayoutData: ZoneLayoutData;
}

// export class ViewZoneOb {
//   constructor(props: {
//     label: string,
//     domNode: HTMLElement,
//     zoneId: string,
//     viewZone: monaco.editor.IViewZone,
//   }) {
//     const {
//       label,
//       domNode,
//       zoneId,
//       viewZone
//     } = props;

//     this.label = label;
//     this.domNode = domNode;
//     this.zoneId = zoneId;
//     this.viewZone = viewZone;

//     makeObservable(this, {
//       viewZone: observable,
//       label: observable,
//       // domNode: observable,
//       zoneId: observable,
//       // viewZone: computed,
//     });
//   }

//   public viewZone: monaco.editor.IViewZone

//   public zoneId: string;

//   public label: string;

//   public domNode: HTMLElement;

// }


const App1 = observer((props: { viewZoneObs: ViewZoneObs }) => {
  const { viewZoneObs } = props;

  const option = {
    value: Array.from({length: 8000}).map((v, index) => "xxx").join("\n"),
  };
  const [editor, monacoEl] = useEditor(option);

  useEffect(() => {
    const toDispose = new DisposableCollection();

    if (editor && viewZoneObs.show) {
      const root = createRoot(document.createElement("div"));
      root.render(
        <ViewZoneRender viewZoneObserver={viewZoneObs}></ViewZoneRender>
      );

      editor.changeViewZones(changeAccessor => {
        const { addZone} = changeAccessor;

        viewZoneObs.zoneIds = viewZoneObs.viewZones.map((viewZone) => {
          return addZone(viewZone.iViewZone);
        })
      })

      toDispose.pushAll([
        Disposable.create(() => setTimeout(() => root.unmount())),
        Disposable.create(() => {
          editor.changeViewZones(changeAccessor => {
            viewZoneObs.zoneIds.forEach((zoneId) => {
              changeAccessor.removeZone(zoneId);
            })
            viewZoneObs.zoneIds = [];
          });
        }),
      ]);
    }

    return () => {
      toDispose.dispose();
    }
  }, [viewZoneObs.show])

  useEffect(() => {
    const toDispose = new DisposableCollection();

    if (editor && viewZoneObs.show) {
      editor.changeViewZones(changeAccessor => {
        viewZoneObs.zoneIds.forEach((zoneId) => {
          changeAccessor.removeZone(zoneId);
          viewZoneObs.zoneIds = [];
        })

        editor.changeViewZones(changeAccessor => {
          const { addZone} = changeAccessor;
  
          viewZoneObs.zoneIds = viewZoneObs.viewZones.map((viewZone) => {
            return addZone(viewZone.iViewZone);
          })
        })
      });
    }

    return () => {
      toDispose.dispose();
    }
  }, [viewZoneObs.zoneLayoutData])

  return (
    <>
      <div style={{width: "1200px", height: "800px"}} ref={monacoEl} />
    </>
  )
})

const App = (props: Props) => {
  const viewZoneObs = new ViewZoneObs({
    zoneLayoutData: mockZoneLayoutData,
  });

  setTimeout(() => {
    viewZoneObs.show = true;
  }, 1000)

  setTimeout(() => {
    viewZoneObs.zoneLayoutData = [
      {
        afterLineNumber: 0,
        heightInLines: 2,
        items: [
          {
            key: '变量111',
            value: "123eqw1112",
          },
          {
            key: '变量222',
            value: "1231333qe33243242",
          }
        ]
      },
      {
        afterLineNumber: 1,
        heightInLines: 1,
        items: [
          {
            key: '变量1111',
            value: "1231112",
          },
          {
            key: '变量22222',
            value: "1231333333qweqweqwe3242",
          }
        ]
      },
    ];
  }, 2000)

  setTimeout(() => {
    viewZoneObs.zoneLayoutData = [
      {
        afterLineNumber: 1,
        heightInLines: 1,
        items: [
          {
            key: '变量113',
            value: "121123qeqweqw122",
          },
          {
            key: '变量223',
            value: "1231qweeqwqwe33qr3242",
          }
        ]
      },
      {
        afterLineNumber: 2,
        heightInLines: 2,
        items: [
          {
            key: '变量111111',
            value: "1231qweqweq12",
          },
          {
            key: '变量222',
            value: "1231eee32e242",
          }
        ]
      },
    ];
  }, 3000)

  setTimeout(() => {
    viewZoneObs.show = false;
  }, 4000)

  return <App1 viewZoneObs={ viewZoneObs }></App1>
};

export default App;
