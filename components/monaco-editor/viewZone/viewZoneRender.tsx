import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { createPortal } from "react-dom";
import * as monaco from 'monaco-editor-core';

export type ZoneLayoutData = ZoneLineData[];

export interface ZoneLineData extends Omit<monaco.editor.IViewZone, "domNode">{
  domNode?: HTMLElement;
}

export class ViewZoneObserver {
  constructor(props: {
    zoneLayoutData: ZoneLayoutData;
    fontSize: number,
    multiplier: number,
  }) {
    const { zoneLayoutData, fontSize, multiplier } = props;

    this.zoneLayoutData = zoneLayoutData;
    this.fontSize = fontSize;
    this.multiplier = multiplier;

    makeObservable(this, {
      zoneLayoutData: observable,
      fontSize: observable,
      multiplier: observable,
    })
  }

  public zoneLayoutData: ZoneLayoutData;

  public fontSize: number;

  public multiplier: number;
}

const ViewZoneRender = observer(
  ({viewZoneObserver}: {viewZoneObserver: ViewZoneObserver}) => {
    return (
      <>
        {
          viewZoneObserver.zoneLayoutData.map((zoneLineData) => {
            return createPortal(
              <>
                {zoneLineData.afterLineNumber}
              </>,
              zoneLineData.domNode!,
            )
          })
        }
      </>
    )
  }
)

export default ViewZoneRender;