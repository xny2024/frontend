import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { createPortal } from "react-dom";
import * as monaco from 'monaco-editor-core';
import { ViewZoneOb, ViewZoneObs } from ".";

export type ZoneLayoutData = ZoneLineData[];

export interface ZoneLineData extends Omit<monaco.editor.IViewZone, "domNode">{
  domNode?: HTMLElement;
  items: {
    key: string;
    value: string;
  }[];
}

// export class ViewZoneObserver {
//   constructor(props: {
//     zoneLayoutData: ZoneLayoutData;
//     fontSize: number,
//     multiplier: number,
//   }) {
//     const { zoneLayoutData, fontSize, multiplier } = props;

//     this.zoneLayoutData = zoneLayoutData;
//     this.fontSize = fontSize;
//     this.multiplier = multiplier;

//     makeObservable(this, {
//       zoneLayoutData: observable,
//       fontSize: observable,
//       multiplier: observable,
//     })
//   }

//   public zoneLayoutData: ZoneLayoutData;

//   public fontSize: number;

//   public multiplier: number;
// }

// const ViewZoneRender = observer(
//   ({viewZoneObserver}: {viewZoneObserver: ViewZoneObserver}) => {
//     return (
//       <>
//         {
//           viewZoneObserver.zoneLayoutData.map((zoneLineData) => {
//             return createPortal(
//               <>
//                 {zoneLineData.afterLineNumber * Math.random()}
//               </>,
//               zoneLineData.domNode!,
//             )
//           })
//         }
//       </>
//     )
//   }
// )

const ViewZoneRender = observer(
  ({viewZoneObserver}: {viewZoneObserver: ViewZoneObs}) => {
    return (
      <>
        {
          viewZoneObserver.viewZones.map((viewZone) => {
            return createPortal(
              <div
                style={{
                  display: "flex",
                  position: "relative",
                }}
              >
                {viewZone.items.map((item) => {
                  return (
                    <div key={item.key}>
                      {item.key}: {item.value}
                    </div>
                  )
                })}
              </div>,
              viewZone.iViewZone.domNode!,
            )
          })
        }
      </>
    )
  }
)

export default ViewZoneRender;