import { useTheiaEditor as useEditor } from "@/hooks/monaco-editor";
import { useEffect } from "react";
import { DefaultLinesDiffComputer } from "@theia/monaco-editor-core/esm/vs/editor/common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer";
import { ViewZoneManager } from "@theia/monaco-editor-core/esm/vs/editor/browser/widget/diffEditor/lineAlignment";
import { DiffMapping, DiffState } from "@theia/monaco-editor-core/esm/vs/editor/browser/widget/diffEditor/diffEditorViewModel";
import { DetailedLineRangeMapping, LineRangeMapping, RangeMapping } from "@theia/monaco-editor-core/esm/vs/editor/common/diff/rangeMapping";
import { ILineChange } from "@theia/monaco-editor-core/esm/vs/editor/common/diff/legacyLinesDiffComputer";
import { LineRange } from "@theia/monaco-editor-core/esm/vs/editor/common/core/lineRange";
import { MovedText } from "@theia/monaco-editor-core/esm/vs/editor/common/diff/linesDiffComputer";
import { CodeEditorWidget } from "@theia/monaco-editor-core/esm/vs/editor/browser/widget/codeEditorWidget";
import { ArrayQueue } from "@theia/monaco-editor-core/esm/vs/base/common/arrays";
import { Position } from "@theia/monaco-editor-core";
// import { EditorOption } from "@theia/monaco-editor-core/esm/vs/editor/common/config/editorOptions";
import { joinCombine } from "@theia/monaco-editor-core/esm/vs/editor/browser/widget/diffEditor/utils";
import { IViewZone } from "@theia/monaco-editor-core/esm/vs/editor/browser/editorBrowser";
import { ThemeIcon } from "@theia/monaco-editor-core/esm/vs/base/common/themables";
import { Codicon } from '@theia/monaco-editor-core/esm/vs/base/common/codicons';
import { editor } from '@theia/monaco-editor-core';
function getLineChanges(changes: readonly DetailedLineRangeMapping[]): ILineChange[] {
  return changes.map(m => ([m.original.startLineNumber, m.original.endLineNumberExclusive, m.modified.startLineNumber, m.modified.endLineNumberExclusive, m.innerChanges?.map(m => [
    m.originalRange.startLineNumber,
    m.originalRange.startColumn,
    m.originalRange.endLineNumber,
    m.originalRange.endColumn,
    m.modifiedRange.startLineNumber,
    m.modifiedRange.startColumn,
    m.modifiedRange.endLineNumber,
    m.modifiedRange.endColumn,
  ])]));
}

function getAdditionalLineHeights(editor: CodeEditorWidget, viewZonesToIgnore: ReadonlySet<string>): readonly AdditionalLineHeightInfo[] {
	const viewZoneHeights: { lineNumber: number; heightInPx: number }[] = [];
	const wrappingZoneHeights: { lineNumber: number; heightInPx: number }[] = [];

	const hasWrapping = editor.getOption(144).wrappingColumn !== -1;
	const coordinatesConverter = editor._getViewModel()!.coordinatesConverter;
	const editorLineHeight = editor.getOption(65);
	if (hasWrapping) {
		for (let i = 1; i <= editor.getModel()!.getLineCount(); i++) {
			const lineCount = coordinatesConverter.getModelLineViewLineCount(i);
			if (lineCount > 1) {
				wrappingZoneHeights.push({ lineNumber: i, heightInPx: editorLineHeight * (lineCount - 1) });
			}
		}
	}

	for (const w of editor.getWhitespaces()) {
		if (viewZonesToIgnore.has(w.id)) {
			continue;
		}
		const modelLineNumber = w.afterLineNumber === 0 ? 0 : coordinatesConverter.convertViewPositionToModelPosition(
			new Position(w.afterLineNumber, 1)
		).lineNumber;
		viewZoneHeights.push({ lineNumber: modelLineNumber, heightInPx: w.height });
	}

	const result = joinCombine(
		viewZoneHeights,
		wrappingZoneHeights,
		v => v.lineNumber,
		(v1, v2) => ({ lineNumber: v1.lineNumber, heightInPx: v1.heightInPx + v2.heightInPx })
	);

	return result;
}


interface ILineRangeAlignment {
	originalRange: LineRange;
	modifiedRange: LineRange;

	// accounts for foreign viewzones and line wrapping
	originalHeightInPx: number;
	modifiedHeightInPx: number;

	/**
	 * If this range alignment is a direct result of a diff, then this is the diff's line mapping.
	 * Only used for inline-view.
	 */
	diff?: DetailedLineRangeMapping;
}

