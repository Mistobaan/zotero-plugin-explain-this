import { table } from "console";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";

import { loadModels } from "multi-llm-ts";

interface LLMConfig {
  providerId: string;
  apiKey: string;
  modelName?: string;
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [
        {
          dataKey: "id",
          label: getString("prefs-table-id"),
          fixedWidth: true,
          width: 120,
        },
        {
          dataKey: "label",
          label: getString("prefs-table-label"),
        },
      ],
      rows: [
        {
          id: "anthropic",
          label: "Anthropic",
        },
        {
          id: "azure",
          label: "Azure AI",
        },
        {
          id: "cerebras",
          label: "Cerebras",
        },
        {
          id: "deepseek",
          label: "DeepSeek",
        },
        {
          id: "google",
          label: "Google",
        },
        {
          id: "groq",
          label: "Groq",
        },
        {
          id: "meta",
          label: "Meta/Llama",
        },
        {
          id: "mistralai",
          label: "MistralAI",
        },
        {
          id: "ollama",
          label: "Ollama",
        },
        {
          id: "openai",
          label: "OpenAI",
        },
        {
          id: "openrouter",
          label: "OpenRouter",
        },
        {
          id: "togetherai",
          label: "TogetherAI",
        },
        {
          id: "xai",
          label: "xAI",
        },
      ],
    };
  } else {
    addon.data.prefs.window = _window;
    ztoolkit.log("updating only the window keeping prefs:", addon.data.prefs)
  }

  try {
    await updatePrefsUI();
  } catch (error) {
    ztoolkit.log("Error updating prefs UI:", error);
  }
  bindPrefEvents();
}

async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
  if (addon.data.prefs?.window == undefined) {
    ztoolkit.log('no prefs window found');
    return;
  }
  const tableHelper = new ztoolkit.VirtualizedTable(addon.data.prefs?.window);

  tableHelper
    .setContainerId(`${config.addonRef}-table-container`)
    .setProp({
      id: `${config.addonRef}-prefs-table`,
      // Do not use setLocale, as it modifies the Zotero.Intl.strings
      // Set locales directly to columns
      columns: addon.data.prefs?.columns,
      showHeader: true,
      multiSelect: true,
      staticColumns: true,
      disableFontSizeScaling: true,
    })
    .setProp("getRowCount", () => {
      ztoolkit.log("Data loaded:", addon.data.prefs);
      return addon.data.prefs!.rows.length || 0
    })
    .setProp(
      "getRowData",
      (index) =>
        addon.data.prefs?.rows[index] || {
          id: "no data",
          label: "no data",
        },
    )
    // Show a progress window when selection changes and configure LLM
    .setProp("onSelectionChange", (selection) => {
      const selectedRows = addon.data.prefs?.rows
        .filter((v, i) => selection.isSelected(i));

      if (selectedRows && selectedRows.length > 0) {
        const selectedProvider = selectedRows[0];
        configureLLMProvider(selectedProvider.id, selectedProvider.label);

        new ztoolkit.ProgressWindow(config.addonName)
          .createLine({
            text: `Selected provider: ${selectedProvider.label}. Configure API key in settings.`,
            progress: 100,
          })
          .show();
      }
    })
    // When pressing delete, delete selected line and refresh table.
    // Returning false to prevent default event.
    .setProp("onKeyDown", (event: KeyboardEvent) => {
      // if (event.key == "Delete" || (Zotero.isMac && event.key == "Backspace")) {
      //   addon.data.prefs!.rows =
      //     addon.data.prefs?.rows.filter(
      //       (v, i) => !tableHelper.treeInstance.selection.isSelected(i),
      //     ) || [];
      //   tableHelper.render();
      //   return false;
      // }
      return true;
    })
    // For find-as-you-type
    .setProp(
      "getRowString",
      (index) => addon.data.prefs?.rows[index].label || "",
    )
    // Render the table.
    .render(-1, () => {
      renderLock.resolve();
    });
  await renderLock.promise;
  ztoolkit.log("Preference table rendered!");
}

