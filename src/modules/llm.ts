
import { getString } from "../utils/locale";
import { callLLM } from "../utils/llm";

function getZoteroReaderInstance() {
  const Zotero = addon.data.ztoolkit.getGlobal("Zotero");
  const reader = Zotero.Reader.getByTabID(
    Zotero.getMainWindow().Zotero_Tabs.selectedID
  );
  return reader;
}

async function getSelectedText() {
  const reader = getZoteroReaderInstance();
  if (reader) {
    const selection = addon.data.ztoolkit.Reader.getSelectedText(reader);
    if (selection) {
      return selection;
    }
  }
  return "";
}


export class LLMFactory {

  public static registerCommandExplainThis() {
    ztoolkit.Prompt.register([
      {
        name: "Explain This (AI)",
        label: "Explain This",
        // The when function is executed when Prompt UI is woken up by `Shift + P`, and this command does not display when false is returned.
        when: () => {
          const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
          return items.length > 0;
        },
        async callback(prompt) {
          prompt.inputNode.placeholder = "Explaining ...";
          const text = await getSelectedText();
          if (text) {
            const progressWindow = new ztoolkit.ProgressWindow("Explaining...", {
              closeOnClick: false,
              closeTime: -1,
            });
            try {
              progressWindow.createLine({
                text: "Calling LLM...",
                type: "default",
                progress: 0,
              });
              progressWindow.show();

              const explanation = await callLLM(text);
              progressWindow.changeLine({
                text: explanation,
                type: "success",
                progress: 100,
              });
            } catch (error) {
              progressWindow.changeLine({
                text: "Error: " + (error as Error).message,
                type: "error",
                progress: 100,
              });
              progressWindow.startCloseTimer(2000);
            }
          }
        },
      },
    ]);
  }

  public static registerReaderMenu() {
    const reader = getZoteroReaderInstance();
    if (reader) {
      const menu = addon.data.ztoolkit.getGlobal("document").getElementById("zotero-reader-toolbar-more-menu");
      const menuItem = addon.data.ztoolkit.UI.createElement(addon.data.ztoolkit.getGlobal("document"), "menuitem", {
        id: "zotero-reader-menu-explain-this",
        properties: {
          label: getString("explain-this"),
          className: "menuitem-iconic",
        },
        listeners: [
          {
            type: "command",
            listener: async () => {
              const text = await getSelectedText();
              if (text) {
                const progressWindow = new ztoolkit.ProgressWindow("Explaining...", {
                  closeOnClick: false,
                  closeTime: -1,
                });
                progressWindow.createLine({
                  text: "Calling LLM...",
                  type: "default",
                  progress: 0,
                });
                progressWindow.show();
                try {
                  const explanation = await callLLM(text);
                  progressWindow.changeLine({
                    text: explanation,
                    type: "success",
                    progress: 100,
                  });
                } catch (error) {
                  progressWindow.changeLine({
                    text: "Error: " + (error as Error).message,
                    type: "error",
                    progress: 100,
                  });
                }
              }
            },
          },
        ],
      });
      menu?.appendChild(menuItem);
    }
  }
}