function computeRangeAlignment(
	originalEditor: CodeEditorWidget,
	modifiedEditor: CodeEditorWidget,
	diffs: readonly DiffMapping[],
	originalEditorAlignmentViewZones: ReadonlySet<string>,
	modifiedEditorAlignmentViewZones: ReadonlySet<string>,
	innerHunkAlignment: boolean,
): ILineRangeAlignment[] {
	const originalLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(originalEditor, originalEditorAlignmentViewZones));
	const modifiedLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(modifiedEditor, modifiedEditorAlignmentViewZones));

	const origLineHeight = originalEditor.getOption(65);
	const modLineHeight = modifiedEditor.getOption(65);

	const result: ILineRangeAlignment[] = [];

	let lastOriginalLineNumber = 0;
	let lastModifiedLineNumber = 0;

	function handleAlignmentsOutsideOfDiffs(untilOriginalLineNumberExclusive: number, untilModifiedLineNumberExclusive: number) {
		while (true) {
			let origNext = originalLineHeightOverrides.peek();
			let modNext = modifiedLineHeightOverrides.peek();
			if (origNext && origNext.lineNumber >= untilOriginalLineNumberExclusive) {
				origNext = undefined;
			}
			if (modNext && modNext.lineNumber >= untilModifiedLineNumberExclusive) {
				modNext = undefined;
			}
			if (!origNext && !modNext) {
				break;
			}

			const distOrig = origNext ? origNext.lineNumber - lastOriginalLineNumber : Number.MAX_VALUE;
			const distNext = modNext ? modNext.lineNumber - lastModifiedLineNumber : Number.MAX_VALUE;

			if (distOrig < distNext) {
				originalLineHeightOverrides.dequeue();
				modNext = {
					lineNumber: origNext!.lineNumber - lastOriginalLineNumber + lastModifiedLineNumber,
					heightInPx: 0,
				};
			} else if (distOrig > distNext) {
				modifiedLineHeightOverrides.dequeue();
				origNext = {
					lineNumber: modNext!.lineNumber - lastModifiedLineNumber + lastOriginalLineNumber,
					heightInPx: 0,
				};
			} else {
				originalLineHeightOverrides.dequeue();
				modifiedLineHeightOverrides.dequeue();
			}

			result.push({
				originalRange: LineRange.ofLength(origNext!.lineNumber, 1),
				modifiedRange: LineRange.ofLength(modNext!.lineNumber, 1),
				originalHeightInPx: origLineHeight + origNext!.heightInPx,
				modifiedHeightInPx: modLineHeight + modNext!.heightInPx,
				diff: undefined,
			});
		}
	}

	for (const m of diffs) {
		const c = m.lineRangeMapping;
		handleAlignmentsOutsideOfDiffs(c.original.startLineNumber, c.modified.startLineNumber);

		let first = true;
		let lastModLineNumber = c.modified.startLineNumber;
		let lastOrigLineNumber = c.original.startLineNumber;

		function emitAlignment(origLineNumberExclusive: number, modLineNumberExclusive: number) {
			if (origLineNumberExclusive < lastOrigLineNumber || modLineNumberExclusive < lastModLineNumber) {
				return;
			}
			if (first) {
				first = false;
			} else if (origLineNumberExclusive === lastOrigLineNumber || modLineNumberExclusive === lastModLineNumber) {
				return;
			}
			const originalRange = new LineRange(lastOrigLineNumber, origLineNumberExclusive);
			const modifiedRange = new LineRange(lastModLineNumber, modLineNumberExclusive);
			if (originalRange.isEmpty && modifiedRange.isEmpty) {
				return;
			}

			const originalAdditionalHeight = originalLineHeightOverrides
				.takeWhile(v => v.lineNumber < origLineNumberExclusive)
				?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;
			const modifiedAdditionalHeight = modifiedLineHeightOverrides
				.takeWhile(v => v.lineNumber < modLineNumberExclusive)
				?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;

			result.push({
				originalRange,
				modifiedRange,
				originalHeightInPx: originalRange.length * origLineHeight + originalAdditionalHeight,
				modifiedHeightInPx: modifiedRange.length * modLineHeight + modifiedAdditionalHeight,
				diff: m.lineRangeMapping,
			});

			lastOrigLineNumber = origLineNumberExclusive;
			lastModLineNumber = modLineNumberExclusive;
		}

		if (innerHunkAlignment) {
			for (const i of c.innerChanges || []) {
				if (i.originalRange.startColumn > 1 && i.modifiedRange.startColumn > 1) {
					// There is some unmodified text on this line before the diff
					emitAlignment(i.originalRange.startLineNumber, i.modifiedRange.startLineNumber);
				}
				if (i.originalRange.endColumn < originalEditor.getModel()!.getLineMaxColumn(i.originalRange.endLineNumber)) {
					// // There is some unmodified text on this line after the diff
					emitAlignment(i.originalRange.endLineNumber, i.modifiedRange.endLineNumber);
				}
			}
		}

		emitAlignment(c.original.endLineNumberExclusive, c.modified.endLineNumberExclusive);

		lastOriginalLineNumber = c.original.endLineNumberExclusive;
		lastModifiedLineNumber = c.modified.endLineNumberExclusive;
	}
	handleAlignmentsOutsideOfDiffs(Number.MAX_VALUE, Number.MAX_VALUE);

	return result;
}