function configureLLMProvider(providerId: string, providerLabel: string) {

  // Store the selected provider
  setPref(`llm.ENGINE`, providerId);

  // call loadModels async with Promise.
  // Promise.resolve([loadModels(providerId, {})]).then((models) => {
  //   ztoolkit.log('models available for ', providerId, models)
  // });

  ztoolkit.log(`Configured ExplainThis with LLM provider: ${providerLabel} `);

  // Update UI to show API key input for selected provider
  updateAPIKeyInput(providerId, providerLabel);
}

function updateAPIKeyInput(providerId: string, providerLabel: string) {
  const doc = addon.data.prefs?.window.document;
  if (!doc) return;

  // Update the label to show current provider
  const label = doc.querySelector(`#${config.addonRef}-api-key-label`) as any;
  if (label) {
    label.textContent = `API Key for ${providerLabel}:`;
  }

  // Load existing API key if available
  const input = doc.querySelector(`#${config.addonRef}-api-key-input`) as any;
  if (input) {
    const existingKey: string = getPref(`llm.${providerId}.API_KEY` as any) as any;
    input.value = existingKey || '';
    input.placeholder = `Enter ${providerLabel} API key...`;
  }

  // Update save button event listener
  const saveButton = doc.querySelector(`#${config.addonRef}-save-button`) as HTMLButtonElement;
  if (saveButton) {
    // Remove existing event listeners by cloning the button
    const newSaveButton = saveButton.cloneNode(true) as HTMLButtonElement;
    saveButton.parentNode?.replaceChild(newSaveButton, saveButton);
    
    newSaveButton.textContent = `Save ${providerLabel} API Key`;
    newSaveButton.addEventListener('click', () => saveAPIKey(providerId, providerLabel));
  }
}

function saveAPIKey(providerId: string, providerLabel: string) {
  const doc = addon.data.prefs?.window.document;
  if (!doc) return;

  const input = doc.querySelector(`#${config.addonRef}-api-key-input`) as any;
  if (input && input.value.trim()) {
    setPref(`llm.${providerId}.API_KEY` as any, input.value.trim());

    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text: `API key saved for ${providerLabel}`,
        progress: 100,
      })
      .show();

    ztoolkit.log(`API key saved for provider: ${providerId} (${providerLabel})`);
  } else {
    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text: `Please enter a valid API key for ${providerLabel}`,
        progress: 100,
      })
      .show();
  }
}

function getLLMConfig(): LLMConfig | null {
  const prefs = Zotero.Prefs;
  const providerId = prefs.get(`extensions.${config.addonRef}.selectedProvider`) as string;

  if (!providerId) return null;

  const apiKey = prefs.get(`extensions.${config.addonRef}.apiKey.${providerId}`) as string;

  return {
    providerId,
    apiKey: apiKey || '',
  };
}

function bindPrefEvents() {
  addon.data
    .prefs!.window.document?.querySelector(
      `#zotero-prefpane-${config.addonRef}-enable`,
    )
    ?.addEventListener("command", (e: Event) => {
      ztoolkit.log(e);
      new ztoolkit.ProgressWindow(config.addonName)
        .createLine({
          text: `Successfully changed to ${(e.target as XULCheckboxElement).checked}!`,
          progress: 100,
        })
        .show();
    });

  addon.data
    .prefs!.window.document?.querySelector(
      `#zotero-prefpane-${config.addonRef}-input`,
    )
    ?.addEventListener("change", (e: Event) => {
      ztoolkit.log(e);

      new ztoolkit.ProgressWindow(config.addonName)
        .createLine({
          text: `Successfully changed to ${(e.target as XULTextElement).value}!`,
          progress: 100,
        })
        .show();
    });
}

// Export the getLLMConfig function for use in other modules
export { getLLMConfig };
