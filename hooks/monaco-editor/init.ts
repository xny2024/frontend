// import { StandaloneServices } from "monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices";

import * as monaco from 'monaco-editor-core';

monaco.languages.register({ id: "javascript" });
monaco.languages.registerHoverProvider("javascript", {
  provideHover: (model, position, token, context) => {
    const word = model.getWordAtPosition(position);
    if (word?.word === 'console') {
      console.log("!!!!");
      return {
        contents: [
          {
            value: '111222',
            isTrusted: true,
          },
          {
            value: '<span><div style="color: red; height: 200px;">123</div></span>',
            isTrusted: true,
            supportHtml: true,
          }
        ]
      }
    }

    return {
      contents: [
        {
          value: '111222',
          isTrusted: true,
        },
      ]
    }
  }
})