function toLineRangeMappings(changes: readonly ILineChange[]): readonly DetailedLineRangeMapping[] {
  return changes.map(
    (c) => new DetailedLineRangeMapping(
      new LineRange(c[0], c[1]),
      new LineRange(c[2], c[3]),
      c[4]?.map(
        (c) => new RangeMapping(
          new Range(c[0], c[1], c[2], c[3]),
          new Range(c[4], c[5], c[6], c[7])
        )
      )
    )
  );
}

export default function App() {
  const [originalEditor, originalMonacoEl] = useEditor({
    value: ["111", "222", "2222", "3333"].join("\n"),
		readOnly: true, // 🔐 设置为只读
  	folding: false, // 📄 关闭代码折叠功能
  });
  const [modifiedEditor, modifiedMonacoEl] = useEditor({
    value: ["333", "222", "11111"].join("\n"),
		readOnly: true, // 🔐 设置为只读
  	folding: false, // 📄 关闭代码折叠功能
  });

  console.log("!!!!!!!");
  const aaa = new DefaultLinesDiffComputer();

  const b = aaa.computeDiff(
      ["111", "222", "2222", "3333"],
      ["333", "222", "11111"],
      {
        ignoreTrimWhitespace: true,
        maxComputationTimeMs: 5000,
        computeMoves: false
      }
    );
  const c = DiffState.fromDiffResult({
    identical: b.changes.length === 0,
    quitEarly: b.hitTimeout,
    changes: toLineRangeMappings(getLineChanges(b.changes)),
    moves: b.moves.map(m => ([
				m.lineRangeMapping.original.startLineNumber,
				m.lineRangeMapping.original.endLineNumberExclusive,
				m.lineRangeMapping.modified.startLineNumber,
				m.lineRangeMapping.modified.endLineNumberExclusive,
				getLineChanges(m.changes)
			])).map(m => new MovedText(
				new LineRangeMapping(new LineRange(m[0], m[1]), new LineRange(m[2], m[3])),
				toLineRangeMappings(m[4])
			))
  });

	const originalDecorations: editor.IModelDeltaDecoration[] = [];
	const modifiedDecorations: editor.IModelDeltaDecoration[] = [];
	
	for (const m of c.mappings) {
		if (!m.lineRangeMapping.original.isEmpty) {
			originalDecorations.push({ range: m.lineRangeMapping.original.toInclusiveRange()!, options: {
				className: 'line-insert',
				// description: 'line-insert',
				isWholeLine: true,
				marginClassName: 'gutter-insert',
			}})
		}
		if (!m.lineRangeMapping.modified.isEmpty) {
			modifiedDecorations.push({ range: m.lineRangeMapping.modified.toInclusiveRange()!, options: {
				className: 'line-insert',
				// description: 'line-insert',
				isWholeLine: true,
				marginClassName: 'gutter-insert',
			}});
		}

		// TODO 这边应该简单

		// lineRangeMapping不空则塞个diffLineDeleteDecorationBackground 行内部不同
		// 如果两边其中一个为空 塞个diffWholeLineDeleteDecoration 整行不一致
		// innerChanges 字符级别的不一致
		// 

				// if (m.lineRangeMapping.modified.isEmpty || m.lineRangeMapping.original.isEmpty) {
				// 	if (!m.lineRangeMapping.original.isEmpty) {
				// 		originalDecorations.push({ range: m.lineRangeMapping.original.toInclusiveRange()!, options: diffWholeLineDeleteDecoration });
				// 	}
				// 	if (!m.lineRangeMapping.modified.isEmpty) {
				// 		modifiedDecorations.push({ range: m.lineRangeMapping.modified.toInclusiveRange()!, options: diffWholeLineAddDecoration });
				// 	}
				// } else {
				// 	for (const i of m.lineRangeMapping.innerChanges || []) {
				// 		// Don't show empty markers outside the line range
				// 		if (m.lineRangeMapping.original.contains(i.originalRange.startLineNumber)) {
				// 			originalDecorations.push({ range: i.originalRange, options: (i.originalRange.isEmpty() && showEmptyDecorations) ? diffDeleteDecorationEmpty : diffDeleteDecoration });
				// 		}
				// 		if (m.lineRangeMapping.modified.contains(i.modifiedRange.startLineNumber)) {
				// 			modifiedDecorations.push({ range: i.modifiedRange, options: (i.modifiedRange.isEmpty() && showEmptyDecorations) ? diffAddDecorationEmpty : diffAddDecoration });
				// 		}
				// 	}
				// }

				// if (!m.lineRangeMapping.modified.isEmpty && this._options.shouldRenderRevertArrows.read(reader) && !movedTextToCompare) {
				// 	modifiedDecorations.push({ range: Range.fromPositions(new Position(m.lineRangeMapping.modified.startLineNumber, 1)), options: arrowRevertChange });
				// }
	}


	// const decorations = editor.createDecorationsCollection();
	// decorations.set([
	// 	{
	// 		range: new monaco.Range(3,1,5,1),
	// 		options: {
	// 			className: 'line-insert',
	// 			description: 'line-insert',
	// 			isWholeLine: true,
	// 			marginClassName: 'gutter-insert',
	// 		}
	// 	}
	// ])



  console.log(aaa);
  console.log(b);
  console.log(c);

  interface IViewZoneWithZoneId extends IViewZone {
	  // Tells a view zone its id.
	  setZoneId?(zoneId: string): void;
  }

  function createFakeLinesDiv(): HTMLElement {
    const r = document.createElement('div');
    r.className = 'diagonal-fill';
    return r;
  }
  
  const alignmentViewZoneIdsOrig = new Set<string>();
  const alignmentViewZoneIdsMod = new Set<string>();

  setTimeout(() => {
    const origViewZones: IViewZoneWithZoneId[] = [];
    const modViewZones: IViewZoneWithZoneId[] = [];

    if (originalEditor && modifiedEditor) {
      const d = computeRangeAlignment(
        originalEditor,
        modifiedEditor,
        c.mappings,
        new Set<string>(),
        new Set<string>(),
        true,
      );
      console.log(d);

      for (const a of d) {
        if (a.diff) {
          const delta = a.modifiedHeightInPx - a.originalHeightInPx;
					if (delta > 0) {


						origViewZones.push({
							afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
							domNode: createFakeLinesDiv(),
							heightInPx: delta,
							showInHiddenAreas: true,
							suppressMouseDown: true,
						});
					} else {
						// if (syncedMovedText?.lineRangeMapping.modified.delta(-1).deltaLength(2).contains(a.modifiedRange.endLineNumberExclusive - 1)) {
						// 	continue;
						// }

						function createViewZoneMarginArrow(): HTMLElement {
							const arrow = document.createElement('div');
							arrow.className = 'arrow-revert-change ' + ThemeIcon.asClassName(Codicon.arrowRight);
							return $('div', {}, arrow);
						}

						let marginDomNode: HTMLElement | undefined = undefined;
						// if (a.diff && a.diff.modified.isEmpty && this._options.shouldRenderRevertArrows.read(reader)) {
						// 	marginDomNode = createViewZoneMarginArrow();
						// }

						modViewZones.push({
							afterLineNumber: a.modifiedRange.endLineNumberExclusive - 1,
							domNode: createFakeLinesDiv(),
							heightInPx: -delta,
							marginDomNode,
							showInHiddenAreas: true,
							suppressMouseDown: true,
						});
					}
        }
      }

      originalEditor.changeViewZones((aOrig) => {
				for (const id of alignmentViewZoneIdsOrig) { aOrig.removeZone(id); }
				alignmentViewZoneIdsOrig.clear();
				for (const z of origViewZones) {
					const id = aOrig.addZone(z);
					if (z.setZoneId) {
						z.setZoneId(id);
					}
					alignmentViewZoneIdsOrig.add(id);
				}
			});
			modifiedEditor.changeViewZones(aMod => {
				for (const id of alignmentViewZoneIdsMod) { aMod.removeZone(id); }
				alignmentViewZoneIdsMod.clear();
				for (const z of modViewZones) {
					const id = aMod.addZone(z);
					if (z.setZoneId) {
						z.setZoneId(id);
					}
					alignmentViewZoneIdsMod.add(id);
				}
      })

			const decorationsCollection1 = originalEditor!.createDecorationsCollection();
			decorationsCollection1.set(originalDecorations)

			const decorationsCollection2 = modifiedEditor!.createDecorationsCollection();
			decorationsCollection2.set(modifiedDecorations)
    }

  }, 2000)


  useEffect(() => {
    
  }, []);
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "row" }}>
      <div style={{ height: "100%", flex: "1" }} ref={originalMonacoEl}></div>
      <div style={{ height: "100%", width: "30px" }}></div>
      <div style={{ height: "100%", flex: "1" }} ref={modifiedMonacoEl}></div>
    </div>
  )
}
